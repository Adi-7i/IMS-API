// Real frontend services → native Fetch → production Express routes → isolated on-disk SQLite.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createRequire } from 'node:module'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { act, renderHook } from '@testing-library/react'
import { runMigrations } from '../../server/src/db/migrate.js'
import { setDb } from '../../server/src/db/connection.js'
const requireServer = createRequire(resolve(process.cwd(), '../server/package.json'))
const Database = requireServer('better-sqlite3')
let db, server, dir, productService, orderService, inventoryService, categoryService, dashboardService, useMutation
let category, first, second, completed, cancelled, beforeHash
const developmentDb = resolve(process.cwd(), '../server/data/retailops.db')
const hash = async () => {
  try { return createHash('sha256').update(await readFile(developmentDb)).digest('hex') }
  catch (error) { if (error.code === 'ENOENT') return null; throw error }
}
beforeAll(async () => {
  beforeHash = await hash()
  dir = await mkdtemp(join(tmpdir(), 'retailops-integration-'))
  db = new Database(join(dir, 'integration.sqlite'))
  db.pragma('foreign_keys = ON')
  runMigrations(db)
  setDb(db)
  const { default: app } = await import('../../server/src/app.js')
  server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)) })
  vi.stubEnv('VITE_API_BASE_URL', `http://127.0.0.1:${server.address().port}/api`)
  vi.resetModules()
  ;({ productService } = await import('../src/services/product.service.ts'))
  ;({ orderService } = await import('../src/services/order.service.ts'))
  ;({ inventoryService } = await import('../src/services/inventory.service.ts'))
  ;({ categoryService } = await import('../src/services/category.service.ts'))
  ;({ dashboardService } = await import('../src/services/dashboard.service.ts'))
  ;({ useMutation } = await import('../src/hooks/use-mutation.ts'))
})
afterAll(async () => {
  vi.unstubAllGlobals(); vi.unstubAllEnvs()
  if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  setDb(null)
  db?.close()
  if (dir) await rm(dir, { recursive: true, force: true })
  expect(await hash()).toBe(beforeHash)
})

describe('SQLite-backed full-stack integration', () => {
  it('renders authentic empty API data and allows the first real category', async () => {
    expect((await productService.getProducts()).data).toEqual([])
    expect(await categoryService.getCategories()).toEqual([])
    const empty = await dashboardService.getSummary(30)
    expect(empty.orders.total_revenue_paise).toBe(0)
    expect(empty.orders_by_status).toEqual({ Pending: 0, Confirmed: 0, Completed: 0, Cancelled: 0 })
    expect(empty.daily_trend).toHaveLength(30)
    await expect(categoryService.createCategory({ name: ' ' })).rejects.toMatchObject({ status: 400 })
    category = await categoryService.createCategory({ name: ' Integration Category ' })
    expect(category.name).toBe('Integration Category')
    await expect(categoryService.createCategory({ name: 'integration category' })).rejects.toMatchObject({ status: 409 })
  })
  it('creates and edits persisted products, preserving stock and immutable SKU', async () => {
    first = await productService.createProduct({ name: 'First product', sku: 'INTEGRATION-1', category_id: category.id, price_paise: 10101, stock_quantity: 10, low_stock_threshold: 3 })
    second = await productService.createProduct({ name: 'Second product', sku: 'INTEGRATION-2', category_id: category.id, price_paise: 25050, stock_quantity: 4, low_stock_threshold: 3 })
    expect(db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(first.id).stock_quantity).toBe(10)
    const edited = await productService.updateProduct(first.id, { name: 'First updated', price_paise: 10201, description: 'Persisted description' })
    expect(edited).toMatchObject({ name: 'First updated', price_paise: 10201, stock_quantity: 10, sku: 'INTEGRATION-1' })
    expect(await productService.getProductById(first.id)).toMatchObject({ description: 'Persisted description' })
    const selected = await productService.getProducts({ search: 'updated', category_id: category.id, is_active: 1, sort_by: 'price_paise', sort_dir: 'asc', page: 1, limit: 1 })
    expect(selected.data[0].id).toBe(first.id)
    expect(selected.pagination).toMatchObject({ total: 1, totalPages: 1, hasNext: false })
    await expect(productService.createProduct({ name: 'Invalid', sku: 'BAD', category_id: category.id, price_paise: -1, stock_quantity: 0 })).rejects.toMatchObject({ status: 400 })
  })
  it('creates a multi-item order, snapshots backend prices, and deducts stock atomically', async () => {
    const payload = { customer_name: 'Integration customer', items: [{ product_id: first.id, quantity: 2 }, { product_id: second.id, quantity: 1 }] }
    completed = await orderService.createOrder(payload, 'integration-order-one')
    expect(completed.total_paise).toBe(45452)
    expect(completed.items).toHaveLength(2)
    expect((await productService.getProductById(first.id)).stock_quantity).toBe(8)
    expect((await productService.getProductById(second.id)).stock_quantity).toBe(3)
    const replay = await orderService.createOrder(payload, 'integration-order-one')
    expect(replay.id).toBe(completed.id)
    expect((await productService.getProductById(first.id)).stock_quantity).toBe(8)
    await expect(orderService.createOrder({ ...payload, customer_name: 'Different' }, 'integration-order-one')).rejects.toMatchObject({ status: 409 })
    const movements = await inventoryService.getMovements({ product_id: first.id, type: 'sale' })
    expect(movements.data).toHaveLength(1)
    expect(movements.data[0]).toMatchObject({ order_id: completed.id, order_number: completed.order_number, quantity_delta: -2, previous_stock: 10, resulting_stock: 8 })
  })
  it('rejects insufficient stock with no partial deductions or extra orders', async () => {
    await expect(orderService.createOrder({ customer_name: 'Rejected', items: [{ product_id: first.id, quantity: 1 }, { product_id: second.id, quantity: 999 }] }, 'integration-insufficient')).rejects.toMatchObject({ status: 422 })
    expect((await productService.getProductById(first.id)).stock_quantity).toBe(8)
    expect((await orderService.getOrders()).pagination.total).toBe(1)
  })
  it('confirms and completes an order and enforces terminal states', async () => {
    expect((await orderService.updateStatus(completed.id, 'Confirmed')).status).toBe('Confirmed')
    expect((await orderService.updateStatus(completed.id, 'Completed')).status).toBe('Completed')
    await expect(orderService.updateStatus(completed.id, 'Cancelled')).rejects.toMatchObject({ status: 422 })
    const detail = await orderService.getOrderById(completed.id)
    expect(detail.status_history.map(entry => entry.new_status)).toEqual(['Pending', 'Confirmed', 'Completed'])
  })
  it('cancels an eligible order and restores every line exactly once', async () => {
    cancelled = await orderService.createOrder({ customer_name: 'Cancel customer', items: [{ product_id: first.id, quantity: 1 }, { product_id: second.id, quantity: 2 }] }, 'integration-cancel')
    await orderService.updateStatus(cancelled.id, 'Confirmed')
    await orderService.updateStatus(cancelled.id, 'Cancelled')
    await orderService.updateStatus(cancelled.id, 'Cancelled')
    expect((await productService.getProductById(first.id)).stock_quantity).toBe(8)
    expect((await productService.getProductById(second.id)).stock_quantity).toBe(3)
    expect((await inventoryService.getMovements({ type: 'cancellation_reversal' })).data).toHaveLength(2)
    await expect(orderService.updateStatus(cancelled.id, 'Confirmed')).rejects.toMatchObject({ status: 422 })
  })
  it('adjusts stock with an audit reason and safely replays manual adjustments', async () => {
    const payload = { product_id: first.id, delta: -8, reason: 'Integration stock audit' }
    const adjusted = await inventoryService.adjustStock(payload, 'integration-adjust')
    const replay = await inventoryService.adjustStock(payload, 'integration-adjust')
    expect(replay).toEqual(adjusted)
    expect((await productService.getProductById(first.id)).stock_quantity).toBe(0)
    expect((await inventoryService.getMovements({ type: 'adjustment', product_id: first.id })).data).toHaveLength(1)
    await expect(inventoryService.adjustStock({ ...payload, delta: -1 }, 'integration-negative')).rejects.toMatchObject({ status: 422 })
    await expect(inventoryService.adjustStock({ ...payload, reason: '' }, 'integration-empty-reason')).rejects.toMatchObject({ status: 400 })
  })
  it('filters availability and low-stock records with accurate pagination', async () => {
    const zero = await productService.getProducts({ availability: 'out_of_stock' })
    expect(zero.data.map(product => product.id)).toEqual([first.id])
    expect((await productService.getProducts({ availability: 'low_stock' })).data.map(product => product.id)).toEqual([second.id])
    const alerts = await inventoryService.getLowStock({ include_out_of_stock: 'false', limit: 1 })
    expect(alerts.data.map(product => product.id)).toEqual([second.id])
    expect(alerts.pagination.total).toBe(1)
  })
  it('matches dashboard aggregates and chart ranges to the persisted database', async () => {
    for (const days of [7, 30]) {
      const dashboard = await dashboardService.getSummary(days)
      expect(dashboard.orders).toEqual({ total_orders: 2, total_revenue_paise: 45452 })
      expect(dashboard.products).toEqual({ total_active: 2, low_stock_count: 2, out_of_stock_count: 1 })
      expect(dashboard.orders_by_status).toEqual({ Pending: 0, Confirmed: 0, Completed: 1, Cancelled: 1 })
      expect(dashboard.daily_trend).toHaveLength(days)
      expect(dashboard.daily_trend.reduce((sum, point) => sum + point.revenue_paise, 0)).toBe(45452)
    }
  })
  it('retries a genuinely lost order response with the same key and no duplicate stock effects', async () => {
    const realFetch = globalThis.fetch
    let loseOnce = true
    const keys = []
    vi.stubGlobal('fetch', async (url, options) => {
      if (String(url).endsWith('/orders') && options?.method === 'POST') {
        keys.push(options.headers.get('Idempotency-Key'))
        const response = await realFetch(url, options)
        if (loseOnce) { loseOnce = false; await response.text(); throw new TypeError('Lost after commit') }
        return response
      }
      return realFetch(url, options)
    })
    const { result, unmount } = renderHook(useMutation)
    const payload = { customer_name: 'Lost response test', items: [{ product_id: second.id, quantity: 1 }] }
    try {
      await act(async () => { await result.current.run(payload, key => orderService.createOrder(payload, key), true) })
      expect(result.current.uncertain).toBe(true)
      await act(async () => { await result.current.run(payload, key => orderService.createOrder(payload, key), true) })
      expect(result.current.uncertain).toBe(false)
      expect(keys[0]).toBe(keys[1])
      expect((await orderService.getOrders()).pagination.total).toBe(3)
      expect((await productService.getProductById(second.id)).stock_quantity).toBe(2)
    } finally { unmount(); vi.unstubAllGlobals() }
  })
  it('archives without deleting order history and reads selectors beyond the first hundred products', async () => {
    await productService.archiveProduct(first.id)
    expect((await productService.getProducts({ is_active: 1 })).data.map(product => product.id)).not.toContain(first.id)
    expect((await productService.getProducts({ is_active: 0 })).data[0].id).toBe(first.id)
    expect((await orderService.getOrderById(completed.id)).items[0].product_id).toBe(first.id)
    db.transaction(() => {
      const insert = db.prepare('INSERT INTO products (name, sku, category_id, price_paise, stock_quantity) VALUES (?, ?, ?, 100, 1)')
      for (let i = 0; i < 102; i++) insert.run(`Pagination ${i}`, `PAGE-${i}`, category.id)
    })()
    expect(await productService.getAllActive()).toHaveLength(103)
    const reader = new Database(join(dir, 'integration.sqlite'), { readonly: true })
    expect(reader.prepare('SELECT COUNT(*) AS count FROM orders').get().count).toBe(3)
    reader.close()
  })
})
