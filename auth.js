/******************************************************************************
 * This file is part of the wp-awesome package.
 *
 * File: auth.js
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
 * Builds the Basic authorization value used by WordPress Application Passwords.
 * Credentials stay in the Node.js process; this helper never reads environment variables.
 * @param {string} username WordPress account name.
 * @param {string} applicationPassword WordPress Application Password, with or without display spaces.
 * @returns {string|null} An authorization header value, or `null` when both values are empty.
 * @throws {Error} When only one credential is supplied.
 */
function createApplicationPasswordAuthorization(username, applicationPassword) {
  if (!username && !applicationPassword) return null
  if (!username || !applicationPassword) {
    throw new Error('A WordPress username and application password must be provided together.')
  }
  const password = applicationPassword.replace(/\s+/g, '')
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
}

/**
 * Creates the request header object expected by a REST client's configurable header provider.
 * @param {string} username WordPress account name.
 * @param {string} applicationPassword WordPress Application Password.
 * @returns {{Authorization: string}|{}} Headers for an authenticated request.
 */
function createApplicationPasswordHeaders(username, applicationPassword) {
  const authorization = createApplicationPasswordAuthorization(username, applicationPassword)
  return authorization ? { Authorization: authorization } : {}
}

module.exports = {
  createApplicationPasswordAuthorization,
  createApplicationPasswordHeaders,
}
