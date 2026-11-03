import { z } from 'zod'
import { API_BASE_URL } from './constants'
import { errorSchema } from './api-schemas'
import type { ApiErrorResponse } from '@/types/api'

// Retained for compatibility with the existing disconnected-state component tests.
export class NotConnectedError extends Error {
  readonly endpoint: string
  constructor(endpoint: string) { super(`${endpoint} is not connected`); this.name = 'NotConnectedError'; this.endpoint = endpoint }
}
export const isNotConnectedError = (error: unknown): error is NotConnectedError => error instanceof NotConnectedError
export class ApiHttpError extends Error {
  constructor(readonly status: number, message: string, readonly errorResponse?: ApiErrorResponse) { super(message); this.name = 'ApiHttpError' }
}
export class ApiTransportError extends Error {
  constructor() { super('Cannot reach the API. Check the backend connection and retry.'); this.name = 'ApiTransportError' }
}
export class ApiContractError extends Error {
  constructor() { super('The API returned an invalid response. Refresh or contact the administrator.'); this.name = 'ApiContractError' }
}
interface RequestOptions extends RequestInit {
  idempotencyKey?: string
  params?: Record<string, string | number | boolean | undefined | null>
}
export async function request<T>(endpoint: string, schema: z.ZodType<T>, options: RequestOptions = {}): Promise<T> {
  const { params, idempotencyKey, headers: customHeaders, ...fetchOptions } = options
  const url = new URL(`${API_BASE_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`, window.location.origin)
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
  })
  const headers = new Headers(customHeaders)
  if (fetchOptions.body) headers.set('Content-Type', 'application/json')
  if (idempotencyKey) headers.set('Idempotency-Key', idempotencyKey)
  let response: Response
  try { response = await fetch(url, { ...fetchOptions, headers }) }
  catch (error) {
    if (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError') throw error
    throw new ApiTransportError()
  }
  let json: unknown
  try { json = await response.json() }
  catch {
    if (!response.ok) throw new ApiHttpError(response.status, `HTTP ${response.status}: ${response.statusText}`)
    throw new ApiContractError()
  }
  if (!response.ok) {
    const parsed = errorSchema.safeParse(json)
    throw new ApiHttpError(response.status, parsed.success ? parsed.data.error.message : `HTTP ${response.status}: ${response.statusText}`, parsed.success ? parsed.data : undefined)
  }
  const parsed = schema.safeParse(json)
  if (!parsed.success) throw new ApiContractError()
  return parsed.data
}
export const apiClient = {
  get: <T>(endpoint: string, schema: z.ZodType<T>, options?: RequestOptions) => request(endpoint, schema, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body: unknown, schema: z.ZodType<T>, options?: RequestOptions) => request(endpoint, schema, { ...options, method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(endpoint: string, body: unknown, schema: z.ZodType<T>, options?: RequestOptions) => request(endpoint, schema, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(endpoint: string, schema: z.ZodType<T>, options?: RequestOptions) => request(endpoint, schema, { ...options, method: 'DELETE' }),
}
export function fieldErrors(error: unknown): Record<string, string> {
  const errors: Record<string, string> = { form: error instanceof Error ? error.message : 'Request failed' }
  if (error instanceof ApiHttpError && Array.isArray(error.errorResponse?.error.details)) {
    for (const detail of error.errorResponse.error.details) {
      const parsed = z.object({ field: z.string(), message: z.string() }).safeParse(detail)
      if (parsed.success) {
        const field = parsed.data.field.replace(/^body\./, '')
        errors[field === 'price_paise' ? 'price_rupees' : field] = parsed.data.message
        errors.form += ` · ${field}: ${parsed.data.message}`
      }
    }
  }
  if (error instanceof ApiHttpError && error.status === 409 && /SKU/i.test(error.message)) errors.sku = error.message
  return errors
}
