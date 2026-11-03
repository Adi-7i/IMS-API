import type { PaginationParams } from './api'
export interface Product {
  id: number
  name: string
  sku: string
  category_id: number
  category_name?: string
  description: string | null
  price_paise: number
  stock_quantity: number
  low_stock_threshold: number
  is_active: number
  created_at: string
  updated_at: string
}
export type ProductSortBy = 'name' | 'price_paise' | 'stock_quantity' | 'created_at'
export type Availability = 'in_stock' | 'low_stock' | 'out_of_stock'
export interface ProductQueryParams extends PaginationParams {
  category_id?: number
  is_active?: number
  search?: string
  availability?: Availability
  sort_by?: ProductSortBy
  sort_dir?: 'asc' | 'desc'
}
export interface CreateProductInput {
  name: string
  sku: string
  category_id: number
  description?: string | null
  price_paise: number
  stock_quantity: number
  low_stock_threshold?: number
}
export type UpdateProductInput = Partial<Omit<CreateProductInput, 'sku' | 'stock_quantity'>>
