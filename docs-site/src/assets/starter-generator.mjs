/******************************************************************************
 * This file is part of the wp-awesome package.
 *
 * File: docs-site/src/assets/starter-generator.mjs
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
 ******************************************************************************/

import { strToU8, zipSync } from 'fflate'
import DEFAULT_SUPPORTED_BLOCK_NAMES from '../../../supported-blocks.js'

/** Validates an HTTP(S) URL while keeping WordPress installation subdirectories. */
const normalizeUrl = (value, label, originOnly = false) => {
  // eslint-disable-next-line no-control-regex -- Reject control bytes before URL parsing normalizes them.
  if (typeof value !== 'string' || !value.trim() || /[\u0000-\u001f]/.test(value)) {
    throw new Error(`Enter a valid ${label}.`)
  }
  let url
  try {
    url = new URL(value.trim())
  } catch {
    throw new Error(`Enter a valid ${label}, including https://.`)
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error(`${label} must use HTTP(S), without credentials, a query, or a fragment.`)
  }
  if (originOnly && url.pathname !== '/') {
    throw new Error(`${label} must be a site origin, without a subdirectory.`)
  }
  if (!originOnly && /\/wp-json\/?$/.test(url.pathname)) {
    throw new Error(`${label} must be the WordPress installation URL, without /wp-json/.`)
  }
  return url.href.replace(/\/+$/, '')
}

/** Restricts starter routes to one slug placeholder and safe literal path segments. */
const normalizeRoute = (value, label) => {
  if (typeof value !== 'string' || !/^\/(?:[a-zA-Z0-9_-]+\/)*\{slug\}\/(?:[a-zA-Z0-9_-]+\/)*$/.test(value.trim())) {
    throw new Error(`${label} must be a path such as /pages/{slug}/ with exactly one {slug}.`)
  }
  return value.trim()
}

/** Validates and normalizes the first step's site and environment answers. */
export const validateSiteSettings = (answers) => {
  const options = { ...answers }
  options.siteName = String(options.siteName || '').trim()
  options.projectName = String(options.projectName || '').trim()
  // eslint-disable-next-line no-control-regex -- Downloaded project metadata must not contain control bytes.
  if (!options.siteName || options.siteName.length > 100 || /[\u0000-\u001f]/.test(options.siteName)) {
    throw new Error('Enter a site name of 1 to 100 characters.')
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(options.projectName) || options.projectName.length > 64) {
    throw new Error('Use a project folder name with lowercase letters, numbers, and hyphens.')
  }
  options.productionUrl = normalizeUrl(options.productionUrl, 'production URL', true)
  options.stagingUrl = normalizeUrl(options.stagingUrl, 'staging URL', true)
  if (options.productionUrl === options.stagingUrl) {
    throw new Error('Use different public URLs for production and staging.')
  }
  options.wordpressUrl = normalizeUrl(options.wordpressUrl, 'WordPress URL')
  options.stagingWordpressUrl = options.stagingWordpressUrl?.trim()
    ? normalizeUrl(options.stagingWordpressUrl, 'staging WordPress URL')
    : options.wordpressUrl
  if (!['en', 'fr'].includes(options.language)) throw new Error('Choose English or French for the site language.')
  return options
}

/** Validates assistant answers before generating any downloadable source. */
const validateOptions = (answers) => {
  const options = validateSiteSettings(answers)
  if (!options.pages && !options.posts) throw new Error('Select pages, posts, or both.')
  if (options.pages) options.pagesRoute = normalizeRoute(options.pagesRoute, 'Page routes')
  if (options.posts) options.postsRoute = normalizeRoute(options.postsRoute, 'Post routes')
  if (options.pages && options.posts && options.pagesRoute === options.postsRoute) {
    throw new Error('Use different route patterns for pages and posts.')
  }
  if (!['rendered', 'auto'].includes(options.contentMode)) throw new Error('Choose a supported content mode.')
  if (options.contentMode === 'auto') {
    for (const source of [options.wordpressUrl, options.stagingWordpressUrl]) {
      const url = new URL(source)
      if (url.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
        throw new Error('Authenticated WordPress URLs require HTTPS, except on loopback hosts.')
      }
    }
  }
  options.supportedBlockNames = options.contentMode === 'auto' ? [...DEFAULT_SUPPORTED_BLOCK_NAMES] : []
  if (!['local', 'npm', 'github'].includes(options.installation)) throw new Error('Choose a package installation source.')
  if (options.installation === 'local') {
    options.localPackagePath = String(options.localPackagePath || '').trim().replaceAll('\\', '/')
    // eslint-disable-next-line no-control-regex -- Keep control bytes out of generated dependency paths.
    if (!/^(\/|[a-zA-Z]:\/)/.test(options.localPackagePath) || /[\u0000-\u001f]/.test(options.localPackagePath)) {
      throw new Error('Enter the absolute path to your local wp-awesome checkout.')
    }
  }
  if (!/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(options.packageVersion)) {
    throw new Error('The documentation package version is invalid.')
  }
  if (!/^\^\d+\.\d+\.\d+$/.test(options.eleventyVersion)) {
    throw new Error('The documentation Eleventy version is invalid.')
  }
  if (!/^\^\d+\.\d+\.\d+$/.test(options.webAwesomeVersion)) {
    throw new Error('The documentation Web Awesome version is invalid.')
  }
  if (!/^\^\d+\.\d+\.\d+$/.test(options.fontAwesomeVersion)) {
    throw new Error('The documentation Font Awesome version is invalid.')
  }
  return options
}

/** Generates a build-only WordPress loader from the selected collections and routes. */
const createDataLoader = (options) => {
  const authenticated = options.contentMode === 'auto'
  const collections = [
    ...(options.pages ? [{ key: 'pages', type: 'page', route: options.pagesRoute }] : []),
    ...(options.posts ? [{ key: 'posts', type: 'post', route: options.postsRoute }] : []),
  ]
  const routeRules = collections.map(({ type, route }) => `      ${type}: ${JSON.stringify(route)},`).join('\n')
  const requests = collections.map(({ key, type }) => {
    const sourceName = `source${key[0].toUpperCase()}${key.slice(1)}`
    return `  const ${sourceName} = await rest.getCollection('wp/v2/${key}', {
    params: { status: 'publish', _embed: 1 },${authenticated ? "\n    context: 'edit',\n    allowPublicFallback: false," : ''}
    maxPages: 30,
  })
  const ${key} = ${sourceName}.map((record) => normalizeWordPressRecord(record, {
    type: '${type}',
    routeResolver: resolveRoute,
    contentPolicy: {
      mode: '${options.contentMode}',${authenticated ? `\n      supportedBlockNames: ${JSON.stringify(options.supportedBlockNames)},` : ''}
    },
  }))`
  }).join('\n\n')
  const keys = collections.map(({ key }) => key)

  return `'use strict'

const {
  assertNoWordPressRouteCollisions,${authenticated ? '\n  createApplicationPasswordHeaders,' : ''}
  createWordPressRestClient,
  createWordPressRouteResolver,
  normalizeWordPressRecord,
} = require('wp-awesome')

/** Loads only selected, published WordPress collections during the site build. */
module.exports = async () => {
  const wordpressOrigin = process.env.WORDPRESS_ORIGIN
  const siteUrl = process.env.SITE_URL
  if (!wordpressOrigin || !siteUrl) {
    throw new Error('WORDPRESS_ORIGIN and SITE_URL are required.')
  }
${authenticated ? `
  const username = process.env.WORDPRESS_API_USERNAME
  const applicationPassword = process.env.WORDPRESS_API_APPLICATION_PASSWORD
  if (!username || !applicationPassword) {
    throw new Error('Set the WordPress Application Password credentials in the build environment.')
  }
` : ''}
  const rest = createWordPressRestClient({
    baseUrl: wordpressOrigin.replace(/\\/+$/, '') + '/wp-json/',
    perPage: 100,
    retries: 3,
    timeoutMs: 20_000,${authenticated ? `
    // Scope credentials to authenticated edit-context requests.
    getHeaders: ({ context }) => context === 'edit'
      ? createApplicationPasswordHeaders(username, applicationPassword)
      : {},` : ''}
  })
  const resolveRoute = createWordPressRouteResolver({
    siteUrl,
    routes: {
${routeRules}
    },
  })

${requests}

  // Reserve the generated home page and audit every collection together.
  assertNoWordPressRouteCollisions([
    { type: 'home', outputPath: 'index.html' },
${keys.map((key) => `    ...${key},`).join('\n')}
  ])
  return { ${keys.join(', ')} }
}
`
}

/** Creates one pagination template per selected WordPress collection. */
const createCollectionTemplate = (collection) => `---
pagination:
  data: wordpress.${collection}
  size: 1
  alias: record
permalink: "{{ record.route.outputPath }}"
layout: layouts/page.njk
---
{{ record.content.html | safe }}
`

/** Generates a home page linking to each selected normalized record. */
const createHomeTemplate = (options) => {
  const french = options.language === 'fr'
  const groups = [
    ...(options.pages ? [{ key: 'pages', label: 'Pages' }] : []),
    ...(options.posts ? [{ key: 'posts', label: french ? 'Articles' : 'Posts' }] : []),
  ]
  return `---
layout: layouts/page.njk
permalink: index.html
---
<p class="home-intro">${french ? 'Votre contenu WordPress, présenté dans un site Eleventy.' : 'Your WordPress content, presented in an Eleventy frontend.'}</p>
${groups.map(({ key, label }) => `<wa-card class="collection-card" appearance="outlined">
  <div slot="header" class="collection-heading"><wa-icon name="${key === 'pages' ? 'file-lines' : 'newspaper'}" aria-hidden="true"></wa-icon><h2>${label}</h2></div>
  <ul>
    {% for record in wordpress.${key} %}
      <li><wa-icon name="arrow-right" aria-hidden="true"></wa-icon><a href="{{ record.route.path }}">{{ record.title.text }}</a></li>
    {% endfor %}
  </ul>
</wa-card>`).join('\n')}
`
}

/** Generates environment examples without requesting or embedding real credentials. */
const createEnvironment = (wordpressUrl, siteUrl, authenticated) => `# Build-only configuration. Copy this example to the matching .env file.
WORDPRESS_ORIGIN=${JSON.stringify(wordpressUrl)}
SITE_URL=${JSON.stringify(siteUrl)}
${authenticated ? '\n# Set these locally or in CI secrets before using edit context.\nWORDPRESS_API_USERNAME=\nWORDPRESS_API_APPLICATION_PASSWORD=\n' : ''}`

/**
 * Builds the consumer files and commands from the setup assistant's answers.
 * @param {object} answers Site, environment, content, and installation settings.
 * @returns {{options: object, files: object[], commands: object[]}} Downloadable source and setup steps.
 */
export const generateStarter = (answers) => {
  const options = validateOptions(answers)
  const dependency = options.installation === 'local'
    ? `file:${options.localPackagePath}`
    : options.installation === 'github'
      ? `github:chdenat/wp-awesome#v${options.packageVersion}`
      : `^${options.packageVersion}`
  const cli = './node_modules/@11ty/eleventy/cmd.cjs --config=.eleventy.cjs'
  const manifest = {
    name: options.projectName,
    private: true,
    type: 'commonjs',
    scripts: {
      build: `bun --env-file=.env ${cli}`,
      serve: `bun --env-file=.env ${cli} --serve`,
      'build:staging': `bun --env-file=.env.staging ${cli}`,
      'serve:staging': `bun --env-file=.env.staging ${cli} --serve`,
      'build:production': `bun --env-file=.env.production ${cli}`,
    },
    dependencies: {
      '@awesome.me/webawesome': options.webAwesomeVersion,
      '@fortawesome/fontawesome-free': options.fontAwesomeVersion,
      'wp-awesome': dependency,
    },
    devDependencies: { '@11ty/eleventy': options.eleventyVersion },
  }
  const files = [
    { path: 'package.json', language: 'json', content: JSON.stringify(manifest, null, 2) + '\n' },
    { path: 'bunfig.toml', language: 'toml', content: '# Keep each frontend build on its selected environment file.\nenv = false\n' },
    {
      path: '.eleventy.cjs', language: 'javascript', content: `'use strict'

const { createWordPressEleventyPlugin } = require('wp-awesome')
const loadWordPressData = require('./site/wordpress-data.cjs')

/** Registers build-time content and the consumer's own template configuration. */
module.exports = (eleventyConfig) => {
  eleventyConfig.setNunjucksEnvironmentOptions({ autoescape: true })
  eleventyConfig.addPassthroughCopy({ 'node_modules/@awesome.me/webawesome/dist': 'assets/webawesome' })
  eleventyConfig.addPassthroughCopy({ 'node_modules/@fortawesome/fontawesome-free/svgs': 'assets/fontawesome/svgs' })
  eleventyConfig.addPassthroughCopy({ 'node_modules/@fortawesome/fontawesome-free/css': 'assets/fontawesome/css' })
  eleventyConfig.addPassthroughCopy({ 'node_modules/@fortawesome/fontawesome-free/webfonts': 'assets/fontawesome/webfonts' })
  eleventyConfig.addPassthroughCopy({ 'src/assets': 'assets' })
  eleventyConfig.addGlobalData('site', {
    name: ${JSON.stringify(options.siteName)},
    language: '${options.language}',
    url: process.env.SITE_URL,
  })
  eleventyConfig.addPlugin(createWordPressEleventyPlugin({ loadData: loadWordPressData }))
  return {
    dir: { input: 'src', includes: '_includes', output: '_site' },
    templateFormats: ['njk'],
    htmlTemplateEngine: 'njk',
  }
}
`,
    },
    { path: '.gitignore', language: 'text', content: 'node_modules/\n_site/\n.env\n.env.*\n!.env.example\n!.env.*.example\n' },
    { path: '.env.example', language: 'bash', content: createEnvironment(options.stagingWordpressUrl, options.stagingUrl, options.contentMode === 'auto') },
    { path: '.env.staging.example', language: 'bash', content: createEnvironment(options.stagingWordpressUrl, options.stagingUrl, options.contentMode === 'auto') },
    { path: '.env.production.example', language: 'bash', content: createEnvironment(options.wordpressUrl, options.productionUrl, options.contentMode === 'auto') },
    { path: 'site/wordpress-data.cjs', language: 'javascript', content: createDataLoader(options) },
    {
      path: 'src/assets/site.js', language: 'javascript', content: `import { setIconPath } from './webawesome/utilities/base-path.js'

setIconPath(new URL('./fontawesome/svgs/', import.meta.url).href)

await Promise.all([
  import('./webawesome/components/button/button.js'),
  import('./webawesome/components/card/card.js'),
  import('./webawesome/components/icon/icon.js'),
  import('./webawesome/components/page/page.js'),
  import('./webawesome/components/tag/tag.js'),
])
`,
    },
    {
      path: 'src/assets/site.css', language: 'css', content: `:root {
  color-scheme: light;
  font-family: var(--wa-font-family-body);
  color: var(--wa-color-text-normal);
}

body { margin: 0; }
.site-header { padding: var(--wa-space-m) var(--wa-space-2xl); }
.site-header a { color: var(--wa-color-text-normal); font-weight: 750; text-decoration: none; }
.site-nav { display: grid; padding: var(--wa-space-l); gap: var(--wa-space-xs); }
.site-nav a { padding: var(--wa-space-xs) var(--wa-space-s); border-radius: var(--wa-border-radius-m); color: var(--wa-color-text-normal); text-decoration: none; }
.site-nav a:hover { background: var(--wa-color-brand-fill-quiet); color: var(--wa-color-brand-on-quiet); }
.site-main { inline-size: min(100%, 80ch); margin-inline: auto; padding: var(--wa-space-3xl) var(--wa-space-l); }
.site-main > h1 { margin-block-start: 0; font-size: var(--wa-font-size-4xl); }
.site-main wa-card { --spacing: var(--wa-space-l); }
.site-main wa-card + wa-card { margin-block-start: var(--wa-space-l); }
.site-main wa-card::part(header) { border-block-end-color: var(--wa-color-surface-border); }
.collection-heading { display: flex; align-items: center; gap: var(--wa-space-s); }
.collection-heading h2 { margin: 0; font-size: var(--wa-font-size-xl); }
.collection-heading wa-icon { color: var(--wa-color-brand-on-quiet); }
.home-intro { margin-block: 0 var(--wa-space-xl); color: var(--wa-color-text-quiet); font-size: var(--wa-font-size-l); }
.site-main li + li { margin-block-start: var(--wa-space-xs); }
.site-main li wa-icon { margin-inline-end: var(--wa-space-xs); color: var(--wa-color-brand-on-quiet); }
.site-footer { padding: var(--wa-space-l); border-block-start: var(--wa-border-width-s) solid var(--wa-color-surface-border); color: var(--wa-color-text-quiet); text-align: center; }
` ,
    },
    { path: 'src/index.njk', language: 'jinja2', content: createHomeTemplate(options) },
    ...(options.pages ? [{ path: 'src/pages.njk', language: 'jinja2', content: createCollectionTemplate('pages') }] : []),
    ...(options.posts ? [{ path: 'src/posts.njk', language: 'jinja2', content: createCollectionTemplate('posts') }] : []),
    {
      path: 'src/_includes/layouts/page.njk', language: 'jinja2', content: `<!doctype html>
<html class="wa-theme-awesome wa-palette-default wa-brand-blue wa-light" lang="{{ site.language }}" data-icon-base="/assets/fontawesome/">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ record.title.text if record else site.name }}</title>
    <link rel="canonical" href="{{ record.route.canonicalUrl if record else site.url ~ '/' }}">
    <link rel="stylesheet" href="/assets/webawesome/styles/webawesome.css">
    <link rel="stylesheet" href="/assets/webawesome/styles/color/palettes/default.css">
    <link rel="stylesheet" href="/assets/webawesome/styles/themes/awesome.css">
    <link rel="stylesheet" href="/assets/webawesome/styles/color/variants.css">
    <link rel="stylesheet" href="/assets/fontawesome/css/all.min.css">
    <link rel="stylesheet" href="/assets/site.css">
    <script type="module" src="/assets/site.js"></script>
  </head>
  <body>
    <wa-page class="site-shell" mobile-breakpoint="64rem">
      <header slot="header" class="site-header"><a href="/">{{ site.name }}</a></header>
      <nav slot="navigation" class="site-nav" aria-label="${options.language === 'fr' ? 'Navigation principale' : 'Main navigation'}"><a href="/">${options.language === 'fr' ? 'Accueil' : 'Home'}</a></nav>
      <main class="site-main">
      <h1>{{ record.title.text if record else site.name }}</h1>
      {% if record %}<wa-card class="content-card" appearance="outlined">{{ content | safe }}</wa-card>{% else %}{{ content | safe }}{% endif %}
      </main>
      <footer slot="footer" class="site-footer">${options.language === 'fr' ? 'Réalisé avec WP Awesome et Eleventy' : 'Built with WP Awesome and Eleventy'}</footer>
    </wa-page>
  </body>
</html>
`,
    },
  ]
  const commands = [
    { title: '1. Open the frontend project and install dependencies', content: `cd ${options.projectName}\nbun install\n` },
    { title: '2. Prepare the environment files', content: 'cp .env.example .env\ncp .env.staging.example .env.staging\ncp .env.production.example .env.production\n' },
    { title: '3. Preview locally using staging settings', content: 'bun run serve\n' },
    { title: '4. Build and test staging before production', content: 'bun run build:staging\n' },
    { title: '5. Build production after staging passes', content: 'bun run build:production\n' },
  ]
  return { options, files, commands }
}

/**
 * Packages every generated source file under the chosen project folder in a ZIP.
 * @param {{options: object, files: object[]}} starter Validated assistant output.
 * @returns {Uint8Array} UTF-8 ZIP archive suitable for a browser download.
 */
export const createStarterArchive = (starter) => zipSync(Object.fromEntries(
  starter.files.map((file) => [`${starter.options.projectName}/${file.path}`, strToU8(file.content)]),
), { level: 6 })
