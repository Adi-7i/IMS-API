import { apiClient, NotConnectedError } from '@/lib/api-client'
import { generateIdempotencyKey } from '@/lib/idempotency'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type {
  InventoryMovement,
  LowStockQueryParams,
  MovementsQueryParams,
  StockAdjustmentInput,
} from '@/types/inventory'
import type { Product } from '@/types/product'

export const inventoryService = {
  async getLowStock(params?: LowStockQueryParams): Promise<Product[]> {
    try {
      const response = await apiClient.get<ApiResponse<Product[]>>('/inventory/low-stock', {
        params: params as Record<string, string | number | undefined>,
      })
      return response.data
    } catch (err) {
      if (err instanceof NotConnectedError) throw err
      throw err
    }
  },

  async getMovements(params?: MovementsQueryParams): Promise<PaginatedResponse<InventoryMovement>> {
    try {
      return await apiClient.get<PaginatedResponse<InventoryMovement>>('/inventory/movements', {
        params: params as Record<string, string | number | undefined>,
      })
    } catch (err) {
      if (err instanceof NotConnectedError) throw err
      throw err
    }
  },

  async adjustStock(
    data: StockAdjustmentInput,
    idempotencyKey?: string,
  ): Promise<InventoryMovement> {
    try {
      const key = idempotencyKey || generateIdempotencyKey()
      const response = await apiClient.post<ApiResponse<InventoryMovement>>(
        '/inventory/adjustments',
        data,
        { idempotencyKey: key },
      )
      return response.data
    } catch (err) {
      if (err instanceof NotConnectedError) throw err
      throw err
    }
  },
}
