/******************************************************************************
 * This file is part of the wp-awesome package.
 *
 * File: test/fixtures/consumer.mjs
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
 ******************************************************************************/

import assert from 'node:assert/strict'
import wpAwesome from 'wp-awesome'
import content from 'wp-awesome/content'
import rest from 'wp-awesome/rest-client'
import records from 'wp-awesome/records'
import routes from 'wp-awesome/routes'
import styles from 'wp-awesome/styles'
import policies from 'wp-awesome/policies'
import eleventy from 'wp-awesome/eleventy'
import commerce from 'wp-awesome/integrations/woocommerce'
import yoast from 'wp-awesome/integrations/yoast'
import forms from 'wp-awesome/integrations/forms'

for (const entry of [content, rest, records, routes, styles, policies, eleventy]) {
  for (const [name, implementation] of Object.entries(entry)) assert.equal(wpAwesome[name], implementation)
}
assert.equal(typeof commerce.createWooCommerceStoreApi, 'function')
assert.equal(typeof yoast.createYoastSitemapIntegration, 'function')
assert.equal(typeof forms.collectFormReferences, 'function')
