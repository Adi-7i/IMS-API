export interface ApiResponse<T> {
  success: true
  data: T
  message?: string
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface PaginatedResponse<T> {
  success: true
  data: T[]
  pagination: PaginationMeta
}

export interface ApiErrorDetail {
  field?: string
  message: string
  code?: string
  [key: string]: unknown
}

export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: ApiErrorDetail[] | unknown
  }
}

export interface PaginationParams {
  page?: number
  limit?: number
}

export type ViewState = 'disconnected' | 'loading' | 'empty' | 'error' | 'success'
