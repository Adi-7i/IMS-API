// @ts-check
import 'dotenv/config';

/**
 * @typedef {Object} Config
 * @property {number} port
 * @property {string} host
 * @property {string} nodeEnv
 * @property {string} dbPath
 * @property {string[]} corsOrigins
 * @property {number} defaultLowStockThreshold
 */

/** @type {Config} */
const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  host: process.env.HOST ?? '127.0.0.1',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  dbPath: process.env.DB_PATH ?? './data/retailops.db',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(',').map((o) => o.trim()),
  defaultLowStockThreshold: parseInt(process.env.DEFAULT_LOW_STOCK_THRESHOLD ?? '5', 10),
};

export default config;
