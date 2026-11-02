// @ts-check
import { makeInventoryService } from '../services/inventory.service.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { getDb } from '../db/connection.js';

/**
 * GET /api/inventory/low-stock
 * @type {import('express').RequestHandler}
 */
export function getLowStock(req, res, next) {
  try {
    const service = makeInventoryService(getDb());
    const { data, pagination } = service.getLowStock(/** @type {any} */ (req.query));
    res.json(paginatedResponse(data, pagination, 'Low stock products retrieved'));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/inventory/movements
 * @type {import('express').RequestHandler}
 */
export function getMovements(req, res, next) {
  try {
    const service = makeInventoryService(getDb());
    const { data, pagination } = service.getMovements(/** @type {any} */ (req.query));
    res.json(paginatedResponse(data, pagination, 'Stock movements retrieved'));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/inventory/adjustments
 * @type {import('express').RequestHandler}
 */
export function adjustStock(req, res, next) {
  try {
    const service = makeInventoryService(getDb());
    const data    = service.adjust(req.body, {
      idempotencyKey:  res.locals.idempotencyKey,
      idempotencyHash: res.locals.idempotencyHash,
      requestPath:     req.path,
    });
    res.json(successResponse(data, 'Stock adjusted successfully'));
  } catch (err) {
    next(err);
  }
}
