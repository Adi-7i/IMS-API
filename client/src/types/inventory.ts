import type { PaginationParams } from './api'
export type MovementType = 'initial' | 'sale' | 'cancellation_reversal' | 'adjustment'
export interface InventoryMovement {
  id: number
  product_id: number
  product_name: string
  product_sku: string
  movement_type: MovementType
  quantity_delta: number
  previous_stock: number
  resulting_stock: number
  order_id: number | null
  order_number: string | null
  reason: string
  created_at: string
}
export interface MovementsQueryParams extends PaginationParams {
  product_id?: number
  type?: MovementType
  sort_dir?: 'asc' | 'desc'
}
export interface StockAdjustmentInput { product_id: number; delta: number; reason: string }
export interface StockAdjustmentResult extends StockAdjustmentInput {
  movement_id: number
  previous_stock: number
  resulting_stock: number
}
export interface LowStockQueryParams extends PaginationParams { include_out_of_stock?: 'true' | 'false' }
