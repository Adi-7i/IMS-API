import { useState, useEffect, useCallback, useRef } from 'react'
import { isNotConnectedError } from '@/lib/api-client'
import { DATA_CHANGED } from '@/lib/data-events'
import type { ViewState } from '@/types/api'
interface UseDataStateOptions<T> {
  immediate?: boolean
  initialData?: T | null
  isEmpty?: (data: T) => boolean
}
export function useDataState<T>(asyncFn: (signal: AbortSignal) => Promise<T>, deps: unknown[] = [], options: UseDataStateOptions<T> = {}) {
  const { immediate = true, initialData = null } = options
  const [state, setState] = useState<ViewState>('loading')
  const [data, setData] = useState<T | null>(initialData)
  const [error, setError] = useState<Error | null>(null)
  const asyncFnRef = useRef(asyncFn)
  const optionsRef = useRef(options)
  const controller = useRef<AbortController | null>(null)
  useEffect(() => {
    asyncFnRef.current = asyncFn
    optionsRef.current = options
  }, [asyncFn, options])
  const execute = useCallback(async () => {
    controller.current?.abort()
    const current = new AbortController()
    controller.current = current
    setState('loading'); setError(null); setData(null)
    try {
      const result = await asyncFnRef.current(current.signal)
      if (current.signal.aborted) return null
      setData(result)
      const empty = optionsRef.current.isEmpty?.(result) ?? (Array.isArray(result) ? result.length === 0 : result == null)
      setState(empty ? 'empty' : 'success')
      return result
    } catch (err) {
      if (current.signal.aborted) return null
      setError(err instanceof Error ? err : new Error(String(err)))
      setState(isNotConnectedError(err) ? 'disconnected' : 'error')
      return null
    }
  }, [])
  useEffect(() => {
    if (immediate) void execute()
    const refresh = () => { if (immediate) void execute() }
    window.addEventListener(DATA_CHANGED, refresh)
    return () => { controller.current?.abort(); window.removeEventListener(DATA_CHANGED, refresh) }
  }, [execute, immediate, ...deps])
  return { state, data, error, execute, reload: execute, isDisconnected: state === 'disconnected', isLoading: state === 'loading', isEmpty: state === 'empty', isError: state === 'error', isSuccess: state === 'success' }
}
