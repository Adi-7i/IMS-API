// @ts-check
import { z } from 'zod';

export const adjustmentSchema = z.object({
  product_id: z.number({ required_error: 'product_id is required' })
    .int().positive('product_id must be a positive integer'),
  delta: z.number({ required_error: 'delta is required' })
    .int()
    .refine((n) => n !== 0, { message: 'delta must not be zero' }),
  reason: z.string().min(1, 'reason is required').max(500),
});

export const movementsQuerySchema = z.object({
  page:        z.coerce.number().int().positive().optional().default(1),
  limit:       z.coerce.number().int().positive().max(100).optional().default(20),
  product_id:  z.coerce.number().int().positive().optional(),
  type:        z.enum(['initial', 'sale', 'cancellation_reversal', 'adjustment']).optional(),
  sort_dir:    z.enum(['asc', 'desc']).optional().default('desc'),
});

export const lowStockQuerySchema = z.object({
  include_out_of_stock: z.enum(['true', 'false']).optional().default('true'),
  page:  z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});
