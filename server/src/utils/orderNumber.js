// @ts-check
/**
 * Order number generator.
 * Format: ORD-YYYYMMDD-NNNN  (date from UTC clock + 4-char random suffix).
 * @module utils/orderNumber
 */

/**
 * Generates a unique order number.
 * @returns {string}  e.g. "ORD-20261102-A3F7"
 */
export function generateOrderNumber() {
  const now  = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).toUpperCase().slice(2, 6).padEnd(4, '0');
  return `ORD-${date}-${rand}`;
}
