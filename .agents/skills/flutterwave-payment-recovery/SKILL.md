---
name: flutterwave-payment-recovery
description: >-
  Use this skill when implementing or modifying payment flows, Flutterwave integration, webhooks, refunds, or reconciliation.
  Trigger: Changes involving payment attempts, checkout verification, Flutterwave webhooks, refunds, or financial reconciliation.
  Load when: Implementing or debugging any part of the payment lifecycle.
  Teaches how to persist and verify provider events, deduplicate processing, manage payment and booking states safely, and recover from timeouts, delayed success, and failed refunds.
---

# Flutterwave Payment & Recovery

This skill governs all financial operations, payment integrations, webhook ingestion, and transaction recovery in Matinee using Flutterwave.

All payment operations must comply with `money-billing.md`, `booking-lifecycle.md`, `processing-reliability.md`, and `security.md`. Never trust client-side confirmations as proof of payment.

---

## Core Financial & Architectural Invariants

1. **Integer Minor Units**: All monetary calculations and storage use integer minor units (e.g. kobo for NGN). Never use floating-point types (`0.1 + 0.2 != 0.3`).
2. **Explicit Currency**: Every monetary field must be coupled with an ISO currency code (e.g. `NGN`). Never assume a global default currency.
3. **Persist Payment Attempt Before Checkout**: Create a persistent `payment_attempts` record with a unique `transactionReference` before redirecting the customer or invoking the Flutterwave API.
4. **Authoritative Verification**:
   - A client redirect, URL callback query parameter (`?status=successful`), or screenshot is **NEVER** proof of payment.
   - Payments are verified solely through authenticated Flutterwave webhooks or a server-to-server transaction verification lookup (`GET /v3/transactions/:id/verify`).
5. **Separation of States**: Payment state (`INITIATED`, `PENDING`, `SUCCEEDED`, `FAILED`, `ABANDONED`) is distinct from Booking state (`PENDING_PAYMENT`, `CONFIRMED`, `CANCELLED`, `EXPIRED`).

---

## Detailed Implementation Workflows

### 1. Initiating a Payment Attempt
1. Compute the total amount on the server by summing ticket prices, taxes, and approved platform fees in integer minor units. Never accept a client-calculated total.
2. In a transaction, record a new `payment_attempts` row:
   - `id`: Unique UUID
   - `bookingId`: Associated booking ID
   - `txRef`: Unique idempotent transaction reference (e.g. `MATINEE-TX-${bookingId}-${timestamp}`)
   - `amountMinor`: Integer amount
   - `currency`: ISO currency code
   - `status`: `INITIATED`
3. Dispatch request to Flutterwave Standard Hosted Checkout or initialize payment, obtaining the provider checkout URL.

### 2. Secure Webhook Processing & Deduplication
Flutterwave notifies our backend of payment events via HTTP POST webhooks.
1. **Authenticate Webhook**:
   - Inspect the `verif-hash` header on the incoming HTTP request.
   - Compare `verif-hash` with the server-side environment secret `FLUTTERWAVE_SECRET_HASH` using timing-safe comparison (`crypto.timingSafeEqual`).
   - If invalid, reject immediately with `401 Unauthorized` without reading payload.
2. **Persist & Deduplicate Event**:
   - Extract the event identifier (e.g. `event.id` or Flutterwave transaction ID).
   - In a transaction, insert into `webhook_events` table with unique constraint on `(provider, event_id)`.
   - If a duplicate event arrives, respond with `200 OK` immediately and skip re-processing.
3. **Server-to-Server Verification**:
   - Do not rely solely on the webhook payload body.
   - Query Flutterwave's verification endpoint: `GET https://api.flutterwave.com/v3/transactions/${id}/verify`.
   - Validate that:
     1. `response.data.status === 'successful'`
     2. `response.data.tx_ref === payment_attempt.txRef`
     3. `response.data.amount * 100 === payment_attempt.amountMinor` (convert provider major units to minor integer safely)
     4. `response.data.currency === payment_attempt.currency`
4. **Execute Booking Confirmation**:
   - If verification succeeds, invoke the domain confirmation transaction (allocating seats permanently and setting booking to `CONFIRMED`).
   - Return `200 OK` to Flutterwave.

### 3. Recovery Workflows

#### A. Lost Redirect or App Closure (Polling / Re-check)
When a user reopens the app or arrives on the order status screen without a webhook yet received:
1. Endpoint `GET /api/v1/bookings/:id/status` checks current DB state.
2. If payment is still `INITIATED` or `PENDING`:
   - If an external transaction ID exists, trigger a background server-side verification lookup against Flutterwave.
   - Return the authoritative database status. Do not stall client requests.

#### B. Late Payment After Hold Expiry
1. A webhook arrives confirming payment, but the booking hold expired 2 minutes ago.
2. The server attempts to reacquire all original seats within a transaction.
3. **If seats are still available**: Reacquire seats, transition booking to `CONFIRMED`, and log late payment recovery.
4. **If seats were already booked by another user**:
   - Mark payment attempt as `SUCCEEDED_AFTER_EXPIRY`.
   - Mark booking as `NEEDS_REFUND_INVENTORY_TAKEN`.
   - Atomically create a durable `refund_records` row and queue an automated refund job.

#### C. Initiating and Retrying Refunds
1. Record `refund_records` with:
   - `id`: Unique UUID
   - `paymentAttemptId`: Original payment attempt
   - `amountMinor`: Refund amount
   - `currency`: Currency
   - `status`: `PENDING`
   - `idempotencyKey`: Unique refund request key
2. Call Flutterwave Refund API (`POST /v3/transactions/:id/refund`).
3. If network times out, mark status as `UNKNOWN_RETRY` and hand off to durable background worker for reconciliation. Never duplicate refund requests.

---

## Prohibited Shortcuts & Anti-Patterns
- **NO Client-Side Amount Trust**: Never allow the client to send the price, fee, or total amount to charge.
- **NO Skipping Secret Hash**: Never process a webhook without timing-safe secret hash authentication.
- **NO Fake Payment Successes**: Never mock or hardcode payment success in production code paths.
- **NO Storing Raw Card Details**: Matinee relies entirely on Flutterwave hosted tokens or checkout; never store PAN, CVV, or card PIN.
