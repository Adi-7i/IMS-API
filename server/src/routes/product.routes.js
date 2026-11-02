// @ts-check
import { Router } from 'express';
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  archiveProduct,
} from '../controllers/product.controller.js';
import { validate } from '../middleware/validate.js';
import {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
  productIdParamSchema,
} from '../schemas/product.schema.js';

const router = Router();

// GET /api/products
router.get(
  '/',
  validate({ query: productQuerySchema }),
  listProducts
);

// GET /api/products/:id
router.get(
  '/:id',
  validate({ params: productIdParamSchema }),
  getProduct
);

// POST /api/products
router.post(
  '/',
  validate({ body: createProductSchema }),
  createProduct
);

// PATCH /api/products/:id
router.patch(
  '/:id',
  validate({ params: productIdParamSchema, body: updateProductSchema }),
  updateProduct
);

// DELETE /api/products/:id  (soft archive)
router.delete(
  '/:id',
  validate({ params: productIdParamSchema }),
  archiveProduct
);

export default router;
