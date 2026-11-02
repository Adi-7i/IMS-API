import type { PaginationParams } from './api'

export type MovementType = 'initial' | 'sale' | 'cancellation_reversal' | 'adjustment'

export interface InventoryMovement {
  id: number
  product_id: number
  product_name?: string
  product_sku?: string
  movement_type: MovementType
  quantity: number
  reference_id: number | null
  reason: string | null
  created_at: string
}

export interface MovementsQueryParams extends PaginationParams {
  product_id?: number
  movement_type?: MovementType
  sort_dir?: 'ASC' | 'DESC'
}

export interface StockAdjustmentInput {
  product_id: number
  quantity_change: number
  reason?: string | null
}

export interface LowStockQueryParams extends PaginationParams {
  threshold?: number
  include_out_of_stock?: 'true' | 'false'
}
