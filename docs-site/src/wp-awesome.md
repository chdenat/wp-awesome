---
layout: layouts/docs.njk
title: WordPress plugin installation and build controls
section: Reference
description: Install the WP Awesome MU-plugin, rebuild the whole site or one public record, and connect WordPress changes to a GitHub workflow.
permalink: wp-awesome/index.html
---
<!--
 * This file is part of the wp-awesome package.
 *
 * File: docs-site/src/wp-awesome.md
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
-->

## What the WordPress plugin does

WP Awesome provides one job in WordPress: request a build after a content change. It can request a full-site build from **Tools → WP Awesome**, send a request for one item from a content-list column, and automatically request a build when a published public item changes.

The regular plugin is an installer and lifecycle wrapper. On activation, it copies `wp-awesome-mu.php` into WordPress's MU-plugin directory as `wp-awesome-mu.php`. The MU-plugin owns the dashboard button, content-list columns, save capture, and GitHub request. It is refreshed from the package copy during admin requests, so installing a plugin update also updates the managed MU-plugin.

WP Awesome does not build or deploy the frontend itself. It sends a `repository_dispatch` event to the configured GitHub repository. The receiving workflow decides whether to build one route or the whole site and owns deployment. A record-specific request only produces a record-specific build if that consumer workflow reads the record fields and implements that behavior.

The plugin creates no WP Awesome database tables, options, transient caches, event queue, or cron events. Automatic changes are collected in request memory and sent to GitHub when that WordPress request finishes. There is no persistent retry if GitHub cannot accept the request.

WP Awesome is designed to support multiple languages, starting with English and French.

## The three ways to request a build

### Rebuild the whole site

Open **Tools → WP Awesome** and press **Build the entire site** (French: **Mettre à jour tout le site**). The request is protected by a WordPress nonce and requires the `manage_options` capability. It sends a `repository_dispatch` event with `client_payload.scope` set to `site`.

The page contains one action. It does not list configuration diagnostics, build history, pending events, or GitHub runs. After submission, WordPress shows whether GitHub accepted or rejected the request. A successful response means GitHub accepted the event; it does not mean a workflow started, passed, or deployed the site.

### Rebuild one item from its list row

The MU-plugin adds a **Build** column (French: **Mise à jour**) to admin lists for public post types that have an admin UI. This includes standard posts and pages, media, and consumer-defined public post types such as products. The action is shown for published items and public attachments, whose standard WordPress status is `inherit`. The current user must be allowed to edit the item.

Selecting **Build this item** (French: **Mettre à jour cet élément**) sends `client_payload.scope: record` with the item's type, ID, public URL, current status, and the names of relevant changed fields. The request uses a per-item nonce and checks `edit_post` again on the server. WordPress returns to the same content list with a result notice.

The plugin does not send page or post bodies, custom-field values, authentication data, or editor content to GitHub. The configured workflow can use the record type and ID to fetch canonical content from WordPress through the REST API.

### Build automatically after a public content change

The MU-plugin captures these WordPress changes:

- A meaningful save to a published public post type, including a transition into or out of `publish` when either the old or new version is published. Public attachments in WordPress's `inherit` status are also included.
- Metadata changes on a currently published public item or public attachment. It ignores editor locks, editor IDs, old-date markers, ping markers, oEmbed cache keys, and transient keys.
- Changes to public taxonomy assignments on a currently published public item.
- Deletion of a published public item or public attachment.

Revisions and autosaves are ignored. A draft-only edit does not trigger a build. Core post changes identify fields such as title, content, excerpt, status, slug, parent, and order. Metadata and taxonomy events include field names or taxonomy names, never their values. WordPress's [`wp_after_insert_post` hook](https://developer.wordpress.org/reference/hooks/wp_after_insert_post/) runs after the post, its terms, and its metadata have been saved, so the shutdown dispatch describes the completed save. The list columns use the relevant [post-type column hooks](https://developer.wordpress.org/reference/hooks/manage_post_type_posts_columns/), [page column hooks](https://developer.wordpress.org/reference/hooks/manage_pages_columns/), and [media column hooks](https://developer.wordpress.org/reference/hooks/manage_media_columns/).

The MU-plugin keeps a short in-memory record for each affected post during the current request. If a post save also changes metadata and taxonomy assignments, it sends one event for that post after WordPress finishes the request, with the changed-field names combined. The memory is discarded when the request ends. The plugin does not install a database queue or schedule a later retry.

The automatic request is synchronous at shutdown, with a 15-second HTTP timeout. If GitHub rejects it or cannot be reached, the MU-plugin writes a short error code to the PHP error log. Correct the GitHub configuration and use either the global action or the item's row action to request another build.

## Build request sequence

Manual requests and automatic public-content changes converge on the same GitHub event. The event carries the selected target and scope; it does not contain the page or post body. The consumer workflow fetches current content from WordPress and decides whether to rebuild one route or the whole site.

<figure class="docs-diagram">
  <div class="docs-diagram-scroll" role="region" tabindex="0" aria-label="WordPress rebuild sequence diagram, scroll horizontally to inspect">
    <img src="../diagrams/rebuild-sequence.svg" alt="Sequence: an administrator can request a site or record build, or a published-content change can trigger a record event at request shutdown. GitHub starts the consumer workflow, which fetches canonical WordPress content through the REST API and WP Awesome package before building and deploying according to its own configuration." width="1500" height="790">
  </div>
  <figcaption>GitHub accepting the event confirms delivery only. The consumer workflow owns the actual build and any deployment. On narrow screens, scroll horizontally to inspect the full sequence.</figcaption>
</figure>

## Install and update the plugin

The WordPress package contains four PHP files: `wp-awesome.php` (the regular plugin entry point), `wp-awesome-mu.php` (the feature implementation), `lifecycle.php` (safe MU-plugin file operations), and `uninstall.php` (the guarded WordPress uninstall entry point). Its `languages/` directory contains the translation template, French catalog, and compiled French catalog. The package requires WordPress 5.6 or later and PHP 7.2 or later. WordPress 5.6 introduced the `wp_after_insert_post` hook used for complete post-save capture.

Download version 0.1.1 from the [WP Awesome plugin release](https://github.com/chdenat/wp-awesome/releases/tag/v0.1.1). Later version releases include the installable ZIP as a release asset.

Build the ZIP from the package checkout:

```sh
bun run plugin:build
```

The command creates `artifacts/wp-awesome-<version>.zip`. In the WordPress dashboard, go to **Plugins → Add Plugin → Upload Plugin**, select the ZIP, and activate WP Awesome. Activation creates `wp-content/mu-plugins/` when needed and installs `wp-awesome-mu.php` there. WordPress then loads the MU-plugin automatically on the next request.

The WordPress PHP process must be able to write to its MU-plugin directory. If the install fails, activation stops with an error. During a later admin request, a failed update appears as an admin notice. WP Awesome refuses to overwrite a different file at its managed path unless that file contains the WP Awesome ownership marker. It also refuses to follow a symbolic link at that path.

When the package is updated, keep the regular plugin active. An admin request compares the installed MU-plugin with the packaged source and atomically refreshes the owned file when they differ. Because WordPress already loaded MU-plugins earlier in that request, the refreshed code takes effect on the next request.

For SSH or SFTP installation, copy the ZIP's `wp-awesome/` directory into `wp-content/plugins/`, then activate WP Awesome in the dashboard. Do not copy `wp-awesome-mu.php` directly into the MU-plugin directory as well; the regular plugin manages that file and prevents two copies from registering the same hooks.

## Configure the GitHub event

Keep the token on the WordPress server in `wp-config.php` or protected server configuration. Do not commit it or put it in a frontend environment variable.

```php
define('WPEC_CONNECTOR_GITHUB_TOKEN', 'github_pat_REPLACE_WITH_A_REAL_TOKEN');
define('WPEC_CONNECTOR_REPOSITORY', 'owner/site-publisher');

define('WPEC_CONNECTOR_DEFAULT_TARGET', 'staging');
define('WPEC_CONNECTOR_TARGETS', [
    'staging' => [
        'event_type' => 'beautiful_wp_content',
        'enabled' => true,
    ],
    'production' => [
        'event_type' => 'beautiful_wp_production',
        'enabled' => false,
    ],
]);
```

`WPEC_CONNECTOR_DEFAULT_TARGET` is optional and defaults to `staging`. It selects the single target used by the global button, row actions, and automatic saves. Supported target IDs are `staging` and `production`. The selected target must exist in `WPEC_CONNECTOR_TARGETS`, have a valid `event_type` of at most 100 characters, and set `enabled` to `true`, `1`, or `'true'`. Configure a production target only if every automatic and manual update from this WordPress site should go to production; this plugin presents one target and does not offer a staging/production selector.

For a fine-grained personal access token, grant access to the selected repository and **Contents: write**, the permission required by GitHub's [create repository dispatch event endpoint](https://docs.github.com/en/rest/repos/repos#create-a-repository-dispatch-event). The plugin sends the token only as a bearer authorization header to `api.github.com`. It sends a `POST` request to `repos/{owner}/{repo}/dispatches` and treats HTTP `204` as acceptance.

The workflow must listen for `repository_dispatch`, match the configured event type, and exist on the repository's default branch. See GitHub's [`repository_dispatch` workflow event documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#repository_dispatch). `client_payload` is delivered as `github.event.client_payload` in the workflow.

## Event payload sent to the consumer workflow

Every request contains the selected target, a source label, a UTC request time, and a scope. A global button request looks like this:

```json
{
  "event_type": "beautiful_wp_content",
  "client_payload": {
    "target": "staging",
    "source": "wordpress-admin",
    "requested_at": "2026-10-07T12:00:00+00:00",
    "scope": "site"
  }
}
```

A row action or automatic save adds the changed record:

```json
{
  "event_type": "beautiful_wp_content",
  "client_payload": {
    "target": "staging",
    "source": "wordpress-save",
    "requested_at": "2026-10-07T12:00:00+00:00",
    "scope": "record",
    "record_type": "page",
    "record_id": 123,
    "record_url": "https://beautiful.wp.site/about/",
    "record_status": "publish",
    "changed_fields": ["title", "content", "subtitle", "category"]
  }
}
```

Manual row actions use `source: wordpress-admin`; automatic saves use `source: wordpress-save`. `record_status` is the current post status, or `deleted` for a deletion. An unpublish transition can therefore reach the consumer with a status such as `draft` or `private`, allowing the workflow to remove the record's public route. `changed_fields` contains sanitized field labels and metadata keys, not the field values.

Use a consumer-side workflow that checks `scope` before choosing its build strategy. This example shows the dispatch contract only; it does not implement a route build or deployment:

```yaml
name: Build from WordPress

on:
  repository_dispatch:
    types: [beautiful_wp_content]

jobs:
  build:
    runs-on: ubuntu-latest
    env:
      BUILD_SCOPE: ${{ github.event.client_payload.scope }}
      RECORD_TYPE: ${{ github.event.client_payload.record_type }}
      RECORD_ID: ${{ github.event.client_payload.record_id }}
      RECORD_STATUS: ${{ github.event.client_payload.record_status }}
    steps:
      - name: Choose the consumer build
        run: |
          if [ "$BUILD_SCOPE" = "record" ]; then
            echo "Build or remove $RECORD_TYPE record $RECORD_ID ($RECORD_STATUS)"
          else
            echo "Build the complete site"
          fi
```

The consuming project must decide how to fetch the canonical record, map it to a route, handle deletions, and deploy output. If its build tool cannot safely build one route, it can use the record event as a trigger and run a complete site build instead. Do not pass the GitHub token or WordPress credentials in `client_payload`.

## Security and operating boundaries

- Global requests require `manage_options`. A per-record request requires `edit_post` for that record, a valid nonce, a published public post type, and a public admin list.
- The record ID is read from the WordPress database by the consumer workflow if needed. WP Awesome sends only its ID, type, public permalink, status, and changed-field names.
- The GitHub response confirms only event acceptance. Check the Actions run and the deployed URL in the consuming project.
- There is no durable queue or retry. Saving content remains successful if GitHub is temporarily unavailable, but the automatic build request can be lost. The PHP error log records the failure code without logging content or credentials.
- Multiple distinct records changed in one WordPress request produce one dispatch per record. Changes to the same record in that request are merged in memory.
- A consumer may choose to rebuild the entire site for every record event. Record-specific compilation is a consumer workflow responsibility because routes and deployment layout belong to that project.

## Deactivate or uninstall

Deactivating WP Awesome removes its owned `wp-awesome-mu.php` file, so the build page, automatic capture, and content columns stop together. Reactivating the regular plugin installs the file again.

Deleting WP Awesome under **Plugins → Installed Plugins** runs the guarded `uninstall.php` file and removes the same owned MU-plugin. The cleanup leaves the `mu-plugins` directory and unrelated MU-plugin files in place. If the target file no longer carries the WP Awesome ownership marker, uninstall stops and leaves it untouched rather than deleting a file that may have been replaced by an administrator.

Deleting the regular plugin directory over SSH/SFTP does not run WordPress's uninstall entry point. If that happens, remove the managed `wp-content/mu-plugins/wp-awesome-mu.php` file yourself after verifying that it is WP Awesome's copy.

## Troubleshoot

| Symptom | Check |
| --- | --- |
| The build page or columns are missing | Confirm WP Awesome is active and `wp-content/mu-plugins/wp-awesome-mu.php` exists. The MU-plugin is loaded on the next WordPress request after activation or update. |
| Activation reports a filesystem error | Check that the WordPress PHP process can write to `wp-content/mu-plugins/` and that no unrelated file already uses `wp-awesome-mu.php`. |
| The global or row action reports missing configuration | Check the token, repository name, selected target, event type, and `enabled` value in `wp-config.php`. |
| GitHub rejects the request | Check outbound HTTPS to `api.github.com`, token access to the repository, and the fine-grained token's **Contents: write** permission. |
| GitHub accepts the event but starts no workflow | Match `event_type` to `repository_dispatch.types` and confirm the workflow file exists on the repository's default branch. |
| A record event runs a full build | Inspect the consumer workflow. WP Awesome supplies record fields but does not implement the consumer's route-specific build. |
| An automatic build request was lost | Check the PHP error log for `WP Awesome could not dispatch an automatic content build`. Correct the configuration, then use the global button or the row action to retry manually. |

For the JavaScript REST client and consumer build setup, continue with [Fetching and normalizing content](/fetch-and-normalize/), [Routes and templates](/routes-and-templates/), and [Publishing and hosting](/publishing-and-hosting/).
