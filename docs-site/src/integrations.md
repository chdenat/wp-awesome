---
layout: layouts/docs.njk
title: Optional integrations
section: Build your site
description: Connect WooCommerce and Yoast SEO data and identify Forminator or MailPoet form references when your site needs them.
permalink: integrations/index.html
---
<!--
 * This file is part of the wp-awesome package.
 *
 * File: docs-site/src/integrations.md
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
-->

Optional adapters have package subpath imports. They add no WooCommerce or form-plugin dependency to the package core.

## WooCommerce Store API

`createWooCommerceStoreApi()` uses an existing package REST client and returns collection methods for products and product categories. It returns raw Store API records; your site owns product normalization, product templates, pricing display, cart behavior, and transactions.

```js
const { createWordPressRestClient } = require('wp-awesome')
const { createWooCommerceStoreApi } = require('wp-awesome/integrations/woocommerce')

const rest = createWordPressRestClient({
  baseUrl: `${process.env.WORDPRESS_ORIGIN}/wp-json/`,
})

const store = createWooCommerceStoreApi({ restClient: rest })

const [products, categories] = await Promise.all([
  store.listProducts({
    perPage: 50,
    params: { orderby: 'menu_order', order: 'asc' },
  }),
  store.listCategories({ perPage: 100 }),
])
```

The default endpoints are `wc/store/v1/products` and `wc/store/v1/products/categories`. Category requests default to `hide_empty=true`; an explicit `params.hide_empty` value overrides it. You can provide different endpoint paths if the site's REST base differs.

```js
const store = createWooCommerceStoreApi({
  restClient: rest,
  productsEndpoint: 'wc/store/v1/products',
  categoriesEndpoint: 'wc/store/v1/products/categories',
})
```

This adapter is for build-time public catalog data. Do not use static build data for a visitor's cart, checkout, payment, account, or other customer-specific state.

## Yoast SEO sitemaps

The sitemap adapter builds URLs from a caller-provided site origin and sitemap names. Its transport is also supplied by the consumer, so retry and logging behavior stays explicit.

```js
const { createYoastSitemapIntegration } = require('wp-awesome/integrations/yoast')

const sitemaps = createYoastSitemapIntegration({
  siteUrl: 'https://beautiful.wp.site',
  sitemapNames: ['page', 'post', 'product'],
  fetchText: async (url) => {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Sitemap request failed: ${response.status} ${url}`)
    return response.text()
  },
})

const locationsByType = await sitemaps.load()
console.log(locationsByType.page)
```

`load()` requests all configured Yoast sitemap documents in parallel and returns a map keyed by sitemap name. `parseSitemapLocations()` accepts a `urlset` or a `sitemapindex` XML root and returns decoded `<loc>` values. It does not recursively fetch nested sitemap indexes, select REST records, or decide public route inclusion; implement those rules in the consuming loader.

## Forminator and MailPoet

WP Awesome can help consumer sites discover Forminator and MailPoet form references using their own `findForms` detectors. It does not ship plugin-specific rendering, embed, submission, validation, or response-storage adapters. Those features must be supplied by the website and the form provider.

See [form reference discovery](#form-reference-discovery) for the callback shape and a generic example.

<a id="form-reference-discovery"></a>

## Form reference discovery

The package does not assume a form plugin or HTML convention. Supply one or more provider detectors that read the rendered HTML and return form IDs.

```js
const { collectFormReferences } = require('wp-awesome/integrations/forms')

const formRecords = normalizedPages.map((record) => ({
  ...record,
  path: record.route.path,
  contentHtml: record.content.html,
}))

const forms = collectFormReferences(formRecords, {
  providers: [{
    name: 'sample-form-plugin',
    findForms: (html) => [...html.matchAll(/data-form-id="(\d+)"/g)]
      .map((match) => match[1]),
  }],
})

console.table(forms)
```

Each provider must have a unique `name` and a `findForms(html, record)` function. Results are deduplicated by provider and ID; their source record IDs and paths are retained. This is inventory only: rendering and submitting a form still require the provider's real frontend or backend integration.

The default HTML sanitizer removes custom `data-*` attributes. If a provider uses `data-form-id`, explicitly allow that attribute when normalizing its content:

```js
const normalizedPage = normalizeWordPressRecord(rawPage, {
  type: 'page',
  routeResolver,
  sanitizerOptions: {
    additionalAttributes: { '*': ['data-form-id'] },
  },
})
```

Only allow the specific attributes your detector needs. The sanitizer continues to remove unsafe elements, event handlers, and URLs.

## Testing scope

WP Awesome has only been tried with simple, single-language WordPress sites. Multilingual setups have not been tested. There is no built-in WPML or Polylang integration; use your own documented REST endpoints and a site-specific normalization adapter if your content is multilingual.
