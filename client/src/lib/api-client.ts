import { API_BASE_URL } from './constants'
import type { ApiErrorResponse } from '@/types/api'

/**
 * Custom error thrown when API calls are made prior to Phase 3 live integration.
 * In Phase 2, all API service calls intentionally throw this error to display
 * genuine, honest "Integration Pending" / "Disconnected" UI states without synthetic data.
 */
export class NotConnectedError extends Error {
  public readonly endpoint?: string

  constructor(serviceOrEndpoint: string) {
    super(
      `[RetailOps Lite] ${serviceOrEndpoint} is not connected. Real API integration is scheduled for Phase 3.`,
    )
    this.name = 'NotConnectedError'
    this.endpoint = serviceOrEndpoint
  }
}

export function isNotConnectedError(err: unknown): err is NotConnectedError {
  return err instanceof NotConnectedError || (err instanceof Error && err.name === 'NotConnectedError')
}

export class ApiHttpError extends Error {
  public readonly status: number
  public readonly errorResponse?: ApiErrorResponse

  constructor(status: number, message: string, errorResponse?: ApiErrorResponse) {
    super(message)
    this.name = 'ApiHttpError'
    this.status = status
    this.errorResponse = errorResponse
  }
}

interface RequestOptions extends RequestInit {
  idempotencyKey?: string
  params?: Record<string, string | number | boolean | undefined | null>
}

/**
 * Production-ready typed HTTP client configured for RetailOps Lite REST API.
 * Ready for Phase 3 activation.
 */
export async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  // Phase 2 constraint: Real API integration is strictly in Phase 3.
  // Throws NotConnectedError to ensure honest, un-mocked application state.
  const connectRealApi = import.meta.env.VITE_CONNECT_REAL_API === 'true'
  if (!connectRealApi) {
    throw new NotConnectedError(endpoint)
  }

  const { params, idempotencyKey, headers: customHeaders, ...fetchOptions } = options

  const url = new URL(`${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    })
  }

  const headers = new Headers(customHeaders)
  if (!headers.has('Content-Type') && fetchOptions.body) {
    headers.set('Content-Type', 'application/json')
  }
  if (idempotencyKey) {
    headers.set('Idempotency-Key', idempotencyKey)
  }

  const response = await fetch(url.toString(), {
    ...fetchOptions,
    headers,
  })

  if (!response.ok) {
    let errorJson: ApiErrorResponse | undefined
    try {
      errorJson = await response.json()
    } catch {
      // not JSON
    }
    const message = errorJson?.error?.message || `HTTP ${response.status}: ${response.statusText}`
    throw new ApiHttpError(response.status, message, errorJson)
  }

  return response.json() as Promise<T>
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
}
