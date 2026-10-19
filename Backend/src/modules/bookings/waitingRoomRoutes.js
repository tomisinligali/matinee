const express = require('express');
const router = express.Router();
const waitingRoomService = require('./waitingRoomService');
const { requireAuth } = require('../../middleware/auth');

/**
 * POST /api/v1/waiting-room/join
 * Join or enter waiting room for a high-demand showtime.
 */
router.post('/join', requireAuth, async (req, res, next) => {
  try {
    const { showtimeId } = req.body;
    const userId = req.user.sub || req.user.id;

    if (!showtimeId) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'showtimeId is required' }
      });
    }

    const result = await waitingRoomService.joinQueue({ showtimeId, userId });

    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/waiting-room/status
 * Check current queue position or check if admitted.
 */
router.get('/status', requireAuth, async (req, res, next) => {
  try {
    const { showtimeId } = req.query;
    const userId = req.user.sub || req.user.id;

    if (!showtimeId) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'showtimeId query param is required' }
      });
    }

    const result = await waitingRoomService.getQueueStatus({ showtimeId, userId });

    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
