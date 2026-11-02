import { apiClient, NotConnectedError } from '@/lib/api-client'
import type { ApiResponse } from '@/types/api'
import type { Category, CreateCategoryInput } from '@/types/category'

export const categoryService = {
  async getCategories(): Promise<Category[]> {
    try {
      const response = await apiClient.get<ApiResponse<Category[]>>('/categories')
      return response.data
    } catch (err) {
      if (err instanceof NotConnectedError) throw err
      throw err
    }
  },

  async createCategory(data: CreateCategoryInput): Promise<Category> {
    try {
      const response = await apiClient.post<ApiResponse<Category>>('/categories', data)
      return response.data
    } catch (err) {
      if (err instanceof NotConnectedError) throw err
      throw err
    }
  },
}
