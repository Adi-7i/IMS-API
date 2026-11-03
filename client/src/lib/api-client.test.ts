import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { apiClient, ApiContractError, ApiHttpError, ApiTransportError, fieldErrors } from './api-client'
import { envelope } from './api-schemas'
afterEach(() => vi.unstubAllGlobals())
describe('Fetch API contract handling', () => {
  it('forwards supported query values, cancellation, and the supplied idempotency key', async () => {
    const fetcher = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ success: true, data: { id: 1 } })))
    vi.stubGlobal('fetch', fetcher)
    const controller = new AbortController()
    await apiClient.get('/products', envelope(z.object({ id: z.number() })), { params: { page: 2, is_active: 0, empty: undefined }, signal: controller.signal })
    const [url, options] = fetcher.mock.calls[0]
    expect(String(url)).toContain('page=2&is_active=0')
    expect(options.signal).toBe(controller.signal)
    await apiClient.post('/orders', {}, envelope(z.object({ id: z.number() })), { idempotencyKey: 'logical-operation' })
    expect(fetcher.mock.calls[1][1].headers.get('Idempotency-Key')).toBe('logical-operation')
  })
  it('distinguishes transport, HTTP validation, and malformed success responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(apiClient.get('/products', z.unknown())).rejects.toBeInstanceOf(ApiTransportError)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', details: [{ field: 'price_paise', message: 'Must be non-negative' }] } }), { status: 400 })))
    try { await apiClient.get('/products', z.unknown()) } catch (error) {
      expect(error).toBeInstanceOf(ApiHttpError)
      expect(fieldErrors(error).price_rupees).toBe('Must be non-negative')
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: { wrong: 1 } }))))
    await expect(apiClient.get('/products', envelope(z.object({ id: z.number() })))).rejects.toBeInstanceOf(ApiContractError)
  })
  it('preserves cancellation and server failures without fabricating successful empty data', async () => {
    const aborted = new DOMException('Aborted', 'AbortError')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(aborted))
    await expect(apiClient.get('/products', z.unknown())).rejects.toBe(aborted)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Unavailable', { status: 503 })))
    await expect(apiClient.get('/products', z.unknown())).rejects.toMatchObject({ status: 503 })
  })
})
