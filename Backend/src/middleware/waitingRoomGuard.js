const waitingRoomService = require('../modules/bookings/waitingRoomService');

/**
 * Middleware that guards hold and checkout endpoints during traffic surges.
 * If active users on a showtime exceed the configured limit, requests require an admission token.
 */
async function waitingRoomGuard(req, res, next) {
  try {
    const showtimeId = req.body.showtimeId || req.params.showtimeId || req.query.showtimeId;
    if (!showtimeId) return next();

    const userId = req.user ? (req.user.sub || req.user.id) : null;
    const token = req.headers['x-waiting-room-token'] || req.body.waitingRoomToken || req.query.waitingRoomToken;

    // Check if showtime is currently under surge
    const isSurge = await waitingRoomService.isSurgeActive(showtimeId);

    if (!isSurge) {
      // Normal traffic: proceed without waiting room
      return next();
    }

    // Showtime is surging: verify token
    const isValid = await waitingRoomService.verifyToken({ token, showtimeId, userId });

    if (isValid) {
      return next();
    }

    // Not admitted yet: instruct client to enter waiting room
    const queueStatus = await waitingRoomService.getQueueStatus({ showtimeId, userId: userId || 'anonymous' });

    return res.status(429).json({
      error: {
        code: 'WAITING_ROOM_REQUIRED',
        message: 'This showtime is currently experiencing very high demand. You have been placed in the waiting room.',
        waitingRoom: queueStatus
      }
    });
  } catch (err) {
    console.warn('[WaitingRoomGuard Warning]:', err.message);
    next();
  }
}

module.exports = waitingRoomGuard;
