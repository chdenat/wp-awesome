/******************************************************************************
 * This file is part of the wp-awesome package.
 *
 * File: docs-site/src/assets/theme-init.js
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
 ******************************************************************************/

(() => {
  const themeStorageKey = 'wp-awesome-color-scheme'
  const html = document.documentElement
  let theme = null

  try {
    const savedTheme = window.localStorage.getItem(themeStorageKey)
    if (savedTheme === 'light' || savedTheme === 'dark') theme = savedTheme
  } catch {
    // Fall back to the operating system preference when storage is unavailable.
  }

  if (!theme) theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

  html.classList.toggle('wa-light', theme === 'light')
  html.classList.toggle('wa-dark', theme === 'dark')
  html.dataset.theme = theme
})()
