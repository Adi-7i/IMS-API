import { AlertCircle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'

interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'An error occurred while fetching data from the server. Please check your network or try again.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[260px] flex-col items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center',
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-base font-semibold tracking-tight text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      {onRetry && (
        <div className="mt-5">
          <Button onClick={onRetry} variant="outline" size="sm" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Try again
          </Button>
        </div>
      )}
    </div>
  )
}
