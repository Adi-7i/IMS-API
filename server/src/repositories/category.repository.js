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
    /** @param {string} name */
    create(name) {
      const result = db.prepare('INSERT INTO categories (name) VALUES (?)').run(name);
      return /** @type {{id: number, name: string, created_at: string}} */ (db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid));
    },
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
