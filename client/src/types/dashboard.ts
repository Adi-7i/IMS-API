import type { OrderListItem } from './order'
import type { Product } from './product'

export interface DailySalesTrend {
  date: string
  order_count: number
  revenue_paise: number
}

export interface DashboardSummary {
  products: {
    total_active: number
  }
  inventory: {
    low_stock_count: number
    out_of_stock_count: number
  }
  orders: {
    today_orders: number
    total_revenue_paise: number
    orders_by_status: {
      Pending: number
      Confirmed: number
      Completed: number
      Cancelled: number
    }
  }
  recent_orders: OrderListItem[]
  low_stock_alerts: Product[]
  daily_trend: DailySalesTrend[]
  range_days: number
}
