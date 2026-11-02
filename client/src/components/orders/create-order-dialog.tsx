import { useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createOrderSchema } from '@/lib/validators'
import { DisconnectedState } from '@/components/shared/disconnected-state'
import { formatPaise, rupeesToPaise, paiseToRupees } from '@/lib/currency'
import type { Product } from '@/types/product'

interface CreateOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  products: Product[]
}

interface FormOrderItem {
  productId: string
  quantity: number
  unitPriceRupees: number
}

export function CreateOrderDialog({
  open,
  onOpenChange,
  products,
}: CreateOrderDialogProps) {
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<FormOrderItem[]>([
    { productId: '', quantity: 1, unitPriceRupees: 0 },
  ])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const addItem = () => {
    setItems((prev) => [...prev, { productId: '', quantity: 1, unitPriceRupees: 0 }])
  }

  const removeItem = (index: number) => {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleProductSelect = (index: number, prodId: string) => {
    const selected = products.find((p) => String(p.id) === prodId)
    const unitPrice = selected ? paiseToRupees(selected.price_paise) : 0

    setItems((prev) => {
      const copy = [...prev]
      copy[index] = {
        ...copy[index],
        productId: prodId,
        unitPriceRupees: unitPrice,
      }
      return copy
    })
  }

  const handleQuantityChange = (index: number, qty: number) => {
    setItems((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], quantity: Math.max(1, qty) }
      return copy
    })
  }

  const handlePriceChange = (index: number, price: number) => {
    setItems((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], unitPriceRupees: Math.max(0, price) }
      return copy
    })
  }

  // Calculate order total
  const totalAmountPaise = items.reduce((acc, it) => {
    const itemPaise = rupeesToPaise(it.unitPriceRupees) * it.quantity
    return acc + itemPaise
  }, 0)

  const handleValidateOnly = (e: React.FormEvent) => {
    e.preventDefault()
    const result = createOrderSchema.safeParse({
      customer_name: customerName,
      customer_email: customerEmail || undefined,
      customer_phone: customerPhone || undefined,
      notes: notes || undefined,
      items: items.map((it) => ({
        product_id: Number(it.productId),
        quantity: it.quantity,
        unit_price_rupees: it.unitPriceRupees,
      })),
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Customer Order</DialogTitle>
          <DialogDescription>
            Place a new customer order with line items and automatic inventory reservation.
          </DialogDescription>
        </DialogHeader>

        {/* Phase 2 Honest Notice */}
        <DisconnectedState
          title="Order Creation Disabled (Phase 3)"
          description="Form logic and validation are active. Order placement with inventory deduction connects via POST /api/orders in Phase 3."
          endpoint="POST /api/orders"
          variant="inline"
        />

        <form onSubmit={handleValidateOnly} className="space-y-4 py-2">
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="order-customer-email">Email Address</Label>
                <Input
                  id="order-customer-email"
                  type="email"
                  placeholder="ramesh@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="order-customer-phone">Phone Number</Label>
                <Input
                  id="order-customer-phone"
                  placeholder="+91 98765 43210"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
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
                            Catalog pending connection
                          </SelectItem>
                        ) : (
                          products.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)}>
                              {p.name} ({p.sku}) — {formatPaise(p.price_paise)}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-20">
                    <Input
                      type="number"
                      min="1"
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
                      value={item.unitPriceRupees}
                      onChange={(e) => handlePriceChange(index, Number(e.target.value))}
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
              <span className="text-sm font-medium text-muted-foreground">Order Total:</span>
              <span className="text-lg font-bold text-foreground">
                {formatPaise(totalAmountPaise)}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="order-notes">Order Notes (Optional)</Label>
            <Textarea
              id="order-notes"
              placeholder="Fulfillment instructions, shipping remarks, etc."
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
              Place Order (Pending Phase 3)
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
