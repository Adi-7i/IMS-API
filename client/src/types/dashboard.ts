import type { OrderListItem, OrderStatus } from './order'
export interface DailySalesTrend { date: string; order_count: number; revenue_paise: number }
export interface DashboardSummary {
  products: { total_active: number; low_stock_count: number; out_of_stock_count: number }
  orders: { total_orders: number; total_revenue_paise: number }
  recent_orders: Pick<OrderListItem, 'id' | 'order_number' | 'customer_name' | 'status' | 'total_paise' | 'created_at'>[]
  daily_trend: DailySalesTrend[]
  range_days: number
}
export type OrderCounts = Record<OrderStatus, number>
