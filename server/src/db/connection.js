// @ts-check
import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import config from '../config/index.js';

/** @type {Database.Database | null} */
let _db = null;

/**
 * Returns the singleton SQLite database connection.
 * Enables WAL mode and foreign key enforcement on first open.
 *
 * @param {string} [dbPath] - Override path (used in tests for isolated DBs).
 * @returns {Database.Database}
 */
export function getDb(dbPath) {
  if (_db) return _db;

  const resolvedPath = dbPath ?? config.dbPath;

  // Ensure the directory exists
  const dir = path.dirname(path.resolve(resolvedPath));
  fs.mkdirSync(dir, { recursive: true });

  _db = new Database(resolvedPath);

  // Performance & reliability settings
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  _db.pragma('synchronous = NORMAL');
  _db.pragma('cache_size = -32000'); // 32MB cache
  _db.pragma('temp_store = MEMORY');

  return _db;
}

/**
 * Closes the current database connection and resets the singleton.
 * Used primarily in tests.
 */
export function closeDb() {
  if (_db) {
    _db.close();
    _db = null;
  }
}

/**
 * Resets the singleton so a new path can be used.
 * Used in tests to get isolated databases.
 */
export function resetDb() {
  _db = null;
}

/**
 * Sets the active database instance (used in tests to inject in-memory DBs).
 * @param {Database.Database | null} db
 */
export function setDb(db) {
  _db = db;
}
