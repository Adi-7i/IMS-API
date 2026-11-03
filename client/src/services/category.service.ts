import { apiClient } from '@/lib/api-client'
import { z } from 'zod'
import { envelope, categorySchema } from '@/lib/api-schemas'
import { notifyDataChanged } from '@/lib/data-events'
import type { CreateCategoryInput } from '@/types/category'
export const categoryService = {
  async getCategories(signal?: AbortSignal) { return (await apiClient.get('/categories', envelope(z.array(categorySchema)), { signal })).data },
  async createCategory(data: CreateCategoryInput) {
    const response = await apiClient.post('/categories', data, envelope(categorySchema)); notifyDataChanged(); return response.data
  },
}
