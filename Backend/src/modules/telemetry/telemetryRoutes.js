const express = require('express');
const router = express.Router();
const { logger } = require('../../config/logger');

/**
 * In-memory ring buffer for recent error telemetry (and persistence/Sentry forwarder hook)
 */
const recentErrors = [];
const MAX_ERRORS_STORED = 200;

/**
 * POST /api/v1/telemetry/errors
 * Ingestion endpoint for client-side and internal error tracking.
 */
router.post('/errors', (req, res) => {
  const {
    errorName,
    message,
    stack,
    componentStack,
    deviceInfo,
    path,
    requestId = req.id,
    userId
  } = req.body;

  const errorEntry = {
    id: `ERR_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    requestId,
    userId: userId || req.user?.sub || 'anonymous',
    path: path || 'client_unknown',
    errorName: errorName || 'ClientError',
    message: message || 'Unknown error occurred',
    stack: stack || null,
    componentStack: componentStack || null,
    deviceInfo: deviceInfo || null
  };

  logger.error(`[Client Telemetry Error] [User: ${errorEntry.userId}] [Path: ${errorEntry.path}]: ${errorEntry.message}`, {
    requestId,
    error: errorEntry.stack
  });

  recentErrors.unshift(errorEntry);
  if (recentErrors.length > MAX_ERRORS_STORED) {
    recentErrors.pop();
  }

  res.status(202).json({
    status: 'accepted',
    errorId: errorEntry.id
  });
});

/**
 * GET /api/v1/telemetry/errors
 * Operational endpoint to inspect recent tracked errors (for ops/dashboard).
 */
router.get('/errors', (req, res) => {
  res.status(200).json({
    status: 'success',
    count: recentErrors.length,
    data: recentErrors
  });
});

module.exports = router;
module.exports.trackServerError = function trackServerError(err, req) {
  const errorEntry = {
    id: `ERR_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    requestId: req?.id || 'server_internal',
    userId: req?.user?.sub || 'anonymous',
    path: req?.originalUrl || 'internal',
    errorName: err.name || 'ServerError',
    message: err.message,
    stack: err.stack
  };

  recentErrors.unshift(errorEntry);
  if (recentErrors.length > MAX_ERRORS_STORED) {
    recentErrors.pop();
  }
};
