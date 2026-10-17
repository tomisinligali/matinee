---
name: booking-integrity-test-engineer
description: >-
  Use this skill when writing or reviewing tests for booking, seat allocation, payment, refund, or recovery workflows.
  Trigger: Changes to booking, seat allocation, payment, refund, or recovery behavior.
  Load when: Writing or reviewing regression, integration, concurrency, and failure-recovery tests for these workflows.
  Teaches how to construct competing requests and failure scenarios, verify persisted state and invariants, and demonstrate that retries and recovery do not produce duplicate allocations or hidden financial inconsistencies.
---

# Booking Integrity Test Engineer

This skill establishes the testing strategy, harness construction, and verification requirements for Matinee's highest-risk operations: booking, seat allocation, payment processing, and failure recovery.

As required by `coding-standard.md`, `scheduling-integrity.md`, and `booking-lifecycle.md`, unit tests and mocks alone are insufficient for verifying concurrency, database constraints, or financial invariants. Integration tests against a real PostgreSQL instance are mandatory.

---

## The 6 Mandatory Test Suites

Every pull request or modification affecting inventory, booking, or financial state must include or pass the following test suites:

---

### Suite 1: Concurrent Seat Contention (Zero Double-Allocation)
**Objective**: Prove that concurrent transactions competing for the exact same seat cannot both succeed.

**Test Construction**:
1. Seed a test cinema, screen, showtime, and configured seats.
2. Spawn $N \ge 10$ concurrent asynchronous hold requests (via `Promise.allSettled`) targeting the exact same `seatId` for that `showtimeId`.
3. **Assertions**:
   - Exactly **1** request receives HTTP `200/201 Created` with a valid hold token.
   - Exactly **$N - 1$** requests receive HTTP `409 Conflict` (Inventory Conflict).
   - In PostgreSQL, query `SELECT COUNT(*) FROM seat_allocations WHERE showtime_id = $id AND seat_id = $seatId AND status IN ('HELD', 'CONFIRMED');` — must assert count equals **1**.

---

### Suite 2: Multi-Seat Atomic Allocation & Overlap
**Objective**: Prove that multi-seat allocations either secure all requested seats or none, leaving zero partial holds.

**Test Construction**:
1. Concurrently launch two multi-seat requests with partial overlap:
   - Request A requests seats `['A1', 'A2', 'A3']`.
   - Request B requests seats `['A3', 'A4', 'A5']`.
2. **Assertions**:
   - One request succeeds completely (holds all 3 of its seats).
   - The other request fails cleanly with `409 Conflict`.
   - No partial holds exist (e.g. Request B must NOT hold `'A4'` and `'A5'` while failing on `'A3'`).

---

### Suite 3: Hold Expiry Boundaries & Reclamation
**Objective**: Prove authoritative expiry enforcement and reclamation by subsequent customers.

**Test Construction**:
1. Create a hold for Seat `B1` with `expiresAt` set to 500ms in the future.
2. Assert hold is valid at $T - 100\text{ms}$.
3. Wait 600ms (database time exceeds expiry).
4. **Sub-test A (Late checkout attempt)**: Customer attempts checkout on the expired hold; assert rejection with `422 Unprocessable Entity` ("Hold expired").
5. **Sub-test B (Reclamation)**: A new customer requests a hold on Seat `B1`; assert immediate success (`200 OK`) and new hold created.

---

### Suite 4: Webhook Deduplication, Out-of-Order, & Retries
**Objective**: Prove that duplicated, delayed, or replayed payment events do not duplicate bookings or corrupt financial state.

**Test Construction**:
1. Generate an authentic Flutterwave webhook event payload for a successful transaction.
2. Send the webhook payload to `POST /api/v1/payments/flutterwave/webhook`. Assert `200 OK` and booking is marked `CONFIRMED`.
3. Re-send the exact same webhook payload 3 consecutive times.
4. **Assertions**:
   - Every retry returns `200 OK`.
   - Booking remains `CONFIRMED` without duplicate seat allocations or duplicate tickets.
   - Only 1 row exists in `webhook_events` for this provider event ID.
   - Audit log records deduplicated replay.

---

### Suite 5: Late Payment with Seat Taken Elsewhere (Refund Trigger)
**Objective**: Prove that if payment succeeds after hold expiry and the seat was claimed by another customer, the existing customer is never displaced and a refund is generated.

**Test Construction**:
1. User 1 holds Seat `C1`. Hold expires.
2. User 2 immediately holds and confirms Seat `C1`.
3. Flutterwave webhook arrives confirming payment for User 1's expired hold.
4. **Assertions**:
   - User 2's confirmed booking on Seat `C1` is **NOT** displaced.
   - User 1's booking transitions to `UNRESOLVED_PAYMENT_CONFLICT` or `NEEDS_REFUND`.
   - A row is inserted in `refund_records` for User 1 with the exact integer amount and currency paid.
   - High-severity operational audit event is emitted.

---

### Suite 6: Idempotency Key Fingerprint Conflicts
**Objective**: Prove that reusing an idempotency key with differing payload parameters is rejected.

**Test Construction**:
1. Send `POST /api/v1/bookings/checkout` with header `Idempotency-Key: KEY_123` and payload `{ seats: ['D1'], amount: 5000 }`. Assert `200/201`.
2. Re-send identical request with same header and payload. Assert identical cached response is returned without re-executing charges.
3. Send request with same header `Idempotency-Key: KEY_123` but altered payload `{ seats: ['D2'], amount: 8000 }`.
4. **Assertions**:
   - Request is rejected with `409 Conflict` or `422 Unprocessable Entity` ("Idempotency key payload mismatch").

---

## Concurrency Test Harness Template

```javascript
describe('Booking Concurrency Test Suite', () => {
  it('prevents double allocation when 10 users compete for the same seat', async () => {
    const showtime = await seedShowtime();
    const seatId = showtime.screen.seats[0].id;

    const attempts = Array.from({ length: 10 }).map((_, i) =>
      request(app)
        .post(`/api/v1/showtimes/${showtime.id}/holds`)
        .set('Authorization', `Bearer ${generateToken({ userId: `user-${i}` })}`)
        .send({ seatIds: [seatId] })
    );

    const results = await Promise.all(attempts);

    const successCount = results.filter(r => r.status === 201).length;
    const conflictCount = results.filter(r => r.status === 409).length;

    expect(successCount).toBe(1);
    expect(conflictCount).toBe(9);

    const dbAllocations = await prisma.seatAllocations.count({
      where: {
        showtimeId: showtime.id,
        seatId: seatId,
        status: { in: ['HELD', 'CONFIRMED'] }
      }
    });

    expect(dbAllocations).toBe(1);
  });
});
```

---

## Prohibited Testing Shortcuts
- **NO Mocks for Database Integrity**: Never mock Prisma or PostgreSQL when validating concurrency, constraints, or transactions.
- **NO Ignoring Failures**: Never skip or disable flaky concurrency tests. Fix race conditions in SQL transactions.
- **NO Floating-Point Currency Assertions**: Always assert integer minor units (`amount === 5000`, never `50.00`).
