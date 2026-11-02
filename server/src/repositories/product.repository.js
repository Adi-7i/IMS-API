// @ts-check
/**
 * Product repository — raw SQL queries.
 * All monetary values stored as integer paise.
 * @module repositories/product
 */

/**
 * @typedef {Object} ProductRow
 * @property {number}      id
 * @property {string}      name
 * @property {string}      sku
 * @property {number}      category_id
 * @property {string|null} description
 * @property {number}      price_paise
 * @property {number}      stock_quantity
 * @property {number}      low_stock_threshold
 * @property {number}      is_active
 * @property {string}      created_at
 * @property {string}      updated_at
 * @property {string}      [category_name]
 */

/**
 * @typedef {Object} ProductListOptions
 * @property {number}  page
 * @property {number}  limit
 * @property {number}  offset
 * @property {string}  [search]
 * @property {number}  [category_id]
 * @property {boolean} [is_active]
 * @property {string}  [sort_by]
 * @property {'asc'|'desc'} [sort_dir]
 */

/**
 * @param {import('better-sqlite3').Database} db
 */
export function makeProductRepository(db) {
  const ALLOWED_SORT = new Set(['name', 'price_paise', 'stock_quantity', 'created_at']);

  return {
    /**
     * @param {ProductListOptions} opts
     * @returns {{ rows: ProductRow[], total: number }}
     */
    findAll(opts) {
      const { page, limit, offset, search, category_id, sort_dir } = opts;
      const sortBy  = ALLOWED_SORT.has(opts.sort_by ?? '') ? opts.sort_by : 'created_at';
      const sortDir = sort_dir === 'asc' ? 'ASC' : 'DESC';

      /** @type {any[]} */
      const conditions = [];
      /** @type {any[]} */
      const params = [];

      if (search) {
        conditions.push(`(p.name LIKE ? OR p.sku LIKE ?)`);
        params.push(`%${search}%`, `%${search}%`);
      }
      if (category_id !== undefined) {
        conditions.push(`p.category_id = ?`);
        params.push(category_id);
      }
      if (opts.is_active !== undefined) {
        conditions.push(`p.is_active = ?`);
        params.push(opts.is_active ? 1 : 0);
      }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      const total = /** @type {{count:number}} */ (db.prepare(
        `SELECT COUNT(*) as count FROM products p ${where}`
      ).get(...params)).count;

      const rows = /** @type {ProductRow[]} */ (db.prepare(`
        SELECT p.*, c.name AS category_name
          FROM products p
          JOIN categories c ON p.category_id = c.id
          ${where}
         ORDER BY p.${sortBy} ${sortDir}
         LIMIT ? OFFSET ?
      `).all(...params, limit, offset));

      return { rows, total };
    },

    /**
     * @param {number} id
     * @returns {ProductRow | undefined}
     */
    findById(id) {
      return /** @type {ProductRow | undefined} */ (db.prepare(`
        SELECT p.*, c.name AS category_name
          FROM products p
          JOIN categories c ON p.category_id = c.id
         WHERE p.id = ?
      `).get(id));
    },

    /**
     * @param {string} sku
     * @returns {ProductRow | undefined}
     */
    findBySku(sku) {
      return /** @type {ProductRow | undefined} */ (db.prepare(
        `SELECT * FROM products WHERE sku = ?`
      ).get(sku));
    },

    /**
     * @param {object} data
     * @param {string} data.name
     * @param {string} data.sku
     * @param {number} data.category_id
     * @param {string|null} data.description
     * @param {number} data.price_paise
     * @param {number} data.stock_quantity
     * @param {number} data.low_stock_threshold
     * @returns {number} new product id
     */
    create(data) {
      const result = db.prepare(`
        INSERT INTO products (name, sku, category_id, description, price_paise, stock_quantity, low_stock_threshold)
        VALUES (@name, @sku, @category_id, @description, @price_paise, @stock_quantity, @low_stock_threshold)
      `).run(data);
      return Number(result.lastInsertRowid);
    },

    /**
     * @param {number} id
     * @param {Partial<Omit<ProductRow,'id'|'stock_quantity'|'sku'|'created_at'|'updated_at'>>} data
     */
    update(id, data) {
      const sets = Object.keys(data).map((k) => `${k} = @${k}`).join(', ');
      db.prepare(`UPDATE products SET ${sets} WHERE id = @id`).run({ ...data, id });
    },

    /**
     * Soft-archive: sets is_active = 0.
     * @param {number} id
     */
    archive(id) {
      db.prepare(`UPDATE products SET is_active = 0 WHERE id = ?`).run(id);
    },

    /**
     * Lock-read product for transactional stock operations.
     * @param {number} id
     * @returns {{ id: number, stock_quantity: number, price_paise: number, is_active: number } | undefined}
     */
    findForUpdate(id) {
      return /** @type {any} */ (db.prepare(
        `SELECT id, stock_quantity, price_paise, is_active FROM products WHERE id = ?`
      ).get(id));
    },

    /**
     * @param {number} id
     * @param {number} delta  — positive to add, negative to deduct
     */
    adjustStock(id, delta) {
      db.prepare(
        `UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?`
      ).run(delta, id);
    },
  };
}
