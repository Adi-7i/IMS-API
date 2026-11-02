// @ts-check
import { Router } from 'express';
import { listCategories } from '../controllers/category.controller.js';

const router = Router();

// GET /api/categories
router.get('/', listCategories);

export default router;
