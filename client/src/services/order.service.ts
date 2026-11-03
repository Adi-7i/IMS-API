import { apiClient } from '@/lib/api-client'
import { envelope, paginated, orderSchema, orderDetailSchema } from '@/lib/api-schemas'
import { notifyDataChanged } from '@/lib/data-events'
import type { OrderQueryParams, OrderStatus, CreateOrderInput } from '@/types/order'
export const orderService = {
  getOrders: (params?: OrderQueryParams, signal?: AbortSignal) => apiClient.get('/orders', paginated(orderSchema), { params: { ...params }, signal }),
  async getOrderById(id: number, signal?: AbortSignal) { return (await apiClient.get(`/orders/${id}`, envelope(orderDetailSchema), { signal })).data },
  async createOrder(data: CreateOrderInput, idempotencyKey: string) {
    const response = await apiClient.post('/orders', data, envelope(orderDetailSchema), { idempotencyKey }); notifyDataChanged(); return response.data
  },
  async updateStatus(id: number, status: OrderStatus) {
    const response = await apiClient.patch(`/orders/${id}/status`, { status }, envelope(orderDetailSchema)); notifyDataChanged(); return response.data
  },
}
