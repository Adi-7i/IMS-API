// @ts-check
import 'dotenv/config';
import { getDb } from './connection.js';
import { runMigrations } from './migrate.js';

const db = getDb();
runMigrations(db);
console.log('✓ Migrations applied successfully');
process.exit(0);
