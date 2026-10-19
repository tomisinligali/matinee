const express = require('express');
const cors = require('cors');

const healthRoutes = require('./modules/health/health.routes');
const identityRoutes = require('./modules/identity/identity.routes');
const movieRoutes = require('./modules/movies/movie.routes');
const paymentRoutes = require('./modules/payments/paymentRoutes');
const showtimeRoutes = require('./modules/showtimes/showtimeRoutes');
const waitingRoomRoutes = require('./modules/bookings/waitingRoomRoutes');
const telemetryRoutes = require('./modules/telemetry/telemetryRoutes');
const { trackServerError } = require('./modules/telemetry/telemetryRoutes');
const { requireAuth } = require('./middleware/auth');
const { requestIdMiddleware, logger } = require('./config/logger');
const readYourOwnWritesMiddleware = require('./middleware/readYourOwnWrites');

const app = express();

// 1. Request ID Tracking & Structured Request Logging Middleware
app.use(requestIdMiddleware);

// 2. CORS configuration with traffic management and RYOW headers
app.use(cors({
  origin: '*', // Allows Expo mobile client across LAN
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Idempotency-Key',
    'X-Waiting-Room-Token',
    'X-Request-Id',
    'X-Force-Primary',
    'X-Matinee-Write-Timestamp'
  ],
  exposedHeaders: [
    'X-Request-Id',
    'X-Database-Route',
    'X-Matinee-Write-Timestamp',
    'Retry-After'
  ]
}));

app.use(express.json());

// 3. Read-Your-Own-Writes Consistency & Routing Middleware
app.use(readYourOwnWritesMiddleware);

// 4. API Routes
app.use('/', healthRoutes);
app.use('/api/v1/auth', identityRoutes);
app.use('/api/v1/movies', movieRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1', paymentRoutes); // Supports /api/v1/bookings/... endpoints
app.use('/api/v1/showtimes', showtimeRoutes);
app.use('/api/v1/waiting-room', waitingRoomRoutes);
app.use('/api/v1/telemetry', telemetryRoutes);

// Protected dashboard route for mobile client
app.get('/api/v1/dashboard', requireAuth, (req, res) => {
  res.status(200).json({
    message: 'Welcome to Matinee Dashboard',
    authenticatedUser: {
      id: req.user.sub,
      email: req.user.email,
      role: req.user.role
    },
    systemStatus: 'Operational',
    requestId: req.id,
    timestamp: new Date().toISOString()
  });
});

// 404 Not Found Handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`,
      requestId: req.id
    }
  });
});

// Centralized Error Handler with Observability & Error Tracking
app.use((err, req, res, next) => {
  const status = err.statusCode || 500;
  const requestId = req.id || 'unknown';

  // Log and record server errors in telemetry
  if (status >= 500) {
    logger.error(`[Server Error 5xx]: ${err.message}`, {
      requestId,
      error: err.stack,
      path: req.originalUrl
    });
    trackServerError(err, req);
  } else if (status >= 400) {
    logger.warn(`[Client Error ${status}]: ${err.message}`, {
      requestId,
      path: req.originalUrl
    });
  }

  const retryAfter = err.retryAfter || (status === 429 ? 15 : status === 503 ? 5 : undefined);
  if (retryAfter) {
    res.setHeader('Retry-After', retryAfter);
  }

  res.status(status).json({
    error: {
      code: err.code || (status === 409 ? 'CONFLICT' : status === 429 ? 'RATE_LIMIT_EXCEEDED' : status === 503 ? 'SERVER_OVERLOADED' : status === 400 ? 'BAD_REQUEST' : status === 404 ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR'),
      message: err.message || (status === 503 ? 'The server is experiencing heavy surge traffic. Please tap Retry.' : 'An unexpected error occurred. Please try again.'),
      requestId,
      ...(retryAfter ? { retryAfter } : {})
    }
  });
});

module.exports = app;
