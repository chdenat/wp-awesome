/******************************************************************************
 * This file is part of the wp-awesome package.
 *
 * File: docs-site/src/assets/code-tools.mjs
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
 ******************************************************************************/

/** Extracts source text, preserving line breaks emitted by Eleventy's highlight shortcode. */
export const getCodeText = (code) => {
  const clone = code.cloneNode(true)
  for (const lineBreak of clone.querySelectorAll('br')) lineBreak.replaceWith('\n')
  return clone.textContent
}

/**
 * Copies source text, with a selected-text fallback when Clipboard API access fails.
 * @param {string} text Exact code or command text.
 * @param {Document} [document] Document owning the copy controls.
 * @returns {Promise<void>} Resolves only after a successful copy.
 */
export const copyText = async (text, document = globalThis.document) => {
  try {
    const clipboard = document.defaultView?.navigator.clipboard
    if (clipboard?.writeText) {
      await clipboard.writeText(text)
      return
    }
  } catch {
    // A denied clipboard permission can still allow copying selected text.
  }
  const focusedElement = document.activeElement
  const selection = document.getSelection()
  const ranges = selection ? Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index).cloneRange()) : []
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('aria-label', 'Code to copy')
  textarea.style.cssText = 'position:fixed;left:0;top:0;opacity:0;pointer-events:none'
  document.body.append(textarea)
  try {
    textarea.focus({ preventScroll: true })
    textarea.select()
    if (!document.execCommand?.('copy')) throw new Error('Copy unavailable. Select the code and copy it manually.')
  } finally {
    textarea.remove()
    focusedElement?.focus({ preventScroll: true })
    if (selection) {
      selection.removeAllRanges()
      for (const range of ranges) selection.addRange(range)
    }
  }
}

/** Downloads a generated source file and releases its temporary object URL. */
export const downloadFile = (filename, content, type = 'text/plain;charset=utf-8', document = globalThis.document) => {
  const view = document.defaultView
  const url = view.URL.createObjectURL(new view.Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  // Release after the browser has started consuming the download URL.
  view.setTimeout(() => view.URL.revokeObjectURL(url), 1000)
}

/** Creates a shared, keyboard-accessible feedback region for copy controls. */
const getCopyStatus = (document) => {
  let status = document.querySelector('[data-copy-status]')
  if (!status) {
    status = document.createElement('p')
    status.className = 'visually-hidden'
    status.dataset.copyStatus = ''
    status.setAttribute('role', 'status')
    document.body.append(status)
  }
  return status
}

/** Adds a labelled toolbar with copy and optional download controls to one code block. */
export const addCodeTools = (pre, { label, file } = {}) => {
  if (pre.parentElement?.classList.contains('code-block')) return pre.parentElement
  const code = pre.querySelector('code')
  if (!code) return null
  const document = pre.ownerDocument
  const language = [...code.classList].find((name) => name.startsWith('language-'))?.slice(9) || 'text'
  const caption = label || ({ sh: 'Shell', bash: 'Shell', js: 'JavaScript', njk: 'Nunjucks', jinja2: 'Nunjucks' })[language] || language
  const wrapper = document.createElement('div')
  wrapper.className = 'code-block'
  const toolbar = document.createElement('div')
  toolbar.className = 'code-toolbar'
  const title = document.createElement('span')
  title.className = 'code-caption'
  title.textContent = caption
  const controls = document.createElement('div')
  controls.className = 'code-controls'
  const copy = document.createElement('button')
  copy.type = 'button'
  copy.className = 'code-button'
  copy.textContent = 'Copy'
  copy.setAttribute('aria-label', `Copy ${caption}`)
  const status = getCopyStatus(document)
  let copyPending = false
  copy.addEventListener('click', async () => {
    if (copyPending) return
    copyPending = true
    copy.setAttribute('aria-busy', 'true')
    try {
      await copyText(file?.content ?? getCodeText(code), document)
      copy.textContent = 'Copied!'
      status.textContent = `Copied ${caption} to the clipboard.`
    } catch (error) {
      copy.textContent = 'Try again'
      status.textContent = error.message
    } finally {
      copyPending = false
      copy.removeAttribute('aria-busy')
    }
  })
  copy.addEventListener('blur', () => { copy.textContent = 'Copy' })
  controls.append(copy)
  if (file) {
    const download = document.createElement('button')
    download.type = 'button'
    download.className = 'code-button'
    download.textContent = 'Download'
    download.setAttribute('aria-label', `Download ${file.path}`)
    download.addEventListener('click', () => downloadFile(file.path.split('/').at(-1), file.content, undefined, document))
    controls.append(download)
  }
  toolbar.append(title, controls)
  pre.before(wrapper)
  pre.tabIndex = 0
  wrapper.append(toolbar, pre)
  return wrapper
}

/** Enhances existing documentation examples without changing their highlighted source. */
export const enhanceCodeBlocks = (document) => {
  for (const pre of document.querySelectorAll('.article-content pre')) addCodeTools(pre)
}
