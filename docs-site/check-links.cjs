/******************************************************************************
 * This file is part of the wp-awesome package.
 *
 * File: docs-site/check-links.cjs
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
 ******************************************************************************/

'use strict'

const fs = require('node:fs')
const path = require('node:path')

const outputDirectory = path.join(__dirname, '_site')
const pathPrefix = (process.env.WP_AWESOME_DOCS_PATH_PREFIX || '/').replace(/\/$/, '')
const generatedFiles = []

/** Collects generated files without following symlinks outside the documentation output. */
const collectFiles = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name)
    if (entry.isDirectory()) collectFiles(absolutePath)
    else if (entry.isFile()) generatedFiles.push(absolutePath)
  }
}

if (!fs.existsSync(outputDirectory)) {
  throw new Error('The documentation site is missing. Run `bun run docs:build` first.')
}

collectFiles(outputDirectory)
const htmlFiles = generatedFiles.filter((file) => file.endsWith('.html'))
const idCache = new Map()
const failures = []

/** Reads an HTML file and caches the IDs it declares for local-fragment validation. */
const readIds = (file) => {
  if (!idCache.has(file)) {
    const html = fs.readFileSync(file, 'utf8')
    idCache.set(file, new Set([...html.matchAll(/\bid=(['"])(.*?)\1/gi)].map((match) => match[2])))
  }
  return idCache.get(file)
}

for (const sourceFile of htmlFiles) {
  const sourceHtml = fs.readFileSync(sourceFile, 'utf8')
  const relativePath = path.relative(outputDirectory, sourceFile).split(path.sep).join('/')
  const sourceUrl = pathPrefix + (relativePath === 'index.html' ? '/' : `/${relativePath.replace(/\/index\.html$/, '/')}`)

  for (const match of sourceHtml.matchAll(/\bhref=(['"])(.*?)\1/gi)) {
    const href = match[2].trim()
    if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) continue

    let targetUrl
    try {
      targetUrl = new URL(href, `https://docs.invalid${sourceUrl}`)
    } catch {
      failures.push(`${relativePath}: invalid href ${href}`)
      continue
    }
    if (targetUrl.origin !== 'https://docs.invalid') continue

    const pathname = decodeURIComponent(targetUrl.pathname)
    if (pathPrefix && pathname !== pathPrefix && !pathname.startsWith(`${pathPrefix}/`)) {
      failures.push(`${relativePath}: local href escapes the configured path prefix (${href})`)
      continue
    }
    const targetPath = pathname.slice(pathPrefix.length) || '/'
    const candidate = path.resolve(outputDirectory, `.${targetPath}`)
    if (candidate !== outputDirectory && !candidate.startsWith(`${outputDirectory}${path.sep}`)) {
      failures.push(`${relativePath}: href escapes the generated site (${href})`)
      continue
    }

    let targetFile = candidate
    if (fs.existsSync(targetFile) && fs.statSync(targetFile).isDirectory()) targetFile = path.join(targetFile, 'index.html')
    else if (!path.extname(targetFile)) targetFile = path.join(targetFile, 'index.html')

    if (!fs.existsSync(targetFile) || !fs.statSync(targetFile).isFile()) {
      failures.push(`${relativePath}: missing local target ${href}`)
      continue
    }

    if (targetUrl.hash && targetFile.endsWith('.html')) {
      let fragment
      try {
        fragment = decodeURIComponent(targetUrl.hash.slice(1))
      } catch {
        failures.push(`${relativePath}: invalid fragment encoding in ${href}`)
        continue
      }
      if (fragment && !readIds(targetFile).has(fragment)) failures.push(`${relativePath}: missing fragment ${href}`)
    }
  }
}

if (failures.length) {
  process.stderr.write(`${failures.join('\n')}\n`)
  process.exitCode = 1
} else {
  process.stdout.write(`Checked local links and fragments in ${htmlFiles.length} documentation pages.\n`)
}
