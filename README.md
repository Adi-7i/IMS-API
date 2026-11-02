# RetailOps Lite — Backend API

> Smart Inventory & Order Management System for small retail businesses.  
> Production-grade RESTful API built with Node.js, Express.js, and SQLite (`better-sqlite3`).

---

## 1. Overview & Architecture

RetailOps Lite is the backend engine powering inventory tracking, product catalog management, order fulfillment, stock movement auditing, and business performance metrics.

### Key Architecture Decisions:
- **Clean Layered Architecture**: Strict separation of concerns:
  - **Routes**: Request mapping and middleware binding
  - **Controllers**: HTTP serialization and response formatting
  - **Services**: Pure business logic and domain transaction orchestration
  - **Repositories**: Prepared SQLite SQL queries
  - **Database**: Connection singleton (`better-sqlite3`) with WAL mode and foreign key enforcement
- **Transaction Safety**: All stock-changing workflows (order creation, order cancellation, manual stock adjustments) run inside atomic SQLite transactions (`db.transaction(...)`). If stock is insufficient or a constraint fails, the entire transaction rolls back cleanly.
- **Durable Idempotency**: Order creation (`POST /api/orders`) and inventory adjustments (`POST /api/inventory/adjustments`) require an `Idempotency-Key` header. Requests with the same key and identical payload return the cached response without duplicate execution. Payload mismatches for the same key return `409 Conflict`.
- **Immutable Audit Trails**: Stock movements and order status transitions are stored in append-only tables (`stock_movements`, `order_status_history`), preserving historical previous stock, resulting stock, and timestamps.
- **Currency in Integer Paise**: All monetary amounts are stored as integers representing paise (e.g. `₹599.00` = `59900`), preventing floating-point calculation errors.

---

## 2. Technology Stack

- **Runtime**: Node.js (>= v20.0.0, tested on v24.21.0)
- **Framework**: Express.js 4.19.2
- **Database**: SQLite3 via `better-sqlite3` 13.0.3 (WAL mode, Foreign Keys ON)
- **Validation**: Zod 3.23.8
- **Config**: dotenv 16.4.5
- **Security / CORS**: cors 2.8.5 (restricted to configured origins)
- **Type Checking**: TypeScript 5.5.3 (`tsc --noEmit` with `checkJs` & strict mode enabled)
- **Testing**: Node.js built-in test runner (`node --test`) + Supertest 7.0.0
- **Dev Server**: nodemon 3.1.4

---

## 3. Directory Structure

```text
server/
├── .env                  # Local environment configuration
├── .env.example          # Template environment configuration
├── .gitignore            # Git ignore rules (node_modules, data/*.db)
├── jsconfig.json         # Editor path aliases and JS checking rules
├── tsconfig.json         # TypeScript strict type checking config
├── nodemon.json          # Dev server watch configuration
├── package.json          # Package manifest and npm scripts
├── README.md             # Backend setup and architectural documentation
├── BACKEND_HANDOFF.md    # Frontend integration guide & API contracts
├── data/                 # SQLite database storage (git-ignored)
│   └── retailops.db
├── src/
│   ├── app.js            # Express application assembly & middleware chain
│   ├── server.js         # HTTP server entrypoint, graceful shutdown
│   ├── config/
│   │   └── index.js      # Validated environment configuration
│   ├── db/
│   │   ├── connection.js # Singleton SQLite connection & PRAGMAs
│   │   ├── migrate.js    # Schema DDL & index creation
│   │   ├── seed.js       # Realistic sample data seed
│   │   ├── run-migrate.js# CLI runner for db:migrate
│   │   └── run-seed.js   # CLI runner for db:seed
│   ├── routes/
│   │   ├── health.routes.js
│   │   ├── dashboard.routes.js
│   │   ├── category.routes.js
│   │   ├── product.routes.js
│   │   ├── order.routes.js
│   │   └── inventory.routes.js
│   ├── controllers/
│   │   ├── health.controller.js
│   │   ├── dashboard.controller.js
│   │   ├── category.controller.js
│   │   ├── product.controller.js
│   │   ├── order.controller.js
│   │   └── inventory.controller.js
│   ├── services/
│   │   ├── dashboard.service.js
│   │   ├── category.service.js
│   │   ├── product.service.js
│   │   ├── order.service.js
│   │   └── inventory.service.js
│   ├── repositories/
│   │   ├── category.repository.js
│   │   ├── product.repository.js
│   │   ├── order.repository.js
│   │   ├── inventory.repository.js
│   │   └── idempotency.repository.js
│   ├── schemas/
│   │   ├── product.schema.js
│   │   ├── order.schema.js
│   │   └── inventory.schema.js
│   ├── middleware/
│   │   ├── requestId.js      # X-Request-Id UUID generator
│   │   ├── requestLogger.js  # Structured JSON access logging
│   │   ├── validate.js       # Zod schema validation middleware
│   │   ├── idempotency.js    # Idempotency-Key validation & caching
│   │   └── errorHandler.js   # Centralized error handler
│   └── utils/
│       ├── errors.js         # Standard AppError classes
│       ├── response.js       # Standard success/paginated response envelopes
│       ├── pagination.js     # Page/limit calculator & metadata builder
│       ├── hash.js           # SHA-256 payload hashing for idempotency
│       └── orderNumber.js    # Unique human-readable order number generator
└── tests/
    ├── setup.js              # In-memory test DB factory and test harness
    ├── products.test.js      # Products test suite (21 tests)
    ├── orders.test.js        # Orders test suite (20 tests)
    ├── inventory.test.js     # Inventory test suite (17 tests)
    └── dashboard.test.js     # Dashboard test suite (11 tests)
```

---

## 4. Setup & Running

### Prerequisites
- Node.js >= 20.0.0
- npm >= 9.0.0

### Step 1: Install Dependencies
```bash
cd server
npm install
```

### Step 2: Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default configuration:
```env
PORT=5000
HOST=127.0.0.1
NODE_ENV=development
DB_PATH=./data/retailops.db
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Step 3: Run Database Migrations & Seed
```bash
npm run db:migrate
npm run db:seed
```

### Step 4: Run the Development Server
```bash
npm run dev
```
The server will start at `http://127.0.0.1:5000`.

### Step 5: Run Production Server
```bash
npm start
```

---

## 5. Verification & Testing

### Running Automated Test Suite
The test suite runs against isolated in-memory SQLite databases and executes 69 automated integration tests covering all critical paths:
```bash
npm test
```
**Test Results**:
- 69 tests across 4 test suites (`products`, `orders`, `inventory`, `dashboard`).
- 0 failures, 0 skipped, execution time ~1.1s.

### Running Static Type Checks
Type checking validates JSDoc annotations and TypeScript definitions without emitting code:
```bash
npm run typecheck
```
**Typecheck Results**:
- 0 errors found.

---

## 6. Security & Boundaries

1. **Localhost Binding**: Server binds to `127.0.0.1` by default to avoid accidental exposure on local network interfaces.
2. **CORS Restrictions**: Origin whitelist strictly enforced for frontend development origins (`http://localhost:5173`, `http://localhost:3000`).
3. **No Information Leakage**: Internal stack traces are suppressed in non-development environments; SQL error details are sanitized into standard error envelopes.
4. **Input Sanitization**: All endpoint inputs are strictly validated with Zod schemas; non-whitelisted query params and body fields are rejected or stripped.
5. **SQL Injection Prevention**: All queries use parameterized prepared statements (`better-sqlite3`).

---

## 7. Frontend Integration

For complete endpoint contracts, request/response payloads, pagination rules, and error codes, refer to [BACKEND_HANDOFF.md](./BACKEND_HANDOFF.md).
# IMS-API
