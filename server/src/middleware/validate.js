// @ts-check
import { ZodError } from 'zod';
import { errorResponse } from '../utils/response.js';

/**
 * Middleware factory that validates req.body, req.params, and/or req.query
 * against Zod schemas. Returns 400 on failure.
 *
 * @param {{ body?: import('zod').ZodTypeAny, params?: import('zod').ZodTypeAny, query?: import('zod').ZodTypeAny }} schemas
 * @returns {import('express').RequestHandler}
 */
export function validate(schemas) {
  return (req, res, next) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'Request validation failed', details)
        );
      }
      next(err);
    }
  };
}
