/******************************************************************************
 * This file is part of the wp-awesome package.
 *
 * File: test/docs-ui.test.mjs
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
 ******************************************************************************/

// @vitest-environment happy-dom

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { strFromU8, unzipSync } from 'fflate'
import { afterEach, test, vi } from 'vitest'
import { copyText, enhanceCodeBlocks, getCodeText } from '../docs-site/src/assets/code-tools.mjs'
import { mountSetupAssistant } from '../docs-site/src/assets/starter-ui.mjs'

/** Reads the source assistant, using the same dependency metadata as Eleventy's data file. */
const source = readFileSync(`${process.cwd()}/docs-site/src/setup-assistant.njk`, 'utf8')
/** Package versions used to substitute the two build-time template attributes. */
const metadata = JSON.parse(readFileSync(`${process.cwd()}/package.json`, 'utf8'))
const layout = readFileSync(`${process.cwd()}/docs-site/src/_includes/layouts/docs.njk`, 'utf8')
const styles = readFileSync(`${process.cwd()}/docs-site/src/assets/docs.css`, 'utf8')
const buildConfig = readFileSync(`${process.cwd()}/vite.config.mjs`, 'utf8')
/** Finds a Web Awesome form control by its submitted name. */
const field = (form, name) => form.querySelector(`[name="${name}"]`)

/** Registers small form-control stand-ins because happy-dom does not ship Web Awesome. */
const registerFormControls = () => {
  if (!customElements.get('wa-input')) {
    class WaInput extends HTMLElement {
      constructor() {
        super()
        this.value = ''
      }

      connectedCallback() { this.value ||= this.getAttribute('value') || '' }
      get required() { return this.hasAttribute('required') }
      set required(value) { this.toggleAttribute('required', Boolean(value)) }
      get disabled() { return this.hasAttribute('disabled') }
      set disabled(value) { this.toggleAttribute('disabled', Boolean(value)) }
      reportValidity() { return this.disabled || !this.required || Boolean(String(this.value).trim()) }
    }
    customElements.define('wa-input', WaInput)
  }
  if (!customElements.get('wa-select')) {
    class WaSelect extends customElements.get('wa-input') {}
    customElements.define('wa-select', WaSelect)
  }
  if (!customElements.get('wa-checkbox')) {
    class WaCheckbox extends HTMLElement {
      get checked() { return this.hasAttribute('checked') }
      set checked(value) { this.toggleAttribute('checked', Boolean(value)) }
    }
    customElements.define('wa-checkbox', WaCheckbox)
  }
  if (!customElements.get('wa-button')) customElements.define('wa-button', class WaButton extends HTMLElement {})
}

afterEach(() => {
  if (vi.isFakeTimers()) vi.runOnlyPendingTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
  document.getSelection().removeAllRanges()
  document.body.replaceChildren()
})

/** Mounts the real assistant markup independently of generated documentation output. */
const mountAssistant = () => {
  registerFormControls()
  document.body.innerHTML = source.slice(source.indexOf('<p>WordPress stays'))
    .replace('{{ site.version }}', metadata.version)
    .replace('{{ site.eleventyVersion }}', metadata.devDependencies['@11ty/eleventy'])
    .replace('{{ site.webAwesomeVersion }}', metadata.devDependencies['@awesome.me/webawesome'])
    .replace('{{ site.fontAwesomeVersion }}', metadata.devDependencies['@fortawesome/fontawesome-free'])
    .replace('{% for name in site.supportedBlockNames %}<li><code>{{ name }}</code></li>{% endfor %}', [
      'core/paragraph', 'core/heading', 'core/list', 'core/list-item',
    ].map((name) => `<li><code>${name}</code></li>`).join(''))
  const assistant = document.querySelector('[data-setup-assistant]')
  mountSetupAssistant(assistant)
  return assistant
}

/** Supplies site answers through the assistant's public input controls. */
const fillSite = (assistant) => {
  const form = assistant.querySelector('form')
  for (const [name, value] of Object.entries({
    siteName: 'Test site', productionUrl: 'https://beautiful.wp.site',
    stagingUrl: 'https://staging.beautiful.example', wordpressUrl: 'https://beautiful.wp.site/cms',
  })) field(form, name).value = value
}

/** Submits the active wizard step without relying on browser navigation. */
const submit = (assistant) => assistant.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))

test('brand puts the project home above the ordered WordPress and Awesome tools', () => {
  const brandStart = layout.indexOf('<div class="brand">')
  const brandEnd = layout.indexOf('<nav class="header-actions', brandStart)
  const brand = layout.slice(brandStart, brandEnd)
  const expectedOrder = [
    'class="brand-project', 'class="brand-home"', 'class="brand-name"',
    'class="brand-resources', 'brand-wordpress', 'brand-build-awesome',
    'brand-web-awesome', 'brand-font-awesome',
  ]
  const positions = expectedOrder.map((marker) => brand.indexOf(marker))
  assert.ok(positions.every((position) => position >= 0))
  assert.deepEqual(positions, [...positions].sort((left, right) => left - right))
  assert.ok(brand.includes('aria-label="WP Awesome v{{ site.version }} home">WP Awesome <span class="brand-version">v{{ site.version }}</span>'))
  assert.doesNotMatch(brand, /brand-(?:chevron|plus)/)
  assert.match(styles, /--brand-build-awesome-green: #00a776/)
  assert.match(styles, /--brand-web-awesome-orange: #f36944/)
  assert.match(styles, /--brand-font-awesome-blue: #418fde/)
  for (const icon of ['chevron-right', 'list-check', 'check', 'triangle-exclamation']) {
    assert.ok(buildConfig.includes(`'${icon}'`))
  }
  assert.match(styles, /\.header-actions wa-button \{[^}]*inline-size: var\(--wa-space-2xl\);[^}]*flex: 0 0 var\(--wa-space-2xl\);/)
  assert.match(styles, /\.header-actions wa-button::part\(button\) \{[^}]*padding-inline: 0;/)
  assert.match(styles, /\.header-actions \{ flex-wrap: nowrap; gap: var\(--wa-space-2xs\); margin-inline-start: auto; \}/)
  assert.match(styles, /\.brand-resources \{[^}]*flex-wrap: nowrap;/)
})

test('setup assistant declares its wizard with Web Awesome form components and fixed blocks', () => {
  const assistant = mountAssistant()
  const form = assistant.querySelector('form')
  assert.ok(form.querySelectorAll('wa-input').length > 4)
  assert.ok(form.querySelectorAll('wa-select wa-option').length >= 5)
  assert.equal(form.querySelectorAll('wa-checkbox').length, 2)
  assert.equal(form.querySelector('[name="supportedBlockNames"]'), null)
  assert.match(form.textContent, /core\/paragraph/)
  assert.match(form.textContent, /core\/heading/)
  assert.match(form.textContent, /core\/list-item/)
})

/** Provides clipboard dependencies while preserving real DOM selection and focus behavior. */
const copyDocument = (clipboard, execCommand) => ({
  defaultView: { navigator: { clipboard } },
  activeElement: document.activeElement,
  getSelection: () => document.getSelection(),
  createElement: (tag) => document.createElement(tag),
  body: document.body,
  execCommand,
})

test('assistant advances through Web Awesome controls, creates chosen templates, and preserves answers when editing', () => {
  const assistant = mountAssistant()
  fillSite(assistant)
  submit(assistant)
  assert.equal(assistant.querySelector('[aria-current="step"]').textContent.trim(), '2 Content and installation')
  assert.match(document.activeElement.textContent, /Choose content/)
  const form = assistant.querySelector('form')
  field(form, 'pages').checked = false
  field(form, 'language').value = 'fr'
  field(form, 'localPackagePath').value = '/tmp/wp-awesome-fixture'
  form.dispatchEvent(new Event('change', { bubbles: true }))
  assert.equal(field(form, 'pagesRoute').disabled, true)
  submit(assistant)
  assert.equal(assistant.querySelector('[aria-current="step"]').textContent.trim(), '3 Files and test order')
  const summaries = [...assistant.querySelectorAll('.file-preview summary')].map((element) => element.textContent)
  assert.ok(summaries.includes('src/posts.njk'))
  assert.ok(!summaries.includes('src/pages.njk'))
  assert.equal(assistant.querySelectorAll('[data-generated-commands] .code-block').length, 5)
  assert.ok(assistant.querySelector('[data-generated-files] .token'))
  assert.ok(assistant.querySelector('[data-generated-summary]').textContent.includes('Test site'))
  assistant.querySelector('[data-assistant-back]').click()
  assert.equal(field(form, 'localPackagePath').value, '/tmp/wp-awesome-fixture')
  field(form, 'posts').checked = false
  submit(assistant)
  assert.match(assistant.querySelector('[data-assistant-error]').textContent, /Select pages, posts, or both/)
  assert.equal(assistant.querySelector('[data-generated-files]').closest('[data-assistant-step]').hidden, true)
})

test('assistant validates environment choices before advancing and hides unnecessary local/auth controls', () => {
  const assistant = mountAssistant()
  fillSite(assistant)
  const form = assistant.querySelector('form')
  field(form, 'stagingUrl').value = 'https://beautiful.wp.site'
  submit(assistant)
  assert.match(assistant.querySelector('[data-assistant-error]').textContent, /different public URLs/)
  assert.equal(assistant.querySelector('[data-assistant-error]').hidden, false)
  field(form, 'stagingUrl').value = 'https://staging.beautiful.example'
  submit(assistant)
  field(form, 'installation').value = 'github'
  field(form, 'contentMode').value = 'auto'
  form.dispatchEvent(new Event('change', { bubbles: true }))
  assert.equal(assistant.querySelector('[data-local-installation]').hidden, true)
  assert.equal(assistant.querySelector('[data-content-help]').hidden, false)
  submit(assistant)
  assert.equal(assistant.querySelector('[data-release-note]').hidden, false)
  assert.equal(assistant.querySelector('[data-credentials-note]').hidden, false)
  assert.ok(assistant.querySelector('[data-generated-summary]').textContent)
})

test('documentation copy controls preserve highlighted commands, shortcode line breaks, and literal markup', async () => {
  const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
  document.body.innerHTML = '<main class="article-content"><pre class="language-sh"><code class="language-sh"><span class="token function">bun</span> install<br>export SITE_URL=\'https://beautiful.wp.site\'\n&lt;literal&gt;</code></pre></main>'
  enhanceCodeBlocks(document)
  enhanceCodeBlocks(document)
  const copy = document.querySelector('.code-button')
  assert.equal(document.querySelectorAll('.code-toolbar').length, 1)
  assert.equal(getCodeText(document.querySelector('code')), "bun install\nexport SITE_URL='https://beautiful.wp.site'\n<literal>")
  copy.focus()
  copy.click()
  await vi.waitFor(() => assert.equal(copy.textContent, 'Copied!'))
  assert.equal(document.activeElement, copy)
  assert.equal(copy.disabled, false)
  assert.equal(copy.hasAttribute('aria-busy'), false)
  assert.equal(writeText.mock.calls[0][0], "bun install\nexport SITE_URL='https://beautiful.wp.site'\n<literal>")
  assert.match(document.querySelector('[data-copy-status]').textContent, /Copied Shell/)
  assert.ok(document.querySelector('.token.function'))
})

test('copy ignores repeated activation while preserving keyboard focus until the clipboard resolves', async () => {
  let resolveWrite
  const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(() => new Promise((resolve) => {
    resolveWrite = resolve
  }))
  document.body.innerHTML = '<main class="article-content"><pre><code>Copy this</code></pre></main>'
  enhanceCodeBlocks(document)
  const copy = document.querySelector('.code-button')
  copy.focus()
  copy.click()
  copy.click()
  assert.equal(copy.disabled, false)
  assert.equal(copy.getAttribute('aria-busy'), 'true')
  assert.equal(document.activeElement, copy)
  assert.equal(writeText.mock.calls.length, 1)
  resolveWrite()
  await vi.waitFor(() => assert.equal(copy.textContent, 'Copied!'))
  assert.equal(document.activeElement, copy)
  assert.equal(copy.hasAttribute('aria-busy'), false)
})

test('clipboard fallback handles denied or missing APIs and restores selection, focus, and temporary elements', async () => {
  document.body.innerHTML = '<button>Copy</button><pre>Original selection</pre>'
  const focused = document.querySelector('button')
  focused.focus()
  const range = document.createRange()
  range.selectNodeContents(document.querySelector('pre'))
  document.getSelection().addRange(range)
  const execCommand = vi.fn(() => {
    assert.equal(document.querySelector('textarea').value, 'bun run build\n')
    return true
  })
  await copyText('bun run build\n', copyDocument({ writeText: async () => { throw new Error('Denied') } }, execCommand))
  assert.equal(execCommand.mock.calls[0][0], 'copy')
  assert.equal(document.activeElement, focused)
  assert.equal(document.getSelection().toString(), 'Original selection')
  assert.equal(document.querySelector('textarea'), null)
  await assert.rejects(copyText('text', copyDocument(undefined, () => false)), /Copy unavailable/)
  assert.equal(document.querySelector('textarea'), null)
  assert.equal(document.activeElement, focused)
})

test('assistant ZIP download matches the preview and releases its temporary browser URL', async () => {
  const assistant = mountAssistant()
  fillSite(assistant)
  submit(assistant)
  field(assistant.querySelector('form'), 'localPackagePath').value = '/tmp/wp-awesome-fixture'
  submit(assistant)
  vi.useFakeTimers()
  const createUrl = vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:assistant-test')
  const revokeUrl = vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => {})
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  assistant.querySelector('[data-download-project]').click()
  assert.equal(click.mock.instances[0].download, 'beautiful-site.zip')
  const files = unzipSync(new Uint8Array(await createUrl.mock.calls[0][0].arrayBuffer()))
  const preview = assistant.querySelector('[data-generated-files] code')
  assert.equal(strFromU8(files['beautiful-site/package.json']), getCodeText(preview))
  assert.equal(Object.keys(files).length, 14)
  vi.runOnlyPendingTimers()
  assert.equal(revokeUrl.mock.calls[0][0], 'blob:assistant-test')
  assert.equal(document.querySelector('a[download]'), null)
})
