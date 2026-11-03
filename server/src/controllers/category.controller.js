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

/** @type {import('express').RequestHandler} */
export function createCategory(req, res, next) {
  try {
    const category = makeCategoryService().createCategory(req.body.name);
    res.status(201).json(successResponse(category, 'Category created successfully'));
  } catch (error) { next(error); }
}
