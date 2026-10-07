/******************************************************************************
 * This file is part of the wp-awesome package.
 *
 * File: integrations/yoast.d.ts
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
 ******************************************************************************/

export function parseSitemapLocations(xml: string): string[]
export function createRetryingFetchText(options?: {
  fetchImpl?: typeof fetch
  retries?: number
  retryDelayMs?: number
  maxRetryDelayMs?: number
  maxRetryAfterMs?: number
  timeoutMs?: number
  jitterRatio?: number
  onRetry?: (details: {
    url: URL
    name: string
    status: number | null
    attempt: number
    nextAttempt: number
    retries: number
    delayMs: number
    error: Error
  }) => void
  waitImpl?: (milliseconds: number) => Promise<void>
  nowImpl?: () => number
  randomImpl?: () => number
}): (url: URL, details: { name: string }) => Promise<string>
export function createYoastSitemapIntegration(options: {
  siteUrl: string | URL
  sitemapNames: string[]
  fetchText: (url: URL, details: { name: string }) => Promise<string>
}): { name: string; load(): Promise<Record<string, string[]>> }
