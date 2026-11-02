import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/cn'
import { CardSkeleton } from './loading-skeleton'
import { Link2Off } from 'lucide-react'

interface KpiCardProps {
  title: string
  value?: string | number | null
  subtitle?: string
  icon: ReactNode
  trend?: {
    value: string
    positive: boolean
  }
  isDisconnected?: boolean
  isLoading?: boolean
  className?: string
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  isDisconnected = false,
  isLoading = false,
  className,
}: KpiCardProps) {
  if (isLoading) {
    return <CardSkeleton className={className} />
  }

  return (
    <Card className={cn('relative overflow-hidden transition-all duration-200 hover:shadow-xs', className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
        </div>

        <div className="mt-4">
          {isDisconnected ? (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold tracking-tight text-muted-foreground">—</span>
              <Badge
                variant="outline"
                className="gap-1 border-amber-300 bg-amber-50/70 text-[10px] text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
              >
                <Link2Off className="h-3 w-3" />
                Pending
              </Badge>
            </div>
          ) : (
            <div className="text-2xl font-bold tracking-tight text-foreground">{value ?? '—'}</div>
          )}
        </div>

        {(subtitle || trend) && (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            {trend && !isDisconnected && (
              <span
                className={cn(
                  'font-medium',
                  trend.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
                )}
              >
                {trend.positive ? '↑' : '↓'} {trend.value}
              </span>
            )}
            {subtitle && <span>{subtitle}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
