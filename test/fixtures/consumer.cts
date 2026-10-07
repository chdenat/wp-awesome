/******************************************************************************
 * This file is part of the wp-awesome package.
 *
 * File: test/fixtures/consumer.cts
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
 ******************************************************************************/

import wpAwesome = require('wp-awesome')
import content = require('wp-awesome/content')
import rest = require('wp-awesome/rest-client')
import records = require('wp-awesome/records')
import routes = require('wp-awesome/routes')
import styles = require('wp-awesome/styles')
import policies = require('wp-awesome/policies')
import eleventy = require('wp-awesome/eleventy')
import commerce = require('wp-awesome/integrations/woocommerce')
import yoast = require('wp-awesome/integrations/yoast')
import forms = require('wp-awesome/integrations/forms')

const resolver = routes.createWordPressRouteResolver({ siteUrl: 'https://beautiful.wp.site' })
const page: wpAwesome.WordPressContentRecord = records.normalizeWordPressRecord({ id: 1, slug: 'welcome' }, { type: 'page', routeResolver: resolver })
content.convertWordPressContent({ renderedHtml: page.content.html, mode: 'rendered' })
const client = rest.createWordPressRestClient({ baseUrl: 'https://beautiful.wp.site/wp-json/' })
commerce.createWooCommerceStoreApi({ restClient: client })
const fetchSitemapText = yoast.createRetryingFetchText({ retries: 2 })
fetchSitemapText(new URL('https://beautiful.wp.site/page-sitemap.xml'), { name: 'page' })
yoast.parseSitemapLocations('<urlset/>')
forms.collectFormReferences([page])
styles.isSafeCssColorValue('#123456')
policies.resolveWordPressContentPolicy({}, 'page')
eleventy.createWordPressEleventyPlugin({ loadData: () => ({ pages: [page] }) })
// @ts-expect-error Subpath declarations must not advertise another module's API.
content.createWordPressRestClient({ baseUrl: 'https://beautiful.wp.site/wp-json/' })
