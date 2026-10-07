/******************************************************************************
 * This file is part of the wp-awesome package.
 *
 * File: docs-site/src/assets/docs.mjs
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
 ******************************************************************************/

import '@awesome.me/webawesome/dist/styles/webawesome.css'
import '@awesome.me/webawesome/dist/styles/color/palettes/default.css'
import '@awesome.me/webawesome/dist/styles/themes/awesome.css'
import '@awesome.me/webawesome/dist/styles/color/variants.css'
import { setIconPath } from '@awesome.me/webawesome/dist/utilities/base-path.js'
import './docs.css'
import { enhanceCodeBlocks } from './code-tools.mjs'

const iconBase = document.documentElement.dataset.iconBase
if (iconBase) {
  const iconDirectory = new URL('svgs/', new URL(iconBase, document.baseURI))
  setIconPath(iconDirectory.href)
}

await import('@awesome.me/webawesome/dist/components/breadcrumb-item/breadcrumb-item.js')
await Promise.all([
  import('@awesome.me/webawesome/dist/components/breadcrumb/breadcrumb.js'),
  import('@awesome.me/webawesome/dist/components/button/button.js'),
  import('@awesome.me/webawesome/dist/components/callout/callout.js'),
  import('@awesome.me/webawesome/dist/components/card/card.js'),
  import('@awesome.me/webawesome/dist/components/checkbox/checkbox.js'),
  import('@awesome.me/webawesome/dist/components/icon/icon.js'),
  import('@awesome.me/webawesome/dist/components/input/input.js'),
  import('@awesome.me/webawesome/dist/components/option/option.js'),
  import('@awesome.me/webawesome/dist/components/page/page.js'),
  import('@awesome.me/webawesome/dist/components/select/select.js'),
  import('@awesome.me/webawesome/dist/components/tag/tag.js'),
])

enhanceCodeBlocks(document)

const themeToggle = document.querySelector('[data-theme-toggle]')
if (themeToggle) {
  const themeStorageKey = 'wp-awesome-color-scheme'
  const themeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const html = document.documentElement
  const getSavedTheme = () => {
    try {
      const savedTheme = window.localStorage.getItem(themeStorageKey)
      return savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : null
    } catch {
      return null
    }
  }
  const applyTheme = (theme) => {
    html.classList.toggle('wa-light', theme === 'light')
    html.classList.toggle('wa-dark', theme === 'dark')
    html.dataset.theme = theme
    const themeIcon = themeToggle.querySelector('[data-theme-icon]')
    themeIcon.name = theme === 'light' ? 'moon' : 'sun'
    themeIcon.label = `Switch to ${theme === 'light' ? 'dark' : 'light'} mode`
  }

  applyTheme(html.dataset.theme || (themeMediaQuery.matches ? 'dark' : 'light'))

  themeToggle.addEventListener('click', () => {
    const nextTheme = html.dataset.theme === 'dark' ? 'light' : 'dark'
    applyTheme(nextTheme)
    try {
      window.localStorage.setItem(themeStorageKey, nextTheme)
    } catch {
      // Theme switching still works if browser storage is unavailable.
    }
  })

  themeMediaQuery.addEventListener('change', (event) => {
    if (!getSavedTheme()) applyTheme(event.matches ? 'dark' : 'light')
  })
}

const assistant = document.querySelector('[data-setup-assistant]')
if (assistant) {
  import('./starter-ui.mjs').then(({ mountSetupAssistant }) => {
    mountSetupAssistant(assistant)
  }).catch(() => {
    document.querySelector('[data-assistant-loading]').textContent = 'The assistant could not load. Reload the page or use the complete example below.'
  })
}
