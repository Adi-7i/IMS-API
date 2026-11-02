import { useState } from 'react'
import {
  Plus,
  RefreshCw,
  Eye,
  ShoppingCart,
  ArrowUpDown,
} from 'lucide-react'
import { orderService } from '@/services/order.service'
import { productService } from '@/services/product.service'
import { useDataState } from '@/hooks/use-data-state'
import { usePagination } from '@/hooks/use-pagination'
import { PageHeader } from '@/components/shared/page-header'
import { DisconnectedState } from '@/components/shared/disconnected-state'
import { EmptyState } from '@/components/shared/empty-state'
import { LoadingSkeleton } from '@/components/shared/loading-skeleton'
import { DataTablePagination } from '@/components/shared/data-table-pagination'
import { OrderStatusBadge } from '@/components/shared/status-badge'
import { CreateOrderDialog } from '@/components/orders/create-order-dialog'
import { OrderDetailDialog } from '@/components/orders/order-detail-dialog'
import { formatPaise } from '@/lib/currency'
import { formatDateTime } from '@/lib/date'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import type { OrderListItem, OrderStatus } from '@/types/order'

export function OrdersPage() {
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>('DESC')

  const { page, setPage } = usePagination(1, 20)

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<OrderListItem | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // Fetch products for order creation dialog dropdown
  const { data: productData } = useDataState(() => productService.getProducts({ limit: 100 }), [])
  const products = productData?.data ?? []

  // Fetch orders query
  const {
    data: orderData,
    isLoading,
    isDisconnected,
    reload,
  } = useDataState(
    () =>
      orderService.getOrders({
        page,
        limit: 20,
        status: selectedStatus !== 'all' ? (selectedStatus as OrderStatus) : undefined,
        sort_dir: sortDir,
      }),
    [page, selectedStatus, sortDir],
  )

  const orders = orderData?.data ?? []
  const pagination = orderData?.pagination

  const handleViewOrder = (order: OrderListItem) => {
    setSelectedOrder(order)
    setIsDetailOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Customer Orders"
        description="Process orders, inspect transaction fulfillment, and transition workflow statuses."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void reload()}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={isLoading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
              Refresh
            </Button>
            <Button onClick={() => setIsCreateOpen(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Create Order
            </Button>
          </div>
        }
      />

      {/* Disconnected Architecture Banner */}
      {isDisconnected && (
        <DisconnectedState
          title="Order Service Sync Pending (Phase 3)"
          description="In accordance with RetailOps Lite requirements, synthetic test transactions are not fabricated. Live order records from GET /api/orders will sync in Phase 3."
          endpoint="GET /api/orders"
          variant="inline"
        />
      )}

      {/* Filters and Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Status Tabs */}
            <Tabs
              value={selectedStatus}
              onValueChange={(val) => {
                setSelectedStatus(val)
                setPage(1)
              }}
              className="w-full sm:w-auto"
            >
              <TabsList className="grid grid-cols-5 w-full sm:w-auto h-9">
                <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                <TabsTrigger value="Pending" className="text-xs">Pending</TabsTrigger>
                <TabsTrigger value="Confirmed" className="text-xs">Confirmed</TabsTrigger>
                <TabsTrigger value="Completed" className="text-xs">Completed</TabsTrigger>
                <TabsTrigger value="Cancelled" className="text-xs">Cancelled</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Sort Direction Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSortDir((d) => (d === 'DESC' ? 'ASC' : 'DESC'))
                setPage(1)
              }}
              className="gap-2 text-xs h-9 shrink-0"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              {sortDir === 'DESC' ? 'Newest First' : 'Oldest First'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingSkeleton rows={6} />
          ) : isDisconnected ? (
            <DisconnectedState
              title="Order Records Integration Pending"
              description="Customer order entries will stream from GET /api/orders upon Phase 3 activation."
              endpoint="GET /api/orders"
              variant="table"
            />
          ) : orders.length === 0 ? (
            <EmptyState
              title="No orders found"
              description="No customer orders currently match the selected status filter."
              actionLabel="Create Order"
              onAction={() => setIsCreateOpen(true)}
              icon={<ShoppingCart className="h-6 w-6" />}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs font-semibold">
                          #{order.id}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground">{order.customer_name}</div>
                          {order.customer_email && (
                            <div className="text-xs text-muted-foreground">
                              {order.customer_email}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <OrderStatusBadge status={order.status} />
                        </TableCell>
                        <TableCell className="text-right font-semibold font-mono">
                          {formatPaise(order.total_amount_paise)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDateTime(order.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewOrder(order)}
                            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="border-t p-4">
                <DataTablePagination
                  pagination={pagination}
                  onPageChange={(p) => setPage(p)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Order Dialog */}
      <CreateOrderDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        products={products}
      />

      {/* Order Detail Dialog */}
      <OrderDetailDialog
        order={selectedOrder}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />
    </div>
  )
}
