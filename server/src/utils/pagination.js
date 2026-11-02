// @ts-check
/**
 * Pagination utilities.
 * @module utils/pagination
 */

/**
 * Parses page and limit from query parameters and returns safe values.
 *
 * @param {Record<string, unknown>} query
 * @param {{ maxLimit?: number }} [opts]
 * @returns {{ page: number, limit: number, offset: number }}
 */
export function parsePagination(query, opts = {}) {
  const maxLimit = opts.maxLimit ?? 100;

  const page  = Math.max(1, parseInt(String(query.page  ?? '1'),  10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(String(query.limit ?? '20'), 10) || 20));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Builds pagination metadata for paginated responses.
 *
 * @param {{ page: number, limit: number, total: number }} params
 * @returns {import('./response.js').PaginationMeta}
 */
export function buildPaginationMeta({ page, limit, total }) {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages: totalPages || 1,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}
