---
layout: layouts/docs.njk
title: API reference
section: Reference
description: Public package entry points, exported functions, configuration options, returned contracts, and optional integration subpaths.
permalink: api-reference/index.html
---
<!--
 * This file is part of the wp-awesome package.
 *
 * File: docs-site/src/api-reference.md
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
-->

The package is CommonJS. Core functions are exported from `wp-awesome`; optional adapters use explicit package subpaths. TypeScript declarations are included for the public package API.

## Core exports

| Export | Purpose | Result or behavior |
| --- | --- | --- |
| `createApplicationPasswordAuthorization(username, password)` | Build a WordPress Basic authorization value | Returns a string, or `null` when both inputs are empty; throws when only one is provided |
| `createApplicationPasswordHeaders(username, password)` | Build an `Authorization` header object | Returns `{ Authorization }` or `{}` |
| `createWordPressRestClient(options)` | Create a configurable REST transport | Returns `getJson()` and `getCollection()` |
| `DEFAULT_SUPPORTED_BLOCK_NAMES` | List saved Gutenberg blocks reconstructed by default | `core/paragraph`, `core/heading`, `core/list`, and `core/list-item` |
| `parseSerializedContent(source)` | Parse saved Gutenberg comment markup | Returns `hasSerializedBlocks`, parsed `blocks`, and recursive `blockTypes` |
| `summarizeBlockTypes(blocks)` | Count block names recursively | Returns a stable name-to-count object |
| `unsupportedBlockNames(blocks, options)` | Compare parsed blocks with policy support | Returns sorted unsupported block names |
| `renderBlockTree(blocks, options)` | Reconstruct saved inner markup and call supplied renderers or a per-block transform | Returns an HTML string; it does not run PHP or dynamic blocks |
| `convertWordPressContent(options)` | Select serialized or rendered content | Returns HTML, selected source, block diagnostics, and fallback reason |
| `extractWordPressColorPalette(source)` | Read safe WordPress preset colors from public HTML or CSS | Returns a slug-to-CSS-color object; unresolved and unsafe declarations are omitted |
| `extractWordPressLinkColors(source, options)` | Read WordPress per-block link-color rules | Returns safe colors keyed by `wp-elements-*` class, resolving preset variables when possible |
| `isSafeCssColorValue(value)` | Check whether a CSS color can be copied into a declaration | Rejects rule-breaking syntax, URLs, and unresolved variables |
| `sanitizeWordPressHtml(value, options)` | Sanitize WordPress or renderer HTML | Applies the package's tag, attribute, URL, and CSS allowlists |
| `resolveWordPressContentPolicy(policies, type)` | Merge default and content-type policy | Returns a new policy object; type-specific values take precedence |
| `normalizeWordPressRecord(record, options)` | Create a renderer-neutral content record | Returns normalized identity, content, author, terms, media, custom fields, source URL, and route |
| `normalizeWordPressAuthor(record, options)` | Normalize a public author | Returns a public author contract or `null` if it has no ID |
| `collectWordPressAuthors(records, options)` | Deduplicate standard embedded authors | Returns authors in first-seen order by WordPress ID |
| `normalizeWordPressTaxonomy(record, options)` | Normalize a taxonomy record or embedded term | Returns a taxonomy contract with a computed route |
| `createWordPressRouteResolver(options)` | Bind a site origin and route table | Returns a resolver function for records |
| `resolveWordPressRoute(record, options)` | Resolve one route | Returns `path`, `outputPath`, and `canonicalUrl` |
| `toOutputPath(pathname)` | Map a trailing-slash URL to a file path | `/` becomes `index.html`; other paths become `path/index.html` |
| `assertNoWordPressRouteCollisions(records)` | Reject duplicate generated output paths | Returns `undefined`; throws on collision |
| `createWordPressEleventyPlugin(options)` | Register a loader as Eleventy global data | Returns an Eleventy plugin function; default data key is `wordpress` |

## REST client configuration

```ts
interface WordPressRestClientOptions {
  baseUrl: string | URL
  fetchImpl?: typeof fetch
  headers?: Record<string, string> | Headers
  getHeaders?: (request: {
    url: URL
    endpoint: string
    context: string
  }) => Record<string, string> | Headers | Promise<Record<string, string> | Headers>
  perPage?: number
  retries?: number
  retryDelayMs?: number
  timeoutMs?: number
  onPublicFallback?: (details: { endpoint: string; status: number }) => void
}
```

`baseUrl` is required and must be an HTTP(S) REST root without embedded credentials. `perPage` must be from 1 to 100; `retries` must be a non-negative integer; `timeoutMs` must be positive. The client supports `getJson(endpoint, options)` and `getCollection(endpoint, options)`. Collection options include `params`, `context`, `perPage`, `allowPublicFallback`, `maxPages`, and `signal`.

## Content conversion options

```ts
interface ContentConversionOptions {
  rawContent?: string
  renderedHtml?: string
  mode?: 'auto' | 'rendered' | 'blocks'
  supportedBlockNames?: string[]
  blockRenderers?: Record<string, (context: {
    block: object
    innerHTML: string
    childHtml: string[]
  }) => string>
  transformBlock?: (context: { block: object; innerHTML: string; childHtml: string[] }) => string
  allowFreeform?: boolean
  transformHtml?: (html: string, context: object) => string
  sanitizerOptions?: WordPressHtmlSanitizerOptions
}
```

The result contains `html`, `source`, `hasSerializedBlocks`, `blockTypes`, `unsupportedBlockNames`, and `fallbackReason`. The built-in renderer reconstructs saved markup only. A consumer-supplied synchronous renderer may return HTML for its exact block name; the package sanitizes the final transformed result before returning it. The default allowlist removes scripts, forms, iframes, SVG, event handlers, unsafe URL schemes, and unsafe inline CSS. `sanitizerOptions` can add explicitly named Web Awesome tags and attributes, CSS variables or font families, and raster background images under an exact WordPress uploads prefix. These are trusted consumer settings.

## Normalized record contract

`normalizeWordPressRecord()` accepts a REST record and optional `type`, `contentPolicy`, `routeResolver`, `siteUrl`, `customFields`, `transformBlock`, `transformHtml`, `sanitizerOptions`, and `outputPath` settings. The returned `WordPressContentRecord` has this shape:

```ts
interface WordPressContentRecord {
  id: number | string
  type: string
  slug: string
  status: string | null
  title: { html: string; text: string }
  excerpt: { html: string; text: string }
  content: {
    html: string
    source: string
    hasSerializedBlocks: boolean
    blockTypes: Record<string, number>
    unsupportedBlockNames: string[]
    fallbackReason: string | null
  }
  dates: { published: string | null; modified: string | null }
  author: WordPressAuthor | null
  taxonomies: WordPressTaxonomy[]
  featuredMedia: {
    id: number | null
    url: string | null
    alt: string
    captionHtml: string
  } | null
  customFields: Record<string, unknown>
  sourceUrl: string | null
  route: WordPressRoute
}
```

Only explicitly allowlisted custom fields are copied. The package omits raw REST content, author email/login fields, and arbitrary metadata.

## Eleventy plugin

```js
createWordPressEleventyPlugin({
  loadData: async () => ({ pages: [] }),
  key: 'wordpress',
})
```

The returned plugin requires `eleventyConfig.addGlobalData()`. `loadData` can return a value or promise. A blank data key or missing loader is rejected. The plugin does not cache or transform its result.

## Optional integration exports

| Package subpath | Export | Result |
| --- | --- | --- |
| `wp-awesome/integrations/woocommerce` | `createWooCommerceStoreApi(options)` | `listProducts()` and `listCategories()` Store API collection methods |
| `wp-awesome/integrations/yoast` | `createYoastSitemapIntegration(options)` | An adapter with `load()` returning locations by configured sitemap name |
| `wp-awesome/integrations/yoast` | `createRetryingFetchText(options)` | An injectable sitemap text transport with bounded retries, backoff, timeouts, and `Retry-After` support |
| `wp-awesome/integrations/yoast` | `parseSitemapLocations(xml)` | Decoded `<loc>` values from a `urlset` or `sitemapindex` |
| `wp-awesome/integrations/forms` | `collectFormReferences(records, options)` | Deduplicated provider and form IDs with source record references |

Import optional functions from those exact subpaths; they are not re-exported by the core package entry point.
