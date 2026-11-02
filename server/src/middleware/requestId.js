// @ts-check
import { v4 as uuidv4 } from 'uuid';

/**
 * Attaches a unique X-Request-Id header to every request.
 * Controllers and loggers can read req.requestId.
 *
 * @type {import('express').RequestHandler}
 */
export function requestId(req, res, next) {
  const id = /** @type {string} */ (req.headers['x-request-id']) || uuidv4();
  // @ts-ignore — extending req
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}
