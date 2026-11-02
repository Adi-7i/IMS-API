// @ts-check
/**
 * Order repository — raw SQL queries.
 * @module repositories/order
 */

/**
 * @typedef {Object} OrderRow
 * @property {number} id
 * @property {string} order_number
 * @property {string} customer_name
 * @property {string} status
 * @property {number} total_paise
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} OrderItemRow
 * @property {number} id
 * @property {number} order_id
 * @property {number} product_id
 * @property {number} quantity
 * @property {number} unit_price_paise
 * @property {number} line_total_paise
 * @property {string} [product_name]
 * @property {string} [product_sku]
 */

/**
 * @param {import('better-sqlite3').Database} db
 */
export function makeOrderRepository(db) {
  return {
    /**
     * @param {{ page: number, limit: number, offset: number, status?: string, sort_dir?: string }} opts
     * @returns {{ rows: OrderRow[], total: number }}
     */
    findAll(opts) {
      const { limit, offset, status } = opts;
      const sortDir = opts.sort_dir === 'asc' ? 'ASC' : 'DESC';

      /** @type {any[]} */
      const params = [];
      let where = '';
      if (status) {
        where = 'WHERE status = ?';
        params.push(status);
      }

      const total = /** @type {{count:number}} */ (db.prepare(
        `SELECT COUNT(*) as count FROM orders ${where}`
      ).get(...params)).count;

      const rows = /** @type {OrderRow[]} */ (db.prepare(`
        SELECT * FROM orders ${where} ORDER BY created_at ${sortDir} LIMIT ? OFFSET ?
      `).all(...params, limit, offset));

      return { rows, total };
    },

    /**
     * @param {number} id
     * @returns {OrderRow | undefined}
     */
    findById(id) {
      return /** @type {OrderRow | undefined} */ (db.prepare(
        `SELECT * FROM orders WHERE id = ?`
      ).get(id));
    },

    /**
     * @param {number} id
     * @returns {OrderItemRow[]}
     */
    findItemsByOrderId(id) {
      return /** @type {OrderItemRow[]} */ (db.prepare(`
        SELECT oi.*, p.name AS product_name, p.sku AS product_sku
          FROM order_items oi
          JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ?
      `).all(id));
    },

    /**
     * @param {number} id
     * @returns {Array<{id:number, order_id:number, previous_status:string|null, new_status:string, created_at:string}>}
     */
    findStatusHistory(id) {
      return /** @type {any[]} */ (db.prepare(
        `SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC`
      ).all(id));
    },

    /**
     * @param {{ order_number: string, customer_name: string, total_paise: number }} data
     * @returns {number} new order id
     */
    create(data) {
      const result = db.prepare(`
        INSERT INTO orders (order_number, customer_name, total_paise)
        VALUES (@order_number, @customer_name, @total_paise)
      `).run(data);
      return Number(result.lastInsertRowid);
    },

    /**
     * @param {{ order_id: number, product_id: number, quantity: number, unit_price_paise: number, line_total_paise: number }} item
     */
    createItem(item) {
      db.prepare(`
        INSERT INTO order_items (order_id, product_id, quantity, unit_price_paise, line_total_paise)
        VALUES (@order_id, @product_id, @quantity, @unit_price_paise, @line_total_paise)
      `).run(item);
    },

    /**
     * @param {number} id
     * @param {string} status
     */
    updateStatus(id, status) {
      db.prepare(`UPDATE orders SET status = ? WHERE id = ?`).run(status, id);
    },

    /**
     * @param {{ order_id: number, previous_status: string|null, new_status: string }} data
     */
    insertStatusHistory(data) {
      db.prepare(`
        INSERT INTO order_status_history (order_id, previous_status, new_status)
        VALUES (@order_id, @previous_status, @new_status)
      `).run(data);
    },
  };
}
