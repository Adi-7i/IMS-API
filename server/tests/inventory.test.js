// @ts-check
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import { createTestDb, createTestApp } from './setup.js';

describe('Inventory API', () => {
  /** @type {import('better-sqlite3').Database} */
  let db;
  /** @type {import('supertest').Agent} */
  let request;
  /** @type {number} */
  let catId;

  before(async () => {
    db = createTestDb(true);
    const app = await createTestApp(db);
    request = supertest(app);

    /** @type {any} */
    const cat = db.prepare('SELECT id FROM categories LIMIT 1').get();
    catId = cat.id;
  });

  after(() => { db.close(); });

  const createProduct = async (/** @type {any} */ overrides = {}) => {
    const res = await request.post('/api/products').send({
      name: `Inv Test ${Date.now()}`,
      sku: `INV-${Date.now()}-${Math.random().toString(36).slice(2,5)}`,
      category_id: catId,
      price_paise: 50000,
      stock_quantity: 20,
      low_stock_threshold: 5,
      ...overrides,
    });
    return res.body.data;
  };

  const adjust = (/** @type {any} */ body, /** @type {string} */ key = `adj-${Date.now()}-${Math.random()}`) =>
    request
      .post('/api/inventory/adjustments')
      .set('Idempotency-Key', key)
      .send(body);

  // ── Manual Stock Adjustments ───────────────────────────────────────────
  it('POST /api/inventory/adjustments — adds stock (+)', async () => {
    const p = await createProduct({ stock_quantity: 10 });
    const res = await adjust({ product_id: p.id, delta: 5, reason: 'New stock received' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.delta, 5);
    assert.equal(res.body.data.previous_stock, 10);
    assert.equal(res.body.data.resulting_stock, 15);
  });

  it('POST /api/inventory/adjustments — removes stock (-)', async () => {
    const p = await createProduct({ stock_quantity: 10 });
    const res = await adjust({ product_id: p.id, delta: -3, reason: 'Damaged goods' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.resulting_stock, 7);
  });

  it('POST /api/inventory/adjustments — records stock_movement', async () => {
    const p = await createProduct({ stock_quantity: 10 });
    const res = await adjust({ product_id: p.id, delta: 8, reason: 'Test movement' });

    const movId = res.body.data.movement_id;
    /** @type {any} */
    const mov = db.prepare('SELECT * FROM stock_movements WHERE id = ?').get(movId);

    assert.ok(mov);
    assert.equal(mov.product_id, p.id);
    assert.equal(mov.movement_type, 'adjustment');
    assert.equal(mov.quantity_delta, 8);
    assert.equal(mov.previous_stock, 10);
    assert.equal(mov.resulting_stock, 18);
    assert.equal(mov.reason, 'Test movement');
    assert.equal(mov.order_id, null);
  });

  it('POST /api/inventory/adjustments — rejects negative resulting stock', async () => {
    const p = await createProduct({ stock_quantity: 5 });
    const res = await adjust({ product_id: p.id, delta: -10, reason: 'Bad adjustment' });

    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'NEGATIVE_STOCK');
  });

  it('POST /api/inventory/adjustments — rejects zero delta', async () => {
    const p = await createProduct();
    const res = await adjust({ product_id: p.id, delta: 0, reason: 'Zero delta' });
    assert.equal(res.status, 400);
  });

  it('POST /api/inventory/adjustments — rejects unknown product', async () => {
    const res = await adjust({ product_id: 999999, delta: 5, reason: 'Unknown' });
    assert.equal(res.status, 404);
  });

  it('POST /api/inventory/adjustments — rejects archived product', async () => {
    const p = await createProduct({ stock_quantity: 10 });
    await request.delete(`/api/products/${p.id}`);

    const res = await adjust({ product_id: p.id, delta: 5, reason: 'Archived' });
    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'PRODUCT_ARCHIVED');
  });

  it('POST /api/inventory/adjustments — requires Idempotency-Key', async () => {
    const p = await createProduct();
    const res = await request.post('/api/inventory/adjustments').send({
      product_id: p.id, delta: 1, reason: 'No key',
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'MISSING_IDEMPOTENCY_KEY');
  });

  it('POST /api/inventory/adjustments — idempotency replay works', async () => {
    const p = await createProduct({ stock_quantity: 10 });
    const key  = `adj-idem-${Date.now()}`;
    const body = { product_id: p.id, delta: 5, reason: 'Idempotency Test' };

    const r1 = await adjust(body, key);
    const r2 = await adjust(body, key);

    assert.equal(r1.status, 200);
    assert.equal(r2.status, 200);
    assert.equal(r1.body.data.movement_id, r2.body.data.movement_id);

    // Stock adjusted only once
    /** @type {any} */
    const stock = db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(p.id);
    assert.equal(stock.stock_quantity, 15); // 10 + 5, not 20
  });

  it('POST /api/inventory/adjustments — idempotency conflict returns 409', async () => {
    const p1 = await createProduct();
    const p2 = await createProduct();
    const key = `adj-conflict-${Date.now()}`;

    await adjust({ product_id: p1.id, delta: 1, reason: 'First' }, key);
    const r2 = await adjust({ product_id: p2.id, delta: 2, reason: 'Different' }, key);
    assert.equal(r2.status, 409);
  });

  // ── Low Stock ──────────────────────────────────────────────────────────
  it('GET /api/inventory/low-stock — returns products at or below threshold', async () => {
    // CAM-701 in seed has stock=0 (out of stock), ETH-1401 stock=2, threshold=5
    const res = await request.get('/api/inventory/low-stock');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));

    // All returned products must satisfy stock <= threshold
    for (const p of res.body.data) {
      assert.ok(p.stock_quantity <= p.low_stock_threshold, `Product ${p.sku} should be low stock`);
    }
  });

  it('GET /api/inventory/low-stock — includes out-of-stock products', async () => {
    const res = await request.get('/api/inventory/low-stock');
    assert.equal(res.status, 200);
    // CAM-701 should be in list (stock=0)
    const hasOutOfStock = res.body.data.some((/** @type {any} */ p) => p.stock_quantity === 0);
    assert.ok(hasOutOfStock);
  });

  // ── Stock Movements ────────────────────────────────────────────────────
  it('GET /api/inventory/movements — returns paginated movements', async () => {
    const res = await request.get('/api/inventory/movements');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.pagination.total >= 15); // seed created initial movements
  });

  it('GET /api/inventory/movements — filter by product_id', async () => {
    const p = await createProduct({ stock_quantity: 5 });
    await adjust({ product_id: p.id, delta: 3, reason: 'Filtered movement test' });

    const res = await request.get(`/api/inventory/movements?product_id=${p.id}`);
    assert.equal(res.status, 200);
    assert.ok(res.body.data.length >= 2); // initial + adjustment
    assert.ok(res.body.data.every((/** @type {any} */ m) => m.product_id === p.id));
  });

  it('GET /api/inventory/movements — filter by type=adjustment', async () => {
    const res = await request.get('/api/inventory/movements?type=adjustment');
    assert.equal(res.status, 200);
    assert.ok(res.body.data.every((/** @type {any} */ m) => m.movement_type === 'adjustment'));
  });

  it('GET /api/inventory/movements — movement includes product_name and product_sku', async () => {
    const res = await request.get('/api/inventory/movements?limit=1');
    assert.equal(res.status, 200);
    assert.ok(res.body.data.length === 1);
    assert.ok(res.body.data[0].product_name);
    assert.ok(res.body.data[0].product_sku);
  });

  // ── Stock Movement Integrity ───────────────────────────────────────────
  it('Inventory movements have correct previous and resulting stock', async () => {
    const p = await createProduct({ stock_quantity: 20 });

    await adjust({ product_id: p.id, delta: 10, reason: 'Add 10' });
    await adjust({ product_id: p.id, delta: -5, reason: 'Remove 5' });

    const res = await request.get(`/api/inventory/movements?product_id=${p.id}&sort_dir=asc`);
    const movs = res.body.data;

    // initial: 0→20
    assert.equal(movs[0].movement_type, 'initial');
    assert.equal(movs[0].previous_stock, 0);
    assert.equal(movs[0].resulting_stock, 20);

    // +10: 20→30
    assert.equal(movs[1].movement_type, 'adjustment');
    assert.equal(movs[1].previous_stock, 20);
    assert.equal(movs[1].resulting_stock, 30);

    // -5: 30→25
    assert.equal(movs[2].movement_type, 'adjustment');
    assert.equal(movs[2].previous_stock, 30);
    assert.equal(movs[2].resulting_stock, 25);
  });
});
