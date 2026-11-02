// @ts-check
import express     from 'express';
import cors        from 'cors';
import config      from './config/index.js';
import { requestId }     from './middleware/requestId.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler }  from './middleware/errorHandler.js';

import healthRoutes    from './routes/health.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import categoryRoutes  from './routes/category.routes.js';
import productRoutes   from './routes/product.routes.js';
import orderRoutes     from './routes/order.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';

const app = express();

// ── Global Middleware ──────────────────────────────────────────────────────
app.use(cors({
  origin: config.corsOrigins,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Idempotency-Key', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id'],
}));

app.use(express.json({ limit: '1mb' }));
app.use(requestId);
app.use(requestLogger);

// ── API Routes ─────────────────────────────────────────────────────────────
app.use('/api/health',     healthRoutes);
app.use('/api/dashboard',  dashboardRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products',   productRoutes);
app.use('/api/orders',     orderRoutes);
app.use('/api/inventory',  inventoryRoutes);

// ── 404 for unknown routes ─────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code:    'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
      details: [],
    },
  });
});

// ── Central Error Handler ──────────────────────────────────────────────────
app.use(errorHandler);

export default app;
