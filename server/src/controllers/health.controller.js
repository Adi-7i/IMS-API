// @ts-check
import { successResponse } from '../utils/response.js';

/**
 * GET /api/health
 * @type {import('express').RequestHandler}
 */
export function getHealth(req, res) {
  res.status(200).json(
    successResponse(
      {
        status: 'ok',
        // @ts-ignore
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      },
      'Service is healthy'
    )
  );
}
