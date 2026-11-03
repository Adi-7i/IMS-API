// @ts-check
/**
 * Inventory repository — raw SQL queries for stock movements and low-stock alerts.
 * @module repositories/inventory
 */

/**
 * @typedef {Object} StockMovementRow
 * @property {number}      id
 * @property {number}      product_id
 * @property {string}      movement_type
 * @property {number}      quantity_delta
 * @property {number}      previous_stock
 * @property {number}      resulting_stock
 * @property {number|null} order_id
 * @property {string}      reason
 * @property {string}      created_at
 * @property {string}      [product_name]
 * @property {string}      [product_sku]
 */

/**
 * @param {import('better-sqlite3').Database} db
 */
export function makeInventoryRepository(db) {
  return {
    /**
     * Products where stock_quantity <= low_stock_threshold.
     * @param {{ page: number, limit: number, offset: number, include_out_of_stock?: boolean }} opts
     * @returns {{ rows: any[], total: number }}
     */
    getLowStock(opts) {
      const { limit, offset } = opts;

      const total = /** @type {{count:number}} */ (db.prepare(`
        SELECT COUNT(*) as count
          FROM products p
          JOIN categories c ON p.category_id = c.id
         WHERE p.is_active = 1
           AND p.stock_quantity <= p.low_stock_threshold
           ${opts.include_out_of_stock === false ? 'AND p.stock_quantity > 0' : ''}
      `).get()).count;

      const rows = db.prepare(`
        SELECT p.*, c.name AS category_name
          FROM products p
          JOIN categories c ON p.category_id = c.id
         WHERE p.is_active = 1
           AND p.stock_quantity <= p.low_stock_threshold
           ${opts.include_out_of_stock === false ? 'AND p.stock_quantity > 0' : ''}
         ORDER BY p.stock_quantity ASC
         LIMIT ? OFFSET ?
      `).all(limit, offset);

      return { rows, total };
    },

    /**
     * @param {{ page: number, limit: number, offset: number, product_id?: number, type?: string, sort_dir?: string }} opts
     * @returns {{ rows: StockMovementRow[], total: number }}
     */
    getMovements(opts) {
      const { limit, offset, product_id, type } = opts;
      const sortDir = opts.sort_dir === 'asc' ? 'ASC' : 'DESC';

      /** @type {any[]} */
      const params = [];
      /** @type {string[]} */
      const conditions = [];

      if (product_id !== undefined) {
        conditions.push('sm.product_id = ?');
        params.push(product_id);
      }
      if (type) {
        conditions.push('sm.movement_type = ?');
        params.push(type);
      }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      const total = /** @type {{count:number}} */ (db.prepare(
        `SELECT COUNT(*) as count FROM stock_movements sm ${where}`
      ).get(...params)).count;

      const rows = /** @type {StockMovementRow[]} */ (db.prepare(`
        SELECT sm.*, p.name AS product_name, p.sku AS product_sku, o.order_number
          FROM stock_movements sm
          JOIN products p ON sm.product_id = p.id
          LEFT JOIN orders o ON sm.order_id = o.id
          ${where}
         ORDER BY sm.created_at ${sortDir}
         LIMIT ? OFFSET ?
      `).all(...params, limit, offset));

      return { rows, total };
    },

    /**
     * Records a stock movement (immutable).
     * @param {{ product_id: number, movement_type: string, quantity_delta: number, previous_stock: number, resulting_stock: number, order_id: number|null, reason: string }} data
     * @returns {number} movement id
     */
    createMovement(data) {
      const result = db.prepare(`
        INSERT INTO stock_movements
          (product_id, movement_type, quantity_delta, previous_stock, resulting_stock, order_id, reason)
        VALUES
          (@product_id, @movement_type, @quantity_delta, @previous_stock, @resulting_stock, @order_id, @reason)
      `).run(data);
      return Number(result.lastInsertRowid);
    },

    /** @returns {{ total_active: number, low_stock_count: number, out_of_stock_count: number }} */
    getSummaryStats() {
      return /** @type {any} */ (db.prepare(`
        SELECT
          COUNT(*) FILTER (WHERE is_active = 1)                                        AS total_active,
          COUNT(*) FILTER (WHERE is_active = 1 AND stock_quantity <= low_stock_threshold) AS low_stock_count,
          COUNT(*) FILTER (WHERE is_active = 1 AND stock_quantity = 0)                 AS out_of_stock_count
        FROM products
      `).get());
    },
  };
}
