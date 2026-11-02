import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createProductSchema } from '@/lib/validators'
import { DisconnectedState } from '@/components/shared/disconnected-state'
import type { Category } from '@/types/category'
import type { Product } from '@/types/product'
import { paiseToRupees } from '@/lib/currency'

interface ProductFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: Product | null
  categories: Category[]
  categoriesDisconnected?: boolean
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  categories,
  categoriesDisconnected = false,
}: ProductFormDialogProps) {
  const isEditing = Boolean(product)

  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [priceRupees, setPriceRupees] = useState<string>('')
  const [costPriceRupees, setCostPriceRupees] = useState<string>('')
  const [stockQuantity, setStockQuantity] = useState<string>('0')
  const [threshold, setThreshold] = useState<string>('10')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (product) {
      setName(product.name)
      setSku(product.sku)
      setCategoryId(String(product.category_id))
      setPriceRupees(String(paiseToRupees(product.price_paise)))
      setCostPriceRupees(
        product.cost_price_paise !== null && product.cost_price_paise !== undefined
          ? String(paiseToRupees(product.cost_price_paise))
          : '',
      )
      setStockQuantity(String(product.stock_quantity))
      setThreshold(String(product.low_stock_threshold))
    } else {
      setName('')
      setSku('')
      setCategoryId('')
      setPriceRupees('')
      setCostPriceRupees('')
      setStockQuantity('0')
      setThreshold('10')
    }
    setErrors({})
  }, [product, open])

  const handleValidateOnly = (e: React.FormEvent) => {
    e.preventDefault()
    const result = createProductSchema.safeParse({
      name,
      sku,
      category_id: Number(categoryId),
      price_rupees: Number(priceRupees),
      cost_price_rupees: costPriceRupees ? Number(costPriceRupees) : null,
      stock_quantity: Number(stockQuantity),
      low_stock_threshold: Number(threshold),
    })

    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.issues.forEach((issue) => {
        const fieldName = String(issue.path[0])
        fieldErrors[fieldName] = issue.message
      })
      setErrors(fieldErrors)
    } else {
      setErrors({})
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update catalog details, pricing, and safety stock threshold.'
              : 'Register a new SKU into the RetailOps inventory catalog.'}
          </DialogDescription>
        </DialogHeader>

        {/* Phase 2 Honest Notice */}
        <DisconnectedState
          title="Creation & Editing Disabled (Phase 3)"
          description="Form inputs and schema validations are fully operational. Live API mutation is scheduled for Phase 3."
          endpoint={isEditing ? `PUT /api/products/${product?.id}` : 'POST /api/products'}
          variant="inline"
        />

        <form onSubmit={handleValidateOnly} className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="product-name">Product Name *</Label>
            <Input
              id="product-name"
              placeholder="e.g. Premium Cotton T-Shirt"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setErrors((prev) => ({ ...prev, name: '' }))
              }}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          {/* SKU & Category */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="product-sku">SKU Code *</Label>
              <Input
                id="product-sku"
                placeholder="e.g. AP-TSHIRT-001"
                value={sku}
                onChange={(e) => {
                  setSku(e.target.value)
                  setErrors((prev) => ({ ...prev, sku: '' }))
                }}
              />
              {errors.sku && <p className="text-xs text-destructive">{errors.sku}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="product-category">Category *</Label>
              <Select
                value={categoryId}
                onValueChange={(val) => {
                  setCategoryId(val)
                  setErrors((prev) => ({ ...prev, category_id: '' }))
                }}
              >
                <SelectTrigger id="product-category">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {categoriesDisconnected ? (
                    <SelectItem value="none" disabled>
                      Categories pending (Phase 3)
                    </SelectItem>
                  ) : (
                    categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.category_id && (
                <p className="text-xs text-destructive">{errors.category_id}</p>
              )}
            </div>
          </div>

          {/* Price & Cost Price */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="product-price">Selling Price (₹) *</Label>
              <Input
                id="product-price"
                type="number"
                step="0.01"
                placeholder="599.00"
                value={priceRupees}
                onChange={(e) => {
                  setPriceRupees(e.target.value)
                  setErrors((prev) => ({ ...prev, price_rupees: '' }))
                }}
              />
              {errors.price_rupees && (
                <p className="text-xs text-destructive">{errors.price_rupees}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="product-cost-price">Cost Price (₹, optional)</Label>
              <Input
                id="product-cost-price"
                type="number"
                step="0.01"
                placeholder="350.00"
                value={costPriceRupees}
                onChange={(e) => {
                  setCostPriceRupees(e.target.value)
                  setErrors((prev) => ({ ...prev, cost_price_rupees: '' }))
                }}
              />
              {errors.cost_price_rupees && (
                <p className="text-xs text-destructive">{errors.cost_price_rupees}</p>
              )}
            </div>
          </div>

          {/* Initial Stock & Threshold */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="product-stock">Initial Stock</Label>
              <Input
                id="product-stock"
                type="number"
                min="0"
                disabled={isEditing}
                placeholder="0"
                value={stockQuantity}
                onChange={(e) => {
                  setStockQuantity(e.target.value)
                  setErrors((prev) => ({ ...prev, stock_quantity: '' }))
                }}
              />
              {errors.stock_quantity && (
                <p className="text-xs text-destructive">{errors.stock_quantity}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="product-threshold">Low Stock Threshold</Label>
              <Input
                id="product-threshold"
                type="number"
                min="0"
                placeholder="10"
                value={threshold}
                onChange={(e) => {
                  setThreshold(e.target.value)
                  setErrors((prev) => ({ ...prev, low_stock_threshold: '' }))
                }}
              />
              {errors.low_stock_threshold && (
                <p className="text-xs text-destructive">{errors.low_stock_threshold}</p>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled
              title="Mutation disabled in Phase 2. Live API sync connects in Phase 3."
            >
              {isEditing ? 'Save Changes' : 'Create Product'} (Pending Phase 3)
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
