<!--
 * This file is part of the wp-awesome package.
 *
 * File: PROJECT_RULES.md
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
-->

# Package project rules

These rules describe the reusable `wp-awesome` library and its documentation site. Read the shared LGS1920 baseline in `.lgs1920/guidance/PROJECT_RULES.common.md` first. Consumer-site design, routes, hosting and secrets remain outside the package contract.

## Language and scope

- Use French in conversation unless the user requests another language. Write package API documentation, code comments, and skills in professional English.
- Keep the library independent of a particular site's domain, theme, page structure, WordPress account, custom fields, and deployment host. Use `https://beautiful.wp.site` only as a clearly fictitious documentation example.
- Treat the JavaScript API as build-time WordPress content infrastructure. The optional WP Awesome plugin installs an MU-plugin that sends manual global/record build requests and immediate notifications for public content changes; it does not own a database queue or build/deploy the consuming site. The consuming project chooses collections, public routes, templates, presentation, cache, runtime behavior, and its deployment workflow/host.
- Preserve all existing repository work. Keep consumer integration changes in the consuming repository and require its own rules and checks.

## Architecture boundaries

- WordPress REST is the content source; Eleventy is an optional consumer integration. Do not make Eleventy a runtime requirement for the package core.
- Keep REST transport, authentication helpers, content conversion, record normalization, route resolution, Eleventy registration, and optional integrations as focused modules.
- Keep site-specific policies and adapters in the consumer. Do not add a consumer domain, theme token, route alias, workflow assumption, private ID, or plugin-specific field to the generic contract.
- WP Awesome sends GitHub `repository_dispatch` events from its managed WordPress MU-plugin, but it does not build or deploy a consuming site. It must not include site domains, route maps, hosting paths, or environment secrets. Keep GitHub Actions workflows, release promotion, web-server configuration, and runtime features in the consuming project; label those examples as consumer-side references.

## API and compatibility

- Use Bun for standalone installation and package scripts, Vite for the docs stylesheet build, and Vitest for JavaScript tests. Keep Eleventy as the docs-page generator. Check `package.json`, this repository's `bun.lock`, public exports, and `index.d.ts` before changing module shape. Keep CommonJS behavior and the declared Node.js support; the HTML sanitization dependency currently requires Node.js `>=22.12.0`.
- Keep the root export and documented subpath exports consistent with runtime files and TypeScript declarations. Do not make optional integrations mandatory dependencies of the core.
- Treat public return shapes and route behavior as package API. Describe breaking changes and update examples, declarations, and tests together.
- Keep transport injectable so tests can use deterministic local responses instead of network access or WordPress credentials.

## WordPress, content, and security

- Require consumer-selected REST endpoints and fields; do not infer that every endpoint response belongs in public output.
- Keep credentials in the server-side build environment. Do not embed them in API URLs, browser bundles, templates, examples, or generated pages. Scope authentication headers to requests that need them.
- Do not include `content.raw`, arbitrary REST metadata, author email, or author login in normalized public records. Copy custom fields only through an explicit allowlist.
- Treat retained WordPress HTML and custom renderer output as untrusted HTML. The package applies an allowlist sanitizer before returning those HTML fields; custom fields remain unsanitized data and still require validation and template escaping.
- Keep Gutenberg mode, supported blocks, fallback, and renderer behavior explicit. Do not claim that parsing serialized blocks recreates WordPress theme/plugin rendering or dynamic blocks.
- Preserve the trailing-slash route contract and reject unsafe route paths. Route-collision detection only runs when the consumer calls it; document that requirement and test route changes.

## Documentation site

- Maintain source pages under `docs-site/src/`; use Eleventy to generate `docs-site/_site/`. Never hand-edit generated output.
- Write technical documentation in English, distinguish implemented behavior from examples or proposals, and keep site-specific deployment instructions explicitly illustrative.
- Use code fences with Prism languages supported by the configured syntax-highlighting plugin. Keep example domains fictitious and credentials visibly nonfunctional.
- Use the package scripts from this directory: `bun run docs:serve`, `bun run docs:build`, `bun run docs:check`, `bun run test`, and `bun run test:php`.
- Update local links, API examples, and operational examples when the corresponding implementation changes. Documentation examples do not install plugins or change hosting by themselves.

## Package identity and delivery

- The unscoped public package name is `wp-awesome`; do not add an organization scope. Repository metadata follows `chdenat/wp-awesome`. Keep source CommonJS exports directly installable from a Git checkout and npm tarball; do not require Bun, PHP, Vite, or a package build for consumer installation.
- Use the MIT license shared by the standalone packages. Keep the JavaScript manifest and PHP plugin version synchronized.
- The documentation site also serves as the offline demo, with a real normalization fixture, on fixed port `4177`. Do not choose another port automatically.
- The release script previews without writing; its explicit release mode verifies, updates selected version files, commits, tags, and pushes to trigger GitHub publication. These side effects must be requested by the user.
- New JavaScript functions use arrow syntax and no semicolons. Preserve compatibility in pre-existing CommonJS implementation and PHP syntax.

## Validation and delivery

- Run `bun run test` for JavaScript runtime changes, `bun run test:php` for WP Awesome changes, and `bun run docs:check` for documentation changes. Run all relevant checks when work crosses those boundaries.
- Run `bun run verify` (Vitest, lint, PHP, docs, isolated npm/Node/Bun/TypeScript consumer, plugin ZIP, headers) and `bun run pack:check`. Before a package release, inspect the package contents with Bun's pack dry run and verify public exports, declarations, docs, and a clean consumer installation.
- Preserve staged, unstaged, and untracked work. Do not commit, push, publish, deploy, or modify production WordPress or hosting without explicit user instruction.
- Report what changed, the checks run, and any integration behavior that still needs a real WordPress staging site or host to verify.
