/******************************************************************************
 * This file is part of the wp-awesome package.
 *
 * File: vitest.config.mjs
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
 ******************************************************************************/

/*
 * This file is part of the wp-awesome package.
 *
 * File: vitest.config.mjs
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-04
 * Last modified: 2026-10-04
 *
 * Copyright © 2026 Christian Denat
 */

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['test/**/*.test.mjs'],
    clearMocks: true,
    restoreMocks: true,
  },
})
