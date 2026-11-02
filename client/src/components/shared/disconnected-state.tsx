import { Link2Off, Sparkles, Server } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/cn'

interface DisconnectedStateProps {
  title?: string
  description?: string
  endpoint?: string
  className?: string
  variant?: 'card' | 'table' | 'inline'
}

export function DisconnectedState({
  title = 'Integration Pending',
  description = 'Live API integration is scheduled for Phase 3. Real backend contracts are defined, and synthetic mock data is strictly prohibited.',
  endpoint,
  className,
  variant = 'card',
}: DisconnectedStateProps) {
  if (variant === 'inline') {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border border-dashed border-amber-300 bg-amber-50/60 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300',
          className,
        )}
      >
        <Link2Off className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <span className="font-medium">{title}</span>
        {endpoint && (
          <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[11px] text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
            {endpoint}
          </code>
        )}
      </div>
    )
  }

  if (variant === 'table') {
    return (
      <div
        className={cn(
          'flex min-h-[280px] flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/20 p-8 text-center',
          className,
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100/80 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
          <Link2Off className="h-6 w-6" />
        </div>
        <div className="mt-4 flex items-center justify-center gap-2">
          <Badge
            variant="outline"
            className="border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
          >
            Phase 3 Integration Pending
          </Badge>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Backend Frozen & Ready
          </span>
        </div>
        <h3 className="mt-3 text-base font-semibold tracking-tight text-foreground">{title}</h3>
        <p className="mt-1.5 max-w-md text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
        {endpoint && (
          <div className="mt-4 flex items-center gap-2 rounded-md border bg-background/80 px-3 py-1.5 text-xs text-muted-foreground">
            <Server className="h-3.5 w-3.5 text-primary" />
            <span>Target Contract:</span>
            <code className="font-mono font-medium text-foreground">{endpoint}</code>
          </div>
        )}
      </div>
    )
  }

  return (
    <Card
      className={cn(
        'relative overflow-hidden border-dashed bg-gradient-to-b from-muted/30 to-muted/10',
        className,
      )}
    >
      <div className="absolute right-3 top-3">
        <Badge
          variant="outline"
          className="border-amber-300/80 bg-amber-50/80 text-[11px] font-medium text-amber-800 dark:border-amber-800/80 dark:bg-amber-950/40 dark:text-amber-300"
        >
          Phase 3 Pending
        </Badge>
      </div>
      <CardContent className="flex flex-col items-center justify-center p-6 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100/70 text-amber-600 shadow-xs dark:bg-amber-950/50 dark:text-amber-400">
          <Link2Off className="h-5 w-5" />
        </div>
        <h4 className="mt-3 text-sm font-semibold tracking-tight text-foreground">{title}</h4>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground leading-relaxed">
          {description}
        </p>
        {endpoint && (
          <div className="mt-3 flex items-center gap-1.5 rounded bg-muted/60 px-2.5 py-1 text-[11px] text-muted-foreground">
            <Sparkles className="h-3 w-3 text-amber-500" />
            <code className="font-mono text-foreground">{endpoint}</code>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
