// @ts-check
/**
 * Stable SHA-256 hash of a JSON-serialisable value.
 * Used for idempotency payload comparison.
 * @module utils/hash
 */
import crypto from 'node:crypto';

/**
 * @param {unknown} value
 * @returns {string}
 */
export function hashBody(value) {
  const json = JSON.stringify(value, Object.keys(/** @type {object} */ (value) ?? {}).sort());
  return crypto.createHash('sha256').update(json).digest('hex');
}
