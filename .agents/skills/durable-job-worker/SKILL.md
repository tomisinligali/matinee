---
name: durable-job-worker
description: >-
  Use this skill when creating or modifying background jobs, queue processors, retries, or recovery mechanisms.
  Trigger: Creating or modifying background jobs, queue processors, retries, or job recovery.
  Load when: Working on webhook processing, hold-expiry cleanup, notifications, payment reconciliation, or refund recovery jobs.
  Teaches durable job persistence, safe execution, idempotency, bounded retries, stuck-job recovery, and failure visibility without assuming an unapproved queue technology.
---

# Durable Job Worker

This skill teaches the patterns and implementation standards for asynchronous and background processing in Matinee.

Background jobs must be durable, idempotent, recoverable, and observable in accordance with `processing-reliability.md`, `money-billing.md`, and `booking-lifecycle.md`. Never rely on in-memory queues, `setTimeout`, or unhandled fire-and-forget promises for critical business workflows.

---

## Architectural Principles

1. **Technology Decoupling**: Do not assume Redis, BullMQ, or external broker infrastructure unless explicitly approved in the architecture decision register. Matinee supports a PostgreSQL-backed transactional outbox/job table pattern by default.
2. **Durable Persistence**: All critical asynchronous tasks must be persisted in PostgreSQL before or transactionally with the initiating domain action.
3. **Idempotent Execution**: A job must be safe to execute multiple times without duplicating payments, refunds, notifications, or seat releases.
4. **Bounded Retries with Backoff**: Transient errors (e.g. external network timeouts, database deadlocks) must be retried with exponential backoff and jitter up to a strict maximum limit. Permanent failures (e.g. malformed payload, 400 Bad Request) must fail immediately without retries.
5. **Stuck-Job Recovery**: Workers must detect and reclaim jobs left in a `PROCESSING` state due to node crashes or memory exhaustion (heartbeat timeouts).

---

## Job Lifecycle & Database Model

A robust PostgreSQL-backed job schema:

```sql
CREATE TABLE background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_name VARCHAR(50) NOT NULL,
  job_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- PENDING, PROCESSING, COMPLETED, FAILED, DEAD_LETTER
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  backoff_seconds INT NOT NULL DEFAULT 10,
  locked_by VARCHAR(100),
  locked_at TIMESTAMPTZ,
  run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error TEXT,
  correlation_id VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jobs_processing ON background_jobs (queue_name, status, run_at);
```

---

## The 5 Critical Job Workflows

### 1. Webhook Background Ingestion
- Webhooks from Flutterwave are saved immediately to `webhook_events` and enqueued in `background_jobs` (`job_type: 'PROCESS_FLUTTERWAVE_WEBHOOK'`).
- The worker executes the transaction lookup, verification, and booking confirmation asynchronously, protecting the webhook handler from timeouts.

### 2. Hold Expiry Cleanup Job
- **Important**: As mandated by `scheduling-integrity.md`, inventory availability checks and booking confirmations must *never* rely on this job running to know if a hold is expired. Expiry is always enforced authoritatively via `NOW() > expires_at` in the checkout transaction.
- The cleanup job runs periodically to update expired allocations from `HELD` to `EXPIRED` for database hygiene and operational reporting.

### 3. Payment Reconciliation Worker
- Runs periodically to inspect unresolved payment attempts (e.g. attempts in `INITIATED` or `PENDING` state for > 15 minutes).
- Queries Flutterwave API (`GET /v3/transactions/:id/verify`) to resolve unknown states.
- Triggers either booking confirmation (if seats available), refund (if seats taken), or marks payment as `ABANDONED`.

### 4. Refund Recovery Worker
- Inspects pending or failed refunds in `refund_records`.
- Re-executes the provider refund call using a stable idempotency key (`idempotency_key = refund.id`).
- Escalates to administrative attention (`DEAD_LETTER`) if max attempts are reached without provider resolution.

### 5. Durable Notification Delivery
- Dispatches transactional booking confirmations, SMS, or email tickets.
- Deduplicates notifications via unique `(booking_id, notification_type)` tokens.
- Notification failures must *never* roll back or cancel a confirmed booking or payment.

---

## Safe Worker Execution Pattern

```javascript
async function processNextJob(queueName, workerId) {
  // 1. Atomically claim a pending or stuck job using PostgreSQL SKIP LOCKED
  const job = await prisma.$queryRaw`
    UPDATE background_jobs
    SET status = 'PROCESSING',
        locked_by = ${workerId},
        locked_at = NOW(),
        attempts = attempts + 1,
        updated_at = NOW()
    WHERE id = (
      SELECT id FROM background_jobs
      WHERE queue_name = ${queueName}
        AND (
          (status = 'PENDING' AND run_at <= NOW())
          OR (status = 'PROCESSING' AND locked_at < NOW() - INTERVAL '5 minutes') -- Stuck-job reclamation
        )
      ORDER BY run_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING *;
  `;

  if (!job) return null; // No jobs available

  try {
    // 2. Execute idempotent job handler
    await executeJobHandler(job);

    // 3. Mark completed
    await prisma.backgroundJobs.update({
      where: { id: job.id },
      data: { status: 'COMPLETED', locked_by: null, locked_at: null }
    });
  } catch (err) {
    const isTransient = checkIfTransient(err);
    const hasRetriesLeft = job.attempts < job.max_attempts;

    if (isTransient && hasRetriesLeft) {
      const nextRunAt = new Date(Date.now() + Math.pow(2, job.attempts) * job.backoff_seconds * 1000);
      await prisma.backgroundJobs.update({
        where: { id: job.id },
        data: {
          status: 'PENDING',
          run_at: nextRunAt,
          locked_by: null,
          locked_at: null,
          last_error: err.message
        }
      });
    } else {
      // Terminal failure
      await prisma.backgroundJobs.update({
        where: { id: job.id },
        data: {
          status: 'DEAD_LETTER',
          locked_by: null,
          locked_at: null,
          last_error: err.stack || err.message
        }
      });
      // Emit alert for operational visibility
    }
  }
}
```

---

## Prohibited Shortcuts & Anti-Patterns
- **NO Fire-and-Forget**: Never use unhandled `Promise` chains or `setImmediate` for tasks involving payments, inventory, or financial reconciliation.
- **NO Infinite Retries**: Retries must have an upper bound (`max_attempts`).
- **NO Unobservable Dead-Letters**: Failed jobs must be logged with correlation IDs, error messages, and payload summaries.
- **NO Cascading Impact to Bookings**: Notification delivery or cleanup worker failures must never alter confirmed bookings.
