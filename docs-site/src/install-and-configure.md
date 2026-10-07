---
layout: layouts/docs.njk
title: Package installation
section: Package reference
description: Install WP Awesome for an Eleventy frontend, configure WordPress content access, and check this package's documentation build.
permalink: install-and-configure/index.html
---
<!--
 * This file is part of the wp-awesome package.
 *
 * File: docs-site/src/install-and-configure.md
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
-->

## Requirements

- Bun `1.4.2` for the repository scripts and generated frontend commands. npm is also supported for package installation.
- A WordPress site with the REST API enabled. Public context is sufficient for public rendered content; edit context requires an Application Password and HTTPS except on loopback hosts.

WP Awesome includes TypeScript declarations for its content helpers. The WordPress backend and optional build-controls plugin have separate deployment paths; see [the setup assistant](/setup-assistant/) for the frontend files and the [WordPress build controls guide](/wp-awesome/) for the MU-plugin.

### Package maintainer toolchain

Bun, PHP, Vite, and Vitest are tools for developing and checking this repository.

```sh
bun install
bun run build       # Vite builds documentation styles, scripts, and local icon assets
bun run test        # Vitest; use bun run test rather than bun test
bun run test:php    # PHP lint and MU-plugin installation/build-dispatch checks
bun run docs:check  # Vite, Eleventy, and generated-link validation
bun run check       # complete package check
```

The PHP check requires a local PHP CLI. Neither unit-test suite calls WordPress or GitHub.

## Install the package

Version `0.3.0` is published on npm. To test unpublished changes, install the checkout from your consumer:

```sh
npm install /absolute/path/to/wp-awesome
# Or:
bun add /absolute/path/to/wp-awesome
bun add --dev @11ty/eleventy@^3.1.6
```

Install the published version from npm:

```sh
npm install wp-awesome@0.3.0
```

Or install a published GitHub tag:

```sh
npm install github:chdenat/wp-awesome#v0.3.0
```

All installation methods use `require('wp-awesome')`. See [package installation and releases](/package-releases/) for Bun equivalents, tarballs, CI, GitHub Pages, token configuration, and release preparation.

## Configure the origins

The WordPress origin builds the REST root. The site URL controls public canonical URLs and can differ from the source host when Eleventy is hosted elsewhere.

```sh
export WORDPRESS_ORIGIN='https://beautiful.wp.site'
export SITE_URL='https://www.beautiful.example'
```

These are example values, not live endpoints. Set real values in the local shell, CI environment, or secret manager. The package intentionally does not read environment variables itself; the consumer creates the REST client and decides how deployment environments provide configuration.

<h3 id="application-passwords">Application Passwords</h3>

Public rendered content often needs no authorization. Use a WordPress Application Password only when the build needs an authenticated context such as `content.raw`. Create a dedicated least-privilege WordPress account, store its password in a server-side secret, and never put it in a template, browser asset, public cache, or generated file.

```sh
export WORDPRESS_API_USERNAME='beautiful-build'
export WORDPRESS_API_APPLICATION_PASSWORD='abcd efgh ijkl mnop qrst uvwx'
```

Configure the client to attach authorization only to edit-context requests:

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
})
```

Do not send credentials in query parameters. The client rejects edit-context requests over plain HTTP except to `localhost`, `127.0.0.1`, or `[::1]`.

## Build this package's documentation

From the `wp-awesome` repository root:

```sh
bun run docs:serve
bun run docs:build
bun run docs:check
```

Vite builds the docs styles, scripts, and selected local Font Awesome SVGs, then Eleventy generates the static pages with local syntax-highlighting dependencies. `docs:build` clears only `docs-site/_site/` before rebuilding. `docs:serve` stops a previous preview launched from this package, then rebuilds and serves on fixed port 4177. No WordPress origin, credentials, or network access is needed.
