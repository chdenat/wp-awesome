---
layout: layouts/docs.njk
title: Security and troubleshooting
section: Reference
description: Keep credentials in the build process, understand request and route guards, and use the package diagnostics to find common WordPress and Eleventy failures.
permalink: security-and-troubleshooting/index.html
---
<!--
 * This file is part of the wp-awesome package.
 *
 * File: docs-site/src/security-and-troubleshooting.md
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
-->

## Security boundaries

- Keep WordPress credentials in CI secrets or the local server-side environment. Never commit them, put them in browser code, or serialize them into public output.
- Use a dedicated WordPress build account and Application Password with only the access it needs. Send authorization headers only for edit-context requests.
- Use HTTPS for non-loopback edit-context requests. Do not embed credentials in the REST root or send secrets in query parameters.
- Fetch only the public records that belong on the site. A REST response is not automatically a route inclusion decision.
- Normalize records before passing data into public templates. The normalized contract drops `content.raw`, author emails/logins, and arbitrary metadata; custom fields must be allowlisted.
- The package sanitizes selected WordPress HTML and custom renderer output with a tag, attribute, URL-scheme, and inline-style allowlist. The default policy removes scripts, forms, iframes, SVG, event handlers, unsafe URL schemes, and unsafe CSS declarations. WordPress preset CSS variables are included; consumer variables and font families must be listed in `sanitizerOptions.allowedCssVariables` and `sanitizerOptions.additionalFontFamilies`. Background images can be enabled only for raster files under an exact `/wp-content/uploads` prefix.
- Custom fields remain raw selected data, not sanitized HTML. Validate each field's type and content, use normal template escaping, and sanitize again if a consumer deliberately renders a custom field as markup.
- Sanitization does not replace WordPress permissions, build credential protection, output encoding for non-HTML contexts, or browser security headers. Verify Content-Security-Policy and related headers at the hosting boundary.
- Keep customer-specific commerce state, form submissions, account sessions, and payment actions on their connected runtime backend. The Store API helper only retrieves collection data.

## Request and route protections

The REST client constrains relative endpoints to the configured API origin and path prefix, applies per-request timeouts, bounds retries, and validates collection pagination headers. It retries network failures, 429, and 5xx responses; other 4xx errors fail without retry. Public fallback is opt-in and only follows 401/403 from an edit-context request.

The route resolver requires a non-empty path and rejects queries, fragments, traversal segments, and invalid percent encoding. Configured public origins must be HTTP(S) URLs without embedded user credentials. Call `assertNoWordPressRouteCollisions()` before generation so two records do not silently overwrite one output file.

## Common failures

| Symptom | Likely reason | Next check |
| --- | --- | --- |
| `baseUrl` is required | `WORDPRESS_ORIGIN` is missing or interpolation produced an empty REST root | Log only the configured host, not credentials; confirm the value ends at the WordPress origin |
| HTTP 401 or 403 | Application Password is missing, invalid, revoked, or lacks access | Test the same user in WordPress; verify the request context and secret names |
| Edit request rejected over HTTP | Edit context uses non-TLS transport on a non-loopback host | Use HTTPS for the WordPress API |
| Collection is not an array | Endpoint points to a single record, HTML error page, or custom shape | Check the REST endpoint and status; use `getJson()` for an object response |
| `X-WP-TotalPages` error | Proxy or API returned a malformed pagination header | Inspect response headers and the endpoint's REST plugin/proxy |
| `maxPages` exceeded | The collection is larger than the chosen safety bound | Raise the limit deliberately or narrow query parameters |
| `unsupported block types` in `blocks` mode | At least one block lacks a supported name or custom renderer | Inventory `blockTypes`, add faithful renderer coverage, or select `auto`/`rendered` |
| `serialized Gutenberg content is unavailable` | The REST response omitted edit-context raw content or has no block markers | Verify `context`, WordPress permissions, and `content.raw`; choose rendered mode if appropriate |
| A route collision is thrown | Two normalized records resolve to the same output path | Check route templates, aliases, post types, and term paths together |
| Sitemap parser rejects XML | The response is not a sitemap `urlset` or `sitemapindex` | Check redirects, access restrictions, content type, and response body |
| A form ID is missing from inventory | The consumer detector does not match the provider's rendered markup | Inspect that provider's HTML and update only its `findForms()` detector |

## Add diagnostics to the build

Log record IDs, source URLs, and block names when a build fails. Avoid logging credentials, raw edit-context content, personal data, or complete REST responses.

```js
for (const page of pages) {
  if (page.content.fallbackReason && page.content.fallbackReason !== 'rendered-mode-configured') {
    console.warn('Content fallback', {
      id: page.id,
      sourceUrl: page.sourceUrl,
      reason: page.content.fallbackReason,
      unsupportedBlockNames: page.content.unsupportedBlockNames,
    })
  }
}
```

## Run deterministic checks

Package unit tests use in-memory fetch responses. Documentation checks build the static guide locally and validate its generated links and fragments.

```sh
bun run test
bun run test:php
bun run docs:check
```

Neither command contacts WordPress. A consuming site's own Eleventy build still needs the configured WordPress API unless that site supplies a local fixture or cache.
