/******************************************************************************
 * This file is part of the wp-awesome package.
 *
 * File: test/core.test.mjs
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
 ******************************************************************************/

import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'vitest'

const require = createRequire(import.meta.url)
const {
  assertNoWordPressRouteCollisions,
  collectWordPressAuthors,
  DEFAULT_SUPPORTED_BLOCK_NAMES,
  convertWordPressContent,
  createWordPressRestClient,
  createWordPressRouteResolver,
  extractWordPressColorPalette,
  extractWordPressLinkColors,
  isSafeCssColorValue,
  normalizeWordPressRecord,
  resolveWordPressContentPolicy,
  sanitizeWordPressHtml,
  toOutputPath,
} = require('../index.js')
const { createRetryingFetchText, createYoastSitemapIntegration } = require('../integrations/yoast.js')

function jsonResponse(body, { status = 200, headers = {} } = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })
}

test('REST collections follow WordPress pagination and preserve configured headers', async () => {
  const requests = []
  const client = createWordPressRestClient({
    baseUrl: 'https://source.example/wp-json/',
    perPage: 2,
    retries: 0,
    getHeaders: ({ context }) => context === 'edit' ? { Authorization: 'Basic test' } : {},
    fetchImpl: async (url, options) => {
      requests.push({ url: new URL(url), options })
      const page = Number(new URL(url).searchParams.get('page'))
      return jsonResponse([{ id: page * 2 - 1 }, { id: page * 2 }], { headers: { 'x-wp-totalpages': '2' } })
    },
  })

  const records = await client.getCollection('wp/v2/posts', { params: { _embed: 1 }, context: 'edit' })

  assert.deepEqual(records.map(({ id }) => id), [1, 2, 3, 4])
  assert.equal(requests.length, 2)
  assert.equal(requests[1].url.searchParams.get('page'), '2')
  assert.equal(requests[0].url.searchParams.get('_embed'), '1')
  assert.equal(requests[0].options.headers.get('authorization'), 'Basic test')
})

test('edit-context denial restarts a complete public collection without auth headers', async () => {
  const requests = []
  const fallbackEvents = []
  const client = createWordPressRestClient({
    baseUrl: 'https://source.example/wp-json/',
    perPage: 1,
    retries: 0,
    getHeaders: ({ context }) => context === 'edit' ? { Authorization: 'Basic private' } : {},
    onPublicFallback: (event) => fallbackEvents.push(event),
    fetchImpl: async (url, options) => {
      const parsed = new URL(url)
      requests.push({ parsed, authorization: options.headers.get('authorization') })
      if (parsed.searchParams.get('context') === 'edit') return jsonResponse({ message: 'denied' }, { status: 403 })
      const page = Number(parsed.searchParams.get('page'))
      return jsonResponse([{ id: page }], { headers: { 'x-wp-totalpages': '2' } })
    },
  })

  const records = await client.getCollection('wp/v2/pages', { context: 'edit', allowPublicFallback: true })

  assert.deepEqual(records.map(({ id }) => id), [1, 2])
  assert.equal(requests.length, 3)
  assert.equal(requests[0].authorization, 'Basic private')
  assert.equal(requests[1].authorization, null)
  assert.deepEqual(fallbackEvents, [{ endpoint: 'wp/v2/pages', status: 403 }])
})

test('REST client retries transient server failures and stops after recovery', async () => {
  let requests = 0
  const client = createWordPressRestClient({
    baseUrl: 'https://source.example/wp-json/',
    retries: 1,
    retryDelayMs: 0,
    fetchImpl: async () => {
      requests += 1
      return requests === 1
        ? jsonResponse({ message: 'temporary' }, { status: 503 })
        : jsonResponse({ id: 1 })
    },
  })

  assert.deepEqual(await client.getJson('wp/v2/pages/1'), { id: 1 })
  assert.equal(requests, 2)
})

test('Yoast sitemap transport retries a 503 with bounded backoff before returning its text', async () => {
  const delays = []
  const retries = []
  let requests = 0
  const fetchText = createRetryingFetchText({
    retries: 2,
    retryDelayMs: 5000,
    maxRetryDelayMs: 30000,
    maxRetryAfterMs: 120000,
    jitterRatio: 0,
    fetchImpl: async (url, options) => {
      requests += 1
      assert.equal(new URL(url).pathname, '/category-sitemap.xml')
      assert.equal(options.headers.Accept, 'application/xml,text/xml')
      assert.ok(options.signal instanceof AbortSignal)
      return requests === 1
        ? new Response('temporary failure', { status: 503 })
        : new Response('<urlset><url><loc>https://beautiful.wp.site/category/</loc></url></urlset>')
    },
    waitImpl: async (milliseconds) => delays.push(milliseconds),
    onRetry: (details) => retries.push(details),
  })

  const xml = await fetchText(new URL('https://beautiful.wp.site/category-sitemap.xml'), { name: 'category' })

  assert.match(xml, /beautiful\.wp\.site\/category\//)
  assert.equal(requests, 2)
  assert.deepEqual(delays, [5000])
  assert.deepEqual(retries.map(({ status, attempt, nextAttempt, delayMs }) => ({ status, attempt, nextAttempt, delayMs })), [
    { status: 503, attempt: 1, nextAttempt: 2, delayMs: 5000 },
  ])
})

test('Yoast sitemap transport honors Retry-After dates', async () => {
  const now = Date.parse('Wed, 07 Oct 2026 00:00:00 GMT')
  const delays = []
  let requests = 0
  const fetchText = createRetryingFetchText({
    retries: 2,
    retryDelayMs: 5000,
    maxRetryDelayMs: 30000,
    maxRetryAfterMs: 120000,
    jitterRatio: 0,
    fetchImpl: async () => requests++ === 0
      ? new Response('temporary failure', {
        status: 503,
        headers: { 'retry-after': new Date(now + 45000).toUTCString() },
      })
      : new Response('<urlset/>'),
    waitImpl: async (milliseconds) => delays.push(milliseconds),
    nowImpl: () => now,
  })

  await fetchText(new URL('https://beautiful.wp.site/page-sitemap.xml'), { name: 'page' })
  assert.deepEqual(delays, [45000])
})

test('Yoast sitemap transport caps Retry-After waits and fails permanent client errors immediately', async () => {
  const delays = []
  let requests = 0
  const fetchText = createRetryingFetchText({
    retries: 2,
    retryDelayMs: 5000,
    maxRetryDelayMs: 30000,
    maxRetryAfterMs: 120000,
    jitterRatio: 0,
    fetchImpl: async () => requests++ === 0
      ? new Response('temporary failure', { status: 503, headers: { 'retry-after': '180' } })
      : new Response('missing', { status: 404 }),
    waitImpl: async (milliseconds) => delays.push(milliseconds),
  })

  await assert.rejects(
    fetchText(new URL('https://beautiful.wp.site/post-sitemap.xml'), { name: 'post' }),
    /WordPress Yoast post sitemap failed: 404/,
  )
  assert.equal(requests, 2)
  assert.deepEqual(delays, [120000])
})

test('Yoast sitemap transport exhausts only the configured number of transient retries', async () => {
  const delays = []
  let requests = 0
  const fetchText = createRetryingFetchText({
    retries: 2,
    retryDelayMs: 300,
    maxRetryDelayMs: 500,
    maxRetryAfterMs: 1000,
    jitterRatio: 0,
    fetchImpl: async () => {
      requests += 1
      return new Response('temporary failure', { status: 503 })
    },
    waitImpl: async (milliseconds) => delays.push(milliseconds),
  })

  await assert.rejects(
    fetchText(new URL('https://beautiful.wp.site/page-sitemap.xml'), { name: 'page' }),
    /WordPress Yoast page sitemap failed: 503/,
  )
  assert.equal(requests, 3)
  assert.deepEqual(delays, [300, 500])
})

test('Yoast sitemap integration parses content returned through the retry helper', async () => {
  const fetchText = createRetryingFetchText({
    retries: 0,
    fetchImpl: async () => new Response('<urlset><url><loc>https://beautiful.wp.site/page/</loc></url></urlset>'),
  })
  const sitemaps = createYoastSitemapIntegration({
    siteUrl: 'https://beautiful.wp.site',
    sitemapNames: ['page'],
    fetchText,
  })

  assert.deepEqual(await sitemaps.load(), { page: ['https://beautiful.wp.site/page/'] })
})

test('content policies select Gutenberg per type and report incomplete coverage', () => {
  const policies = {
    default: { mode: 'rendered' },
    types: { post: { mode: 'auto', supportedBlockNames: ['core/paragraph'] } },
  }
  const postPolicy = resolveWordPressContentPolicy(policies, 'post')
  const projectPolicy = resolveWordPressContentPolicy(policies, 'project')
  const rawContent = '<!-- wp:paragraph --><p>Saved content</p><!-- /wp:paragraph -->'
  const unsupportedRaw = '<!-- wp:image --><figure>Image</figure><!-- /wp:image -->'

  assert.equal(postPolicy.mode, 'auto')
  assert.equal(projectPolicy.mode, 'rendered')
  assert.equal(convertWordPressContent({ rawContent, renderedHtml: '<p>Rendered</p>', ...postPolicy }).source, 'serialized-blocks')
  const fallback = convertWordPressContent({ rawContent: unsupportedRaw, renderedHtml: '<p>Rendered</p>', ...postPolicy })
  assert.equal(fallback.source, 'rendered-html')
  assert.deepEqual(fallback.unsupportedBlockNames, ['core/image'])
  assert.throws(() => convertWordPressContent({ rawContent: unsupportedRaw, mode: 'blocks' }), /unsupported block types/)
})

test('default Gutenberg coverage is a fixed list and unsupported blocks fall back to WordPress HTML', () => {
  const supportedContent = '<!-- wp:list --><ul><li>First</li></ul><!-- /wp:list -->'
  const unsupportedContent = '<!-- wp:image --><figure><img src="https://example.test/image.jpg" alt="Example"></figure><!-- /wp:image -->'

  assert.deepEqual(DEFAULT_SUPPORTED_BLOCK_NAMES, [
    'core/paragraph', 'core/heading', 'core/list', 'core/list-item',
  ])
  const supported = convertWordPressContent({
    rawContent: supportedContent,
    renderedHtml: '<p>Server rendered</p>',
  })
  assert.equal(supported.source, 'serialized-blocks')
  assert.deepEqual(supported.unsupportedBlockNames, [])
  assert.match(supported.html, /<ul><li>First<\/li><\/ul>/)

  const unsupported = convertWordPressContent({
    rawContent: unsupportedContent,
    renderedHtml: '<figure><img src="https://example.test/rendered.jpg" alt="Rendered"></figure>',
  })
  assert.equal(unsupported.source, 'rendered-html')
  assert.deepEqual(unsupported.unsupportedBlockNames, ['core/image'])
  assert.match(unsupported.html, /rendered\.jpg/)
})

test('serialized block transforms can read Gutenberg attributes before HTML normalization', () => {
  const source = '<!-- wp:paragraph {"style":{"color":{"text":"var:preset|color|primary"}}} --><p>Styled text</p><!-- /wp:paragraph -->'
  const result = convertWordPressContent({
    rawContent: source,
    mode: 'blocks',
    supportedBlockNames: ['core/paragraph'],
    transformBlock: ({ block, innerHTML }) => `${block.attrs.style.color.text}:${innerHTML}`,
  })

  assert.match(result.html, /^var:preset\|color\|primary:<p>Styled text<\/p>$/)
})

test('block transforms visit nested blocks and are skipped when rendered HTML is selected', () => {
  const source = '<!-- wp:group --><div class="wp-block-group"><!-- wp:paragraph {"style":{"color":{"text":"var:preset|color|primary"}}} --><p>Nested text</p><!-- /wp:paragraph --></div><!-- /wp:group -->'
  const transformed = convertWordPressContent({
    rawContent: source,
    mode: 'blocks',
    supportedBlockNames: ['core/group', 'core/paragraph'],
    transformBlock: ({ block, innerHTML }) => block.blockName === 'core/paragraph'
      ? innerHTML.replace('<p', '<p data-color-token="primary"')
      : innerHTML,
    sanitizerOptions: { additionalAttributes: { p: ['data-color-token'] } },
  })
  let renderedTransformCalls = 0
  const rendered = convertWordPressContent({
    rawContent: source,
    renderedHtml: '<p>Rendered</p>',
    mode: 'rendered',
    transformBlock: () => {
      renderedTransformCalls += 1
      return '<p>Incorrect serialized content</p>'
    },
  })

  assert.match(transformed.html, /<p data-color-token="primary">Nested text<\/p>/)
  assert.equal(rendered.html, '<p>Rendered</p>')
  assert.equal(renderedTransformCalls, 0)
})

test('WordPress palette and per-block link colors are extracted as safe reusable CSS values', () => {
  const source = `
    <style>
      :root{--wp--preset--color--primary:#ecc8c8;--wp--preset--color--copy:rgb(34 45 56 / 92%);}
      .wp-elements-1 a:where(:not(.wp-element-button)){color:var(--wp--preset--color--copy);}
      .wp-elements-2 a{color:var(--wp--preset--color--primary);}
      .wp-elements-3 a{color:url(https://invalid.example/color);}
      :root{--wp--preset--color--alias:var(--wp--preset--color--primary);}
      :root{--wp--preset--color--unsafe:url(https://invalid.example/payload);}
      :root{--wp--preset--color--cycle:var(--wp--preset--color--cycle);}
    </style>
  `

  const palette = extractWordPressColorPalette(source)
  const linkColors = extractWordPressLinkColors(source, { colorPalette: palette })

  assert.deepEqual(palette, {
    alias: '#ecc8c8',
    copy: 'rgb(34 45 56 / 92%)',
    primary: '#ecc8c8',
  })
  assert.deepEqual(linkColors, {
    'wp-elements-1': 'rgb(34 45 56 / 92%)',
    'wp-elements-2': '#ecc8c8',
  })
  assert.equal(isSafeCssColorValue('color-mix(in srgb, #333 50%, white)'), true)
  assert.equal(isSafeCssColorValue('red; background: url(https://invalid.example)'), false)
})

test('HTML sanitization keeps WordPress styles and requires explicit consumer CSS tokens', () => {
  const source = '<p style="color:var(--wp--preset--color--primary);font-family:var(--wp--preset--font-family--heading)">WordPress</p><p style="color:var(--theme--brand);font-family:Studio Serif">Theme</p>'
  const defaults = sanitizeWordPressHtml(source)
  const configured = sanitizeWordPressHtml(source, {
    allowedCssVariables: ['--theme--brand'],
    additionalFontFamilies: ['Studio Serif'],
  })

  assert.match(defaults, /color:var\(--wp--preset--color--primary\)/)
  assert.match(defaults, /font-family:var\(--wp--preset--font-family--heading\)/)
  assert.doesNotMatch(defaults, /--theme--brand|Studio Serif/)
  assert.match(configured, /color:var\(--theme--brand\)/)
  assert.match(configured, /font-family:Studio Serif/)
  assert.throws(() => sanitizeWordPressHtml(source, { allowedCssVariables: ['--theme--brand; color: red'] }), /Unsafe allowedCssVariables/)
  assert.throws(() => sanitizeWordPressHtml(source, { additionalFontFamilies: ['Studio Serif; color: red'] }), /Unsafe additionalFontFamilies/)
})

test('record contracts normalize routes and relations without retaining private source fields', () => {
  const routes = createWordPressRouteResolver({
    siteUrl: 'https://static.example',
    routes: { post: '/articles/{slug}/', author: '/authors/{slug}/' },
  })
  const rawContent = '<!-- wp:paragraph --><p>Visible text</p><!-- /wp:paragraph -->'
  const record = normalizeWordPressRecord({
    id: 21,
    slug: 'example-post',
    status: 'publish',
    link: 'https://source.example/example-post/',
    title: { rendered: '<strong>Example post</strong>' },
    content: { raw: rawContent, rendered: '<p>Visible text</p>' },
    meta: { subtitle: 'Public subtitle', secret: 'private value' },
    _embedded: {
      author: [{ id: 8, slug: 'author-eight', name: 'Author Eight', email: 'private@example.test' }],
      'wp:term': [[{ id: 5, taxonomy: 'topic', slug: 'research', name: 'Research', link: 'https://source.example/topic/research/' }]],
      'wp:featuredmedia': [{ id: 2, source_url: 'https://source.example/image.jpg', alt_text: 'Cover' }],
    },
  }, {
    type: 'post',
    contentPolicy: { mode: 'auto', supportedBlockNames: ['core/paragraph'] },
    routeResolver: routes,
    customFields: ['subtitle'],
  })

  assert.equal(record.route.path, '/articles/example-post/')
  assert.equal(record.route.outputPath, 'articles/example-post/index.html')
  assert.equal(record.route.canonicalUrl, 'https://static.example/articles/example-post/')
  assert.equal(record.content.source, 'serialized-blocks')
  assert.equal(record.author.route.path, '/authors/author-eight/')
  assert.equal(record.taxonomies[0].taxonomy, 'topic')
  assert.equal(record.featuredMedia.alt, 'Cover')
  assert.deepEqual(record.customFields, { subtitle: 'Public subtitle' })
  const serialized = JSON.stringify(record)
  assert.equal(serialized.includes(rawContent), false)
  assert.equal(serialized.includes('private@example.test'), false)
  assert.equal(serialized.includes('private value'), false)
})

test('authors are deduplicated by WordPress ID and routes detect output collisions', () => {
  const authors = collectWordPressAuthors([
    { _embedded: { author: [{ id: 4, slug: 'writer', name: 'Writer' }] } },
    { _embedded: { author: [{ id: 4, slug: 'writer', name: 'Writer' }] } },
    { _embedded: { author: [{ id: 5, slug: 'editor', name: 'Editor' }] } },
  ])

  assert.deepEqual(authors.map(({ id }) => id), [4, 5])
  assert.equal(toOutputPath('/'), 'index.html')
  assert.equal(toOutputPath('articles/example'), 'articles/example/index.html')
  assert.throws(() => assertNoWordPressRouteCollisions([
    { id: 1, type: 'page', path: '/same/' },
    { id: 2, type: 'post', path: '/same/' },
  ]), /collision/)
})
