# Matinee — High-Concurrency Cinema Reservation & Ticketing Platform

Matinee is an enterprise-grade mobile cinema ticketing and inventory reservation system built with React Native (Expo), Node.js, Express, PostgreSQL, Prisma, and Redis. It is engineered to maintain data correctness, financial precision, and high availability under extreme surge traffic.

---

## 📌 Deliverables & Project Documentation

| Document | Description |
| :--- | :--- |
| [**`ARCHITECTURE.md`**](file:///Users/mac/git/Matinee%20App/ARCHITECTURE.md) | System topology, database schema, payment state machine, and concurrency invariants |
| [**`TRAFFIC.md`**](file:///Users/mac/git/Matinee%20App/TRAFFIC.md) | Traffic management architecture: Redis atomic holds, waiting room, rate limiting, and SSE |
| [**`SHARDING.md`**](file:///Users/mac/git/Matinee%20App/SHARDING.md) | Horizontal database sharding plan: candidate keys, `cinema_id` justification, and hot shard mitigations |
| [**`COMPONENTS.md`**](file:///Users/mac/git/Matinee%20App/COMPONENTS.md) | Documentation for all 12 design-token UI components in the component library |
| [**`LEARNING-LOG.md`**](file:///Users/mac/git/Matinee%20App/LEARNING-LOG.md) | Technical reflections on concurrency bugs, financial math, and architectural trade-offs |
| [**`LOAD_TEST_REPORT.md`**](file:///Users/mac/git/Matinee%20App/LOAD_TEST_REPORT.md) | k6 load test report: 500 VUs competing for 50 seats, response times, and 0 double-bookings |

---

## 🚀 Key Features

### 1. UI Component Library (12 Design Token Primitives)
- Built strictly with semantic design tokens (`design-tokens.tokens.json`) adapting to **Cinematic Dark** and **Daylight Light** themes.
- Components: `Button`, `Text`, `Card`, `MovieCard`, `Input`, `Chip`, `Badge`, `BottomSheet`, `Skeleton`, `Toast`, `EmptyState`, and `SeatMap`.
- High-capacity `SeatMap` supporting 300+ seats with 60fps pan/zoom and wheelchair-accessible states.
- Living style guide: `ComponentGalleryScreen`.
- Standalone published npm package in `packages/react-native-cinema-seatmap`.

### 2. Payment Lifecycles & Financial Precision
- **Minor Integer Units**: All monetary values stored and processed in kobo (e.g. `₦4,500.00` = `450000`). Zero floating-point rounding errors.
- **Server-Calculated Billing**: Service fee (₦300/ticket) calculated strictly on the backend.
- **Flutterwave Test Mode**: Provider-hosted checkout with authenticated webhook ingestion and signature validation (`verif-hash`).
- **Idempotency Keys**: Guaranteed safe retries for checkout requests.
- **Digital Tickets**: Verifiable ticket codes with base64-encoded QR payloads.
- **Automated Ledger Refunds**: Showtime cancellations record financial ledger entries.

### 3. Traffic Management & Concurrency Control
- **Atomic Seat Holds**: Single-step Redis `SET seat_hold:{showtimeId}:{seatId} {userId} NX EX 600` with 10-minute expiry.
- **Multi-Seat Lua Script**: All-or-nothing atomic reservations across multiple seats.
- **PostgreSQL Safety Net**: Unique constraint on `booking_seats (showtime_id, seat_id)` ensuring zero double-bookings.
- **Virtual Waiting Room**: Token-bucket surge queue gating active users per showtime to 50 active checkouts, admitting queued users at 10 users / 2s.
- **Sliding-Window Rate Limiting**: Per-user and per-IP rate limiting on hold, checkout, and search endpoints.
- **Real-Time Seat Availability**: Server-Sent Events (SSE) stream (`/seats/live`) and fast polling fallback (`/seats/availability`).
- **Graceful Failure**: Structured 429/503 responses with `Retry-After` headers and interactive mobile retry UI.

### 4. Scalability & System Architecture
- **Connection Pooling**: Configured and sized via $(\text{Cores} \times 2) + \text{Spindles}$ to prevent connection exhaustion.
- **Read-Your-Own-Writes (RYOW)**: Primary/Replica database routing with a 5-second session write tracking window in Redis.
- **Durable Background Jobs**: PostgreSQL-backed transactional queue with `FOR UPDATE SKIP LOCKED`, exponential backoff, and stuck-job recovery.
- **Observability**: Request IDs (`X-Request-Id`) across all logs, centralized server error handling, and client crash reporting (`POST /api/v1/telemetry/errors`).

---

## 🛠️ Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Expo Go (or Android Development Build)

### 1. Backend Setup
```bash
cd Backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env

# Apply database migrations
npx prisma migrate deploy

# Seed initial movies, cinemas, screens, and seats
node prisma/seed.js

# Start the backend server
npm run dev
# Server will run on http://localhost:4000
```

### 2. Frontend Setup
```bash
cd Frontend

# Install dependencies
npm install

# Start Expo development server
npx expo start -c
```

### 3. Running Load Tests
```bash
cd Backend

# 1. Seed 500 virtual users and tokens
node tests/setup_load_test.js

# 2. Run k6 surge load test (500 VUs competing for 50 seats)
k6 run tests/k6_traffic_surge.js

# 3. Verify zero double-allocations in PostgreSQL
node tests/verify_concurrency_report.js
```

---

## 📱 Android Development Build & Deployment Links

- **Android Development Build**: Run `npx eas-cli build --profile development --platform android` in `Frontend/` to generate an installable APK via Expo Application Services.
- **Public GitHub Repository**: Configure remote via `git remote add origin https://github.com/tomisinligali/matinee.git` and push.
- **Deployed Backend API**: Configured for deployment on Render / Railway / Fly.io with Docker containerization support.
