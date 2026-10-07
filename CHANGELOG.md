<!--
 * This file is part of the wp-awesome package.
 *
 * File: CHANGELOG.md
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
-->

# Changelog

## 0.3.0 — 2026-10-07

- Add an injectable Yoast sitemap text transport with bounded retries, exponential backoff, jitter, timeout handling, and `Retry-After` support.

## 0.2.0 — 2026-10-07

- See the annotated release tag and commit history.

## 0.1.1 — 2026-10-07

- See the annotated release tag and commit history.

## 0.1.0 — 2026-10-07

- Extract the standalone `wp-awesome` package and preserve its CommonJS API.
- Provide WordPress REST fetching, sanitization, Gutenberg conversion, record contracts, configurable routes, and optional Eleventy, WooCommerce, Yoast, and form integrations.
- Preserve safe image aspect ratios during HTML normalization, including square crops and authored portrait ratios.
- Include WordPress build controls through an automatically installed MU-plugin, with global, per-record, and save-triggered GitHub build requests and no plugin-owned database tables.
- Localize the WordPress plugin and managed MU-plugin interface in English by default and French (France), following the WordPress admin locale.
- Remove the managed MU-plugin when WP Awesome is deactivated or uninstalled, preserving unrelated MU-plugin files.
- Add the Eleventy documentation site, an offline demo, Bun/Vite/Vitest tooling, clean-consumer checks, and npm/GitHub release automation.
