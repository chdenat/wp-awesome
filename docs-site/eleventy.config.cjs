/******************************************************************************
 * This file is part of the wp-awesome package.
 *
 * File: docs-site/eleventy.config.cjs
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
 ******************************************************************************/

'use strict'

const syntaxHighlight = require('@11ty/eleventy-plugin-syntaxhighlight')
const { EleventyHtmlBasePlugin } = require('@11ty/eleventy')

/** Configures the package's static, network-independent documentation site. */
module.exports = (eleventyConfig) => {
  eleventyConfig.addPlugin(EleventyHtmlBasePlugin)
  eleventyConfig.setServerOptions({ port: 4177, portReassignmentRetryCount: 0 })
  eleventyConfig.addPlugin(syntaxHighlight, { errorOnInvalidLanguage: true })
  eleventyConfig.addPassthroughCopy({ 'docs-site/.vite/assets': 'assets' })
  eleventyConfig.addPassthroughCopy({ 'docs-site/src/diagrams': 'diagrams' })

  return {
    pathPrefix: process.env.WP_AWESOME_DOCS_PATH_PREFIX || '/',
    dir: {
      input: 'docs-site/src',
      includes: '_includes',
      output: 'docs-site/_site',
    },
    templateFormats: ['md', 'njk'],
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: false,
  }
}
