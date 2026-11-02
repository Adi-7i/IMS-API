// @ts-check
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import { createTestDb, createTestApp } from './setup.js';

describe('Dashboard API', () => {
  /** @type {import('better-sqlite3').Database} */
  let db;
  /** @type {import('supertest').Agent} */
  let request;

  before(async () => {
    db = createTestDb(true); // with seed (includes completed orders for revenue)
    const app = await createTestApp(db);
    request = supertest(app);
  });

  after(() => { db.close(); });

  it('GET /api/dashboard/summary — returns correct structure', async () => {
    const res = await request.get('/api/dashboard/summary');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const d = res.body.data;
    assert.ok(typeof d.products.total_active === 'number');
    assert.ok(typeof d.products.low_stock_count === 'number');
    assert.ok(typeof d.products.out_of_stock_count === 'number');
    assert.ok(typeof d.orders.total_orders === 'number');
    assert.ok(typeof d.orders.total_revenue_paise === 'number');
    assert.ok(Array.isArray(d.recent_orders));
    assert.ok(Array.isArray(d.daily_trend));
  });

  it('GET /api/dashboard/summary — total_active excludes archived products', async () => {
    /** @type {any} */
    const before = (await request.get('/api/dashboard/summary')).body.data.products.total_active;

    // Archive a product
    /** @type {any} */
    const prod = db.prepare('SELECT id FROM products WHERE is_active = 1 LIMIT 1').get();
    db.prepare('UPDATE products SET is_active = 0 WHERE id = ?').run(prod.id);

    /** @type {any} */
    const after = (await request.get('/api/dashboard/summary')).body.data.products.total_active;
    assert.equal(after, before - 1);

    // Restore
    db.prepare('UPDATE products SET is_active = 1 WHERE id = ?').run(prod.id);
  });

  it('GET /api/dashboard/summary — revenue includes ONLY completed orders', async () => {
    const res = await request.get('/api/dashboard/summary');
    const revenue = res.body.data.orders.total_revenue_paise;

    // Manually calculate expected revenue from completed orders only
    /** @type {any} */
    const expected = db.prepare(
      `SELECT COALESCE(SUM(total_paise), 0) AS total FROM orders WHERE status = 'Completed'`
    ).get().total;

    assert.equal(revenue, expected);
    assert.ok(revenue > 0, 'Seed data should have completed orders with revenue');
  });

  it('GET /api/dashboard/summary — low_stock_count is accurate', async () => {
    const res = await request.get('/api/dashboard/summary');
    const count = res.body.data.products.low_stock_count;

    // @ts-ignore
    const expected = db.prepare(
      `SELECT COUNT(*) as c FROM products WHERE is_active = 1 AND stock_quantity <= low_stock_threshold`
    ).get().c;

    assert.equal(count, expected);
  });

  it('GET /api/dashboard/summary — out_of_stock_count is accurate', async () => {
    const res = await request.get('/api/dashboard/summary');
    const count = res.body.data.products.out_of_stock_count;

    // @ts-ignore
    const expected = db.prepare(
      `SELECT COUNT(*) as c FROM products WHERE is_active = 1 AND stock_quantity = 0`
    ).get().c;

    assert.equal(count, expected);
  });

  it('GET /api/dashboard/summary — total_orders includes all statuses', async () => {
    const res = await request.get('/api/dashboard/summary');
    const total = res.body.data.orders.total_orders;

    // @ts-ignore
    const expected = db.prepare('SELECT COUNT(*) as c FROM orders').get().c;
    assert.equal(total, expected);
    assert.ok(total >= 5); // seed has 5 orders
  });

  it('GET /api/dashboard/summary — daily_trend has 7 entries for range=7d', async () => {
    const res = await request.get('/api/dashboard/summary?range=7d');
    assert.equal(res.body.data.daily_trend.length, 7);
    assert.equal(res.body.data.range_days, 7);
  });

  it('GET /api/dashboard/summary — daily_trend has 30 entries for range=30d', async () => {
    const res = await request.get('/api/dashboard/summary?range=30d');
    assert.equal(res.body.data.daily_trend.length, 30);
    assert.equal(res.body.data.range_days, 30);
  });

  it('GET /api/dashboard/summary — recent_orders returns at most 5 items', async () => {
    const res = await request.get('/api/dashboard/summary');
    assert.ok(res.body.data.recent_orders.length <= 5);
  });

  it('GET /api/dashboard/summary — recent_orders is ordered newest first', async () => {
    const res = await request.get('/api/dashboard/summary');
    const dates = res.body.data.recent_orders.map((/** @type {any} */ o) => o.created_at);
    for (let i = 1; i < dates.length; i++) {
      assert.ok(dates[i] <= dates[i - 1], 'Orders should be newest first');
    }
  });

  it('GET /api/dashboard/summary — defaults to 7d range', async () => {
    const res = await request.get('/api/dashboard/summary');
    assert.equal(res.body.data.range_days, 7);
  });
});
