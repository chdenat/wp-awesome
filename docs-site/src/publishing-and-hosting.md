---
layout: layouts/docs.njk
title: Local, staging, and production
section: Start here
description: Keep WordPress as the backend, preview the Eleventy frontend locally, test it on staging, and publish to production only after staging passes.
permalink: publishing-and-hosting/index.html
---
<!--
 * This file is part of the wp-awesome package.
 *
 * File: docs-site/src/publishing-and-hosting.md
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
-->

WP Awesome keeps WordPress as your content backend and provides an Eleventy frontend built with Build Awesome, Web Awesome components, and Font Awesome icons. The generated frontend is a separate project: its build writes static files to <code>_site/</code>, which your hosting workflow publishes.

The three URLs have separate roles:

| Environment | Frontend address | WordPress content source | Purpose |
| --- | --- | --- | --- |
| Local | Your computer | Staging WordPress, or production if you deliberately share it | Preview templates and content before publishing |
| Staging | Staging host | Staging WordPress, or the shared production backend | Test the deployed frontend with realistic content |
| Production | Public live host | Production WordPress backend | Serve visitors after staging has passed |

The setup assistant creates the frontend project files. Save and commit them in that project's repository. `package.json` and `.eleventy.cjs` go in the project root; the WordPress loader goes in `site/`; page templates and frontend assets go in `src/`. Do not put these frontend files in `wp-content/plugins/`.

## 1. Preview locally with staging settings

From the root of the generated frontend project, install the listed dependencies and make the staging environment the default local preview:

```sh
bun install
cp .env.staging.example .env
cp .env.staging.example .env.staging
cp .env.production.example .env.production
bun run serve
```

Open the local address printed by the preview command. `.env` sets the frontend canonical URL and WordPress source for this preview. By default it uses the staging frontend URL. If the assistant's staging WordPress URL was left empty, the local preview reads production WordPress content and still writes staging URLs; use a separate staging WordPress backend when the test needs isolated content.

Before moving on, review the selected pages and posts, page titles, route patterns, images, internal links, navigation, and the forms included in your release. Check that the content shown on the local preview comes from the WordPress backend you intended.

## 2. Deploy and test staging first

Use your frontend project's hosting workflow to build with staging settings and publish the generated `_site/` directory to the staging host:

```sh
bun run build:staging
```

Deploy the contents of `_site/` to the staging frontend's document root. Your hosting platform may run the build from the repository, or you may upload the generated static files through its deployment interface. Keep the WordPress backend and staging frontend addresses separate in their respective settings.

Open the deployed staging URL and test the actual frontend. Check representative pages and posts, routes, navigation, images, links, mobile layout, browser console errors, and each form submission against its WordPress handler. Verify any saved Gutenberg content that uses WP Awesome's supported block list. Repeat the staging build and checks after fixing an issue.

If the WordPress source is reachable only from your local computer, the remote staging build cannot fetch it. Configure a WordPress backend that the staging build can reach.

## 3. Publish production after staging passes

Only after the staging site passes its checks, build with production settings and deploy `_site/` to the live frontend host:

```sh
bun run build:production
```

Require a reviewer approval for the production hosting environment when your platform supports deployment protections. After publishing, verify the live URL, canonical links, content, images, navigation, and forms. If a production deployment fails, keep the last working version available and use the host's rollback procedure before trying again.

## Optional: connect WordPress build requests

The separate WP Awesome WordPress plugin installs a managed MU-plugin on the backend. It can dispatch a full-site request from its admin page, a single-record request from a content row, and automatic record requests after published public content changes. The plugin does not belong in the generated frontend project; the consumer workflow owns the build and deployment commands.

Configure one enabled target in WordPress, usually `staging`, and set the event type below. The plugin presents one selected target; all automatic and manual requests from that WordPress installation use it. The consumer workflow can use its `client_payload.target` and `client_payload.scope` values to build the full site or one record. Test the workflow and deployed staging frontend before using any production target. GitHub accepting a request only confirms event delivery; inspect the run and deployed website to confirm success.

The workflow event name must match the event type configured in `WPEC_CONNECTOR_TARGETS`:

```yaml
on:
  repository_dispatch:
    types:
      - beautiful_wp_content
```

Keep the GitHub token on the WordPress server and grant it access only to the frontend repository. Put hosting secrets in the appropriate GitHub environment, not in WordPress or the frontend repository. Production should require reviewer approval and restrict the branches that can deploy. See the [WordPress build controls guide](/wp-awesome/) for the configuration constants and full event payload.

<h2 id="connect-wordpress-build-requests">Connect WordPress build requests</h2>

WP Awesome sends GitHub `repository_dispatch` requests directly after an administrator action or a public content change. It does not schedule WordPress cron events. The consumer workflow must match the configured event type and use `client_payload.scope` to choose a full-site or record-specific build. See the [WordPress build controls guide](/wp-awesome/) for installation, payload fields, and configuration.

## Diagnose a failed staging deployment

- **The staging build cannot fetch WordPress:** check `WORDPRESS_ORIGIN`, network access, REST API visibility, and credentials for saved-block mode.
- **The workflow does not start:** check the repository, token permissions, event name, workflow file on the default branch, and selected target status.
- **The build succeeds but the staging page is wrong:** check `SITE_URL`, route patterns, the host's document root, and its cache.
- **A form does not submit:** verify the form's WordPress handler and its frontend integration on staging before allowing production deployment.
- **A saved block falls back to rendered content:** compare its name to the fixed list on the [Gutenberg content guide](/gutenberg-content/) and verify the rendered output.

Do not send a production request to work around an unverified staging deployment.
