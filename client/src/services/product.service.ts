import { apiClient } from '@/lib/api-client'
import { envelope, paginated, productSchema } from '@/lib/api-schemas'
import { notifyDataChanged } from '@/lib/data-events'
import type { ProductQueryParams, CreateProductInput, UpdateProductInput, Product } from '@/types/product'
export const productService = {
  getProducts: (params?: ProductQueryParams, signal?: AbortSignal) => apiClient.get('/products', paginated(productSchema), { params: { ...params }, signal }),
  async getAllActive(signal?: AbortSignal): Promise<Product[]> {
    const products: Product[] = []
    let page = 1
    for (;;) {
      const response = await this.getProducts({ page, limit: 100, is_active: 1, sort_by: 'name', sort_dir: 'asc' }, signal)
      products.push(...response.data)
      if (!response.pagination.hasNext) return products
      page++
    }
  },
  async getProductById(id: number, signal?: AbortSignal) { return (await apiClient.get(`/products/${id}`, envelope(productSchema), { signal })).data },
  async createProduct(data: CreateProductInput) {
    const response = await apiClient.post('/products', data, envelope(productSchema)); notifyDataChanged(); return response.data
  },
  async updateProduct(id: number, data: UpdateProductInput) {
    const response = await apiClient.patch(`/products/${id}`, data, envelope(productSchema)); notifyDataChanged(); return response.data
  },
  async archiveProduct(id: number) {
    const response = await apiClient.delete(`/products/${id}`, envelope(productSchema)); notifyDataChanged(); return response.data
  },
}
