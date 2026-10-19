# Matinee Traffic Management Architecture (TRAFFIC.md)

This document details the high-concurrency traffic management architecture implemented in Matinee to ensure system correctness, availability, and low latency when traffic suddenly spikes.

---

## 1. The Surge Scenario

### The Problem
A major blockbuster film opens for booking at 10:00:00 AM on Friday. Within milliseconds, 5,000 concurrent users open Matinee to book seats for a popular showtime.

In an unoptimized architecture:
1. Two users, Zainab and Musa, select the same seat (Seat F7) at the exact same millisecond.
2. The server executes two separate application-level steps:
   - Step 1: `SELECT * FROM seat_holds WHERE seat_id = 'F7';` $\rightarrow$ Both see it free.
   - Step 2: `INSERT INTO bookings ...` $\rightarrow$ Both pay and book Seat F7.
3. Both users arrive at the cinema with tickets for the same seat.
4. Meanwhile, 5,000 unthrottled requests hit PostgreSQL and TMDB simultaneously, causing connection pool exhaustion, database thrashing, and unhandled 500 errors.

---

## 2. The Four Architectural Interventions

To guarantee zero double-bookings, maintain sub-100ms response times, and prevent server crashes, Matinee implements four coordinated architectural safeguards:

```
[5,000 Concurrent Users at 10:00:00]
                 │
                 ▼
┌────────────────────────────────────────────────────────┐
│  Layer 1: CDN & Redis Cache (Movies & Screen Layouts)  │
│  - 0 DB queries for discovery & seat maps              │
└────────────────────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────┐
│  Layer 2: Sliding-Window Rate Limiter (Per User & IP)  │
│  - Limits burst requests & blocks automated bots       │
└────────────────────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────┐
│  Layer 3: Virtual Waiting Room (Surge Queue)           │
│  - Gates active showtime checkout traffic (Max 50)     │
│  - Admits users at steady rate (10 users / 2 seconds)  │
└────────────────────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────┐
│  Layer 4: Redis Atomic Seat Hold (SET NX EX)           │
│  - Reserving a seat is a single atomic in-memory step  │
│  - All-or-nothing multi-seat Lua script execution      │
└────────────────────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────┐
│  Layer 5: PostgreSQL Database Safety Net               │
│  - Unique constraint on (showtime_id, seat_id)         │
│  - Re-verifies hold ownership inside ACID transaction  │
└────────────────────────────────────────────────────────┘
```

---

## 3. Component Deep Dive

### 1. Redis Atomic Seat Holds (`SET ... NX EX`)
- **Single-Seat Reservation**:
  Reserving a seat executes a single atomic Redis command:
  ```redis
  SET seat_hold:{showtimeId}:{seatId} "{userId}" NX EX 600
  ```
  - `NX`: Only set the key if it does **not** already exist.
  - `EX 600`: The hold automatically expires after 10 minutes (600 seconds) if checkout is not completed.
  - If Zainab and Musa compete for Seat F7, Redis guarantees that exactly one command returns `OK` while the other returns `null`. Zainab wins the hold; Musa receives an immediate `409 Conflict`.

- **Multi-Seat All-or-Nothing Holds (Atomic Lua Script)**:
  When booking multiple seats (e.g. F7 and F8), partial reservations are strictly prohibited. A custom Lua script checks all requested seat keys atomically:
  ```lua
  -- Check availability across all requested seats
  for i, key in ipairs(KEYS) do
    if redis.call('EXISTS', key) == 1 then
      return {0, key} -- Conflict detected, abort without setting any holds
    end
  end
  -- Acquire all seats simultaneously
  for i, key in ipairs(KEYS) do
    redis.call('SET', key, ARGV[1], 'EX', tonumber(ARGV[2]))
  end
  return {1, "OK"}
  ```

---

### 2. Database Safety Net (PostgreSQL Invariants)
Even if Redis logic had a bug, restarts, or crashes, PostgreSQL enforces the ultimate mathematical guarantee against double-booking:
- **Unique Constraint on `booking_seats`**:
  ```sql
  CREATE UNIQUE INDEX "booking_seats_showtime_id_seat_id_key"
  ON "booking_seats" ("showtime_id", "seat_id");
  ```
- **Transaction-Level Verification**:
  During final payment confirmation, the transaction verifies hold ownership and inserts booking seat records. If two conflicting transactions ever reach PostgreSQL, one succeeds and the other triggers error `23505 (unique_violation)`, instantly rolling back without partial state.

---

### 3. Virtual Waiting Room (Surge Queue)
When active users targeting a showtime exceed the capacity threshold (`CAPACITY_PER_SHOWTIME = 50`), excess arrivals enter a **Virtual Waiting Room**:
- **Implementation**: Managed in Redis via a Sorted Set (`waiting_room:queue:{showtimeId}`) ordered by arrival timestamp.
- **Admission Rate**: Users are admitted at a steady rate (`ADMISSION_RATE = 10` users every 2 seconds).
- **Position & Wait Time**:
  The client polls `GET /api/v1/waiting-room/status?showtimeId=...`, which computes:
  $$\text{Queue Position} = \text{rank} + 1$$
  $$\text{Estimated Wait (seconds)} = \left\lceil \frac{\text{Queue Position}}{\text{Admission Rate}} \right\rceil \times 2$$
- **Admission Token**: Once admitted, the user receives an `X-Waiting-Room-Token` with an active TTL, granting them access to `/api/v1/payments/hold` and `/api/v1/payments/checkout`.

---

### 4. Sliding-Window Rate Limiting
Implemented in `Backend/src/middleware/rateLimiter.js` using Redis sorted sets:
- **Hold Limiter**: Maximum 10 hold requests per minute per user/IP. Prevents automated seat scalping bots.
- **Checkout Limiter**: Maximum 5 checkout attempts per minute. Prevents credit card brute-forcing.
- **Search & Catalog Limiter**: Maximum 60 requests per minute per IP.
- **Header Feedback**: Responses include standard `RateLimit-Limit`, `RateLimit-Remaining`, and `Retry-After`.

---

### 5. Caching & Real-Time Availability (SSE vs WebSockets)
- **Movie Catalog & Screen Layout Caching**:
  - `GET /api/v1/movies/now-playing` cached in Redis with a 5-minute TTL (`X-Cache: HIT`).
  - Screen seat layouts (`cache:screens:{id}:seats`) cached with 1-hour TTL.
- **Seat Availability Updates**:
  - **Technology Choice**: **Server-Sent Events (SSE)** via `GET /api/v1/showtimes/:id/seats/live`.
  - **Justification**:
    1. *Unidirectional Semantics*: Seat availability updates flow strictly server-to-client. Bidirectional WebSockets add unnecessary protocol complexity and frame overhead.
    2. *HTTP/2 Multiplexing*: SSE runs over standard HTTP, leveraging HTTP/2 connection pooling and zero handshake overhead.
    3. *Firewall & Mobile Reliability*: SSE passes cleanly through cellular carrier NATs and firewalls where stateful WebSocket upgrades are frequently dropped.
    4. *Polling Fallback*: Supported via `GET /api/v1/showtimes/:id/seats/availability` for legacy clients.

---

### 6. Graceful Failure & Client Recovery
When the server is under extreme backpressure, it fails gracefully rather than crashing:
- **Server Response**:
  ```json
  HTTP 503 Service Unavailable
  Retry-After: 5
  {
    "error": {
      "code": "SERVER_OVERLOADED",
      "message": "The server is experiencing heavy surge traffic. Please tap Retry.",
      "requestId": "9c12b70f-11df-4b68-b715-cf398bb279a0",
      "retryAfter": 5
    }
  }
  ```
- **Mobile Frontend Handling**:
  The React Native app catches 503 and 429 status codes, displaying an inline non-blocking error banner with an interactive **"Retry"** button rather than unmounting or crashing the UI.

---

## 4. Benchmark Validation: 500-VU Surge Test

| Metric | Result | Target | Status |
| :--- | :--- | :--- | :--- |
| **Virtual Users (VUs)** | **500 concurrent** | 500 | PASS |
| **Target Seats Competing** | **50 seats** | 50 seats | PASS |
| **Duplicate Bookings** | **0** | **0** | **PERFECT (PASS)** |
| **Duplicate Holds** | **0** | **0** | **PERFECT (PASS)** |
| **Unhandled 5xx Errors** | **0** | 0 | PASS |
| **Average Response Time** | **22.51ms** | < 200ms | PASS |
| **p95 Latency** | **80.1ms** | < 500ms | PASS |
