---
trigger: always_on
---

# Booking Lifecycle Rules

## Authority and Scope
- Follow `AGENTS.md`, the PRD, `database-schema.md`, `money-billing.md`, and `scheduling-integrity.md`.
- Enforce booking rules in the backend; the mobile client is never authoritative.
- Keep booking, payment, inventory, and refund states separate.
- Do not invent cancellation deadlines, refund eligibility, fees, or other unresolved policies.

## Booking State and Transitions
- Define explicit, valid booking states and permitted transitions.
- Every transition must identify its trigger, preconditions, inventory effect, and retry behavior.
- Reject invalid or stale transitions rather than silently correcting them.
- Do not equate a payment attempt with a confirmed booking.
- Confirm a booking only after payment is verified and all required seats are securely allocated.
- Never confirm a multi-seat booking with only some seats allocated unless an explicit product rule permits partial allocation.
- A confirmed booking must not be demoted by a duplicate webhook, stale request, or retry.
- Preserve booking history and historical seat labels, prices, and currency.

## Checkout and Confirmation
- Revalidate ownership, showtime status, seat availability, hold expiry, price, and currency on the server before checkout proceeds.
- Use database transactions for operations that must update related booking and inventory records atomically.
- Use stable idempotency keys for retryable booking and checkout operations.
- Return the existing result for a repeated valid idempotent request rather than creating duplicate bookings or payment attempts.
- Never trust the client redirect as proof of payment.
- Keep unresolved payment outcomes visible and retrievable after app closure, lost responses, or delayed webhooks.
- Provide stable API responses that distinguish inventory conflicts, expired holds, pending payments, unknown outcomes, failures, and confirmed bookings.

## Expired Holds and Late Payments
- A payment success does not prove the original seat hold remains valid.
- If payment succeeds after a hold expires, attempt to reacquire all required seats transactionally.
- Never displace another confirmed booking to satisfy a late payment.
- If seats cannot be reacquired, follow the approved refund or manual-resolution process.
- Keep the booking and financial outcome visible until the case is resolved.
- Never release or reacquire seats through a client-only action.

## Cancellation and Refunds
- Apply only the approved cancellation and refund policy.
- Validate cancellation eligibility and required authorization on the server.
- Coordinate booking transitions, inventory release, and refund initiation according to the approved workflow.
- Do not release seats merely because a client requests cancellation.
- Preserve historical booking and seat records after cancellation.
- Track refund status independently from booking status.
- Failed or pending refunds must remain visible, recoverable, and auditable.

## Retrieval, Access, and Audit
- Customers may retrieve only bookings they own or are explicitly authorized to access.
- Provide reliable booking-status retrieval after interrupted requests or delayed processing.
- Keep ticket access tied to authoritative booking status.
- Record critical booking transitions with actor, timestamp, action, and correlation identifiers.
- Restrict administrative recovery actions to authorized staff and audit sensitive changes.
- Cinema suspension must prevent new bookings without silently deleting existing confirmed bookings.

## Testing Requirements
Test:
- Every permitted and rejected state transition.
- Concurrent checkout and repeated idempotent requests.
- Multi-seat allocation failures and transaction rollbacks.
- Duplicate, delayed, and out-of-order payment events.
- Lost responses and payment success after hold expiry.
- Cancellation, seat release, and refund failures.
- Booking ownership and administrative authorization.
- Historical booking and seat records after cinema or seat configuration changes.

## Completion Requirements
- Booking transitions must be deterministic, transactional where required, and retry-safe.
- Payment verification and inventory allocation must both succeed before confirmation.
- No booking may silently lose its history or become unrecoverable.