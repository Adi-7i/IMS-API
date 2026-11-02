// @ts-check
/**
 * Custom application error classes.
 * These map to specific HTTP status codes via the error handler middleware.
 */

export class AppError extends Error {
  /**
   * @param {string} message   - Human-readable message.
   * @param {number} status    - HTTP status code.
   * @param {string} code      - Machine-readable error code.
   * @param {unknown[]} [details] - Optional validation details.
   */
  constructor(message, status, code, details = []) {
    super(message);
    this.name = 'AppError';
    /** @type {number} */
    this.status = status;
    /** @type {string} */
    this.code = code;
    /** @type {unknown[]} */
    this.details = details;
  }
}

export class NotFoundError extends AppError {
  /** @param {string} [message] */
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  /**
   * @param {string}   [message]
   * @param {unknown[]} [details]
   */
  constructor(message = 'Validation failed', details = []) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class ConflictError extends AppError {
  /** @param {string} [message] */
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

export class UnprocessableError extends AppError {
  /**
   * @param {string}   [message]
   * @param {string}   [code]
   * @param {unknown[]} [details]
   */
  constructor(message = 'Unprocessable request', code = 'UNPROCESSABLE', details = []) {
    super(message, 422, code, details);
  }
}

export class BadRequestError extends AppError {
  /**
   * @param {string}   [message]
   * @param {string}   [code]
   */
  constructor(message = 'Bad request', code = 'BAD_REQUEST') {
    super(message, 400, code);
  }
}
