import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PaginationMeta } from '@/types/api'

interface DataTablePaginationProps {
  pagination?: PaginationMeta | null
  onPageChange: (newPage: number) => void
  disabled?: boolean
}

export function DataTablePagination({
  pagination,
  onPageChange,
  disabled = false,
}: DataTablePaginationProps) {
  if (!pagination || pagination.total_pages <= 1) {
    return null
  }

  const { page, total, limit, total_pages } = pagination
  const start = (page - 1) * limit + 1
  const end = Math.min(page * limit, total)

  return (
    <div className="flex flex-col items-center justify-between gap-4 px-2 py-4 sm:flex-row">
      <div className="text-xs text-muted-foreground">
        Showing <span className="font-medium text-foreground">{start}</span> to{' '}
        <span className="font-medium text-foreground">{end}</span> of{' '}
        <span className="font-medium text-foreground">{total}</span> entries
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground mr-2">
          Page {page} of {total_pages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || disabled}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Previous page</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= total_pages || disabled}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Next page</span>
        </Button>
      </div>
    </div>
  )
}
