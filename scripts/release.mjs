/******************************************************************************
 * This file is part of the wp-awesome package.
 *
 * File: scripts/release.mjs
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
 ******************************************************************************/

import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/** Root used for every release operation. */
const root = fileURLToPath(new URL('..', import.meta.url))
/** Requested release options; preview never changes files or Git state. */
const args = process.argv.slice(2)
if (args.some(arg => !['--preview', '--initial', '--patch', '--minor', '--major'].includes(arg))) {
  throw new Error('Usage: bun run release [--initial|--patch|--minor|--major] [--preview]')
}
if (args.filter(arg => arg !== '--preview').length > 1) throw new Error('Choose one version increment.')

/**
 * Execute a release command without passing arguments through a shell.
 * @param {string} command Executable name.
 * @param {string[]} argumentsList Command arguments.
 * @param {boolean} [visible] Whether to inherit terminal output.
 * @returns {string} Captured standard output when applicable.
 */
const run = (command, argumentsList, visible = false) => {
  const result = spawnSync(command, argumentsList, { cwd: root, encoding: 'utf8', stdio: visible ? 'inherit' : 'pipe' })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(result.stderr || `${command} ${argumentsList.join(' ')} failed.`)
  return result.stdout?.trim() || ''
}

/** Current manifest and last version tag determine whether this is the initial release. */
const metadata = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
/** Last stable version tag, when the repository has already been released. */
const latestTag = run('git', ['tag', '--list', 'v*', '--sort=-version:refname']).split('\n')[0]
/** Version increment; the first publication keeps the already prepared version. */
const increment = args.find(arg => arg !== '--preview')?.slice(2) || (latestTag ? 'patch' : 'initial')
if (!/^\d+\.\d+\.\d+$/.test(metadata.version)) throw new Error('A stable semantic version is required.')
let [major, minor, patch] = metadata.version.split('.').map(Number)
if (increment === 'major') {
  major += 1
  minor = 0
  patch = 0
}
else if (increment === 'minor') {
  minor += 1
  patch = 0
}
else if (increment === 'patch') patch += 1
/** Proposed package and plugin version. */
const version = `${major}.${minor}.${patch}`
/** Release notes shown in preview and stored in the annotated Git tag. */
const notes = `v${version}\n\nSee CHANGELOG.md for package, documentation and WordPress plugin changes.\n\nhttps://github.com/chdenat/wp-awesome/releases/tag/v${version}`

if (args.includes('--preview')) {
  console.log(`Preview only; no files, commits, tags or remote state changed.\n\n${notes}`)
} else {
  // Only an explicit release invocation may mutate Git or contact the publication remote.
  if (run('git', ['status', '--porcelain'])) throw new Error('Commit or preserve current changes before releasing.')
  if (run('git', ['branch', '--show-current']) !== 'main') throw new Error('Release from the main branch.')
  const origin = run('git', ['remote', 'get-url', 'origin'])
  if (!['git@github.com:chdenat/wp-awesome.git', 'https://github.com/chdenat/wp-awesome.git'].includes(origin)) {
    throw new Error('The origin remote must be the intended chdenat/wp-awesome repository.')
  }
  if (run('git', ['tag', '--list', `v${version}`])) throw new Error(`Tag v${version} already exists.`)
  run('bun', ['run', 'verify'], true)
  writeFileSync(new URL('../package.json', import.meta.url), `${JSON.stringify({ ...metadata, version }, null, 2)}\n`)
  const pluginPath = new URL('../wordpress-plugin/wp-awesome.php', import.meta.url)
  writeFileSync(pluginPath, readFileSync(pluginPath, 'utf8').replace(/ \* Version: \S+/, ` * Version: ${version}`))
  const readmePath = new URL('../README.md', import.meta.url)
  writeFileSync(readmePath, readFileSync(readmePath, 'utf8').replace(/Current source version: `[^`]+`[^\n]*/, `Current source version: \`${version}\`.`))
  const changelogPath = new URL('../CHANGELOG.md', import.meta.url)
  const changelog = readFileSync(changelogPath, 'utf8')
  const entry = `## ${version} — ${new Date().toISOString().slice(0, 10)}`
  writeFileSync(changelogPath, changelog.includes(`## ${version} — unreleased`) ? changelog.replace(`## ${version} — unreleased`, entry) : changelog.replace('# Changelog', `# Changelog\n\n${entry}\n\n- See the annotated release tag and commit history.`))
  // A version-only release does not change dependency resolution; avoid rewriting registry URLs from local npm configuration.
  run('bun', ['run', 'plugin:build'], true)
  run('git', ['add', '--', 'package.json', 'bun.lock', 'README.md', 'CHANGELOG.md', 'wordpress-plugin/wp-awesome.php'])
  run('git', ['commit', '-m', `Release v${version}`], true)
  run('git', ['tag', '-a', `v${version}`, '-m', notes])
  run('git', ['push', 'origin', 'main', '--follow-tags'], true)
  console.log('The version tag starts the verified npm and GitHub release workflow.')
}
