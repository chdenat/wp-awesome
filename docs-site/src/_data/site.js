/******************************************************************************
 * This file is part of the wp-awesome package.
 *
 * File: docs-site/src/_data/site.js
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
 ******************************************************************************/

'use strict'

module.exports = {
  name: 'wp-awesome',
  repository: 'https://github.com/chdenat/wp-awesome',
  npm: 'https://www.npmjs.com/package/wp-awesome',
  version: require('../../../package.json').version,
  eleventyVersion: require('../../../package.json').devDependencies['@11ty/eleventy'],
  webAwesomeVersion: require('../../../package.json').devDependencies['@awesome.me/webawesome'],
  fontAwesomeVersion: require('../../../package.json').devDependencies['@fortawesome/fontawesome-free'],
  supportedBlockNames: require('../../../supported-blocks'),
  navigation: [
    {
      title: 'Start here',
      items: [
        { title: 'Overview', href: '/' },
        { title: 'Setup assistant', href: '/setup-assistant/' },
        { title: 'Local, staging, and production', href: '/publishing-and-hosting/' },
        { title: 'Quick guide', href: '/quick-guide/' },
        { title: 'Package installation', href: '/install-and-configure/' },
        { title: 'Install the WordPress plugin', href: '/wp-awesome/' },
      ],
    },
    {
      title: 'Build your site',
      items: [
        { title: 'Fetch and normalize', href: '/fetch-and-normalize/' },
        { title: 'Gutenberg content', href: '/gutenberg-content/' },
        { title: 'Routes and templates', href: '/routes-and-templates/' },
        { title: 'Optional integrations', href: '/integrations/' },
      ],
    },
    {
      title: 'Reference',
      items: [
        { title: 'Complete example', href: '/complete-example/' },
        { title: 'Offline demo', href: '/offline-demo/' },
        { title: 'Package installation and releases', href: '/package-releases/' },
        { title: 'API reference', href: '/api-reference/' },
        { title: 'Under the hood and limits', href: '/under-the-hood/' },
        { title: 'Publishing and hosting', href: '/publishing-and-hosting/' },
        { title: 'Security and troubleshooting', href: '/security-and-troubleshooting/' },
      ],
    },
  ],
}
