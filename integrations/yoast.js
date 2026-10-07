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

module.exports = { createYoastSitemapIntegration, parseSitemapLocations }
