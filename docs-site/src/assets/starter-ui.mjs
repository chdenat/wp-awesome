/******************************************************************************
 * This file is part of the wp-awesome package.
 *
 * File: docs-site/src/assets/starter-ui.mjs
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
 ******************************************************************************/

import Prism from 'prismjs'
import 'prismjs/components/prism-bash.js'
import 'prismjs/components/prism-json.js'
import 'prismjs/components/prism-toml.js'
import 'prismjs/components/prism-markup-templating.js'
import 'prismjs/components/prism-django.js'
import { addCodeTools, downloadFile } from './code-tools.mjs'
import { createStarterArchive, generateStarter, validateSiteSettings } from './starter-generator.mjs'

/** Finds an assistant field by its stable submitted name. */
const getControl = (form, name) => form.querySelector(`[name="${name}"]`)

// Existing pages are highlighted at build time; only generated previews need Prism here.
Prism.manual = true

/** Reads all assistant controls, including answers on temporarily disabled steps. */
const readAnswers = (form, assistant) => {
  const answers = Object.fromEntries([
    'siteName', 'projectName', 'productionUrl', 'stagingUrl', 'wordpressUrl',
    'stagingWordpressUrl', 'language', 'pagesRoute', 'postsRoute', 'contentMode',
    'installation', 'localPackagePath',
  ].map((key) => [key, getControl(form, key).value]))
  answers.pages = getControl(form, 'pages').checked
  answers.posts = getControl(form, 'posts').checked
  answers.packageVersion = assistant.dataset.packageVersion
  answers.eleventyVersion = assistant.dataset.eleventyVersion
  answers.webAwesomeVersion = assistant.dataset.webawesomeVersion
  answers.fontAwesomeVersion = assistant.dataset.fontawesomeVersion
  return answers
}

/** Creates a safely highlighted source preview with exact-text copy and download controls. */
const createPreview = (document, content, language, label, file) => {
  const pre = document.createElement('pre')
  const code = document.createElement('code')
  pre.className = `language-${language}`
  code.className = `language-${language}`
  const grammar = Prism.languages[language]
  if (grammar) code.innerHTML = Prism.highlight(content, grammar, language)
  else code.textContent = content
  pre.append(code)
  const container = document.createElement('div')
  container.append(pre)
  addCodeTools(pre, { label, file })
  return container.firstElementChild
}

/** Renders the generated files, environment summary, and consumer-side commands. */
const renderStarter = (assistant, starter) => {
  const document = assistant.ownerDocument
  const { options } = starter
  assistant.querySelector('[data-generated-summary]').textContent = `${starter.files.length} files for the ${options.siteName} Eleventy frontend. The local preview uses staging settings.`
  const environments = assistant.querySelector('[data-generated-environments]')
  environments.replaceChildren()
  for (const [label, siteUrl, wordpressUrl] of [
    ['Staging', options.stagingUrl, options.stagingWordpressUrl],
    ['Production', options.productionUrl, options.wordpressUrl],
  ]) {
    const group = document.createElement('div')
    const title = document.createElement('dt')
    title.textContent = label
    const value = document.createElement('dd')
    value.textContent = `${siteUrl} · WordPress: ${wordpressUrl}`
    group.append(title, value)
    environments.append(group)
  }
  const commands = assistant.querySelector('[data-generated-commands]')
  commands.replaceChildren()
  for (const command of starter.commands) {
    const title = document.createElement('h3')
    title.textContent = command.title
    commands.append(title, createPreview(document, command.content, 'bash', 'Shell'))
  }
  const files = assistant.querySelector('[data-generated-files]')
  files.replaceChildren()
  for (const [index, file] of starter.files.entries()) {
    const details = document.createElement('details')
    details.className = 'file-preview'
    details.open = index === 0
    const summary = document.createElement('summary')
    summary.textContent = file.path
    details.append(summary, createPreview(document, file.content, file.language, file.path, file))
    files.append(details)
  }
  assistant.querySelector('[data-credentials-note]').hidden = options.contentMode !== 'auto'
  assistant.querySelector('[data-release-note]').hidden = options.installation === 'local'
}

/**
 * Mounts the three-step setup assistant using Web Awesome form controls.
 * @param {HTMLElement} assistant Root containing site settings, content choices, and output.
 * @returns {void}
 */
export const mountSetupAssistant = (assistant) => {
  const form = assistant.querySelector('form')
  const panels = [...form.querySelectorAll('[data-assistant-step]')]
  const indicators = [...assistant.querySelectorAll('[data-step-indicator]')]
  const back = form.querySelector('[data-assistant-back]')
  const next = form.querySelector('[data-assistant-next]')
  const error = assistant.querySelector('[data-assistant-error]')
  let step = 0
  let starter

  /** Keeps conditional controls consistent with the current content and install choices. */
  const updateChoices = () => {
    for (const key of ['pages', 'posts']) {
      const selected = getControl(form, key).checked
      const route = getControl(form, `${key}Route`)
      route.disabled = !selected
      route.required = selected
    }
    const local = getControl(form, 'installation').value === 'local'
    const path = getControl(form, 'localPackagePath')
    path.disabled = !local
    path.required = local
    assistant.querySelector('[data-local-installation]').hidden = !local
    const authenticated = getControl(form, 'contentMode').value === 'auto'
    assistant.querySelector('[data-content-help]').hidden = !authenticated
  }

  /** Changes steps without losing entered answers and moves focus to the active heading. */
  const showStep = (index, focus = true) => {
    step = index
    panels.forEach((panel, panelIndex) => {
      panel.hidden = panelIndex !== step
      if (panel.tagName === 'FIELDSET') panel.disabled = panelIndex !== step
    })
    indicators.forEach((indicator, index) => {
      if (index === step) indicator.setAttribute('aria-current', 'step')
      else indicator.removeAttribute('aria-current')
    })
    back.hidden = step === 0
    next.hidden = step === 2
    next.textContent = step === 0 ? 'Continue' : 'Generate frontend files'
    error.hidden = true
    updateChoices()
    if (focus) panels[step].querySelector('[data-step-heading]').focus()
  }

  form.addEventListener('change', updateChoices)
  back.addEventListener('click', () => showStep(step - 1))
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    if (step === 2) return
    error.hidden = true
    for (const control of panels[step].querySelectorAll('wa-input, wa-select')) {
      if (!control.reportValidity()) return
    }
    try {
      const answers = readAnswers(form, assistant)
      if (step === 0) {
        validateSiteSettings(answers)
        showStep(1)
      } else {
        starter = generateStarter(answers)
        renderStarter(assistant, starter)
        showStep(2)
        assistant.querySelector('[data-assistant-status]').textContent = `${starter.files.length} files generated. Review or download your project.`
      }
    } catch (cause) {
      error.textContent = cause.message
      error.hidden = false
      error.focus()
    }
  })
  assistant.querySelector('[data-download-project]').addEventListener('click', () => {
    if (starter) downloadFile(`${starter.options.projectName}.zip`, createStarterArchive(starter), 'application/zip', assistant.ownerDocument)
  })
  form.hidden = false
  assistant.querySelector('[data-assistant-loading]').hidden = true
  showStep(0, false)
}
