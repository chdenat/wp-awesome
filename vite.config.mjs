/******************************************************************************
 * This file is part of the wp-awesome package.
 *
 * File: vite.config.mjs
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
 ******************************************************************************/

/*
 * This file is part of the wp-awesome package.
 *
 * File: vite.config.mjs
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-04
 * Last modified: 2026-10-04
 *
 * Copyright © 2026 Christian Denat
 */

import { copyFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const packageRoot = fileURLToPath(new URL('.', import.meta.url))
const iconAssets = {
  brands: ['build-awesome', 'font-awesome', 'github', 'npm', 'web-awesome', 'wordpress-simple'],
  solid: [
    'arrow-right',
    'arrow-up-right-from-square',
    'bars',
    'basket-shopping',
    'bolt',
    'book-open',
    'check',
    'chevron-right',
    'circle-check',
    'circle-info',
    'envelope',
    'globe',
    'house',
    'layer-group',
    'list-check',
    'moon',
    'magnifying-glass',
    'plug',
    'plus',
    'rectangle-list',
    'sun',
    'triangle-exclamation',
    'wand-magic-sparkles',
  ],
}

const documentationAssets = () => ({
  name: 'wp-awesome-documentation-assets',
  closeBundle: () => {
    const assetsPath = resolve(packageRoot, 'docs-site/.vite/assets')
    const fontAwesomePath = resolve(packageRoot, 'node_modules/@fortawesome/fontawesome-free/svgs')

    copyFileSync(
      resolve(packageRoot, 'docs-site/src/assets/theme-init.js'),
      resolve(assetsPath, 'theme-init.js'),
    )

    for (const [family, icons] of Object.entries(iconAssets)) {
      const familyPath = resolve(assetsPath, 'fontawesome/svgs', family)
      mkdirSync(familyPath, { recursive: true })

      for (const icon of icons) {
        copyFileSync(
          resolve(fontAwesomePath, family, `${icon}.svg`),
          resolve(familyPath, `${icon}.svg`),
        )
      }
    }
  },
})

export default defineConfig({
  build: {
    emptyOutDir: true,
    outDir: resolve(packageRoot, 'docs-site/.vite'),
    rollupOptions: {
      input: resolve(packageRoot, 'docs-site/src/assets/docs.mjs'),
      output: {
        entryFileNames: 'assets/docs.js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (asset) => asset.name === 'docs.css' ? 'assets/docs.css' : 'assets/[name][extname]',
      },
    },
  },
  plugins: [documentationAssets()],
})
