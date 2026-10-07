/******************************************************************************
 * This file is part of the wp-awesome package.
 *
 * File: sanitize.js
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
 ******************************************************************************/

'use strict'

const sanitizeHtml = require('sanitize-html')

const SAFE_TAGS = [
  ...sanitizeHtml.defaults.allowedTags,
  'img', 'picture', 'source', 'video', 'audio', 'track', 'del', 'ins',
]

const NON_TEXT_TAGS = [
  'script', 'style', 'textarea', 'option', 'xmp', 'noscript', 'noembed', 'noframes',
  'iframe', 'object', 'embed', 'svg', 'math', 'template',
]

const SAFE_COLOR_PATTERN = '(?:#(?:[\\da-f]{3}|[\\da-f]{4}|[\\da-f]{6}|[\\da-f]{8})|transparent|currentcolor|black|silver|gray|white|maroon|red|purple|fuchsia|green|lime|olive|yellow|navy|blue|teal|aqua|orange|rebeccapurple|(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color|color-mix)\\([\\w\\s#.,%/+()-]+\\))'
const SAFE_COLOR = new RegExp(`^(?!.*(?:url|expression))(?:${SAFE_COLOR_PATTERN}|var\\(--wp--preset--color--[a-z\\d-]+\\))$`, 'i')
const SAFE_COLOR_FUNCTION = SAFE_COLOR
const SAFE_LENGTH_TOKEN = '(?:0|-?(?:\\d+(?:\\.\\d+)?|\\.\\d+)(?:px|rem|em|ch|ex|vw|vh|vmin|vmax|%|pt|pc|cm|mm|in))'
const SAFE_SPACING_VAR = 'var\\(\\s*--(?:wp--preset--spacing--[a-z\\d-]+|wp--style--block-gap)(?:\\s*,\\s*(?:0|-?\\d+(?:\\.\\d+)?(?:px|rem|em|%)))?\\s*\\)'
const SAFE_LENGTH = new RegExp(`^(?!.*(?:url|expression))(?:${SAFE_LENGTH_TOKEN}|auto|none|min-content|max-content|fit-content|stretch|${SAFE_SPACING_VAR}|(?:${SAFE_LENGTH_TOKEN}|${SAFE_SPACING_VAR})(?:\\s+(?:${SAFE_LENGTH_TOKEN}|${SAFE_SPACING_VAR})){0,3}|calc\\([0-9a-z.%+*/()\\s-]+\\))$`, 'i')
const SAFE_GRADIENT = /^(?!.*(?:url|expression))(?:none|(?:repeating-)?(?:linear|radial|conic)-gradient\([\w\s#.,%/+()-]+\))$/i
const SAFE_FONT_FAMILY_PATTERN = '(?:serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-sans-serif|ui-serif|ui-monospace|arial|helvetica|georgia|verdana|tahoma|trebuchet\\s+ms|times\\s+new\\s+roman|courier\\s+new|montserrat)'
const SAFE_FONT_FAMILY = new RegExp(`^(?:${SAFE_FONT_FAMILY_PATTERN}|var\\(--wp--preset--font-family--[a-z\\d-]+\\))$`, 'i')

const SAFE_STYLES = {
  '*': {
    color: [SAFE_COLOR],
    'background-color': [SAFE_COLOR],
    'border-color': [SAFE_COLOR],
    'border-top-color': [SAFE_COLOR],
    'border-right-color': [SAFE_COLOR],
    'border-bottom-color': [SAFE_COLOR],
    'border-left-color': [SAFE_COLOR],
    'outline-color': [SAFE_COLOR],
    'text-decoration-color': [SAFE_COLOR],
    'font-family': [SAFE_FONT_FAMILY],
    'font-size': [SAFE_LENGTH, /^(?:xx-small|x-small|small|medium|large|x-large|xx-large|smaller|larger)$/i, /^(?!.*(?:url|expression))(?:clamp|min|max)\([\w\s.,%()+-]+\)$/i],
    'font-style': [/^(?:normal|italic|oblique)$/i],
    'font-weight': [/^(?:normal|bold|bolder|lighter|[1-9]00)$/i],
    'line-height': [SAFE_LENGTH, /^(?:normal|[\d.]+)$/i],
    'letter-spacing': [SAFE_LENGTH],
    'word-spacing': [SAFE_LENGTH],
    'text-align': [/^(?:start|end|left|right|center|justify|match-parent)$/i],
    'text-align-last': [/^(?:auto|start|end|left|right|center|justify)$/i],
    'text-decoration': [/^(?:(?:none|underline|overline|line-through|solid|double|dotted|dashed|wavy|from-font|auto|skip-ink)\s*)+$/i],
    'text-transform': [/^(?:none|capitalize|uppercase|lowercase|full-width|full-size-kana)$/i],
    'white-space': [/^(?:normal|nowrap|pre|pre-wrap|pre-line|break-spaces)$/i],
    'word-break': [/^(?:normal|break-all|keep-all|break-word)$/i],
    'overflow-wrap': [/^(?:normal|break-word|anywhere)$/i],
    'background-image': [SAFE_GRADIENT],
    background: [SAFE_COLOR, SAFE_GRADIENT],
    'border-style': [/^(?:none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset)$/i],
    'border-top-style': [/^(?:none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset)$/i],
    'border-right-style': [/^(?:none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset)$/i],
    'border-bottom-style': [/^(?:none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset)$/i],
    'border-left-style': [/^(?:none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset)$/i],
    'border-width': [SAFE_LENGTH],
    'border-top-width': [SAFE_LENGTH],
    'border-right-width': [SAFE_LENGTH],
    'border-bottom-width': [SAFE_LENGTH],
    'border-left-width': [SAFE_LENGTH],
    'border-radius': [SAFE_LENGTH],
    'border-top-left-radius': [SAFE_LENGTH],
    'border-top-right-radius': [SAFE_LENGTH],
    'border-bottom-left-radius': [SAFE_LENGTH],
    'border-bottom-right-radius': [SAFE_LENGTH],
    margin: [SAFE_LENGTH],
    'margin-top': [SAFE_LENGTH],
    'margin-right': [SAFE_LENGTH],
    'margin-bottom': [SAFE_LENGTH],
    'margin-left': [SAFE_LENGTH],
    'margin-inline': [SAFE_LENGTH],
    'margin-inline-start': [SAFE_LENGTH],
    'margin-inline-end': [SAFE_LENGTH],
    'margin-block': [SAFE_LENGTH],
    'margin-block-start': [SAFE_LENGTH],
    'margin-block-end': [SAFE_LENGTH],
    padding: [SAFE_LENGTH],
    'padding-top': [SAFE_LENGTH],
    'padding-right': [SAFE_LENGTH],
    'padding-bottom': [SAFE_LENGTH],
    'padding-left': [SAFE_LENGTH],
    'padding-inline': [SAFE_LENGTH],
    'padding-inline-start': [SAFE_LENGTH],
    'padding-inline-end': [SAFE_LENGTH],
    'padding-block': [SAFE_LENGTH],
    'padding-block-start': [SAFE_LENGTH],
    'padding-block-end': [SAFE_LENGTH],
    width: [SAFE_LENGTH],
    'min-width': [SAFE_LENGTH],
    'max-width': [SAFE_LENGTH],
    height: [SAFE_LENGTH],
    'min-height': [SAFE_LENGTH],
    'max-height': [SAFE_LENGTH],
    'inline-size': [SAFE_LENGTH],
    'min-inline-size': [SAFE_LENGTH],
    'max-inline-size': [SAFE_LENGTH],
    'block-size': [SAFE_LENGTH],
    'min-block-size': [SAFE_LENGTH],
    'max-block-size': [SAFE_LENGTH],
    gap: [SAFE_LENGTH],
    'row-gap': [SAFE_LENGTH],
    'column-gap': [SAFE_LENGTH],
    'flex-basis': [SAFE_LENGTH],
    'object-fit': [/^(?:fill|contain|cover|none|scale-down)$/i],
    'aspect-ratio': [/^(?:auto|(?:auto\s+)?(?:\d+(?:\.\d+)?|\.\d+)(?:\s*\/\s*(?:\d+(?:\.\d+)?|\.\d+))?)$/i],
    'object-position': [/^(?:left|right|top|bottom|center|[\d.%]+)(?:\s+(?:left|right|top|bottom|center|[\d.%]+)){0,3}$/i],
    display: [/^(?:block|inline|inline-block|flex|inline-flex|grid|inline-grid|flow-root|table|table-row|table-cell|none)$/i],
    'flex-direction': [/^(?:row|row-reverse|column|column-reverse)$/i],
    'flex-wrap': [/^(?:nowrap|wrap|wrap-reverse)$/i],
    'align-items': [/^(?:normal|stretch|center|start|end|flex-start|flex-end|baseline)$/i],
    'align-content': [/^(?:normal|start|end|center|stretch|space-between|space-around|space-evenly|flex-start|flex-end)$/i],
    'justify-content': [/^(?:normal|start|end|center|stretch|space-between|space-around|space-evenly|flex-start|flex-end)$/i],
    'vertical-align': [/^(?:baseline|sub|super|top|text-top|middle|bottom|text-bottom)$/i, SAFE_LENGTH],
    opacity: [/^(?:0|1|0?\.\d+)$/],
    'list-style-type': [/^(?:none|disc|circle|square|decimal|decimal-leading-zero|lower-roman|upper-roman|lower-alpha|upper-alpha)$/i],
    '--wp--style--root--padding-left': [SAFE_LENGTH],
    '--wp--style--root--padding-right': [SAFE_LENGTH],
    '--wp--custom--gap--horizontal': [SAFE_LENGTH],
    '--wp--style--block-gap': [SAFE_LENGTH],
  },
}

/** Escapes one trusted string before it is inserted into a validation expression. */
function escapeRegularExpression(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Validates the consumer-owned CSS variables and fonts allowed by the sanitizer. */
function validatedStyleOptions(values, { label, pattern, normalize = (value) => value } = {}) {
  if (!Array.isArray(values)) throw new TypeError(`${label} must be an array.`)
  return [...new Set(values.map((value) => {
    if (typeof value !== 'string' || !pattern.test(value)) throw new TypeError(`Unsafe ${label} value: ${String(value)}`)
    return normalize(value)
  }))]
}

/** Builds an isolated CSS property allowlist for the consumer's approved design tokens. */
function createAllowedStyles(allowedCssVariables, additionalFontFamilies, allowedBackgroundImagePrefixes) {
  const cssVariables = allowedCssVariables.map(escapeRegularExpression)
  const customVariableNames = cssVariables.length ? `|${cssVariables.join('|')}` : ''
  const colorVariables = `(?:--wp--preset--color--[a-z\\d-]+${customVariableNames})`
  const spacingVariables = `(?:--wp--preset--spacing--[a-z\\d-]+|--wp--style--block-gap${customVariableNames})`
  const fontVariables = `(?:--wp--preset--font-family--[a-z\\d-]+${customVariableNames})`
  const safeColor = new RegExp(`^(?!.*(?:url|expression))(?:${SAFE_COLOR_PATTERN}|var\\(\\s*${colorVariables}\\s*\\))$`, 'i')
  const safeSpacingVariable = `var\\(\\s*${spacingVariables}(?:\\s*,\\s*(?:0|-?\\d+(?:\\.\\d+)?(?:px|rem|em|%)))?\\s*\\)`
  const safeLength = new RegExp(`^(?!.*(?:url|expression))(?:${SAFE_LENGTH_TOKEN}|auto|none|min-content|max-content|fit-content|stretch|${safeSpacingVariable}|(?:${SAFE_LENGTH_TOKEN}|${safeSpacingVariable})(?:\\s+(?:${SAFE_LENGTH_TOKEN}|${safeSpacingVariable})){0,3}|calc\\([0-9a-z.%+*/()\\s-]+\\))$`, 'i')
  const customFamilies = additionalFontFamilies.map((family) => family.trim().split(/\s+/).map(escapeRegularExpression).join('\\s+'))
  const fontFamilyPattern = [SAFE_FONT_FAMILY_PATTERN, ...customFamilies].filter(Boolean).join('|')
  const safeFontFamily = new RegExp(`^(?:${fontFamilyPattern}|var\\(\\s*${fontVariables}\\s*\\))$`, 'i')
  const uploadBackgroundImages = allowedBackgroundImagePrefixes.map((prefix) => {
    const escapedPrefix = escapeRegularExpression(prefix.replace(/\/+$/, ''))
    return new RegExp(`^url\\(\\s*["']?${escapedPrefix}/[a-z\\d._~%/+&=-]+\\.(?:avif|gif|jpe?g|png|webp)(?:\\?[a-z\\d._~%+&=-]+)?["']?\\s*\\)$`, 'i')
  })
  const replacements = new Map([
    [SAFE_COLOR, safeColor],
    [SAFE_COLOR_FUNCTION, safeColor],
    [SAFE_LENGTH, safeLength],
    [SAFE_FONT_FAMILY, safeFontFamily],
  ])

  return Object.fromEntries(Object.entries(SAFE_STYLES).map(([tag, properties]) => [
    tag,
    Object.fromEntries(Object.entries(properties).map(([property, validators]) => {
      const mapped = validators.map((validator) => replacements.get(validator) || validator)
      if (property === 'background-image') mapped.push(...uploadBackgroundImages)
      return [property, mapped]
    })),
  ]))
}

const SAFE_ATTRIBUTES = {
  '*': ['class', 'id', 'title', 'role', 'dir', 'lang', /^aria-[a-z\d-]+$/i, 'style'],
  a: [
    'href', 'name', { name: 'target', values: ['_blank', '_self', '_parent', '_top'] }, 'rel',
  ],
  abbr: ['title'],
  blockquote: ['cite'],
  q: ['cite'],
  del: ['cite', 'datetime'],
  ins: ['cite', 'datetime'],
  img: ['src', 'srcset', 'sizes', 'alt', 'width', 'height', 'loading', 'decoding'],
  source: ['src', 'srcset', 'sizes', 'type', 'media'],
  video: ['src', 'poster', 'width', 'height', 'controls', 'loop', 'muted', 'playsinline', 'preload'],
  audio: ['src', 'controls', 'loop', 'muted', 'preload'],
  track: ['src', 'kind', 'srclang', 'label', 'default'],
  ol: ['start', 'reversed', 'type'],
  li: ['value'],
  col: ['span'],
  colgroup: ['span'],
  td: ['colspan', 'rowspan', 'headers', 'scope'],
  th: ['colspan', 'rowspan', 'headers', 'scope', 'abbr'],
  time: ['datetime'],
}

const SAFE_SCHEMES = ['http', 'https', 'mailto', 'tel']
const SAFE_SCHEME_ATTRIBUTES = ['href', 'src', 'cite', 'poster']
/**
 * Sanitizes WordPress or custom-renderer HTML with a restrictive tag, attribute, URL, and CSS allowlist.
 * Extra tags and attributes must be explicitly selected by trusted consumer code.
 * @param {string} value Candidate HTML fragment.
 * @param {{additionalTags?: string[], additionalAttributes?: Record<string, string[]>, allowedCssVariables?: string[], additionalFontFamilies?: string[], allowedBackgroundImagePrefixes?: string[]}} [options]
 * @returns {string} HTML safe to emit as markup under the default allowlist.
 */
function sanitizeWordPressHtml(value = '', {
  additionalTags = [],
  additionalAttributes = {},
  allowedCssVariables = [],
  additionalFontFamilies = [],
  allowedBackgroundImagePrefixes = [],
} = {}) {
  const cssVariables = validatedStyleOptions(allowedCssVariables, {
    label: 'allowedCssVariables',
    pattern: /^--[a-z][a-z\d-]{0,79}$/i,
  })
  const fontFamilies = validatedStyleOptions(additionalFontFamilies, {
    label: 'additionalFontFamilies',
    pattern: /^[a-z][a-z\d -]{0,79}$/i,
    normalize: (family) => family.trim().replace(/\s+/g, ' '),
  })
  const backgroundImagePrefixes = validatedStyleOptions(allowedBackgroundImagePrefixes, {
    label: 'allowedBackgroundImagePrefixes',
    pattern: /^https?:\/\/[^\s"'<>]+$/i,
    normalize: (prefix) => {
      let url
      try {
        url = new URL(prefix)
      } catch {
        throw new TypeError(`Unsafe allowedBackgroundImagePrefixes value: ${prefix}`)
      }
      const pathname = url.pathname.replace(/\/+$/, '')
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || !/\/wp-content\/uploads$/i.test(pathname)) {
        throw new TypeError(`Unsafe allowedBackgroundImagePrefixes value: ${prefix}`)
      }
      return `${url.origin}${pathname}`
    },
  })
  const allowedTags = new Set(SAFE_TAGS)
  for (const tag of additionalTags) {
    if (typeof tag !== 'string' || !/^wa-[a-z\d]+(?:-[a-z\d]+)*$/i.test(tag)) {
      throw new TypeError(`Unsafe additional HTML tag: ${String(tag)}`)
    }
    allowedTags.add(tag.toLowerCase())
  }

  const allowedAttributes = Object.fromEntries(Object.entries(SAFE_ATTRIBUTES).map(([tag, attributes]) => [tag, [...attributes]]))
  for (const [tag, attributes] of Object.entries(additionalAttributes)) {
    if (tag !== '*' && !allowedTags.has(tag.toLowerCase())) {
      throw new TypeError(`Unsafe additional HTML attribute target: ${tag}`)
    }
    if (!Array.isArray(attributes)) throw new TypeError(`Additional HTML attributes for ${tag} must be an array.`)
    const permitted = attributes.map((attribute) => {
      if (typeof attribute !== 'string' || !/^[a-z][a-z\d-]*$/i.test(attribute) || /^on/i.test(attribute) || /^(?:action|formaction|srcdoc|style|xmlns)$/i.test(attribute)) {
        throw new TypeError(`Unsafe additional HTML attribute: ${String(attribute)}`)
      }
      return attribute.toLowerCase()
    })
    const target = tag.toLowerCase()
    allowedAttributes[target] = [...new Set([...(allowedAttributes[target] || []), ...permitted])]
  }

  return sanitizeHtml(String(value ?? ''), {
    allowedTags: [...allowedTags],
    allowedAttributes,
    allowedSchemes: SAFE_SCHEMES,
    allowedSchemesAppliedToAttributes: SAFE_SCHEME_ATTRIBUTES,
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
    nonTextTags: NON_TEXT_TAGS,
    allowedStyles: createAllowedStyles(cssVariables, fontFamilies, backgroundImagePrefixes),
    enforceHtmlBoundary: true,
    nestingLimit: 50,
    transformTags: Object.fromEntries(['a', 'wa-button'].map((tag) => [tag, (tagName, attribs) => {
        if (attribs.target === '_blank') {
          const existingRel = String(attribs.rel || '').split(/\s+/).filter((token) => /^[a-z-]+$/i.test(token))
          attribs.rel = [...new Set([...existingRel, 'noopener', 'noreferrer'])].join(' ')
        }
        return { tagName, attribs }
      }])),
  })
}

module.exports = { sanitizeWordPressHtml }
