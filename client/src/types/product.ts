import type { PaginationParams } from './api'

export interface Product {
  id: number
  name: string
  sku: string
  category_id: number
  category_name?: string
  price_paise: number
  cost_price_paise: number | null
  stock_quantity: number
  low_stock_threshold: number
  is_active: number // 1 = active, 0 = inactive
  created_at: string
  updated_at: string
}

export type ProductSortBy = 'name' | 'sku' | 'price_paise' | 'stock_quantity' | 'created_at'

export interface ProductQueryParams extends PaginationParams {
  category_id?: number
  is_active?: number
  search?: string
  sort_by?: ProductSortBy
  sort_dir?: 'ASC' | 'DESC'
}

export interface CreateProductInput {
  name: string
  sku: string
  category_id: number
  price_paise: number
  cost_price_paise?: number | null
  stock_quantity?: number
  low_stock_threshold?: number
}

export interface UpdateProductInput {
  name?: string
  sku?: string
  category_id?: number
  price_paise?: number
  cost_price_paise?: number | null
  low_stock_threshold?: number
}
