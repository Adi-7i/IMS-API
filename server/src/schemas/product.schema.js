// @ts-check
import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200),
  sku: z.string().min(1, 'SKU is required').max(50)
    .regex(/^[A-Za-z0-9\-_]+$/, 'SKU must be alphanumeric with hyphens or underscores'),
  category_id: z.number({ required_error: 'category_id is required' })
    .int().positive('category_id must be a positive integer'),
  description: z.string().max(1000).optional().nullable(),
  price_paise: z.number({ required_error: 'price_paise is required' })
    .int().min(0, 'price_paise must be >= 0'),
  stock_quantity: z.number({ required_error: 'stock_quantity is required' })
    .int().min(0, 'stock_quantity must be >= 0'),
  low_stock_threshold: z.number()
    .int().min(0, 'low_stock_threshold must be >= 0')
    .default(5),
});

export const updateProductSchema = z.object({
  name:               z.string().min(1).max(200).optional(),
  category_id:        z.number().int().positive().optional(),
  description:        z.string().max(1000).nullable().optional(),
  price_paise:        z.number().int().min(0).optional(),
  low_stock_threshold: z.number().int().min(0).optional(),
  // stock_quantity intentionally excluded — use inventory adjustments
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

export const productQuerySchema = z.object({
  page:        z.coerce.number().int().positive().optional().default(1),
  limit:       z.coerce.number().int().positive().max(100).optional().default(20),
  search:      z.string().optional(),
  availability: z.enum(['in_stock', 'low_stock', 'out_of_stock']).optional(),
  category_id: z.coerce.number().int().positive().optional(),
  is_active:   z.enum(['true', 'false', '0', '1']).optional(),
  sort_by:     z.enum(['name', 'price_paise', 'stock_quantity', 'created_at']).optional().default('created_at'),
  sort_dir:    z.enum(['asc', 'desc']).optional().default('desc'),
});

export const productIdParamSchema = z.object({
  id: z.coerce.number().int().positive('Product ID must be a positive integer'),
});
