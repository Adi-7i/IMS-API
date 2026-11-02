# RetailOps Lite — Frontend Application

Modern, responsive SaaS operations dashboard for **RetailOps Lite — Smart Inventory & Order Management System**.

Built for Phase 2 frontend engineering, adhering strictly to **zero synthetic/mock data** policies and full Phase 3 integration readiness.

---

## 🛠 Tech Stack

- **Framework**: React 19 + TypeScript (Strict mode) + Vite
- **Routing**: React Router v7
- **Styling**: Tailwind CSS v4 + Radix UI Primitives + shadcn/ui
- **Icons**: Lucide React
- **Data Visualization**: Recharts (AreaChart with dual-axis / custom tooltips)
- **Validation**: Zod (v4 compatible schemas)
- **State & Notification**: Sonner toasts + custom `useDataState` hook
- **Testing**: Vitest + React Testing Library + Jest DOM matchers

---

## 🚀 Getting Started

### Prerequisites

- Node.js `v20.x` or higher (verified on Node `v24.21.0`)
- npm `v10.x` or higher

### Installation

```bash
cd client
npm install
```

### Environment Configuration

Copy the example environment configuration:

```bash
cp .env.example .env
```

Default contents:
```env
# Backend API Base URL
VITE_API_BASE_URL=http://127.0.0.1:3000/api
```

### Running Locally

```bash
# Start Vite development server
npm run dev

# Run type checker
npm run typecheck

# Build for production
npm run build

# Run unit & component tests
npm test

# Run linter
npm run lint
```

---

## 📁 Project Architecture

```
client/
├── src/
│   ├── components/
│   │   ├── layout/               # Shell layout, sidebar, header, mobile navigation
│   │   │   ├── app-header.tsx
│   │   │   ├── app-layout.tsx
│   │   │   ├── app-sidebar.tsx
│   │   │   └── mobile-nav.tsx
│   │   ├── shared/               # Reusable UI states and widgets
│   │   │   ├── confirm-dialog.tsx
│   │   │   ├── data-table-pagination.tsx
│   │   │   ├── disconnected-state.tsx
│   │   │   ├── empty-state.tsx
│   │   │   ├── error-state.tsx
│   │   │   ├── kpi-card.tsx
│   │   │   ├── loading-skeleton.tsx
│   │   │   ├── page-header.tsx
│   │   │   └── status-badge.tsx
│   │   ├── products/             # Product catalog dialogs and components
│   │   │   └── product-form-dialog.tsx
│   │   ├── orders/               # Order creation and details dialogs
│   │   │   ├── create-order-dialog.tsx
│   │   │   └── order-detail-dialog.tsx
│   │   ├── inventory/            # Inventory adjustment modals
│   │   │   └── stock-adjustment-dialog.tsx
│   │   └── ui/                   # shadcn / Radix primitives (Button, Table, Card, Dialog, etc.)
│   ├── hooks/
│   │   ├── use-data-state.ts     # Core hook managing disconnected, loading, empty, error, and success
│   │   └── use-pagination.ts     # Pagination state management
│   ├── lib/
│   │   ├── api-client.ts         # Typed fetch client with NotConnectedError & Idempotency-Key
│   │   ├── cn.ts / utils.ts      # Classnames utility (clsx + tailwind-merge)
│   │   ├── constants.ts          # App configuration, navigation routes, base URLs
│   │   ├── currency.ts           # Integer paise <-> Rupee conversions and formatting
│   │   ├── date.ts               # Localized date and relative time formatting
│   │   ├── idempotency.ts        # UUIDv4 generator for safe mutations
│   │   ├── status.ts             # Order state machine rules & movement styling
│   │   └── validators.ts         # Zod schemas for products, orders, and adjustments
│   ├── pages/                    # 4 Core Route Pages
│   │   ├── dashboard-page.tsx    # KPIs, sales trend chart, recent orders, stock alerts
│   │   ├── products-page.tsx     # Catalog table, category/status filters, sorting, add/edit/archive
│   │   ├── orders-page.tsx       # Orders table, status tabs, order detail, creation flow
│   │   ├── inventory-page.tsx    # Low-stock alerts, movement audit trail, stock adjustment
│   │   └── not-found-page.tsx    # 404 handler
│   ├── router/
│   │   └── index.tsx             # React Router route tree
│   ├── services/                 # Service layer wrapping API endpoints
│   │   ├── category.service.ts
│   │   ├── dashboard.service.ts
│   │   ├── inventory.service.ts
│   │   ├── order.service.ts
│   │   └── product.service.ts
│   └── types/                    # Strict TypeScript interfaces mirroring backend contracts
│       ├── api.ts
│       ├── category.ts
│       ├── dashboard.ts
│       ├── inventory.ts
│       ├── order.ts
│       └── product.ts
├── package.json
├── tsconfig.app.json
├── vite.config.ts
└── vitest.config.ts
```

---

## 🔒 Phase 2 Architecture Principles

1. **Zero Synthetic / Mock Data**: No fake products, fake orders, random chart points, or dummy localStorage databases are generated.
2. **5 Distinct UI States**:
   - `disconnected`: The API service throws `NotConnectedError`. The UI renders honest, elegant "Integration Pending" badges highlighting the target backend contract.
   - `loading`: Visual skeleton animations render during pending operations.
   - `empty`: Clean zero-state illustrations appear when an empty array is legitimately returned.
   - `error`: Network or server exceptions are surfaced with retry actions.
   - `success`: Live backend records are displayed.
3. **Monetary Integrity**: All financial values are strictly represented in integer **paise** (`₹1.00 = 100 paise`), preventing IEEE 754 floating-point calculation errors.
4. **State Machine Strictness**: Order workflow transitions follow the backend state machine (`Pending -> Confirmed/Cancelled`, `Confirmed -> Completed/Cancelled`). Terminal states prevent invalid mutations.
5. **Mutation Safety**: Mutation buttons are honestly disabled in Phase 2 with informative tooltips indicating that live mutations activate in Phase 3.
