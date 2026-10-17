const express = require('express');
const cors = require('cors');

const healthRoutes = require('./modules/health/health.routes');
const identityRoutes = require('./modules/identity/identity.routes');
const { requireAuth } = require('./middleware/auth');

const app = express();

// Security & Parsing Middleware
app.use(cors({
  origin: '*', // Allows Expo mobile client across LAN
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key']
}));
app.use(express.json());

// Routes
app.use('/', healthRoutes);
app.use('/api/v1/auth', identityRoutes);

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
    timestamp: new Date().toISOString()
  });
});

// 404 Not Found Handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`
    }
  });
});

// Centralized Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]:', err.message);
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal server error occurred'
    }
  });
});

module.exports = app;
