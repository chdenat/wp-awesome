/******************************************************************************
 * This file is part of the wp-awesome package.
 *
 * File: scripts/check-package.mjs
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
 ******************************************************************************/

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Absolute repository root, independent of the caller's working directory. */
const root = fileURLToPath(new URL('..', import.meta.url))
/** Disposable consumer directory outside the source tree and its node_modules. */
const consumer = mkdtempSync(join(tmpdir(), 'wp-awesome-consumer-'))

/**
 * Run a consumer check and surface the command output only on failure.
 * @param {string} command Executable name or path.
 * @param {string[]} args Executable arguments.
 * @param {string} [cwd] Working directory.
 * @returns {string} Standard output.
 */
const run = (command, args, cwd = consumer) => {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed:\n${result.stdout}\n${result.stderr}`)
  return result.stdout
}

try {
  // Install the actual tarball, so source-tree resolution cannot hide missing published files.
  run('bun', ['pm', 'pack', '--ignore-scripts', '--destination', consumer], root)
  const tarball = join(consumer, readdirSync(consumer).find(file => file.endsWith('.tgz')))
  const packedFiles = run('tar', ['-tf', tarball]).trim().split('\n')
  assert.ok(packedFiles.includes('package/wordpress-plugin/wp-awesome.php'))
  assert.ok(packedFiles.includes('package/wordpress-plugin/wp-awesome-mu.php'))
  assert.ok(packedFiles.includes('package/wordpress-plugin/lifecycle.php'))
  assert.ok(packedFiles.includes('package/wordpress-plugin/uninstall.php'))
  assert.ok(packedFiles.includes('package/wordpress-plugin/languages/wp-awesome.pot'))
  assert.ok(packedFiles.includes('package/wordpress-plugin/languages/wp-awesome-fr_FR.po'))
  assert.ok(packedFiles.includes('package/wordpress-plugin/languages/wp-awesome-fr_FR.mo'))
  assert.ok(packedFiles.includes('package/LICENSE.md'))
  assert.ok(packedFiles.every(file => !/(?:node_modules|docs-site|\/test\/|\/skills\/|\.env|bun\.lock)/.test(file)))
  writeFileSync(join(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module' }))
  run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarball])

  const metadata = JSON.parse(readFileSync(join(consumer, 'node_modules/wp-awesome/package.json'), 'utf8'))
  assert.equal(metadata.name, 'wp-awesome')
  for (const entry of Object.values(metadata.exports)) {
    for (const target of Object.values(entry)) {
      assert.ok(readFileSync(resolve(consumer, 'node_modules/wp-awesome', target)).length)
    }
  }
  for (const fixture of ['consumer.cjs', 'consumer.mjs', 'consumer.cts']) {
    copyFileSync(join(root, 'test/fixtures', fixture), join(consumer, fixture))
  }
  run('node', ['consumer.cjs'])
  run('node', ['consumer.mjs'])
  run('bun', ['consumer.cjs'])
  run('node', [join(root, 'node_modules/typescript/bin/tsc'), '--noEmit', '--strict', '--target', 'ES2022', '--module', 'Node16', '--moduleResolution', 'Node16', join(consumer, 'consumer.cts')])
  const bundle = await Bun.build({ entrypoints: [join(consumer, 'consumer.mjs')], target: 'node', write: false })
  if (!bundle.success) throw new Error(bundle.logs.join('\n'))
  console.log(`Verified npm tarball, ${Object.keys(metadata.exports).length} exports, Node/Bun consumers, TypeScript and bundling.`)
} finally {
  // Only this check's disposable installation is removed; the package checkout is untouched.
  rmSync(consumer, { recursive: true, force: true })
}
