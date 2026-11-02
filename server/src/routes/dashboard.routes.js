// @ts-check
import { Router } from 'express';
import { getSummary } from '../controllers/dashboard.controller.js';

const router = Router();

// GET /api/dashboard/summary?range=7d|30d
router.get('/summary', getSummary);

export default router;
