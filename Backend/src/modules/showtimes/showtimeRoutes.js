const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { requireAuth } = require('../../middleware/auth');
const bookingService = require('../bookings/bookingService');

/**
 * GET /api/v1/showtimes
 * List scheduled showtimes with movie, cinema, and screen details.
 */
router.get('/', async (req, res, next) => {
  try {
    const showtimes = await prisma.showtime.findMany({
      where: { status: 'SCHEDULED' },
      include: {
        movie: true,
        screen: { include: { cinema: true } }
      },
      orderBy: { startTime: 'asc' }
    });

    res.status(200).json({
      status: 'success',
      data: showtimes.map(s => ({
        id: s.id,
        movieId: s.movieId,
        movieTitle: s.movie.title,
        moviePoster: s.movie.posterPath,
        cinemaName: s.screen.cinema.name,
        cinemaLocation: s.screen.cinema.location,
        screenName: s.screen.name,
        startTime: s.startTime,
        endTime: s.endTime,
        priceMinor: s.priceMinor,
        formattedPrice: `₦${(s.priceMinor / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
        currency: s.currency
      }))
    });
  } catch (err) {
    next(err);
  }
});

const redis = require('../../config/redis');
const redisHoldService = require('../bookings/redisHoldService');

const SCREEN_SEATS_CACHE_TTL = 3600; // 1 hour for screen seat configuration

/**
 * GET /api/v1/showtimes/:id/seats/availability
 * Ultra-fast polling endpoint returning real-time seat availability snapshot.
 */
router.get('/:id/seats/availability', async (req, res, next) => {
  try {
    const showtimeId = req.params.id;
    const now = new Date();

    // 1. Confirmed bookings from PostgreSQL
    const bookedSeats = await prisma.bookingSeat.findMany({
      where: { showtimeId },
      select: { seatId: true }
    });
    const bookedSeatIds = bookedSeats.map(b => b.seatId);

    // 2. Active holds from Redis (in-memory atomic holds)
    const redisHeldSeatIds = await redisHoldService.getActiveHoldSeatIds(showtimeId);

    // 3. Active holds from DB (fallback / persistence)
    const dbHolds = await prisma.seatHold.findMany({
      where: {
        showtimeId,
        status: 'HELD',
        expiresAt: { gt: now }
      },
      select: { seatId: true }
    });
    const dbHeldSeatIds = dbHolds.map(h => h.seatId);

    const allHeldSeatIds = Array.from(new Set([...redisHeldSeatIds, ...dbHeldSeatIds]));

    res.status(200).json({
      status: 'success',
      data: {
        showtimeId,
        bookedSeatIds,
        heldSeatIds: allHeldSeatIds,
        timestamp: now.getTime()
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/showtimes/:id/seats/live
 * Server-Sent Events (SSE) stream for near-real-time seat availability updates.
 */
router.get('/:id/seats/live', async (req, res) => {
  const showtimeId = req.params.id;

  // Set SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // Disable proxy buffering for instant delivery
  });

  res.write(`data: ${JSON.stringify({ event: 'CONNECTED', showtimeId })}\n\n`);

  // Send instantaneous snapshot
  const sendSnapshot = async () => {
    try {
      const now = new Date();
      const bookedSeats = await prisma.bookingSeat.findMany({
        where: { showtimeId },
        select: { seatId: true }
      });
      const redisHeld = await redisHoldService.getActiveHoldSeatIds(showtimeId);
      const dbHolds = await prisma.seatHold.findMany({
        where: { showtimeId, status: 'HELD', expiresAt: { gt: now } },
        select: { seatId: true }
      });
      const heldSeatIds = Array.from(new Set([...redisHeld, ...dbHolds.map(h => h.seatId)]));

      res.write(`data: ${JSON.stringify({
        event: 'AVAILABILITY_UPDATE',
        showtimeId,
        bookedSeatIds: bookedSeats.map(b => b.seatId),
        heldSeatIds,
        timestamp: Date.now()
      })}\n\n`);
    } catch (_) {}
  };

  await sendSnapshot();

  // Send periodic updates every 3 seconds while client remains connected
  const interval = setInterval(sendSnapshot, 3000);

  // Heartbeat ping every 15 seconds to prevent client timeout
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(interval);
    clearInterval(heartbeat);
  });
});

/**
 * GET /api/v1/showtimes/:id/seats
 * Return dynamic seat map inventory for a showtime (300 seats with available, held, sold, wheelchair).
 * Screen physical layout is cached in Redis; dynamic statuses are resolved in real time.
 */
router.get('/:id/seats', async (req, res, next) => {
  try {
    const showtime = await prisma.showtime.findUnique({
      where: { id: req.params.id },
      include: {
        screen: true
      }
    });

    if (!showtime) {
      return res.status(404).json({ error: 'Showtime not found' });
    }

    // 1. Fetch screen seats from Redis cache or database
    const screenCacheKey = `cache:screens:${showtime.screenId}:seats`;
    let rawSeats = null;

    try {
      const cached = await redis.get(screenCacheKey);
      if (cached) {
        rawSeats = JSON.parse(cached);
      }
    } catch (_) {}

    if (!rawSeats) {
      rawSeats = await prisma.seat.findMany({
        where: { screenId: showtime.screenId },
        orderBy: [{ row: 'asc' }, { col: 'asc' }]
      });
      try {
        await redis.set(screenCacheKey, JSON.stringify(rawSeats), 'EX', SCREEN_SEATS_CACHE_TTL);
      } catch (_) {}
    }

    const now = new Date();

    // 2. Get booked seats
    const bookedSeats = await prisma.bookingSeat.findMany({
      where: { showtimeId: showtime.id }
    });
    const bookedSeatIds = new Set(bookedSeats.map(b => b.seatId));

    // 3. Get active holds from Redis & PostgreSQL
    const redisHeld = await redisHoldService.getActiveHoldSeatIds(showtime.id);
    const dbHolds = await prisma.seatHold.findMany({
      where: {
        showtimeId: showtime.id,
        status: 'HELD',
        expiresAt: { gt: now }
      }
    });
    const heldSeatIds = new Set([...redisHeld, ...dbHolds.map(h => h.seatId)]);

    // 4. Map inventory status
    const seats = rawSeats.map(s => {
      let status = 'available';

      if (bookedSeatIds.has(s.id)) {
        status = 'sold';
      } else if (heldSeatIds.has(s.id)) {
        status = 'held';
      } else if (s.seatType === 'WHEELCHAIR') {
        status = 'wheelchair';
      }

      return {
        id: s.id,
        row: s.row,
        col: s.col,
        label: s.seatLabel,
        status,
        priceMinor: showtime.priceMinor,
        currency: showtime.currency
      };
    });

    res.status(200).json({
      status: 'success',
      data: {
        showtimeId: showtime.id,
        screenName: showtime.screen.name,
        capacity: showtime.screen.capacity,
        priceMinor: showtime.priceMinor,
        currency: showtime.currency,
        seats
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/showtimes/:id/cancel
 * Operator action to cancel a showtime and issue automated ledger refunds.
 */
router.post('/:id/cancel', requireAuth, async (req, res, next) => {
  try {
    const operatorId = req.user.sub;
    const showtimeId = req.params.id;

    // Check operator role
    if (req.user.role !== 'CINEMA_OPERATOR' && req.user.role !== 'PLATFORM_ADMIN') {
      return res.status(403).json({ error: 'Only cinema operators and platform admins can cancel showtimes' });
    }

    const result = await bookingService.cancelShowtimeAndRefund({
      showtimeId,
      operatorId
    });

    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
