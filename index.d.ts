/******************************************************************************
 * This file is part of the wp-awesome package.
 *
 * File: index.d.ts
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
 ******************************************************************************/

export type ContentMode = 'auto' | 'rendered' | 'blocks'

/** Static Gutenberg blocks reconstructed by default when no custom policy is supplied. */
export const DEFAULT_SUPPORTED_BLOCK_NAMES: readonly string[]

export interface WordPressHtmlSanitizerOptions {
  /** Explicit custom Web Awesome tags from trusted consumer code. */
  additionalTags?: string[]
  /** Explicit attributes for trusted custom elements; event and active-content attributes are rejected. */
  additionalAttributes?: Record<string, string[]>
  /** Exact consumer-owned CSS custom properties allowed inside validated style values. */
  allowedCssVariables?: string[]
  /** Explicit consumer-owned font families that may be retained in inline styles. */
  additionalFontFamilies?: string[]
  /** Exact WordPress uploads prefixes whose raster images may be used as inline CSS backgrounds. */
  allowedBackgroundImagePrefixes?: string[]
}

export interface WordPressRoute {
  path: string
  outputPath: string
  canonicalUrl: string
}

export interface WordPressAuthor {
  id: number | string
  type: 'author'
  slug: string
  name: string
  description: string
  url: string | null
  avatarUrls: Record<string, string>
  sourceUrl: string | null
  route: WordPressRoute
  link: string
  path: string
  outputPath: string
}

export interface WordPressTaxonomy {
  id: number | string
  type: string
  taxonomy: string
  slug: string
  name: string
  description: string
  count: number
  parentId: number | null
  sourceUrl: string | null
  route: WordPressRoute
  link: string
  path: string
  outputPath: string
}

export interface WordPressContentRecord {
  id: number | string
  type: string
  slug: string
  status: string | null
  title: { html: string; text: string }
  excerpt: { html: string; text: string }
  content: {
    html: string
    source: string
    hasSerializedBlocks: boolean
    blockTypes: Record<string, number>
    unsupportedBlockNames: string[]
    fallbackReason: string | null
  }
  dates: { published: string | null; modified: string | null }
  author: WordPressAuthor | null
  taxonomies: WordPressTaxonomy[]
  featuredMedia: { id: number | null; url: string | null; alt: string; captionHtml: string } | null
  customFields: Record<string, unknown>
  sourceUrl: string | null
  route: WordPressRoute
}

export type WordPressPage = WordPressContentRecord & { type: 'page' }
export type WordPressPost = WordPressContentRecord & { type: 'post' }
export type WordPressCustomPostType<
  TType extends string = string,
  TFields extends Record<string, unknown> = Record<string, unknown>,
> = WordPressContentRecord & { type: TType; customFields: TFields }

export interface WordPressContentPolicy {
  mode?: ContentMode
  supportedBlockNames?: string[]
  blockRenderers?: Record<string, (context: object) => string>
  transformBlock?: (context: { block: object; innerHTML: string; childHtml: string[] }) => string
  sanitizerOptions?: WordPressHtmlSanitizerOptions
  allowFreeform?: boolean
  [key: string]: unknown
}

export function parseSerializedContent(source?: string): {
  hasSerializedBlocks: boolean
  blocks: object[]
  blockTypes: Record<string, number>
}
export function summarizeBlockTypes(blocks?: object[]): Record<string, number>
export function unsupportedBlockNames(blocks?: object[], options?: object): string[]
export function renderBlockTree(blocks?: object[], options?: object): string
export function convertWordPressContent(options?: {
  rawContent?: string
  renderedHtml?: string
  mode?: ContentMode
  supportedBlockNames?: string[]
  blockRenderers?: Record<string, (context: object) => string>
  allowFreeform?: boolean
  transformHtml?: (html: string, context: object) => string
  transformBlock?: (context: { block: object; innerHTML: string; childHtml: string[] }) => string
  sanitizerOptions?: WordPressHtmlSanitizerOptions
}): {
  html: string
  source: string
  hasSerializedBlocks: boolean
  blockTypes: Record<string, number>
  unsupportedBlockNames: string[]
  fallbackReason: string | null
}

export function createApplicationPasswordAuthorization(username: string, applicationPassword: string): string | null
export function createApplicationPasswordHeaders(username: string, applicationPassword: string): Record<string, string>
export function createWordPressRestClient(options: {
  baseUrl: string | URL
  fetchImpl?: typeof fetch
  headers?: Record<string, string> | Headers
  getHeaders?: (request: { url: URL; endpoint: string; context: string }) => Record<string, string> | Headers | Promise<Record<string, string> | Headers>
  perPage?: number
  retries?: number
  retryDelayMs?: number
  timeoutMs?: number
  onPublicFallback?: (details: { endpoint: string; status: number }) => void
}): {
  getJson(endpoint: string, options?: { params?: object | URLSearchParams; context?: 'view' | 'edit'; signal?: AbortSignal }): Promise<unknown>
  getCollection(endpoint: string, options?: { params?: object | URLSearchParams; context?: 'view' | 'edit'; perPage?: number; allowPublicFallback?: boolean; maxPages?: number; signal?: AbortSignal }): Promise<object[]>
}

export function resolveWordPressContentPolicy(policies: object, type?: string): WordPressContentPolicy
export function normalizeWordPressAuthor(record: object, options?: object): WordPressAuthor | null
export function collectWordPressAuthors(records?: object[], options?: object): WordPressAuthor[]
export function normalizeWordPressTaxonomy(record: object, options?: object): WordPressTaxonomy
export function normalizeWordPressRecord(record: object, options?: {
  type?: string
  contentPolicy?: WordPressContentPolicy
  routeResolver?: (record: object, overrides?: object) => WordPressRoute
  siteUrl?: string | URL
  customFields?: string[]
  sanitizerOptions?: WordPressHtmlSanitizerOptions
  transformHtml?: (html: string, context: object) => string
  transformBlock?: (context: { block: object; innerHTML: string; childHtml: string[] }) => string
  outputPath?: (path: string) => string
}): WordPressContentRecord

export function toOutputPath(pathname: string): string
export function resolveWordPressRoute(record: object, options?: object): WordPressRoute
export function createWordPressRouteResolver(options?: object): (record: object, overrides?: object) => WordPressRoute
export function assertNoWordPressRouteCollisions(records: object[]): void
export function createWordPressEleventyPlugin(options: { loadData: () => unknown | Promise<unknown>; key?: string }): (eleventyConfig: object) => void
export function extractWordPressColorPalette(source?: string): Record<string, string>
export function extractWordPressLinkColors(source?: string, options?: { colorPalette?: Record<string, string> }): Record<string, string>
export function isSafeCssColorValue(value: string): boolean
export function sanitizeWordPressHtml(value?: string, options?: WordPressHtmlSanitizerOptions): string
