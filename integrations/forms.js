/******************************************************************************
 * This file is part of the wp-awesome package.
 *
 * File: integrations/forms.js
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
 * Collects form references through caller-supplied plugin detectors.
 * The package core knows neither the form plugin nor the site's markup convention.
 * @param {object[]} records Content records containing `contentHtml` or `content.html`.
 * @param {{providers?: Array<{name: string, findForms: Function}>}} [options] Optional plugin-specific detectors.
 * @returns {Array<{provider: string, id: string|number, sources: Array<{recordId: string|number|null, path: string|null}>}>} Deduplicated form references with source routes.
 * @throws {TypeError} When a configured detector is invalid.
 */
function collectFormReferences(records = [], { providers = [] } = {}) {
  const forms = new Map()
  for (const provider of providers) {
    if (!provider || typeof provider.name !== 'string' || !provider.name || typeof provider.findForms !== 'function') {
      throw new TypeError('Each form provider must define a non-empty name and findForms() function.')
    }
    for (const record of records) {
      const html = String(record?.contentHtml ?? record?.content?.html ?? '')
      const detected = provider.findForms(html, record) || []
      for (const item of Array.isArray(detected) ? detected : [detected]) {
        const id = typeof item === 'object' && item !== null ? item.id : item
        if (id == null || id === '') continue
        const key = `${provider.name}:${String(id)}`
        const form = forms.get(key) || { provider: provider.name, id, sources: [] }
        if (!form.sources.some((source) => source.recordId === (record.id ?? null))) {
          form.sources.push({ recordId: record.id ?? null, path: record.path || null })
        }
        forms.set(key, form)
      }
    }
  }
  return [...forms.values()]
}

module.exports = { collectFormReferences }
