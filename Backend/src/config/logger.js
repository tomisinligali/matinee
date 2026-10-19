const crypto = require('crypto');

/**
 * Structured Logger for Matinee API
 * Outputs standardized log records with ISO timestamps and request correlation IDs.
 */
function logMessage(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const requestId = meta.requestId || 'system';
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [Req: ${requestId}]`;
  
  if (level === 'error') {
    console.error(`${prefix} ${message}`, meta.error || '');
  } else if (level === 'warn') {
    console.warn(`${prefix} ${message}`);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

const logger = {
  info: (msg, meta) => logMessage('info', msg, meta),
  warn: (msg, meta) => logMessage('warn', msg, meta),
  error: (msg, meta) => logMessage('error', msg, meta)
};

/**
 * Express Middleware: Injects X-Request-Id and attaches request-scoped logger
 */
function requestIdMiddleware(req, res, next) {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);

  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const route = res.getHeader('X-Database-Route') || 'N/A';
    const status = res.statusCode;

    // Structured access log
    const logMethod = status >= 500 ? logger.error : status >= 400 ? logger.warn : logger.info;
    logMethod(`${req.method} ${req.originalUrl || req.url} ${status} - ${duration}ms [DB: ${route}]`, {
      requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: status,
      durationMs: duration,
      dbRoute: route,
      userId: req.user?.sub || 'anonymous'
    });
  });

  next();
}

module.exports = {
  logger,
  requestIdMiddleware
};
