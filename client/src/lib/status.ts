import type { OrderStatus } from '@/types/order'
import type { MovementType } from '@/types/inventory'

export const ORDER_STATUSES: OrderStatus[] = ['Pending', 'Confirmed', 'Completed', 'Cancelled']

export const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; badgeVariant: 'default' | 'secondary' | 'outline' | 'destructive'; className: string }
> = {
  Pending: {
    label: 'Pending',
    badgeVariant: 'secondary',
    className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
  },
  Confirmed: {
    label: 'Confirmed',
    badgeVariant: 'default',
    className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
  },
  Completed: {
    label: 'Completed',
    badgeVariant: 'outline',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
  },
  Cancelled: {
    label: 'Cancelled',
    badgeVariant: 'destructive',
    className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800',
  },
}

/**
 * Valid state transitions enforced by the backend order state machine:
 * Pending -> Confirmed, Cancelled
 * Confirmed -> Completed, Cancelled
 * Completed -> (terminal)
 * Cancelled -> (terminal)
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  Pending: ['Confirmed', 'Cancelled'],
  Confirmed: ['Completed', 'Cancelled'],
  Completed: [],
  Cancelled: [],
}

export function canTransitionOrderStatus(current: OrderStatus, next: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[current]?.includes(next) ?? false
}

export const MOVEMENT_TYPE_CONFIG: Record<
  MovementType,
  { label: string; className: string; sign: '+' | '-' | '' }
> = {
  initial: {
    label: 'Initial Stock',
    className: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300',
    sign: '+',
  },
  sale: {
    label: 'Sale Deducted',
    className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400',
    sign: '-',
  },
  cancellation_reversal: {
    label: 'Order Restocked',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400',
    sign: '+',
  },
  adjustment: {
    label: 'Manual Adjustment',
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400',
    sign: '',
  },
}

export function isOrderStatus(value: string): value is OrderStatus {
  return ORDER_STATUSES.some(status => status === value)
}
export function isMovementType(value: string): value is MovementType {
  return ['initial', 'sale', 'cancellation_reversal', 'adjustment'].some(type => type === value)
}
