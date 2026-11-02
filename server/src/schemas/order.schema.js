// @ts-check
import { z } from 'zod';

const orderItemSchema = z.object({
  product_id: z.number({ required_error: 'product_id is required' })
    .int().positive('product_id must be a positive integer'),
  quantity: z.number({ required_error: 'quantity is required' })
    .int().positive('quantity must be a positive integer'),
});

export const createOrderSchema = z.object({
  customer_name: z.string().min(1, 'customer_name is required').max(200),
  items: z
    .array(orderItemSchema)
    .min(1, 'At least one order item is required')
    .refine(
      (items) => {
        const ids = items.map((i) => i.product_id);
        return new Set(ids).size === ids.length;
      },
      { message: 'Duplicate product_id values are not allowed in a single order' }
    ),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['Pending', 'Confirmed', 'Completed', 'Cancelled'], {
    required_error: 'status is required',
    invalid_type_error: 'status must be one of: Pending, Confirmed, Completed, Cancelled',
  }),
});

export const orderQuerySchema = z.object({
  page:     z.coerce.number().int().positive().optional().default(1),
  limit:    z.coerce.number().int().positive().max(100).optional().default(20),
  status:   z.enum(['Pending', 'Confirmed', 'Completed', 'Cancelled']).optional(),
  sort_dir: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const orderIdParamSchema = z.object({
  id: z.coerce.number().int().positive('Order ID must be a positive integer'),
});
