/******************************************************************************
 * This file is part of the wp-awesome package.
 *
 * File: eleventy.js
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
 ******************************************************************************/

'use strict'

/**
 * Creates an Eleventy plugin that registers an asynchronous WordPress global-data loader.
 * @param {object} options Plugin configuration.
 * @param {Function} options.loadData Async or synchronous data loader owned by the consuming site.
 * @param {string} [options.key='wordpress'] Eleventy global-data key.
 * @returns {(eleventyConfig: object) => void} Plugin function for `eleventyConfig.addPlugin`.
 * @throws {TypeError} If the loader or key is invalid.
 */
function createWordPressEleventyPlugin({ loadData, key = 'wordpress' } = {}) {
  if (typeof loadData !== 'function') throw new TypeError('An Eleventy data loader function is required.')
  if (typeof key !== 'string' || !key.trim()) throw new TypeError('The Eleventy global-data key must be a non-empty string.')
  return function wordpressGlobalDataPlugin(eleventyConfig) {
    if (!eleventyConfig || typeof eleventyConfig.addGlobalData !== 'function') {
      throw new TypeError('The Eleventy configuration must provide addGlobalData().')
    }
    eleventyConfig.addGlobalData(key, loadData)
  }
}

module.exports = { createWordPressEleventyPlugin }
