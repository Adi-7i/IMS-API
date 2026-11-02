// @ts-check
import { getDb } from '../db/connection.js';

/**
 * Dashboard service — aggregate statistics.
 * @param {import('better-sqlite3').Database} [dbOverride]
 */
export function makeDashboardService(dbOverride) {
  const db = dbOverride ?? getDb();

  return {
    /**
     * @param {{ range?: string }} opts   "7d" (default) or "30d"
     */
    getSummary(opts = {}) {
      const days = opts.range === '30d' ? 30 : 7;

      // ── Product & inventory stats ───────────────────────────────────────
      /** @type {any} */
      const productStats = db.prepare(`
        SELECT
          COUNT(*) FILTER (WHERE is_active = 1)                                          AS total_active_products,
          COUNT(*) FILTER (WHERE is_active = 1 AND stock_quantity <= low_stock_threshold) AS low_stock_count,
          COUNT(*) FILTER (WHERE is_active = 1 AND stock_quantity = 0)                   AS out_of_stock_count
        FROM products
      `).get();

      // ── Order stats ────────────────────────────────────────────────────
      /** @type {any} */
      const orderStats = db.prepare(`
        SELECT
          COUNT(*)                                                             AS total_orders,
          COALESCE(SUM(total_paise) FILTER (WHERE status = 'Completed'), 0)   AS total_revenue_paise
        FROM orders
      `).get();

      // ── Recent orders (last 5) ─────────────────────────────────────────
      const recentOrders = db.prepare(`
        SELECT id, order_number, customer_name, status, total_paise, created_at
          FROM orders
         ORDER BY created_at DESC
         LIMIT 5
      `).all();

      // ── Daily sales trend ─────────────────────────────────────────────
      const trend = db.prepare(`
        WITH RECURSIVE dates(d) AS (
          SELECT date('now', ?)
          UNION ALL
          SELECT date(d, '+1 day') FROM dates WHERE d < date('now')
        )
        SELECT
          dates.d                           AS date,
          COALESCE(COUNT(o.id), 0)          AS order_count,
          COALESCE(SUM(o.total_paise), 0)   AS revenue_paise
        FROM dates
        LEFT JOIN orders o
               ON date(o.created_at) = dates.d
              AND o.status = 'Completed'
        GROUP BY dates.d
        ORDER BY dates.d ASC
      `).all(`-${days - 1} days`);

      return {
        products: {
          total_active:      productStats.total_active_products,
          low_stock_count:   productStats.low_stock_count,
          out_of_stock_count: productStats.out_of_stock_count,
        },
        orders: {
          total_orders:        orderStats.total_orders,
          total_revenue_paise: orderStats.total_revenue_paise,
        },
        recent_orders: recentOrders,
        daily_trend:   trend,
        range_days:    days,
      };
    },
  };
}
