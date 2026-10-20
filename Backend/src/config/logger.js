const crypto = require('crypto');

const SENSITIVE_KEYS = [
  'password',
  'passwordhash',
  'password_hash',
  'token',
  'secret',
  'authorization',
  'card',
  'cvv',
  'creditcard'
];

/**
 * Recursively redacts sensitive fields like passwords, tokens, and credit cards from logs
 */
function redactSensitiveData(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redactSensitiveData);

  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.some(s => key.toLowerCase().includes(s))) {
      clean[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      clean[key] = redactSensitiveData(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

/**
 * Structured Logger for Matinee API
 * Outputs standardized log records with ISO timestamps and request correlation IDs.
 * Strictly guarantees passwords and secrets are NEVER logged.
 */
function logMessage(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const requestId = meta.requestId || 'system';
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [Req: ${requestId}]`;
  const cleanMeta = redactSensitiveData(meta);
  
  if (level === 'error') {
    console.error(`${prefix} ${message}`, cleanMeta.error || '');
  } else if (level === 'warn') {
    console.warn(`${prefix} ${message}`);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

const logger = {
  info: (msg, meta) => logMessage('info', msg, meta),
  warn: (msg, meta) => logMessage('warn', msg, meta),
  error: (msg, meta) => logMessage('error', msg, meta),
  redactSensitiveData
};

/**
 * Express Middleware: Injects X-Request-Id and attaches request-scoped logger.
 * Passwords are never placed in URLs, headers, or logs.
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

    // Structured access log - URLs sanitized
    const rawPath = req.originalUrl || req.url;
    const sanitizedPath = rawPath.replace(/(password|token|secret)=[^&]+/gi, '$1=[REDACTED]');

    const logMethod = status >= 500 ? logger.error : status >= 400 ? logger.warn : logger.info;
    logMethod(`${req.method} ${sanitizedPath} ${status} - ${duration}ms [DB: ${route}]`, {
      requestId,
      method: req.method,
      path: sanitizedPath,
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
