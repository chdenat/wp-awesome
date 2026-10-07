/******************************************************************************
 * This file is part of the wp-awesome package.
 *
 * File: test/security.test.mjs
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
const { convertWordPressContent, normalizeWordPressRecord, sanitizeWordPressHtml } = require('../index.js')

test('WordPress HTML sanitizer removes active markup, event handlers, unsafe URLs, and SVG', () => {
  const html = sanitizeWordPressHtml(`
    <p onclick="alert(1)" style="color:#333;margin:1rem 0;background-image:url(https://evil.example/x);position:fixed">
      Safe <script>alert(1)</script><a href="javas&#99;ript:alert(1)" target="_blank">link</a>
      <img src="data:image/svg+xml,<svg onload=alert(1)>" onerror="alert(2)" alt="cover">
      <svg onload="alert(3)"><script>alert(4)</script></svg>
      <iframe src="https://evil.example/frame">fallback</iframe>
    </p>
  `)

  assert.match(html, /Safe/)
  assert.match(html, /<a target="_blank" rel="noopener noreferrer">link<\/a>/)
  assert.doesNotMatch(html, /<script|<svg|<iframe|on(?:click|error|load)=|javascript:|data:image|url\(|position:fixed/i)
})

test('WordPress HTML sanitizer preserves safe design styles and blocks CSS injection properties', () => {
  const html = sanitizeWordPressHtml('<div style="color:var(--wp--preset--color--primary); padding:1rem 2rem; border-top-left-radius:50%; background:linear-gradient(white, #eee); position:fixed; z-index:9999; background-image:linear-gradient(red, url(foo)); --wp--custom--x:url(https://evil.example/x)">Card</div>')

  assert.match(html, /color:var\(--wp--preset--color--primary\)/)
  assert.match(html, /padding:1rem 2rem/)
  assert.match(html, /border-top-left-radius:50%/)
  assert.match(html, /background:linear-gradient\(white, #eee\)/)
  assert.doesNotMatch(html, /position:|z-index:|url\(|--wp--custom--x/i)
})

test('CSS background images require an exact uploads prefix and a raster filename', () => {
  const html = sanitizeWordPressHtml(`
    <div style="background-image:url(https://beautiful.wp.site/wp-content/uploads/2026/cover.webp)">Local cover</div>
    <div style="background-image:url(https://evil.example/wp-content/uploads/2026/cover.webp)">Remote cover</div>
    <div style="background-image:url(https://beautiful.wp.site/wp-content/uploads/2026/payload.svg)">Vector cover</div>
  `, { allowedBackgroundImagePrefixes: ['https://beautiful.wp.site/wp-content/uploads'] })

  assert.match(html, /background-image:url\(https:\/\/beautiful\.wp\.site\/wp-content\/uploads\/2026\/cover\.webp\)/)
  assert.equal((html.match(/background-image:/g) || []).length, 1)
  assert.throws(() => sanitizeWordPressHtml('<p>bad</p>', { allowedBackgroundImagePrefixes: ['https://evil.example/assets'] }), /Unsafe allowedBackgroundImagePrefixes/)
})

test('image aspect ratios survive normalization while unsafe CSS values are removed', () => {
  for (const ratio of ['1', '16 / 9', '0.6722689075630253', 'auto 4 / 3']) {
    const record = normalizeWordPressRecord({
      id: 6,
      type: 'page',
      slug: 'image-ratio',
      content: { rendered: `<figure><img src="https://beautiful.wp.site/cover.jpg" style="aspect-ratio:${ratio};object-fit:cover;width:350px;height:auto"></figure>` },
    }, { siteUrl: 'https://static.example', contentPolicy: { mode: 'rendered' } })

    assert.match(record.content.html, /aspect-ratio:/)
    assert.ok(record.content.html.includes(`aspect-ratio:${ratio}`))
    assert.match(record.content.html, /object-fit:cover/)
  }

  for (const ratio of ['-1', '16 / -9', 'var(--untrusted)', 'url(https://evil.example/x)', 'expression(alert(1))']) {
    const html = sanitizeWordPressHtml(`<img src="/cover.jpg" style="aspect-ratio:${ratio};object-fit:cover">`)
    assert.doesNotMatch(html, /aspect-ratio:/)
    assert.match(html, /object-fit:cover/)
  }
})

test('final Gutenberg and custom renderer HTML is sanitized after consumer transforms', () => {
  const converted = convertWordPressContent({
    rawContent: '<!-- wp:custom/dynamic /-->',
    mode: 'blocks',
    blockRenderers: {
      'custom/dynamic': () => '<wa-button href="javascript:alert(1)" onclick="alert(2)">Open</wa-button><script>alert(3)</script>',
    },
    sanitizerOptions: {
      additionalTags: ['wa-button'],
      additionalAttributes: { 'wa-button': ['href', 'target', 'rel'] },
    },
  })

  assert.equal(converted.html, '<wa-button>Open</wa-button>')
  assert.throws(() => sanitizeWordPressHtml('<p>unsafe</p>', { additionalAttributes: { '*': ['onclick'] } }), /Unsafe additional HTML attribute/)
  assert.throws(() => sanitizeWordPressHtml('<custom-element>x</custom-element>', { additionalTags: ['script'] }), /Unsafe additional HTML tag/)
})

test('normalized records sanitize every retained HTML field and direct URL field', () => {
  const record = normalizeWordPressRecord({
    id: 5,
    type: 'post',
    slug: 'safe-record',
    link: 'javascript:alert(1)',
    title: { rendered: '<img src=x onerror=alert(1)>Hello<script>alert(2)</script>' },
    excerpt: { rendered: '<strong>Summary</strong><iframe src="https://evil.example">hidden</iframe>' },
    content: { rendered: '<p>Body</p><script>alert(3)</script>' },
    _embedded: {
      author: [{ id: 8, slug: 'author', name: 'Author', description: '<img src=x onerror=alert(4)>Bio', url: 'javascript:alert(5)', link: 'javascript:alert(6)', avatar_urls: { safe: 'https://cdn.example/avatar.jpg', unsafe: 'data:image/svg+xml,x' } }],
      'wp:term': [[{ id: 3, taxonomy: 'topic', slug: 'news', name: 'News', description: '<svg onload=alert(7)>bad</svg>Topic', link: 'data:text/html,x' }]],
      'wp:featuredmedia': [{ id: 2, source_url: 'javascript:alert(8)', alt_text: 'Cover', caption: { rendered: '<strong>Caption</strong><script>alert(9)</script>' } }],
    },
  }, { siteUrl: 'https://static.example', contentPolicy: { mode: 'rendered' } })

  assert.equal(record.title.html, '<img src="x" />Hello')
  assert.equal(record.excerpt.html, '<strong>Summary</strong>')
  assert.equal(record.content.html, '<p>Body</p>')
  assert.equal(record.author.description, '<img src="x" />Bio')
  assert.equal(record.author.url, null)
  assert.equal(record.author.sourceUrl, null)
  assert.deepEqual(record.author.avatarUrls, { safe: 'https://cdn.example/avatar.jpg' })
  assert.equal(record.taxonomies[0].description, 'Topic')
  assert.equal(record.taxonomies[0].sourceUrl, null)
  assert.equal(record.featuredMedia.url, null)
  assert.equal(record.featuredMedia.captionHtml, '<strong>Caption</strong>')
  assert.doesNotMatch(JSON.stringify(record), /onerror|onload|javascript:|data:text|<script|<svg/i)
})
