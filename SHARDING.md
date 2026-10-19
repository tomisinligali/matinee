# Matinee Database Sharding Architecture (SHARDING.md)

This document defines the horizontal database sharding strategy for Matinee, addressing high-volume surge traffic, tenant isolation, shard key selection, the hot shard dilemma during blockbuster film releases, and production mitigation strategies.

---

## 1. Executive Architecture Summary

Matinee is a high-concurrency cinema ticketing and inventory reservation platform. While single-node PostgreSQL with connection pooling (PgBouncer) and read replicas handles standard operations, national expansion across hundreds of cinema chains and millions of concurrent users requires **horizontal database sharding**.

Sharding partitions large tables across independent physical database instances (shards), distributing CPU, RAM, disk I/O, and lock latch overhead.

---

## 2. Table Categorization

To maintain relational integrity without distributed bottlenecks, database tables are split into two categories:

### A. Global / Reference Tables (Replicated to All Shards)
These tables have high read volumes, low write frequencies, and global relevance. They are kept in sync across all shards via logical replication or broadcast caching:

| Table | Description | Replication Strategy |
| :--- | :--- | :--- |
| `movies` | TMDB metadata, titles, runtimes, posters | Replicated to all shards (Read-only on workers) |
| `cinemas` | Cinema chains, venue names, city metadata | Replicated to all shards |
| `users` | User credentials, roles, profile data | Global Identity Database (or replicated lookup) |

### B. Sharded Transactional Tables (Partitioned Across Shards)
These tables contain the core transactional data and must be horizontally partitioned:

- `screens`
- `seats`
- `showtimes`
- `seat_holds`
- `bookings`
- `booking_seats`
- `payment_attempts`
- `tickets`
- `refund_records`
- `background_jobs`

---

## 3. Shard Key Selection & Analysis

### Shard Key Evaluation Matrix

| Candidate Key | Transactional Colocation | Cross-Shard Joins | Hot Shard Susceptibility | Verdict |
| :--- | :--- | :--- | :--- | :--- |
| `user_id` | Low: Seats and Showtimes separated from Bookings | Extremely High: Reserving a seat requires cross-shard 2PC | Low: Users are evenly distributed | **REJECTED** |
| `showtime_id` | Medium: Screens and Seats decoupled from Showtimes | High: Screen layout queries hit different shards | Severe: Blockbuster showtime hammers 1 shard | **REJECTED** |
| **`cinema_id`** | **Exceptional: 100% of physical venue inventory colocated** | **Zero: All seat reservation transactions local to 1 shard** | **Moderate: Mitigated via Redis & Waiting Room** | **RECOMMENDED** |

### Selected Primary Shard Key: `cinema_id` (Venue-Affinity Sharding)

**Core Rationale**:
In cinema ticketing, physical inventory is bound to a physical location:
- A `Screen` belongs to one `Cinema`.
- A `Seat` belongs to one `Screen` at that `Cinema`.
- A `Showtime` is hosted on one `Screen` at that `Cinema`.
- An active `SeatHold` or `BookingSeat` locks physical seats in that `Cinema`.

By partitioning by **`cinema_id`**, all entities required to complete an atomic seat reservation—verifying screen capacity, checking seat availability, acquiring holds, and persisting booking seats—**reside on the exact same physical database shard**.

```
[API Gateway Router]
       │
       ├─── cinema_id: lekki_imax     ──► [Shard 1: Lagos Flagship Shard]
       ├─── cinema_id: victoria_isle  ──► [Shard 2: Lagos South Shard]
       └─── cinema_id: abuja_central  ──► [Shard 3: Abuja Capital Shard]
```

### Critical Benefit: Elimination of Distributed Transactions (2PC)
Distributed transactions (Two-Phase Commit / 2PC) across database nodes introduce network latency, coordinator single points of failure, and lock serialization bottlenecks. Sharding by `cinema_id` guarantees that **every seat reservation transaction is strictly local to a single PostgreSQL instance**, allowing the database to enforce ACID guarantees and unique constraints with maximum throughput.

### Handling Cross-Shard Queries (Customer Booking History)
The only common query that spans multiple `cinema_id` partitions is a customer retrieving their historical bookings across different cinemas:
`SELECT * FROM bookings WHERE user_id = ?`

**Solution**:
1. **Event-Driven Read Model (CQRS)**: When a booking is confirmed on Shard $N$, a transactional outbox job emits `BookingConfirmedEvent`.
2. An asynchronous projector populates a **Global User Bookings Materialized View** (or Elasticsearch/DynamoDB index) keyed by `user_id`.
3. Customer ticket history queries hit this read-optimized projection without fan-out queries across shards.

---

## 4. The Hot Shard Risk: Blockbuster Friday 10:00 AM

### The Scenario
A flagship cinema (e.g., *Silverbird Galleria IMAX* or *Filmhouse IMAX Lekki*) opens ticket sales for a major blockbuster (*Avengers: Secret Wars*) at 10:00:00 Friday.

At 10:00:00, 5,000+ users simultaneously open the app to book seats for that specific cinema:
1. **Traffic Skew**: 98% of total platform traffic targets **Shard 1** (hosting that `cinema_id`), while Shards 2, 3, and 4 sit at 2% CPU utilization.
2. **Lock Latch Contention**: Thousands of transactions compete for rows in `seat_holds` and `booking_seats` on the same showtime, triggering lock queue saturation in PostgreSQL's lock manager (`pg_locks`).
3. **Connection Starvation**: Direct connections to Shard 1 become exhausted, resulting in timeouts and `503 Service Unavailable` errors.

---

## 5. Architectural Mitigations for the Hot Shard

To protect Shard 1 from overload and prevent cascading failure, Matinee applies a **defense-in-depth mitigation pipeline**:

```
[5,000 Concurrent Users]
          │
          ▼
┌────────────────────────────────────────────────────────┐
│  Layer 1: CDN & Redis Seat Layout Cache (0 DB queries)  │
└────────────────────────────────────────────────────────┘
          │ (Seat map loaded)
          ▼
┌────────────────────────────────────────────────────────┐
│  Layer 2: Sliding-Window Rate Limiting (Blocks bots)   │
└────────────────────────────────────────────────────────┘
          │ (Hold requested)
          ▼
┌────────────────────────────────────────────────────────┐
│  Layer 3: Virtual Waiting Room (Gating surge to 50 TPS)│
└────────────────────────────────────────────────────────┘
          │ (Admitted with token)
          ▼
┌────────────────────────────────────────────────────────┐
│  Layer 4: Redis Atomic SET NX EX (Absorbs 99% clashes) │
└────────────────────────────────────────────────────────┘
          │ (Only hold winners proceed)
          ▼
┌────────────────────────────────────────────────────────┐
│  Layer 5: PgBouncer Transaction Pool + PostgreSQL      │
│  (Safety net unique constraint: showtime_id, seat_id)  │
└────────────────────────────────────────────────────────┘
```

### Mitigation 1: Redis Atomic Hold Layer (`SET NX EX`)
- The database is **never** queried to check seat availability during the surge.
- Reserving a seat uses Redis `SET seat_hold:{showtimeId}:{seatId} {userId} NX EX 600`.
- In a collision for Seat F7 between Zainab, Musa, and 498 others, Redis resolves the winner in sub-millisecond in-memory time.
- The 499 losers receive immediate `409 Conflict` responses without generating a single SQL query or lock on Shard 1.

### Mitigation 2: Virtual Waiting Room Surge Gating
- When active concurrent users on a showtime exceed the shard's optimal concurrency threshold (e.g., 50 active checkout tokens), incoming users enter a **Virtual Waiting Room**.
- Users are held in a Redis Sorted Set queue and admitted at a fixed rate (e.g., 10 users every 2 seconds).
- This transforms a devastating 5,000-request impulse shock into a smooth, manageable stream that Shard 1 processes with sub-50ms latency.

### Mitigation 3: Screen Seat Layout Caching
- Screen seating maps (`cache:screens:{id}:seats`) and movie metadata are cached in Redis with high TTLs.
- Seat map fetches are served entirely from cache (`X-Cache: HIT`), eliminating read pressure from the database shard during browsing.

### Mitigation 4: Connection Pooling via PgBouncer
- Shard 1 is fronted by PgBouncer running in **transaction pooling** mode.
- Even if hundreds of app instances handle requests, the database shard operates with a bounded pool of 15–20 physical PostgreSQL connections (based on `(cores * 2) + spindles`), preventing context-switching penalties and memory exhaustion.

### Mitigation 5: Micro-Sharding / Virtual Partitioning for Extreme Outliers
- For unprecedented global release events (e.g. *Avatar 3*), showtimes within a single flagship cinema can be dynamically assigned a sub-shard route using `hash(showtime_id) % num_subshards`.
- This distributes Screen 1 (IMAX) and Screen 2 (Standard) across separate physical PostgreSQL instances while retaining single-shard transaction boundaries.

---

## 6. Summary Checklist

- [x] Shard key identified and justified: `cinema_id`.
- [x] Global tables segregated from sharded tables.
- [x] Elimination of cross-shard distributed transactions (2PC) verified.
- [x] Hot shard risk (blockbuster surge on a single cinema) fully analyzed.
- [x] Five-layer defense pipeline detailed (Redis atomic holds, waiting room, layout caching, connection pooling, and micro-sharding).
