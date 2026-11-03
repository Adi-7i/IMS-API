# RetailOps Lite — Phase 3 Integration Report

Verified on 2026-11-02/03 (Asia/Kolkata). Repository: `/home/lucifer/Desktop/interview`. Opened frontend directory: `/home/lucifer/Desktop/interview/client`.

## Integration summary

The existing React/Vite frontend now uses the existing Express/SQLite backend for Dashboard, Products, Orders, and Inventory. The screens, routing, shadcn components, and backend transaction rules were retained. No dependencies, commits, deployments, or repository copies were created.

Preflight ran `pwd`, `git rev-parse --show-toplevel`, and `git status --short` before edits. The initial working tree was clean. Applicable ancestor/project paths were checked for `AGENTS.md`; none were found. Both applications, their handoffs, schemas, routes, repositories, and test scripts were inspected. Sandbox approval allowed the necessary edits in the original server and repository-root directories.

## Contract gaps resolved

| Area | Actual backend behavior and integration resolution |
| --- | --- |
| Connection gate | Removed the `VITE_CONNECT_REAL_API` runtime gate. Services always use native Fetch; failures produce real errors. |
| Pagination | Backend uses `totalPages`, `hasNext`, and `hasPrev`, not `total_pages`. API schemas, domain types, and pagination controls match. |
| Products | Updates use PATCH. SKU is immutable; stock changes use adjustments. Backend stores description, not cost price. Unsupported cost-price inputs were removed; description is editable. Zero-price products are supported. |
| Product filtering | Search, category, active/archive status, sorting, and pagination use the implemented snake_case parameters and lowercase sort directions. A small validated availability filter was added to SQL-backed product listing. `in_stock` means positive quantity, `low_stock` means positive quantity at/below threshold, and `out_of_stock` means zero. |
| Categories | Only GET originally existed. Added validated POST with a trimmed 1–100 character name, case-insensitive SQLite uniqueness, and an inline category-creation control in the existing product form. No categories are auto-created. |
| Orders | Requests contain only customer name and product/quantity pairs. Backend determines prices and totals. Removed email, phone, notes, and editable price controls that the backend does not persist. Correct response fields are `order_number`, `total_paise`, and item `line_total_paise`. Details include real items and status history. |
| Dashboard | Uses `range=7d/30d`, `products.*`, `orders.total_orders`, `orders.total_revenue_paise`, and `daily_trend`. Status counts come from filtered order pagination totals, and low-stock alerts from their real endpoint. No fabricated status counts or chart points. |
| Inventory | Adjustment payload is `{ product_id, delta, reason }`. Movement fields include `quantity_delta`, `previous_stock`, `resulting_stock`, and `order_id`. Added the related order-number join. Preserved low-stock pagination and fixed the previously ignored `include_out_of_stock=false` filter. |
| Validation | Zod validates JSON envelopes, domain responses, pagination, and forms. HTTP, malformed-response, transport, and abort outcomes are distinct. Field-level backend errors are surfaced, including paise-to-price-field mapping. |

## Behavior and consistency

- Rupee inputs are converted using decimal digits into safe integer paise; invalid precision, malformed numbers, and unsafe values are rejected.
- Product selectors retrieve all active product pages, including catalogs larger than 100 products. Backend IDs and prices remain authoritative.
- All reads support cancellation. Stale responses cannot overwrite newer filters or data; failed reads clear stale data and show error states.
- Successful mutations broadcast a refresh to mounted data queries. Navigating to other modules fetches current backend state.
- Mutation controls prevent simultaneous submissions. Success notifications occur only after confirmed API responses.
- Stock-changing POSTs require an explicit unique `Idempotency-Key`. The mutation hook retains the same key and payload after a lost response and blocks changes to an unresolved operation. A new logical operation receives a new key. Conflicts are displayed without automatic retries.
- The existing order status machine, immediate atomic deductions, terminal statuses, and exactly-once cancellation restoration were preserved.
- Inventory shows real stock, low/out-of-stock indicators, search, product/type movement filters, audit reasons, before/after balances, and order references.
- A minimal `min-w-0` flex-sizing correction keeps the existing layout within mobile viewports while wide tables scroll inside their containers.

## Connected endpoint methods

All paths below have the `/api` prefix.

| Module | Endpoint methods |
| --- | --- |
| Connection | `GET /health` |
| Dashboard | `GET /dashboard/summary?range=7d/30d`, filtered `GET /orders`, `GET /inventory/low-stock` |
| Categories | `GET /categories`, `POST /categories` |
| Products | `GET /products`, `GET /products/:id`, `POST /products`, `PATCH /products/:id`, `DELETE /products/:id` |
| Orders | `GET /orders`, `GET /orders/:id`, `POST /orders`, `PATCH /orders/:id/status` |
| Inventory | `GET /inventory/low-stock`, `GET /inventory/movements`, `POST /inventory/adjustments` |

## Verification evidence

| Command / check | Observed result |
| --- | --- |
| `cd client && npm run typecheck` | Passed, zero TypeScript errors. Also executed by the final production build. |
| `cd client && npm run build` | Passed. Vite emitted a bundle-size warning for the approximately 1.04 MB JS bundle. |
| `cd client && npm run lint` | Exit 0, zero errors; 8 warnings remain (3 shadcn Fast Refresh export warnings, 4 effect/state lifecycle warnings, and the generic data hook dependency-array warning). |
| `cd server && npm run typecheck` | Passed, zero errors. |
| `cd server && npm test` | 69 tests passed in 4 suites. Existing test helper uses isolated in-memory SQLite databases. |
| `cd client && npm test` | 48 tests passed in 10 files: 37 frontend tests plus 11 real full-stack integration tests. |
| `cd client && npm run test:integration` | 11 real frontend-service → Fetch → production Express-route → on-disk SQLite integration tests passed. |
| `cd client && npm run test:browser` | 11 Chrome checks passed using installed headless Chrome and the native debugging protocol. No added browser dependency. |
| `git diff --check` | Passed. |

The sandbox initially prevented backend test startup/local HTTP listeners. Those tests were rerun with approval and passed. Early frontend harness/contract expectations and browser harness assertions were corrected before the final successful runs; failed attempts are not represented as passing results.

### Required workflow coverage

| # | Workflow | Evidence |
| --- | --- | --- |
| 1 | Fetch SQLite products | Real production routes exercised through frontend services and Chrome. |
| 2 | Create and verify persistence | API and browser create products; direct SQLite queries and a separate read-only SQLite connection verify stored records. |
| 3 | Edit product | PATCH updates name, description, and price; stock remains intact. Browser edit also verified persistence. |
| 4 | Archive and verify visibility/history | Active/archive API filters, browser archive, and retained historical order items verified. |
| 5 | Multi-item order | Frontend services and Chrome create orders with multiple real products. |
| 6 | Inventory deduction | Exact persisted stock balances checked after order creation. |
| 7 | Insufficient stock | Real 422 rejection; no partial deduction or extra order. Existing backend suite also verifies rollback. |
| 8 | Confirm order | API and Chrome transition Pending → Confirmed. |
| 9 | Complete order | API and Chrome transition Confirmed → Completed; history and terminal rules verified. |
| 10 | Cancel eligible order | API and Chrome cancel eligible orders; backend tests cover Pending and Confirmed paths. |
| 11 | Restore exactly once | Repeated cancellation does not add another restoration; balances and reversal movement counts checked. |
| 12 | Manual stock adjustment | Positive adjustment in Chrome; negative adjustment in integration tests; backend tests cover both directions. |
| 13 | Movement history | Real movement rows, types, before/after balances, and order references verified. |
| 14 | Dashboard consistency | API aggregates and 7/30-day trends checked against persisted completed-order totals; Chrome chart and INR revenue verified. |
| 15 | Network and validation errors | Transport/HTTP/contract/abort tests, real 400/409/422 responses, and browser backend-outage check. Failure renders an error, not an empty successful catalog. |
| 16 | Mutation retry consistency | Replayed orders/adjustments and 409 conflicts tested. A real order is committed, its response deliberately lost in the test harness, then retried via the mutation hook with the same key; only one deduction/order occurs. |

Chrome checks also verify empty startup, first-category creation, disabled SKU/stock edits, terminal actions, historical items after archive, and all four pages at 390px. The stronger viewport check verifies actual content bounds, not only the browser's expanded mobile layout width. A mobile screenshot was visually inspected.

## Database and runtime-data audit

Automated write tests create only isolated in-memory or temporary SQLite databases. The full-stack and browser harnesses inject those databases before handling requests, close them, and remove their temporary directories and browser profiles. They never run the development seed script. Synthetic records exist only in test fixtures and never enter runtime imports or the development database.

The full-stack and browser suites compare the development database file SHA-256 before and after testing. Its observed digest remained:

`2035830ac539fee26c0fcab768f9cce84d16683d46955635cc05c8b1dbfe6a37`

No runtime mock service, synthetic business records, localStorage business database, random business-record generator, fake success, fallback statistics, or artificial Promise data response is used. Existing seed tooling was left intact for explicit manual use; it is not invoked by startup or integration code.

## Local startup

Dependencies were already installed. From two terminals, run:

```bash
cd /home/lucifer/Desktop/interview/server
npm run dev
```

```bash
cd /home/lucifer/Desktop/interview/client
npm run dev
```

Open `http://127.0.0.1:5173`. The backend's verified host/port are `127.0.0.1:3000`. Its existing DB path/configuration remains intact. No seed command is required, including on an empty database.

The frontend `.env` and `.env.example` contain only public/local configuration:

```dotenv
VITE_API_BASE_URL=/api
API_PROXY_TARGET=http://127.0.0.1:3000
```

Vite forwards `/api` to the backend for development and preview. `API_PROXY_TARGET` is read only by Vite configuration and is not exposed as a browser environment variable. The existing backend CORS allowlist is preserved; same-origin browser calls go through the loopback Vite proxy. Both applications bind to loopback. There is no public deployment or new public administrative access.

For the production bundle locally:

```bash
cd /home/lucifer/Desktop/interview/client
npm run build
npm run preview
```

Browser verification requires Chrome at `/usr/bin/google-chrome` or a `CHROME_BIN` override. `BROWSER_SCREENSHOT_PATH` optionally saves its screenshot outside the automatically cleaned test directory. Full diagnostics from this session were written under `/tmp/retailops-*.log`; these are verification artifacts, not implementation copies.

## Remaining limitations

No required workflow remains unverified in the specified local stack. Lint warnings and the production bundle-size warning remain as described above. Chrome was checked at desktop and mobile sizes; other browser engines were not tested.

Idempotency keys are retained for retries while their dialog remains mounted. Automatic recovery of an unresolved submission after a hard tab reload is not implemented; reconcile order/movement history before submitting a new logical operation after a reload. The UI locks unresolved stock POSTs for safe same-key retry during the active dialog.

This application retains the existing local, unauthenticated backend architecture. A deployed static bundle would need its host to route `/api` to Express (or an explicit API base URL); no deployment configuration was introduced.

## Files created/modified

The following list includes all tracked changes and untracked new files in the original repository. `.env` contains no credentials. Changes are not staged or committed.

- `BACKEND_HANDOFF.md`
- `FRONTEND_HANDOFF.md`
- `INTEGRATION_REPORT.md`
- `client/.env`
- `client/.env.example`
- `client/FRONTEND_HANDOFF.md`
- `client/package.json`
- `client/src/components/inventory/stock-adjustment-dialog.tsx`
- `client/src/components/layout/app-header.tsx`
- `client/src/components/layout/app-layout.tsx`
- `client/src/components/layout/app-sidebar.tsx`
- `client/src/components/orders/create-order-dialog.tsx`
- `client/src/components/orders/order-detail-dialog.tsx`
- `client/src/components/products/product-form-dialog.tsx`
- `client/src/components/shared/data-table-pagination.tsx`
- `client/src/hooks/use-data-state.test.ts`
- `client/src/hooks/use-data-state.ts`
- `client/src/hooks/use-mutation.test.ts`
- `client/src/hooks/use-mutation.ts`
- `client/src/lib/api-client.test.ts`
- `client/src/lib/api-client.ts`
- `client/src/lib/api-schemas.ts`
- `client/src/lib/constants.ts`
- `client/src/lib/currency.test.ts`
- `client/src/lib/currency.ts`
- `client/src/lib/data-events.ts`
- `client/src/lib/idempotency.ts`
- `client/src/lib/status.ts`
- `client/src/lib/validators.test.ts`
- `client/src/lib/validators.ts`
- `client/src/pages/dashboard-page.tsx`
- `client/src/pages/inventory-page.tsx`
- `client/src/pages/orders-page.tsx`
- `client/src/pages/products-page.tsx`
- `client/src/services/category.service.ts`
- `client/src/services/dashboard.service.ts`
- `client/src/services/inventory.service.ts`
- `client/src/services/order.service.ts`
- `client/src/services/product.service.ts`
- `client/src/types/api.ts`
- `client/src/types/category.ts`
- `client/src/types/dashboard.ts`
- `client/src/types/inventory.ts`
- `client/src/types/order.ts`
- `client/src/types/product.ts`
- `client/tests/browser-check.mjs`
- `client/tests/live-stack.test.mjs`
- `client/vite.config.ts`
- `client/vitest.config.ts`
- `server/BACKEND_HANDOFF.md`
- `server/src/controllers/category.controller.js`
- `server/src/repositories/category.repository.js`
- `server/src/repositories/inventory.repository.js`
- `server/src/repositories/product.repository.js`
- `server/src/routes/category.routes.js`
- `server/src/schemas/product.schema.js`
- `server/src/services/category.service.js`
- `server/src/services/product.service.js`

## Final git status --short

```text
 M BACKEND_HANDOFF.md
 M FRONTEND_HANDOFF.md
 M client/.env
 M client/.env.example
 M client/FRONTEND_HANDOFF.md
 M client/package.json
 M client/src/components/inventory/stock-adjustment-dialog.tsx
 M client/src/components/layout/app-header.tsx
 M client/src/components/layout/app-layout.tsx
 M client/src/components/layout/app-sidebar.tsx
 M client/src/components/orders/create-order-dialog.tsx
 M client/src/components/orders/order-detail-dialog.tsx
 M client/src/components/products/product-form-dialog.tsx
 M client/src/components/shared/data-table-pagination.tsx
 M client/src/hooks/use-data-state.test.ts
 M client/src/hooks/use-data-state.ts
 M client/src/lib/api-client.ts
 M client/src/lib/constants.ts
 M client/src/lib/currency.test.ts
 M client/src/lib/currency.ts
 M client/src/lib/idempotency.ts
 M client/src/lib/status.ts
 M client/src/lib/validators.test.ts
 M client/src/lib/validators.ts
 M client/src/pages/dashboard-page.tsx
 M client/src/pages/inventory-page.tsx
 M client/src/pages/orders-page.tsx
 M client/src/pages/products-page.tsx
 M client/src/services/category.service.ts
 M client/src/services/dashboard.service.ts
 M client/src/services/inventory.service.ts
 M client/src/services/order.service.ts
 M client/src/services/product.service.ts
 M client/src/types/api.ts
 M client/src/types/category.ts
 M client/src/types/dashboard.ts
 M client/src/types/inventory.ts
 M client/src/types/order.ts
 M client/src/types/product.ts
 M client/vite.config.ts
 M client/vitest.config.ts
 M server/BACKEND_HANDOFF.md
 M server/src/controllers/category.controller.js
 M server/src/repositories/category.repository.js
 M server/src/repositories/inventory.repository.js
 M server/src/repositories/product.repository.js
 M server/src/routes/category.routes.js
 M server/src/schemas/product.schema.js
 M server/src/services/category.service.js
 M server/src/services/product.service.js
?? INTEGRATION_REPORT.md
?? client/src/hooks/use-mutation.test.ts
?? client/src/hooks/use-mutation.ts
?? client/src/lib/api-client.test.ts
?? client/src/lib/api-schemas.ts
?? client/src/lib/data-events.ts
?? client/tests/
```

## Final git diff --stat

This is the actual command output for tracked modifications. Git does not include untracked new files (including this report, new schemas/hooks/tests) in ordinary `git diff --stat`; they are included in the file list and status above.

```text
 BACKEND_HANDOFF.md                                 |   2 +
 FRONTEND_HANDOFF.md                                |   2 +
 client/.env                                        |   6 +-
 client/.env.example                                |   6 +-
 client/FRONTEND_HANDOFF.md                         |   2 +
 client/package.json                                |   4 +-
 .../inventory/stock-adjustment-dialog.tsx          |  66 ++++---
 client/src/components/layout/app-header.tsx        |  15 +-
 client/src/components/layout/app-layout.tsx        |   2 +-
 client/src/components/layout/app-sidebar.tsx       |   8 +-
 .../src/components/orders/create-order-dialog.tsx  | 134 +++++---------
 .../src/components/orders/order-detail-dialog.tsx  | 200 ++++++++++-----------
 .../components/products/product-form-dialog.tsx    | 125 +++++++------
 .../components/shared/data-table-pagination.tsx    |   8 +-
 client/src/hooks/use-data-state.test.ts            |  23 +++
 client/src/hooks/use-data-state.ts                 |  76 +++-----
 client/src/lib/api-client.ts                       | 149 ++++++---------
 client/src/lib/constants.ts                        |   2 +-
 client/src/lib/currency.test.ts                    |   8 +-
 client/src/lib/currency.ts                         |  11 +-
 client/src/lib/idempotency.ts                      |  20 +--
 client/src/lib/status.ts                           |   7 +
 client/src/lib/validators.test.ts                  |  25 ++-
 client/src/lib/validators.ts                       | 117 ++----------
 client/src/pages/dashboard-page.tsx                |  80 +++------
 client/src/pages/inventory-page.tsx                | 102 +++++------
 client/src/pages/orders-page.tsx                   |  56 +++---
 client/src/pages/products-page.tsx                 |  95 +++++-----
 client/src/services/category.service.ts            |  30 +---
 client/src/services/dashboard.service.ts           |  41 ++---
 client/src/services/inventory.service.ts           |  58 +-----
 client/src/services/order.service.ts               |  64 ++-----
 client/src/services/product.service.ts             |  74 +++-----
 client/src/types/api.ts                            |   4 +-
 client/src/types/category.ts                       |  14 +-
 client/src/types/dashboard.ts                      |  34 +---
 client/src/types/inventory.ts                      |  36 ++--
 client/src/types/order.ts                          |  32 +---
 client/src/types/product.ts                        |  28 +--
 client/vite.config.ts                              |  31 +++-
 client/vitest.config.ts                            |  14 +-
 server/BACKEND_HANDOFF.md                          |   2 +
 server/src/controllers/category.controller.js      |   8 +
 server/src/repositories/category.repository.js     |   5 +
 server/src/repositories/inventory.repository.js    |   5 +-
 server/src/repositories/product.repository.js      |   5 +
 server/src/routes/category.routes.js               |   8 +-
 server/src/schemas/product.schema.js               |   1 +
 server/src/services/category.service.js            |   4 +
 server/src/services/product.service.js             |   1 +
 50 files changed, 756 insertions(+), 1094 deletions(-)
```
