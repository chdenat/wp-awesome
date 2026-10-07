---
name: wordpress-eleventy-package-release
description: Prepare and verify a versioned wp-awesome package release, including exports, declarations, documentation, tarball contents, and a clean consumer install.
---
<!--
 * This file is part of the wp-awesome package.
 *
 * File: skills/wordpress-eleventy-package-release/SKILL.md
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
-->

# Package release

Use this skill for release readiness, versioning, tarball checks, and registry publication when it is explicitly requested. Read the package [`PROJECT_RULES.md`](../../PROJECT_RULES.md); a prepared release remains local until publication is requested.

## Release checks

1. Inspect `git status --short` and preserve all staged, unstaged, and untracked work in this repository.
2. Confirm the intended version and compatibility range in `package.json`; ensure every exported runtime subpath has matching declarations and files included by the `files` allowlist.
3. Run `bun run verify` and `bun run pack:check`. Review the changelog/release notes and verify examples describe implemented package behavior.
4. Run `bun pm pack --dry-run` from this package directory. Check that the tarball contains the library, declarations, README and changelog, and no documentation toolchain, tests, generated output, secrets, or consumer-site files.
5. For a release candidate, pack to a temporary tarball and install it in a clean consumer fixture outside the repository. Exercise root and optional imports, TypeScript resolution when available, and the minimum supported Node version.
6. Report any API, documentation, compatibility, or registry blockers. Do not silently widen peer/runtime dependencies or publish an unverified tarball.

## Publication boundary

- Do not publish to npm or another registry, create a Git tag, push a branch, or create a release unless the user explicitly asks for that external action.
- Version preparation and `bun pm pack --dry-run` are local checks and do not authorize publication.
- If publication is requested, verify the target registry, package access, version availability, and the exact tarball before running the publish command. Stop if those inputs do not match the requested release.
