---
layout: layouts/docs.njk
title: Fetch and normalize
section: Build your site
description: Configure the REST root, retrieve complete collections, normalize related WordPress data, and inspect the diagnostics that should gate a build.
permalink: fetch-and-normalize/index.html
---
<!--
 * This file is part of the wp-awesome package.
 *
 * File: docs-site/src/fetch-and-normalize.md
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
-->

## Build a REST client

Pass the REST root, not an individual endpoint. The client accepts only relative endpoint paths inside that root, so an endpoint cannot silently redirect a configured authorization header to another host.

```js
const { createWordPressRestClient } = require('wp-awesome')

const rest = createWordPressRestClient({
  baseUrl: 'https://beautiful.wp.site/wp-json/',
  perPage: 100,
  retries: 3,
  retryDelayMs: 400,
  timeoutMs: 20_000,
})
```

Defaults are 100 records per page, three retries, a 400 ms exponential retry delay, and a 20 second timeout for each request. Retry behavior applies to network errors, HTTP 429, and 5xx responses. A server `Retry-After` value is respected up to 30 seconds. Other client errors fail immediately.

## Retrieve all pages of a collection

`getCollection()` follows WordPress's `X-WP-TotalPages` header, validates every page response, and stops if the configured `maxPages` ceiling would be exceeded. `perPage` cannot exceed the WordPress limit of 100.

```js
const pages = await rest.getCollection('wp/v2/pages', {
  params: {
    status: 'publish',
    _embed: 1,
    page: 99,
  },
  perPage: 50,
  maxPages: 40,
})
```

The adapter owns the pagination `page` parameter and sets it for every request; a supplied `page` value is replaced with `1` for the first request. Arrays in `params` are sent as repeated query keys. The client does not choose which records are relevant to your public site: filter, compare to sitemaps, and include referenced routes in your consumer-owned loader.

Fetch a single record with `getJson()` when the endpoint returns an object rather than a collection:

```js
const sourcePage = await rest.getJson('wp/v2/pages/42', {
  params: { _embed: 1 },
})
```

## Request edit context safely

Use `context: 'edit'` only when your build needs protected REST fields. `getHeaders` receives the URL, endpoint, and context, so credentials can be attached only to the request that needs them. `allowPublicFallback` restarts the complete collection in public context only after an edit-context 401 or 403.

```js
const {
  createApplicationPasswordHeaders,
  createWordPressRestClient,
} = require('wp-awesome')

const rest = createWordPressRestClient({
  baseUrl: `${process.env.WORDPRESS_ORIGIN}/wp-json/`,
  getHeaders: ({ context }) => context === 'edit'
    ? createApplicationPasswordHeaders(
      process.env.WORDPRESS_API_USERNAME,
      process.env.WORDPRESS_API_APPLICATION_PASSWORD,
    )
    : {},
  onPublicFallback: ({ endpoint, status }) => {
    console.warn(`Using public content for ${endpoint} after HTTP ${status}.`)
  },
})

const sourcePages = await rest.getCollection('wp/v2/pages', {
  params: { status: 'publish', _embed: 1 },
  context: 'edit',
  allowPublicFallback: true,
})
```

Public fallback is a deliberate availability policy. If your output requires a protected field, inspect whether the record was normalized with the expected content source instead of silently accepting a public fallback.

## Normalize records for templates

`normalizeWordPressRecord()` converts a raw REST record to a smaller rendering contract. Pass `_embed=1` to request the standard author, taxonomy terms, and featured media relations. The normalizer returns those relations when WordPress provides them.

```js
const {
  createWordPressRouteResolver,
  normalizeWordPressRecord,
} = require('wp-awesome')

const resolveRoute = createWordPressRouteResolver({
  siteUrl: 'https://beautiful.wp.site',
  routes: {
    page: '/pages/{slug}/',
    post: '/journal/{slug}/',
  },
})

const page = normalizeWordPressRecord(sourcePage, {
  type: 'page',
  routeResolver: resolveRoute,
  customFields: ['subtitle', 'reading_time'],
  contentPolicy: { mode: 'rendered' },
})

console.log(page.route.canonicalUrl)
console.log(page.featuredMedia?.alt)
console.log(page.content.source, page.content.fallbackReason)
```

The returned object includes `id`, `type`, `slug`, `status`, title and excerpt as HTML/text pairs, converted content plus diagnostics, publication dates, one standard author, embedded taxonomy terms, featured media, allowlisted custom fields, `sourceUrl`, and a route object. It does not include the original REST response or `content.raw`.

Only the custom field names passed in `customFields` are copied from `acf` or `meta`. Values not in that allowlist stay out of the public contract. Standard WordPress's one author relation is supported; co-author plugins need a separate consumer adapter.

## Validate and expose the records

Check that two records do not write to the same output file, then return a small data object that your Eleventy templates can consume:

```js
const { assertNoWordPressRouteCollisions } = require('wp-awesome')

const pages = sourcePages.map((record) => normalizeWordPressRecord(record, {
  type: 'page',
  routeResolver: resolveRoute,
  contentPolicy: { mode: 'rendered' },
}))

assertNoWordPressRouteCollisions(pages)
return { pages }
```

The package does not cache responses, select sitemap members, synchronize deletes, or publish routes. Those are site-level policies and should be implemented with the consuming site's records and deployment lifecycle in view.
