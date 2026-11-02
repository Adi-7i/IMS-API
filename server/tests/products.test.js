// @ts-check
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import { createTestDb, createTestApp } from './setup.js';

describe('Products API', () => {
  /** @type {import('better-sqlite3').Database} */
  let db;
  /** @type {import('supertest').Agent} */
  let request;

  /** @type {number} */
  let categoryId;

  before(async () => {
    db = createTestDb(true); // with seed
    const app = await createTestApp(db);
    request = supertest(app);

    // Get a valid category ID from seed data
    /** @type {any} */
    const cat = db.prepare('SELECT id FROM categories LIMIT 1').get();
    categoryId = cat.id;
  });

  after(() => { db.close(); });

  // ── List Products ──────────────────────────────────────────────────────
  it('GET /api/products — returns paginated list', async () => {
    const res = await request.get('/api/products');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.pagination);
    assert.ok(res.body.pagination.total >= 15); // seed has 15 products
  });

  it('GET /api/products — pagination works', async () => {
    const res = await request.get('/api/products?page=1&limit=5');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 5);
    assert.equal(res.body.pagination.limit, 5);
    assert.equal(res.body.pagination.page, 1);
  });

  it('GET /api/products — filter by category_id', async () => {
    const res = await request.get(`/api/products?category_id=${categoryId}`);
    assert.equal(res.status, 200);
    assert.ok(res.body.data.every((/** @type {any} */ p) => p.category_id === categoryId));
  });

  it('GET /api/products — search by name', async () => {
    const res = await request.get('/api/products?search=Mouse');
    assert.equal(res.status, 200);
    assert.ok(res.body.data.length >= 1);
    assert.ok(res.body.data.some((/** @type {any} */ p) => p.name.toLowerCase().includes('mouse')));
  });

  it('GET /api/products — search by SKU', async () => {
    const res = await request.get('/api/products?search=MOU-101');
    assert.equal(res.status, 200);
    assert.ok(res.body.data.length >= 1);
  });

  it('GET /api/products — filter by is_active=true only returns active', async () => {
    const res = await request.get('/api/products?is_active=true');
    assert.equal(res.status, 200);
    assert.ok(res.body.data.every((/** @type {any} */ p) => p.is_active === 1));
  });

  it('GET /api/products — sorting by price_paise asc works', async () => {
    const res = await request.get('/api/products?sort_by=price_paise&sort_dir=asc&limit=100');
    assert.equal(res.status, 200);
    const prices = res.body.data.map((/** @type {any} */ p) => p.price_paise);
    for (let i = 1; i < prices.length; i++) {
      assert.ok(prices[i] >= prices[i - 1], 'prices should be non-decreasing');
    }
  });

  // ── Create Product ─────────────────────────────────────────────────────
  it('POST /api/products — creates product and returns it', async () => {
    const payload = {
      name: 'Test Product',
      sku: 'TEST-PROD-001',
      category_id: categoryId,
      description: 'A test product',
      price_paise: 99900,
      stock_quantity: 10,
      low_stock_threshold: 3,
    };
    const res = await request.post('/api/products').send(payload);
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.sku, 'TEST-PROD-001');
    assert.equal(res.body.data.price_paise, 99900);
    assert.equal(res.body.data.stock_quantity, 10);
    assert.equal(res.body.data.is_active, 1);
  });

  it('POST /api/products — initial stock movement is recorded', async () => {
    const payload = {
      name: 'Movement Test Product',
      sku: 'MVT-TEST-001',
      category_id: categoryId,
      price_paise: 19900,
      stock_quantity: 25,
      low_stock_threshold: 5,
    };
    const createRes = await request.post('/api/products').send(payload);
    assert.equal(createRes.status, 201);
    const productId = createRes.body.data.id;

    /** @type {any} */
    const movement = db.prepare(
      `SELECT * FROM stock_movements WHERE product_id = ? AND movement_type = 'initial'`
    ).get(productId);
    assert.ok(movement, 'initial stock movement should exist');
    assert.equal(movement.quantity_delta, 25);
    assert.equal(movement.previous_stock, 0);
    assert.equal(movement.resulting_stock, 25);
  });

  it('POST /api/products — rejects duplicate SKU', async () => {
    const payload = {
      name: 'Duplicate SKU Product',
      sku: 'MOU-101', // already in seed
      category_id: categoryId,
      price_paise: 9999,
      stock_quantity: 1,
      low_stock_threshold: 0,
    };
    const res = await request.post('/api/products').send(payload);
    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'CONFLICT');
  });

  it('POST /api/products — rejects non-existent category_id', async () => {
    const payload = {
      name: 'Bad Category Product',
      sku: 'BAD-CAT-001',
      category_id: 99999,
      price_paise: 9999,
      stock_quantity: 1,
      low_stock_threshold: 0,
    };
    const res = await request.post('/api/products').send(payload);
    assert.equal(res.status, 404);
  });

  it('POST /api/products — validation rejects missing required fields', async () => {
    const res = await request.post('/api/products').send({ name: 'Incomplete' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('POST /api/products — validation rejects negative price', async () => {
    const res = await request.post('/api/products').send({
      name: 'Negative Price',
      sku: 'NEG-PRC-001',
      category_id: categoryId,
      price_paise: -100,
      stock_quantity: 5,
    });
    assert.equal(res.status, 400);
  });

  // ── Get Single Product ─────────────────────────────────────────────────
  it('GET /api/products/:id — returns product', async () => {
    /** @type {any} */
    const prod = db.prepare('SELECT id FROM products LIMIT 1').get();
    const res = await request.get(`/api/products/${prod.id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, prod.id);
    assert.ok(res.body.data.category_name);
  });

  it('GET /api/products/:id — returns 404 for unknown ID', async () => {
    const res = await request.get('/api/products/999999');
    assert.equal(res.status, 404);
  });

  it('GET /api/products/:id — returns 400 for invalid ID', async () => {
    const res = await request.get('/api/products/abc');
    assert.equal(res.status, 400);
  });

  // ── Update Product ─────────────────────────────────────────────────────
  it('PATCH /api/products/:id — updates name and price', async () => {
    /** @type {any} */
    const prod = db.prepare('SELECT id FROM products WHERE is_active = 1 LIMIT 1').get();
    const res = await request.patch(`/api/products/${prod.id}`).send({
      name: 'Updated Name',
      price_paise: 149900,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.name, 'Updated Name');
    assert.equal(res.body.data.price_paise, 149900);
  });

  it('PATCH /api/products/:id — rejects stock_quantity modification', async () => {
    /** @type {any} */
    const prod = db.prepare('SELECT id FROM products WHERE is_active = 1 LIMIT 1').get();
    const res = await request.patch(`/api/products/${prod.id}`).send({ stock_quantity: 999 });
    assert.equal(res.status, 400);
  });

  it('PATCH /api/products/:id — returns 404 for unknown product', async () => {
    const res = await request.patch('/api/products/999999').send({ name: 'Ghost' });
    assert.equal(res.status, 404);
  });

  // ── Archive Product ────────────────────────────────────────────────────
  it('DELETE /api/products/:id — soft archives product', async () => {
    // Create fresh product to archive
    const createRes = await request.post('/api/products').send({
      name: 'To Be Archived',
      sku: 'ARCH-TEST-001',
      category_id: categoryId,
      price_paise: 4900,
      stock_quantity: 5,
      low_stock_threshold: 2,
    });
    const productId = createRes.body.data.id;

    const archiveRes = await request.delete(`/api/products/${productId}`);
    assert.equal(archiveRes.status, 200);
    assert.equal(archiveRes.body.data.is_active, 0);

    // Product is still retrievable
    const getRes = await request.get(`/api/products/${productId}`);
    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.data.is_active, 0);
  });

  it('DELETE /api/products/:id — is idempotent (double archive is safe)', async () => {
    const createRes = await request.post('/api/products').send({
      name: 'Double Archive Test',
      sku: 'DARCH-001',
      category_id: categoryId,
      price_paise: 4900,
      stock_quantity: 5,
    });
    const productId = createRes.body.data.id;

    await request.delete(`/api/products/${productId}`);
    const secondRes = await request.delete(`/api/products/${productId}`);
    assert.equal(secondRes.status, 200);
    assert.equal(secondRes.body.data.is_active, 0);
  });
});
