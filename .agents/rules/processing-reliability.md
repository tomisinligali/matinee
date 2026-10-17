---
trigger: always_on
---

# Processing and Reliability Rules

## Authority and Scope
- Follow `AGENTS.md`, the PRD, `money-billing.md`, and `booking-lifecycle.md`.
- Background processing must be durable, retry-safe, observable, and recoverable.
- Required use cases include webhook processing, notification delivery, hold-expiry cleanup, payment reconciliation, and refund recovery.
- Choose queue infrastructure according to the approved architecture. Redis/BullMQ is not mandatory unless explicitly selected.

## Durable Job Processing
- Persist enough information to recover work after a process restart or crash.
- Define explicit job types, payload schemas, ownership, status, retry policy, and failure handling.
- Do not rely on in-memory queues or fire-and-forget promises for critical work.
- Make jobs idempotent so repeated execution cannot duplicate business effects.
- Keep workers within shared domain services and enforce the same validation and authorization rules as API requests.
- Persist required job or outbox records transactionally with the associated business mutation where appropriate.
- Never treat queue delivery as proof that a business operation completed.

## Retries and Idempotency
- Apply bounded retries with appropriate backoff for transient failures.
- Do not repeatedly retry permanent validation, authorization, or unsupported-operation failures.
- Use stable operation identifiers and deduplication records for retryable external actions.
- Do not generate a new payment, refund, or notification operation on every retry.
- Treat timeouts as potentially unknown outcomes until reconciled.
- Make repeated webhook and provider-event processing safe.
- Prevent concurrent workers from processing the same job in a way that duplicates side effects.
- Record attempt counts and the reason for each retry or terminal failure.

## Job Recovery and Failure Handling
- Detect and recover jobs left stuck by worker crashes or interrupted execution.
- Distinguish pending, processing, retrying, completed, and terminally failed work.
- Define how partially completed operations resume without repeating completed side effects.
- Keep unresolved payments, refunds, and reconciliation cases visible for operational review.
- Do not mark a job successful merely because a request was sent to an external provider.
- Do not allow notification failures to reverse a confirmed booking.
- Ensure failure of cleanup jobs cannot make an expired hold valid or authorize an invalid seat sale.
- Escalate persistent or ambiguous failures rather than retrying indefinitely.

## Webhooks and External Services
- Authenticate provider webhooks before processing them.
- Persist and deduplicate events, then process them safely.
- Handle duplicate, delayed, and out-of-order events without regressing confirmed state.
- Use provider lookups and reconciliation for missing events or uncertain outcomes where supported.
- Apply timeouts and bounded retries to external requests.
- Keep provider-specific behavior isolated behind the relevant integration adapter.
- Never assume a provider accepted or completed an operation merely because the network request timed out.

## Notifications
- Deliver booking and payment notifications through retryable background processing.
- Deduplicate notifications where repeated delivery would confuse users or create harmful side effects.
- Track delivery status and relevant provider errors.
- Keep ticket and booking status available in-app even if notification delivery fails.
- Do not make booking confirmation dependent on successful notification delivery.

## Observability and Operations
- Use structured logs and correlation IDs linking jobs to bookings, payment attempts, provider events, and refunds.
- Record job status, attempt count, duration, and terminal failure reason.
- Monitor queue depth, processing latency, stuck jobs, webhook failures, unresolved payments, refund failures, and notification failures.
- Provide authorized operational tools or documented procedures for inspecting and recovering failed work.
- Avoid logging secrets, payment credentials, or unnecessary personal data.
- Document backup restoration and post-restore payment/booking reconciliation procedures.

## Testing Requirements
Test:
- Duplicate job delivery and concurrent worker execution.
- Worker crashes before and after external side effects.
- Transient and permanent failures.
- Retry limits and backoff behavior.
- Stuck-job detection and recovery.
- Duplicate, delayed, and out-of-order webhook processing.
- Provider timeouts followed by eventual success.
- Notification failure without booking-state regression.
- Expiry cleanup failure without inventory-integrity violations.
- Database restoration followed by reconciliation.

## Completion Requirements
- Critical jobs must be durable and idempotent.
- Retries must be bounded, and unresolved outcomes must remain visible.
- Recovery must not duplicate payments, refunds, bookings, or other consequential effects.
- Include failure-path tests and operational visibility for every critical processing flow.