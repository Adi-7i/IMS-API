import { z } from 'zod'
const integer = z.number().int().safe()
const id = integer.positive()
const amount = integer.nonnegative()
const status = z.enum(['Pending', 'Confirmed', 'Completed', 'Cancelled'])
export const categorySchema = z.object({ id, name: z.string(), created_at: z.string() })
export const productSchema = z.object({
  id, name: z.string(), sku: z.string(), category_id: id, category_name: z.string().optional(),
  description: z.string().nullable(), price_paise: amount, stock_quantity: amount,
  low_stock_threshold: amount, is_active: z.union([z.literal(0), z.literal(1)]),
  created_at: z.string(), updated_at: z.string(),
})
export const orderSchema = z.object({
  id, order_number: z.string(), customer_name: z.string(), status, total_paise: amount,
  created_at: z.string(), updated_at: z.string(),
})
export const orderDetailSchema = orderSchema.extend({
  items: z.array(z.object({ id, order_id: id, product_id: id, product_name: z.string(), product_sku: z.string(), quantity: id, unit_price_paise: amount, line_total_paise: amount })),
  status_history: z.array(z.object({ id, order_id: id, previous_status: status.nullable(), new_status: status, created_at: z.string() })),
})
export const movementSchema = z.object({
  id, product_id: id, product_name: z.string(), product_sku: z.string(),
  movement_type: z.enum(['initial', 'sale', 'cancellation_reversal', 'adjustment']),
  quantity_delta: integer, previous_stock: amount, resulting_stock: amount,
  order_id: id.nullable(), order_number: z.string().nullable(), reason: z.string(), created_at: z.string(),
})
export const adjustmentSchema = z.object({ product_id: id, movement_id: id, delta: integer, previous_stock: amount, resulting_stock: amount, reason: z.string() })
export const dashboardSchema = z.object({
  products: z.object({ total_active: amount, low_stock_count: amount, out_of_stock_count: amount }),
  orders: z.object({ total_orders: amount, total_revenue_paise: amount }),
  recent_orders: z.array(orderSchema.omit({ updated_at: true })),
  daily_trend: z.array(z.object({ date: z.iso.date(), order_count: amount, revenue_paise: amount })),
  range_days: z.union([z.literal(7), z.literal(30)]),
})
export const errorSchema = z.object({ success: z.literal(false), error: z.object({ code: z.string(), message: z.string(), details: z.unknown().optional() }) })
export const envelope = <T>(data: z.ZodType<T>) => z.object({ success: z.literal(true), data, message: z.string().optional() })
export const paginated = <T>(data: z.ZodType<T>) => envelope(z.array(data)).extend({
  pagination: z.object({ page: id, limit: id, total: amount, totalPages: id, hasNext: z.boolean(), hasPrev: z.boolean() }),
})
