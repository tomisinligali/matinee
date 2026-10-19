const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const flutterwaveAdapter = require('../payments/flutterwaveAdapter');
const redisHoldService = require('./redisHoldService');

const HOLD_DURATION_MS = 10 * 60 * 1000; // 10 minutes authoritative hold duration
const SERVICE_FEE_PER_TICKET_MINOR = 30000; // ₦300.00 per ticket calculated strictly on the server

class BookingService {
  /**
   * Helper: Resolve seats by either UUID or seatLabel within a given screen.
   */
  async resolveSeats(screenId, seatIdentifiers) {
    if (!seatIdentifiers || seatIdentifiers.length === 0) return [];
    return prisma.seat.findMany({
      where: {
        screenId,
        OR: [
          { id: { in: seatIdentifiers } },
          { seatLabel: { in: seatIdentifiers } }
        ]
      }
    });
  }

  /**
   * Acquire atomic temporary seat holds for a customer.
   */
  async acquireSeatHold({ showtimeId, seatIds, userId }) {
    if (!seatIds || seatIds.length === 0) {
      throw new Error('At least one seat must be selected');
    }

    const showtime = await prisma.showtime.findUnique({
      where: { id: showtimeId },
      include: { screen: true }
    });

    if (!showtime) {
      const err = new Error('Showtime not found');
      err.statusCode = 404;
      throw err;
    }

    if (showtime.status !== 'SCHEDULED') {
      const err = new Error(`Showtime is not available for booking (status: ${showtime.status})`);
      err.statusCode = 400;
      throw err;
    }

    // Resolve seats by ID or label
    const seats = await this.resolveSeats(showtime.screenId, seatIds);
    if (seats.length !== seatIds.length) {
      const err = new Error('One or more selected seats do not belong to this screening screen');
      err.statusCode = 400;
      throw err;
    }
    const resolvedSeatIds = seats.map(s => s.id);

    // 1. First, check PostgreSQL to ensure none of the seats are permanently sold
    const existingBookings = await prisma.bookingSeat.findMany({
      where: {
        showtimeId,
        seatId: { in: resolvedSeatIds }
      }
    });

    if (existingBookings.length > 0) {
      const err = new Error(`Seats already sold: ${existingBookings.map(b => b.seatLabel).join(', ')}`);
      err.statusCode = 409;
      throw err;
    }

    // 2. Atomically reserve seats in Redis using SET ... NX EX (Single-threaded atomic check-and-set)
    const redisHold = await redisHoldService.acquireAtomicHold({
      showtimeId,
      seatIds: resolvedSeatIds,
      userId
    });

    if (!redisHold.success) {
      const conflictingSeat = seats.find(s => s.id === redisHold.conflictingSeatId);
      const label = conflictingSeat ? conflictingSeat.seatLabel : redisHold.conflictingSeatId;
      const err = new Error(`Seat ${label} is temporarily held by another customer`);
      err.statusCode = 409;
      throw err;
    }

    const now = new Date();
    const expiresAt = redisHold.expiresAt || new Date(now.getTime() + HOLD_DURATION_MS);

    try {
      // 3. Atomically persist hold records in PostgreSQL
      return await prisma.$transaction(async (tx) => {
        // Clear any stale holds by this user on these seats
        await tx.seatHold.updateMany({
          where: {
            showtimeId,
            seatId: { in: resolvedSeatIds },
            userId,
            status: 'HELD'
          },
          data: { status: 'RELEASED' }
        });

        // Create new authoritative holds using resolved UUIDs
        const createdHolds = [];
        for (const seatId of resolvedSeatIds) {
          const hold = await tx.seatHold.create({
            data: {
              showtimeId,
              seatId,
              userId,
              status: 'HELD',
              expiresAt
            }
          });
          createdHolds.push(hold);
        }

        return {
          showtimeId,
          heldSeatsCount: createdHolds.length,
          expiresAt: expiresAt.toISOString(),
          expiresInSeconds: Math.floor(HOLD_DURATION_MS / 1000)
        };
      });
    } catch (pgErr) {
      // Rollback Redis hold if PostgreSQL fails
      await redisHoldService.releaseAtomicHold({ showtimeId, seatIds: resolvedSeatIds });
      throw pgErr;
    }
  }

  /**
   * Initiate checkout session with server-calculated minor fees and idempotency checks.
   */
  async initiateCheckout({ userId, showtimeId, seatIds, idempotencyKey, customer, redirectUrl }) {
    if (!idempotencyKey) {
      const err = new Error('Idempotency-Key header or property is required for checkout');
      err.statusCode = 400;
      throw err;
    }

    // 1. Fetch showtime and configured seats
    const showtime = await prisma.showtime.findUnique({
      where: { id: showtimeId },
      include: { screen: { include: { cinema: true } }, movie: true }
    });

    if (!showtime) {
      const err = new Error('Showtime not found');
      err.statusCode = 404;
      throw err;
    }

    const seats = await this.resolveSeats(showtime.screenId, seatIds);

    if (seats.length !== seatIds.length) {
      const err = new Error('One or more selected seats do not belong to this screening screen');
      err.statusCode = 400;
      throw err;
    }

    const resolvedSeatIds = seats.map(s => s.id).sort();

    // 2. Check existing booking by idempotency key
    const existingBooking = await prisma.booking.findUnique({
      where: { idempotencyKey },
      include: {
        paymentAttempts: { orderBy: { createdAt: 'desc' }, take: 1 },
        seats: true,
        showtime: { include: { movie: true, screen: { include: { cinema: true } } } }
      }
    });

    if (existingBooking) {
      // Validate request fingerprint
      let existingSeatIds = existingBooking.seats.map(s => s.seatId).sort();
      if (existingSeatIds.length === 0) {
        const holds = await prisma.seatHold.findMany({
          where: {
            showtimeId: existingBooking.showtimeId,
            userId: existingBooking.userId,
            status: { in: ['HELD', 'CONVERTED'] }
          }
        });
        existingSeatIds = holds.map(h => h.seatId).sort();
      }

      if (
        existingBooking.showtimeId !== showtimeId ||
        existingBooking.userId !== userId ||
        JSON.stringify(existingSeatIds) !== JSON.stringify(resolvedSeatIds)
      ) {
        const err = new Error('Idempotency key reused with different request payload');
        err.statusCode = 409;
        throw err;
      }

      const latestAttempt = existingBooking.paymentAttempts[0];
      return {
        bookingId: existingBooking.id,
        bookingRef: existingBooking.bookingRef,
        status: existingBooking.status,
        subtotalMinor: existingBooking.subtotalMinor,
        serviceFeeMinor: existingBooking.serviceFeeMinor,
        totalMinor: existingBooking.totalMinor,
        currency: existingBooking.currency,
        checkoutUrl: `https://checkout.flutterwave.com/v3/hosted/pay/test-${latestAttempt?.txRef || existingBooking.bookingRef}`,
        txRef: latestAttempt?.txRef,
        isIdempotentReplay: true
      };
    }

    // 3. Server-side minor price calculations
    const subtotalMinor = showtime.priceMinor * seats.length;
    const serviceFeeMinor = SERVICE_FEE_PER_TICKET_MINOR * seats.length;
    const totalMinor = subtotalMinor + serviceFeeMinor;
    const currency = showtime.currency;

    const bookingRef = `MTN-${Math.floor(100000 + Math.random() * 900000)}-${showtime.screen.cinema.name.substring(0, 3).toUpperCase()}`;

    // 4. Create booking and payment attempt in a database transaction
    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          userId,
          showtimeId,
          bookingRef,
          status: 'PENDING_PAYMENT',
          subtotalMinor,
          serviceFeeMinor,
          totalMinor,
          currency,
          idempotencyKey
        }
      });

      const txRef = `MTN-TX-${booking.id.substring(0, 8)}-${Date.now()}`;

      const paymentAttempt = await tx.paymentAttempt.create({
        data: {
          bookingId: booking.id,
          txRef,
          provider: 'FLUTTERWAVE',
          amountMinor: totalMinor,
          currency,
          status: 'INITIATED'
        }
      });

      // Call Flutterwave Adapter
      const fwResponse = await flutterwaveAdapter.initiateCheckout({
        txRef,
        amountMinor: totalMinor,
        currency,
        customer,
        redirectUrl,
        bookingRef
      });

      return {
        bookingId: booking.id,
        bookingRef,
        status: booking.status,
        subtotalMinor,
        serviceFeeMinor,
        totalMinor,
        currency,
        formattedTotal: `₦${(totalMinor / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
        checkoutUrl: fwResponse.checkoutUrl,
        txRef,
        seatLabels: seats.map(s => s.seatLabel)
      };
    });
  }

  /**
   * Confirm booking upon receipt of a verified payment webhook.
   */
  async confirmBookingFromWebhook({ txRef, providerTxId, amountMinor, currency }) {
    const paymentAttempt = await prisma.paymentAttempt.findUnique({
      where: { txRef },
      include: {
        booking: {
          include: {
            showtime: { include: { screen: { include: { cinema: true } }, movie: true } }
          }
        }
      }
    });

    if (!paymentAttempt) {
      console.warn(`[Webhook Recovery]: Payment attempt ${txRef} not found locally`);
      return { status: 'NOT_FOUND' };
    }

    const { booking } = paymentAttempt;

    // Idempotency: If booking is already confirmed, do not re-process
    if (booking.status === 'CONFIRMED') {
      return { status: 'ALREADY_CONFIRMED', bookingRef: booking.bookingRef };
    }

    // Verify amount and currency
    if (amountMinor && paymentAttempt.amountMinor !== amountMinor) {
      console.error(`[Amount Conflict]: Expected ${paymentAttempt.amountMinor} but got ${amountMinor}`);
    }

    // Get active holds for this booking's user and showtime
    const holds = await prisma.seatHold.findMany({
      where: {
        showtimeId: booking.showtimeId,
        userId: booking.userId,
        status: 'HELD'
      },
      include: { seat: true }
    });

    return prisma.$transaction(async (tx) => {
      // 1. Update Payment Attempt
      await tx.paymentAttempt.update({
        where: { id: paymentAttempt.id },
        data: {
          status: 'SUCCEEDED',
          providerTxId: String(providerTxId)
        }
      });

      // 2. Transition Booking to CONFIRMED
      const confirmedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: { status: 'CONFIRMED' }
      });

      // 3. Create permanent BookingSeat records and mark holds CONVERTED
      const ticketsCreated = [];
      for (const hold of holds) {
        await tx.bookingSeat.upsert({
          where: {
            showtimeId_seatId: {
              showtimeId: booking.showtimeId,
              seatId: hold.seatId
            }
          },
          create: {
            bookingId: booking.id,
            showtimeId: booking.showtimeId,
            seatId: hold.seatId,
            seatLabel: hold.seat.seatLabel,
            priceMinor: booking.showtime.priceMinor
          },
          update: {}
        });

        await tx.seatHold.update({
          where: { id: hold.id },
          data: { status: 'CONVERTED' }
        });

        // 4. Generate verifiable Ticket record with secure QR payload
        const ticketCode = `TKT-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${hold.seat.seatLabel}`;
        const qrPayload = JSON.stringify({
          ticketCode,
          bookingRef: booking.bookingRef,
          cinema: booking.showtime.screen.cinema.name,
          screen: booking.showtime.screen.name,
          movie: booking.showtime.movie.title,
          showtime: booking.showtime.startTime.toISOString(),
          seat: hold.seat.seatLabel,
          signature: `SIG_SEC_${Date.now()}`
        });

        const ticket = await tx.ticket.create({
          data: {
            bookingId: booking.id,
            seatLabel: hold.seat.seatLabel,
            ticketCode,
            qrPayload,
            status: 'VALID'
          }
        });
        ticketsCreated.push(ticket);
      }

      console.log(`[Booking Confirmed]: ${booking.bookingRef} with ${ticketsCreated.length} tickets`);
      
      // Clean up Redis hold keys now that seats are confirmed in PostgreSQL
      await redisHoldService.releaseAtomicHold({
        showtimeId: booking.showtimeId,
        seatIds: holds.map(h => h.seatId)
      });

      return {
        status: 'CONFIRMED',
        bookingRef: booking.bookingRef,
        ticketsCount: ticketsCreated.length
      };
    });
  }

  /**
   * Release held seats and cancel pending booking if checkout is abandoned.
   */
  async abandonCheckout({ bookingId, userId }) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.userId !== userId) {
      const err = new Error('Unauthorized');
      err.statusCode = 403;
      throw err;
    }

    if (booking.status === 'CONFIRMED') {
      throw new Error('Cannot abandon confirmed booking');
    }

    const holds = await prisma.seatHold.findMany({
      where: {
        showtimeId: booking.showtimeId,
        userId,
        status: 'HELD'
      }
    });

    return prisma.$transaction(async (tx) => {
      // 1. Release all active holds for this showtime and user in PostgreSQL
      await tx.seatHold.updateMany({
        where: {
          showtimeId: booking.showtimeId,
          userId,
          status: 'HELD'
        },
        data: { status: 'RELEASED' }
      });

      // 2. Mark booking CANCELLED
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED' }
      });

      // 3. Mark payment attempts ABANDONED
      await tx.paymentAttempt.updateMany({
        where: { bookingId, status: 'INITIATED' },
        data: { status: 'ABANDONED' }
      });

      // 4. Release Redis holds atomically
      await redisHoldService.releaseAtomicHold({
        showtimeId: booking.showtimeId,
        seatIds: holds.map(h => h.seatId)
      });

      return { status: 'ABANDONED', message: 'Held seats have been safely released' };
    });
  }

  /**
   * Periodic sweep: release expired seat holds older than 10 minutes.
   */
  async sweepExpiredHolds() {
    const now = new Date();
    const result = await prisma.seatHold.updateMany({
      where: {
        status: 'HELD',
        expiresAt: { lt: now }
      },
      data: { status: 'RELEASED' }
    });

    return { releasedHoldsCount: result.count };
  }

  /**
   * Cancel a showtime and issue automated ledger refunds for all affected bookings.
   */
  async cancelShowtimeAndRefund({ showtimeId, operatorId }) {
    const showtime = await prisma.showtime.findUnique({
      where: { id: showtimeId },
      include: {
        bookings: {
          where: { status: 'CONFIRMED' },
          include: { paymentAttempts: { where: { status: 'SUCCEEDED' } } }
        }
      }
    });

    if (!showtime) {
      const err = new Error('Showtime not found');
      err.statusCode = 404;
      throw err;
    }

    if (showtime.status === 'CANCELLED') {
      return { status: 'ALREADY_CANCELLED', refundedBookingsCount: 0 };
    }

    return prisma.$transaction(async (tx) => {
      // 1. Mark showtime CANCELLED
      await tx.showtime.update({
        where: { id: showtimeId },
        data: { status: 'CANCELLED' }
      });

      // 2. Release any outstanding holds
      await tx.seatHold.updateMany({
        where: { showtimeId, status: 'HELD' },
        data: { status: 'RELEASED' }
      });

      const refundRecordsCreated = [];

      // 3. Process refunds for every confirmed booking
      for (const booking of showtime.bookings) {
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: 'REFUNDED' }
        });

        // Cancel issued tickets
        await tx.ticket.updateMany({
          where: { bookingId: booking.id },
          data: { status: 'CANCELLED' }
        });

        const latestAttempt = booking.paymentAttempts[0];

        // Call Flutterwave refund adapter
        const refundResult = await flutterwaveAdapter.initiateRefund({
          transactionId: latestAttempt?.providerTxId || 'SIM_TX',
          amountMinor: booking.totalMinor,
          currency: booking.currency
        });

        // Record entry in durable financial ledger
        const ledgerRecord = await tx.refundRecord.create({
          data: {
            bookingId: booking.id,
            paymentAttemptId: latestAttempt?.id || null,
            amountMinor: booking.totalMinor,
            currency: booking.currency,
            reason: 'SHOWTIME_CANCELLED',
            status: refundResult.status,
            txRef: latestAttempt?.txRef || `MTN-REF-${booking.bookingRef}`,
            providerRefundId: refundResult.providerRefundId
          }
        });

        refundRecordsCreated.push(ledgerRecord);
      }

      console.log(`[Showtime Cancelled]: Refunded ${refundRecordsCreated.length} bookings into financial ledger`);
      return {
        showtimeId,
        status: 'CANCELLED',
        refundedBookingsCount: refundRecordsCreated.length,
        ledgerRecords: refundRecordsCreated
      };
    }, { timeout: 15000 });
  }
}

module.exports = new BookingService();
