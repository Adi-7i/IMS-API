import type { PaginationParams } from './api'
export type OrderStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled'
export interface OrderItem {
  id: number
  order_id: number
  product_id: number
  product_name: string
  product_sku: string
  quantity: number
  unit_price_paise: number
  line_total_paise: number
}
export interface OrderListItem {
  id: number
  order_number: string
  customer_name: string
  status: OrderStatus
  total_paise: number
  created_at: string
  updated_at: string
}
export interface OrderDetail extends OrderListItem {
  items: OrderItem[]
  status_history: { id: number; order_id: number; previous_status: OrderStatus | null; new_status: OrderStatus; created_at: string }[]
}
export interface OrderQueryParams extends PaginationParams {
  status?: OrderStatus
  sort_dir?: 'asc' | 'desc'
}
export interface CreateOrderInput {
  customer_name: string
  items: { product_id: number; quantity: number }[]
}
