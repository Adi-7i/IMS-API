import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { OrderStatusBadge } from '@/components/shared/status-badge'
import { DisconnectedState } from '@/components/shared/disconnected-state'
import { ORDER_STATUS_TRANSITIONS } from '@/lib/status'
import { formatPaise } from '@/lib/currency'
import { formatDateTime } from '@/lib/date'
import type { OrderListItem, OrderStatus } from '@/types/order'
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@/components/ui/table'
import { User, Phone, Mail, Calendar, FileText } from 'lucide-react'

interface OrderDetailDialogProps {
  order: OrderListItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OrderDetailDialog({
  order,
  open,
  onOpenChange,
}: OrderDetailDialogProps) {
  if (!order) return null

  const nextTransitions: OrderStatus[] = ORDER_STATUS_TRANSITIONS[order.status] || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-4">
            <DialogTitle className="text-xl">Order #{order.id}</DialogTitle>
            <OrderStatusBadge status={order.status} />
          </div>
          <DialogDescription className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
            <Calendar className="h-3.5 w-3.5" />
            Placed on {formatDateTime(order.created_at)}
          </DialogDescription>
        </DialogHeader>

        {/* Customer Information Card */}
        <div className="rounded-lg border p-3.5 bg-muted/20 space-y-2 text-xs">
          <div className="font-semibold text-foreground flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-primary" />
            <span>{order.customer_name}</span>
          </div>
          <div className="flex flex-wrap gap-4 text-muted-foreground">
            {order.customer_email && (
              <div className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                <span>{order.customer_email}</span>
              </div>
            )}
            {order.customer_phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                <span>{order.customer_phone}</span>
              </div>
            )}
          </div>
          {order.notes && (
            <div className="flex items-start gap-1.5 border-t pt-2 text-muted-foreground">
              <FileText className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{order.notes}</span>
            </div>
          )}
        </div>

        {/* Order Line Items */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Line Items & Calculation
          </h4>

          {/* Phase 2 Honest Notice */}
          <DisconnectedState
            title="Line Items Sync Pending"
            description="Itemized breakdown with pricing and quantities loads from GET /api/orders/:id in Phase 3."
            endpoint={`GET /api/orders/${order.id}`}
            variant="table"
          />

          <div className="rounded-md border p-3 bg-muted/10">
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Order Total Amount</TableCell>
                  <TableCell className="text-right font-bold text-base">
                    {formatPaise(order.total_amount_paise)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Order Workflow State Transitions */}
        <div className="space-y-2 border-t pt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Status Actions (State Machine)
          </h4>
          {nextTransitions.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              This order is in a terminal state ({order.status}). No further transitions allowed.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {nextTransitions.map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={status === 'Cancelled' ? 'destructive' : 'default'}
                  disabled
                  title="Status mutation disabled in Phase 2. Live API sync connects in Phase 3."
                  className="text-xs"
                >
                  Mark as {status} (Pending Phase 3)
                </Button>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
