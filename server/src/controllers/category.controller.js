// @ts-check
import { makeCategoryService } from '../services/category.service.js';
import { successResponse } from '../utils/response.js';
import { getDb } from '../db/connection.js';

/**
 * GET /api/categories
 * @type {import('express').RequestHandler}
 */
export function listCategories(req, res, next) {
  try {
    const service = makeCategoryService(getDb());
    const data    = service.listCategories();
    res.json(successResponse(data, 'Categories retrieved'));
  } catch (err) {
    next(err);
  }
}
