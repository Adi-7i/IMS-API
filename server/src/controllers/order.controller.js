// @ts-check
import { makeOrderService } from '../services/order.service.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { getDb } from '../db/connection.js';

/**
 * GET /api/orders
 * @type {import('express').RequestHandler}
 */
export function listOrders(req, res, next) {
  try {
    const service = makeOrderService(getDb());
    const { data, pagination } = service.listOrders(/** @type {any} */ (req.query));
    res.json(paginatedResponse(data, pagination, 'Orders retrieved'));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/orders/:id
 * @type {import('express').RequestHandler}
 */
export function getOrder(req, res, next) {
  try {
    const service = makeOrderService(getDb());
    const data    = service.getOrder(Number(req.params.id));
    res.json(successResponse(data, 'Order retrieved'));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/orders
 * @type {import('express').RequestHandler}
 */
export function createOrder(req, res, next) {
  try {
    const service = makeOrderService(getDb());
    const data    = service.createOrder(req.body, {
      idempotencyKey:  res.locals.idempotencyKey,
      idempotencyHash: res.locals.idempotencyHash,
      requestPath:     req.path,
    });
    res.status(201).json(successResponse(data, 'Order created successfully'));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/orders/:id/status
 * @type {import('express').RequestHandler}
 */
export function updateOrderStatus(req, res, next) {
  try {
    const service = makeOrderService(getDb());
    const data    = service.updateOrderStatus(Number(req.params.id), req.body.status);
    res.json(successResponse(data, `Order status updated to '${req.body.status}'`));
  } catch (err) {
    next(err);
  }
}
