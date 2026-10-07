---
name: wordpress-eleventy-docs
description: Create and maintain the package's Eleventy documentation site, including setup guides, API explanations, highlighted examples, navigation, and generated-site checks.
---
<!--
 * This file is part of the wp-awesome package.
 *
 * File: skills/wordpress-eleventy-docs/SKILL.md
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
-->

# Documentation site

Use this skill for pages, examples, navigation, layout, or QA in the package's Eleventy docs site. Read the package [`PROJECT_RULES.md`](../../PROJECT_RULES.md) and confirm implementation details in the package source before documenting them.

## Workflow

- Keep page source in `docs-site/src/` and reusable layout/assets in their source directories. Never edit generated `docs-site/_site/` files directly.
- Write technical material in professional English. Use `https://beautiful.wp.site` only as a fictitious example and mark copied workflow, cron, MU-plugin, Apache, or Nginx configuration as consumer-side reference material.
- State whether a behavior is implemented in the package, belongs to a consumer adapter, or is only an operational example. Do not imply the package installs a plugin, schedules cron, deploys a site, or publishes itself.
- Prefer runnable, internally consistent examples. Keep secrets nonfunctional, align examples with current package exports and Node support, and use Prism language tags supported by `docs-site/eleventy.config.cjs`.
- Link related pages and official primary documentation where it helps an operator verify provider-specific behavior. Keep local anchors valid and navigation labels consistent.
- Preserve responsive layout and keyboard-accessible navigation. Check desktop and narrow-mobile output after changing the docs shell or navigation.

Run `bun run docs:check` from the package directory. It builds the stylesheet with Vite, generates the pages with Eleventy, and checks local links and fragments. Inspect the generated page when changing layouts or code highlighting; do not change the checker to conceal a broken link or unsupported code language.
