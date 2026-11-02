import { useState } from 'react'
import {
  Boxes,
  AlertTriangle,
  History,
  RefreshCw,
  PlusCircle,
  SlidersHorizontal,
} from 'lucide-react'
import { inventoryService } from '@/services/inventory.service'
import { productService } from '@/services/product.service'
import { useDataState } from '@/hooks/use-data-state'
import { usePagination } from '@/hooks/use-pagination'
import { PageHeader } from '@/components/shared/page-header'
import { DisconnectedState } from '@/components/shared/disconnected-state'
import { EmptyState } from '@/components/shared/empty-state'
import { LoadingSkeleton } from '@/components/shared/loading-skeleton'
import { DataTablePagination } from '@/components/shared/data-table-pagination'
import { MovementTypeBadge } from '@/components/shared/status-badge'
import { StockAdjustmentDialog } from '@/components/inventory/stock-adjustment-dialog'
import { formatDateTime } from '@/lib/date'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { MovementType } from '@/types/inventory'
import type { Product } from '@/types/product'

export function InventoryPage() {
  const [activeTab, setActiveTab] = useState<'low-stock' | 'movements'>('low-stock')
  const [selectedMovementType, setSelectedMovementType] = useState<string>('all')
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false)
  const [targetProduct, setTargetProduct] = useState<Product | null>(null)

  const { page, setPage } = usePagination(1, 20)

  // Fetch product list for adjustment dropdown
  const { data: productData } = useDataState(() => productService.getProducts({ limit: 100 }), [])
  const products = productData?.data ?? []

  // Fetch low-stock products
  const {
    data: lowStockProducts,
    isLoading: isLowStockLoading,
    isDisconnected: isLowStockDisconnected,
    reload: reloadLowStock,
  } = useDataState(
    () => inventoryService.getLowStock({ include_out_of_stock: 'true' }),
    [],
  )

  // Fetch movements
  const {
    data: movementData,
    isLoading: isMovementsLoading,
    isDisconnected: isMovementsDisconnected,
    reload: reloadMovements,
  } = useDataState(
    () =>
      inventoryService.getMovements({
        page,
        limit: 20,
        movement_type:
          selectedMovementType !== 'all'
            ? (selectedMovementType as MovementType)
            : undefined,
      }),
    [page, selectedMovementType],
  )

  const movements = movementData?.data ?? []
  const movementsPagination = movementData?.pagination

  const handleOpenAdjustment = (prod?: Product) => {
    setTargetProduct(prod || null)
    setIsAdjustmentOpen(true)
  }

  const handleRefresh = () => {
    if (activeTab === 'low-stock') {
      void reloadLowStock()
    } else {
      void reloadMovements()
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Inventory & Stock Control"
        description="Monitor low-stock items, reconcile physical balances, and audit stock movement ledger."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLowStockLoading || isMovementsLoading}
              className="gap-2"
            >
              <RefreshCw
                className={
                  isLowStockLoading || isMovementsLoading
                    ? 'h-4 w-4 animate-spin'
                    : 'h-4 w-4'
                }
              />
              Refresh
            </Button>
            <Button onClick={() => handleOpenAdjustment()} size="sm" className="gap-2">
              <PlusCircle className="h-4 w-4" />
              Adjust Stock
            </Button>
          </div>
        }
      />

      {/* Disconnected Architecture Banner */}
      {(isLowStockDisconnected || isMovementsDisconnected) && (
        <DisconnectedState
          title="Inventory Services Sync Pending (Phase 3)"
          description="In accordance with RetailOps Lite requirements, synthetic stock records are strictly avoided. Live inventory contracts connect in Phase 3."
          endpoint={
            activeTab === 'low-stock'
              ? 'GET /api/inventory/low-stock'
              : 'GET /api/inventory/movements'
          }
          variant="inline"
        />
      )}

      {/* Tabs Layout */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as 'low-stock' | 'movements')}
      >
        <TabsList className="grid grid-cols-2 w-full max-w-md h-10">
          <TabsTrigger value="low-stock" className="gap-2 text-xs">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Stock Health & Alerts
          </TabsTrigger>
          <TabsTrigger value="movements" className="gap-2 text-xs">
            <History className="h-4 w-4 text-primary" />
            Movement Audit Trail
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Low Stock Alerts & Health */}
        <TabsContent value="low-stock" className="space-y-4 pt-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Boxes className="h-4 w-4 text-primary" />
                Safety Stock Deficit Analysis
              </CardTitle>
              <CardDescription>
                SKUs with current available quantity at or below configured threshold
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLowStockLoading ? (
                <LoadingSkeleton rows={5} />
              ) : isLowStockDisconnected ? (
                <DisconnectedState
                  title="Stock Alerts Integration Pending"
                  description="Real inventory levels will sync from GET /api/inventory/low-stock in Phase 3."
                  endpoint="GET /api/inventory/low-stock"
                  variant="table"
                />
              ) : !lowStockProducts || lowStockProducts.length === 0 ? (
                <EmptyState
                  title="No low stock items"
                  description="All inventory levels are currently above configured safety thresholds."
                  icon={<Boxes className="h-6 w-6" />}
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-right">Current Stock</TableHead>
                        <TableHead className="text-right">Threshold</TableHead>
                        <TableHead className="text-right">Deficit</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lowStockProducts.map((prod) => {
                        const deficit = Math.max(0, prod.low_stock_threshold - prod.stock_quantity)
                        return (
                          <TableRow key={prod.id}>
                            <TableCell className="font-medium">{prod.name}</TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {prod.sku}
                            </TableCell>
                            <TableCell className="text-right">
                              <span
                                className={
                                  prod.stock_quantity === 0
                                    ? 'font-bold text-rose-600 dark:text-rose-400'
                                    : 'font-semibold text-amber-600 dark:text-amber-400'
                                }
                              >
                                {prod.stock_quantity}
                              </span>
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {prod.low_stock_threshold}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs text-rose-600">
                              -{deficit} units
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenAdjustment(prod)}
                                className="h-8 gap-1.5 text-xs"
                              >
                                <SlidersHorizontal className="h-3.5 w-3.5" />
                                Adjust
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Movement Audit Trail */}
        <TabsContent value="movements" className="space-y-4 pt-2">
          {/* Movement Type Filter */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-muted-foreground">
                  Filter by Movement Type:
                </span>
                <Select
                  value={selectedMovementType}
                  onValueChange={(val) => {
                    setSelectedMovementType(val)
                    setPage(1)
                  }}
                >
                  <SelectTrigger className="w-[200px] h-9 text-xs">
                    <SelectValue placeholder="All Movement Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Movements</SelectItem>
                    <SelectItem value="initial">Initial Stock (+)</SelectItem>
                    <SelectItem value="sale">Sale Deductions (-)</SelectItem>
                    <SelectItem value="cancellation_reversal">
                      Order Cancellations (+)
                    </SelectItem>
                    <SelectItem value="adjustment">Manual Adjustments</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Movements Ledger Table */}
          <Card>
            <CardContent className="p-0">
              {isMovementsLoading ? (
                <LoadingSkeleton rows={6} />
              ) : isMovementsDisconnected ? (
                <DisconnectedState
                  title="Movement Audit Ledger Pending"
                  description="Real immutable movement records will sync from GET /api/inventory/movements in Phase 3."
                  endpoint="GET /api/inventory/movements"
                  variant="table"
                />
              ) : movements.length === 0 ? (
                <EmptyState
                  title="No stock movements recorded"
                  description="No transactions or adjustments match the selected criteria."
                  icon={<History className="h-6 w-6" />}
                />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Movement #</TableHead>
                          <TableHead>Product / SKU</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead>Reason / Notes</TableHead>
                          <TableHead className="text-right">Timestamp</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {movements.map((m) => (
                          <TableRow key={m.id}>
                            <TableCell className="font-mono text-xs">#{m.id}</TableCell>
                            <TableCell>
                              <div className="font-medium text-foreground">
                                {m.product_name || `Product #${m.product_id}`}
                              </div>
                              {m.product_sku && (
                                <div className="font-mono text-xs text-muted-foreground">
                                  {m.product_sku}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <MovementTypeBadge type={m.movement_type} />
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold">
                              {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                              {m.reason || '—'}
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">
                              {formatDateTime(m.created_at)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="border-t p-4">
                    <DataTablePagination
                      pagination={movementsPagination}
                      onPageChange={(p) => setPage(p)}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Stock Adjustment Dialog */}
      <StockAdjustmentDialog
        open={isAdjustmentOpen}
        onOpenChange={setIsAdjustmentOpen}
        product={targetProduct}
        products={products}
      />
    </div>
  )
}
