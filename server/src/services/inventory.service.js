// @ts-check
import { makeProductRepository }     from '../repositories/product.repository.js';
import { makeInventoryRepository }   from '../repositories/inventory.repository.js';
import { makeIdempotencyRepository } from '../repositories/idempotency.repository.js';
import { getDb } from '../db/connection.js';
import { NotFoundError, UnprocessableError } from '../utils/errors.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';

/**
 * Inventory service — business logic.
 * @param {import('better-sqlite3').Database} [dbOverride]
 */
export function makeInventoryService(dbOverride) {
  const db       = dbOverride ?? getDb();
  const prods    = makeProductRepository(db);
  const inv      = makeInventoryRepository(db);
  const idem     = makeIdempotencyRepository(db);

  return {
    /**
     * @param {Record<string, unknown>} query
     */
    getLowStock(query) {
      const pagination = parsePagination(query);
      const { rows, total } = inv.getLowStock({
        ...pagination,
        include_out_of_stock: query.include_out_of_stock !== 'false',
      });
      return {
        data: rows,
        pagination: buildPaginationMeta({ ...pagination, total }),
      };
    },

    /**
     * @param {Record<string, unknown>} query
     */
    getMovements(query) {
      const pagination = parsePagination(query);
      const { rows, total } = inv.getMovements({
        ...pagination,
        product_id: query.product_id ? Number(query.product_id) : undefined,
        type:       typeof query.type === 'string' ? query.type : undefined,
        sort_dir:   query.sort_dir === 'asc' ? 'asc' : 'desc',
      });
      return {
        data: rows,
        pagination: buildPaginationMeta({ ...pagination, total }),
      };
    },

    /**
     * Manual stock adjustment (add or subtract).
     * Atomic: updates stock + records movement + writes idempotency.
     *
     * @param {{ product_id: number, delta: number, reason: string }} data
     * @param {{ idempotencyKey: string, idempotencyHash: string, requestPath: string }} idempCtx
     */
    adjust(data, idempCtx) {
      const adjustTx = db.transaction(() => {
        const product = prods.findForUpdate(data.product_id);
        if (!product) {
          throw new NotFoundError(`Product with id ${data.product_id} not found`);
        }
        if (!product.is_active) {
          throw new UnprocessableError(
            `Product ${data.product_id} is archived and cannot be adjusted.`,
            'PRODUCT_ARCHIVED'
          );
        }

        const prevStock = product.stock_quantity;
        const newStock  = prevStock + data.delta;

        if (newStock < 0) {
          throw new UnprocessableError(
            `Adjustment would result in negative stock (${newStock}). Current stock: ${prevStock}.`,
            'NEGATIVE_STOCK'
          );
        }

        prods.adjustStock(data.product_id, data.delta);

        const movementId = inv.createMovement({
          product_id:      data.product_id,
          movement_type:   'adjustment',
          quantity_delta:  data.delta,
          previous_stock:  prevStock,
          resulting_stock: newStock,
          order_id:        null,
          reason:          data.reason,
        });

        // Store idempotency with placeholder — overwritten after tx
        idem.create({
          key:    idempCtx.idempotencyKey,
          path:   idempCtx.requestPath,
          hash:   idempCtx.idempotencyHash,
          status: 200,
          body:   '{}',
        });

        return { movementId, prevStock, newStock };
      });

      const { movementId, prevStock, newStock } = /** @type {any} */ (adjustTx());

      const result = {
        product_id:      data.product_id,
        movement_id:     movementId,
        delta:           data.delta,
        previous_stock:  prevStock,
        resulting_stock: newStock,
        reason:          data.reason,
      };

      // Overwrite placeholder with real response
      db.prepare(
        `UPDATE idempotency_records SET response_body = ? WHERE idempotency_key = ?`
      ).run(
        JSON.stringify({ success: true, data: result, message: 'Stock adjusted successfully' }),
        idempCtx.idempotencyKey
      );

      return result;
    },
  };
}
