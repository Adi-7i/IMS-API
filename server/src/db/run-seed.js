// @ts-check
import 'dotenv/config';
import { getDb } from './connection.js';
import { runMigrations } from './migrate.js';
import { runSeed } from './seed.js';

const db = getDb();
runMigrations(db);
runSeed(db);
console.log('✓ Seed data inserted successfully');
process.exit(0);
