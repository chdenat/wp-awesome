/******************************************************************************
 * This file is part of the wp-awesome package.
 *
 * File: test/docs-starter.test.mjs
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
 ******************************************************************************/

import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { runInNewContext } from 'node:vm'
import { strFromU8, unzipSync } from 'fflate'
import { test } from 'vitest'
import { createStarterArchive, generateStarter } from '../docs-site/src/assets/starter-generator.mjs'

/** Repository root used only by disposable local consumer fixtures. */
const root = fileURLToPath(new URL('..', import.meta.url))
/** Package metadata keeps generated manifests aligned with the current repository. */
const metadata = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
/** Default assistant answers for a consumer with separate public environments. */
const answers = {
  siteName: 'Beautiful site',
  projectName: 'beautiful-site',
  productionUrl: 'https://beautiful.wp.site',
  stagingUrl: 'https://staging.beautiful.example',
  wordpressUrl: 'https://beautiful.wp.site/cms/',
  stagingWordpressUrl: '',
  language: 'en',
  pages: true,
  posts: true,
  pagesRoute: '/pages/{slug}/',
  postsRoute: '/journal/{slug}/',
  contentMode: 'rendered',
  supportedBlockNames: 'core/paragraph, core/heading, core/list, core/list-item',
  installation: 'local',
  localPackagePath: root,
  packageVersion: metadata.version,
  eleventyVersion: metadata.devDependencies['@11ty/eleventy'],
  webAwesomeVersion: metadata.devDependencies['@awesome.me/webawesome'],
  fontAwesomeVersion: metadata.devDependencies['@fortawesome/fontawesome-free'],
}
/** Finds a generated file by its consumer-relative path. */
const fileContent = (starter, path) => starter.files.find((file) => file.path === path)?.content
/** Evaluates the actual generated loader with a deterministic REST transport and isolated environment. */
const loadGeneratedData = async (starter, environment, fetchImpl) => {
  const require = createRequire(import.meta.url)
  const runtime = require('../index.js')
  const module = { exports: {} }
  runInNewContext(fileContent(starter, 'site/wordpress-data.cjs'), {
    module,
    process: { env: environment },
    require: () => ({
      ...runtime,
      createWordPressRestClient: (options) => runtime.createWordPressRestClient({ ...options, retries: 0, fetchImpl }),
    }),
  })
  return module.exports()
}

test('assistant files keep production, staging, shared WordPress, and selected templates consistent', () => {
  const starter = generateStarter(answers)
  const manifest = JSON.parse(fileContent(starter, 'package.json'))
  assert.equal(manifest.dependencies['wp-awesome'], `file:${root}`)
  assert.equal(manifest.dependencies['@awesome.me/webawesome'], answers.webAwesomeVersion)
  assert.equal(manifest.dependencies['@fortawesome/fontawesome-free'], answers.fontAwesomeVersion)
  assert.equal(manifest.engines, undefined)
  assert.equal(manifest.devDependencies['@11ty/eleventy'], answers.eleventyVersion)
  assert.match(manifest.scripts['build:staging'], /^bun --env-file=\.env\.staging.*--config=\.eleventy\.cjs/)
  assert.match(manifest.scripts['build:production'], /^bun --env-file=\.env\.production.*--config=\.eleventy\.cjs/)
  assert.doesNotMatch(JSON.stringify(manifest), /Node\.js/)
  assert.match(fileContent(starter, 'src/_includes/layouts/page.njk'), /wa-theme-awesome/)
  assert.match(fileContent(starter, 'src/_includes/layouts/page.njk'), /assets\/webawesome\/styles\/themes\/awesome\.css/)
  assert.match(fileContent(starter, 'src/assets/site.js'), /setIconPath/)
  assert.match(fileContent(starter, 'src/assets/site.js'), /components\/page\/page\.js/)
  assert.match(fileContent(starter, '.env.production.example'), /SITE_URL="https:\/\/beautiful\.wp\.site"/)
  assert.match(fileContent(starter, '.env.staging.example'), /SITE_URL="https:\/\/staging\.beautiful\.example"/)
  assert.match(fileContent(starter, '.env.staging.example'), /WORDPRESS_ORIGIN="https:\/\/beautiful\.wp\.site\/cms"/)
  assert.equal(fileContent(starter, '.env.example'), fileContent(starter, '.env.staging.example'))
  assert.ok(fileContent(starter, 'src/pages.njk'))
  assert.ok(fileContent(starter, 'src/posts.njk'))
  assert.doesNotMatch(fileContent(starter, 'site/wordpress-data.cjs'), /ApplicationPassword|WORDPRESS_API_|context: 'edit'/)

  const postsOnly = generateStarter({ ...answers, pages: false, language: 'fr', installation: 'npm' })
  assert.equal(fileContent(postsOnly, 'src/pages.njk'), undefined)
  assert.doesNotMatch(fileContent(postsOnly, 'src/index.njk'), /wordpress\.pages/)
  assert.match(fileContent(postsOnly, 'src/index.njk'), /Articles/)
  assert.match(fileContent(postsOnly, 'src/index.njk'), /Votre contenu WordPress, présenté dans un site Eleventy/)
  const frenchLayout = fileContent(postsOnly, 'src/_includes/layouts/page.njk')
  assert.match(frenchLayout, /aria-label="Navigation principale".*>Accueil</)
  assert.match(frenchLayout, /Réalisé avec WP Awesome et Eleventy/)
  assert.equal(JSON.parse(fileContent(postsOnly, 'package.json')).dependencies['wp-awesome'], `^${metadata.version}`)
  const windows = generateStarter({ ...answers, localPackagePath: 'C:\\Projects\\wp-awesome' })
  assert.equal(JSON.parse(fileContent(windows, 'package.json')).dependencies['wp-awesome'], 'file:C:/Projects/wp-awesome')
})

test.each([
  [{ productionUrl: 'javascript:alert(1)' }, /HTTP\(S\)/],
  [{ wordpressUrl: 'https://user:password@beautiful.wp.site' }, /credentials/],
  [{ stagingUrl: answers.productionUrl }, /different public URLs/],
  [{ productionUrl: 'https://beautiful.wp.site/subdirectory/' }, /without a subdirectory/],
  [{ wordpressUrl: 'https://beautiful.wp.site/wp-json/' }, /without \/wp-json\//],
  [{ projectName: '../existing-project' }, /folder name/],
  [{ pages: false, posts: false }, /Select pages/],
  [{ pagesRoute: '/../../{slug}/' }, /Page routes/],
  [{ pagesRoute: answers.postsRoute }, /different route patterns/],
  [{ localPackagePath: 'relative/path' }, /absolute path/],
  [{ contentMode: 'auto', wordpressUrl: 'http://beautiful.wp.site' }, /require HTTPS/],
])('assistant rejects invalid settings before creating files: %j', (changes, message) => {
  assert.throws(() => generateStarter({ ...answers, ...changes }), message)
})

test('ZIP download preserves every source path and exact UTF-8 file content', () => {
  const starter = generateStarter({ ...answers, siteName: 'L’été & les montagnes' })
  const extracted = unzipSync(createStarterArchive(starter))
  assert.equal(Object.keys(extracted).length, starter.files.length)
  for (const file of starter.files) {
    assert.equal(strFromU8(extracted[`beautiful-site/${file.path}`]), file.content)
  }
})

test('saved-block mode uses the built-in list without asking for user input', () => {
  const starter = generateStarter({ ...answers, contentMode: 'auto', supportedBlockNames: '' })
  const loader = fileContent(starter, 'site/wordpress-data.cjs')
  assert.match(loader, /supportedBlockNames: \["core\/paragraph","core\/heading","core\/list","core\/list-item"\]/)
})

test('generated authenticated loader scopes credentials, uses auto mode, and omits raw content', async () => {
  const starter = generateStarter({ ...answers, contentMode: 'auto', pages: false })
  assert.match(fileContent(starter, '.env.staging.example'), /WORDPRESS_API_APPLICATION_PASSWORD=\n/)
  const requests = []
  const data = await loadGeneratedData(starter, {
    WORDPRESS_ORIGIN: answers.wordpressUrl,
    SITE_URL: answers.stagingUrl,
    WORDPRESS_API_USERNAME: 'fixture-build',
    WORDPRESS_API_APPLICATION_PASSWORD: 'nonfunctional fixture password',
  }, async (url, options) => {
    requests.push({ url: new URL(url), headers: options.headers })
    return new Response(JSON.stringify([{
      id: 1, slug: 'hello', status: 'publish', title: { rendered: 'Hello' },
      content: { raw: '<!-- wp:paragraph --><p>Saved block</p><!-- /wp:paragraph -->', rendered: '<p>Rendered block</p>' },
    }]), { headers: { 'content-type': 'application/json', 'x-wp-totalpages': '1' } })
  })
  assert.equal(requests[0].url.pathname, '/cms/wp-json/wp/v2/posts')
  assert.equal(requests[0].url.searchParams.get('context'), 'edit')
  assert.equal(requests[0].url.searchParams.get('status'), 'publish')
  assert.match(requests[0].headers.get('authorization'), /^Basic /)
  assert.equal(data.posts[0].content.source, 'serialized-blocks')
  assert.equal(data.posts[0].content.html, '<p>Saved block</p>')
  assert.equal(data.posts[0].route.canonicalUrl, `${answers.stagingUrl}/journal/hello/`)
  assert.doesNotMatch(JSON.stringify(data), /nonfunctional|fixture-build|content\.raw|<!-- wp:/)
  await assert.rejects(loadGeneratedData(starter, {}, async () => new Response()), /WORDPRESS_ORIGIN and SITE_URL/)
  await assert.rejects(loadGeneratedData(starter, { WORDPRESS_ORIGIN: answers.wordpressUrl, SITE_URL: answers.stagingUrl }, async () => new Response()), /Application Password credentials/)
})

test('generated loader rejects record output collisions before templates can overwrite files', async () => {
  const starter = generateStarter({ ...answers, posts: false })
  await assert.rejects(loadGeneratedData(starter, {
    WORDPRESS_ORIGIN: answers.wordpressUrl, SITE_URL: answers.stagingUrl,
  }, async () => new Response(JSON.stringify([
    { id: 1, slug: 'same', title: { rendered: 'First' } },
    { id: 2, slug: 'same', title: { rendered: 'Second' } },
  ]), { headers: { 'content-type': 'application/json' } })), /route collision/)
})

test('generated staging and production commands build real Eleventy routes and safely escaped templates', async () => {
  const consumer = mkdtempSync(join(tmpdir(), 'wp-awesome-starter-'))
  const requests = []
  const server = createServer((request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1')
    requests.push({ url, authorization: request.headers.authorization })
    const post = url.pathname.endsWith('/posts')
    response.writeHead(200, { 'content-type': 'application/json', 'x-wp-totalpages': '1' })
    response.end(JSON.stringify([{
      id: post ? 2 : 1,
      slug: post ? 'hello-world' : 'about',
      status: 'publish',
      title: { rendered: 'A &amp; B &lt;img src=x onerror=alert(1)&gt;' },
      content: { rendered: '<p>Public content</p><script>privateScript()</script>' },
    }]))
  })
  try {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    const origin = `http://127.0.0.1:${server.address().port}`
    const starter = generateStarter({
      ...answers, siteName: 'A <em>site</em> & team',
      wordpressUrl: `${origin}/production-cms`, stagingWordpressUrl: `${origin}/staging-cms`,
    })
    for (const file of starter.files) {
      const path = join(consumer, file.path)
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(path, file.content)
    }
    for (const environment of ['staging', 'production']) {
      writeFileSync(join(consumer, `.env.${environment}`), fileContent(starter, `.env.${environment}.example`))
    }
    // The default preview file must not override a selected staging or production build.
    writeFileSync(join(consumer, '.env'), 'WORDPRESS_ORIGIN=https://wrong.invalid\nSITE_URL=https://wrong.invalid\n')
    mkdirSync(join(consumer, 'node_modules/@11ty'), { recursive: true })
    mkdirSync(join(consumer, 'node_modules/@awesome.me'), { recursive: true })
    mkdirSync(join(consumer, 'node_modules/@fortawesome'), { recursive: true })
    symlinkSync(root, join(consumer, 'node_modules/wp-awesome'), 'dir')
    symlinkSync(join(root, 'node_modules/@11ty/eleventy'), join(consumer, 'node_modules/@11ty/eleventy'), 'dir')
    symlinkSync(join(root, 'node_modules/@awesome.me/webawesome'), join(consumer, 'node_modules/@awesome.me/webawesome'), 'dir')
    symlinkSync(join(root, 'node_modules/@fortawesome/fontawesome-free'), join(consumer, 'node_modules/@fortawesome/fontawesome-free'), 'dir')
    const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) => key !== 'SITE_URL' && !key.startsWith('WORDPRESS_')))
    for (const target of ['staging', 'production']) {
      await promisify(execFile)('bun', ['run', `build:${target}`], { cwd: consumer, env: environment })
      const canonicalOrigin = target === 'staging' ? answers.stagingUrl : answers.productionUrl
      const home = readFileSync(join(consumer, '_site/index.html'), 'utf8')
      const page = readFileSync(join(consumer, '_site/pages/about/index.html'), 'utf8')
      const post = readFileSync(join(consumer, '_site/journal/hello-world/index.html'), 'utf8')
      assert.match(home, /A &lt;em&gt;site&lt;\/em&gt; &amp; team/)
      assert.ok(home.includes(`href="${canonicalOrigin}/"`))
      assert.ok(page.includes(`href="${canonicalOrigin}/pages/about/"`))
      assert.ok(post.includes(`href="${canonicalOrigin}/journal/hello-world/"`))
      assert.match(page, /A &amp; B &lt;img src=x onerror=alert\(1\)&gt;/)
      assert.match(post, /<p>Public content<\/p>/)
      assert.doesNotMatch(page + post, /<script>|privateScript|<img src=x/)
      assert.ok(home.includes('assets/webawesome/styles/webawesome.css'))
      assert.ok(home.includes('assets/fontawesome/css/all.min.css'))
      assert.ok(readFileSync(join(consumer, '_site/assets/fontawesome/svgs/brands/wordpress-simple.svg'), 'utf8').includes('<svg'))
    }
    assert.deepEqual(requests.map(({ url }) => url.pathname).sort(), [
      '/production-cms/wp-json/wp/v2/pages', '/production-cms/wp-json/wp/v2/posts',
      '/staging-cms/wp-json/wp/v2/pages', '/staging-cms/wp-json/wp/v2/posts',
    ])
    assert.ok(requests.every(({ url, authorization }) => url.searchParams.get('status') === 'publish' && !authorization))
  } finally {
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
    rmSync(consumer, { recursive: true, force: true })
  }
})
