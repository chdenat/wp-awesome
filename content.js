/******************************************************************************
 * This file is part of the wp-awesome package.
 *
 * File: content.js
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
 ******************************************************************************/

'use strict'

const { parse } = require('@wordpress/block-serialization-default-parser')
const { sanitizeWordPressHtml } = require('./sanitize')
const DEFAULT_SUPPORTED_BLOCK_NAMES = require('./supported-blocks')

const BLOCK_DELIMITER = /<!--\s*\/?\s*wp:/i

/**
 * Parses serialized Gutenberg content with WordPress's default block parser.
 * @param {string} [source] Raw content from the WordPress REST API.
 * @returns {{hasSerializedBlocks: boolean, blocks: object[], blockTypes: Record<string, number>}}
 */
function parseSerializedContent(source = '') {
  if (typeof source !== 'string' || !BLOCK_DELIMITER.test(source)) {
    return { hasSerializedBlocks: false, blocks: [], blockTypes: {} }
  }

  const blocks = parse(source)
  return {
    hasSerializedBlocks: true,
    blocks,
    blockTypes: summarizeBlockTypes(blocks),
  }
}

/**
 * Counts block names recursively without exposing block attributes or content.
 * @param {object[]} [blocks] Parsed Gutenberg block nodes.
 * @returns {Record<string, number>} A stable, alphabetically ordered inventory.
 */
function summarizeBlockTypes(blocks = []) {
  const counts = new Map()
  const visit = (nodes) => {
    for (const block of nodes) {
      const name = block.blockName || 'freeform'
      counts.set(name, (counts.get(name) || 0) + 1)
      visit(block.innerBlocks || [])
    }
  }
  visit(blocks)
  return Object.fromEntries([...counts].sort(([left], [right]) => left.localeCompare(right)))
}

/**
 * Finds blocks that have no declared support or custom renderer.
 * @param {object[]} [blocks] Parsed Gutenberg block nodes.
 * @param {{supportedBlockNames?: string[]|Set<string>, blockRenderers?: Record<string, Function>, allowFreeform?: boolean}} [options]
 * @returns {string[]} Unsupported block names, including `freeform` when applicable.
 */
function unsupportedBlockNames(blocks = [], { supportedBlockNames = DEFAULT_SUPPORTED_BLOCK_NAMES, blockRenderers = {}, allowFreeform = false } = {}) {
  const supported = supportedBlockNames instanceof Set
    ? supportedBlockNames
    : new Set(supportedBlockNames)
  const unsupported = new Set()
  const visit = (nodes) => {
    for (const block of nodes) {
      if (block.blockName) {
        if (!supported.has(block.blockName) && typeof blockRenderers[block.blockName] !== 'function') {
          unsupported.add(block.blockName)
        }
      } else if (!allowFreeform && String(block.innerHTML || '').trim()) {
        unsupported.add('freeform')
      }
      visit(block.innerBlocks || [])
    }
  }
  visit(blocks)
  return [...unsupported].sort()
}

/**
 * Reconstructs saved block HTML and invokes only consumer-supplied synchronous renderers.
 * @param {object[]} [blocks] Parsed Gutenberg block nodes.
 * @param {{blockRenderers?: Record<string, Function>, transformBlock?: Function}} [options]
 * @returns {string} Reconstructed HTML; dynamic blocks still need an explicit renderer or server HTML.
 */
function renderBlockTree(blocks = [], { blockRenderers = {}, transformBlock } = {}) {
  const renderBlock = (block) => {
    const childHtml = (block.innerBlocks || []).map(renderBlock)
    const segments = Array.isArray(block.innerContent) ? block.innerContent : [block.innerHTML || '']
    let childIndex = 0
    const innerHTML = segments.map((segment) => {
      if (segment === null) return childHtml[childIndex++] || ''
      return segment || ''
    }).join('') + childHtml.slice(childIndex).join('')
    const transformedHtml = typeof transformBlock === 'function'
      ? transformBlock({ block, innerHTML, childHtml })
      : innerHTML
    const blockHtml = typeof transformedHtml === 'string' ? transformedHtml : innerHTML
    const renderer = block.blockName && blockRenderers[block.blockName]
    if (typeof renderer === 'function') {
      const rendered = renderer({ block, innerHTML: blockHtml, childHtml })
      if (typeof rendered === 'string') return rendered
    }
    return blockHtml
  }
  return blocks.map(renderBlock).join('')
}

/**
 * Chooses serialized Gutenberg markup or WordPress-rendered HTML according to an explicit policy.
 * @param {object} [options] Raw and rendered content, policy, renderers, and a consumer HTML transform.
 * @param {string} [options.rawContent] Serialized `content.raw` from a privileged REST response.
 * @param {string} [options.renderedHtml] Public server-rendered content.
 * @param {'auto'|'rendered'|'blocks'} [options.mode='auto'] Conversion policy.
 * @param {string[]} [options.supportedBlockNames] Block names safe to reconstruct from saved HTML.
 * @param {Record<string, Function>} [options.blockRenderers] Custom synchronous block renderers.
 * @param {Function} [options.transformBlock] Consumer-owned transformation for each reconstructed block.
 * @param {boolean} [options.allowFreeform=false] Whether unwrapped HTML is supported in block mode.
 * @param {Function} [options.transformHtml] Consumer-owned transformation applied to the chosen HTML.
 * @param {object} [options.sanitizerOptions] Explicit trusted additions to the default HTML allowlist.
 * @returns {{html: string, source: string, hasSerializedBlocks: boolean, blockTypes: Record<string, number>, unsupportedBlockNames: string[], fallbackReason: string|null}}
 * @throws {Error} In `blocks` mode when serialized content is missing or not fully supported.
 */
function convertWordPressContent({
  rawContent = '',
  renderedHtml = '',
  mode = 'auto',
  supportedBlockNames = DEFAULT_SUPPORTED_BLOCK_NAMES,
  blockRenderers = {},
  transformBlock,
  allowFreeform = false,
  transformHtml = (html) => html,
  sanitizerOptions,
} = {}) {
  if (!['auto', 'rendered', 'blocks'].includes(mode)) {
    throw new Error(`Unsupported WordPress content mode: ${mode}`)
  }

  const parsed = parseSerializedContent(rawContent)
  const unsupported = unsupportedBlockNames(parsed.blocks, {
    supportedBlockNames,
    blockRenderers,
    allowFreeform,
  })
  const canRenderSerialized = parsed.hasSerializedBlocks && unsupported.length === 0
  const useSerialized = mode !== 'rendered' && canRenderSerialized

  if (mode === 'blocks' && !canRenderSerialized) {
    const reason = !parsed.hasSerializedBlocks
      ? 'serialized Gutenberg content is unavailable'
      : `unsupported block types: ${unsupported.join(', ')}`
    throw new Error(`Cannot convert WordPress content in blocks mode: ${reason}.`)
  }

  let sourceHtml
  let source
  let fallbackReason = null
  if (useSerialized) {
    sourceHtml = renderBlockTree(parsed.blocks, { blockRenderers, transformBlock })
    source = 'serialized-blocks'
  } else if (renderedHtml) {
    sourceHtml = renderedHtml
    source = 'rendered-html'
    if (mode === 'rendered') fallbackReason = 'rendered-mode-configured'
    else if (!parsed.hasSerializedBlocks) fallbackReason = rawContent ? 'no-serialized-blocks' : 'raw-content-unavailable'
    else fallbackReason = `unsupported-blocks:${unsupported.join(',')}`
  } else if (parsed.hasSerializedBlocks) {
    sourceHtml = renderBlockTree(parsed.blocks, { blockRenderers, transformBlock })
    source = 'serialized-blocks-fallback'
    fallbackReason = unsupported.length ? `rendered-html-unavailable:${unsupported.join(',')}` : 'rendered-html-unavailable'
  } else {
    sourceHtml = rawContent
    source = rawContent ? 'raw-html' : 'empty'
    fallbackReason = rawContent ? 'no-rendered-html' : 'content-unavailable'
  }

  return {
    html: sanitizeWordPressHtml(
      transformHtml(sourceHtml, { blocks: parsed.blocks, blockTypes: parsed.blockTypes, source, fallbackReason }),
      sanitizerOptions,
    ),
    source,
    hasSerializedBlocks: parsed.hasSerializedBlocks,
    blockTypes: parsed.blockTypes,
    unsupportedBlockNames: unsupported,
    fallbackReason,
  }
}

module.exports = {
  DEFAULT_SUPPORTED_BLOCK_NAMES,
  convertWordPressContent,
  parseSerializedContent,
  renderBlockTree,
  summarizeBlockTypes,
  unsupportedBlockNames,
}
