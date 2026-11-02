import { useState, useEffect, useCallback, useRef } from 'react'
import { isNotConnectedError } from '@/lib/api-client'
import type { ViewState } from '@/types/api'

interface UseDataStateOptions<T> {
  immediate?: boolean
  initialData?: T | null
  isEmpty?: (data: T) => boolean
}

export function useDataState<T>(
  asyncFn: () => Promise<T>,
  deps: unknown[] = [],
  options: UseDataStateOptions<T> = {},
) {
  const { immediate = true, initialData = null, isEmpty } = options

  const [state, setState] = useState<ViewState>('loading')
  const [data, setData] = useState<T | null>(initialData)
  const [error, setError] = useState<Error | null>(null)

  const asyncFnRef = useRef(asyncFn)
  asyncFnRef.current = asyncFn

  const execute = useCallback(async () => {
    setState('loading')
    setError(null)

    try {
      const result = await asyncFnRef.current()
      setData(result)

      const isDataEmpty = isEmpty
        ? isEmpty(result)
        : Array.isArray(result)
          ? result.length === 0
          : result === null || result === undefined

      setState(isDataEmpty ? 'empty' : 'success')
      return result
    } catch (err) {
      if (isNotConnectedError(err)) {
        setState('disconnected')
        setError(err)
      } else {
        setState('error')
        setError(err instanceof Error ? err : new Error(String(err)))
      }
      return null
    }
  }, [isEmpty])

  useEffect(() => {
    if (immediate) {
      void execute()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [execute, immediate, ...deps])

  return {
    state,
    data,
    error,
    execute,
    reload: execute,
    isDisconnected: state === 'disconnected',
    isLoading: state === 'loading',
    isEmpty: state === 'empty',
    isError: state === 'error',
    isSuccess: state === 'success',
  }
}
