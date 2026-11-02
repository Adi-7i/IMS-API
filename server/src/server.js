// @ts-check
import 'dotenv/config';
import http   from 'node:http';
import app    from './app.js';
import config from './config/index.js';
import { getDb, closeDb } from './db/connection.js';
import { runMigrations }  from './db/migrate.js';

// ── Boot sequence ──────────────────────────────────────────────────────────
async function start() {
  // 1. Run migrations (idempotent — safe on every start)
  const db = getDb();
  runMigrations(db);
  console.log(JSON.stringify({ level: 'info', message: 'Database migrations applied', timestamp: new Date().toISOString() }));

  // 2. Start HTTP server
  const server = http.createServer(app);

  server.listen(config.port, config.host, () => {
    console.log(JSON.stringify({
      level: 'info',
      message: `RetailOps Lite API running`,
      host: config.host,
      port: config.port,
      env: config.nodeEnv,
      timestamp: new Date().toISOString(),
    }));
  });

  // ── Graceful Shutdown ────────────────────────────────────────────────────
  const shutdown = (/** @type {string} */ signal) => {
    console.log(JSON.stringify({ level: 'info', message: `${signal} received — shutting down`, timestamp: new Date().toISOString() }));

    server.close(() => {
      closeDb();
      console.log(JSON.stringify({ level: 'info', message: 'Server and database closed cleanly', timestamp: new Date().toISOString() }));
      process.exit(0);
    });

    // Force exit if shutdown takes too long
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    console.error(JSON.stringify({ level: 'fatal', message: 'Uncaught exception', error: err.message, stack: err.stack }));
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    console.error(JSON.stringify({ level: 'fatal', message: 'Unhandled rejection', reason: String(reason) }));
    process.exit(1);
  });
}

start();
