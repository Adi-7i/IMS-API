// @ts-check
import { makeOrderRepository }       from '../repositories/order.repository.js';
import { makeProductRepository }     from '../repositories/product.repository.js';
import { makeInventoryRepository }   from '../repositories/inventory.repository.js';
import { makeIdempotencyRepository } from '../repositories/idempotency.repository.js';
import { getDb } from '../db/connection.js';
import { NotFoundError, UnprocessableError, ConflictError } from '../utils/errors.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import { generateOrderNumber } from '../utils/orderNumber.js';

/**
 * Valid order status transitions.
 * @type {Record<string, string[]>}
 */
const ALLOWED_TRANSITIONS = {
  Pending:   ['Confirmed', 'Cancelled'],
  Confirmed: ['Completed', 'Cancelled'],
  Completed: [],
  Cancelled: [],
};

/**
 * Order service — business logic.
 * @param {import('better-sqlite3').Database} [dbOverride]
 */
export function makeOrderService(dbOverride) {
  const db        = dbOverride ?? getDb();
  const orders    = makeOrderRepository(db);
  const products  = makeProductRepository(db);
  const inventory = makeInventoryRepository(db);
  const idem      = makeIdempotencyRepository(db);

  return {
    /**
     * @param {Record<string, unknown>} query
     */
    listOrders(query) {
      const pagination = parsePagination(query);
      const { rows, total } = orders.findAll({
        ...pagination,
        status:   typeof query.status === 'string' ? query.status : undefined,
        sort_dir: query.sort_dir === 'asc' ? 'asc' : 'desc',
      });
      return {
        data: rows,
        pagination: buildPaginationMeta({ ...pagination, total }),
      };
    },

    /**
     * @param {number} id
     */
    getOrder(id) {
      const order = orders.findById(id);
      if (!order) throw new NotFoundError(`Order with id ${id} not found`);
      const items   = orders.findItemsByOrderId(id);
      const history = orders.findStatusHistory(id);
      return { ...order, items, status_history: history };
    },

    /**
     * Creates an order atomically:
     * - Validates all products are active and have sufficient stock
     * - Deducts stock and records movements
     * - Persists order, items, status history, and idempotency record
     *
     * @param {{ customer_name: string, items: Array<{product_id: number, quantity: number}> }} data
     * @param {{ idempotencyKey: string, idempotencyHash: string, requestPath: string }} idempCtx
     */
    createOrder(data, idempCtx) {
      const createTx = db.transaction(() => {
        // ── Resolve & validate every product ──────────────────────────────
        /** @type {Array<{ product: any, quantity: number, lineTotal: number }>} */
        const resolvedItems = [];

        for (const item of data.items) {
          const product = products.findForUpdate(item.product_id);
          if (!product) {
            throw new NotFoundError(`Product with id ${item.product_id} not found`);
          }
          if (!product.is_active) {
            throw new UnprocessableError(
              `Product ${item.product_id} is archived and cannot be ordered.`,
              'PRODUCT_ARCHIVED'
            );
          }
          if (product.stock_quantity < item.quantity) {
            throw new UnprocessableError(
              `Insufficient stock for product ${item.product_id}. Available: ${product.stock_quantity}, requested: ${item.quantity}.`,
              'INSUFFICIENT_STOCK'
            );
          }
          resolvedItems.push({
            product,
            quantity: item.quantity,
            lineTotal: product.price_paise * item.quantity,
          });
        }

        const totalPaise = resolvedItems.reduce((sum, i) => sum + i.lineTotal, 0);

        // ── Create the order ───────────────────────────────────────────────
        const orderNumber = generateOrderNumber();
        const orderId = orders.create({
          order_number:  orderNumber,
          customer_name: data.customer_name,
          total_paise:   totalPaise,
        });

        // ── Insert items + deduct stock + record movements ─────────────────
        for (const resolved of resolvedItems) {
          orders.createItem({
            order_id:        orderId,
            product_id:      resolved.product.id,
            quantity:        resolved.quantity,
            unit_price_paise: resolved.product.price_paise,
            line_total_paise: resolved.lineTotal,
          });

          const prevStock = resolved.product.stock_quantity;
          const newStock  = prevStock - resolved.quantity;

          products.adjustStock(resolved.product.id, -resolved.quantity);

          inventory.createMovement({
            product_id:      resolved.product.id,
            movement_type:   'sale',
            quantity_delta:  -resolved.quantity,
            previous_stock:  prevStock,
            resulting_stock: newStock,
            order_id:        orderId,
            reason:          `Sale — Order ${orderNumber}`,
          });
        }

        // ── Status history ─────────────────────────────────────────────────
        orders.insertStatusHistory({
          order_id:        orderId,
          previous_status: null,
          new_status:      'Pending',
        });

        // ── Idempotency record ─────────────────────────────────────────────
        idem.create({
          key:    idempCtx.idempotencyKey,
          path:   idempCtx.requestPath,
          hash:   idempCtx.idempotencyHash,
          status: 201,
          body:   '{}', // placeholder — caller will overwrite after fetching the order
        });

        return orderId;
      });

      const orderId = /** @type {number} */ (createTx());

      // Build the full order object to return (and to store in idempotency body)
      const order = this.getOrder(orderId);

      // Overwrite the placeholder idempotency body with the real response
      db.prepare(
        `UPDATE idempotency_records SET response_body = ? WHERE idempotency_key = ?`
      ).run(JSON.stringify({ success: true, data: order, message: 'Order created successfully' }), idempCtx.idempotencyKey);

      return order;
    },

    /**
     * Transitions an order to a new status.
     * Cancellation restores stock atomically.
     *
     * @param {number} id
     * @param {string} newStatus
     */
    updateOrderStatus(id, newStatus) {
      const order = orders.findById(id);
      if (!order) throw new NotFoundError(`Order with id ${id} not found`);

      // No-op if already the target status
      if (order.status === newStatus) {
        return this.getOrder(id);
      }

      const allowed = ALLOWED_TRANSITIONS[order.status] ?? [];
      if (!allowed.includes(newStatus)) {
        throw new UnprocessableError(
          `Cannot transition order from '${order.status}' to '${newStatus}'.`,
          'INVALID_STATUS_TRANSITION'
        );
      }

      const updateTx = db.transaction(() => {
        // If cancelling, restore stock
        if (newStatus === 'Cancelled') {
          const items = orders.findItemsByOrderId(id);
          for (const item of items) {
            const product = products.findForUpdate(item.product_id);
            if (!product) continue;

            const prevStock = product.stock_quantity;
            const newStock  = prevStock + item.quantity;

            products.adjustStock(item.product_id, item.quantity);

            inventory.createMovement({
              product_id:      item.product_id,
              movement_type:   'cancellation_reversal',
              quantity_delta:  item.quantity,
              previous_stock:  prevStock,
              resulting_stock: newStock,
              order_id:        id,
              reason:          `Stock restored — Order ${order.order_number} cancelled`,
            });
          }
        }

        orders.updateStatus(id, newStatus);
        orders.insertStatusHistory({
          order_id:        id,
          previous_status: order.status,
          new_status:      newStatus,
        });
      });

      updateTx();
      return this.getOrder(id);
    },
  };
}
