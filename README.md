<!--
 * This file is part of the wp-awesome package.
 *
 * File: README.md
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
-->

# WP Awesome

WP Awesome keeps WordPress as your backend and provides an Eleventy frontend built with Build Awesome, Web Awesome components, and Font Awesome icons.

The setup assistant generates the frontend project and explains where to put every file. Preview locally with staging settings, deploy and test staging first, then build and deploy production. To request builds from WordPress, install and activate the separate WP Awesome WordPress plugin; it installs its companion MU-plugin and provides the global build action, per-record actions, and automatic rebuild requests after published content changes.

Use the [setup assistant](docs-site/src/setup-assistant.njk) to generate a consumer project. The public package name is **`wp-awesome`**, without an organization scope.

Current source version: `0.1.1`.

[Setup assistant](docs-site/src/setup-assistant.njk) · [Local, staging, and production](docs-site/src/publishing-and-hosting.md) · [Frontend guide](docs-site/src/quick-guide.md) · [Install the WordPress plugin](docs-site/src/wp-awesome.md) · [Package installation](docs-site/src/install-and-configure.md) · [Repository](https://github.com/chdenat/wp-awesome) · [npm package](https://www.npmjs.com/package/wp-awesome) · [MIT license](LICENSE.md)

The GitHub repository and Pages site are expected at `chdenat/wp-awesome`. Version `0.1.0` is published as `wp-awesome@0.1.0` on npm. Preparing local files does not publish a later package version or deploy documentation.

## Optional integrations

Optional integrations include public WooCommerce resources, Yoast sitemaps, and form-reference collection. See the [integrations guide](docs-site/src/integrations.md) for the available package adapters.

Testing has covered simple, single-language WordPress sites. Multilingual setups have not been tested.

## Contributor guidance

Read [AGENTS.md](AGENTS.md), the [shared rules](.lgs1920/guidance/PROJECT_RULES.common.md), and [package rules](PROJECT_RULES.md) before changing the repository. The [package skills](skills/README.md) describe the maintenance, documentation, and release workflows. The generated frontend belongs in its own project; configure its hosting workflow there.

## Install the JavaScript package

Use npm or Bun to install the package. The [package guide](docs-site/src/install-and-configure.md) and [API reference](docs-site/src/api-reference.md) cover its WordPress content helpers.

Install the published version:

```sh
npm install wp-awesome@0.1.0
# Or:
bun add wp-awesome@0.1.0
```

After the GitHub repository and version tag exist:

```sh
npm install github:chdenat/wp-awesome#v0.1.0
# Or:
bun add github:chdenat/wp-awesome#v0.1.0
```

Use a version tag or commit rather than `main` for a reproducible consumer. GitHub dependencies keep the same `require('wp-awesome')` import. The CommonJS runtime and declarations are source files, so installation does not need a build lifecycle script.

For unpublished changes, use a local checkout or an archive produced from it:

```sh
npm install /absolute/path/to/wp-awesome
# Or, from this repository:
bun pm pack --ignore-scripts --destination artifacts
# Then, from the consuming project:
npm install /absolute/path/to/wp-awesome/artifacts/wp-awesome-0.1.0.tgz
```

## Minimal usage

```js
const {
  createWordPressRestClient,
  createWordPressRouteResolver,
  normalizeWordPressRecord,
  assertNoWordPressRouteCollisions,
} = require('wp-awesome')

const rest = createWordPressRestClient({
  baseUrl: 'https://beautiful.wp.site/wp-json/',
})
const resolveRoute = createWordPressRouteResolver({
  siteUrl: 'https://www.beautiful.example',
  routes: { page: '/{slug}/' },
})

const loadPages = async () => {
  const source = await rest.getCollection('wp/v2/pages', {
    params: { status: 'publish', _embed: 1 },
    maxPages: 30,
  })
  const pages = source.map(record => normalizeWordPressRecord(record, {
    type: 'page',
    routeResolver: resolveRoute,
    contentPolicy: { mode: 'rendered' },
  }))
  assertNoWordPressRouteCollisions(pages)
  return pages
}
```

`beautiful.wp.site` is fictitious. Replace it before fetching. In a native ESM consumer, use `import wpAwesome from 'wp-awesome'`, then destructure the default CommonJS export. Optional integrations are separate subpaths: `wp-awesome/integrations/woocommerce`, `wp-awesome/integrations/yoast`, and `wp-awesome/integrations/forms`.

The package sanitizes retained HTML and copies custom fields only through an explicit allowlist. WP Awesome generates the Eleventy frontend and its initial templates. Your frontend project can adapt its routes and presentation, and owns its hosting settings. Read [architecture and limits](docs-site/src/under-the-hood.md) before replacing a live site.

## Develop and preview documentation

Install Bun `1.4.2`, PHP CLI `>=7.2`, and the `zip` CLI. From this repository:

```sh
bun install --frozen-lockfile
bun run verify
bun run docs:serve
```

The Eleventy documentation and offline demo use **http://localhost:4177**, without automatic port reassignment. `bun run docs:serve` stops a previous preview started by this package before rebuilding and reopening that fixed port. Vite builds the styles, scripts, and local icon assets in `docs-site/.vite/assets`; Eleventy generates `docs-site/_site/`. No WordPress credentials or network requests are needed to build the guide. The isolated npm consumer check downloads the package's runtime dependencies.

| Command | Purpose and output |
| --- | --- |
| `bun run test` / `test:watch` | Deterministic Vitest runtime and security tests |
| `bun run test:php` | PHP syntax, MU-plugin installation, build dispatch, and uninstall checks |
| `bun run lint` | First-party JavaScript lint with warnings treated as failures |
| `bun run build` | Vite documentation styles, scripts, and local icon assets |
| `bun run docs:build` / `docs:check` | Clean Eleventy build / generated links and fragments |
| `bun run docs:serve` | Stop the previous package preview, rebuild, and serve on fixed port 4177 |
| `bun run demo:build` / `demo:serve` | Documentation aliases including the real offline-normalization demo |
| `bun run test:package` | Install a real tarball in a temporary consumer; check exports, ESM, types, and bundling |
| `bun run plugin:build` | Create `artifacts/wp-awesome-0.1.0.zip` for WordPress upload |
| `bun run pack:check` | Inspect publishable files without generating or publishing a tarball |
| `bun run verify` / `check` | Tests, lint, PHP, docs, clean consumer, plugin ZIP, and headers |
| `bun run publish:check` | Complete verification and package preview; no publication |
| `bun run headers:update` / `headers:update:all` / `headers:check` | Update staged/all source headers, or audit all headers |
| `bun run git:hooks:install` | Install local pre/post-commit guidance and header hooks |
| `bun run release:preview` | Print the proposed version and annotated-tag notes without mutations |
| `bun run release -- --initial` | Explicitly verify, commit version files, tag, and push the first release |

The header updater supports explicit file paths and preserves PHP opening tags, Nunjucks/Markdown front matter, shebangs, and comment syntax. `scripts/vendor-agent-links.mjs` materializes configured guidance links before a requested commit and restores them afterward; `.agent-links.json` declares those paths. The shared rules and local skills are already physical files for a self-contained checkout.

## WordPress build controls

`wordpress-plugin/wp-awesome.php` installs and maintains `wp-awesome-mu.php` in WordPress's MU-plugin directory. Upload the ZIP generated by `bun run plugin:build` in **Plugins → Add New → Upload Plugin**, then activate WP Awesome. The **Tools → WP Awesome** page has one global **Build the entire site** button (French: **Mettre à jour tout le site**). Public posts, pages, media, and custom post types get a per-record **Build** column in their admin lists. The interface defaults to English and follows WordPress's current admin language to display the included French translation.

The MU-plugin also detects saves to published public content, related metadata and public taxonomy assignments, and deletions. It groups changes to the same record in memory during the request, then sends one targeted GitHub `repository_dispatch` event at shutdown. Manual row requests use the same payload shape. These actions create no WP Awesome database tables, queue, cron events, or options. GitHub must accept the request; this package does not retry failed automatic dispatches.

The event contains `client_payload.scope: site` for a full build or `client_payload.scope: record` plus `record_type`, `record_id`, `record_url`, `record_status`, and `changed_fields` for one content item. The receiving workflow decides how to build a single route or fall back to a full site build.

Deactivating or deleting WP Awesome through **Plugins → Installed Plugins** removes its owned MU-plugin file and leaves unrelated MU-plugins in place. Use WordPress's **Delete** action rather than deleting the plugin directory directly so the uninstall handler can run.

The GitHub workflows follow the existing Timeline pattern: frozen Bun installation and verification, version-tag validation, npm authentication through `NPM_TOKEN`, skip already published versions, and an annotated-tag GitHub release. The release workflow attaches the JavaScript tarball and WordPress plugin ZIP before publishing the GitHub release. The Pages workflow deploys the documentation site separately. Configure the `npm` environment and GitHub Pages before using these workflows; see [package installation and releases](docs-site/src/package-releases.md).

## License

WP Awesome is released under the [MIT License](LICENSE.md).
