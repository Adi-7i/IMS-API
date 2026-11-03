// @ts-check
import { Router } from 'express';
import { listCategories, createCategory } from '../controllers/category.controller.js';

import { validate } from '../middleware/validate.js';
import { z } from 'zod';

const router = Router();
const createCategorySchema = z.object({ name: z.string().trim().min(1, 'Category name is required').max(100) }).strict();

// GET /api/categories
router.get('/', listCategories);

router.post('/', validate({ body: createCategorySchema }), createCategory);

export default router;
