import { z } from 'zod'
import { rupeesToPaise } from './currency'
const quantity = z.coerce.number().int().safe().nonnegative()
const money = z.string().trim().refine(value => {
  try { rupeesToPaise(value); return true } catch { return false }
}, 'Enter a non-negative price with at most two decimal places')
export const createProductSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required').max(200),
  sku: z.string().trim().min(1, 'SKU is required').max(50).regex(/^[A-Za-z0-9_-]+$/, 'SKU may only contain letters, numbers, hyphens, and underscores'),
  category_id: z.coerce.number().int().positive('Please select a valid category'),
  description: z.string().max(1000).nullable().optional(),
  price_rupees: z.preprocess(value => typeof value === 'number' ? String(value) : value, money),
  stock_quantity: quantity.default(0),
  low_stock_threshold: quantity.default(5),
})
export const updateProductSchema = createProductSchema.omit({ sku: true, stock_quantity: true })
export const orderItemSchema = z.object({ product_id: z.coerce.number().int().positive('Select a valid product'), quantity: z.coerce.number().int().safe().positive('Quantity must be at least 1') })
export const createOrderSchema = z.object({
  customer_name: z.string().trim().min(1, 'Customer name is required').max(200),
  items: z.array(orderItemSchema).min(1, 'At least one item is required').refine(items => new Set(items.map(item => item.product_id)).size === items.length, 'Choose each product only once'),
})
export const stockAdjustmentSchema = z.object({
  product_id: z.coerce.number().int().positive('Select a valid product'),
  delta: z.coerce.number().int().safe().refine(value => value !== 0, 'Adjustment quantity cannot be zero'),
  reason: z.string().trim().min(1, 'A reason is required').max(500),
})
