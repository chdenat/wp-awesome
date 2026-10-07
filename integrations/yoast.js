/******************************************************************************
 * This file is part of the wp-awesome package.
 *
 * File: integrations/yoast.js
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

/** Waits for a retry delay without blocking the event loop. */
const waitForRetry = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

/**
 * Parses a Retry-After header as delay seconds or an HTTP date.
 * @param {string|null} value Retry-After response header.
 * @param {number} now Current time in milliseconds since the Unix epoch.
 * @returns {number|null} Non-negative delay in milliseconds, or null for an invalid header.
 */
const parseRetryAfterDelay = (value, now) => {
  if (typeof value !== 'string' || !value.trim()) return null

  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000

  const retryAt = Date.parse(value)
  return Number.isFinite(retryAt) ? Math.max(0, retryAt - now) : null
}

/**
 * Calculates capped exponential backoff and honors a bounded server retry delay.
 * @param {{attempt:number,retryAfter:string|null,retryDelayMs:number,maxRetryDelayMs:number,maxRetryAfterMs:number,jitterRatio:number,nowImpl:()=>number,randomImpl:()=>number}} options Retry attempt, response header, delay limits, and injectable clock/random source.
 * @returns {number} Delay before the next attempt in milliseconds.
 */
const calculateRetryDelayMs = ({ attempt, retryAfter, retryDelayMs, maxRetryDelayMs, maxRetryAfterMs, jitterRatio, nowImpl, randomImpl }) => {
  const exponentialDelayMs = Math.min(maxRetryDelayMs, retryDelayMs * (2 ** attempt))
  // Jitter prevents parallel sitemap requests from retrying against the host in lockstep.
  const jitterMultiplier = 1 - jitterRatio + randomImpl() * 2 * jitterRatio
  const jitteredBackoffMs = Math.min(maxRetryDelayMs, Math.round(exponentialDelayMs * jitterMultiplier))
  const retryAfterMs = parseRetryAfterDelay(retryAfter, nowImpl()) ?? 0
  return Math.min(maxRetryAfterMs, Math.max(jitteredBackoffMs, retryAfterMs))
}

/**
 * Creates a text transport for Yoast sitemap documents with bounded retries.
 * Retryable responses are HTTP 429 and 5xx; permanent client errors fail immediately.
 * @param {object} [options] Retry policy and injectable transport, delay, clock, and random sources.
 * @param {typeof fetch} [options.fetchImpl=globalThis.fetch] Fetch-compatible implementation.
 * @param {number} [options.retries=3] Number of retries after the initial request.
 * @param {number} [options.retryDelayMs=400] Initial exponential-backoff delay.
 * @param {number} [options.maxRetryDelayMs=30000] Maximum exponential-backoff delay.
 * @param {number} [options.maxRetryAfterMs=30000] Maximum honored Retry-After delay.
 * @param {number} [options.timeoutMs=20000] Timeout for each HTTP request.
 * @param {number} [options.jitterRatio=0.2] Backoff jitter fraction from zero to half the calculated delay.
 * @param {(details: {url:URL,name:string,status:number|null,attempt:number,nextAttempt:number,retries:number,delayMs:number,error:Error}) => void} [options.onRetry] Called before waiting for another attempt.
 * @param {(milliseconds:number) => Promise<void>} [options.waitImpl=waitForRetry] Delay implementation.
 * @param {() => number} [options.nowImpl=Date.now] Clock used to parse HTTP-date Retry-After values.
 * @param {() => number} [options.randomImpl=Math.random] Random source used to spread retries.
 * @returns {(url: URL, details: {name: string}) => Promise<string>} Sitemap text fetch function for `createYoastSitemapIntegration()`.
 * @throws {TypeError} When the fetch implementation or retry limits are invalid.
 */
const createRetryingFetchText = ({
  fetchImpl = globalThis.fetch,
  retries = 3,
  retryDelayMs = 400,
  maxRetryDelayMs = 30000,
  maxRetryAfterMs = 30000,
  timeoutMs = 20000,
  jitterRatio = 0.2,
  onRetry,
  waitImpl = waitForRetry,
  nowImpl = Date.now,
  randomImpl = Math.random,
} = {}) => {
  if (typeof fetchImpl !== 'function') throw new TypeError('A Fetch-compatible implementation is required.')
  if (!Number.isInteger(retries) || retries < 0) throw new TypeError('retries must be a non-negative integer.')
  for (const [name, value] of Object.entries({ retryDelayMs, maxRetryDelayMs, maxRetryAfterMs })) {
    if (!Number.isFinite(value) || value < 0) throw new TypeError(`${name} must be a non-negative number.`)
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new TypeError('timeoutMs must be greater than zero.')
  if (!Number.isFinite(jitterRatio) || jitterRatio < 0 || jitterRatio > 0.5) {
    throw new TypeError('jitterRatio must be between 0 and 0.5.')
  }
  if (typeof waitImpl !== 'function' || typeof nowImpl !== 'function' || typeof randomImpl !== 'function') {
    throw new TypeError('waitImpl, nowImpl, and randomImpl must be functions.')
  }
  if (onRetry !== undefined && typeof onRetry !== 'function') throw new TypeError('onRetry must be a function.')

  return async (url, { name = 'configured' } = {}) => {
    const sitemapUrl = new URL(url)
    if (!['http:', 'https:'].includes(sitemapUrl.protocol) || sitemapUrl.username || sitemapUrl.password) {
      throw new TypeError('Sitemap URLs must use HTTP(S) and must not contain credentials.')
    }

    let lastError
    let retryAfter = null

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const response = await fetchImpl(sitemapUrl, {
          headers: { Accept: 'application/xml,text/xml' },
          signal: AbortSignal.timeout(timeoutMs),
        })
        if (response.ok) return await response.text()

        const error = new Error(`WordPress Yoast ${name} sitemap failed: ${response.status} ${response.statusText} (${sitemapUrl})`)
        error.status = response.status
        retryAfter = response.headers?.get?.('retry-after') ?? null
        error.retryAfter = retryAfter

        // Release failed response bodies before retrying so sockets return to the connection pool.
        try {
          await response.body?.cancel()
        } catch {
          // Keep the HTTP error when cleanup fails; the next attempt remains bounded.
        }

        if (response.status !== 429 && response.status < 500) throw error
        lastError = error
      } catch (error) {
        lastError = error
        if (error.status && error.status !== 429 && error.status < 500) throw error
        retryAfter = error.retryAfter ?? null
      }

      if (attempt === retries) break

      const delayMs = calculateRetryDelayMs({
        attempt,
        retryAfter,
        retryDelayMs,
        maxRetryDelayMs,
        maxRetryAfterMs,
        jitterRatio,
        nowImpl,
        randomImpl,
      })
      onRetry?.({
        url: new URL(sitemapUrl),
        name,
        status: lastError.status ?? null,
        attempt: attempt + 1,
        nextAttempt: attempt + 2,
        retries,
        delayMs,
        error: lastError,
      })
      await waitImpl(delayMs)
    }

    throw lastError
  }
}

/**
 * Extracts URL locations from a Yoast-compatible XML sitemap document.
 * @param {string} xml Sitemap XML response body.
 * @returns {string[]} Decoded absolute or relative locations in source order.
 * @throws {TypeError} When the input is not text or does not contain a URL set or sitemap index.
 */
function parseSitemapLocations(xml) {
  if (typeof xml !== 'string') throw new TypeError('Sitemap XML must be a string.')
  if (!/<(?:urlset|sitemapindex)\b/i.test(xml)) throw new TypeError('Sitemap XML must contain a urlset or sitemapindex root.')
  return [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)].map((match) => decodeHTML(match[1].trim())).filter(Boolean)
}

/**
 * Creates an optional sitemap integration whose transport and sitemap names remain consumer-configurable.
 * @param {object} options Integration configuration.
 * @param {string|URL} options.siteUrl WordPress public origin.
 * @param {string[]} options.sitemapNames Names without the `-sitemap.xml` suffix.
 * @param {(url: URL, details: {name: string}) => Promise<string>} options.fetchText Consumer-provided text transport, normally with its own retry policy.
 * @returns {{name: string, load: Function}} Optional integration adapter returning locations by sitemap name.
 */
function createYoastSitemapIntegration({ siteUrl, sitemapNames = [], fetchText } = {}) {
  if (!siteUrl) throw new TypeError('A WordPress siteUrl is required for the sitemap integration.')
  if (typeof fetchText !== 'function') throw new TypeError('A fetchText transport function is required.')
  if (!Array.isArray(sitemapNames) || sitemapNames.some((name) => !/^[a-z\d_-]+$/i.test(name))) {
    throw new TypeError('Sitemap names must be an array of letters, digits, underscores, or hyphens.')
  }
  const origin = new URL(siteUrl)
  if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password) {
    throw new TypeError('siteUrl must be an HTTP(S) URL without embedded credentials.')
  }
  return {
    name: 'yoast-sitemaps',
    /** Fetches all configured sitemap documents in parallel using the caller's transport. */
    async load() {
      const entries = await Promise.all(sitemapNames.map(async (name) => {
        const url = new URL(`${name}-sitemap.xml`, `${origin.href.replace(/\/$/, '')}/`)
        const xml = await fetchText(url, { name })
        return [name, parseSitemapLocations(xml)]
      }))
      return Object.fromEntries(entries)
    },
  }
}

module.exports = { createRetryingFetchText, createYoastSitemapIntegration, parseSitemapLocations }
