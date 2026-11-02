import { apiClient, NotConnectedError } from '@/lib/api-client'
import { generateIdempotencyKey } from '@/lib/idempotency'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type {
  OrderDetail,
  OrderListItem,
  OrderQueryParams,
  OrderStatus,
  CreateOrderInput,
} from '@/types/order'

export const orderService = {
  async getOrders(params?: OrderQueryParams): Promise<PaginatedResponse<OrderListItem>> {
    try {
      return await apiClient.get<PaginatedResponse<OrderListItem>>('/orders', {
        params: params as Record<string, string | number | undefined>,
      })
    } catch (err) {
      if (err instanceof NotConnectedError) throw err
      throw err
    }
  },

  async getOrderById(id: number): Promise<OrderDetail> {
    try {
      const response = await apiClient.get<ApiResponse<OrderDetail>>(`/orders/${id}`)
      return response.data
    } catch (err) {
      if (err instanceof NotConnectedError) throw err
      throw err
    }
  },

  async createOrder(data: CreateOrderInput, idempotencyKey?: string): Promise<OrderDetail> {
    try {
      const key = idempotencyKey || generateIdempotencyKey()
      const response = await apiClient.post<ApiResponse<OrderDetail>>('/orders', data, {
        idempotencyKey: key,
      })
      return response.data
    } catch (err) {
      if (err instanceof NotConnectedError) throw err
      throw err
    }
  },

  async updateStatus(id: number, status: OrderStatus): Promise<OrderDetail> {
    try {
      const response = await apiClient.patch<ApiResponse<OrderDetail>>(`/orders/${id}/status`, {
        status,
      })
      return response.data
    } catch (err) {
      if (err instanceof NotConnectedError) throw err
      throw err
    }
  },
}
