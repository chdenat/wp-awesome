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
export function createYoastSitemapIntegration(options: {
  siteUrl: string | URL
  sitemapNames: string[]
  fetchText: (url: URL, details: { name: string }) => Promise<string>
}): { name: string; load(): Promise<Record<string, string[]>> }
