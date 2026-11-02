import { apiClient, NotConnectedError } from '@/lib/api-client'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type {
  Product,
  ProductQueryParams,
  CreateProductInput,
  UpdateProductInput,
} from '@/types/product'

export const productService = {
  async getProducts(params?: ProductQueryParams): Promise<PaginatedResponse<Product>> {
    try {
      return await apiClient.get<PaginatedResponse<Product>>('/products', {
        params: params as Record<string, string | number | undefined>,
      })
    } catch (err) {
      if (err instanceof NotConnectedError) throw err
      throw err
    }
  },

  async getProductById(id: number): Promise<Product> {
    try {
      const response = await apiClient.get<ApiResponse<Product>>(`/products/${id}`)
      return response.data
    } catch (err) {
      if (err instanceof NotConnectedError) throw err
      throw err
    }
  },

  async createProduct(data: CreateProductInput): Promise<Product> {
    try {
      const response = await apiClient.post<ApiResponse<Product>>('/products', data)
      return response.data
    } catch (err) {
      if (err instanceof NotConnectedError) throw err
      throw err
    }
  },

  async updateProduct(id: number, data: UpdateProductInput): Promise<Product> {
    try {
      const response = await apiClient.put<ApiResponse<Product>>(`/products/${id}`, data)
      return response.data
    } catch (err) {
      if (err instanceof NotConnectedError) throw err
      throw err
    }
  },

  async archiveProduct(id: number): Promise<Product> {
    try {
      const response = await apiClient.delete<ApiResponse<Product>>(`/products/${id}`)
      return response.data
    } catch (err) {
      if (err instanceof NotConnectedError) throw err
      throw err
    }
  },
}
