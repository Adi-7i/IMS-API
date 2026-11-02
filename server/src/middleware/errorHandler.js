// @ts-check
import { AppError } from '../utils/errors.js';
import { errorResponse } from '../utils/response.js';
import config from '../config/index.js';

/**
 * Centralised error-handling middleware.
 * Must be registered AFTER all routes (4-argument Express error handler).
 *
 * Never exposes internal stack traces in production.
 *
 * @type {import('express').ErrorRequestHandler}
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  const isDev = config.nodeEnv === 'development';

  // Known application errors
  if (err instanceof AppError) {
    /** @type {any} */
    const body = errorResponse(err.code, err.message, err.details);
    if (isDev && err.status >= 500) {
      body.stack = err.stack;
    }
    res.status(err.status).json(body);
    return;
  }

  // SQLite UNIQUE constraint violation → 409 Conflict
  if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
    const field = err.message.split('UNIQUE constraint failed: ')[1] ?? 'field';
    res.status(409).json(
      errorResponse('CONFLICT', `A record with this ${field} already exists.`)
    );
    return;
  }

  // SQLite foreign key violation → 422
  if (err instanceof Error && err.message.includes('FOREIGN KEY constraint failed')) {
    res.status(422).json(
      errorResponse('INVALID_REFERENCE', 'A referenced resource does not exist.')
    );
    return;
  }

  // Zod parse errors that somehow escaped the validate middleware
  if (err instanceof Error && err.name === 'ZodError') {
    res.status(400).json(
      errorResponse('VALIDATION_ERROR', 'Request validation failed', /** @type {any} */ (err).errors)
    );
    return;
  }

  // Unexpected errors — log full details server-side, return generic message
  console.error(JSON.stringify({
    level: 'error',
    timestamp: new Date().toISOString(),
    // @ts-ignore
    requestId: req.requestId,
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  }));

  const body = errorResponse('INTERNAL_ERROR', 'An unexpected error occurred.');
  if (isDev) {
    // @ts-ignore
    body.stack = err instanceof Error ? err.stack : String(err);
  }
  res.status(500).json(body);
}
