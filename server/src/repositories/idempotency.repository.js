// @ts-check
/**
 * Idempotency repository — raw SQL queries.
 * @module repositories/idempotency
 */

/**
 * @param {import('better-sqlite3').Database} db
 */
export function makeIdempotencyRepository(db) {
  return {
    /**
     * @param {string} key
     * @returns {{ idempotency_key: string, request_hash: string, response_status: number, response_body: string } | undefined}
     */
    findByKey(key) {
      return /** @type {any} */ (db.prepare(
        `SELECT idempotency_key, request_hash, response_status, response_body
           FROM idempotency_records
          WHERE idempotency_key = ?`
      ).get(key));
    },

    /**
     * @param {{ key: string, path: string, hash: string, status: number, body: string }} data
     */
    create(data) {
      db.prepare(`
        INSERT INTO idempotency_records (idempotency_key, request_path, request_hash, response_status, response_body)
        VALUES (@key, @path, @hash, @status, @body)
      `).run(data);
    },
  };
}
