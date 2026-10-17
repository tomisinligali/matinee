const express = require('express');
const prisma = require('../../config/db');

const router = express.Router();

router.get('/health', async (req, res) => {
  try {
    // Quick DB connectivity ping
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'matinee-backend',
      database: 'connected'
    });
  } catch (err) {
    res.status(503).json({
      status: 'DOWN',
      timestamp: new Date().toISOString(),
      service: 'matinee-backend',
      database: 'disconnected',
      error: 'Database connection failed'
    });
  }
});

module.exports = router;
