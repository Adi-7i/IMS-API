// @ts-check
/**
 * Shared test utilities — creates an isolated in-memory SQLite DB
 * and a fully wired Express app for each test suite.
 */
import Database from 'better-sqlite3';
import { runMigrations } from '../src/db/migrate.js';
import { runSeed }       from '../src/db/seed.js';

/**
 * Creates a fresh in-memory database with migrations applied.
 * @param {boolean} [withSeed]
 * @returns {import('better-sqlite3').Database}
 */
export function createTestDb(withSeed = false) {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  if (withSeed) runSeed(db);
  return db;
}

/**
 * Creates a test Express app wired to a given in-memory database.
 * Imports app.js but replaces the DB singleton before routing.
 *
 * @param {import('better-sqlite3').Database} db
 */
export async function createTestApp(db) {
  // Dynamically import so we can inject the test DB
  const { default: express } = await import('express');
  const { requestId }    = await import('../src/middleware/requestId.js');
  const { requestLogger }= await import('../src/middleware/requestLogger.js');
  const { errorHandler } = await import('../src/middleware/errorHandler.js');

  // Route factories — pass db explicitly
  const { makeProductService }   = await import('../src/services/product.service.js');
  const { makeOrderService }     = await import('../src/services/order.service.js');
  const { makeInventoryService } = await import('../src/services/inventory.service.js');
  const { makeDashboardService } = await import('../src/services/dashboard.service.js');
  const { makeCategoryService }  = await import('../src/services/category.service.js');

  const { validate }       = await import('../src/middleware/validate.js');
  const { successResponse, paginatedResponse } = await import('../src/utils/response.js');
  const { idempotency: idempMiddleware } = await import('../src/middleware/idempotency.js');

  // Schemas
  const ps  = await import('../src/schemas/product.schema.js');
  const os  = await import('../src/schemas/order.schema.js');
  const ins = await import('../src/schemas/inventory.schema.js');

  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use(requestId);

  // Silence request logs in tests
  // app.use(requestLogger); // omit for clean test output

  // ── Inject test DB via factory pattern ──────────────────────────────────
  const { setDb } = await import('../src/db/connection.js');
  setDb(db);

  // ── Routes ─────────────────────────────────────────────────────────────
  // Health
  app.get('/api/health', (req, res) => res.json({ success: true, data: { status: 'ok' } }));

  // Categories
  app.get('/api/categories', (req, res, next) => {
    try {
      const svc = makeCategoryService(db);
      res.json(successResponse(svc.listCategories()));
    } catch (e) { next(e); }
  });

  // Products
  app.get('/api/products', validate({ query: ps.productQuerySchema }), (req, res, next) => {
    try {
      const svc = makeProductService(db);
      const { data, pagination } = svc.listProducts(/** @type {any} */ (req.query));
      res.json(paginatedResponse(data, pagination));
    } catch (e) { next(e); }
  });
  app.get('/api/products/:id', validate({ params: ps.productIdParamSchema }), (req, res, next) => {
    try {
      const svc = makeProductService(db);
      res.json(successResponse(svc.getProduct(Number(req.params.id))));
    } catch (e) { next(e); }
  });
  app.post('/api/products', validate({ body: ps.createProductSchema }), (req, res, next) => {
    try {
      const svc = makeProductService(db);
      res.status(201).json(successResponse(svc.createProduct(req.body)));
    } catch (e) { next(e); }
  });
  app.patch('/api/products/:id', validate({ params: ps.productIdParamSchema, body: ps.updateProductSchema }), (req, res, next) => {
    try {
      const svc = makeProductService(db);
      res.json(successResponse(svc.updateProduct(Number(req.params.id), req.body)));
    } catch (e) { next(e); }
  });
  app.delete('/api/products/:id', validate({ params: ps.productIdParamSchema }), (req, res, next) => {
    try {
      const svc = makeProductService(db);
      res.json(successResponse(svc.archiveProduct(Number(req.params.id))));
    } catch (e) { next(e); }
  });

  // Custom idempotency middleware bound to test DB
  /** @type {import('express').RequestHandler} */
  const idem = async (req, res, next) => {
    const key = req.headers['idempotency-key'];
    if (!key || typeof key !== 'string' || key.trim() === '') {
      const { BadRequestError } = await import('../src/utils/errors.js');
      return next(new BadRequestError('Idempotency-Key header is required.', 'MISSING_IDEMPOTENCY_KEY'));
    }
    const { hashBody } = await import('../src/utils/hash.js');
    const hash = hashBody(req.body);
    res.locals.idempotencyKey  = key.trim();
    res.locals.idempotencyHash = hash;

    /** @type {any} */
    const record = db
      .prepare('SELECT request_hash, response_status, response_body FROM idempotency_records WHERE idempotency_key = ?')
      .get(key.trim());

    if (record) {
      if (record.request_hash !== hash) {
        const { ConflictError } = await import('../src/utils/errors.js');
        return next(new ConflictError('Idempotency-Key reused with a different request payload.'));
      }
      return res.status(record.response_status).json(JSON.parse(record.response_body));
    }
    next();
  };

  // Orders
  app.get('/api/orders', validate({ query: os.orderQuerySchema }), (req, res, next) => {
    try {
      const svc = makeOrderService(db);
      const { data, pagination } = svc.listOrders(/** @type {any} */ (req.query));
      res.json(paginatedResponse(data, pagination));
    } catch (e) { next(e); }
  });
  app.get('/api/orders/:id', validate({ params: os.orderIdParamSchema }), (req, res, next) => {
    try {
      const svc = makeOrderService(db);
      res.json(successResponse(svc.getOrder(Number(req.params.id))));
    } catch (e) { next(e); }
  });
  app.post('/api/orders', validate({ body: os.createOrderSchema }), idem, (req, res, next) => {
    try {
      const svc = makeOrderService(db);
      const data = svc.createOrder(req.body, {
        idempotencyKey:  res.locals.idempotencyKey,
        idempotencyHash: res.locals.idempotencyHash,
        requestPath:     req.path,
      });
      res.status(201).json(successResponse(data, 'Order created successfully'));
    } catch (e) { next(e); }
  });
  app.patch('/api/orders/:id/status', validate({ params: os.orderIdParamSchema, body: os.updateOrderStatusSchema }), (req, res, next) => {
    try {
      const svc = makeOrderService(db);
      res.json(successResponse(svc.updateOrderStatus(Number(req.params.id), req.body.status)));
    } catch (e) { next(e); }
  });

  // Inventory
  app.get('/api/inventory/low-stock', validate({ query: ins.lowStockQuerySchema }), (req, res, next) => {
    try {
      const svc = makeInventoryService(db);
      const { data, pagination } = svc.getLowStock(/** @type {any} */ (req.query));
      res.json(paginatedResponse(data, pagination));
    } catch (e) { next(e); }
  });
  app.get('/api/inventory/movements', validate({ query: ins.movementsQuerySchema }), (req, res, next) => {
    try {
      const svc = makeInventoryService(db);
      const { data, pagination } = svc.getMovements(/** @type {any} */ (req.query));
      res.json(paginatedResponse(data, pagination));
    } catch (e) { next(e); }
  });
  app.post('/api/inventory/adjustments', validate({ body: ins.adjustmentSchema }), idem, (req, res, next) => {
    try {
      const svc = makeInventoryService(db);
      const data = svc.adjust(req.body, {
        idempotencyKey:  res.locals.idempotencyKey,
        idempotencyHash: res.locals.idempotencyHash,
        requestPath:     req.path,
      });
      res.json(successResponse(data, 'Stock adjusted successfully'));
    } catch (e) { next(e); }
  });

  // Dashboard
  app.get('/api/dashboard/summary', (req, res, next) => {
    try {
      const svc = makeDashboardService(db);
      const range = typeof req.query.range === 'string' ? req.query.range : '7d';
      res.json(successResponse(svc.getSummary({ range })));
    } catch (e) { next(e); }
  });

  app.use(errorHandler);

  return app;
}
