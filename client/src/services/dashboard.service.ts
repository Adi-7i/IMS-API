import { apiClient, NotConnectedError } from '@/lib/api-client'
import type { ApiResponse } from '@/types/api'
import type { DashboardSummary } from '@/types/dashboard'
import type { Product } from '@/types/product'

export const dashboardService = {
  async getSummary(days: number = 7): Promise<DashboardSummary> {
    try {
      const response = await apiClient.get<ApiResponse<DashboardSummary>>('/dashboard/summary', {
        params: { days },
      })
      return response.data
    } catch (err) {
      if (err instanceof NotConnectedError) throw err
      throw err
    }
  },

  async getLowStock(threshold?: number): Promise<Product[]> {
    try {
      const response = await apiClient.get<ApiResponse<Product[]>>('/inventory/low-stock', {
        params: { threshold },
      })
      return response.data
    } catch (err) {
      if (err instanceof NotConnectedError) throw err
      throw err
    }
  },
}
