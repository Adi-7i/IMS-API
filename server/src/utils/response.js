// @ts-check
/**
 * Standardised API response helpers.
 *
 * @module utils/response
 */

/**
 * @typedef {Object} SuccessResponse
 * @property {true}    success
 * @property {unknown} data
 * @property {string}  message
 */

/**
 * @typedef {Object} ErrorDetail
 * @property {string} code
 * @property {string} message
 * @property {unknown[]} [details]
 */

/**
 * @typedef {Object} ErrorResponse
 * @property {false}       success
 * @property {ErrorDetail} error
 */

/**
 * @typedef {Object} PaginationMeta
 * @property {number} page
 * @property {number} limit
 * @property {number} total
 * @property {number} totalPages
 * @property {boolean} hasNext
 * @property {boolean} hasPrev
 */

/**
 * @typedef {Object} PaginatedResponse
 * @property {true}           success
 * @property {unknown[]}      data
 * @property {string}         message
 * @property {PaginationMeta} pagination
 */

/**
 * Builds a success response object.
 * @param {unknown} data
 * @param {string}  [message]
 * @returns {SuccessResponse}
 */
export function successResponse(data, message = 'Success') {
  return { success: /** @type {true} */ (true), data, message };
}

/**
 * Builds an error response object.
 * @param {string}   code
 * @param {string}   message
 * @param {unknown[]} [details]
 * @returns {ErrorResponse}
 */
export function errorResponse(code, message, details = []) {
  return {
    success: /** @type {false} */ (false),
    error: { code, message, details },
  };
}

/**
 * Builds a paginated response object.
 * @param {unknown[]}      data
 * @param {PaginationMeta} pagination
 * @param {string}         [message]
 * @returns {PaginatedResponse}
 */
export function paginatedResponse(data, pagination, message = 'Success') {
  return { success: /** @type {true} */ (true), data, message, pagination };
}
