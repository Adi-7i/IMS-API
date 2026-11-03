import { apiClient } from '@/lib/api-client'
import { dashboardSchema, envelope } from '@/lib/api-schemas'
import { orderService } from './order.service'
import { inventoryService } from './inventory.service'
export const dashboardService = {
  async getSummary(days: number = 7, signal?: AbortSignal) {
    const [summary, lowStock, pending, confirmed, completed, cancelled] = await Promise.all([
      apiClient.get('/dashboard/summary', envelope(dashboardSchema), { params: { range: days === 30 ? '30d' : '7d' }, signal }),
      inventoryService.getLowStock({ limit: 5 }, signal),
      ...(['Pending', 'Confirmed', 'Completed', 'Cancelled'] as const).map(status => orderService.getOrders({ status, limit: 1 }, signal)),
    ])
    return { ...summary.data, low_stock_alerts: lowStock.data, orders_by_status: {
      Pending: pending.pagination.total, Confirmed: confirmed.pagination.total,
      Completed: completed.pagination.total, Cancelled: cancelled.pagination.total,
    } }
  },
}
