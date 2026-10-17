# MATINEE --- PRODUCT REQUIREMENTS DOCUMENT (REVISED)

**Document status:** Revised draft --- implementation planning\
**Version:** 2.0\
**Purpose:** Define the product, operational rules, data model, and
testable requirements for Matinee. This document does not authorize
public launch until the blocking decisions and launch gates below are
satisfied.

## 1. Product Summary

### 1.1 Vision and value proposition

Matinee is a mobile cinema ticket-booking app that lets moviegoers
discover films, compare participating cinemas and showtimes, select
seats, pay, and access confirmed tickets. Cinema operators manage their
cinema inventory and screenings through an administrative interface.
Platform administrators support operations, investigate incidents, and
manage platform-level access.

The product aims to make cinema booking convenient while protecting seat
inventory and keeping booking and payment outcomes consistent through
retries, timeouts, and delayed provider notifications.

### 1.2 Data ownership

-   **TMDB** supplies movie metadata and images only. It is not the
    authority for cinema showtimes, prices, seat availability, bookings,
    or payments.
-   **Matinee's PostgreSQL database** is authoritative for
    Matinee-managed cinemas, screens, seats, showtimes, prices, holds,
    allocations, bookings, payment attempts, and refunds.
-   Cinema inventory must be entered by authorized operators or imported
    through an explicitly approved integration.
-   Missing or unavailable TMDB metadata must not prevent an otherwise
    valid screening from being managed.
-   Before ticket sales begin, each participating cinema must agree to
    an inventory-management and conflict-resolution process.

### 1.3 Target users

-   Moviegoers looking for films, showtimes, seats, and tickets.
-   Cinema operators managing inventory and screenings.
-   Platform administrators handling support, safety, and operational
    issues.

### 1.4 Launch dependency

Public ticket sales require at least one participating cinema with
validated inventory, an agreed booking-ownership model, an approved
payment and settlement model, and a documented process for resolving
conflicts with any other ticketing channel.

## 2. Problem Statement

Moviegoers may face fragmented discovery and booking experiences,
unclear seat availability, and uncertainty when payments or
confirmations are delayed. Cinema operators may need a manageable way to
publish inventory and handle bookings across channels.

These are **hypotheses to validate**, not established findings. Before
committing to the full MVP, conduct discovery with prospective
moviegoers and cinema operators in the proposed launch market. Document
current booking methods, customer pain points, inventory ownership,
existing ticketing systems, willingness to participate, and commercial
expectations.

Proceed to the full build only when agreed validation criteria are met
and at least one credible cinema pilot path is identified.

## 3. Goals and Non-Goals

### 3.1 MVP goals

1.  Let users browse movies, participating cinemas, and published
    showtimes.
2.  Let users select seats and acquire temporary holds safely.
3.  Support checkout through one approved payment provider.
4.  Confirm bookings only after seats are secured and payment is
    verified according to the provider's documented flow.
5.  Let customers retrieve booking status and tickets after app closure,
    timeouts, or delayed notifications.
6.  Give cinema operators minimum tools to manage screens, seats,
    prices, and showtimes.
7.  Give platform staff the tools needed to investigate bookings,
    payments, refunds, and inventory incidents.
8.  Provide reliable monitoring, reconciliation, and recovery
    procedures.

### 3.2 MVP non-goals

-   AI features or AI-based decisions in critical workflows.
-   Microservices architecture.
-   Advanced cinema analytics, promotional campaigns, loyalty
    programmes, complex role customization, and sophisticated
    bulk-editing tools.
-   Multi-provider payment routing unless required by the validated
    launch model.
-   Unsupported integrations with external cinema ticketing systems.

### 3.3 Scope rule

A feature may be simplified or deferred only if doing so does not make
paid bookings unsafe, untraceable, or operationally unmanageable.
Cancellation and refund flows required by the approved launch policy are
MVP requirements.

## 4. User Personas and Permissions

  -----------------------------------------------------------------------
  Persona                 Needs                   MVP permissions and
                                                  boundaries
  ----------------------- ----------------------- -----------------------
  Moviegoer               Discover films and      Browse publicly; manage
                          screenings, select      only their own bookings
                          seats, pay, access      and permitted
                          tickets, review booking cancellation/refund
                          history                 requests

  Cinema owner/manager    Maintain cinema         Access explicitly
                          information, screens,   assigned cinemas;
                          seats, pricing, and     perform only permitted
                          showtimes; review       inventory and booking
                          bookings                operations

  Platform                Investigate incidents,  Privileged actions
  administrator/support   manage platform-level   require authorization
                          access, suspend         and audit logs; access
                          cinemas, resolve        to payment data must be
                          escalations             limited
  -----------------------------------------------------------------------

### 4.1 Account and operator lifecycle

-   Operator access must be tied to an explicit cinema membership and
    fixed MVP roles.
-   Revoking a membership immediately blocks future administrative
    access but does not delete historical bookings or payments.
-   Cinema suspension prevents new bookings according to policy but does
    not automatically invalidate confirmed tickets.
-   Ownership changes, membership revocations, suspensions, and
    reinstatements must be audited.
-   Existing bookings must remain accessible to authorized support staff
    after an operator loses access.

## 5. Functional Requirements

Priority: **P0** = required for launch; **P1** = post-MVP unless
discovery establishes otherwise.

  ------------------------------------------------------------------------------
  ID                Requirement       Priority          Acceptance criteria and
                                                        edge cases
  ----------------- ----------------- ----------------- ------------------------
  FR-01             Movie discovery   P0                Users can browse without
                                                        signing in. TMDB
                                                        metadata/images are
                                                        displayed when
                                                        available. Missing
                                                        metadata is handled
                                                        gracefully.

  FR-02             Search and        P0                Users can search movies
                    filters                             and filter by
                                                        participating cinema,
                                                        date, and available
                                                        showtimes. Empty results
                                                        are clear and do not
                                                        imply an error.

  FR-03             Movie details     P0                Show available metadata,
                                                        synopsis, images, and
                                                        participating showtimes.
                                                        External metadata never
                                                        determines booking
                                                        availability.

  FR-04             Cinema and        P0                Authorized operators can
                    showtime                            create/edit cinemas,
                    administration                      screens, seats, prices,
                                                        and showtimes. The
                                                        server validates dates,
                                                        screen assignment,
                                                        pricing, and publication
                                                        state.

  FR-05             Published         P0                Only published, bookable
                    showtime                            showtimes are offered.
                    discovery                           Cancelled, expired,
                                                        suspended, or invalid
                                                        showtimes cannot enter
                                                        checkout.

  FR-06             Interactive seat  P0                The UI distinguishes
                    map                                 available,
                                                        held/unavailable, and
                                                        booked seats. Displayed
                                                        availability is advisory
                                                        until the server grants
                                                        a hold.

  FR-07             Temporary seat    P0                A hold is created
                    holds                               atomically for all
                                                        requested seats or none.
                                                        The server returns an
                                                        expiry timestamp. At or
                                                        after expiry, the hold
                                                        cannot be used to
                                                        confirm a booking,
                                                        regardless of
                                                        cleanup-job timing.

  FR-08             Checkout          P0                The server revalidates
                    validation                          user/guest ownership,
                                                        showtime status, seat
                                                        allocation, expiry,
                                                        price, and currency
                                                        before proceeding.
                                                        Client-supplied prices
                                                        are never authoritative.

  FR-09             Payment           P0                Each payment attempt is
                    initiation and                      durable and idempotent.
                    verification                        A client redirect or
                                                        success message is not
                                                        proof of payment. The
                                                        server verifies provider
                                                        status using
                                                        authenticated provider
                                                        data and/or a provider
                                                        API lookup.

  FR-10             Booking           P0                A booking is confirmed
                    confirmation and                    only when required
                    recovery                            inventory is secured and
                                                        payment is verified.
                                                        Customers can retrieve
                                                        status after app
                                                        closure, lost responses,
                                                        or delayed webhooks.

  FR-11             Booking history   P0                Customers can view their
                    and ticket access                   own bookings and current
                                                        ticket status.
                                                        Historical purchased
                                                        seat labels and prices
                                                        remain accurate if
                                                        cinema configuration
                                                        later changes.

  FR-12             Cancellation and  P0                Eligibility, deadline,
                    refunds                             fees, refund route, and
                                                        status follow the
                                                        approved policy. Failed
                                                        or pending refunds
                                                        remain visible and
                                                        recoverable.

  FR-13             Notifications     P0                Booking/payment
                                                        notifications are sent
                                                        through a retryable
                                                        process. Notification
                                                        failure does not reverse
                                                        booking state; tickets
                                                        remain accessible
                                                        in-app.

  FR-14             Administration    P0                Authorized staff can
                    and support                         inspect
                                                        booking/payment/refund
                                                        status and take
                                                        permitted recovery
                                                        actions. Sensitive
                                                        actions are audited.

  FR-15             Cinema suspension P0                Suspended cinemas cannot
                    and changes                         accept new bookings.
                                                        Existing confirmed
                                                        bookings remain recorded
                                                        and follow the
                                                        customer-resolution
                                                        policy.

  FR-16             Audit trail       P0                Critical changes to
                                                        inventory, roles,
                                                        showtimes, bookings,
                                                        payment reconciliation,
                                                        and refunds record
                                                        actor, time, action, and
                                                        relevant correlation
                                                        IDs.

  FR-17             Advanced          P1                Deferred until core
                    analytics and                       booking reliability and
                    promotions                          product-market
                                                        assumptions are
                                                        validated.
  ------------------------------------------------------------------------------

### 5.1 API acceptance requirements

Every booking-critical endpoint must document request/response schemas,
authentication and authorization rules, validation, idempotency scope,
error codes, and retry behaviour.

At minimum, clients must be able to distinguish: - Inventory conflict or
seat no longer available. - Hold expired. - Invalid or cancelled
showtime. - Payment pending or outcome unknown. - Payment failed or
declined. - Booking confirmed. - Refund pending, failed, or completed.

The app must not encourage a second independent payment attempt while
the first attempt's outcome is unresolved.

## 6. AI Processing Pipeline

AI is **out of scope for the MVP**. No model, inference service, vector
database, or AI processing pipeline is required.

Seat allocation, availability, pricing, payment verification, booking
confirmation, cancellations, and refunds must use deterministic,
auditable business rules. AI must not override these decisions.

Any future AI feature requires a separate proposal specifying the user
problem, measurable benefit, operating cost, privacy/security
implications, fallback behaviour, and evaluation method.

## 7. Technical Requirements

### 7.1 Confirmed stack

-   Mobile frontend: React Native with Expo.
-   Backend: Node.js with Express.
-   Database: PostgreSQL.
-   ORM: Prisma.
-   Movie metadata and images: TMDB.

Do not replace these technologies. TypeScript usage must be explicitly
approved and documented. Next.js is not part of the confirmed stack. A
web administration interface may be used, but its framework must be
decided explicitly.

### 7.2 Architecture

Start with a modular Express application and clear domain boundaries for
identity/access, movie metadata, cinema inventory, showtimes,
holds/allocations, bookings, payments/refunds, notifications, and
administration. Microservices are not required for the MVP.

The mobile app and any administration interface must use the backend API
for business operations. PostgreSQL is authoritative for booking and
inventory state. Caches may accelerate reads but must never authorize
seat sales.

### 7.3 Security and access

-   Validate all inputs server-side and use parameterized database
    access through Prisma or reviewed SQL.
-   Apply least-privilege access and server-side ownership checks to
    every booking and administrative operation.
-   Protect secrets and payment credentials outside source control.
-   Verify webhook signatures according to provider documentation.
-   Apply rate limits to authentication, hold creation, checkout, and
    sensitive administrative actions.
-   Avoid storing card details unless a specifically approved compliant
    payment design requires it; prefer provider-hosted or tokenized
    payment flows.
-   Maintain audit records for critical actions and restrict sensitive
    financial data access.

### 7.4 Background jobs and reliability

Durable, retry-safe background processing is required for webhook
processing, notification delivery, expiry cleanup, reconciliation, and
refund recovery. The specific queue technology is open, provided the
design supports durable jobs, bounded retries, visibility into failures,
and recovery of stuck work.

Redis/BullMQ may be used if justified, but they are not mandatory stack
choices. Hold validity must be enforced by the authoritative
transaction, not by a scheduled cleanup job.

### 7.5 Observability and recovery

The MVP must provide: - Structured logs and correlation IDs linking
booking, payment attempt, and provider event. - Health checks, error
monitoring, and operational dashboards. - Metrics for allocation
conflicts, payment outcomes, unresolved payments, webhook failures,
refund failures, and booking confirmation latency. - Database backups
and documented restoration procedures. - A tested restore and
post-restore payment/booking reconciliation exercise. - Documented
incident procedures and operational ownership.

### 7.6 Performance and deployment

Deploy the API and PostgreSQL using managed or otherwise supportable
infrastructure selected against the approved budget and traffic profile.
Apply migrations through a controlled deployment process. Test rollback
and recovery procedures before production.

All performance targets remain provisional until the expected traffic
profile is documented and load-tested.

## 8. Critical Booking Integrity

### 8.1 Inventory states

Physical seat configuration, temporary holds, current allocation, and
historical purchase records are separate concerns.

  -----------------------------------------------------------------------
  Concept                             Meaning
  ----------------------------------- -----------------------------------
  Configured seat                     Physical seat belonging to one
                                      screen; may be enabled or disabled

  Showtime restriction                Optional showtime-specific block or
                                      restriction on a seat

  Held                                Seat is temporarily reserved for a
                                      specific hold until its
                                      authoritative expiry

  Allocated/confirmed                 Seat is assigned to a confirmed
                                      booking

  Released                            No active hold or confirmed
                                      allocation owns the seat
  -----------------------------------------------------------------------

A seat's disabled state must not be represented by creating a customer
allocation row. A confirmed booking's historical seat record must not be
deleted merely because its current inventory allocation is later
released under an approved cancellation process.

### 8.2 Hold creation and expiry

1.  The client requests a hold for one or more seats.
2.  The server validates the showtime, seat membership, price/currency,
    and user or guest ownership.
3.  In one database transaction, the server locks or atomically claims
    the relevant inventory records in a consistent order.
4.  It verifies that every requested seat is eligible and unallocated or
    safely reclaimable.
5.  It creates the hold and associates every requested seat, or creates
    none.
6.  It returns a server-generated expiry timestamp.

At or after the expiry timestamp, the hold is invalid for confirmation.
Expiry is checked in the authoritative transaction. A cleanup worker may
release expired records for operational efficiency, but its timing does
not determine whether a hold is valid.

Concurrent reclaim attempts must contend on the same authoritative rows
or uniqueness constraints. The losing transaction must fail or retry
safely. Deadlocks and serialization failures receive bounded retries;
exhausted retries return a retryable error rather than silently
proceeding.

### 8.3 Preventing double-selling

-   PostgreSQL is the authority for inventory allocation.
-   A database uniqueness constraint prevents more than one current
    allocation for a given `(showtimeId, seatId)`.
-   Each showtime must reference one screen, and each seat must belong
    to that screen. Enforce this through database constraints where
    feasible and transactional validation otherwise.
-   All requested seats are allocated atomically: all or none.
-   Lock ordering must be consistent to reduce deadlocks.
-   Client state and caches are advisory only.
-   The database must reject duplicate allocations even if
    application-level checks race.
-   If another ticketing channel sells the same physical inventory,
    Matinee must use a reliable shared inventory integration or an
    explicit inventory allocation agreement. Local PostgreSQL
    constraints cannot prevent sales in an independent external system.

### 8.4 Booking and payment sequence

1.  Create the hold atomically.
2.  Create a durable booking and payment attempt with stable internal
    IDs and idempotency data.
3.  Initiate payment through the approved provider.
4.  Verify payment through authenticated provider events and/or a
    provider API lookup.
5.  Confirm the booking only after the required seats remain securely
    allocated and payment is verified.
6.  Record the final state and schedule confirmation notification
    through durable processing.
7.  Reconcile any unresolved payment or booking outcome.

The exact order of authorization and capture depends on the selected
provider. Where authorization and later capture are supported, evaluate
using authorization before final capture. Do not assume all providers
support this flow.

### 8.5 Payment failures, timeouts, and delayed success

-   A timeout does not prove payment failure.
-   An unresolved attempt remains pending/unknown until verified or
    escalated.
-   Retrying the same logical request uses the same idempotency
    identity; a repeated key with a different request payload is
    rejected.
-   Duplicate or out-of-order webhooks are deduplicated and cannot
    reverse a confirmed booking.
-   A verified payment success does not, by itself, prove seats remain
    available.
-   If payment succeeds after the hold expires, Matinee must safely
    reacquire the required seats before confirmation. It must not
    displace another confirmed booking.
-   If seats cannot be reacquired, follow the approved refund or
    manual-resolution process and communicate the unresolved outcome to
    the customer.
-   Refund attempts have durable records, idempotency controls where
    supported, bounded retries, and escalation for persistent failure.

### 8.6 State transitions and invariants

Booking and payment have separate state machines. Every permitted
transition must identify its trigger, required verification, inventory
effect, and retry behaviour.

Minimum invariants: - A booking is not confirmed solely from a client
redirect. - A confirmed booking cannot be demoted by a duplicate or
stale webhook. - A seat cannot be confirmed for two bookings for the
same showtime. - A multi-seat booking cannot be partially allocated
unless a separately approved product rule explicitly allows it. - A
payment record cannot be silently overwritten to hide prior attempts or
outcomes. - Historical booking-seat details remain immutable. -
Inventory release follows an approved cancellation/expiry transition,
not an arbitrary client action. - Unresolved financial outcomes remain
visible and recoverable.

### 8.7 Required integrity tests

Before launch, test: - Many concurrent customers competing for the same
seat. - Concurrent multi-seat requests with partial overlap. -
Expired-hold reclamation by multiple transactions. - Database
unique-constraint conflicts and transaction retries. - Process crash
during checkout and webhook handling. - Duplicate, delayed, and
out-of-order provider events. - Provider timeout with eventual payment
success. - Payment success after inventory has been allocated
elsewhere. - Refund timeout and retry. - Database restoration followed
by payment/booking reconciliation.

The release must show zero double-allocation in the defined test suite.
Production monitoring must continue after launch; a zero observed
incident count alone is not proof of correctness.

## 9. Business Model

Potential models include: - Commission on completed ticket sales. -
Cinema subscription or software fee. - Customer booking fee, where
acceptable and legally permitted. - A hybrid of cinema fees and
per-ticket commission.

The final model remains open.

Before approval, calculate contribution margin per booking using ticket
price, cinema share, platform commission/customer fee,
payment-processing costs, applicable taxes, refunds, chargebacks,
settlement costs, and support costs.

Explicitly decide: - Merchant of record. - Who receives customer
funds. - Cinema settlement schedule and reconciliation process. - Who
bears refund and chargeback costs. - How fees are disclosed to customers
and cinemas.

Select a payment provider only after confirming support for the chosen
market, payment flow, refunds, webhooks, idempotency, transaction
lookup, and settlement model.

## 10. Risks and Mitigations

Each risk must have an accountable owner, severity, likelihood,
detection signal, preventive control, recovery action, and
launch-blocking status. Named individuals and dates must be assigned in
the project decision register.

  -----------------------------------------------------------------------
  Risk                    Mitigation and          Launch-blocking?
                          detection               
  ----------------------- ----------------------- -----------------------
  Double allocation       Database uniqueness,    Yes
  inside Matinee          atomic transactions,    
                          concurrency tests,      
                          allocation-conflict     
                          monitoring              

  Cross-channel inventory Shared integration or   Yes for shared
  conflict                explicit inventory      inventory
                          allocation agreement;   
                          reconciliation with     
                          cinema records          

  Payment success without Durable attempts,       Yes
  a confirmed booking     provider verification,  
                          reconciliation,         
                          refund/manual           
                          resolution workflow     

  Duplicate or delayed    Signature verification, Yes
  webhooks                provider-event          
                          deduplication,          
                          idempotent state        
                          transitions             

  Incorrect showtime or   Server validation,      Yes
  pricing                 audited edits, operator 
                          preview and             
                          confirmation            

  Failed or stuck refunds Durable refund records, Yes
                          retries, dashboards,    
                          support escalation      

  Database loss or        Backups, restore tests, Yes
  inconsistent recovery   post-restore            
                          reconciliation          

  Unauthorized access     Least privilege,        Yes
                          server-side ownership   
                          checks, rate limiting,  
                          audit trails            

  Cinema closure or       Defined customer        Yes
  screening cancellation  notification,           
                          cancellation, and       
                          refund procedure        

  TMDB outage or missing  Graceful degradation    No, if booking data
  metadata                and locally stored      remains valid
                          references/metadata     
                          where permitted         

  Provider outage or      Provider monitoring,    Yes if outcomes cannot
  changed API behaviour   timeouts,               be reconciled
                          reconciliation,         
                          documented fallback and 
                          support process         

  Privacy or regulatory   Launch-market           Yes
  gaps                    legal/privacy review,   
                          data minimization,      
                          retention and access    
                          controls                

  Unprofitable bookings   Contribution-margin     Yes before commercial
                          model, pilot            scale
                          measurement, pricing    
                          review                  
  -----------------------------------------------------------------------

## 11. Prisma Data Model

The following is the required logical model. Exact field names and
implementation details may be adjusted during schema design, but all
stated invariants must be preserved. Any illustrative schema must be
validated before being treated as executable.

### 11.1 Core entities

  -----------------------------------------------------------------------
  Entity                              Essential fields and responsibility
  ----------------------------------- -----------------------------------
  `User`                              `id`, identity fields,
                                      authentication state, timestamps

  `Cinema`                            `id`, name, address, timezone,
                                      status

  `CinemaMembership`                  `id`, `userId`, `cinemaId`, fixed
                                      role, status, timestamps

  `Movie`                             Internal `id`, nullable TMDB ID,
                                      metadata, image references, sync
                                      timestamps

  `Screen`                            `id`, `cinemaId`, name,
                                      configuration

  `Seat`                              `id`, `screenId`, stable seat
                                      identifier/label, seat type,
                                      enabled status

  `Showtime`                          `id`, `movieId`, `screenId`,
                                      start/end time, status, currency
                                      and publication details

  `ShowtimeSeat`                      Optional per-showtime seat
                                      restriction or override where
                                      required

  `SeatHold`                          `id`, owner/user or guest-session
                                      reference, status, expiry,
                                      timestamps

  `SeatAllocation`                    `id`, `showtimeId`, `seatId`,
                                      current hold/booking reference,
                                      status, timestamps

  `Booking`                           `id`, customer reference, showtime,
                                      booking status, total amount,
                                      currency, idempotency reference,
                                      timestamps

  `BookingSeat`                       `id`, `bookingId`, seat reference,
                                      immutable seat-label snapshot,
                                      ticket category, unit price,
                                      currency, fee/tax snapshots where
                                      applicable

  `Payment`                           `id`, `bookingId`, attempt number,
                                      provider reference, amount,
                                      currency, idempotency key, request
                                      fingerprint, status, timestamps

  `WebhookEvent`                      Provider event ID, payment/provider
                                      reference, event type, processing
                                      state, received/processed
                                      timestamps

  `Refund`                            `id`, payment/booking reference,
                                      amount, currency, provider
                                      reference, status, idempotency
                                      reference, timestamps

  `NotificationJob`                   Recipient/reference, event type,
                                      delivery state, retry metadata,
                                      timestamps

  `AuditLog`                          Actor, action, target, timestamp,
                                      correlation ID, safe metadata
  -----------------------------------------------------------------------

### 11.2 Required relationships and constraints

-   A cinema owns its screens; each screen belongs to exactly one
    cinema.
-   Each seat belongs to exactly one screen.
-   Each showtime references a movie and exactly one screen.
-   Every showtime-seat allocation must reference a seat belonging to
    that show's screen.
-   A booking references the showtime and customer/guest identity
    required by the approved checkout model.
-   Each booking-seat snapshot belongs to one booking and preserves
    purchase-time details.
-   Payment attempts belong to a booking and retain separate attempt
    records.
-   Provider webhook event IDs are unique within the provider's
    documented event-identity scope.
-   Idempotency keys are unique within their explicitly defined scope.
    Reuse with a different payload is rejected.
-   Foreign keys and deletion policies preserve historical booking,
    payment, refund, and audit records.
-   Current seat allocation has a unique constraint on
    `(showtimeId, seatId)`.
-   If allocations are retained as history, enforce uniqueness only for
    current ownership using an appropriate model or database constraint.
    Do not allow historical released rows to block valid future
    allocations.
-   Critical state changes use transactions and conditional updates or
    row locks; Prisma-level relations alone are not a substitute for
    concurrency controls.
-   If an invariant requires a custom PostgreSQL constraint or index not
    expressible in Prisma's schema, add it through a reviewed migration
    and test it against the real database.

### 11.3 Illustrative Prisma schema fragment

This fragment illustrates a valid relational pattern for core inventory.
It is not the complete application schema; all additional entities,
enums, indexes, and lifecycle constraints listed above remain required.

``` prisma
model Screen {
  id        String     @id @default(cuid())
  cinemaId  String
  name      String
  cinema    Cinema     @relation(fields: [cinemaId], references: [id])
  seats     Seat[]
  showtimes Showtime[]
}

model Seat {
  id        String           @id @default(cuid())
  screenId  String
  label     String
  enabled   Boolean          @default(true)
  screen    Screen           @relation(fields: [screenId], references: [id])
  allocations SeatAllocation[]

  @@unique([screenId, label])
}

model Showtime {
  id        String           @id @default(cuid())
  screenId  String
  movieId   String
  status    ShowtimeStatus
  screen    Screen           @relation(fields: [screenId], references: [id])
  movie     Movie            @relation(fields: [movieId], references: [id])
  allocations SeatAllocation[]
}

model SeatAllocation {
  id         String           @id @default(cuid())
  showtimeId String
  seatId     String
  status     AllocationStatus
  expiresAt  DateTime?
  showtime   Showtime         @relation(fields: [showtimeId], references: [id])
  seat       Seat             @relation(fields: [seatId], references: [id])

  @@unique([showtimeId, seatId])
}

enum ShowtimeStatus {
  DRAFT
  PUBLISHED
  CANCELLED
  COMPLETED
}

enum AllocationStatus {
  HELD
  CONFIRMED
  RELEASED
}
```

**Important limitation:** The fragment's ordinary foreign keys do not,
by themselves, enforce that `SeatAllocation.seatId` belongs to the
screen referenced by its showtime. That invariant requires a suitable
database-level design/constraint or reliable transactional validation.
The final schema must also resolve allocation history, hold and booking
relations, and state-dependent uniqueness before implementation
sign-off.

### 11.4 Schema acceptance gate

-   `prisma validate` passes.
-   Migrations apply to a clean database and an existing test database.
-   Unique constraints and foreign keys reject invalid data.
-   Cross-screen seat allocation is rejected.
-   Concurrent allocation tests prove that a seat cannot have two
    current owners.
-   Historical purchase snapshots remain correct after inventory labels
    or prices change.
-   Payment, webhook, refund, and idempotency records survive retries
    and recovery.

## 12. Success Metrics

All figures below are **provisional targets**, not validated
commitments. Establish the launch traffic profile and baseline before
final approval.

  -----------------------------------------------------------------------
  Metric                  Proposed target         Measurement definition
  ----------------------- ----------------------- -----------------------
  Double-selling          0 confirmed duplicate   Production incidents
                          seat allocations        plus repeatable
                                                  concurrency and
                                                  failure-injection tests

  Booking conversion      Establish pilot         Confirmed paid bookings
                          baseline; set target    divided by clearly
                          after pilot             defined eligible funnel
                                                  entrants

  Payment technical       Baseline first;         Separate Matinee
  success                 proposed target after   technical failures from
                          provider evaluation     customer declines,
                                                  provider failures,
                                                  abandonment, and
                                                  unresolved outcomes

  Booking confirmation    Provisional p95 below   Measure Matinee
  latency                 10 seconds for eligible processing separately
                          flows                   from provider response
                                                  time; report unresolved
                                                  asynchronous cases
                                                  separately

  API latency             Provisional p95 below   Specify endpoints,
                          500 ms for non-payment  request mix, data
                          reads under the agreed  volume, and environment
                          load profile            

  Availability            Provisional 99.5%       Define eligible
                          monthly for critical    requests, maintenance
                          Matinee API operations  treatment, and
                                                  dependency exclusions

  Payment reconciliation  100% of provider        Track unmatched,
                          transactions accounted  unknown, and delayed
                          for or explicitly       transactions with age
                          escalated               thresholds

  Refund reliability      100% tracked to         Measure refund outcomes
                          completion or explicit  and unresolved age, not
                          escalation              only successful API
                                                  responses

  Cinema                  Establish pilot         Track participating
  activation/retention    baseline                cinemas that publish
                                                  valid inventory and
                                                  continue using Matinee
                                                  over a defined period

  Contribution margin     Non-negative target per Revenue less cinema
                          approved commercial     share, payment costs,
                          model                   refunds, chargebacks,
                                                  taxes, settlement, and
                                                  support costs

  Repeat booking          Establish pilot         Customers completing
                          baseline                another booking within
                                                  a defined cohort window
  -----------------------------------------------------------------------

Every metric must define its owner, source, calculation, reporting
interval, exclusions, and alert threshold. Zero observed double-selling
incidents alone does not establish correctness.

## 13. Assumptions and Decision Register

### 13.1 Confirmed facts

-   Matinee is a mobile cinema ticket-booking product.
-   React Native with Expo, Node.js with Express, PostgreSQL, and Prisma
    are the confirmed technologies.
-   TMDB provides movie metadata and images.
-   Seat inventory and booking integrity are critical requirements.
-   AI is not required for the MVP.

### 13.2 Working assumptions

-   Cinema operators will manage inventory through Matinee or an
    approved integration.
-   Customers can browse without signing in.
-   The MVP starts with one payment provider and a limited pilot.
-   A modular backend is sufficient for the initial launch.
-   Proposed performance targets will be validated rather than treated
    as guaranteed.

These assumptions must not silently become confirmed product decisions.

### 13.3 Blocking decisions

  ------------------------------------------------------------------------
  Decision                Classification           Required before
  ----------------------- ------------------------ -----------------------
  Launch market and       Blocks full              Full MVP commitment
  initial cinema pilot    implementation           

  Inventory ownership and Blocks booking           Inventory/booking
  cross-channel           implementation and       design
  coordination            public launch            

  Guest versus            Blocks identity/checkout Checkout implementation
  authenticated checkout  design                   

  Payment provider and    Blocks payment           Provider integration
  supported payment       implementation           
  lifecycle                                        

  Merchant of record and  Blocks payment           Provider and financial
  settlement model        integration and          design
                          commercial launch        

  Cancellation, refund,   Blocks payment recovery  Relevant implementation
  and dispute policy      and public launch        and launch

  TypeScript policy and   Blocks affected project  Frontend/admin setup
  admin-interface         scaffolding              
  framework                                        

  Expected traffic        Blocks                   Infrastructure
  profile and operating   performance/deployment   selection
  budget                  sign-off                 

  Privacy, data           Blocks public launch     Production approval
  retention, and                                   
  launch-market                                    
  compliance review                                
  ------------------------------------------------------------------------

### 13.4 Deferred decisions

-   Advanced analytics and promotions.
-   Multiple payment providers.
-   Complex operator permission customization.
-   AI features.
-   Microservices or other architecture changes not justified by
    measured need.

### 13.5 Decision ownership

Every blocking decision must have an accountable owner, deadline,
dependencies, and documented outcome. Work dependent on an unresolved
blocking decision must not proceed using an undocumented guess.

## 14. Phased Roadmap

  --------------------------------------------------------------------------------
  Phase                   Deliverables                    Exit criteria
  ----------------------- ------------------------------- ------------------------
  1\. Validation and      Customer/operator discovery,    Evidence supports the
  decisions               pilot candidate, inventory      problem and supply
                          ownership plan, market and      assumptions; blocking
                          commercial evaluation           decisions are recorded
                                                          and assigned

  2\. Technical           Approved architecture,          Prisma validation and
  foundation              authentication/authorization,   migration tests pass;
                          database schema, migrations,    access controls are
                          API contracts                   tested

  3\. Discovery and       Movie discovery,                Published showtimes and
  inventory               cinema/showtime flows, minimum  inventory rules work
                          operator interface              against validated test
                                                          data

  4\. Booking integrity   Holds, atomic allocation,       Concurrency, multi-seat,
                          booking records, expiry/reclaim expiry, uniqueness, and
                          logic                           cross-screen validation
                                                          tests pass

  5\. Payments and        Provider integration, webhook   Duplicate/out-of-order
  recovery                processing, reconciliation,     webhook, timeout,
                          refunds, notifications          delayed success, refund,
                                                          and crash-recovery tests
                                                          pass

  6\. Operational         Monitoring, load tests,         Load report meets
  readiness               security review, backups,       approved targets;
                          restoration and incident        restore and
                          procedures                      reconciliation exercises
                                                          succeed

  7\. Cinema pilot and    Pilot operation, customer       Cinema/customer
  launch                  feedback, support procedures,   acceptance, financial
                          commercial measurement          and integrity review,
                                                          and explicit launch
                                                          approval

  8\. Enhancements        Prioritized improvements backed Each enhancement has a
                          by evidence                     defined user/business
                                                          need, cost assessment,
                                                          and success metric
  --------------------------------------------------------------------------------

Provider capability evaluation begins in Phase 1. Provider-specific
payment implementation may follow the provider-independent booking
foundation, but it cannot be accepted until the selected provider's
documented capabilities and recovery paths have been tested.

## 15. Open Questions

These questions require explicit answers, owners, and deadlines. The
classification indicates when the decision must be resolved.

1.  Which country/market and initial customer segment will Matinee
    launch in? **Blocks full implementation.**
2.  Which cinema or cinemas will participate in the initial pilot?
    **Blocks full implementation.**
3.  Who owns authoritative seat inventory when the same cinema sells
    tickets through other channels? **Blocks booking design and
    launch.**
4.  How will external sales, cancellations, and inventory changes be
    synchronized or reconciled? **Blocks shared-inventory launch.**
5.  Will customers be required to sign in before checkout, or will guest
    checkout be supported? **Blocks checkout design.**
6.  Which payment provider supports the required local payment methods,
    transaction lookup, idempotency, signed webhooks, refunds, and
    settlement model? **Blocks payment implementation.**
7.  Who is the merchant of record, who receives funds, and how/when are
    cinemas paid? **Blocks payment integration and commercial launch.**
8.  What are the cancellation, refund, cinema-cancellation, and dispute
    policies? **Blocks payment recovery and launch.**
9.  What hold duration and customer experience best balance usability
    and inventory protection? **Blocks final hold configuration.**
10. What traffic profile, concurrency level, hosting budget, and
    recovery objectives are required? **Blocks infrastructure
    sign-off.**
11. What are the approved TypeScript and administrative-interface
    framework choices? **Blocks affected project setup.**
12. What data-retention, privacy, and regulatory obligations apply in
    the launch market? **Blocks public launch.**
13. What are the approved contribution-margin and pilot-success
    thresholds? **Blocks commercial approval.**
14. Who owns each blocking decision, and by what deadline must it be
    resolved? **Blocks dependent work until assigned.**

## Final Launch Gate

Matinee is not ready for public ticket sales until all of the following
are true:

-   At least one participating cinema has validated inventory and an
    approved operating agreement.
-   Inventory ownership and cross-channel risks are explicitly
    addressed.
-   The Prisma schema and database invariants are validated and tested.
-   Concurrent allocation tests demonstrate no duplicate current seat
    ownership.
-   Payment and refund flows handle timeouts, duplicate webhooks,
    delayed success, and recovery.
-   Unresolved payment outcomes can be identified, reconciled, and
    escalated.
-   Cancellation, refund, privacy, and support policies are approved.
-   Performance, security, monitoring, backup restoration, and
    reconciliation checks pass.
-   The pilot and commercial assumptions meet approved launch criteria.

**PRD status:** Revised to incorporate the review recommendations. The
document is ready for stakeholder decisions and detailed implementation
planning, but unresolved blocking decisions must be closed before the
affected implementation or public launch proceeds.
