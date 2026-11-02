// @ts-check
/**
 * Database schema migration.
 * Creates all 7 tables with constraints, indexes, and triggers.
 * Safe to run multiple times (CREATE TABLE IF NOT EXISTS).
 *
 * @param {import('better-sqlite3').Database} db
 */
export function runMigrations(db) {
  db.exec(`
    -- ─────────────────────────────────────────────────────────────────────────
    -- 1. CATEGORIES
    -- ─────────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS categories (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    -- ─────────────────────────────────────────────────────────────────────────
    -- 2. PRODUCTS
    -- ─────────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS products (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      name                 TEXT    NOT NULL,
      sku                  TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      category_id          INTEGER NOT NULL REFERENCES categories(id),
      description          TEXT,
      price_paise          INTEGER NOT NULL CHECK (price_paise >= 0),
      stock_quantity       INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
      low_stock_threshold  INTEGER NOT NULL DEFAULT 5  CHECK (low_stock_threshold >= 0),
      is_active            INTEGER NOT NULL DEFAULT 1  CHECK (is_active IN (0, 1)),
      created_at           TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at           TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_products_sku          ON products(sku);
    CREATE INDEX IF NOT EXISTS idx_products_category_id  ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_is_active    ON products(is_active);

    -- Auto-update updated_at on product changes
    CREATE TRIGGER IF NOT EXISTS trg_products_updated_at
    AFTER UPDATE ON products
    FOR EACH ROW
    BEGIN
      UPDATE products
         SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE id = OLD.id;
    END;

    -- ─────────────────────────────────────────────────────────────────────────
    -- 3. ORDERS
    -- ─────────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS orders (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number  TEXT    NOT NULL UNIQUE,
      customer_name TEXT    NOT NULL,
      status        TEXT    NOT NULL DEFAULT 'Pending'
                    CHECK (status IN ('Pending', 'Confirmed', 'Completed', 'Cancelled')),
      total_paise   INTEGER NOT NULL DEFAULT 0 CHECK (total_paise >= 0),
      created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

    -- Auto-update updated_at on order changes
    CREATE TRIGGER IF NOT EXISTS trg_orders_updated_at
    AFTER UPDATE ON orders
    FOR EACH ROW
    BEGIN
      UPDATE orders
         SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE id = OLD.id;
    END;

    -- ─────────────────────────────────────────────────────────────────────────
    -- 4. ORDER ITEMS
    -- ─────────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS order_items (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id         INTEGER NOT NULL REFERENCES orders(id),
      product_id       INTEGER NOT NULL REFERENCES products(id),
      quantity         INTEGER NOT NULL CHECK (quantity > 0),
      unit_price_paise INTEGER NOT NULL CHECK (unit_price_paise >= 0),
      line_total_paise INTEGER NOT NULL CHECK (line_total_paise >= 0)
    );

    CREATE INDEX IF NOT EXISTS idx_order_items_order_id   ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

    -- ─────────────────────────────────────────────────────────────────────────
    -- 5. STOCK MOVEMENTS  (immutable audit log)
    -- ─────────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS stock_movements (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id      INTEGER NOT NULL REFERENCES products(id),
      movement_type   TEXT    NOT NULL
                      CHECK (movement_type IN ('initial', 'sale', 'cancellation_reversal', 'adjustment')),
      quantity_delta  INTEGER NOT NULL,
      previous_stock  INTEGER NOT NULL CHECK (previous_stock >= 0),
      resulting_stock INTEGER NOT NULL CHECK (resulting_stock >= 0),
      order_id        INTEGER REFERENCES orders(id),
      reason          TEXT    NOT NULL,
      created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_order_id   ON stock_movements(order_id);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);

    -- ─────────────────────────────────────────────────────────────────────────
    -- 6. IDEMPOTENCY RECORDS
    -- ─────────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS idempotency_records (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      idempotency_key TEXT    NOT NULL UNIQUE,
      request_path    TEXT    NOT NULL,
      request_hash    TEXT    NOT NULL,
      response_status INTEGER NOT NULL,
      response_body   TEXT    NOT NULL,
      created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_idempotency_key ON idempotency_records(idempotency_key);

    -- ─────────────────────────────────────────────────────────────────────────
    -- 7. ORDER STATUS HISTORY  (immutable audit log)
    -- ─────────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS order_status_history (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id        INTEGER NOT NULL REFERENCES orders(id),
      previous_status TEXT,
      new_status      TEXT    NOT NULL,
      created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
  `);
}
