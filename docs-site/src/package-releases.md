---
layout: layouts/docs.njk
title: Package installation and releases
section: Reference
description: Install wp-awesome locally, from npm, or from a GitHub tag; configure the standalone repository's CI, documentation hosting, and package/plugin release workflow.
permalink: package-releases/index.html
---
<!--
 * This file is part of the wp-awesome package.
 *
 * File: docs-site/src/package-releases.md
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
-->


The package name is `wp-awesome`, without a scope. The repository metadata follows the existing Timeline convention at `chdenat/wp-awesome`. Version `0.1.1` is current and published on npm. Creating local files does not publish a later version or deploy the documentation site.

## Install locally now

From a consuming project:

```sh
npm install /absolute/path/to/wp-awesome
# Or:
bun add /absolute/path/to/wp-awesome
```

For CI or a consumer that does not have the sibling checkout, create and install an archive:

```sh
# In the wp-awesome checkout:
bun install --frozen-lockfile
bun run verify
bun pm pack --ignore-scripts --destination artifacts

# In the consumer:
npm install /absolute/path/to/wp-awesome/artifacts/wp-awesome-0.1.1.tgz
```

A consumer may keep that tarball under its own `vendor/` directory and declare `"wp-awesome": "file:vendor/wp-awesome-0.1.1.tgz"`. Include the archive and consumer lockfile together to install from that local artifact in CI. Repack and reinstall after package changes. Do not hand-edit the archive.

## Install from npm

```sh
npm install wp-awesome@0.1.1
# Or:
bun add wp-awesome@0.1.1
```

Install runtime dependencies with the package manager used by the consuming frontend. Bun also runs the generated Eleventy frontend and this repository's verification scripts. The optional WordPress build controls are a separate PHP plugin that installs a managed MU-plugin.

## Install from GitHub after the repository and tag exist

```sh
npm install github:chdenat/wp-awesome#v0.1.1
# Or:
bun add github:chdenat/wp-awesome#v0.1.1
```

The dependency key and imports remain `wp-awesome`. Use a version tag or full commit hash. The source CommonJS files and declarations are publishable directly, so no `prepare`, `prepack`, or install lifecycle script is needed. This is a Git repository dependency, rather than GitHub Packages; it does not require an npm organization scope or a separate registry.

```js
const { createWordPressRestClient } = require('wp-awesome')
const { createWooCommerceStoreApi } = require('wp-awesome/integrations/woocommerce')
```

```js
// Native ESM uses the default CommonJS export.
import wpAwesome from 'wp-awesome'
const { createWordPressRestClient } = wpAwesome
```

See the [npm install reference](https://docs.npmjs.com/cli/v11/commands/npm-install/) and [Bun dependency documentation](https://bun.com/docs/pm/add) for registry, file, tarball, and Git specifications.

## Configure GitHub

1. Create the `chdenat/wp-awesome` repository with `main` as its default branch. Add the SSH or HTTPS origin to this checkout only when you are ready to push it.
2. Push the source, `bun.lock`, shared rules, skills, and workflows. Ignore `node_modules/`, `docs-site/_site/`, `docs-site/.vite/`, and `artifacts/`.
3. Enable Actions. `.github/workflows/ci.yml` verifies the declared runtime range, PHP compatibility, unit tests, documentation, consumer installation, plugin ZIP, and package contents.
4. In **Settings → Environments**, create `npm`. Add an npm publish token as its `NPM_TOKEN` secret, with permission to publish the unscoped `wp-awesome` package. Configure reviewers or tag restrictions if desired. Never add this token to source or WordPress configuration.
5. In **Settings → Pages**, choose **GitHub Actions**. `.github/workflows/pages.yml` builds and validates the guide with `/wp-awesome/` as its path prefix, then deploys through the `github-pages` environment. The expected URL is `https://chdenat.github.io/wp-awesome/` after deployment.
6. Grant the release workflow the configured `contents: write` permission so it can create a GitHub release. Publication runs only for `v*` tags whose version matches `package.json` and whose commit belongs to `main`.

The npm workflow uses `actions/setup-node` registry authentication and `NPM_TOKEN`, matching Timeline's existing publication approach. Follow [npm token guidance](https://docs.npmjs.com/about-access-tokens) for current token expiry and permission requirements.

## Preview and publish a release

```sh
bun run release:preview
# Equivalent explicit preview:
bun run release -- --initial --preview
```

Preview does not change files, commit, tag, push, publish, or deploy. After committing the reviewed implementation and configuring the intended remote and npm environment, explicitly request the first release:

```sh
bun run release -- --initial
```

That command requires a clean `main` branch and the intended origin, verifies the package, synchronizes the manifest/PHP plugin version, updates the changelog and lockfile, commits only version files, creates an annotated tag, and pushes `main` plus tags. Later releases use `--patch`, `--minor`, or `--major`.

The tag workflow verifies everything again, creates the exact tarball, skips an existing npm version, publishes that archive, and waits for the version to become readable from npm. It supplies the `.tgz` and `.zip` files when it creates the GitHub release, so both assets are uploaded before the release is published. Repositories with immutable releases do not allow assets to be added afterward. A manual retry from **Actions → Publish WP Awesome package and plugin → Run workflow** on `main` can finish a draft release; it cannot repair a published immutable release that is missing assets. The initial version 0.1.0's plugin archive remains available from its [dedicated plugin release](https://github.com/chdenat/wp-awesome/releases/tag/wp-awesome-plugin-v0.1.0). Version 0.1.1 and later releases include the ZIP on their matching release page. The PHP ZIP contains the installer, its managed MU-plugin, lifecycle and uninstall files, the English/French language catalogs, and its license, ready for WordPress's upload screen.

The npm release workflow publishes the package and plugin archive. The Pages workflow deploys the documentation site. A consuming site's content publication remains a separate process; follow [publishing and hosting](/publishing-and-hosting/) for WordPress events, GitHub environments, Apache/Nginx, and atomic site promotion.
