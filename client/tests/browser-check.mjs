// Browser verification uses installed Chrome + its native debugging protocol, with no added dependencies.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { createServer } from 'vite'
import app from '../../server/src/app.js'
import { setDb } from '../../server/src/db/connection.js'
import { runMigrations } from '../../server/src/db/migrate.js'
const requireServer = createRequire(resolve('../server/package.json'))
const Database = requireServer('better-sqlite3')
const dir = await mkdtemp(join(tmpdir(), 'retailops-browser-'))
const hash = async () => {
  try { return createHash('sha256').update(await readFile(resolve('../server/data/retailops.db'))).digest('hex') }
  catch (error) { if (error.code === 'ENOENT') return null; throw error }
}
const beforeHash = await hash()
let api, vite, chrome, socket, db
const errors = []
const checks = []
const pending = new Map()
let nextId = 0
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const mark = message => { checks.push(message); console.log(`PASS ${message}`) }
async function send(method, params = {}) {
  const id = ++nextId
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timed out: ${method}`)) }, 15000)
    pending.set(id, { resolve: value => { clearTimeout(timeout); resolve(value) }, reject: error => { clearTimeout(timeout); reject(error) } })
    socket.send(JSON.stringify({ id, method, params }))
  })
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text)
  return result.result.value
}
async function waitFor(expression, label = expression) {
  for (let i = 0; i < 100; i++) {
    if (await evaluate(`Boolean(${expression})`)) return
    await delay(100)
  }
  throw new Error(`Timed out: ${label}\n${await evaluate('document.body.innerText')}`)
}
const visible = expression => `(${expression}).filter(e => e.getClientRects().length)`
const button = text => `${visible("[...document.querySelectorAll('button')]")}.find(e => e.textContent.trim() === ${JSON.stringify(text)})`
async function click(expression) {
  const box = await evaluate(`(() => { const e = ${expression}; if (!e) throw new Error('Missing click target'); e.scrollIntoView({block:'center'}); const r = e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2} })()`)
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...box })
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...box })
}
async function input(selector, value) {
  await waitFor(`document.querySelector(${JSON.stringify(selector)})`, `input ${selector}`)
  await evaluate(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) throw new Error('Missing input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(String(value))}); e.dispatchEvent(new Event('input',{bubbles:true})); })()`)
}
async function choose(trigger, text) {
  await click(trigger)
  await waitFor(`document.querySelector('[role="option"]')`, 'select opened')
  await click(`${visible("[...document.querySelectorAll('[role=option]')]")}.find(e => e.textContent.includes(${JSON.stringify(text)}))`)
}
async function route(path, expected) {
  await send('Page.navigate', { url: `${origin}${path}` })
  await waitFor(`document.body.innerText.toLowerCase().includes(${JSON.stringify(expected.toLowerCase())})`)
  await waitFor(`document.querySelector('header')?.innerText.includes('Connected')`)
}
let origin
try {
  db = new Database(join(dir, 'browser.sqlite'))
  db.pragma('foreign_keys = ON'); runMigrations(db); setDb(db)
  api = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)) })
  vite = await createServer({ mode: 'test', server: { port: 0, strictPort: false, proxy: { '/api': { target: `http://127.0.0.1:${api.address().port}`, changeOrigin: true } } } })
  await vite.listen()
  origin = `http://127.0.0.1:${vite.httpServer.address().port}`
  chrome = spawn(process.env.CHROME_BIN || '/usr/bin/google-chrome', ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--remote-debugging-port=0', `--user-data-dir=${join(dir, 'chrome')}`, '--no-first-run', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] })
  const debugUrl = await new Promise((resolve, reject) => {
    let output = ''
    const timeout = setTimeout(() => reject(new Error('Chrome did not start')), 15000)
    chrome.once('error', reject)
    chrome.stderr.on('data', chunk => { output += chunk; const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (match) { clearTimeout(timeout); resolve(match[1]) } })
  })
  const endpoint = new URL(debugUrl)
  const tabs = await (await fetch(`http://${endpoint.host}/json/list`)).json()
  socket = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }) })
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data)
    if (message.id) {
      const operation = pending.get(message.id)
      pending.delete(message.id)
      if (operation) {
        if (message.error) operation.reject(new Error(message.error.message))
        else operation.resolve(message.result)
      }
    } else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text)
  })
  await send('Runtime.enable'); await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  await route('/products', 'No products found')
  await click(button('Add Product'))
  await waitFor(`document.body.innerText.includes('Create a category to register your first product.')`)
  await input('#category-name', 'Browser Category')
  await click(button('Add Category'))
  await waitFor(`document.querySelector('#product-category')?.innerText.includes('Browser Category')`)
  await input('#product-name', 'Browser Product A'); await input('#product-sku', 'BROWSER-A')
  await input('#product-price', '100.25'); await input('#product-stock', 10)
  await click(button('Create Product'))
  await waitFor(`!document.querySelector('[role=dialog]')`)
  assert.equal(db.prepare('SELECT price_paise FROM products WHERE sku = ?').get('BROWSER-A').price_paise, 10025)
  mark('empty startup → category creation → product creation persisted through the UI')
  await click(button('Add Product'))
  await input('#product-name', 'Browser Product B'); await input('#product-sku', 'BROWSER-B')
  await choose("document.querySelector('#product-category')", 'Browser Category')
  await input('#product-price', '20.50'); await input('#product-stock', 5)
  await click(button('Create Product')); await waitFor(`!document.querySelector('[role=dialog]')`)
  await waitFor(`document.body.innerText.includes('Browser Product B')`)
  await click("[...document.querySelectorAll('tr')].find(e => e.innerText.includes('Browser Product A')).querySelector('button')")
  await waitFor(`document.querySelector('#product-name')?.value === 'Browser Product A'`)
  assert.equal(await evaluate("document.querySelector('#product-stock').disabled"), true)
  assert.equal(await evaluate("document.querySelector('#product-sku').disabled"), true)
  await input('#product-name', 'Browser Product A Updated'); await click(button('Save Changes'))
  await waitFor(`!document.querySelector('[role=dialog]')`)
  assert.equal(db.prepare('SELECT name FROM products WHERE sku = ?').get('BROWSER-A').name, 'Browser Product A Updated')
  mark('product edit persisted; SKU and ordinary stock updates disabled')
  await route('/orders', 'No orders found'); await click(button('Create Order'))
  await input('#order-customer-name', 'Browser Customer')
  await choose("document.querySelector('[role=dialog] [role=combobox]')", 'BROWSER-A')
  await input('[aria-label="Quantity for item 1"]', 2)
  await click(button('Add Item'))
  await choose("document.querySelectorAll('[role=dialog] [role=combobox]')[1]", 'BROWSER-B')
  await click(button('Place Order')); await waitFor(`!document.querySelector('[role=dialog]')`)
  assert.equal(db.prepare('SELECT total_paise FROM orders').get().total_paise, 22100)
  assert.deepEqual(db.prepare('SELECT stock_quantity FROM products ORDER BY sku').all().map(p => p.stock_quantity), [8, 4])
  mark('multi-item order UI → backend totals and stock deduction')
  await waitFor(`document.body.innerText.includes('Browser Customer')`)
  await click(button('Details')); await waitFor(`document.body.innerText.includes('Mark as Confirmed')`)
  await click(button('Mark as Confirmed')); await waitFor(`document.body.innerText.includes('Mark as Completed')`)
  await click(button('Mark as Completed')); await waitFor(`document.body.innerText.includes('This order is completed.')`)
  await click(button('Close')); await waitFor(`!document.querySelector('[role=dialog]')`)
  mark('order details → Confirmed → Completed; terminal state has no actions')
  await click(button('Create Order')); await input('#order-customer-name', 'Browser Cancellation')
  await choose("document.querySelector('[role=dialog] [role=combobox]')", 'BROWSER-B')
  await click(button('Place Order')); await waitFor(`!document.querySelector('[role=dialog]')`)
  await waitFor(`document.body.innerText.includes('Browser Cancellation')`)
  await click("[...document.querySelectorAll('tr')].find(e => e.innerText.includes('Browser Cancellation')).querySelector('button')")
  await waitFor(`document.body.innerText.includes('Mark as Cancelled')`)
  await click(button('Mark as Cancelled')); await waitFor(`document.body.innerText.includes('This order is cancelled.')`)
  await click(button('Close')); await waitFor(`!document.querySelector('[role=dialog]')`)
  assert.equal(db.prepare("SELECT stock_quantity FROM products WHERE sku='BROWSER-B'").get().stock_quantity, 4)
  mark('eligible cancellation through UI restores stock')
  await route('/inventory', 'Browser Product B')
  await click(button('Adjust Stock')); await waitFor(`document.querySelector('#adj-product')`)
  await choose("document.querySelector('#adj-product')", 'BROWSER-A')
  await input('#adj-quantity', 3); await input('#adj-reason', 'Browser audit restock')
  await click(button('Apply Adjustment')); await waitFor(`!document.querySelector('[role=dialog]')`)
  assert.equal(db.prepare("SELECT stock_quantity FROM products WHERE sku='BROWSER-A'").get().stock_quantity, 11)
  await click("[...document.querySelectorAll('[role=tab]')].find(e => e.textContent.includes('Movement Audit Trail'))")
  await waitFor(`document.body.innerText.includes('Browser audit restock')`)
  mark('stock adjustment → refetched quantities and backend movement history')
  await route('/', 'Total Revenue'); await waitFor(`document.body.innerText.includes('₹221.00')`)
  await click("[...document.querySelectorAll('[role=tab]')].find(e => e.textContent.includes('30 Days'))")
  await waitFor(`document.body.innerText.includes('₹221.00')`)
  assert.equal(db.prepare("SELECT SUM(total_paise) AS total FROM orders WHERE status='Completed'").get().total, 22100)
  await waitFor(`document.querySelector('.recharts-surface')`)
  mark('dashboard completed revenue matches SQLite; 30-day chart loads')
  await route('/products', 'Browser Product A Updated')
  await click("[...document.querySelectorAll('tr')].find(e => e.innerText.includes('Browser Product A Updated')).querySelectorAll('button')[1]")
  await waitFor(`document.querySelector('[role=dialog]')`)
  await click(`${visible("[...document.querySelectorAll('[role=dialog] button')]")}.find(e => e.textContent.trim() === 'Archive Product')`)
  await waitFor(`!document.querySelector('[role=dialog]')`)
  assert.equal(db.prepare("SELECT is_active FROM products WHERE sku='BROWSER-A'").get().is_active, 0)
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM order_items').get().count, 3)
  mark('product archive preserves historical order items')
  for (const [path, title] of [['/', 'Total Revenue'], ['/products', 'Product Catalog'], ['/orders', 'Customer Orders'], ['/inventory', 'Inventory & Stock Control']]) {
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
    await route(path, title)
    assert.equal(await evaluate(`document.documentElement.scrollWidth <= 390 && document.querySelector('main').getBoundingClientRect().right <= 390`), true, `Layout exceeds mobile viewport at ${path}`)
  }
  mark('all four screens load at 390px without horizontal page overflow')
  const screenshot = await send('Page.captureScreenshot', { format: 'png' })
  await writeFile(process.env.BROWSER_SCREENSHOT_PATH || join(dir, 'inventory-mobile.png'), Buffer.from(screenshot.data, 'base64'))
  // A real API failure must not render an empty success state.
  await new Promise(resolve => api.close(resolve)); api = null
  await send('Page.navigate', { url: `${origin}/products` })
  await waitFor(`document.body.innerText.includes('Something went wrong')`)
  assert.equal(await evaluate(`document.body.innerText.includes('No products found')`), false)
  mark('backend outage displays an error rather than a successful empty catalog')
  assert.deepEqual(errors, [], 'Uncaught browser errors')
  mark('no uncaught browser exceptions')
  console.log(`Browser checks passed: ${checks.length}`)
} catch (error) {
  console.error(error)
  if (socket?.readyState === WebSocket.OPEN) console.error(await evaluate('document.body.innerText').catch(() => 'DOM unavailable'))
  process.exitCode = 1
} finally {
  socket?.close()
  if (chrome && chrome.exitCode === null) { chrome.kill('SIGTERM'); await new Promise(resolve => chrome.once('exit', resolve)) }
  await vite?.close()
  if (api) await new Promise(resolve => api.close(resolve))
  setDb(null); db?.close()
  await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
  assert.equal(await hash(), beforeHash, 'Development database must remain unchanged')
}
