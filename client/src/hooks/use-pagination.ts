import { useState, useCallback } from 'react'
import { APP_CONFIG } from '@/lib/constants'

export function usePagination(initialPage = 1, initialLimit = APP_CONFIG.defaultPageSize) {
  const [page, setPage] = useState(initialPage)
  const [limit, setLimit] = useState(initialLimit)

  const nextPage = useCallback(() => setPage((p) => p + 1), [])
  const prevPage = useCallback(() => setPage((p) => Math.max(1, p - 1)), [])
  const resetPage = useCallback(() => setPage(1), [])

  return {
    page,
    limit,
    setPage,
    setLimit,
    nextPage,
    prevPage,
    resetPage,
  }
}
