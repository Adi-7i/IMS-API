// @ts-check
import { getDb } from '../db/connection.js';
import { hashBody } from '../utils/hash.js';
import { BadRequestError, ConflictError } from '../utils/errors.js';

/**
 * Idempotency middleware.
 * Requires the `Idempotency-Key` header on mutating POST requests.
 *
 * Behaviour:
 *  - Missing header → 400.
 *  - Key exists + hash matches → replay stored response (no mutation).
 *  - Key exists + hash differs → 409 Conflict.
 *  - Key unseen → process normally; the service layer stores the result.
 *
 * The middleware exposes helpers on res.locals for service layer use:
 *   res.locals.idempotencyKey   — the key string
 *   res.locals.idempotencyHash  — hash of req.body
 *
 * @type {import('express').RequestHandler}
 */
export async function idempotency(req, res, next) {
  const key = req.headers['idempotency-key'];

  if (!key || typeof key !== 'string' || key.trim() === '') {
    return next(new BadRequestError('Idempotency-Key header is required.', 'MISSING_IDEMPOTENCY_KEY'));
  }

  const hash = hashBody(req.body);
  res.locals.idempotencyKey  = key.trim();
  res.locals.idempotencyHash = hash;

  const db = getDb();

  /** @type {any} */
  const record = db
    .prepare('SELECT request_hash, response_status, response_body FROM idempotency_records WHERE idempotency_key = ?')
    .get(key.trim());

  if (record) {
    if (record.request_hash !== hash) {
      return next(new ConflictError('Idempotency-Key reused with a different request payload.'));
    }
    // Replay
    const body = JSON.parse(record.response_body);
    res.status(record.response_status).json(body);
    return;
  }

  next();
}
