const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { requireAuth } = require('../../middleware/auth');
const bookingService = require('../bookings/bookingService');
const flutterwaveAdapter = require('./flutterwaveAdapter');
const { holdLimiter, checkoutLimiter } = require('../../middleware/rateLimiter');
const waitingRoomGuard = require('../../middleware/waitingRoomGuard');

/**
 * POST /api/v1/payments/hold
 * Acquire temporary 10-minute seat hold with Redis atomic SET NX EX, rate limiting, and waiting room protection.
 */
router.post('/hold', requireAuth, holdLimiter, waitingRoomGuard, async (req, res, next) => {
  try {
    const { showtimeId, seatIds } = req.body;
    const userId = req.user.sub;

    const holdResult = await bookingService.acquireSeatHold({
      showtimeId,
      seatIds,
      userId
    });

    res.status(200).json({
      status: 'success',
      data: holdResult
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/payments/checkout
 * Initiate checkout with idempotency check, minor units, and server-calculated service fee.
 */
router.post('/checkout', requireAuth, checkoutLimiter, waitingRoomGuard, async (req, res, next) => {
  try {
    const idempotencyKey = req.headers['idempotency-key'] || req.body.idempotencyKey;
    const { showtimeId, seatIds, redirectUrl } = req.body;
    const userId = req.user.sub;

    if (!idempotencyKey) {
      return res.status(400).json({
        error: {
          code: 'IDEMPOTENCY_KEY_REQUIRED',
          message: 'An Idempotency-Key header is required for checkout'
        }
      });
    }

    const checkoutResult = await bookingService.initiateCheckout({
      userId,
      showtimeId,
      seatIds,
      idempotencyKey,
      customer: {
        email: req.user.email,
        name: req.user.name
      },
      redirectUrl
    });

    res.status(201).json({
      status: 'success',
      data: checkoutResult
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/payments/flutterwave/webhook
 * Ingests, authenticates, and deduplicates Flutterwave webhooks.
 * Background worker validates transaction and confirms booking.
 */
router.post('/flutterwave/webhook', async (req, res) => {
  // 1. Authenticate webhook hash using timing-safe comparison
  const isAuthenticated = flutterwaveAdapter.verifyWebhookHash(req.headers);
  if (!isAuthenticated) {
    console.warn('[Webhook Auth Failed]: Rejected invalid or missing verif-hash');
    return res.status(401).json({ error: 'Unauthorized webhook request' });
  }

  const payload = req.body;
  const eventId = String(payload.id || payload.data?.id || `EVT_${Date.now()}`);
  const eventType = payload.event || payload['event.type'] || 'charge.completed';

  try {
    // 2. Persist & deduplicate in database
    const existingEvent = await prisma.webhookEvent.findUnique({
      where: {
        provider_eventId: {
          provider: 'FLUTTERWAVE',
          eventId
        }
      }
    });

    if (existingEvent) {
      // Duplicate event detected: respond 200 OK immediately and skip side-effects
      return res.status(200).json({ status: 'ignored_duplicate' });
    }

    await prisma.webhookEvent.create({
      data: {
        provider: 'FLUTTERWAVE',
        eventId,
        eventType,
        payload: JSON.stringify(payload),
        status: 'PROCESSED'
      }
    });

    // 3. Enqueue durable background job for asynchronous verification & booking confirmation
    const txRef = payload.data?.tx_ref;
    const providerTxId = payload.data?.id;
    const amountMinor = payload.data?.amount ? Math.round(Number(payload.data.amount) * 100) : null;
    const currency = payload.data?.currency || 'NGN';

    if (txRef && providerTxId) {
      const { enqueueJob } = require('../jobs/jobWorker');
      await enqueueJob({
        queueName: 'webhooks',
        jobType: 'PROCESS_FLUTTERWAVE_WEBHOOK',
        payload: {
          eventId,
          txRef,
          providerTxId,
          amountMinor,
          currency
        },
        correlationId: txRef
      });
      console.log(`[Webhook Ingested]: Enqueued durable job for txRef ${txRef}`);
    }

    return res.status(200).json({ status: 'accepted', queue: 'durable_background_jobs' });
  } catch (err) {
    console.error('[Webhook Error]:', err.message);
    return res.status(500).json({ error: 'Webhook processing failure' });
  }
});

/**
 * POST /api/v1/payments/test-confirm
 * Helper endpoint for local testing and demonstration.
 * Allows simulating a verified webhook completion for a given txRef.
 */
router.post('/test-confirm', async (req, res, next) => {
  try {
    const { txRef, providerTxId = `SIM_FW_${Date.now()}` } = req.body;

    if (!txRef) {
      return res.status(400).json({ error: 'txRef is required' });
    }

    const result = await bookingService.confirmBookingFromWebhook({
      txRef,
      providerTxId,
      amountMinor: null,
      currency: 'NGN'
    });

    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/payments/abandon
 * Release held seats when checkout is cancelled or payment fails.
 */
router.post('/abandon', requireAuth, async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    const userId = req.user.sub;

    const result = await bookingService.abandonCheckout({
      bookingId,
      userId
    });

    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/bookings/:id/status
 * Poll booking and payment status.
 */
router.get('/bookings/:id/status', requireAuth, async (req, res, next) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        paymentAttempts: { orderBy: { createdAt: 'desc' }, take: 1 },
        tickets: true,
        showtime: { include: { movie: true, screen: { include: { cinema: true } } } }
      }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.userId !== req.user.sub && req.user.role !== 'PLATFORM_ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.status(200).json({
      status: 'success',
      data: {
        id: booking.id,
        bookingRef: booking.bookingRef,
        status: booking.status,
        subtotalMinor: booking.subtotalMinor,
        serviceFeeMinor: booking.serviceFeeMinor,
        totalMinor: booking.totalMinor,
        currency: booking.currency,
        ticketsCount: booking.tickets.length,
        movieTitle: booking.showtime.movie.title,
        cinemaName: booking.showtime.screen.cinema.name,
        screenName: booking.showtime.screen.name,
        startTime: booking.showtime.startTime,
        paymentStatus: booking.paymentAttempts[0]?.status || 'UNKNOWN'
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/bookings/:id/tickets
 * Retrieve confirmed ticket records with verifiable QR payloads.
 */
router.get('/bookings/:id/tickets', requireAuth, async (req, res, next) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        tickets: true,
        showtime: { include: { movie: true, screen: { include: { cinema: true } } } }
      }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.userId !== req.user.sub && req.user.role !== 'PLATFORM_ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.status(200).json({
      status: 'success',
      data: {
        bookingRef: booking.bookingRef,
        status: booking.status,
        movie: {
          title: booking.showtime.movie.title,
          posterPath: booking.showtime.movie.posterPath,
          runtimeMinutes: booking.showtime.movie.runtimeMinutes
        },
        cinema: {
          name: booking.showtime.screen.cinema.name,
          location: booking.showtime.screen.cinema.location,
          screen: booking.showtime.screen.name
        },
        showtime: {
          startTime: booking.showtime.startTime,
          endTime: booking.showtime.endTime
        },
        tickets: booking.tickets.map(t => ({
          id: t.id,
          seatLabel: t.seatLabel,
          ticketCode: t.ticketCode,
          qrPayload: t.qrPayload,
          status: t.status
        }))
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
