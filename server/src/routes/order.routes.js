// @ts-check
import { Router } from 'express';
import {
  listOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
} from '../controllers/order.controller.js';
import { validate } from '../middleware/validate.js';
import { idempotency } from '../middleware/idempotency.js';
import {
  createOrderSchema,
  updateOrderStatusSchema,
  orderQuerySchema,
  orderIdParamSchema,
} from '../schemas/order.schema.js';

const router = Router();

// GET /api/orders
router.get(
  '/',
  validate({ query: orderQuerySchema }),
  listOrders
);

// GET /api/orders/:id
router.get(
  '/:id',
  validate({ params: orderIdParamSchema }),
  getOrder
);

// POST /api/orders  — requires Idempotency-Key header
router.post(
  '/',
  validate({ body: createOrderSchema }),
  idempotency,
  createOrder
);

// PATCH /api/orders/:id/status
router.patch(
  '/:id/status',
  validate({ params: orderIdParamSchema, body: updateOrderStatusSchema }),
  updateOrderStatus
);

export default router;
