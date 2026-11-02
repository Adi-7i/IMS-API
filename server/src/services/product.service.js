// @ts-check
import { makeProductRepository }   from '../repositories/product.repository.js';
import { makeCategoryRepository }  from '../repositories/category.repository.js';
import { makeInventoryRepository } from '../repositories/inventory.repository.js';
import { getDb } from '../db/connection.js';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';

/**
 * Product service — business logic layer.
 * @param {import('better-sqlite3').Database} [dbOverride]
 */
export function makeProductService(dbOverride) {
  const db        = dbOverride ?? getDb();
  const products  = makeProductRepository(db);
  const categories = makeCategoryRepository(db);
  const inventory = makeInventoryRepository(db);

  return {
    /**
     * @param {Record<string, unknown>} query
     */
    listProducts(query) {
      const pagination = parsePagination(query);

      /** @type {boolean|undefined} */
      let isActive;
      if (query.is_active !== undefined) {
        isActive = query.is_active === 'true' || query.is_active === '1';
      }

      const { rows, total } = products.findAll({
        ...pagination,
        search:      typeof query.search === 'string' ? query.search : undefined,
        category_id: query.category_id ? Number(query.category_id) : undefined,
        is_active:   isActive,
        sort_by:     typeof query.sort_by === 'string' ? query.sort_by : 'created_at',
        sort_dir:    query.sort_dir === 'asc' ? 'asc' : 'desc',
      });

      return {
        data: rows,
        pagination: buildPaginationMeta({ ...pagination, total }),
      };
    },

    /**
     * @param {number} id
     */
    getProduct(id) {
      const product = products.findById(id);
      if (!product) throw new NotFoundError(`Product with id ${id} not found`);
      return product;
    },

    /**
     * @param {any} data
     */
    createProduct(data) {
      // Validate category exists
      const cat = categories.findById(data.category_id);
      if (!cat) throw new NotFoundError(`Category with id ${data.category_id} not found`);

      // SKU uniqueness check — catch at service level for a clear error message
      const existing = products.findBySku(data.sku);
      if (existing) throw new ConflictError(`SKU '${data.sku}' is already in use`);

      // All writes happen in one transaction
      const createTx = db.transaction(() => {
        const id = products.create({
          name:                data.name,
          sku:                 data.sku,
          category_id:         data.category_id,
          description:         data.description ?? null,
          price_paise:         data.price_paise,
          stock_quantity:      data.stock_quantity,
          low_stock_threshold: data.low_stock_threshold,
        });

        // Initial stock movement
        inventory.createMovement({
          product_id:      id,
          movement_type:   'initial',
          quantity_delta:  data.stock_quantity,
          previous_stock:  0,
          resulting_stock: data.stock_quantity,
          order_id:        null,
          reason:          'Initial stock on product creation',
        });

        return id;
      });

      const newId = /** @type {number} */ (createTx());
      return products.findById(newId);
    },

    /**
     * @param {number} id
     * @param {Record<string, unknown>} data
     */
    updateProduct(id, data) {
      const product = products.findById(id);
      if (!product) throw new NotFoundError(`Product with id ${id} not found`);

      // Validate category if being changed
      if (data.category_id !== undefined) {
        const cat = categories.findById(Number(data.category_id));
        if (!cat) throw new NotFoundError(`Category with id ${data.category_id} not found`);
      }

      // Guard: stock_quantity must not be set via product update
      if ('stock_quantity' in data) {
        throw new ValidationError('Stock quantity cannot be modified directly. Use inventory adjustments.');
      }

      products.update(id, /** @type {any} */ (data));
      return products.findById(id);
    },

    /**
     * Soft-archive a product. Never permanently deletes.
     * @param {number} id
     */
    archiveProduct(id) {
      const product = products.findById(id);
      if (!product) throw new NotFoundError(`Product with id ${id} not found`);
      if (!product.is_active) return product; // Already archived — no-op
      products.archive(id);
      return products.findById(id);
    },
  };
}
