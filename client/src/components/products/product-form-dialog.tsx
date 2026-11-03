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
import { createProductSchema, updateProductSchema } from '@/lib/validators'
import { productService } from '@/services/product.service'
import { categoryService } from '@/services/category.service'
import { useMutation } from '@/hooks/use-mutation'
import { toast } from 'sonner'
import type { Category } from '@/types/category'
import type { Product } from '@/types/product'
import { paiseToRupees, rupeesToPaise } from '@/lib/currency'

interface ProductFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: Product | null
  categories: Category[]
  categoriesError?: string
  onRetryCategories: () => void
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  categories,
  categoriesError,
  onRetryCategories,
}: ProductFormDialogProps) {
  const isEditing = Boolean(product)

  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [priceRupees, setPriceRupees] = useState<string>('')
  const [description, setDescription] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const categoryMutation = useMutation()
  const { setErrors: setCategoryErrors } = categoryMutation
  const mutation = useMutation()
  const [stockQuantity, setStockQuantity] = useState<string>('0')
  const [threshold, setThreshold] = useState<string>('5')
  const { errors, setErrors } = mutation

  useEffect(() => {
    if (product) {
      setName(product.name)
      setSku(product.sku)
      setCategoryId(String(product.category_id))
      setPriceRupees(String(paiseToRupees(product.price_paise)))
      setDescription(product.description ?? '')
      setStockQuantity(String(product.stock_quantity))
      setThreshold(String(product.low_stock_threshold))
    } else {
      setName('')
      setSku('')
      setCategoryId('')
      setPriceRupees('')
      setDescription('')
      setStockQuantity('0')
      setThreshold('5')
    }
    setErrors({})
    setCategoryErrors({})
    setCategoryName('')
  }, [product, open, setErrors, setCategoryErrors])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = (isEditing ? updateProductSchema : createProductSchema).safeParse({
      name,
      sku,
      category_id: Number(categoryId),
      price_rupees: priceRupees,
      description,
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
      return
    }
    const data = { name: name.trim(), category_id: Number(categoryId), description: description.trim() || null,
      price_paise: rupeesToPaise(priceRupees), low_stock_threshold: Number(threshold) }
    const saved = await mutation.run(data, () => product
      ? productService.updateProduct(product.id, data)
      : productService.createProduct({ ...data, sku: sku.trim(), stock_quantity: Number(stockQuantity) }))
    if (saved) { toast.success(product ? 'Product updated' : 'Product created'); onOpenChange(false) }
  }

  return (
    <Dialog open={open} onOpenChange={value => { if (!mutation.pending && !categoryMutation.pending) onOpenChange(value) }}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update catalog details, pricing, and safety stock threshold.'
              : 'Register a new SKU into the RetailOps inventory catalog.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {errors.form && <p role="alert" className="text-sm text-destructive">{errors.form}</p>}
          <fieldset disabled={mutation.pending || categoryMutation.pending} className="space-y-4">
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
                disabled={isEditing}
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
                  {categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.category_id && (
                <p className="text-xs text-destructive">{errors.category_id}</p>
              )}
            </div>
          </div>

          {/* Price & Description */}
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
              <Label htmlFor="product-description">Description</Label>
              <Input id="product-description" maxLength={1000} value={description} onChange={e => setDescription(e.target.value)} />
              {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
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

          <div className="space-y-2 rounded-md border p-3">
            {categoriesError && <p role="alert" className="text-xs text-destructive">{categoriesError} <Button type="button" variant="link" onClick={onRetryCategories}>Retry categories</Button></p>}
            {categories.length === 0 && !categoriesError && <p className="text-xs text-muted-foreground">Create a category to register your first product.</p>}
            <Label htmlFor="category-name">New category</Label>
            <div className="flex gap-2">
              <Input id="category-name" value={categoryName} maxLength={100} onChange={e => setCategoryName(e.target.value)} />
              <Button type="button" variant="outline" disabled={!categoryName.trim()} onClick={async () => {
                const category = await categoryMutation.run(categoryName, () => categoryService.createCategory({ name: categoryName.trim() }))
                if (category) { setCategoryId(String(category.id)); setCategoryName(''); toast.success('Category created') }
              }}>Add Category</Button>
            </div>
            {categoryMutation.errors.form && <p role="alert" className="text-xs text-destructive">{categoryMutation.errors.form}</p>}
          </div>
          </fieldset>
          <DialogFooter className="mt-6 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={mutation.pending || categoryMutation.pending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.pending || categoryMutation.pending || !!categoriesError || categories.length === 0}
            >
              {mutation.pending ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
