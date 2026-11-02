// @ts-check
import { Router } from 'express';
import {
  getLowStock,
  getMovements,
  adjustStock,
} from '../controllers/inventory.controller.js';
import { validate } from '../middleware/validate.js';
import { idempotency } from '../middleware/idempotency.js';
import {
  adjustmentSchema,
  movementsQuerySchema,
  lowStockQuerySchema,
} from '../schemas/inventory.schema.js';

const router = Router();

// GET /api/inventory/low-stock
router.get(
  '/low-stock',
  validate({ query: lowStockQuerySchema }),
  getLowStock
);

// GET /api/inventory/movements
router.get(
  '/movements',
  validate({ query: movementsQuerySchema }),
  getMovements
);

// POST /api/inventory/adjustments — requires Idempotency-Key header
router.post(
  '/adjustments',
  validate({ body: adjustmentSchema }),
  idempotency,
  adjustStock
);

export default router;
