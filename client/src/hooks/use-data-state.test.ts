import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useDataState } from './use-data-state'
import { NotConnectedError } from '@/lib/api-client'

describe('useDataState hook', () => {
  it('correctly maps NotConnectedError to state="disconnected"', async () => {
    const disconnectedService = async () => {
      throw new NotConnectedError('GET /api/test')
    }

    const { result } = renderHook(() => useDataState(disconnectedService))

    await waitFor(() => {
      expect(result.current.state).toBe('disconnected')
    })

    expect(result.current.isDisconnected).toBe(true)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBeNull()
  })

  it('correctly sets state="success" when promise resolves with data', async () => {
    const successService = async () => ({ id: 1, name: 'Item 1' })

    const { result } = renderHook(() => useDataState(successService))

    await waitFor(() => {
      expect(result.current.state).toBe('success')
    })

    expect(result.current.isSuccess).toBe(true)
    expect(result.current.data).toEqual({ id: 1, name: 'Item 1' })
  })

  it('correctly sets state="empty" when promise resolves with empty array', async () => {
    const emptyService = async () => []

    const { result } = renderHook(() => useDataState(emptyService))

    await waitFor(() => {
      expect(result.current.state).toBe('empty')
    })

    expect(result.current.isEmpty).toBe(true)
  })

  it('correctly sets state="error" for real unexpected exceptions', async () => {
    const errorService = async () => {
      throw new Error('500 Internal Server Error')
    }

    const { result } = renderHook(() => useDataState(errorService))

    await waitFor(() => {
      expect(result.current.state).toBe('error')
    })

    expect(result.current.isError).toBe(true)
    expect(result.current.error?.message).toBe('500 Internal Server Error')
  })
})

it('ignores stale responses after the query changes', async () => {
  const { act } = await import('@testing-library/react')
  let resolveOld: (value: string) => void = () => {}
  const old = new Promise<string>(resolve => { resolveOld = resolve })
  const { result, rerender } = renderHook(({ query }) => useDataState(() => query === 'old' ? old : Promise.resolve('new'), [query]), { initialProps: { query: 'old' } })
  rerender({ query: 'new' })
  await waitFor(() => expect(result.current.data).toBe('new'))
  await act(async () => { resolveOld('old'); await old })
  expect(result.current.data).toBe('new')
})

it('refetches after a confirmed business mutation and shows errors separately from empty data', async () => {
  const { act } = await import('@testing-library/react')
  const { notifyDataChanged } = await import('@/lib/data-events')
  let calls = 0
  const { result } = renderHook(() => useDataState(async () => { calls++; if (calls > 1) throw new Error('Disconnected'); return [] }))
  await waitFor(() => expect(result.current.isEmpty).toBe(true))
  act(() => notifyDataChanged())
  await waitFor(() => expect(result.current.isError).toBe(true))
  expect(result.current.data).toBeNull()
  expect(result.current.error?.message).toBe('Disconnected')
})
