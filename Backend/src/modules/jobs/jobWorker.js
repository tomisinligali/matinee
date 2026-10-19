const prisma = require('../../config/db');
const redis = require('../../config/redis');
const flutterwaveAdapter = require('../payments/flutterwaveAdapter');
const bookingService = require('../bookings/bookingService');

/**
 * ============================================================================
 * DURABLE BACKGROUND JOB WORKER (PostgreSQL-backed Outbox / Queue)
 * ============================================================================
 * 
 * Invariants & Architectural Rules:
 * 1. Durable: All jobs are persisted in PostgreSQL before or during business actions.
 * 2. Idempotent: Safe to execute multiple times without duplicating side effects.
 * 3. Concurrent-safe: Uses `FOR UPDATE SKIP LOCKED` so multiple worker threads/nodes
 *    never process the same job concurrently.
 * 4. Stuck-job recovery: Jobs stuck in PROCESSING due to node crash/reboot are reclaimed.
 * 5. Bounded exponential backoff: Transient network errors retry up to max_attempts.
 */

const WORKER_ID = `worker_${process.pid}_${Math.random().toString(36).substring(2, 8)}`;
let isRunning = false;
let workerInterval = null;
let cleanupInterval = null;

/**
 * Enqueue a durable background job into PostgreSQL
 */
async function enqueueJob({
  queueName = 'default',
  jobType,
  payload,
  runAt = new Date(),
  correlationId = null,
  maxAttempts = 5,
  backoffSeconds = 10
}) {
  const job = await prisma.backgroundJob.create({
    data: {
      queueName,
      jobType,
      payload: typeof payload === 'string' ? payload : JSON.stringify(payload),
      status: 'PENDING',
      attempts: 0,
      maxAttempts,
      backoffSeconds,
      runAt,
      correlationId
    }
  });

  return job;
}

/**
 * Claim and process the next available job using SKIP LOCKED
 */
async function processNextJob(queueName = null) {
  // Query for pending or stuck job atomically
  const query = queueName
    ? prisma.$queryRaw`
        UPDATE background_jobs
        SET status = 'PROCESSING',
            locked_by = ${WORKER_ID},
            locked_at = NOW(),
            attempts = attempts + 1,
            updated_at = NOW()
        WHERE id = (
          SELECT id FROM background_jobs
          WHERE queue_name = ${queueName}
            AND (
              (status = 'PENDING' AND run_at <= NOW())
              OR (status = 'PROCESSING' AND locked_at < NOW() - INTERVAL '5 minutes')
            )
          ORDER BY run_at ASC
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        )
        RETURNING *;
      `
    : prisma.$queryRaw`
        UPDATE background_jobs
        SET status = 'PROCESSING',
            locked_by = ${WORKER_ID},
            locked_at = NOW(),
            attempts = attempts + 1,
            updated_at = NOW()
        WHERE id = (
          SELECT id FROM background_jobs
          WHERE (
            (status = 'PENDING' AND run_at <= NOW())
            OR (status = 'PROCESSING' AND locked_at < NOW() - INTERVAL '5 minutes')
          )
          ORDER BY run_at ASC
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        )
        RETURNING *;
      `;

  const rows = await query;
  if (!rows || rows.length === 0) {
    return null; // No jobs available
  }

  const job = rows[0];

  try {
    let parsedPayload = {};
    try {
      parsedPayload = JSON.parse(job.payload);
    } catch {
      parsedPayload = job.payload;
    }

    // Dispatch to registered job handlers
    await executeJobHandler(job.job_type, parsedPayload, job);

    // Mark completed
    await prisma.backgroundJob.update({
      where: { id: job.id },
      data: {
        status: 'COMPLETED',
        lockedBy: null,
        lockedAt: null
      }
    });

    return job;
  } catch (err) {
    const attempts = job.attempts;
    const maxAttempts = job.max_attempts;

    if (attempts < maxAttempts) {
      // Exponential backoff: backoff_seconds * 2^(attempts - 1)
      const delaySec = Math.pow(2, attempts - 1) * (job.backoff_seconds || 10);
      const nextRunAt = new Date(Date.now() + delaySec * 1000);

      await prisma.backgroundJob.update({
        where: { id: job.id },
        data: {
          status: 'PENDING',
          runAt: nextRunAt,
          lockedBy: null,
          lockedAt: null,
          lastError: err.message
        }
      });
      console.warn(`[Job Worker] Job ${job.id} (${job.job_type}) failed transiently. Scheduled attempt ${attempts + 1} at ${nextRunAt.toISOString()}: ${err.message}`);
    } else {
      // Terminal Dead Letter
      await prisma.backgroundJob.update({
        where: { id: job.id },
        data: {
          status: 'DEAD_LETTER',
          lockedBy: null,
          lockedAt: null,
          lastError: err.stack || err.message
        }
      });
      console.error(`[Job Worker] Job ${job.id} (${job.job_type}) permanently failed after ${attempts} attempts: ${err.message}`);
    }

    return null;
  }
}

/**
 * Job Handlers
 */
async function executeJobHandler(jobType, payload, job) {
  switch (jobType) {
    case 'PROCESS_FLUTTERWAVE_WEBHOOK': {
      const { txRef, providerTxId, amountMinor, currency = 'NGN' } = payload;
      if (!txRef) {
        throw new Error('Missing txRef in webhook job payload');
      }

      // Re-verify transaction with provider for security
      const verification = await flutterwaveAdapter.verifyTransaction(providerTxId);
      if (verification.status === 'successful') {
        await bookingService.confirmBookingFromWebhook({
          txRef,
          providerTxId,
          amountMinor: amountMinor || verification.amountMinor,
          currency
        });
      } else {
        throw new Error(`Flutterwave transaction ${providerTxId} verification status is ${verification.status}`);
      }
      break;
    }

    case 'CLEANUP_EXPIRED_HOLDS': {
      const now = new Date();
      // Find expired holds in DB
      const expiredHolds = await prisma.seatHold.findMany({
        where: {
          status: 'HELD',
          expiresAt: { lt: now }
        },
        take: 100
      });

      if (expiredHolds.length > 0) {
        // Mark released in DB
        await prisma.seatHold.updateMany({
          where: {
            id: { in: expiredHolds.map(h => h.id) }
          },
          data: { status: 'RELEASED' }
        });

        // Clean up Redis keys
        for (const hold of expiredHolds) {
          try {
            await redis.del(`seat_hold:${hold.showtimeId}:${hold.seatId}`);
          } catch {
            // Ignore redis deletion failure
          }
        }
      }
      break;
    }

    case 'RETRY_REFUND': {
      const { refundId, txRef, amountMinor, currency = 'NGN' } = payload;
      const refundRecord = await prisma.refundRecord.findUnique({
        where: { id: refundId }
      });

      if (!refundRecord || refundRecord.status === 'COMPLETED') {
        return; // Already completed or not found
      }

      const result = await flutterwaveAdapter.initiateRefund({
        transactionId: txRef,
        amountMinor: amountMinor || refundRecord.amountMinor,
        currency
      });

      if (result.status === 'COMPLETED' || result.status === 'COMPLETED_SANDBOX') {
        await prisma.refundRecord.update({
          where: { id: refundId },
          data: {
            status: 'COMPLETED',
            providerRefundId: result.providerRefundId
          }
        });
      } else {
        throw new Error(`Refund initiation returned ${result.status}`);
      }
      break;
    }

    default:
      console.warn(`[Job Worker] Unrecognized job type: ${jobType}`);
  }
}

/**
 * Start Background Worker Loop
 */
function startWorker(pollIntervalMs = 2000) {
  if (isRunning) return;
  isRunning = true;

  console.log(`[Job Worker] Worker ${WORKER_ID} started polling background_jobs every ${pollIntervalMs}ms`);

  workerInterval = setInterval(async () => {
    try {
      let job = await processNextJob();
      // Drain queue if multiple jobs are waiting
      while (job && isRunning) {
        job = await processNextJob();
      }
    } catch (err) {
      console.error('[Job Worker Error]:', err.message);
    }
  }, pollIntervalMs);

  // Periodic hold expiry cleanup every 60 seconds
  cleanupInterval = setInterval(async () => {
    try {
      await enqueueJob({
        queueName: 'holds',
        jobType: 'CLEANUP_EXPIRED_HOLDS',
        payload: { triggeredAt: new Date().toISOString() }
      });
    } catch (err) {
      console.warn('[Job Worker] Failed to schedule periodic hold cleanup:', err.message);
    }
  }, 60000);
}

/**
 * Stop Background Worker Gracefully
 */
function stopWorker() {
  isRunning = false;
  if (workerInterval) clearInterval(workerInterval);
  if (cleanupInterval) clearInterval(cleanupInterval);
  console.log(`[Job Worker] Worker ${WORKER_ID} stopped gracefully`);
}

module.exports = {
  enqueueJob,
  processNextJob,
  executeJobHandler,
  startWorker,
  stopWorker
};
