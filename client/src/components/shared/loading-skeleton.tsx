import { cn } from '@/lib/cn'

interface LoadingSkeletonProps {
  className?: string
  rows?: number
}

export function LoadingSkeleton({ className, rows = 4 }: LoadingSkeletonProps) {
  return (
    <div className={cn('space-y-3 p-4', className)}>
      <div className="h-6 w-1/3 animate-pulse rounded-md bg-muted" />
      <div className="space-y-2 pt-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-9 w-full animate-pulse rounded-md bg-muted/60" />
        ))}
      </div>
    </div>
  )
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border bg-card p-6 shadow-xs', className)}>
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 animate-pulse rounded-md bg-muted" />
        <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="mt-4 h-7 w-32 animate-pulse rounded-md bg-muted" />
      <div className="mt-2 h-3 w-40 animate-pulse rounded-md bg-muted/70" />
    </div>
  )
}
