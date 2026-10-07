/******************************************************************************
 * This file is part of the wp-awesome package.
 *
 * File: routes.js
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
 ******************************************************************************/

'use strict'

/** Reads a dot-delimited property path without throwing on missing intermediate values. */
function getValue(record, expression) {
  return expression.split('.').reduce((value, key) => value == null ? undefined : value[key], record)
}

/**
 * Expands `{field}` and `:field` placeholders and URL-encodes each resolved value.
 * @param {string} template Route template.
 * @param {object} record Source record providing each referenced field.
 * @returns {string} Expanded route path.
 * @throws {Error} When a referenced field is missing.
 */
function expandRouteTemplate(template, record) {
  return template.replace(/\{([\w.]+)\}|:([\w]+)/g, (_match, braced, colon) => {
    const value = getValue(record, braced || colon)
    if (value === undefined || value === null) throw new Error(`Route template references missing field: ${braced || colon}`)
    return encodeURIComponent(String(value))
  })
}

/**
 * Normalizes a public route and rejects query strings, fragments, and traversal segments.
 * @param {string} value Absolute or relative route value.
 * @returns {{path: string, routeUrl: URL|null}} Trailing-slash path and optional absolute URL.
 * @throws {TypeError} When the route is empty, malformed, or unsafe.
 */
function normalizeRoutePath(value) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError('A WordPress route must resolve to a non-empty path.')
  const input = value.trim()
  const routeUrl = /^[a-z][a-z\d+.-]*:/i.test(input) ? new URL(input) : null
  const path = routeUrl ? routeUrl.pathname : input
  if ((routeUrl && (routeUrl.search || routeUrl.hash)) || /[?#]/.test(path)) {
    throw new TypeError(`Route paths cannot contain a query or fragment: ${value}`)
  }
  const withLeadingSlash = path.startsWith('/') ? path : `/${path}`
  // Enforce the package's trailing-slash route contract before deriving output and canonical URLs.
  const normalized = withLeadingSlash.replace(/\/{2,}/g, '/').replace(/\/{0,1}$/, '/')
  for (const segment of normalized.split('/')) {
    let decoded
    try {
      decoded = decodeURIComponent(segment)
    } catch {
      throw new TypeError(`Route paths must contain valid URL encoding: ${value}`)
    }
    if (decoded === '..' || decoded === '.' || /[\\/]/.test(decoded)) {
      throw new TypeError(`Route paths cannot traverse directories: ${value}`)
    }
  }
  return { path: normalized, routeUrl }
}

/**
 * Converts a public route into Eleventy's file path using trailing-slash URLs.
 * @param {string} pathname Absolute or relative URL path.
 * @returns {string} Output file path such as `articles/example/index.html`.
 */
function toOutputPath(pathname) {
  const { path } = normalizeRoutePath(pathname)
  return path === '/' ? 'index.html' : `${path.replace(/^\/+|\/+$/g, '')}/index.html`
}

/**
 * Resolves a WordPress record into a stable public path, output file, and canonical URL.
 * Route rules may be strings using `{slug}` or `:slug` placeholders, or callbacks returning a path.
 * @param {object} record WordPress record with an ID and normally a type, slug, or permalink.
 * @param {object} [options] Route configuration.
 * @param {string|URL} [options.siteUrl] Public site origin used for canonical URLs.
 * @param {string|((record: object) => string|{path: string, canonicalUrl?: string})} [options.route] Rule for this record.
 * @param {Record<string,string|Function>} [options.routes] Rules keyed by content type, with an optional `default`.
 * @param {(pathname: string) => string} [options.outputPath] Output path resolver.
 * @returns {{path: string, outputPath: string, canonicalUrl: string}}
 * @throws {TypeError|Error} If the selected route is invalid or a configured field is missing.
 */
function resolveWordPressRoute(record, { siteUrl, route, routes = {}, outputPath = toOutputPath } = {}) {
  if (!record || typeof record !== 'object') throw new TypeError('A WordPress record is required to resolve a route.')
  if (siteUrl) {
    const publicOrigin = new URL(siteUrl)
    if (!['http:', 'https:'].includes(publicOrigin.protocol) || publicOrigin.username || publicOrigin.password) {
      throw new TypeError('siteUrl must be an HTTP(S) URL without embedded credentials.')
    }
  }
  const type = record.type || record.kind || record.taxonomy || 'default'
  const configuredRule = route ?? routes[type] ?? routes.default
  let routeValue = configuredRule
  if (typeof routeValue === 'function') routeValue = routeValue(record)
  else if (typeof routeValue === 'string') routeValue = expandRouteTemplate(routeValue, record)
  const canonicalOverride = routeValue && typeof routeValue === 'object' ? routeValue.canonicalUrl : null
  if (routeValue && typeof routeValue === 'object') routeValue = routeValue.path
  if (routeValue == null) routeValue = record.link || record.permalink || record.url || record.sourceUrl || record.path || (record.slug ? `/${record.slug}/` : null)

  const { path, routeUrl } = normalizeRoutePath(routeValue)
  const canonicalBase = siteUrl || routeUrl?.origin || record.link || record.permalink || record.url || record.sourceUrl
  const canonicalUrl = canonicalOverride || (canonicalBase ? new URL(path, String(canonicalBase).endsWith('/') ? canonicalBase : `${canonicalBase}/`).href : path)
  return { path, outputPath: outputPath(path), canonicalUrl }
}

/**
 * Creates a reusable route resolver for a site's public origin and per-type route rules.
 * @param {object} [options] Resolver configuration accepted by `resolveWordPressRoute`.
 * @returns {(record: object, overrides?: object) => {path: string, outputPath: string, canonicalUrl: string}}
 */
function createWordPressRouteResolver(options = {}) {
  return (record, overrides = {}) => resolveWordPressRoute(record, { ...options, ...overrides })
}

/**
 * Fails when two WordPress records would write to the same Eleventy output file.
 * @param {object[]} records Records with `outputPath` or a nested `route.outputPath`.
 * @returns {void}
 * @throws {Error} When any output path is claimed more than once.
 */
function assertNoWordPressRouteCollisions(records) {
  const outputPaths = new Map()
  for (const record of records) {
    const output = record.route?.outputPath || record.outputPath || (record.path && toOutputPath(record.path))
    if (!output) continue
    const previous = outputPaths.get(output)
    if (previous) {
      const describe = (item) => `${item.type || item.kind || 'record'} ${item.id ?? item.slug ?? '(unknown)'}`
      throw new Error(`WordPress output route collision at ${output}: ${describe(previous)} and ${describe(record)}`)
    }
    outputPaths.set(output, record)
  }
}

module.exports = {
  assertNoWordPressRouteCollisions,
  createWordPressRouteResolver,
  resolveWordPressRoute,
  toOutputPath,
}
