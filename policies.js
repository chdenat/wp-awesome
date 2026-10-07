/******************************************************************************
 * This file is part of the wp-awesome package.
 *
 * File: policies.js
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
 * Merges a default Gutenberg policy with the policy selected for a content type.
 * @param {object} policies Policy object with `default` and optional `types` entries.
 * @param {string} type REST content type or consumer-defined type name.
 * @returns {object} A fresh, resolved policy; per-type values take precedence.
 */
function resolveWordPressContentPolicy(policies = {}, type = 'default') {
  const defaults = policies.default || policies.defaults || (policies.types ? {} : policies)
  const byType = policies.types?.[type] || policies[type] || {}
  return { ...defaults, ...byType }
}

module.exports = { resolveWordPressContentPolicy }
