import { Badge } from '@/components/ui/badge'
import { ORDER_STATUS_CONFIG, MOVEMENT_TYPE_CONFIG } from '@/lib/status'
import type { OrderStatus } from '@/types/order'
import type { MovementType } from '@/types/inventory'
import { cn } from '@/lib/cn'

interface OrderStatusBadgeProps {
  status: OrderStatus
  className?: string
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const config = ORDER_STATUS_CONFIG[status] || {
    label: status,
    badgeVariant: 'outline',
    className: '',
  }

  return (
    <Badge
      variant={config.badgeVariant}
      className={cn('font-medium shadow-none text-xs px-2.5 py-0.5 border', config.className, className)}
    >
      {config.label}
    </Badge>
  )
}

interface MovementTypeBadgeProps {
  type: MovementType
  className?: string
}

export function MovementTypeBadge({ type, className }: MovementTypeBadgeProps) {
  const config = MOVEMENT_TYPE_CONFIG[type] || {
    label: type,
    className: '',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  )
}
