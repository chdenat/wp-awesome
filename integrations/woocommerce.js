/******************************************************************************
 * This file is part of the wp-awesome package.
 *
 * File: integrations/woocommerce.js
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
 * Creates an optional WooCommerce Store API adapter using a configured WordPress REST client.
 * This module adds no WooCommerce dependency to the package core.
 * @param {object} options Adapter configuration.
 * @param {{getCollection: Function}} options.restClient WordPress REST client.
 * @param {string} [options.productsEndpoint='wc/store/v1/products'] Store API product collection path.
 * @param {string} [options.categoriesEndpoint='wc/store/v1/products/categories'] Store API category path.
 * @returns {{listProducts: Function, listCategories: Function}} Explicit Store API collection methods.
 */
function createWooCommerceStoreApi({
  restClient,
  productsEndpoint = 'wc/store/v1/products',
  categoriesEndpoint = 'wc/store/v1/products/categories',
} = {}) {
  if (!restClient || typeof restClient.getCollection !== 'function') {
    throw new TypeError('A WordPress REST client with getCollection() is required.')
  }
  return {
    /** @param {{params?: object, perPage?: number}} [options] Query options. @returns {Promise<object[]>} Store API products. */
    listProducts(options = {}) {
      return restClient.getCollection(productsEndpoint, { ...options, params: options.params || {} })
    },
    /** @param {{params?: object, perPage?: number}} [options] Query options. @returns {Promise<object[]>} Store API categories. */
    listCategories(options = {}) {
      return restClient.getCollection(categoriesEndpoint, { ...options, params: { hide_empty: true, ...options.params } })
    },
  }
}

module.exports = { createWooCommerceStoreApi }
