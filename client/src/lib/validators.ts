import { z } from 'zod'

/**
 * Product validation schema for Add Product form
 */
export const createProductSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required').max(200, 'Name must be 200 characters or fewer'),
  sku: z
    .string()
    .trim()
    .min(1, 'SKU is required')
    .max(50, 'SKU must be 50 characters or fewer')
    .regex(/^[A-Za-z0-9_-]+$/, 'SKU may only contain letters, numbers, hyphens, and underscores'),
  category_id: z.coerce.number().int().positive('Please select a valid category'),
  price_rupees: z.coerce
    .number()
    .positive('Price must be greater than zero'),
  cost_price_rupees: z.coerce
    .number()
    .nonnegative('Cost price cannot be negative')
    .optional()
    .nullable(),
  stock_quantity: z.coerce
    .number()
    .int('Stock quantity must be an integer')
    .nonnegative('Initial stock cannot be negative')
    .default(0),
  low_stock_threshold: z.coerce
    .number()
    .int('Threshold must be an integer')
    .nonnegative('Threshold cannot be negative')
    .default(10),
})

export type CreateProductFormValues = z.infer<typeof createProductSchema>

/**
 * Product validation schema for Edit Product form
 */
export const updateProductSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required').max(200, 'Name must be 200 characters or fewer'),
  sku: z
    .string()
    .trim()
    .min(1, 'SKU is required')
    .max(50, 'SKU must be 50 characters or fewer')
    .regex(/^[A-Za-z0-9_-]+$/, 'SKU may only contain letters, numbers, hyphens, and underscores'),
  category_id: z.coerce.number().int().positive('Please select a valid category'),
  price_rupees: z.coerce
    .number()
    .positive('Price must be greater than zero'),
  cost_price_rupees: z.coerce
    .number()
    .nonnegative('Cost price cannot be negative')
    .optional()
    .nullable(),
  low_stock_threshold: z.coerce
    .number()
    .int('Threshold must be an integer')
    .nonnegative('Threshold cannot be negative')
    .default(10),
})

export type UpdateProductFormValues = z.infer<typeof updateProductSchema>

/**
 * Order item schema
 */
export const orderItemSchema = z.object({
  product_id: z.coerce.number().int().positive('Select a valid product'),
  quantity: z.coerce.number().int().positive('Quantity must be at least 1'),
  unit_price_rupees: z.coerce
    .number()
    .nonnegative('Unit price cannot be negative'),
})

export type OrderItemFormValues = z.infer<typeof orderItemSchema>

/**
 * Order creation schema
 */
export const createOrderSchema = z.object({
  customer_name: z.string().trim().min(1, 'Customer name is required').max(100, 'Name must be 100 characters or fewer'),
  customer_email: z.string().trim().email('Enter a valid email address').optional().or(z.literal('')),
  customer_phone: z
    .string()
    .trim()
    .regex(/^[0-9+\s-]{7,15}$/, 'Enter a valid phone number (7-15 digits)')
    .optional()
    .or(z.literal('')),
  notes: z.string().trim().max(500, 'Notes must be 500 characters or fewer').optional().or(z.literal('')),
  items: z.array(orderItemSchema).min(1, 'At least one item must be added to the order'),
})

export type CreateOrderFormValues = z.infer<typeof createOrderSchema>

/**
 * Stock adjustment schema
 */
export const stockAdjustmentSchema = z.object({
  product_id: z.coerce.number().int().positive('Select a valid product'),
  quantity_change: z.coerce
    .number()
    .int('Adjustment must be an integer')
    .refine((val) => val !== 0, 'Adjustment quantity cannot be zero'),
  reason: z.string().trim().max(255, 'Reason must be 255 characters or fewer').optional().or(z.literal('')),
})

export type StockAdjustmentFormValues = z.infer<typeof stockAdjustmentSchema>
