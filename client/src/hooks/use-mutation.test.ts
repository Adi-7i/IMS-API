import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useMutation } from './use-mutation'
import { ApiHttpError, ApiTransportError } from '@/lib/api-client'

describe('mutation consistency', () => {
  it('retains the key after a lost response, locks changed payloads, and starts a new logical operation after success', async () => {
    const { result } = renderHook(useMutation)
    const keys: string[] = []
    await act(async () => { await result.current.run({ delta: 2 }, async key => { keys.push(key); throw new ApiTransportError() }, true) })
    expect(result.current.uncertain).toBe(true)
    const changed = vi.fn()
    await act(async () => { await result.current.run({ delta: 3 }, changed, true) })
    expect(changed).not.toHaveBeenCalled()
    await act(async () => { await result.current.run({ delta: 2 }, async key => { keys.push(key); return { saved: true } }, true) })
    expect(keys[1]).toBe(keys[0])
    expect(result.current.uncertain).toBe(false)
    await act(async () => { await result.current.run({ delta: 2 }, async key => { keys.push(key); return true }, true) })
    expect(keys[2]).not.toBe(keys[0])
  })
  it('blocks simultaneous submissions and surfaces conflicting idempotency keys', async () => {
    const { result } = renderHook(useMutation)
    let finish: (value: boolean) => void = () => {}
    const waiting = new Promise<boolean>(resolve => { finish = resolve })
    const duplicate = vi.fn()
    await act(async () => {
      const first = result.current.run({}, () => waiting, true)
      await result.current.run({}, duplicate, true)
      finish(true); await first
    })
    expect(duplicate).not.toHaveBeenCalled()
    await act(async () => { await result.current.run({}, async () => { throw new ApiHttpError(409, 'Idempotency-Key reused with a different request payload.') }, true) })
    expect(result.current.errors.form).toContain('Idempotency-Key')
    expect(result.current.uncertain).toBe(false)
  })
})
