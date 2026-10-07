---
layout: layouts/docs.njk
title: Complete example
section: Reference
description: A small consumer project that fetches published pages from beautiful.wp.site and lets Eleventy generate their canonical static routes.
permalink: complete-example/index.html
---
<!--
 * This file is part of the wp-awesome package.
 *
 * File: docs-site/src/complete-example.md
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
-->

This example uses public rendered page HTML, one route family, one Eleventy loader, and one pagination template. The domain is fictitious; replace it and provide environment variables before building.

This page is an optional JavaScript library example. For installing the WordPress plugin and testing staging before production, start with [WP Awesome deployment](/setup-assistant/). Code blocks on this page can be copied when JavaScript is enabled.

## Project tree

```text
beautiful-site/
├── .eleventy.cjs
├── package.json
├── site/
│   └── wordpress-data.cjs
└── src/
    ├── pages.njk
    └── _includes/
        └── layouts/
            └── page.njk
```

## `package.json`

Before a registry release, install the local package directory. In this manifest, the package version range shows the dependency you would use after a matching version is published.

```json
{
  "private": true,
  "scripts": {
    "build": "eleventy",
    "serve": "eleventy --serve",
    "test": "node --test"
  },
  "dependencies": {
    "wp-awesome": "^0.1.0"
  },
  "devDependencies": {
    "@11ty/eleventy": "^3.1.6"
  }
}
```

For the current unpublished source, install the local checkout instead of that registry dependency:

```sh
bun add /absolute/path/to/wp-awesome
bun add --dev @11ty/eleventy@^3.1.6
```

## `site/wordpress-data.cjs`

The loader selects published pages, requests embedded records, normalizes their content and routes, and rejects output collisions before Eleventy renders anything.

```js
'use strict'

const {
  assertNoWordPressRouteCollisions,
  createWordPressRestClient,
  createWordPressRouteResolver,
  normalizeWordPressRecord,
} = require('wp-awesome')

const wordpressOrigin = process.env.WORDPRESS_ORIGIN
const siteUrl = process.env.SITE_URL

if (!wordpressOrigin || !siteUrl) {
  throw new Error('WORDPRESS_ORIGIN and SITE_URL are required.')
}

const rest = createWordPressRestClient({
  baseUrl: `${wordpressOrigin}/wp-json/`,
  perPage: 100,
  retries: 3,
  timeoutMs: 20_000,
})

const resolveRoute = createWordPressRouteResolver({
  siteUrl,
  routes: { page: '/pages/{slug}/' },
})

module.exports = async function loadWordPressData() {
  const sourcePages = await rest.getCollection('wp/v2/pages', {
    params: { status: 'publish', _embed: 1 },
    maxPages: 30,
  })

  const pages = sourcePages.map((sourcePage) => normalizeWordPressRecord(sourcePage, {
    type: 'page',
    routeResolver: resolveRoute,
    customFields: ['subtitle'],
    contentPolicy: { mode: 'rendered' },
  }))

  assertNoWordPressRouteCollisions(pages)
  return { pages }
}
```

## `.eleventy.cjs`

The package's plugin registers the async loader as `wordpress` global data. This consumer keeps its output and includes directory configuration in its own Eleventy config.

```js
'use strict'

const { createWordPressEleventyPlugin } = require('wp-awesome')
const loadWordPressData = require('./site/wordpress-data.cjs')

module.exports = function configureSite(eleventyConfig) {
  eleventyConfig.addPlugin(createWordPressEleventyPlugin({
    loadData: loadWordPressData,
  }))

  return {
    dir: {
      input: 'src',
      includes: '_includes',
      output: '_site',
    },
    templateFormats: ['md', 'njk'],
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk',
  }
}
```

## `src/pages.njk`

The pagination alias makes one Eleventy page for each normalized WordPress record. The route contract is the single source for `permalink` and canonical metadata.

```njk
---
pagination:
  data: wordpress.pages
  size: 1
  alias: pageRecord
permalink: "{{ pageRecord.route.outputPath }}"
layout: layouts/page.njk
eleventyComputed:
  title: "{{ pageRecord.title.text }}"
  canonicalUrl: "{{ pageRecord.route.canonicalUrl }}"
---
{{ pageRecord.content.html | safe }}
```

## `src/_includes/layouts/page.njk`

```njk
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ title }}</title>
    <link rel="canonical" href="{{ canonicalUrl }}">
  </head>
  <body>
    <main>
      <h1>{{ title }}</h1>
      {{ content | safe }}
    </main>
  </body>
</html>
```

## Build commands

```sh
export WORDPRESS_ORIGIN='https://beautiful.wp.site'
export SITE_URL='https://beautiful.wp.site'
bun run build
```

The placeholder host will not return WordPress data. Replace it with a real site or run the consumer against a mock REST server during local development. Do not put Application Passwords in this public-content example; see [install and configure](/install-and-configure/) if edit-context data is required.

## Before using this in production

The example intentionally does not implement a site-wide sitemap inclusion policy, cache, delete/unpublish handling, redirects, SEO metadata, custom dynamic block rendering, or whole-site route audit. Those decisions belong to the consumer. Extend the loader and checks before replacing an existing public site, and keep user-specific commerce behavior connected to its live backend.
