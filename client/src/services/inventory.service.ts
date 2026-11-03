import { apiClient } from '@/lib/api-client'
import { envelope, paginated, productSchema, movementSchema, adjustmentSchema } from '@/lib/api-schemas'
import { notifyDataChanged } from '@/lib/data-events'
import type { LowStockQueryParams, MovementsQueryParams, StockAdjustmentInput } from '@/types/inventory'
export const inventoryService = {
  getLowStock: (params?: LowStockQueryParams, signal?: AbortSignal) => apiClient.get('/inventory/low-stock', paginated(productSchema), { params: { ...params }, signal }),
  getMovements: (params?: MovementsQueryParams, signal?: AbortSignal) => apiClient.get('/inventory/movements', paginated(movementSchema), { params: { ...params }, signal }),
  async adjustStock(data: StockAdjustmentInput, idempotencyKey: string) {
    const response = await apiClient.post('/inventory/adjustments', data, envelope(adjustmentSchema), { idempotencyKey }); notifyDataChanged(); return response.data
  },
}
