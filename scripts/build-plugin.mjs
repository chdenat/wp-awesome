/******************************************************************************
 * This file is part of the wp-awesome package.
 *
 * File: scripts/build-plugin.mjs
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
 ******************************************************************************/

import { spawnSync } from 'node:child_process'
import { copyFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Repository root used to find the installable plugin source. */
const root = fileURLToPath(new URL('..', import.meta.url))
/** Version shared by the JavaScript package and PHP plugin. */
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
/** Temporary WordPress-compatible ZIP root. */
const temporary = mkdtempSync(join(tmpdir(), 'wp-awesome-plugin-'))
/** Generated release archive; never edit its contents manually. */
const archive = join(root, 'artifacts', `wp-awesome-${version}.zip`)

try {
  const source = readFileSync(join(root, 'wordpress-plugin/wp-awesome.php'), 'utf8')
  if (!source.includes(` * Version: ${version}\n`)) throw new Error('PHP plugin and package versions differ.')
  mkdirSync(join(temporary, 'wp-awesome'))
  // The installer, managed MU-plugin, translation catalogs, and guarded uninstall entry point ship together.
  for (const file of ['wp-awesome.php', 'wp-awesome-mu.php', 'lifecycle.php', 'uninstall.php']) {
    copyFileSync(join(root, 'wordpress-plugin', file), join(temporary, 'wp-awesome', file))
  }
  cpSync(join(root, 'wordpress-plugin/languages'), join(temporary, 'wp-awesome/languages'), { recursive: true })
  copyFileSync(join(root, 'LICENSE.md'), join(temporary, 'wp-awesome/LICENSE.md'))
  mkdirSync(join(root, 'artifacts'), { recursive: true })
  rmSync(archive, { force: true })
  const result = spawnSync('zip', ['-q', '-r', archive, 'wp-awesome'], { cwd: temporary, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error('The plugin ZIP could not be built. Install the zip CLI.')
  console.log(`Built artifacts/wp-awesome-${version}.zip for WordPress upload.`)
} finally {
  rmSync(temporary, { recursive: true, force: true })
}
