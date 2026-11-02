// @ts-check
/**
 * Category repository — raw SQL queries.
 * @module repositories/category
 */

/**
 * @param {import('better-sqlite3').Database} db
 */
export function makeCategoryRepository(db) {
  return {
    /** @returns {Array<{id: number, name: string, created_at: string}>} */
    findAll() {
      return /** @type {any[]} */ (db.prepare('SELECT id, name, created_at FROM categories ORDER BY name ASC').all());
    },

    /** @param {number} id @returns {{id: number, name: string} | undefined} */
    findById(id) {
      return /** @type {any} */ (db.prepare('SELECT id, name FROM categories WHERE id = ?').get(id));
    },
  };
}
