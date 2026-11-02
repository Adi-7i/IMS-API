// @ts-check
/**
 * Structured JSON request logger.
 * Logs method, URL, status, duration, and request ID on each response.
 *
 * @type {import('express').RequestHandler}
 */
export function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const log = {
      timestamp: new Date().toISOString(),
      // @ts-ignore
      requestId: req.requestId,
      method:    req.method,
      url:       req.originalUrl,
      status:    res.statusCode,
      durationMs: Date.now() - start,
      ip: req.ip,
    };
    console.log(JSON.stringify(log));
  });

  next();
}
