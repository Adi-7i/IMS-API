import type { PaginationParams } from './api'

export type OrderStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled'

export interface OrderItem {
  id: number
  order_id: number
  product_id: number
  product_name?: string
  product_sku?: string
  quantity: number
  unit_price_paise: number
  total_price_paise: number
}

export interface OrderListItem {
  id: number
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  status: OrderStatus
  total_amount_paise: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface OrderDetail extends OrderListItem {
  items: OrderItem[]
}

export interface OrderQueryParams extends PaginationParams {
  status?: OrderStatus
  sort_dir?: 'ASC' | 'DESC'
}

export interface CreateOrderItemInput {
  product_id: number
  quantity: number
  unit_price_paise: number
}

export interface CreateOrderInput {
  customer_name: string
  customer_email?: string | null
  customer_phone?: string | null
  notes?: string | null
  items: CreateOrderItemInput[]
}
