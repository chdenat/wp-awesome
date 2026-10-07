/******************************************************************************
 * This file is part of the wp-awesome package.
 *
 * File: index.js
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
 ******************************************************************************/

'use strict'

/** Public CommonJS API assembled from the package's focused modules. */
module.exports = {
  ...require('./auth'),
  ...require('./content'),
  ...require('./eleventy'),
  ...require('./policies'),
  ...require('./records'),
  ...require('./rest-client'),
  ...require('./routes'),
  ...require('./sanitize'),
  ...require('./styles'),
}
