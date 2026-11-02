// @ts-check
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import { createTestDb, createTestApp } from './setup.js';

describe('Orders API', () => {
  /** @type {import('better-sqlite3').Database} */
  let db;
  /** @type {import('supertest').Agent} */
  let request;
  /** @type {number} */
  let catId;

  before(async () => {
    db = createTestDb(true); // with seed
    const app = await createTestApp(db);
    request = supertest(app);

    /** @type {any} */
    const cat = db.prepare("SELECT id FROM categories WHERE name = 'Accessories'").get();
    catId = cat.id;
  });

  after(() => { db.close(); });

  /** Helpers to create products with known price & stock for order tests */
  const createProduct = async (/** @type {Partial<any>} */ overrides = {}) => {
    const res = await request.post('/api/products').send({
      name: 'Order Test Product',
      sku: `OTP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      category_id: catId,
      price_paise: 100000, // ₹1000.00
      stock_quantity: 20,
      low_stock_threshold: 3,
      ...overrides,
    });
    return res.body.data;
  };

  const createOrder = async (/** @type {any} */ payload, /** @type {string} */ key = `key-${Date.now()}-${Math.random()}`) =>
    request
      .post('/api/orders')
      .set('Idempotency-Key', key)
      .send(payload);

  // ── List Orders ────────────────────────────────────────────────────────
  it('GET /api/orders — returns paginated list', async () => {
    const res = await request.get('/api/orders');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.pagination.total >= 5); // seed data
  });

  it('GET /api/orders — filter by status=Pending', async () => {
    const res = await request.get('/api/orders?status=Pending');
    assert.equal(res.status, 200);
    assert.ok(res.body.data.every((/** @type {any} */ o) => o.status === 'Pending'));
  });

  // ── Create Order ───────────────────────────────────────────────────────
  it('POST /api/orders — creates multi-item order', async () => {
    const p1 = await createProduct({ price_paise: 50000, stock_quantity: 10 });
    const p2 = await createProduct({ price_paise: 30000, stock_quantity: 5  });

    const res = await createOrder({
      customer_name: 'Integration Test Customer',
      items: [
        { product_id: p1.id, quantity: 2 },
        { product_id: p2.id, quantity: 3 },
      ],
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);

    const order = res.body.data;
    assert.ok(order.id);
    assert.ok(order.order_number.startsWith('ORD-'));
    assert.equal(order.status, 'Pending');
    assert.equal(order.items.length, 2);

    // Server-side total: 2×50000 + 3×30000 = 190000
    assert.equal(order.total_paise, 190000);
  });

  it('POST /api/orders — uses server-side price (not client price)', async () => {
    const p = await createProduct({ price_paise: 75000, stock_quantity: 10 });

    // Items have no price field — price must come from DB
    const res = await createOrder({
      customer_name: 'Price Test',
      items: [{ product_id: p.id, quantity: 1 }],
    });
    assert.equal(res.status, 201);
    const item = res.body.data.items[0];
    assert.equal(item.unit_price_paise, 75000); // from DB
  });

  it('POST /api/orders — price snapshot persists when product price changes', async () => {
    const p = await createProduct({ price_paise: 60000, stock_quantity: 10 });

    const orderRes = await createOrder({
      customer_name: 'Snapshot Test',
      items: [{ product_id: p.id, quantity: 1 }],
    });
    const orderId = orderRes.body.data.id;

    // Change product price
    await request.patch(`/api/products/${p.id}`).send({ price_paise: 999999 });

    // Order item should still have the original price
    const orderRes2 = await request.get(`/api/orders/${orderId}`);
    assert.equal(orderRes2.body.data.items[0].unit_price_paise, 60000);
    assert.equal(orderRes2.body.data.total_paise, 60000);
  });

  it('POST /api/orders — stock is deducted immediately', async () => {
    const p = await createProduct({ stock_quantity: 10 });

    await createOrder({
      customer_name: 'Stock Deduct Test',
      items: [{ product_id: p.id, quantity: 4 }],
    });

    /** @type {any} */
    const updated = db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(p.id);
    assert.equal(updated.stock_quantity, 6);
  });

  it('POST /api/orders — rejects when stock is insufficient', async () => {
    const p = await createProduct({ stock_quantity: 3 });

    const res = await createOrder({
      customer_name: 'Low Stock Test',
      items: [{ product_id: p.id, quantity: 10 }],
    });
    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'INSUFFICIENT_STOCK');
  });

  it('POST /api/orders — rejects archived products', async () => {
    const p = await createProduct({ stock_quantity: 5 });
    await request.delete(`/api/products/${p.id}`);

    const res = await createOrder({
      customer_name: 'Archived Product Test',
      items: [{ product_id: p.id, quantity: 1 }],
    });
    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'PRODUCT_ARCHIVED');
  });

  it('POST /api/orders — rejects duplicate product_ids in one order', async () => {
    const p = await createProduct({ stock_quantity: 10 });

    const res = await createOrder({
      customer_name: 'Duplicate Product Test',
      items: [
        { product_id: p.id, quantity: 1 },
        { product_id: p.id, quantity: 2 },
      ],
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('POST /api/orders — requires Idempotency-Key header', async () => {
    const p = await createProduct();
    const res = await request.post('/api/orders').send({
      customer_name: 'No Key',
      items: [{ product_id: p.id, quantity: 1 }],
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'MISSING_IDEMPOTENCY_KEY');
  });

  // ── Idempotency ────────────────────────────────────────────────────────
  it('POST /api/orders — same key returns same response without mutation', async () => {
    const p = await createProduct({ stock_quantity: 10 });
    const key  = `idem-order-${Date.now()}`;
    const body = { customer_name: 'Idempotency Test', items: [{ product_id: p.id, quantity: 2 }] };

    const r1 = await createOrder(body, key);
    const r2 = await createOrder(body, key);

    assert.equal(r1.status, 201);
    assert.equal(r2.status, 201);
    assert.equal(r1.body.data.id, r2.body.data.id);

    // Stock should be deducted only once
    /** @type {any} */
    const updated = db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(p.id);
    assert.equal(updated.stock_quantity, 8); // 10 - 2 = 8, not 6
  });

  it('POST /api/orders — same key with different payload returns 409', async () => {
    const p1 = await createProduct({ stock_quantity: 5 });
    const p2 = await createProduct({ stock_quantity: 5 });
    const key = `conflict-key-${Date.now()}`;

    await createOrder({ customer_name: 'First', items: [{ product_id: p1.id, quantity: 1 }] }, key);
    const r2 = await createOrder({ customer_name: 'Different', items: [{ product_id: p2.id, quantity: 1 }] }, key);
    assert.equal(r2.status, 409);
  });

  // ── Status Transitions ─────────────────────────────────────────────────
  it('PATCH /api/orders/:id/status — Pending → Confirmed', async () => {
    const p = await createProduct({ stock_quantity: 5 });
    const orderRes = await createOrder({ customer_name: 'Trans Test', items: [{ product_id: p.id, quantity: 1 }] });
    const orderId  = orderRes.body.data.id;

    const res = await request.patch(`/api/orders/${orderId}/status`).send({ status: 'Confirmed' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'Confirmed');
    assert.ok(res.body.data.status_history.length >= 2);
  });

  it('PATCH /api/orders/:id/status — Confirmed → Completed', async () => {
    const p = await createProduct({ stock_quantity: 5 });
    const orderRes = await createOrder({ customer_name: 'Complete Test', items: [{ product_id: p.id, quantity: 1 }] });
    const orderId  = orderRes.body.data.id;

    await request.patch(`/api/orders/${orderId}/status`).send({ status: 'Confirmed' });
    const res = await request.patch(`/api/orders/${orderId}/status`).send({ status: 'Completed' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'Completed');
  });

  it('PATCH /api/orders/:id/status — Pending → Cancelled restores stock', async () => {
    const p = await createProduct({ stock_quantity: 10 });
    const orderRes = await createOrder({
      customer_name: 'Cancel Test',
      items: [{ product_id: p.id, quantity: 4 }],
    });
    const orderId = orderRes.body.data.id;

    // Stock is 6 after order creation
    /** @type {any} */
    let stock = db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(p.id);
    assert.equal(stock.stock_quantity, 6);

    const cancelRes = await request.patch(`/api/orders/${orderId}/status`).send({ status: 'Cancelled' });
    assert.equal(cancelRes.status, 200);
    assert.equal(cancelRes.body.data.status, 'Cancelled');

    // Stock restored to 10
    stock = db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(p.id);
    assert.equal(stock.stock_quantity, 10);

    // cancellation_reversal movement recorded
    /** @type {any} */
    const movement = db.prepare(
      `SELECT * FROM stock_movements WHERE product_id = ? AND movement_type = 'cancellation_reversal'`
    ).get(p.id);
    assert.ok(movement);
    assert.equal(movement.quantity_delta, 4);
  });

  it('PATCH /api/orders/:id/status — Completed → Cancelled is rejected', async () => {
    const p = await createProduct({ stock_quantity: 5 });
    const orderRes = await createOrder({ customer_name: 'Terminal Test', items: [{ product_id: p.id, quantity: 1 }] });
    const orderId  = orderRes.body.data.id;

    await request.patch(`/api/orders/${orderId}/status`).send({ status: 'Confirmed' });
    await request.patch(`/api/orders/${orderId}/status`).send({ status: 'Completed' });

    const res = await request.patch(`/api/orders/${orderId}/status`).send({ status: 'Cancelled' });
    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'INVALID_STATUS_TRANSITION');
  });

  it('PATCH /api/orders/:id/status — same status is a safe no-op', async () => {
    const p = await createProduct({ stock_quantity: 5 });
    const orderRes = await createOrder({ customer_name: 'No-op Test', items: [{ product_id: p.id, quantity: 1 }] });
    const orderId  = orderRes.body.data.id;

    // Repeated PATCH to same status should succeed without error
    const r1 = await request.patch(`/api/orders/${orderId}/status`).send({ status: 'Pending' });
    assert.equal(r1.status, 200);
    assert.equal(r1.body.data.status, 'Pending');
  });

  it('PATCH /api/orders/:id/status — cancellation is idempotent (stock not restored twice)', async () => {
    const p = await createProduct({ stock_quantity: 10 });
    const orderRes = await createOrder({
      customer_name: 'Double Cancel Test',
      items: [{ product_id: p.id, quantity: 3 }],
    });
    const orderId = orderRes.body.data.id;

    await request.patch(`/api/orders/${orderId}/status`).send({ status: 'Cancelled' });

    /** @type {any} */
    const stockAfterFirst = db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(p.id);
    assert.equal(stockAfterFirst.stock_quantity, 10);

    // Try cancelling again — should be a no-op (already Cancelled)
    const r2 = await request.patch(`/api/orders/${orderId}/status`).send({ status: 'Cancelled' });
    assert.equal(r2.status, 200);

    /** @type {any} */
    const stockAfterSecond = db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(p.id);
    assert.equal(stockAfterSecond.stock_quantity, 10); // unchanged
  });

  // ── Invalid Transitions ────────────────────────────────────────────────
  it('PATCH /api/orders/:id/status — Pending → Completed is invalid', async () => {
    const p = await createProduct({ stock_quantity: 5 });
    const orderRes = await createOrder({ customer_name: 'Bad Trans', items: [{ product_id: p.id, quantity: 1 }] });
    const orderId  = orderRes.body.data.id;

    const res = await request.patch(`/api/orders/${orderId}/status`).send({ status: 'Completed' });
    assert.equal(res.status, 422);
  });

  // ── DB Constraints ─────────────────────────────────────────────────────
  it('Order creation rolls back atomically on insufficient stock mid-order', async () => {
    const pOk   = await createProduct({ stock_quantity: 5 });
    const pFail = await createProduct({ stock_quantity: 1 });

    const res = await createOrder({
      customer_name: 'Rollback Test',
      items: [
        { product_id: pOk.id,   quantity: 2 },
        { product_id: pFail.id, quantity: 5 },  // will fail
      ],
    });
    assert.equal(res.status, 422);

    // pOk stock must be unchanged (rollback worked)
    /** @type {any} */
    const stockOk = db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(pOk.id);
    assert.equal(stockOk.stock_quantity, 5);
  });
});
