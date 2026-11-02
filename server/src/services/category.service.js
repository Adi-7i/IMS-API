// @ts-check
import { makeCategoryRepository } from '../repositories/category.repository.js';
import { getDb } from '../db/connection.js';

/**
 * Category service.
 * @param {import('better-sqlite3').Database} [dbOverride]
 */
export function makeCategoryService(dbOverride) {
  const db   = dbOverride ?? getDb();
  const repo = makeCategoryRepository(db);

  return {
    listCategories() {
      return repo.findAll();
    },
  };
}
