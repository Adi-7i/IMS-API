import { toast } from 'sonner'
import { useMutation } from '@/hooks/use-mutation'
import { useState } from 'react'
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Archive,
  RefreshCw,
  Package,
} from 'lucide-react'
import { productService } from '@/services/product.service'
import { categoryService } from '@/services/category.service'
import { useDataState } from '@/hooks/use-data-state'
import { usePagination } from '@/hooks/use-pagination'
import { PageHeader } from '@/components/shared/page-header'
import { ErrorState } from '@/components/shared/error-state'
import { EmptyState } from '@/components/shared/empty-state'
import { LoadingSkeleton } from '@/components/shared/loading-skeleton'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { DataTablePagination } from '@/components/shared/data-table-pagination'
import { ProductFormDialog } from '@/components/products/product-form-dialog'
import { formatPaise } from '@/lib/currency'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import type { Product, ProductSortBy } from '@/types/product'

export function ProductsPage() {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('active')
  const [availability, setAvailability] = useState<string>('all')
  const archive = useMutation()
  const [sortBy, setSortBy] = useState<ProductSortBy>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const { page, setPage } = usePagination(1, 20)

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<Product | null>(null)

  // Fetch categories for filtering
  const { data: categories, error: categoriesError, reload: reloadCategories } = useDataState(
    (signal) => categoryService.getCategories(signal),
    [],
  )

  // Fetch products query
  const {
    data: productData,
    isLoading,
    error,
    isError,
    reload,
  } = useDataState(
    (signal) =>
      productService.getProducts({
        page,
        limit: 20,
        search: search.trim() || undefined,
        category_id: selectedCategory !== 'all' ? Number(selectedCategory) : undefined,
        is_active:
          selectedStatus === 'active'
            ? 1
            : selectedStatus === 'inactive'
              ? 0
              : undefined,
        availability: availability === 'in_stock' || availability === 'low_stock' || availability === 'out_of_stock' ? availability : undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
      }, signal),
    [page, search, selectedCategory, selectedStatus, availability, sortBy, sortDir],
  )

  const products = productData?.data ?? []
  const pagination = productData?.pagination

  const handleEdit = async (prod: Product) => {
    try { setSelectedProduct(await productService.getProductById(prod.id)); setIsFormOpen(true) }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load product') }
  }

  const handleOpenCreate = () => {
    setSelectedProduct(null)
    setIsFormOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Product Catalog"
        description="Manage product listings, SKU identifiers, prices, and catalog status."
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
            <Button onClick={handleOpenCreate} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </div>
        }
      />


      {categoriesError && <ErrorState title="Unable to load categories" description={categoriesError.message} onRetry={() => void reloadCategories()} />}
      {archive.errors.form && <p role="alert" className="text-sm text-destructive">{archive.errors.form}</p>}
      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or SKU..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="pl-9"
              />
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Category Filter */}
              <Select
                value={selectedCategory}
                onValueChange={(val) => {
                  setSelectedCategory(val)
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-[160px] text-xs h-9">
                  <Filter className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select
                value={selectedStatus}
                onValueChange={(val) => {
                  setSelectedStatus(val)
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-[130px] text-xs h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Archived</SelectItem>
                </SelectContent>
              </Select>

              <Select value={availability} onValueChange={value => { setAvailability(value); setPage(1) }}>
                <SelectTrigger className="w-[160px] text-xs h-9"><SelectValue placeholder="Availability" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Availability</SelectItem><SelectItem value="in_stock">In Stock</SelectItem>
                  <SelectItem value="low_stock">Low Stock</SelectItem><SelectItem value="out_of_stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
              {/* Sort Selector */}
              <Select
                value={`${sortBy}-${sortDir}`}
                onValueChange={(val) => {
                  const [field, dir] = val.split('-')
                  if (field !== 'name' && field !== 'price_paise' && field !== 'stock_quantity' && field !== 'created_at') return
                  if (dir !== 'asc' && dir !== 'desc') return
                  setSortBy(field)
                  setSortDir(dir)
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-[170px] text-xs h-9">
                  <SelectValue placeholder="Sort Order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at-desc">Newest First</SelectItem>
                  <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                  <SelectItem value="price_paise-asc">Price (Low to High)</SelectItem>
                  <SelectItem value="price_paise-desc">Price (High to Low)</SelectItem>
                  <SelectItem value="stock_quantity-asc">Stock (Low to High)</SelectItem>
                  <SelectItem value="stock_quantity-desc">Stock (High to Low)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table View */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingSkeleton rows={6} />
          ) : isError ? (
            <ErrorState description={error?.message} onRetry={() => void reload()} />
          ) : products.length === 0 ? (
            <EmptyState
              title="No products found"
              description="Try adjusting your search criteria or register a new product."
              actionLabel="Add Product"
              onAction={handleOpenCreate}
              icon={<Package className="h-6 w-6" />}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product & SKU</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Threshold</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => {
                      const isLowStock = product.stock_quantity <= product.low_stock_threshold
                      return (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div className="font-medium text-foreground">{product.name}</div>
                            <div className="font-mono text-xs text-muted-foreground">
                              {product.sku}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {product.category_name || `Cat #${product.category_id}`}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatPaise(product.price_paise)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={
                                isLowStock
                                  ? 'font-semibold text-rose-600 dark:text-rose-400'
                                  : 'font-medium'
                              }
                            >
                              {product.stock_quantity}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {product.low_stock_threshold}
                          </TableCell>
                          <TableCell className="text-center">
                            {product.is_active === 1 ? (
                              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-muted-foreground">
                                Archived
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => void handleEdit(product)}
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              >
                                <Edit2 className="h-4 w-4" />
                                <span className="sr-only">Edit product</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={product.is_active === 0 || archive.pending}
                                onClick={() => setArchiveTarget(product)}
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              >
                                <Archive className="h-4 w-4" />
                                <span className="sr-only">Archive product</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
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

      {/* Product Form Dialog (Create / Edit) */}
      <ProductFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        product={selectedProduct}
        categories={categories ?? []}
        categoriesError={categoriesError?.message}
        onRetryCategories={() => void reloadCategories()}
      />

      {/* Archive Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => { if (!open && !archive.pending) setArchiveTarget(null) }}
        title="Archive Product"
        description={
          <>
            Are you sure you want to deactivate{' '}
            <strong className="text-foreground">{archiveTarget?.name}</strong> (SKU:{' '}
            <code className="font-mono">{archiveTarget?.sku}</code>)? This product will be marked
            inactive.
          </>
        }
        confirmLabel="Archive Product"
        variant="destructive"
        isLoading={archive.pending}
        onConfirm={async () => {
          if (!archiveTarget) return
          const saved = await archive.run(archiveTarget.id, () => productService.archiveProduct(archiveTarget.id))
          if (saved) { toast.success('Product archived'); setArchiveTarget(null) }
        }}
      />
    </div>
  )
}
