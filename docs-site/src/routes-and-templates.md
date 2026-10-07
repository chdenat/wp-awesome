---
layout: layouts/docs.njk
title: Routes and templates
section: Build your site
description: Keep source URLs, canonical URLs, generated file paths, and Eleventy templates in one explicit route contract.
permalink: routes-and-templates/index.html
---
<!--
 * This file is part of the wp-awesome package.
 *
 * File: docs-site/src/routes-and-templates.md
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
-->

## Configure a route resolver

`createWordPressRouteResolver()` creates a reusable function for page, post, taxonomy, author, and custom post type records. A string rule accepts `{field}` or `:field` placeholders; each value is URL-encoded. A callback can return a route string or `{ path, canonicalUrl }`.

```js
const { createWordPressRouteResolver } = require('wp-awesome')

const resolveRoute = createWordPressRouteResolver({
  siteUrl: 'https://beautiful.wp.site',
  routes: {
    page: '/pages/{slug}/',
    post: '/journal/{slug}/',
    project: '/work/{slug}/',
    category: '/topics/{slug}/',
    default: '/content/{slug}/',
  },
})

const route = resolveRoute({ type: 'post', slug: 'quiet-morning' })
console.log(route)
```

The `post` resolves to:

```json
{
  "path": "/journal/quiet-morning/",
  "outputPath": "journal/quiet-morning/index.html",
  "canonicalUrl": "https://beautiful.wp.site/journal/quiet-morning/"
}
```

Routes are normalized to a leading and trailing slash. Query strings, fragments, malformed URL encodings, and path traversal segments are rejected. The root path writes `index.html`; other trailing-slash paths write `path/index.html`.

## Route a custom post type

The REST endpoint and WordPress registration name are separate concepts. Use the type's actual `rest_base` for the endpoint, and a stable consumer type key for policy and route selection.

```js
const sourceProjects = await rest.getCollection('wp/v2/studio_projects', {
  params: { status: 'publish', _embed: 1 },
})

const resolveProjectRoute = createWordPressRouteResolver({
  siteUrl: 'https://beautiful.wp.site',
  routes: {
    project: (record) => record.slug === 'welcome'
      ? '/our-studio/'
      : `/work/${encodeURIComponent(record.slug)}/`,
  },
})

const projects = sourceProjects.map((record) => normalizeWordPressRecord(record, {
  type: 'project',
  routeResolver: resolveProjectRoute,
  customFields: ['subtitle', 'project_year'],
  contentPolicy: { mode: 'rendered' },
}))
```

The endpoint above is an example. Confirm the actual REST base and that the post type is public in the target WordPress installation.

## Detect output collisions

Two records with the same `route.outputPath` would overwrite one another. Check all records that can be generated together before returning them from the global data loader:

```js
const records = [...pages, ...posts, ...projects, ...authors, ...terms]
assertNoWordPressRouteCollisions(records)

return {
  pages,
  posts,
  projects,
  authors,
  terms,
}
```

The helper accepts normalized routes or plain `path` / `outputPath` values. Records without an output path are skipped so it can also validate mixed collections.

## Generate Eleventy pages from records

In a Nunjucks template, use Eleventy's pagination to create one file per normalized record. This template writes routes chosen by the data adapter rather than rebuilding slugs independently in Nunjucks.

```njk
---
pagination:
  data: wordpress.posts
  size: 1
  alias: postRecord
permalink: "{{ postRecord.route.outputPath }}"
layout: layouts/article.njk
eleventyComputed:
  title: "{{ postRecord.title.text }}"
  canonicalUrl: "{{ postRecord.route.canonicalUrl }}"
---
{{ postRecord.content.html | safe }}
```

Keep record selection and canonical policy in your loader. Keep markup and presentation in layouts and includes. The package does not write Eleventy page files or decide which route family should exist.

## Change public URL structure safely

Before changing a route rule, compare the old source links to the new output routes. Add redirects in the consuming site's hosting or routing layer for old URLs; the route resolver does not emit redirects. Check routes for records from all affected content types, and inspect links embedded in posts, navigation, and sitemaps instead of validating only one example page.
