/******************************************************************************
 * This file is part of the wp-awesome package.
 *
 * File: integrations/forms.d.ts
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
 ******************************************************************************/

export function collectFormReferences(
  records?: object[],
  options?: { providers?: Array<{ name: string; findForms: (html: string, record: object) => unknown[] | unknown }> },
): Array<{ provider: string; id: string | number; sources: Array<{ recordId: string | number | null; path: string | null }> }>
