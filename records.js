/******************************************************************************
 * This file is part of the wp-awesome package.
 *
 * File: records.js
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
 ******************************************************************************/

'use strict'

const { decodeHTML } = require('entities')
const { convertWordPressContent } = require('./content')
const { resolveWordPressRoute } = require('./routes')
const { sanitizeWordPressHtml } = require('./sanitize')

/** Keeps only absolute HTTP(S) URLs in public fields that consumers commonly use in attributes. */
function safeHttpUrl(value) {
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value.trim())) return null
  try {
    const url = new URL(value.trim())
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

/**
 * Converts public HTML text fields into a compact text value for search and metadata.
 * @param {string} [value] HTML fragment.
 * @returns {string} Entity-decoded plain text with collapsed whitespace.
 */
function htmlToText(value = '') {
  return decodeHTML(String(value).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
}

/**
 * Copies only fields explicitly approved by the consuming site.
 * @param {object} record WordPress REST record containing `acf` or `meta` values.
 * @param {string[]} fieldNames Consumer-approved custom field keys.
 * @returns {Record<string, unknown>} A shallow map containing only allowlisted values.
 */
function selectCustomFields(record, fieldNames = []) {
  const source = record.acf && typeof record.acf === 'object' ? record.acf : record.meta || {}
  return Object.fromEntries(fieldNames.filter((name) => Object.hasOwn(source, name)).map((name) => [name, source[name]]))
}

/**
 * Normalizes a public WordPress user embedded in a standard REST post response.
 * Email addresses and login names are intentionally excluded from the public contract.
 * @param {object} record Embedded WordPress author object.
 * @param {{siteUrl?: string|URL, routeResolver?: Function, route?: string|Function, outputPath?: Function}} [options]
 * @returns {object|null} Public author contract or `null` when no author ID is available.
 */
function normalizeWordPressAuthor(record, { siteUrl, routeResolver, route, outputPath } = {}) {
  if (!record || record.id == null) return null
  const avatarUrls = record.avatar_urls && typeof record.avatar_urls === 'object'
    ? Object.fromEntries(Object.entries(record.avatar_urls).flatMap(([size, url]) => {
      const safeUrl = safeHttpUrl(url)
      return safeUrl ? [[size, safeUrl]] : []
    }))
    : {}
  const author = {
    id: record.id,
    type: 'author',
    slug: String(record.slug || record.id),
    name: String(record.name || record.slug || record.id),
    description: sanitizeWordPressHtml(String(record.description || '')),
    url: safeHttpUrl(record.url),
    avatarUrls,
    sourceUrl: safeHttpUrl(record.link),
  }
  const resolvedRoute = routeResolver
    ? routeResolver(author, route ? { route } : {})
    : resolveWordPressRoute(author, { siteUrl, route, outputPath })
  return { ...author, route: resolvedRoute, link: resolvedRoute.canonicalUrl, path: resolvedRoute.path, outputPath: resolvedRoute.outputPath }
}

/**
 * Collects distinct standard WordPress authors from embedded REST post authors.
 * This supports WordPress's single `author` relation and does not depend on co-author plugins.
 * @param {object[]} records WordPress records with `_embedded.author` or a normalized `author` object.
 * @param {{siteUrl?: string|URL, routeResolver?: Function, outputPath?: Function}} [options]
 * @returns {object[]} Authors deduplicated by WordPress user ID in first-seen order.
 */
function collectWordPressAuthors(records = [], options = {}) {
  const authors = new Map()
  for (const record of records) {
    const embedded = record?._embedded?.author
    const candidate = Array.isArray(embedded) ? embedded[0] : embedded
    const author = normalizeWordPressAuthor(candidate || record?.author, options)
    if (author && !authors.has(String(author.id))) authors.set(String(author.id), author)
  }
  return [...authors.values()]
}

/**
 * Normalizes a WordPress taxonomy term, including terms embedded under a custom taxonomy.
 * @param {object} record REST taxonomy record.
 * @param {{taxonomy?: string, siteUrl?: string|URL, routeResolver?: Function, route?: string|Function, outputPath?: Function}} [options]
 * @returns {object} Stable taxonomy contract with a computed route.
 */
function normalizeWordPressTaxonomy(record, { taxonomy, siteUrl, routeResolver, route, outputPath } = {}) {
  if (!record || record.id == null) throw new TypeError('A WordPress taxonomy record with an ID is required.')
  const normalized = {
    id: record.id,
    type: record.taxonomy || taxonomy || 'taxonomy',
    taxonomy: record.taxonomy || taxonomy || 'taxonomy',
    slug: String(record.slug || record.id),
    name: String(record.name || record.slug || record.id),
    description: sanitizeWordPressHtml(String(record.description || '')),
    count: Number(record.count ?? record.products ?? 0),
    parentId: record.parent ?? null,
    sourceUrl: safeHttpUrl(record.link),
  }
  const resolvedRoute = routeResolver
    ? routeResolver(normalized, route ? { route } : {})
    : resolveWordPressRoute(normalized, { siteUrl, route, outputPath })
  return { ...normalized, route: resolvedRoute, link: resolvedRoute.canonicalUrl, path: resolvedRoute.path, outputPath: resolvedRoute.outputPath }
}

/**
 * Converts a WordPress REST item into a renderer-neutral page, post, or custom-type contract.
 * Raw edit-context content is parsed for diagnostics but is never included in the returned object.
 * @param {object} record REST resource, normally requested with `_embed=1`.
 * @param {object} [options] Normalization and route policy.
 * @param {string} [options.type] Explicit type for endpoints that do not return a `type` field.
 * @param {object} [options.contentPolicy] Gutenberg conversion policy for this type.
 * @param {Function} [options.routeResolver] Site-provided route resolver.
 * @param {string[]} [options.customFields] Explicit allowlist of public custom field names.
 * @param {object} [options.sanitizerOptions] Trusted extensions to the default HTML allowlist.
 * @param {Function} [options.transformBlock] Consumer-owned transformation for reconstructed blocks.
 * @param {Function} [options.transformHtml] Consumer-owned transformation for selected content HTML.
 * @returns {object} Normalized record contract with public content diagnostics and no raw source body.
 */
function normalizeWordPressRecord(record, {
  type,
  contentPolicy = {},
  routeResolver,
  siteUrl,
  customFields = [],
  sanitizerOptions,
  transformHtml,
  transformBlock,
  outputPath,
} = {}) {
  if (!record || typeof record !== 'object' || record.id == null) throw new TypeError('A WordPress record with an ID is required.')
  const recordType = type || record.type || 'post'
  const routeRecord = { ...record, type: recordType }
  const route = routeResolver
    ? routeResolver(routeRecord)
    : resolveWordPressRoute(routeRecord, { siteUrl, outputPath })
  const titleHtml = sanitizeWordPressHtml(String(record.title?.rendered ?? record.name ?? ''))
  const excerptHtml = sanitizeWordPressHtml(String(record.excerpt?.rendered ?? record.short_description ?? ''))
  const renderedHtml = String(record.content?.rendered ?? record.description ?? '')
  const converted = convertWordPressContent({
    rawContent: record.content?.raw || '',
    renderedHtml,
    ...contentPolicy,
    transformBlock: transformBlock || contentPolicy.transformBlock,
    sanitizerOptions: sanitizerOptions || contentPolicy.sanitizerOptions,
    transformHtml,
  })
  const embeddedTerms = (record._embedded?.['wp:term'] || []).flatMap((group) => Array.isArray(group) ? group : [])
  const taxonomies = embeddedTerms.map((term) => normalizeWordPressTaxonomy(term, {
    taxonomy: term.taxonomy,
    siteUrl,
    routeResolver,
    outputPath,
  }))
  const embeddedAuthor = Array.isArray(record._embedded?.author) ? record._embedded.author[0] : record._embedded?.author
  const author = normalizeWordPressAuthor(embeddedAuthor || (typeof record.author === 'object' ? record.author : null), {
    siteUrl,
    routeResolver,
    outputPath,
  })
  const media = Array.isArray(record._embedded?.['wp:featuredmedia']) ? record._embedded['wp:featuredmedia'][0] : null
  const featuredMedia = media ? {
    id: media.id ?? null,
    url: safeHttpUrl(media.source_url),
    alt: media.alt_text || '',
    captionHtml: sanitizeWordPressHtml(String(media.caption?.rendered || '')),
  } : null

  return {
    id: record.id,
    type: recordType,
    slug: String(record.slug || ''),
    status: record.status || null,
    title: { html: titleHtml, text: htmlToText(titleHtml) },
    excerpt: { html: excerptHtml, text: htmlToText(excerptHtml) },
    content: {
      html: converted.html,
      source: converted.source,
      hasSerializedBlocks: converted.hasSerializedBlocks,
      blockTypes: converted.blockTypes,
      unsupportedBlockNames: converted.unsupportedBlockNames,
      fallbackReason: converted.fallbackReason,
    },
    dates: {
      published: record.date || record.date_created || null,
      modified: record.modified || record.date_modified || null,
    },
    author,
    taxonomies,
    featuredMedia,
    customFields: selectCustomFields(record, customFields),
    sourceUrl: safeHttpUrl(record.link || record.permalink),
    route,
  }
}

module.exports = {
  collectWordPressAuthors,
  normalizeWordPressAuthor,
  normalizeWordPressRecord,
  normalizeWordPressTaxonomy,
}
