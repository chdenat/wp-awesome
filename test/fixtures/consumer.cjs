/******************************************************************************
 * This file is part of the wp-awesome package.
 *
 * File: test/fixtures/consumer.cjs
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
 ******************************************************************************/

'use strict'

const assert = require('node:assert/strict')
const api = require('wp-awesome')

for (const subpath of ['content', 'rest-client', 'records', 'routes', 'styles', 'policies', 'eleventy']) {
  const entry = require(`wp-awesome/${subpath}`)
  for (const [name, implementation] of Object.entries(entry)) assert.equal(api[name], implementation)
}

const routeResolver = api.createWordPressRouteResolver({ siteUrl: 'https://beautiful.wp.site', routes: { page: '/{slug}/' } })
const page = api.normalizeWordPressRecord({
  id: 1, type: 'page', slug: 'welcome', status: 'publish',
  title: { rendered: 'Welcome' },
  content: { rendered: '<p>Hello <strong>WordPress</strong>.</p><script>alert(1)</script>' },
}, { type: 'page', routeResolver, contentPolicy: { mode: 'rendered' } })
assert.equal(page.route.path, '/welcome/')
assert.equal(page.route.outputPath, 'welcome/index.html')
assert.doesNotMatch(page.content.html, /script|alert/)
api.assertNoWordPressRouteCollisions([page])

const { createWooCommerceStoreApi } = require('wp-awesome/integrations/woocommerce')
assert.equal(typeof createWooCommerceStoreApi({ restClient: { getCollection: async () => [] } }).listProducts, 'function')
const { createRetryingFetchText, parseSitemapLocations } = require('wp-awesome/integrations/yoast')
assert.equal(typeof createRetryingFetchText, 'function')
assert.deepEqual(parseSitemapLocations('<urlset><url><loc>https://beautiful.wp.site/welcome/</loc></url></urlset>'), ['https://beautiful.wp.site/welcome/'])
const { collectFormReferences } = require('wp-awesome/integrations/forms')
assert.deepEqual(collectFormReferences([]), [])
