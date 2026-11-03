> Phase 3 integration is implemented. This historical handoff is superseded by [INTEGRATION_REPORT.md](INTEGRATION_REPORT.md); use that report and the current source for API contracts, verification results, and startup commands.

# RetailOps Lite — Frontend Engineering Handoff Document (Phase 2 -> Phase 3)

## 1. Executive Summary

This document provides complete architectural specifications, contract reconciliations, and an actionable integration checklist for **Phase 3 (Live API Integration)** of the **RetailOps Lite — Smart Inventory & Order Management System**.

Phase 2 frontend development is complete. The application is built with React 19, TypeScript (strict mode), Vite, Tailwind CSS v4, and Radix/shadcn UI primitives. All 4 core pages (Dashboard, Products, Orders, Inventory) have been implemented, styled, unit tested (28 tests passing), and verified for zero type errors (`tsc -b`).

In strict accordance with Phase 2 constraints, **no synthetic or mock data** has been created. All services throw `NotConnectedError` by default to display honest "Integration Pending" states pointing to their respective backend endpoints.

---

## 2. Critical Backend Contract Reconciliations

During inspection of the backend source files (`/home/lucifer/Desktop/interview/server/src/`), **8 critical discrepancies** were identified between the high-level `BACKEND_HANDOFF.md` and the actual Express/SQLite codebase.

The frontend types and services have been implemented against the **actual backend code**, not the stale handoff text:

| # | Feature / Area | `BACKEND_HANDOFF.md` Claim | Actual Backend Implementation (`server/src/`) | Frontend Resolution & Type |
|---|---|---|---|---|
| **1** | **Dashboard Summary Response** | Flat object: `total_active_products`, `total_completed_revenue_paise`, `daily_sales_trend` | Nested object: `products.total_active`, `orders.total_revenue_paise`, `daily_trend`, `range_days` | Implemented `DashboardSummary` in `@/types/dashboard.ts` using nested structure and `daily_trend`. |
| **2** | **Orders List Item Count** | Implies `item_count` column on `GET /api/orders` | `SELECT * FROM orders` does **not** return `item_count`. Only `GET /api/orders/:id` joins order items | Removed `item_count` from `OrderListItem`. Full line item details are inspected via `GET /api/orders/:id`. |
| **3** | **Product Query Parameters** | Specifies camelCase `sortBy` and `sortOrder` | `product.schema.js` enforces snake_case: `sort_by` and `sort_dir` | Query builder uses `sort_by?: 'name' \| 'sku' \| 'price_paise' \| 'stock_quantity' \| 'created_at'` and `sort_dir?: 'ASC' \| 'DESC'`. |
| **4** | **Order Query Parameters** | Specifies `sortBy`, `sortOrder`, and `search` | `order.schema.js` **only** accepts `status`, `sort_dir`, `page`, and `limit` | Removed unsupported search and sort_by from orders query to prevent 400 Bad Request responses. |
| **5** | **Product Default Page Limit** | States default page limit is `10` | `product.schema.js` default is `20` | Aligned frontend pagination defaults to `20` items per page. |
| **6** | **Low-Stock Query Parameter** | Omits `include_out_of_stock` parameter | `inventory.schema.js` defines `include_out_of_stock: 'true' \| 'false'` (default `'true'`) | Added `include_out_of_stock` to `LowStockQueryParams` in `@/types/inventory.ts`. |
| **7** | **Backend Server Port** | States default port is `5000` | Backend `.env` and `src/config/index.js` default to `3000` | Frontend `.env.example` and `constants.ts` default to `http://127.0.0.1:3000/api`. |
| **8** | **Inventory Movements Sorting** | Mentions `sortOrder` | `inventory.schema.js` requires `sort_dir: 'ASC' \| 'DESC'` | Aligned movement queries to use `sort_dir`. |

---

## 3. Frontend Service to Backend API Mapping

All frontend service calls route through `@/lib/api-client.ts`:

### 3.1 Dashboard Service (`@/services/dashboard.service.ts`)
- `GET /api/dashboard/summary?days={7|30}` -> `dashboardService.getSummary(days)`
- `GET /api/inventory/low-stock?threshold=...` -> `dashboardService.getLowStock(threshold)`

### 3.2 Product Service (`@/services/product.service.ts`)
- `GET /api/products` -> `productService.getProducts(params)`
- `GET /api/products/:id` -> `productService.getProductById(id)`
- `POST /api/products` -> `productService.createProduct(payload)`
- `PUT /api/products/:id` -> `productService.updateProduct(id, payload)`
- `DELETE /api/products/:id` -> `productService.archiveProduct(id)`

### 3.3 Order Service (`@/services/order.service.ts`)
- `GET /api/orders` -> `orderService.getOrders(params)`
- `GET /api/orders/:id` -> `orderService.getOrderById(id)`
- `POST /api/orders` -> `orderService.createOrder(payload, idempotencyKey)` (requires `Idempotency-Key` header)
- `PATCH /api/orders/:id/status` -> `orderService.updateStatus(id, status)`

### 3.4 Inventory Service (`@/services/inventory.service.ts`)
- `GET /api/inventory/low-stock` -> `inventoryService.getLowStock(params)`
- `GET /api/inventory/movements` -> `inventoryService.getMovements(params)`
- `POST /api/inventory/adjustments` -> `inventoryService.adjustStock(payload, idempotencyKey)` (requires `Idempotency-Key` header)

### 3.5 Category Service (`@/services/category.service.ts`)
- `GET /api/categories` -> `categoryService.getCategories()`
- `POST /api/categories` -> `categoryService.createCategory(payload)`

---

## 4. Phase 3 Live Integration Checklist

When beginning Phase 3 live API integration, execute the following steps in sequence:

### Step 1: Enable Real API Calls in Frontend
In `client/.env`, set:
```env
VITE_CONNECT_REAL_API=true
VITE_API_BASE_URL=http://127.0.0.1:3000/api
```
*(In `@/lib/api-client.ts`, setting `VITE_CONNECT_REAL_API=true` bypasses `NotConnectedError` and enables direct fetch calls).*

### Step 2: Enable Form Submissions and State Transitions
1. **Product Form (`@/components/products/product-form-dialog.tsx`)**:
   - Change `handleValidateOnly` to execute `productService.createProduct` or `productService.updateProduct`.
   - Remove `disabled` attribute from submit button.
   - Show success notification via `toast.success()`.
2. **Order Form (`@/components/orders/create-order-dialog.tsx`)**:
   - Change submission handler to call `orderService.createOrder(data, generateIdempotencyKey())`.
   - Enable submit button.
3. **Order Detail Transitions (`@/components/orders/order-detail-dialog.tsx`)**:
   - Attach click handlers to transition buttons to call `orderService.updateStatus(order.id, targetStatus)`.
   - Enable transition buttons.
4. **Stock Adjustment (`@/components/inventory/stock-adjustment-dialog.tsx`)**:
   - Attach click handler to call `inventoryService.adjustStock(data, generateIdempotencyKey())`.
   - Enable submit button.

### Step 3: End-to-End Workflow Verification
Verify the following full operational loop against the live backend:
1. **Add Product**: Create SKU `TEST-SHIRT-01`, ₹499.00 price, stock 15, threshold 5. Confirm it appears in `GET /api/products`.
2. **Dashboard Verification**: Check KPI cards on `/` update with active product count.
3. **Place Order**: Create order for `TEST-SHIRT-01` with quantity 2. Confirm order created on `/orders` with status `Pending`.
4. **Stock Auto-Deduction**: Inspect `/inventory` and verify stock dropped from 15 to 13, and a `sale` movement was logged.
5. **State Transitions**: Transition order to `Confirmed`, then `Completed`.
6. **Cancellation & Restock**: Create a second order, then transition to `Cancelled`. Verify inventory increases by the cancelled quantity with a `cancellation_reversal` movement.
7. **Manual Stock Adjustment**: Apply a +10 adjustment with reason "Stock delivery". Verify balance updates to 23 and audit entry logs `adjustment`.

---

## 5. Verification Commands

Run these commands inside `/home/lucifer/Desktop/interview/client`:

```bash
# Verify TypeScript strict typecheck (0 errors)
npm run typecheck

# Verify test suite (28 tests passing)
npm test

# Verify production bundle build
npm run build

# Verify code linting
npm run lint
```
