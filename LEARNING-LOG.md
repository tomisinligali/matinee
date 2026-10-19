# Matinee Engineering Learning Log (LEARNING-LOG.md)

This engineering log documents the architectural challenges, technical trade-offs, concurrency bugs resolved, and key lessons learned throughout the development of Matinee.

---

## 1. UI Components & Design Token Disciplines

### The Challenge
Early mobile applications frequently suffer from visual fragmentation: developers hardcode arbitrary hex colors (`#7E2CDE`, `#1A1A1A`) and font sizes (`fontSize: 15`, `fontSize: 18`) across disparate screens. When introducing dark mode or rebranding, components break and contrast fails WCAG accessibility standards.

### The Solution & Learning
- **Strict Token Pipelines**: We generated CSS and JavaScript token trees directly from `design-tokens.tokens.json`. Components never access primitive palette colors directly; they only consume semantic roles (`--color-primary`, `--color-surface-container`, `--color-on-surface`).
- **High-Capacity SeatMap Optimization (300+ Seats)**:
  Rendering 300+ individual SVG/View seat nodes caused frame drops during modal presentation. We solved this by:
  1. Memoizing individual `Seat` components with `React.memo` and customized `areEqual` comparisons (re-rendering only the specific seat whose state toggled).
  2. Separating layout metadata from dynamic selection state to minimize garbage collection overhead.

---

## 2. Financial Precision & Payment Lifecycles

### The Trap: Floating-Point Math in Billing
In JavaScript, floating-point arithmetic introduces silent rounding errors:
```javascript
0.1 + 0.2 = 0.30000000000000004
```
In cinema billing, multiplying unit ticket prices by seat counts and percentage service fees using floating-point values leads to off-by-one discrepancies, ledger imbalances, and payment gateway rejections.

### The Solution
- **Minor Units Everywhere**: All ticket prices, service fees, discounts, and order totals are strictly represented as integers in the smallest currency minor unit (e.g. `kobo` for NGN, `cents` for USD).
- **Server-Calculated Billing**: The client is never trusted to calculate fees or totals. When creating checkout, the server re-queries showtime ticket prices, calculates the platform service fee (₦300/seat), and persists the authoritative total.

### Payment State Machine & Webhook Security
- **Never Trust Client Redirects**: A mobile client reporting "Payment Successful" from a WebView redirect or callback parameter is easily spoofed or intercepted.
- **Authoritative Confirmation**: Bookings transition from `PENDING_PAYMENT` to `CONFIRMED` **only** upon receiving an authenticated, signature-verified webhook from Flutterwave.
- **Idempotency Keys**: Network timeouts often cause users to tap "Pay" multiple times. By requiring an `Idempotency-Key` header and enforcing database uniqueness on `bookings.idempotency_key`, duplicate requests safely return the existing booking without creating duplicate payment attempts.

---

## 3. Concurrency, Race Conditions, & Atomic Holds

### The "Zainab & Musa" Concurrency Bug
The classic double-booking bug occurs when the application relies on an application-level read-then-write pattern:
1. Zainab requests Seat F7. Server queries `SELECT status FROM seats WHERE id = 'F7'`. Result: Available.
2. Musa requests Seat F7. Server queries `SELECT status FROM seats WHERE id = 'F7'`. Result: Available.
3. Server marks F7 as reserved for Zainab.
4. Server marks F7 as reserved for Musa.
Both users arrive at the cinema with tickets for the same physical seat.

### The Solution
- **Single-Step Atomic Hold in Redis**:
  Using Redis `SET seat_hold:{showtimeId}:{seatId} {userId} NX EX 600`, checking availability and reserving the seat occurs in a **single atomic CPU operation**. The first request gets `OK`; the second gets `null` and an immediate `409 Conflict`.
- **All-or-Nothing Multi-Seat Reservations**:
  Users frequently book 2 to 6 seats at once. Reserving sequentially in a loop risks partial deadlocks (User A holds F7, User B holds F8; neither can complete). We resolved this with an **atomic Lua script** that validates that *all* requested keys are free before setting any of them.
- **PostgreSQL Unique Constraint Safety Net**:
  Even if Redis crashed or evicted keys, PostgreSQL enforces:
  ```sql
  CREATE UNIQUE INDEX "booking_seats_showtime_id_seat_id_key" ON "booking_seats" ("showtime_id", "seat_id");
  ```
  This provides mathematical certainty against double-selling.

---

## 4. Traffic Management & Surge Protection

### Rate Limiting vs. Virtual Waiting Rooms
Under extreme blockbuster release surges (5,000 concurrent users), sliding-window rate limiting alone is insufficient—it simply rejects excess users with 429 errors, degrading user experience.

- **Virtual Waiting Room**:
  We introduced an admission gatekeeper using Redis Sorted Sets. When active checkout users exceed 50, excess arrivals enter a queue. The app shows their exact position and estimated wait time, admitting 10 users every 2 seconds. This transforms a devastating shockwave into a smooth, steady pipeline.
- **Server-Sent Events (SSE) vs. WebSockets**:
  We evaluated WebSockets vs SSE for real-time seat map availability updates. We selected **SSE (`text/event-stream`)** because:
  1. Seat map updates are strictly unidirectional (server $\rightarrow$ client).
  2. SSE runs over standard HTTP/2, avoiding WebSocket upgrade handshakes and stateful connection drops on mobile cellular networks.

---

## 5. Background Jobs & Processing Reliability

### Anti-Pattern: In-Memory Queues
Using in-memory arrays or unhandled promises (`setTimeout`, `setImmediate`, `fetch().then()`) for critical asynchronous tasks (webhook ingestion, refunds) causes data loss whenever the server crashes, reboots, or autoscales.

### The Solution: Transactional Outbox Pattern
We implemented a durable PostgreSQL `background_jobs` table:
1. Webhooks are ingested, authenticated, saved to `webhook_events`, and enqueued as durable jobs.
2. Background workers claim jobs using PostgreSQL `FOR UPDATE SKIP LOCKED`, preventing multiple workers from duplicating tasks.
3. Stuck jobs from worker crashes are detected via `locked_at < NOW() - INTERVAL '5 minutes'` and reclaimed automatically.

---

## 6. Database Scalability & Sharding Strategy

### The Shard Key Dilemma
We analyzed whether to shard by `user_id`, `showtime_id`, or `cinema_id`:
- Sharding by `user_id` breaks seat availability transactions across screens.
- Sharding by **`cinema_id`** co-locates screens, seats, showtimes, holds, and bookings on the same physical shard. All seat allocation ACID transactions remain 100% local, eliminating distributed 2-Phase Commit (2PC) bottlenecks.
- The **Hot Shard Risk** (a single flagship cinema experiencing 100x traffic for an IMAX blockbuster) is mitigated through our multi-tier defense: Redis caching, virtual waiting room gating, and Redis atomic holds.
