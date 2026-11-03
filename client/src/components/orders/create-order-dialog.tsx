import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
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
import { createOrderSchema } from '@/lib/validators'
import { orderService } from '@/services/order.service'
import { useMutation } from '@/hooks/use-mutation'
import { toast } from 'sonner'
import { formatPaise, paiseToRupees } from '@/lib/currency'
import type { Product } from '@/types/product'

interface CreateOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  products: Product[]
  productsError?: string
  productsLoading: boolean
  onRetryProducts: () => void
}

interface FormOrderItem {
  productId: string
  quantity: number
}

export function CreateOrderDialog({
  open,
  onOpenChange,
  products,
  productsError,
  productsLoading,
  onRetryProducts,
}: CreateOrderDialogProps) {
  const [customerName, setCustomerName] = useState('')
  const [items, setItems] = useState<FormOrderItem[]>([
    { productId: '', quantity: 1 },
  ])
  const mutation = useMutation()
  const { errors, setErrors } = mutation
  useEffect(() => {
    if (open) { setCustomerName(''); setItems([{ productId: '', quantity: 1 }]); setErrors({}) }
  }, [open, setErrors])

  const addItem = () => {
    setItems((prev) => [...prev, { productId: '', quantity: 1 }])
  }

  const removeItem = (index: number) => {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleProductSelect = (index: number, prodId: string) => {
    setItems((prev) => {
      const copy = [...prev]
      copy[index] = {
        ...copy[index],
        productId: prodId,
      }
      return copy
    })
  }

  const handleQuantityChange = (index: number, qty: number) => {
    setItems((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], quantity: qty }
      return copy
    })
  }

  // Calculate order total
  const totalAmountPaise = items.reduce((acc, it) => {
    const itemPaise = (products.find(p => String(p.id) === it.productId)?.price_paise ?? 0) * it.quantity
    return acc + itemPaise
  }, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = createOrderSchema.safeParse({
      customer_name: customerName,
      items: items.map((it) => ({
        product_id: Number(it.productId),
        quantity: it.quantity,
      })),
    })

    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.issues.forEach((issue) => {
        fieldErrors[String(issue.path[0])] = issue.message
      })
      setErrors(fieldErrors)
      return
    }
    for (const item of result.data.items) {
      const product = products.find(p => p.id === item.product_id)
      if (!mutation.uncertain && (!product || item.quantity > product.stock_quantity)) { setErrors({ items: 'One or more products have insufficient available stock. Refresh products and review quantities.' }); return }
    }
    if (!Number.isSafeInteger(totalAmountPaise)) { setErrors({ items: 'Order total exceeds the supported amount' }); return }
    const saved = await mutation.run(result.data, key => orderService.createOrder(result.data, key), true)
    if (saved) { toast.success(`Order ${saved.order_number} created — ${formatPaise(saved.total_paise)}`); onOpenChange(false) }
  }

  return (
    <Dialog open={open} onOpenChange={value => { if (!mutation.locked) onOpenChange(value) }}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Customer Order</DialogTitle>
          <DialogDescription>
            Place a new customer order with line items and automatic inventory reservation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {errors.form && <p role="alert" className="text-sm text-destructive">{errors.form}</p>}
          {errors.items && <p role="alert" className="text-sm text-destructive">{errors.items}</p>}
          {productsError && <p role="alert" className="text-sm text-destructive">{productsError} <Button type="button" variant="link" onClick={onRetryProducts}>Retry products</Button></p>}
          {productsLoading && <p>Loading products...</p>}
          <fieldset disabled={mutation.locked} className="space-y-4">
          {/* Customer Details */}
          <div className="space-y-3 rounded-lg border p-3.5 bg-muted/20">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Customer Information
            </h4>
            <div className="space-y-1.5">
              <Label htmlFor="order-customer-name">Customer Name *</Label>
              <Input
                id="order-customer-name"
                placeholder="e.g. Ramesh Kumar"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value)
                  setErrors((prev) => ({ ...prev, customer_name: '' }))
                }}
              />
              {errors.customer_name && (
                <p className="text-xs text-destructive">{errors.customer_name}</p>
              )}
            </div>

          </div>

          {/* Line Items */}
          <div className="space-y-3 rounded-lg border p-3.5 bg-muted/20">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Order Items
              </h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
                className="h-7 gap-1 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Item
              </Button>
            </div>

            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select
                      value={item.productId}
                      onValueChange={(val) => handleProductSelect(index, val)}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select product SKU..." />
                      </SelectTrigger>
                      <SelectContent>
                        {products.length === 0 ? (
                          <SelectItem value="empty" disabled>
                            No active products available
                          </SelectItem>
                        ) : (
                          products.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)} disabled={p.stock_quantity === 0 || items.some((other, i) => i !== index && other.productId === String(p.id))}>
                              {p.name} ({p.sku}) — {formatPaise(p.price_paise)} — Stock: {p.stock_quantity}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-20">
                    <Input
                      type="number"
                      aria-label={`Quantity for item ${index + 1}`}
                      min="1"
                      step="1"
                      placeholder="Qty"
                      className="h-9 text-xs"
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(index, Number(e.target.value))}
                    />
                  </div>

                  <div className="w-24">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Price"
                      className="h-9 text-xs"
                      aria-label={`Unit price for item ${index + 1}`}
                      readOnly
                      value={paiseToRupees(products.find(p => String(p.id) === item.productId)?.price_paise ?? 0)}
                    />
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(index)}
                    disabled={items.length <= 1}
                    className="h-9 w-9 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Total Summary */}
            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-sm font-medium text-muted-foreground">Estimated Total:</span>
              <span className="text-lg font-bold text-foreground">
                {formatPaise(totalAmountPaise)}
              </span>
            </div>
          </div>

          </fieldset>

          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button type="button" variant="outline" disabled={mutation.locked} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.pending || productsLoading || !!productsError || products.length === 0}
            >
              {mutation.pending ? 'Placing...' : mutation.uncertain ? 'Retry Same Order' : 'Place Order'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
