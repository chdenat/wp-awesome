---
layout: layouts/docs.njk
title: Quick guide
section: Start here
description: Connect WordPress content to an Eleventy frontend and render a first static route family.
permalink: quick-guide/index.html
---
<!--
 * This file is part of the wp-awesome package.
 *
 * File: docs-site/src/quick-guide.md
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
-->

This walkthrough assumes Bun and an Eleventy 3 frontend project. Replace the fictitious WordPress origin with your own before running the loader. For a generated frontend using Web Awesome and Font Awesome, start with the [setup assistant](/setup-assistant/).

> **Package availability:** version `0.1.0` is in this standalone repository and has not been published to npm. Install a local checkout for now; do not expect `bun add wp-awesome` to work until a registry release exists.

For the manual steps below, start in the root of a separate consumer project folder, for example `beautiful-site/`. The paths in this guide are relative to that folder. Create the `site/` and `src/_includes/layouts/` directories there before saving the files. Do not put these files in the `wp-awesome` package checkout or in WordPress `wp-content/plugins/`.

```text
beautiful-site/
├── .eleventy.cjs
├── package.json                 # Updated by bun add
├── site/
│   └── wordpress-data.cjs       # WordPress requests and normalization
└── src/
    ├── pages.njk                # One generated page per WordPress page
    └── _includes/
        └── layouts/
            └── page.njk        # Shared HTML layout
```

## 1. Add the package to a consumer project

From the consumer project directory, point Bun at the checked-out package directory. Use the real local path on your machine.

```sh
bun add /path/to/wp-awesome
bun add --dev @11ty/eleventy@^3.1.6
```

After publication, install `wp-awesome@0.1.0` from npm or `github:chdenat/wp-awesome#v0.1.0` from GitHub. Both keep the same import name. See [package installation and releases](/package-releases/) for npm and Bun commands.

## 2. Add a server-side data loader

Create `site/wordpress-data.cjs`. This example requests public, published pages, asks WordPress to embed related records, and assigns each page a stable route below `/pages/`.

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
  throw new Error('Set WORDPRESS_ORIGIN and SITE_URL before building the site.')
}

const rest = createWordPressRestClient({
  baseUrl: `${wordpressOrigin}/wp-json/`,
})

const resolveRoute = createWordPressRouteResolver({
  siteUrl,
  routes: { page: '/pages/{slug}/' },
})

module.exports = async function loadWordPressData() {
  const sourcePages = await rest.getCollection('wp/v2/pages', {
    params: { status: 'publish', _embed: 1 },
    perPage: 100,
    maxPages: 30,
  })

  const pages = sourcePages.map((record) => normalizeWordPressRecord(record, {
    type: 'page',
    routeResolver: resolveRoute,
    contentPolicy: { mode: 'rendered' },
  }))

  assertNoWordPressRouteCollisions(pages)
  return { pages }
}
```

`WORDPRESS_ORIGIN` is the source API host. `SITE_URL` is the public origin whose canonical URLs the generated pages should use. For this guide, both point to `https://beautiful.wp.site`; set them to a real site to fetch data.

## 3. Register the loader with Eleventy

Create `.eleventy.cjs` in the consumer project root:

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

The plugin registers the returned promise as Eleventy global data under `wordpress`. Record selection and template implementation remain in the consumer project.

## 4. Generate one page for each WordPress page

Create `src/pages.njk`. Eleventy pagination turns each normalized record into its own output file using the route contract.

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

Create `src/_includes/layouts/page.njk`:

```njk
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="canonical" href="{{ canonicalUrl }}">
    <title>{{ title }}</title>
  </head>
  <body>
    <main>
      <h1>{{ title }}</h1>
      {{ content | safe }}
    </main>
  </body>
</html>
```

The package sanitizes the returned content HTML with a conservative allowlist before it reaches the template. Custom fields remain untrusted data: validate their expected types, use ordinary template escaping, and do not mark them safe as HTML.

## 5. Build

Set the source and public origins, then run the Eleventy CLI from the consumer project:

```sh
export WORDPRESS_ORIGIN='https://beautiful.wp.site'
export SITE_URL='https://beautiful.wp.site'
npx @11ty/eleventy
```

If `beautiful.wp.site` is still the documentation placeholder, the fetch will fail by design. Use a real WordPress host with a public REST API. For edit-context source content and WordPress Application Passwords, follow the [authentication setup](/install-and-configure/#application-passwords).

## What to read next

- [Fetch, paginate, and normalize records](/fetch-and-normalize/)
- [Select a Gutenberg content policy](/gutenberg-content/)
- [Create custom routes and templates](/routes-and-templates/)
- [Run the complete consumer example](/complete-example/)
