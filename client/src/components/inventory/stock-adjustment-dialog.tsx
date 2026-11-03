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
import { stockAdjustmentSchema } from '@/lib/validators'
import { inventoryService } from '@/services/inventory.service'
import { useMutation } from '@/hooks/use-mutation'
import { toast } from 'sonner'
import type { Product } from '@/types/product'

interface StockAdjustmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: Product | null
  products: Product[]
  productsError?: string
  productsLoading: boolean
  onRetryProducts: () => void
}

export function StockAdjustmentDialog({
  open,
  onOpenChange,
  product,
  products,
  productsError,
  productsLoading,
  onRetryProducts,
}: StockAdjustmentDialogProps) {
  const [productId, setProductId] = useState<string>('')
  const [direction, setDirection] = useState<'increase' | 'decrease'>('increase')
  const [quantity, setQuantity] = useState<string>('1')
  const [reason, setReason] = useState<string>('')
  const mutation = useMutation()
  const { errors, setErrors } = mutation

  useEffect(() => {
    if (product) {
      setProductId(String(product.id))
    } else {
      setProductId('')
    }
    setDirection('increase')
    setQuantity('1')
    setReason('')
    setErrors({})
  }, [product, open, setErrors])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const numericQty = Number(quantity)
    if (!Number.isSafeInteger(numericQty) || numericQty <= 0) { setErrors({ delta: 'Enter a positive whole quantity' }); return }
    const signedQty = direction === 'decrease' ? -numericQty : numericQty

    const result = stockAdjustmentSchema.safeParse({
      product_id: Number(productId),
      delta: signedQty,
      reason: reason.trim(),
    })

    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.issues.forEach((issue) => {
        fieldErrors[String(issue.path[0])] = issue.message
      })
      setErrors(fieldErrors)
      return
    }
    const selected = products.find(p => p.id === result.data.product_id)
    if (!mutation.uncertain && (!selected || selected.stock_quantity + signedQty < 0)) { setErrors({ delta: 'Adjustment cannot reduce stock below zero' }); return }
    const saved = await mutation.run(result.data, key => inventoryService.adjustStock(result.data, key), true)
    if (saved) { toast.success(`Stock adjusted to ${saved.resulting_stock} units`); onOpenChange(false) }
  }

  const selectedProductObj = products.find((p) => String(p.id) === productId)

  return (
    <Dialog open={open} onOpenChange={value => { if (!mutation.locked) onOpenChange(value) }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Stock Adjustment</DialogTitle>
          <DialogDescription>
            Manually reconcile physical inventory count with audit trail recording.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {errors.form && <p role="alert" className="text-sm text-destructive">{errors.form}</p>}
          {productsError && <p role="alert" className="text-sm text-destructive">{productsError} <Button type="button" variant="link" onClick={onRetryProducts}>Retry products</Button></p>}
          {productsLoading && <p>Loading products...</p>}
          <fieldset disabled={mutation.locked} className="space-y-4">
          {/* Product Select */}
          <div className="space-y-1.5">
            <Label htmlFor="adj-product">Product *</Label>
            <Select value={productId} onValueChange={(val) => setProductId(val)}>
              <SelectTrigger id="adj-product">
                <SelectValue placeholder="Select target product SKU..." />
              </SelectTrigger>
              <SelectContent>
                {products.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No active products available
                  </SelectItem>
                ) : (
                  products.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name} ({p.sku}) — Stock: {p.stock_quantity}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.product_id && (
              <p className="text-xs text-destructive">{errors.product_id}</p>
            )}
          </div>

          {selectedProductObj && (
            <div className="rounded-md border p-2.5 text-xs bg-muted/20 flex justify-between items-center">
              <span className="text-muted-foreground">Current Recorded Stock:</span>
              <span className="font-semibold text-foreground">
                {selectedProductObj.stock_quantity} units
              </span>
            </div>
          )}

          {/* Adjustment Direction & Quantity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="adj-direction">Adjustment Type</Label>
              <Select
                value={direction}
                onValueChange={(val) => { if (val === 'increase' || val === 'decrease') setDirection(val) }}
              >
                <SelectTrigger id="adj-direction">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="increase">Restock / Add (+)</SelectItem>
                  <SelectItem value="decrease">Shrinkage / Deduct (-)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adj-quantity">Quantity *</Label>
              <Input
                id="adj-quantity"
                type="number"
                min="1"
                placeholder="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
              {errors.delta && (
                <p className="text-xs text-destructive">{errors.delta}</p>
              )}
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label htmlFor="adj-reason">Reason for Adjustment *</Label>
            <Input
              id="adj-reason"
              placeholder="e.g. Physical inventory audit, damaged in transit"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

            {errors.reason && <p className="text-xs text-destructive">{errors.reason}</p>}
          </fieldset>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button type="button" variant="outline" disabled={mutation.locked} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.pending || productsLoading || !!productsError || products.length === 0}
            >
              {mutation.pending ? 'Applying...' : mutation.uncertain ? 'Retry Same Adjustment' : 'Apply Adjustment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
