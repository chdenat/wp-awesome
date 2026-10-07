/******************************************************************************
 * This file is part of the wp-awesome package.
 *
 * File: integrations/woocommerce.d.ts
 *
 * Author: Christian Denat
 *
 * Created on: 2026-10-07
 * Last modified: 2026-10-07
 *
 * Copyright © 2026 Christian Denat
 ******************************************************************************/

export function createWooCommerceStoreApi(options: {
  restClient: { getCollection(endpoint: string, options?: object): Promise<object[]> }
  productsEndpoint?: string
  categoriesEndpoint?: string
}): {
  listProducts(options?: object): Promise<object[]>
  listCategories(options?: object): Promise<object[]>
}
