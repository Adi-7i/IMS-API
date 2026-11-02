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
import { DisconnectedState } from '@/components/shared/disconnected-state'
import type { Product } from '@/types/product'

interface StockAdjustmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: Product | null
  products: Product[]
}

export function StockAdjustmentDialog({
  open,
  onOpenChange,
  product,
  products,
}: StockAdjustmentDialogProps) {
  const [productId, setProductId] = useState<string>('')
  const [direction, setDirection] = useState<'increase' | 'decrease'>('increase')
  const [quantity, setQuantity] = useState<string>('1')
  const [reason, setReason] = useState<string>('')
  const [errors, setErrors] = useState<Record<string, string>>({})

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
  }, [product, open])

  const handleValidateOnly = (e: React.FormEvent) => {
    e.preventDefault()
    const numericQty = Number(quantity)
    const signedQty = direction === 'decrease' ? -Math.abs(numericQty) : Math.abs(numericQty)

    const result = stockAdjustmentSchema.safeParse({
      product_id: Number(productId),
      quantity_change: signedQty,
      reason: reason.trim() || undefined,
    })

    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.issues.forEach((issue) => {
        fieldErrors[String(issue.path[0])] = issue.message
      })
      setErrors(fieldErrors)
    } else {
      setErrors({})
    }
  }

  const selectedProductObj = products.find((p) => String(p.id) === productId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Stock Adjustment</DialogTitle>
          <DialogDescription>
            Manually reconcile physical inventory count with audit trail recording.
          </DialogDescription>
        </DialogHeader>

        {/* Phase 2 Honest Notice */}
        <DisconnectedState
          title="Adjustment Disabled (Phase 3)"
          description="Stock adjustments and movement logging connect via POST /api/inventory/adjustments in Phase 3."
          endpoint="POST /api/inventory/adjustments"
          variant="inline"
        />

        <form onSubmit={handleValidateOnly} className="space-y-4 py-2">
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
                    Product catalog pending connection
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
                onValueChange={(val) => setDirection(val as 'increase' | 'decrease')}
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
              {errors.quantity_change && (
                <p className="text-xs text-destructive">{errors.quantity_change}</p>
              )}
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label htmlFor="adj-reason">Reason for Adjustment</Label>
            <Input
              id="adj-reason"
              placeholder="e.g. Physical inventory audit, damaged in transit"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled
              title="Mutation disabled in Phase 2. Live API sync connects in Phase 3."
            >
              Apply Adjustment (Pending Phase 3)
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
