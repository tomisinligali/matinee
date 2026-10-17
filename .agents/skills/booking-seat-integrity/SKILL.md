---
name: booking-seat-integrity
description: >-
  Use this skill when implementing or modifying seat selection, holds, allocations, expiry, or booking inventory release.
  Trigger: Any change affecting seat availability, holds, allocations, expiry, or booking-related inventory release.
  Load when: Implementing or modifying seat selection, hold creation, allocation, expiry, cancellation, or reacquisition.
  Teaches the transactional workflow for competing requests, atomic seat allocation, conflict handling, safe retries, and preventing double-selling.
---

# Booking & Seat Integrity

This skill guides the implementation and verification of Matinee's core engineering invariant: **zero double-allocation under any circumstance**.

All operations altering seat inventory, temporary holds, booking confirmations, or cancellations must strictly adhere to `scheduling-integrity.md`, `booking-lifecycle.md`, and `database-schema.md`.

---

## Non-Negotiable Invariants

1. **Rule 1 — Zero Double-Allocation**: No two customers may simultaneously hold or confirm the same seat for the same showtime.
2. **Rule 2 — Atomic Multi-Seat Allocation**: A hold or booking request for $N$ seats must secure all $N$ seats or fail completely. Partial holds are prohibited.
3. **Rule 3 — Screen-to-Seat Validation**: Every seat requested must belong to the screen assigned to the showtime.
4. **Rule 4 — Server-Side Authoritative Expiry**: Hold expiry is evaluated against database/server time (`NOW()`) inside the authoritative transaction. A hold is invalid the millisecond it expires.
5. **Rule 5 — Consistent Lock Ordering**: Always sort seat IDs (e.g. by UUID ascending) before acquiring row locks to prevent PostgreSQL deadlocks.

---

## State Transition Lifecycle

```
             ┌───────────────┐
             │   AVAILABLE   │
             └───────┬───────┘
                     │ Hold Request (Atomic, all-or-nothing)
                     ▼
             ┌───────────────┐
             │     HELD      │ ◄── Enforced by Partial Unique Index
             └───┬───────┬───┘
   Hold Expires  │       │ Payment Verified
   or Cancelled  │       ▼
                 │ ┌───────────┐
                 │ │ CONFIRMED │ (Permanent Booking Allocation)
                 │ └─────┬─────┘
                 │       │ Cancellation / Showtime Cancelled
                 ▼       ▼
             ┌───────────────┐
             │   RELEASED    │ (History preserved; seat returned to available)
             └───────────────┘
```

---

## Implementation Workflows

### 1. Creating a Temporary Seat Hold (Atomically)
1. **Input Validation**: Validate `showtimeId`, array of `seatIds`, and user identity.
2. **Sort Seat IDs**: Order `seatIds` ascending to ensure deterministic row-locking order:
   ```javascript
   const sortedSeatIds = [...seatIds].sort();
   ```
3. **Database Transaction**:
   - Verify `showtime` status is `OPEN_FOR_BOOKING` and target cinema is active.
   - Verify that all requested `sortedSeatIds` physically belong to `showtime.screenId`.
   - Calculate hold expiration: `expiresAt = new Date(Date.now() + HOLD_DURATION_MS)`.
   - Check existing allocations in the transaction:
     ```sql
     SELECT seat_id FROM seat_allocations
     WHERE showtime_id = $showtimeId
       AND seat_id = ANY($sortedSeatIds)
       AND (
         status = 'CONFIRMED'
         OR (status = 'HELD' AND expires_at > NOW())
       )
     FOR UPDATE;
     ```
   - If any seat is returned, abort the transaction immediately and return `409 Conflict` (Inventory Conflict).
   - If all seats are free:
     - Insert/Update records in `seat_allocations` with `status = 'HELD'`, `userId`, `expiresAt`.
     - Create a `seat_hold` parent record with a unique hold token.
4. **Handle Unique Constraint Violations**: If a concurrent transaction acquired one of the seats simultaneously, catch PostgreSQL unique constraint violation `23505` (`P2002` in Prisma) and return a clean `409 Conflict`.

### 2. Confirming a Booking from a Hold (At Checkout)
1. Inside a PostgreSQL transaction:
   - Lock the `seat_hold` and its corresponding `seat_allocations` rows (`FOR UPDATE`).
   - **Check Expiry**: Verify `seat_hold.expiresAt > NOW()`.
   - If expired:
     - Mark hold as `EXPIRED`.
     - Abort confirmation and return `422 Unprocessable Entity` ("Seat hold has expired").
   - **Verify Payment**: Ensure payment attempt is authoritatively verified (`status = 'SUCCEEDED'`).
   - Atomically update all allocations to `status = 'CONFIRMED'`.
   - Create the permanent `Booking` record and immutable `BookingSeat` purchase snapshots (recording purchase-time label, price, and currency).

### 3. Handling Late Payment After Hold Expiry
If a payment webhook or callback arrives after a hold has expired:
1. **Do NOT blindly confirm the booking.**
2. Within a serializable or row-locked transaction:
   - Check if the original seats are still unheld and unconfirmed.
   - **Case A: Seats are free**: Atomically reacquire all seats, create the confirmed booking, and record an audit log of late-payment recovery.
   - **Case B: Seats were taken by another customer**:
     - **NEVER** displace another customer's confirmed booking.
     - Mark the booking as `UNRESOLVED_PAYMENT_CONFLICT`.
     - Automatically trigger a full refund via Flutterwave or escalate to operational support.

### 4. Releasing Seats upon Cancellation or Hold Expiry
1. When a customer explicitly cancels or a background worker cleans expired holds:
   - Update `seat_allocations.status` to `RELEASED`.
   - Never delete historical `BookingSeat` or `seat_allocations` records if tied to a completed or attempted financial transaction.

---

## Verification & Testing Requirements
Before releasing changes to seat allocation:
- Run concurrent simulation tests: 10 parallel requests competing for the exact same seat; exactly 1 must succeed with 200/201 and 9 must fail with 409.
- Run overlapping multi-seat simulation: Request A for [Seat 1, Seat 2] and Request B for [Seat 2, Seat 3] simultaneously; exactly one must claim both seats or roll back entirely.
- Verify hold expiry boundaries at $T - 1\text{ms}$ (allowed) and $T + 1\text{ms}$ (rejected).
- Verify deadlocks do not occur when multiple transactions request disjoint seats in varied order.
