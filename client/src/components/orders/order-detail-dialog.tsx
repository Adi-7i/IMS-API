import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { OrderStatusBadge } from '@/components/shared/status-badge'
import { ErrorState } from '@/components/shared/error-state'
import { LoadingSkeleton } from '@/components/shared/loading-skeleton'
import { ORDER_STATUS_TRANSITIONS } from '@/lib/status'
import { formatPaise } from '@/lib/currency'
import { formatDateTime } from '@/lib/date'
import { orderService } from '@/services/order.service'
import { useDataState } from '@/hooks/use-data-state'
import { useMutation } from '@/hooks/use-mutation'
import type { OrderListItem, OrderStatus } from '@/types/order'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'

interface OrderDetailDialogProps {
  order: OrderListItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OrderDetailDialog({ order, open, onOpenChange }: OrderDetailDialogProps) {
  const detail = useDataState(signal => {
    if (!order) throw new Error('Select an order')
    return orderService.getOrderById(order.id, signal)
  }, [order?.id, open], { immediate: open && !!order })
  const mutation = useMutation()

  async function transition(status: OrderStatus) {
    if (!detail.data) return
    const id = detail.data.id
    const updated = await mutation.run({ id, status }, () => orderService.updateStatus(id, status))
    if (updated) {
      toast.success(`Order ${status.toLowerCase()}`)
      // The service broadcasts a change; mounted detail and list queries refetch.
    }
  }

  return (
    <Dialog open={open} onOpenChange={value => { if (!mutation.pending) onOpenChange(value) }}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Order {order?.order_number}</DialogTitle>
          <DialogDescription>Customer, items, and fulfillment history</DialogDescription>
        </DialogHeader>
        {detail.isLoading ? (
          <LoadingSkeleton rows={3} />
        ) : detail.isError ? (
          <ErrorState description={detail.error?.message} onRetry={() => void detail.reload()} />
        ) : detail.data && (
          <>
            <div className="rounded-lg border p-3.5 bg-muted/20 space-y-2 text-sm">
              <div className="flex justify-between">
                <strong>{detail.data.customer_name}</strong>
                <OrderStatusBadge status={detail.data.status} />
              </div>
              <p className="text-xs text-muted-foreground">
                Placed on {formatDateTime(detail.data.created_at)}
              </p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product / SKU</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.data.items.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.product_name}
                      <div className="text-xs text-muted-foreground">{item.product_sku}</div>
                    </TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{formatPaise(item.unit_price_paise)}</TableCell>
                    <TableCell>{formatPaise(item.line_total_paise)}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3}>Order Total</TableCell>
                  <TableCell className="font-bold">{formatPaise(detail.data.total_paise)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <div className="space-y-2 border-t pt-4">
              <h4 className="text-xs font-semibold uppercase">Status History</h4>
              {detail.data.status_history.map(entry => (
                <p key={entry.id} className="text-xs text-muted-foreground">
                  {entry.previous_status ?? 'Created'} → {entry.new_status} · {formatDateTime(entry.created_at)}
                </p>
              ))}
            </div>
            <div className="space-y-2 border-t pt-4">
              <h4 className="text-xs font-semibold uppercase">Status Actions</h4>
              {mutation.errors.form && (
                <p role="alert" className="text-sm text-destructive">{mutation.errors.form}</p>
              )}
              {ORDER_STATUS_TRANSITIONS[detail.data.status].length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  This order is {detail.data.status.toLowerCase()}. No further transitions are available.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {ORDER_STATUS_TRANSITIONS[detail.data.status].map(status => (
                    <Button
                      key={status}
                      size="sm"
                      variant={status === 'Cancelled' ? 'destructive' : 'default'}
                      disabled={mutation.pending}
                      onClick={() => void transition(status)}
                    >
                      Mark as {status}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={mutation.pending} onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
