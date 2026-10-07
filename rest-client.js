/******************************************************************************
 * This file is part of the wp-awesome package.
 *
 * File: rest-client.js
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
 ******************************************************************************/

'use strict'

const DEFAULT_PER_PAGE = 100

/**
 * Uses a bounded server Retry-After value when available, otherwise the caller's backoff delay.
 * @param {Response|undefined} response Failed REST response, if one exists.
 * @param {number} fallback Caller-computed delay in milliseconds.
 * @returns {number} Delay clamped to the supported maximum.
 */
function retryDelay(response, fallback) {
  const retryAfter = response?.headers?.get?.('retry-after')
  if (!retryAfter) return fallback
  const seconds = Number(retryAfter)
  if (Number.isFinite(seconds)) return Math.max(0, Math.min(seconds * 1000, 30000))
  const dateDelay = Date.parse(retryAfter) - Date.now()
  return Number.isFinite(dateDelay) ? Math.max(0, Math.min(dateDelay, 30000)) : fallback
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

/** Converts object or URLSearchParams input while retaining repeated array query values. */
function toSearchParams(params) {
  const result = new URLSearchParams()
  if (params instanceof URLSearchParams) {
    for (const [key, value] of params) result.append(key, value)
    return result
  }
  for (const [key, value] of Object.entries(params || {})) {
    if (value === undefined || value === null) continue
    for (const item of Array.isArray(value) ? value : [value]) result.append(key, String(item))
  }
  return result
}

/** Replaces supplied query keys on a URL and leaves unrelated base query parameters intact. */
function appendQuery(url, params) {
  const query = toSearchParams(params)
  for (const key of new Set(query.keys())) url.searchParams.delete(key)
  for (const [key, value] of query) url.searchParams.append(key, value)
}

/** Creates an endpoint-aware error with the HTTP status used by retry and fallback decisions. */
function makeRestError(endpoint, response) {
  const error = new Error(`WordPress REST request failed for ${endpoint}: ${response.status} ${response.statusText}`.trim())
  error.status = response.status
  error.endpoint = endpoint
  return error
}

/**
 * Creates a configurable WordPress REST API client with safe pagination and retry behavior.
 * The configured base URL should be the REST root, such as `https://example.test/wp-json/`.
 * Authentication is supplied per request through `headers` or the asynchronous `getHeaders` callback.
 * @param {object} options Client configuration.
 * @param {string|URL} options.baseUrl WordPress REST API root.
 * @param {typeof fetch} [options.fetchImpl=globalThis.fetch] Fetch-compatible implementation.
 * @param {Record<string,string>|Headers} [options.headers] Static headers sent on each request.
 * @param {(request: {url: URL, endpoint: string, context: string}) => (Record<string,string>|Headers|Promise<Record<string,string>|Headers>)} [options.getHeaders] Dynamic header provider, commonly used for authentication.
 * @param {number} [options.perPage=100] Default page size; WordPress limits collection pages to 100.
 * @param {number} [options.retries=3] Number of retries for network, 429, and 5xx failures.
 * @param {number} [options.retryDelayMs=400] Base exponential retry delay.
 * @param {number} [options.timeoutMs=20000] Timeout for each HTTP request.
 * @param {(details: {endpoint: string, status: number}) => void} [options.onPublicFallback] Notification called before an edit-context public retry.
 * @returns {{getJson: Function, getCollection: Function}} REST methods returning JSON records.
 * @throws {TypeError} When the REST root, fetch implementation, or numeric limits are invalid.
 */
function createWordPressRestClient({
  baseUrl,
  fetchImpl = globalThis.fetch,
  headers = {},
  getHeaders,
  perPage = DEFAULT_PER_PAGE,
  retries = 3,
  retryDelayMs = 400,
  timeoutMs = 20000,
  onPublicFallback,
} = {}) {
  if (!baseUrl) throw new TypeError('A WordPress REST API baseUrl is required.')
  if (typeof fetchImpl !== 'function') throw new TypeError('A Fetch-compatible implementation is required.')
  if (!Number.isInteger(perPage) || perPage < 1 || perPage > DEFAULT_PER_PAGE) {
    throw new TypeError(`perPage must be an integer from 1 to ${DEFAULT_PER_PAGE}.`)
  }
  if (!Number.isInteger(retries) || retries < 0) throw new TypeError('retries must be a non-negative integer.')
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new TypeError('timeoutMs must be greater than zero.')

  const restRoot = new URL(String(baseUrl).endsWith('/') ? String(baseUrl) : `${baseUrl}/`)
  if (!['http:', 'https:'].includes(restRoot.protocol) || restRoot.username || restRoot.password) {
    throw new TypeError('baseUrl must be an HTTP(S) REST root without embedded credentials.')
  }

  /**
   * Resolves a relative REST endpoint and prevents requests from escaping the configured API root.
   * @param {string} endpoint Relative REST endpoint.
   * @param {object|URLSearchParams} [params] Query parameters appended to the endpoint.
   * @returns {URL} Request URL constrained to the configured origin and REST path prefix.
   * @throws {TypeError} When the endpoint is absolute or escapes the configured REST root.
   */
  function createUrl(endpoint, params) {
    if (typeof endpoint !== 'string' || !endpoint.trim() || /^[a-z][a-z\d+.-]*:/i.test(endpoint) || endpoint.startsWith('//')) {
      throw new TypeError('REST endpoints must be non-empty paths relative to the configured REST root.')
    }
    const url = new URL(endpoint.replace(/^\/+/, ''), restRoot)
    if (url.origin !== restRoot.origin || !url.pathname.startsWith(restRoot.pathname)) {
      throw new TypeError('REST endpoints must remain within the configured REST root.')
    }
    appendQuery(url, params)
    return url
  }

  /**
   * Requests JSON with bounded retries; client errors other than 429 fail immediately.
   * @param {string} endpoint REST path relative to the configured root.
   * @param {object} [options] Query, context, and abort signal.
   * @returns {Promise<{data: unknown, response: Response}>} Parsed response and headers.
   * @throws {Error} On permanent HTTP failures, timeout, network failure, or invalid JSON.
   */
  async function requestJson(endpoint, { params, context = 'view', signal } = {}) {
    const url = createUrl(endpoint, params)
    let lastError
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const requestHeaders = new Headers(headers)
        requestHeaders.set('Accept', 'application/json')
        if (typeof getHeaders === 'function') {
          const provided = await getHeaders({ url: new URL(url), endpoint, context })
          for (const [name, value] of new Headers(provided || {})) requestHeaders.set(name, value)
        }
        const isLoopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
        if (context === 'edit' && url.protocol !== 'https:' && !isLoopback) {
          throw new Error('Refusing an edit-context WordPress REST request over non-HTTPS transport.')
        }
        const response = await fetchImpl(url, {
          headers: requestHeaders,
          signal: signal || AbortSignal.timeout(timeoutMs),
        })
        if (!response.ok) {
          const error = makeRestError(endpoint, response)
          if (response.status !== 429 && response.status < 500) throw error
          lastError = error
          if (attempt < retries) await wait(retryDelay(response, retryDelayMs * 2 ** attempt))
          continue
        }
        return { data: await response.json(), response }
      } catch (error) {
        lastError = error
        if (error.status && error.status !== 429 && error.status < 500) throw error
        if (attempt >= retries) break
        await wait(retryDelayMs * 2 ** attempt)
      }
    }
    throw lastError
  }

  /**
   * Fetches one REST resource as JSON.
   * @param {string} endpoint REST path relative to the configured root.
   * @param {{params?: object|URLSearchParams, context?: 'view'|'edit', signal?: AbortSignal}} [options]
   * @returns {Promise<unknown>} Parsed JSON response.
   */
  async function getJson(endpoint, options = {}) {
    const { data } = await requestJson(endpoint, options)
    return data
  }

  /** Fetches and validates all collection pages while enforcing a caller-defined page ceiling. */
  async function fetchCollection(endpoint, options) {
    const {
      params = {},
      perPage: requestedPerPage = perPage,
      maxPages = 1000,
      signal,
    } = options
    const context = options.context || 'view'
    if (!Number.isInteger(requestedPerPage) || requestedPerPage < 1 || requestedPerPage > DEFAULT_PER_PAGE) {
      throw new TypeError(`perPage must be an integer from 1 to ${DEFAULT_PER_PAGE}.`)
    }
    if (!Number.isInteger(maxPages) || maxPages < 1) throw new TypeError('maxPages must be a positive integer.')
    const firstParams = toSearchParams(params)
    firstParams.set('per_page', String(requestedPerPage))
    firstParams.set('page', '1')
    if (options.context) firstParams.set('context', context)
    const first = await requestJson(endpoint, { params: firstParams, context, signal })
    if (!Array.isArray(first.data)) throw new TypeError(`WordPress collection endpoint ${endpoint} did not return an array.`)
    const totalPagesHeader = first.response.headers.get('x-wp-totalpages')
    const pageCount = totalPagesHeader == null ? 1 : Number(totalPagesHeader)
    if (!Number.isInteger(pageCount) || pageCount < 1) throw new TypeError(`Invalid X-WP-TotalPages value for ${endpoint}.`)
    if (pageCount > maxPages) throw new Error(`WordPress collection ${endpoint} exceeds the configured page limit (${maxPages}).`)
    const records = first.data.slice()
    for (let page = 2; page <= pageCount; page += 1) {
      const pageParams = new URLSearchParams(firstParams)
      pageParams.set('page', String(page))
      const result = await requestJson(endpoint, { params: pageParams, context, signal })
      if (!Array.isArray(result.data)) throw new TypeError(`WordPress collection endpoint ${endpoint} page ${page} did not return an array.`)
      records.push(...result.data)
    }
    return records
  }

  /**
   * Fetches every page of a collection, restarting publicly only after an authorized edit request is denied.
   * @param {string} endpoint Collection path relative to the configured REST root.
   * @param {{params?: object|URLSearchParams, context?: 'view'|'edit', perPage?: number, allowPublicFallback?: boolean, maxPages?: number, signal?: AbortSignal}} [options]
   * @returns {Promise<object[]>} Records in WordPress page order.
   * @throws {Error} On REST, timeout, parsing, or pagination failures.
   */
  async function getCollection(endpoint, options = {}) {
    try {
      return await fetchCollection(endpoint, options)
    } catch (error) {
      if (options.context !== 'edit' || !options.allowPublicFallback || ![401, 403].includes(error.status)) throw error
      if (typeof onPublicFallback === 'function') onPublicFallback({ endpoint, status: error.status })
      return fetchCollection(endpoint, { ...options, context: 'view', allowPublicFallback: false })
    }
  }

  return { getJson, getCollection }
}

module.exports = { createWordPressRestClient }
