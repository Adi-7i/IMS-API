// @ts-check
import { makeProductService } from '../services/product.service.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { getDb } from '../db/connection.js';

/**
 * GET /api/products
 * @type {import('express').RequestHandler}
 */
export function listProducts(req, res, next) {
  try {
    const service = makeProductService(getDb());
    const { data, pagination } = service.listProducts(/** @type {any} */ (req.query));
    res.json(paginatedResponse(data, pagination, 'Products retrieved'));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/products/:id
 * @type {import('express').RequestHandler}
 */
export function getProduct(req, res, next) {
  try {
    const service = makeProductService(getDb());
    const data    = service.getProduct(Number(req.params.id));
    res.json(successResponse(data, 'Product retrieved'));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/products
 * @type {import('express').RequestHandler}
 */
export function createProduct(req, res, next) {
  try {
    const service = makeProductService(getDb());
    const data    = service.createProduct(req.body);
    res.status(201).json(successResponse(data, 'Product created successfully'));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/products/:id
 * @type {import('express').RequestHandler}
 */
export function updateProduct(req, res, next) {
  try {
    const service = makeProductService(getDb());
    const data    = service.updateProduct(Number(req.params.id), req.body);
    res.json(successResponse(data, 'Product updated successfully'));
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/products/:id
 * @type {import('express').RequestHandler}
 */
export function archiveProduct(req, res, next) {
  try {
    const service = makeProductService(getDb());
    const data    = service.archiveProduct(Number(req.params.id));
    res.json(successResponse(data, 'Product archived successfully'));
  } catch (err) {
    next(err);
  }
}
