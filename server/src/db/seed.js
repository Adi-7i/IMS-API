// @ts-check
/**
 * Seed data for RetailOps Lite.
 * Populates categories, products, orders, order items, and stock movements.
 *
 * @param {import('better-sqlite3').Database} db
 */
export function runSeed(db) {
  // ── Categories ────────────────────────────────────────────────────────────
  const categories = [
    { name: 'Electronics' },
    { name: 'Accessories' },
    { name: 'Office Supplies' },
    { name: 'Storage & Drives' },
    { name: 'Networking' },
  ];

  const insertCategory = db.prepare(
    `INSERT OR IGNORE INTO categories (name) VALUES (@name)`
  );

  for (const cat of categories) {
    insertCategory.run(cat);
  }

  // Fetch IDs by name for FK references
  /** @param {string} name @returns {number} */
  const getCatId = (name) => {
    /** @type {{id: number}} */
    const row = /** @type {any} */ (db.prepare('SELECT id FROM categories WHERE name = ?').get(name));
    return row.id;
  };

  const elec = getCatId('Electronics');
  const acc  = getCatId('Accessories');
  const off  = getCatId('Office Supplies');
  const stor = getCatId('Storage & Drives');
  const net  = getCatId('Networking');

  // ── Products ──────────────────────────────────────────────────────────────
  const products = [
    { name: 'Wireless Optical Mouse',    sku: 'MOU-101', category_id: acc,  description: 'Ergonomic wireless mouse, 2.4GHz',              price_paise: 59900,  stock_quantity: 42, low_stock_threshold: 5  },
    { name: 'Mechanical Keyboard',       sku: 'KEY-201', category_id: acc,  description: 'Compact TKL mechanical keyboard, blue switches', price_paise: 249900, stock_quantity: 18, low_stock_threshold: 5  },
    { name: '27-inch 4K Monitor',        sku: 'MON-301', category_id: elec, description: '4K UHD IPS display, 60Hz, USB-C',               price_paise: 2499900, stock_quantity: 8, low_stock_threshold: 3  },
    { name: 'USB-C Hub 7-in-1',          sku: 'HUB-401', category_id: acc,  description: 'HDMI, USB 3.0 x3, SD, PD 100W',                price_paise: 149900, stock_quantity: 3,  low_stock_threshold: 5  },
    { name: 'Laptop Stand Adjustable',   sku: 'STD-501', category_id: acc,  description: 'Aluminium alloy, foldable',                    price_paise: 89900,  stock_quantity: 25, low_stock_threshold: 5  },
    { name: 'Noise Cancelling Headset',  sku: 'AUD-601', category_id: elec, description: 'Over-ear ANC, Bluetooth 5.2, 30h battery',     price_paise: 799900, stock_quantity: 12, low_stock_threshold: 3  },
    { name: 'Webcam 1080p HD',           sku: 'CAM-701', category_id: elec, description: 'Full HD 30fps, built-in microphone',           price_paise: 349900, stock_quantity: 0,  low_stock_threshold: 5  },
    { name: 'A4 Printer Paper (500 sht)',sku: 'PAP-801', category_id: off,  description: '80 gsm, 500 sheets per ream',                  price_paise: 39900,  stock_quantity: 90, low_stock_threshold: 20 },
    { name: 'Ballpoint Pens (12-pack)',  sku: 'PEN-901', category_id: off,  description: 'Black ink, medium tip',                        price_paise: 14900,  stock_quantity: 4,  low_stock_threshold: 10 },
    { name: 'Sticky Notes (5-pack)',     sku: 'NOT-1001', category_id: off, description: '76x76mm, assorted neon colours',               price_paise: 19900,  stock_quantity: 55, low_stock_threshold: 10 },
    { name: 'Portable SSD 1TB',          sku: 'SSD-1101', category_id: stor,description: 'USB 3.2 Gen 2, 1050 MB/s read',               price_paise: 799900, stock_quantity: 14, low_stock_threshold: 3  },
    { name: 'USB Flash Drive 64GB',      sku: 'USB-1201', category_id: stor,description: 'USB 3.0, 100 MB/s read',                      price_paise: 49900,  stock_quantity: 60, low_stock_threshold: 10 },
    { name: 'Wi-Fi 6 Router',            sku: 'RTR-1301', category_id: net, description: 'AX3000 dual-band, 4x LAN ports',              price_paise: 599900, stock_quantity: 7,  low_stock_threshold: 3  },
    { name: 'Ethernet Cable Cat6 5m',    sku: 'ETH-1401', category_id: net, description: '5 metre, RJ45 patch cable',                   price_paise: 24900,  stock_quantity: 2,  low_stock_threshold: 5  },
    { name: 'Surge Protector 6-outlet',  sku: 'SPT-1501', category_id: elec,description: '6-outlet, 2500J, 2m cord',                   price_paise: 119900, stock_quantity: 20, low_stock_threshold: 5  },
  ];

  const insertProduct = db.prepare(`
    INSERT OR IGNORE INTO products
      (name, sku, category_id, description, price_paise, stock_quantity, low_stock_threshold)
    VALUES
      (@name, @sku, @category_id, @description, @price_paise, @stock_quantity, @low_stock_threshold)
  `);

  const insertMovement = db.prepare(`
    INSERT INTO stock_movements
      (product_id, movement_type, quantity_delta, previous_stock, resulting_stock, order_id, reason)
    VALUES
      (@product_id, @movement_type, @quantity_delta, @previous_stock, @resulting_stock, @order_id, @reason)
  `);

  for (const product of products) {
    // Only insert if SKU doesn't exist yet (idempotent seeding)
    /** @type {{id: number} | undefined} */
    const existing = /** @type {any} */ (db.prepare('SELECT id FROM products WHERE sku = ?').get(product.sku));
    if (!existing) {
      insertProduct.run(product);
      /** @type {{id: number}} */
      const created = /** @type {any} */ (db.prepare('SELECT id FROM products WHERE sku = ?').get(product.sku));
      insertMovement.run({
        product_id:      created.id,
        movement_type:   'initial',
        quantity_delta:  product.stock_quantity,
        previous_stock:  0,
        resulting_stock: product.stock_quantity,
        order_id:        null,
        reason:          'Initial stock on product creation',
      });
    }
  }

  // ── Orders ────────────────────────────────────────────────────────────────
  // Only seed orders if none exist
  /** @type {{count: number}} */
  const orderCount = /** @type {any} */ (db.prepare('SELECT COUNT(*) as count FROM orders').get());
  if (orderCount.count > 0) return;

  /** @param {string} sku @returns {number} */
  const getProdId = (sku) => {
    /** @type {{id: number}} */
    const row = /** @type {any} */ (db.prepare('SELECT id FROM products WHERE sku = ?').get(sku));
    return row.id;
  };

  const insertOrder = db.prepare(`
    INSERT INTO orders (order_number, customer_name, status, total_paise)
    VALUES (@order_number, @customer_name, @status, @total_paise)
  `);

  const insertOrderItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, quantity, unit_price_paise, line_total_paise)
    VALUES (@order_id, @product_id, @quantity, @unit_price_paise, @line_total_paise)
  `);

  const insertStatusHistory = db.prepare(`
    INSERT INTO order_status_history (order_id, previous_status, new_status)
    VALUES (@order_id, @previous_status, @new_status)
  `);

  const seedOrders = [
    {
      order_number: 'ORD-20261001-0001',
      customer_name: 'Rahul Sharma',
      status: 'Completed',
      items: [
        { sku: 'MOU-101', quantity: 2 },
        { sku: 'KEY-201', quantity: 1 },
      ],
    },
    {
      order_number: 'ORD-20261002-0002',
      customer_name: 'Priya Nair',
      status: 'Completed',
      items: [
        { sku: 'MON-301', quantity: 1 },
        { sku: 'HUB-401', quantity: 1 },
      ],
    },
    {
      order_number: 'ORD-20261015-0003',
      customer_name: 'Aditya Mehta',
      status: 'Confirmed',
      items: [
        { sku: 'SSD-1101', quantity: 2 },
        { sku: 'USB-1201', quantity: 5 },
      ],
    },
    {
      order_number: 'ORD-20261020-0004',
      customer_name: 'Sneha Gupta',
      status: 'Pending',
      items: [
        { sku: 'PAP-801', quantity: 3 },
        { sku: 'PEN-901', quantity: 2 },
        { sku: 'NOT-1001', quantity: 4 },
      ],
    },
    {
      order_number: 'ORD-20261101-0005',
      customer_name: 'Vikram Patel',
      status: 'Cancelled',
      items: [
        { sku: 'RTR-1301', quantity: 1 },
      ],
    },
  ];

  for (const order of seedOrders) {
    let totalPaise = 0;
    const resolvedItems = order.items.map((item) => {
      const productId = getProdId(item.sku);
      /** @type {{price_paise: number}} */
      const prod = /** @type {any} */ (db.prepare('SELECT price_paise FROM products WHERE id = ?').get(productId));
      const linePaise = prod.price_paise * item.quantity;
      totalPaise += linePaise;
      return { product_id: productId, quantity: item.quantity, unit_price_paise: prod.price_paise, line_total_paise: linePaise };
    });

    const result = insertOrder.run({
      order_number:  order.order_number,
      customer_name: order.customer_name,
      status:        order.status,
      total_paise:   totalPaise,
    });
    const orderId = Number(result.lastInsertRowid);

    for (const item of resolvedItems) {
      insertOrderItem.run({ order_id: orderId, ...item });

      // Deduct stock for non-cancelled orders
      if (order.status !== 'Cancelled') {
        /** @type {{stock_quantity: number}} */
        const prod = /** @type {any} */ (db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(item.product_id));
        const prevStock = prod.stock_quantity;
        const newStock  = prevStock - item.quantity;
        db.prepare('UPDATE products SET stock_quantity = ? WHERE id = ?').run(Math.max(0, newStock), item.product_id);
        insertMovement.run({
          product_id:      item.product_id,
          movement_type:   'sale',
          quantity_delta:  -item.quantity,
          previous_stock:  prevStock,
          resulting_stock: Math.max(0, newStock),
          order_id:        orderId,
          reason:          `Sale — Order ${order.order_number}`,
        });
      }
    }

    insertStatusHistory.run({ order_id: orderId, previous_status: null, new_status: 'Pending' });
    if (order.status !== 'Pending') {
      insertStatusHistory.run({ order_id: orderId, previous_status: 'Pending', new_status: order.status });
    }
  }
}
