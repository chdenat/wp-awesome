/******************************************************************************
 * This file is part of the wp-awesome package.
 *
 * File: styles.js
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
 ******************************************************************************/

'use strict'

const COLOR_FUNCTIONS = new Set([
  'color',
  'color-mix',
  'hsl',
  'hsla',
  'hwb',
  'lab',
  'lch',
  'oklab',
  'oklch',
  'rgb',
  'rgba',
])

const WORDPRESS_COLOR_PROPERTY = /--wp--preset--color--([a-z0-9][a-z0-9-]*)\s*:\s*([^;{}]+)/gi
const WORDPRESS_COLOR_VARIABLE = /var\(\s*--wp--preset--color--([a-z0-9][a-z0-9-]*)\s*(?:,\s*([^)]*))?\)/gi

/**
 * Checks that a color value can be copied into a CSS declaration without adding markup or rules.
 * @param {string} value Candidate CSS color.
 * @returns {boolean} Whether the value uses a restricted, inert color syntax.
 */
function isSafeCssColorValue(value) {
  const color = String(value || '').trim()
  if (!color || /[;{}<>\\"'`]|url\s*\(|expression\s*\(|var\s*\(/i.test(color)) return false
  if (/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(color)) return true
  if (/^[a-z][a-z0-9-]*$/i.test(color)) return true

  const functionMatch = /^([a-z][a-z0-9-]*)\(([\w\s#.,%/+()-]+)\)$/i.exec(color)
  if (!functionMatch || !COLOR_FUNCTIONS.has(functionMatch[1].toLowerCase())) return false
  const nestedFunctions = [...functionMatch[2].matchAll(/\b([a-z][a-z0-9-]*)\s*\(/gi)]
  return nestedFunctions.every((match) => COLOR_FUNCTIONS.has(match[1].toLowerCase()))
}

/**
 * Resolves references between WordPress preset colors while rejecting unsafe or cyclic values.
 * @param {string} value Raw CSS value from a WordPress global-styles declaration.
 * @param {Map<string, string>} definitions Raw preset declarations.
 * @param {Set<string>} [resolving] Slugs already being followed.
 * @returns {string|null} A safe CSS color value, or null when it cannot be resolved.
 */
function resolveWordPressColorValue(value, definitions, resolving = new Set()) {
  let color = String(value || '').trim()
  if (!color) return null

  color = color.replace(WORDPRESS_COLOR_VARIABLE, (_match, slug, fallback = '') => {
    if (resolving.has(slug)) return ''
    const target = definitions.get(slug)
    if (target) {
      const resolved = resolveWordPressColorValue(target, definitions, new Set([...resolving, slug]))
      return resolved || ''
    }
    return isSafeCssColorValue(fallback) ? fallback.trim() : ''
  })
  if (/var\s*\(/i.test(color)) return null
  return isSafeCssColorValue(color) ? color : null
}

/**
 * Extracts the named WordPress preset colors from a rendered page or CSS fragment.
 * @param {string} [source] Full HTML, inline style tags, or CSS text.
 * @returns {Record<string, string>} Safe preset values keyed by WordPress palette slug.
 */
function extractWordPressColorPalette(source = '') {
  const definitions = new Map()
  for (const match of String(source).matchAll(WORDPRESS_COLOR_PROPERTY)) {
    definitions.set(match[1].toLowerCase(), match[2].trim())
  }

  return Object.fromEntries([...definitions.keys()]
    .sort((left, right) => left.localeCompare(right))
    .flatMap((slug) => {
      const value = resolveWordPressColorValue(definitions.get(slug), definitions, new Set([slug]))
      return value ? [[slug, value]] : []
    }))
}

/**
 * Extracts WordPress's per-block link colors from global-styles CSS and resolves preset variables.
 * @param {string} [source] Full rendered HTML or CSS text containing WordPress element rules.
 * @param {{colorPalette?: Record<string, string>}} [options] Palette already extracted from this source.
 * @returns {Record<string, string>} Safe link colors keyed by WordPress `wp-elements-*` class.
 */
function extractWordPressLinkColors(source = '', { colorPalette = extractWordPressColorPalette(source) } = {}) {
  const palette = new Map(Object.entries(colorPalette || {}).map(([slug, value]) => [slug.toLowerCase(), String(value)]))
  const definitions = new Map()
  for (const [slug, value] of palette) definitions.set(slug, value)

  const colors = new Map()
  for (const rule of String(source).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = rule[1].trim().split(',')
    const colorDeclaration = rule[2].match(/(?:^|;)\s*color\s*:\s*([^;!]+)(?:!important)?\s*(?=;|$)/i)
    if (!colorDeclaration) continue
    const color = resolveWordPressColorValue(colorDeclaration[1], definitions)
    if (!color) continue

    for (const selector of selectors) {
      if (!/\ba\b/i.test(selector)) continue
      for (const match of selector.matchAll(/\.wp-elements-([a-z0-9][a-z0-9-]*)\b/gi)) {
        colors.set(`wp-elements-${match[1]}`, color)
      }
    }
  }

  return Object.fromEntries([...colors].sort(([left], [right]) => left.localeCompare(right)))
}

module.exports = {
  extractWordPressColorPalette,
  extractWordPressLinkColors,
  isSafeCssColorValue,
}
