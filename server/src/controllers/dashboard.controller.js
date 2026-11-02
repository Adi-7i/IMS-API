// @ts-check
import { makeDashboardService } from '../services/dashboard.service.js';
import { successResponse } from '../utils/response.js';
import { getDb } from '../db/connection.js';

/**
 * GET /api/dashboard/summary?range=7d|30d
 * @type {import('express').RequestHandler}
 */
export function getSummary(req, res, next) {
  try {
    const service = makeDashboardService(getDb());
    const range   = typeof req.query.range === 'string' ? req.query.range : '7d';
    const data    = service.getSummary({ range });
    res.json(successResponse(data, 'Dashboard summary retrieved'));
  } catch (err) {
    next(err);
  }
}
