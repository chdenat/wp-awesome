/******************************************************************************
 * This file is part of the wp-awesome package.
 *
 * File: docs-site/src/_data/demo.js
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
 ******************************************************************************/

'use strict'

const { createWordPressRouteResolver, normalizeWordPressRecord } = require('../../..')

/** Fictitious public REST record used to demonstrate the package without a network request. */
const source = {
  id: 42,
  type: 'page',
  slug: 'sample-page',
  status: 'publish',
  title: { rendered: 'Example page' },
  excerpt: { rendered: '<p>A small offline example.</p>' },
  content: { rendered: '<p>This paragraph comes from a <strong>normalized WordPress record</strong>.</p>' },
  link: 'https://beautiful.wp.site/sample-page/',
}
/** Consumer-owned route policy; the documentation build never contacts this fictitious host. */
const routeResolver = createWordPressRouteResolver({ siteUrl: 'https://beautiful.wp.site', routes: { page: '/{slug}/' } })
/** Actual package output used by the Eleventy example template. */
const record = normalizeWordPressRecord(source, { type: 'page', routeResolver, contentPolicy: { mode: 'rendered' } })

module.exports = { source, record, sourceJson: JSON.stringify(source, null, 2), recordJson: JSON.stringify(record, null, 2) }
