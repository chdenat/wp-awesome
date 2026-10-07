---
name: wordpress-eleventy-package-maintenance
description: Maintain the reusable WordPress REST and Eleventy content library, including authentication, Gutenberg conversion, normalized records, routes, optional adapters, declarations, and tests.
---
<!--
 * This file is part of the wp-awesome package.
 *
 * File: skills/wordpress-eleventy-package-maintenance/SKILL.md
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
-->

# Package maintenance

Use this skill for changes to package runtime behavior or its public API. Read the package [`PROJECT_RULES.md`](../../PROJECT_RULES.md) first.

## Workflow

1. Trace the public call through the module, package export, declaration, consumer example, and existing tests before changing behavior.
2. Preserve the package boundary: consumers choose endpoints, record inclusion, route policy, templates, and deployment. Keep site-specific fields and plugin logic in optional adapters or the consuming project.
3. Keep REST transport injectable. Preserve relative-endpoint origin checks, bounded pagination/retries, HTTPS for edit context, explicit public fallback, and server-side credentials.
4. When changing normalized data, check the allowlist and privacy boundary: raw edit content and arbitrary metadata must not leak into public contracts; selected HTML is sanitized by the package, while custom fields remain untrusted data that needs consumer validation and template escaping.
5. For Gutenberg changes, verify each mode (`rendered`, `auto`, `blocks`), unsupported-block diagnostics, nested blocks, and behavior when rendered or serialized content is absent. Do not describe parsing as complete WordPress rendering.
6. For route changes, preserve the trailing-slash/output-path contract, path validation, canonical origin, and collision detection. The consumer must explicitly call the collision check.
7. Update JSDoc, `index.d.ts`, package subpath exports, examples, and targeted deterministic tests together when the public contract changes.

Run `bun run test` from the package directory. For WP Awesome changes, also run `bun run test:php`. Do not call a live WordPress API in unit tests; use injected fetch responses. Run `bun run docs:check` as well when documented API behavior or examples change.
