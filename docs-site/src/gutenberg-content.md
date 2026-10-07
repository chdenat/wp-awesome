---
layout: layouts/docs.njk
title: Gutenberg content
section: Build your site
description: Decide when to trust WordPress-rendered HTML, when saved Gutenberg markup is fully covered, and how to make unsupported blocks visible to the build.
permalink: gutenberg-content/index.html
---
<!--
 * This file is part of the wp-awesome package.
 *
 * File: docs-site/src/gutenberg-content.md
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
-->

## Three explicit content modes

Eleventy is the frontend baseline, and Web Awesome is the target component system for replacing corresponding WordPress theme and Gutenberg elements. This mapping is incremental: each supported replacement needs a frontend template or an explicit block renderer. `wp-awesome` does not automatically convert every Gutenberg block. In `auto` mode, unsupported serialized blocks fall back to WordPress-rendered HTML when it is available; `blocks` mode fails when coverage is incomplete.

| Mode | Selection | Use it when |
| --- | --- | --- |
| `rendered` | Use `content.rendered` from WordPress | The origin's block rendering, shortcodes, or plugins are part of the required output |
| `auto` | Reconstruct saved blocks only when all block names are supported; otherwise use rendered HTML | You want diagnostics and a safe fallback while migrating block coverage |
| `blocks` | Require complete serialized-block coverage or fail | Your own renderer supports every block in the record and build failure is preferred to partial output |

`convertWordPressContent()` defaults to `auto`. With no custom block policy, WP Awesome reconstructs saved markup for this fixed list:

- `core/paragraph`
- `core/heading`
- `core/list`
- `core/list-item`

The list is exported as `DEFAULT_SUPPORTED_BLOCK_NAMES`. In `auto` mode, any other block appears in `unsupportedBlockNames` and makes WP Awesome use rendered HTML when WordPress provides it. In `blocks` mode, incomplete coverage raises an error. A custom `supportedBlockNames` value replaces the default list; include every built-in block you still need as well as any additional block whose saved markup your integration has tested.

## Preserve WordPress text colors

Rendered page HTML can carry preset colors and per-block link colors in global-styles CSS rather than in the content fragment. The style helpers extract those values without returning arbitrary CSS, so an adapter can move them into its own external stylesheet:

```js
const {
  extractWordPressColorPalette,
  extractWordPressLinkColors,
} = require('wp-awesome')

const colorPalette = extractWordPressColorPalette(publicPageHtml)
const linkColors = extractWordPressLinkColors(publicPageHtml, { colorPalette })
// colorPalette: { primary: '#cc3366' }
// linkColors: { 'wp-elements-1': '#cc3366' }
```

`extractWordPressLinkColors()` reads the generated `wp-elements-*` selectors and resolves references such as `var(--wp--preset--color--primary)` through the extracted palette. Values containing URLs, unresolved variables, or CSS rule delimiters are omitted. The adapter remains responsible for associating those class names with its corresponding content record and for writing the result to an external stylesheet.

## Set policy per content type

Use `resolveWordPressContentPolicy()` to merge a shared default with a type-specific policy. A custom block renderer counts as support for that block name.

```js
const { resolveWordPressContentPolicy } = require('wp-awesome')

const policies = {
  default: {
    mode: 'rendered',
  },
  types: {
    page: {
      mode: 'auto',
      supportedBlockNames: [
        'core/paragraph',
        'core/heading',
        'core/list',
        'core/image',
      ],
    },
    post: {
      mode: 'blocks',
      supportedBlockNames: ['core/paragraph', 'core/heading'],
      blockRenderers: {
        'example/notice': ({ block, innerHTML }) => {
          const label = String(block.attrs?.label || 'Notice')
          return `<aside class="notice"><strong>${label}</strong>${innerHTML}</aside>`
        },
      },
    },
  },
}

const pagePolicy = resolveWordPressContentPolicy(policies, 'page')
const postPolicy = resolveWordPressContentPolicy(policies, 'post')
```

`example/notice` is a placeholder name for a block registered by a hypothetical plugin. Replace it with the exact name found in your WordPress serialized content. The package does not register blocks or infer support from their CSS classes.

`renderBlockTree()` and `convertWordPressContent()` also accept a `transformBlock` callback. It runs once per reconstructed block after nested children are assembled and before a custom block renderer runs, with the parsed block attributes and reconstructed HTML. Use it when an adapter needs to carry saved block settings into its own markup or style pipeline. It is not called when rendered HTML is selected.

For a type with a strict block policy, pass the resolved policy into normalization:

```js
const policy = resolveWordPressContentPolicy(policies, 'post')
const post = normalizeWordPressRecord(sourcePost, {
  type: 'post',
  routeResolver,
  contentPolicy: policy,
})

if (post.content.unsupportedBlockNames.length > 0) {
  throw new Error(`Unsupported post blocks: ${post.content.unsupportedBlockNames.join(', ')}`)
}
```

## Inspect source coverage before switching modes

`parseSerializedContent()` reports whether serialized Gutenberg markers were present and counts block types recursively. The summary contains block names and counts, not source text or block attributes.

```js
const { parseSerializedContent } = require('wp-awesome')

const parsed = parseSerializedContent(sourcePost.content.raw || '')
console.table(parsed.blockTypes)
console.log({ hasSerializedBlocks: parsed.hasSerializedBlocks })
```

You can check a record against a proposed allowlist before rendering it:

```js
const { unsupportedBlockNames } = require('wp-awesome')

const unsupported = unsupportedBlockNames(parsed.blocks, {
  supportedBlockNames: ['core/paragraph', 'core/heading', 'core/image'],
  blockRenderers: {
    'example/notice': renderNoticeBlock,
  },
  allowFreeform: false,
})

if (unsupported.length) {
  console.error(sourcePost.link, unsupported)
}
```

## What serialized reconstruction does not do

The default parser reconstructs saved block markup and invokes only the synchronous renderers supplied by the consuming site. It does not load WordPress block registrations, execute PHP, render dynamic blocks, run shortcodes, or reproduce WordPress theme CSS. Prefer server-rendered HTML until your Eleventy renderer and styles preserve the required semantics and behavior.

An `auto` fallback is not proof of visual parity. Record which mode each content family uses, report `source`, `fallbackReason`, and `unsupportedBlockNames` from normalized content, and test representative routes before changing the policy.
