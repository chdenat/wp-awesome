/******************************************************************************
 * This file is part of the wp-awesome package.
 *
 * File: docs-site/build.cjs
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
 ******************************************************************************/

'use strict'

const { execFileSync, spawn, spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const packageRoot = path.resolve(__dirname, '..')
const outputDirectory = path.join(__dirname, '_site')
const serverPidFile = path.join(__dirname, '.serve.pid')
const eleventyEntry = require.resolve('@11ty/eleventy')
const eleventyCli = path.resolve(path.dirname(eleventyEntry), '../cmd.cjs')
const eleventyArguments = ['--config=docs-site/eleventy.config.cjs']
const commandArguments = process.argv.slice(2)
const isServing = commandArguments.includes('--serve')
const isStopping = commandArguments.includes('--stop')

const sleep = (duration) => new Promise((resolveSleep) => setTimeout(resolveSleep, duration))

const readProcessCommand = (pid) => {
  if (process.platform === 'linux') {
    return fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8').replaceAll('\0', ' ')
  }

  if (process.platform === 'win32') {
    return execFileSync('powershell.exe', [
      '-NoProfile',
      '-Command',
      `(Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}").CommandLine`,
    ], { encoding: 'utf8' })
  }

  return execFileSync('ps', ['-ww', '-p', String(pid), '-o', 'command='], { encoding: 'utf8' })
}

const clearServerPidFile = () => fs.rmSync(serverPidFile, { force: true })

const stopExistingServer = async () => {
  if (!fs.existsSync(serverPidFile)) return

  const previousPid = Number(fs.readFileSync(serverPidFile, 'utf8').trim())
  if (!Number.isSafeInteger(previousPid) || previousPid <= 0) {
    clearServerPidFile()
    return
  }

  let previousCommand
  try {
    previousCommand = readProcessCommand(previousPid)
  } catch {
    clearServerPidFile()
    return
  }

  const isThisDocsServer = previousCommand.includes(eleventyCli)
    && previousCommand.includes('--config=docs-site/eleventy.config.cjs')
    && previousCommand.includes('--serve')

  if (!isThisDocsServer) {
    clearServerPidFile()
    return
  }

  try {
    process.kill(previousPid, 'SIGTERM')
  } catch (error) {
    if (error.code !== 'ESRCH') throw error
  }

  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      process.kill(previousPid, 0)
    } catch (error) {
      if (error.code === 'ESRCH') {
        clearServerPidFile()
        return
      }
      throw error
    }
    await sleep(50)
  }

  throw new Error(`The existing wp-awesome documentation server (PID ${previousPid}) did not stop.`)
}

const run = async () => {
  if (isStopping || isServing) await stopExistingServer()
  if (isStopping) return

  // Remove only the generated documentation output so deleted pages cannot survive a clean build.
  fs.rmSync(outputDirectory, { recursive: true, force: true })

  const args = [eleventyCli, ...eleventyArguments, ...commandArguments]
  if (!isServing) {
    const result = spawnSync(process.execPath, args, { cwd: packageRoot, stdio: 'inherit' })
    if (result.error) throw result.error
    process.exitCode = result.status ?? 1
    return
  }

  const child = spawn(process.execPath, args, { cwd: packageRoot, stdio: 'inherit' })
  if (child.pid) fs.writeFileSync(serverPidFile, String(child.pid))

  const cleanup = () => {
    if (fs.existsSync(serverPidFile) && fs.readFileSync(serverPidFile, 'utf8').trim() === String(child.pid)) {
      clearServerPidFile()
    }
  }

  child.once('error', (error) => {
    cleanup()
    console.error(error)
    process.exitCode = 1
  })

  child.once('exit', (status, signal) => {
    cleanup()
    process.exitCode = status ?? (signal === 'SIGINT' ? 130 : 1)
  })

  process.once('SIGINT', () => child.kill('SIGINT'))
  process.once('SIGTERM', () => child.kill('SIGTERM'))
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
