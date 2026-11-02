import { useState } from 'react'
import {
  Package,
  AlertTriangle,
  ShoppingCart,
  IndianRupee,
  RefreshCw,
  TrendingUp,
  Clock,
} from 'lucide-react'
import { dashboardService } from '@/services/dashboard.service'
import { useDataState } from '@/hooks/use-data-state'
import { PageHeader } from '@/components/shared/page-header'
import { KpiCard } from '@/components/shared/kpi-card'
import { DisconnectedState } from '@/components/shared/disconnected-state'
import { OrderStatusBadge } from '@/components/shared/status-badge'
import { formatPaise } from '@/lib/currency'
import { formatDate } from '@/lib/date'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'

export function DashboardPage() {
  const [rangeDays, setRangeDays] = useState<number>(7)

  const {
    data: summary,
    isLoading,
    isDisconnected,
    reload,
  } = useDataState(() => dashboardService.getSummary(rangeDays), [rangeDays])

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Operations Dashboard"
        description="Real-time sales performance, inventory thresholds, and order activity."
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
          </div>
        }
      />

      {/* Disconnected State Architecture Banner */}
      {isDisconnected && (
        <DisconnectedState
          title="Live Dashboard Sync Pending (Phase 3)"
          description="In accordance with RetailOps Lite architecture, synthetic mock metrics are strictly forbidden. The backend contracts are defined at /api/dashboard/summary, and full live streaming connects in Phase 3."
          endpoint="GET /api/dashboard/summary"
          variant="inline"
        />
      )}

      {/* 4 KPI Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Active Products"
          value={summary?.products?.total_active}
          subtitle="In active catalog"
          icon={<Package className="h-5 w-5" />}
          isDisconnected={isDisconnected}
          isLoading={isLoading}
        />
        <KpiCard
          title="Low Stock Warnings"
          value={summary?.inventory?.low_stock_count}
          subtitle={`${summary?.inventory?.out_of_stock_count ?? 0} out of stock`}
          icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
          isDisconnected={isDisconnected}
          isLoading={isLoading}
        />
        <KpiCard
          title="Orders Today"
          value={summary?.orders?.today_orders}
          subtitle="Processed today"
          icon={<ShoppingCart className="h-5 w-5" />}
          isDisconnected={isDisconnected}
          isLoading={isLoading}
        />
        <KpiCard
          title="Total Revenue"
          value={summary?.orders?.total_revenue_paise ? formatPaise(summary.orders.total_revenue_paise) : '₹0.00'}
          subtitle="Completed sales"
          icon={<IndianRupee className="h-5 w-5" />}
          isDisconnected={isDisconnected}
          isLoading={isLoading}
        />
      </div>

      {/* Sales Trend Chart & Orders Breakdown */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Sales Trend Chart (4 cols) */}
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Sales & Revenue Trend
              </CardTitle>
              <CardDescription>
                Historical sales volume and revenue over time
              </CardDescription>
            </div>
            <Tabs
              value={String(rangeDays)}
              onValueChange={(val) => setRangeDays(Number(val))}
              className="w-auto"
            >
              <TabsList className="grid grid-cols-2 h-8">
                <TabsTrigger value="7" className="text-xs">7 Days</TabsTrigger>
                <TabsTrigger value="30" className="text-xs">30 Days</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="pt-4">
            {isDisconnected ? (
              <DisconnectedState
                title="Sales Trend Data Pending"
                description={`Awaiting live connection to GET /api/dashboard/summary?days=${rangeDays}. Charts will render automatically once Phase 3 integration is activated.`}
                endpoint={`GET /api/dashboard/summary?days=${rangeDays}`}
                variant="table"
              />
            ) : summary?.daily_trend && summary.daily_trend.length > 0 ? (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={summary.daily_trend}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      fontSize={12}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      fontSize={12}
                      tickFormatter={(val: number) => `₹${val / 100}`}
                    />
                    <Tooltip
                      formatter={(val) => [formatPaise(Number(val) || 0), 'Revenue']}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue_paise"
                      stroke="hsl(var(--primary))"
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                No trend data available for this range.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Status Distribution (3 cols) */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Order Status Distribution
            </CardTitle>
            <CardDescription>
              Fulfillment funnel and operational backlog
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isDisconnected ? (
              <DisconnectedState
                title="Status Breakdown Pending"
                description="Backend order counts by status (Pending, Confirmed, Completed, Cancelled) will populate upon connection."
                endpoint="GET /api/dashboard/summary"
                variant="card"
              />
            ) : (
              <div className="space-y-4">
                {(['Pending', 'Confirmed', 'Completed', 'Cancelled'] as const).map((status) => {
                  const count = summary?.orders?.orders_by_status?.[status] ?? 0
                  return (
                    <div
                      key={status}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <OrderStatusBadge status={status} />
                      <span className="font-semibold text-foreground">{count}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Grid: Recent Orders & Low Stock Alerts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
              <CardDescription>Latest customer transactions</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {isDisconnected ? (
              <DisconnectedState
                title="Recent Orders Pending"
                description="Live customer transactions from /api/orders will appear here."
                endpoint="GET /api/orders?limit=5"
                variant="table"
              />
            ) : summary?.recent_orders && summary.recent_orders.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.recent_orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.customer_name}</TableCell>
                        <TableCell>
                          <OrderStatusBadge status={order.status} />
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatPaise(order.total_amount_paise)}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {formatDate(order.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No recent orders found.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Low Stock Alerts</CardTitle>
              <CardDescription>Items at or below safety threshold</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {isDisconnected ? (
              <DisconnectedState
                title="Stock Alerts Pending"
                description="Products requiring replenishment will be flagged here in real-time."
                endpoint="GET /api/inventory/low-stock"
                variant="table"
              />
            ) : summary?.low_stock_alerts && summary.low_stock_alerts.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Threshold</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.low_stock_alerts.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                        <TableCell className="text-right font-semibold text-rose-600">
                          {item.stock_quantity}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {item.low_stock_threshold}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                All inventory levels are healthy.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
