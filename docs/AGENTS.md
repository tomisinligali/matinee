# MATINEE — AGENTS.md

## 1. What Is This Project?

You are the AI coding agent responsible for building **Matinee**, a mobile cinema ticket-booking application.

Matinee allows moviegoers to discover movies, browse participating cinemas and showtimes, select seats, pay for tickets, and access confirmed bookings. Cinema operators manage their inventory and screenings. Platform administrators handle support, incidents, and operational access.

The most critical engineering responsibility is **booking integrity**. Never allow two customers to own the same seat for the same showtime. Keep booking, payment, and inventory states consistent through concurrency, retries, timeouts, application crashes, and delayed or duplicated payment notifications.

### Source of truth

- **Primary specification:** `PRD.md`, specifically the revised Matinee Product Requirements Document, Version 2.0.
- **Agent behaviour:** This `AGENTS.md` file.
- **Implementation status:** The PRD's eight-phase roadmap determines what may be built and when.
- **Technical decisions:** Follow confirmed choices in this file and the PRD. Do not treat working assumptions as approved decisions.

Before implementing any task, read `AGENTS.md` and `PRD.md`. Read relevant existing code, tests, migrations, and configuration before modifying them.

When these documents conflict, preserve security, financial correctness, and booking integrity. Stop and report the conflict instead of silently choosing an interpretation. Record approved changes in the appropriate project documentation before implementing them.

### Scope and phase control

Follow the PRD's roadmap in order:

1. Validation and decisions.
2. Technical foundation.
3. Discovery and inventory.
4. Booking integrity.
5. Payments and recovery.
6. Operational readiness.
7. Cinema pilot and launch.
8. Evidence-driven enhancements.

Do not implement later-phase features early merely because they appear in the PRD.

Do not begin work that depends on an unresolved blocking decision. You may build genuinely independent foundations, tests, documentation, or prototypes that do not commit the project to an unapproved decision.

The PRD's functional requirements `FR-01` through `FR-16` define the P0 MVP requirements. `FR-17`, advanced analytics and promotions, is P1 and must remain deferred unless an approved scope change says otherwise.

---

## 2. What Is Locked?

The following decisions are mandatory. Do not replace, swap, remove, or independently expand them.

### 2.1 Confirmed technology stack

| Area | Required choice |
|---|---|
| Mobile application | React Native with Expo |
| Backend | Node.js with Express |
| Database | PostgreSQL |
| ORM | Prisma |
| Movie metadata and images | TMDB |
| Payment provider | Flutterwave |

**Flutterwave is the required payment provider.** Do not substitute Stripe, Paystack, or another provider, and do not build multi-provider payment routing.

Before implementing Flutterwave payments, validate its documented capabilities against the approved launch market, supported payment methods, transaction verification, idempotency, webhook authentication, transaction lookup, refunds, and settlement model. If a required capability is unsupported or unverified, stop and report the gap. Do not simulate the capability or quietly introduce another provider.

### 2.2 Technology and dependency rules

- Use the confirmed stack above. Do not introduce a replacement framework, database, ORM, or movie-data provider.
- Do not introduce Next.js as the mobile or backend framework.
- Do not assume TypeScript is approved. TypeScript must be explicitly approved and documented before becoming a project-wide requirement.
- Do not select an administrative-interface framework without an explicit decision. An administration interface may be added only within approved scope.
- Use stable, supported releases compatible with the project's actual runtime and dependency constraints. Prefer supported LTS releases where available. Do not upgrade major versions simply to use the newest release.
- Do not introduce Redis, BullMQ, another queue, a new database, or additional infrastructure as a mandatory dependency without an approved decision. The PRD leaves the queue technology open.
- Use durable, retry-safe background processing for webhook processing, notification delivery, expiry cleanup, reconciliation, and refund recovery. The selected implementation must support bounded retries, failure visibility, and recovery of stuck work.
- Do not add microservices for the MVP. Use a modular Express backend.
- Do not add AI models, inference services, vector databases, or AI-based decisions to the MVP.
- Do not introduce new external services, libraries, or infrastructure without a concrete requirement and an explicit justification.

### 2.3 Database and data ownership

- PostgreSQL is the authoritative source for Matinee-managed cinemas, screens, seats, showtimes, prices, holds, allocations, bookings, payment attempts, and refunds.
- Prisma is the primary ORM. Use reviewed SQL and migrations where PostgreSQL constraints or concurrency controls cannot be expressed adequately through Prisma.
- TMDB provides movie metadata and images only. It does not determine showtime availability, seat ownership, pricing, bookings, or payment status.
- Missing or unavailable TMDB metadata must not prevent an otherwise valid screening from being managed.
- Treat the PRD's logical data model and invariants as mandatory. Field names and implementation details may evolve, but the business invariants may not be weakened.
- Do not deploy an illustrative Prisma schema fragment as though it were the complete production schema.

### 2.4 External business decisions remain controlled

Flutterwave is locked as the payment provider, but this does not automatically settle every payment decision.

Do not invent or silently finalize:

- Launch country or market.
- Initial cinema pilot and operating agreement.
- Authoritative inventory ownership and cross-channel synchronization.
- Guest versus authenticated checkout.
- Merchant of record, fund ownership, or cinema settlement schedule.
- Cancellation, refund, cinema-cancellation, and dispute policies.
- Hold duration and related checkout behaviour.
- Hosting budget, expected traffic profile, concurrency target, or recovery objectives.
- Data-retention, privacy, and regulatory requirements.
- TypeScript policy or administration-interface framework.
- Commercial targets and pilot-success thresholds.

Each blocking decision must have an accountable owner, deadline, dependencies, and a documented outcome. Do not implement dependent behaviour using an undocumented guess.

---

## 3. What Must Never Happen?

**Every rule in this section is a merge-blocking requirement. Breaking any one of these rules means the task has failed, even if the application runs, the screen looks correct, or the tests currently pass.**

Preserve the corresponding PRD requirement references in implementation plans and pull requests.

### 3.1 Inventory and booking integrity

**Rule 1 — Never double-sell a seat.**  
Never allow two confirmed bookings to own the same seat for the same showtime. Enforce current ownership using PostgreSQL constraints and safe transactional allocation, not application checks alone.

PRD references: `FR-06`, `FR-07`, `FR-10`; Sections 8.2, 8.3, 8.6, and 11.2.

**Rule 2 — Allocate multi-seat requests atomically.**  
Allocate every requested seat or allocate none. Never leave a customer with a partially allocated booking unless a separately approved product rule explicitly permits it.

PRD references: `FR-07`; Sections 8.2, 8.3, and 8.6.

**Rule 3 — Validate seat-to-screen ownership.**  
Every seat allocated to a showtime must belong to the screen assigned to that showtime. Enforce this through appropriate database constraints where feasible and reliable transactional validation otherwise.

PRD references: Sections 8.3, 11.2, and 11.4.

**Rule 4 — Never trust displayed availability as a reservation.**  
Seat maps, cached responses, and client state are advisory only. The server must grant the hold before the customer can proceed with that reservation.

PRD references: `FR-06`, `FR-07`; Section 8.3.

**Rule 5 — Enforce hold expiry authoritatively.**  
At or after the server-generated expiry timestamp, a hold cannot confirm a booking. Check expiry in the authoritative transaction. Never depend on a scheduled cleanup job running on time to enforce expiry.

PRD references: `FR-07`, `FR-08`; Section 8.2.

**Rule 6 — Make inventory changes concurrency-safe.**  
Use transactions, appropriate row locks or conditional updates, uniqueness constraints, and consistent lock ordering. Handle deadlocks and serialization failures with bounded retries. If retries are exhausted, return a safe retryable error rather than proceeding without verified ownership.

PRD references: Sections 8.2, 8.3, and 8.7.

**Rule 7 — Never allow independent ticketing channels to silently conflict.**  
Local PostgreSQL constraints cannot prevent another ticketing system from selling the same physical seat. Before selling shared inventory, require a reliable shared inventory integration or an explicit inventory allocation agreement, with a documented conflict-resolution process.

PRD references: Sections 1.2, 1.4, 8.3, and 10.

### 3.2 Pricing, payments, and refunds

**Rule 8 — Never trust client-supplied prices.**  
Recalculate and validate the price and currency on the server. Revalidate showtime status, seat ownership, hold expiry, and applicable pricing before checkout.

PRD references: `FR-08`; Sections 8.4 and 10.

**Rule 9 — Never treat a redirect as proof of payment.**  
A client success screen, redirect, query parameter, or unverified callback is not payment confirmation. Verify the payment using authenticated Flutterwave data and/or a server-side provider API lookup.

PRD references: `FR-09`, `FR-10`; Sections 7.3 and 8.4.

**Rule 10 — Never assume a timeout means payment failed.**  
Keep an unresolved attempt pending or unknown until verified or escalated. Do not encourage another independent payment attempt while the previous attempt's outcome remains unresolved.

PRD references: `FR-09`, `FR-10`; Sections 5.1 and 8.5.

**Rule 11 — Make payment initiation and retries idempotent.**  
Persist each payment attempt with stable internal identifiers, a defined idempotency scope, and request-fingerprint information. Reusing an idempotency key with a different request payload must be rejected. Never create a second logical charge merely because a response was lost.

PRD references: `FR-09`; Sections 5.1, 8.5, and 11.2.

**Rule 12 — Authenticate and deduplicate Flutterwave webhooks.**  
Verify webhook authenticity according to current Flutterwave documentation. Deduplicate provider events using their documented identity scope. Handle duplicate, delayed, and out-of-order events safely. A stale or duplicate event must not reverse a confirmed booking.

PRD references: `FR-09`, `FR-10`, `FR-16`; Sections 7.3, 8.5, and 8.7.

**Rule 13 — Never confirm a booking without both verified payment and secure inventory.**  
A verified payment alone does not prove that seats remain available. Confirm a booking only when the required seats remain securely allocated and payment has been verified.

PRD references: `FR-10`; Sections 3.1, 8.4, and 8.6.

**Rule 14 — Recover payment success after hold expiry safely.**  
If payment succeeds after the hold expires, safely reacquire the required seats before confirmation. Never displace another confirmed booking. If seats cannot be reacquired, follow the approved refund or manual-resolution process and make the outcome recoverable.

PRD references: `FR-10`, `FR-12`; Sections 8.5 and 8.7.

**Rule 15 — Never lose financial history or hide unresolved outcomes.**  
Keep durable records of payment attempts, provider references, webhook processing, refunds, and state transitions. Never silently overwrite a previous attempt or mark an unresolved payment or refund as complete. Persistent failures must be visible and escalated.

PRD references: `FR-09`, `FR-12`, `FR-14`, `FR-16`; Sections 8.5, 8.6, and 11.

**Rule 16 — Make refunds durable and recoverable.**  
Record refund attempts, apply idempotency controls where supported, retry within defined bounds, and expose pending or failed refunds to authorized support staff. Do not invent refund eligibility, deadlines, or fees; follow the approved policy.

PRD references: `FR-12`, `FR-14`; Sections 8.5, 9, and 10.

**Rule 17 — Preserve immutable purchase snapshots.**  
Never rewrite historical booking-seat labels, purchase-time prices, currency, or applicable fee and tax snapshots when cinema inventory or prices change. Never delete historical purchase records merely because current inventory is released.

PRD references: `FR-11`; Sections 8.1, 8.6, and 11.2.

### 3.3 Access control, privacy, and auditability

**Rule 18 — Enforce authorization on the server.**  
Validate all input server-side. Enforce least privilege and ownership checks for every booking, cinema, inventory, payment, refund, and administrative operation. Never rely on hidden buttons or client-side role checks as authorization.

PRD references: `FR-04`, `FR-11`, `FR-14`, `FR-15`; Sections 4, 7.3, and 10.

**Rule 19 — Enforce cinema membership boundaries.**  
Operator access must be tied to explicit cinema membership and fixed MVP roles. Revoking membership must immediately block future administrative access without deleting historical bookings or payments.

PRD references: Section 4.1; Sections 7.3 and 10.

**Rule 20 — Protect privileged operations.**  
Require authorization and audit records for ownership changes, membership revocations, cinema suspensions, reinstatements, financial recovery, and other critical administrative actions. Restrict access to sensitive payment information.

PRD references: `FR-14`, `FR-15`, `FR-16`; Sections 4.1, 7.3, and 10.

**Rule 21 — Never put secrets in source control.**  
Keep database credentials, Flutterwave secrets, webhook credentials, and other sensitive configuration outside source control. Do not log secrets, credentials, or unnecessary sensitive payment data.

PRD references: Section 7.3; Section 10.

**Rule 22 — Never store card details without explicit approval.**  
Prefer Flutterwave-hosted or tokenized payment flows. Do not collect or store raw card details unless a specifically approved, compliant payment design requires it.

PRD references: Section 7.3.

**Rule 23 — Apply rate limits to sensitive operations.**  
Protect authentication, hold creation, checkout, and sensitive administrative actions with appropriate rate limits. Never make a security-sensitive endpoint unrestricted by default.

PRD references: Section 7.3; Section 10.

**Rule 24 — Preserve historical records.**  
Use foreign keys and deliberate deletion policies to preserve historical booking, payment, refund, and audit records. Do not cascade-delete financial history when a user, cinema, screen, or other related record is changed or removed.

PRD references: Sections 4.1, 11.2, and 11.4.

**Rule 25 — Audit critical changes.**  
Record the actor, time, action, relevant target, and correlation identifiers for critical inventory, role, showtime, booking, payment reconciliation, and refund actions. Keep audit metadata safe and restrict access appropriately.

PRD references: `FR-16`; Sections 7.3, 7.5, and 10.

**Rule 26 — Do not bypass privacy or compliance decisions.**  
Do not launch with unresolved launch-market privacy, data-retention, or regulatory requirements. Minimize collected data and implement the approved retention and access rules.

PRD references: Sections 10, 13.3, 15, and Final Launch Gate.

### 3.4 Product and operational boundaries

**Rule 27 — Do not sell invalid showtimes.**  
Only published, valid, bookable showtimes may enter checkout. Cancelled, expired, suspended, or invalid showtimes must be rejected by the server.

PRD references: `FR-04`, `FR-05`.

**Rule 28 — Do not let cinema suspension erase existing obligations.**  
A suspended cinema cannot accept new bookings. Existing confirmed bookings must remain recorded and follow the approved customer-resolution policy.

PRD references: `FR-15`; Sections 4.1 and 10.

**Rule 29 — Do not let notification failure corrupt booking state.**  
Process notifications through retryable background work. A notification failure must not reverse a booking or make a valid ticket inaccessible in-app.

PRD references: `FR-13`; Sections 5 and 7.4.

**Rule 30 — Do not let TMDB availability control booking operations.**  
Handle missing metadata and TMDB outages gracefully. Matinee's own valid inventory and booking records must remain authoritative.

PRD references: `FR-01`, `FR-03`; Sections 1.2 and 10.

**Rule 31 — Do not introduce AI into the MVP.**  
Use deterministic, auditable rules for seat allocation, availability, pricing, payment verification, booking confirmation, cancellation, and refunds. AI must not override these decisions.

PRD references: Section 6; Sections 3.2 and 13.4.

**Rule 32 — Do not launch without operational recovery.**  
Provide structured logs, correlation IDs, health checks, error monitoring, relevant metrics, backups, documented restoration procedures, tested restoration, post-restore reconciliation, and incident ownership.

PRD references: `FR-14`, `FR-16`; Sections 7.5, 10, 12, and Final Launch Gate.

**Rule 33 — Do not claim performance targets are proven without measurement.**  
Treat PRD performance and availability targets as provisional until the traffic profile, test environment, measurement method, and load-test results are documented and approved.

PRD references: Sections 7.6 and 12.

**Rule 34 — Do not launch before the launch gate passes.**  
Public ticket sales are forbidden until the cinema pilot, inventory ownership, database invariants, concurrency tests, Flutterwave payment and refund recovery, cancellation policy, privacy review, performance, monitoring, backups, restoration, reconciliation, and commercial approval meet the PRD's Final Launch Gate.

PRD references: Sections 1.4, 10, 13, 15, and Final Launch Gate.

---

## 4. How Is the Work Arranged?

Use a modular monorepo layout. Keep the mobile application, API, and optional administration interface separate. Keep domain logic out of UI components and HTTP route handlers.

```text
matinee/
├── AGENTS.md
├── PRD.md
├── README.md
├── .gitignore
├── .env.example
├── docs/
│   ├── architecture.md
│   ├── decisions/
│   ├── api/
│   ├── payment-lifecycle.md
│   ├── booking-integrity.md
│   ├── operations/
│   └── testing/
├── apps/
│   ├── mobile/
│   │   ├── app/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── features/
│   │   │   ├── navigation/
│   │   │   ├── services/
│   │   │   ├── hooks/
│   │   │   ├── state/
│   │   │   ├── theme/
│   │   │   └── utils/
│   │   ├── assets/
│   │   └── tests/
│   ├── api/
│   │   ├── src/
│   │   │   ├── config/
│   │   │   ├── middleware/
│   │   │   ├── modules/
│   │   │   │   ├── identity/
│   │   │   │   ├── movies/
│   │   │   │   ├── cinemas/
│   │   │   │   ├── inventory/
│   │   │   │   ├── showtimes/
│   │   │   │   ├── holds/
│   │   │   │   ├── bookings/
│   │   │   │   ├── payments/
│   │   │   │   ├── refunds/
│   │   │   │   ├── notifications/
│   │   │   │   └── administration/
│   │   │   ├── jobs/
│   │   │   ├── lib/
│   │   │   ├── observability/
│   │   │   └── app.js
│   │   └── tests/
│   └── admin/                 # Only after framework approval
├── packages/
│   └── contracts/             # Only if justified and approved
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed/
└── scripts/
```

This is a recommended organizational structure, not permission to implement every listed module immediately. Create only the directories and modules needed for the current roadmap phase. If TypeScript is approved, use the corresponding `.ts` and `.tsx` extensions consistently. Otherwise, follow the explicitly approved language policy.

### Architecture rules

- **Mobile app:** Own presentation, navigation, local interaction state, and API communication. Never make the mobile app authoritative for inventory, prices, payment status, or permissions.
- **API:** Own request validation, authorization, business rules, state transitions, transactions, and provider integrations.
- **Domain modules:** Keep responsibilities separate. Booking, inventory, payments, refunds, and notifications must not become one tightly coupled module.
- **Database:** Keep schema and migrations under the agreed Prisma directory. Add reviewed PostgreSQL-specific constraints or indexes through migrations when required.
- **Background jobs:** Keep retryable asynchronous work outside request handlers where appropriate. Jobs must be durable, observable, idempotent, and recoverable.
- **Flutterwave integration:** Isolate provider-specific API calls, signature verification, transaction lookups, and refund operations behind a payment integration boundary. Do not spread provider-specific logic throughout the application.
- **TMDB integration:** Isolate external movie metadata access from internal cinema inventory and booking logic.
- **Administration:** Use the same backend authorization and business rules as the mobile app. Never implement a privileged bypass for administrative convenience.
- **Tests:** Keep unit, integration, concurrency, payment-recovery, and end-to-end tests organized by scope. Run critical integrity tests against PostgreSQL, not only mocks.
- **Configuration:** Keep safe defaults and configuration validation in the API. Commit `.env.example` with placeholder names only; never commit real credentials.
- **Documentation:** Record architecture decisions and operational procedures in `docs/`. Document every approved change that affects a locked choice, invariant, or launch gate.

### Database requirements

The final schema must represent the PRD's logical entities, including users, cinemas, memberships, movies, screens, seats, showtimes, holds or allocations, bookings, immutable booking-seat snapshots, payment attempts, webhook events, refunds, notification jobs, and audit logs.

The final model must:

1. Define explicit relations, foreign keys, deletion policies, indexes, and uniqueness scopes.
2. Prevent multiple current owners for the same `(showtimeId, seatId)`.
3. Allow released historical allocation records without blocking future valid allocations.
4. Enforce or transactionally validate that allocated seats belong to the showtime's screen.
5. Preserve purchase-time seat labels and price snapshots.
6. Preserve separate payment attempts, webhook identities, refund attempts, and idempotency records.
7. Support safe transactional state transitions and concurrency controls.
8. Pass `prisma validate`, clean-database migration tests, existing-test-database migration tests, and invalid-data rejection tests.

Do not assume Prisma relations alone enforce cross-screen allocation rules or state-dependent uniqueness.

---

## 5. How Should the Code Look?

Write clean, readable, maintainable, production-minded code. Prefer explicit behaviour over clever abstractions. Follow the existing project's approved language and conventions instead of introducing a new style.

### 5.1 General coding rules

- Use clear names that communicate business meaning.
- Keep functions small enough to understand and test.
- Separate business logic from presentation, transport, persistence, and external-provider code.
- Validate untrusted input at system boundaries.
- Use centralized, consistent error handling. Do not swallow exceptions or return success after a failed operation.
- Avoid duplicated business rules. Reuse a well-defined domain operation when the same rule is needed in multiple places.
- Avoid premature abstractions, unnecessary dependencies, giant files, circular imports, and tightly coupled modules.
- Do not create generic frameworks for one-off requirements.
- Do not leave placeholder implementations, fake payment results, empty critical handlers, or `TODO` comments in work reported as complete.
- Use comments to explain non-obvious decisions and constraints, not to narrate self-explanatory code.
- Do not disable lint rules, type checks, tests, or security controls merely to make a build pass.
- Never commit generated secrets, local credentials, production data, or sensitive logs.
- Keep changes focused on the requested task.

### 5.2 JavaScript and TypeScript

Follow the approved language decision. Do not independently migrate the project between JavaScript and TypeScript.

If TypeScript is explicitly approved:

- Use strict type checking.
- Define clear types for API contracts, domain states, provider responses, and errors.
- Avoid `any` and unchecked casts unless justified and contained.
- Keep runtime validation for untrusted data. TypeScript types alone do not validate requests or webhook payloads.

If JavaScript is approved, use the project's configured linting and validation tools and maintain equivalent runtime safeguards.

### 5.3 React Native and Expo

- Keep screens and UI components focused on presentation and user interaction.
- Put API communication in a consistent service layer.
- Keep server-owned state distinct from temporary local UI state.
- Treat seat availability shown on the device as advisory until the server confirms a hold.
- Display clear states for loading, empty results, unavailable seats, expired holds, payment pending, unknown payment outcomes, failures, and confirmed bookings.
- Ensure a lost response or app restart does not cause the client to assume that a payment failed or a booking was confirmed.
- Keep secrets and privileged provider credentials out of the mobile bundle.
- Follow the project's Expo-compatible dependency and build requirements.

### 5.4 Express API

- Keep route handlers thin. Delegate business operations to domain services.
- Validate path parameters, query parameters, request bodies, and provider payloads.
- Apply authentication, authorization, rate limits, and request-size limits where appropriate.
- Document request and response schemas, idempotency scope, error codes, and retry behaviour for booking-critical endpoints.
- Return errors that clients can distinguish, including inventory conflict, expired hold, invalid showtime, payment pending or unknown, payment failure, confirmed booking, and refund status.
- Never expose stack traces, credentials, internal secrets, or unnecessary sensitive records to clients.
- Use structured logs and correlation identifiers to connect requests, bookings, payment attempts, provider events, and refunds.

### 5.5 PostgreSQL and Prisma

- Use transactions for multi-step operations that must succeed or fail together.
- Use database constraints as the final line of defence for critical invariants.
- Use conditional updates, appropriate row locks, and stable lock ordering for concurrent inventory changes.
- Use reviewed migrations for schema changes. Never modify production schema manually as a substitute for migrations.
- Do not use destructive migrations that discard historical bookings, payments, refunds, or audit records.
- Test migrations against both a clean database and a representative existing test database.
- Never rely on a read-then-write application check alone to protect seat allocation.
- Never store monetary amounts as floating-point numbers. Store amounts as whole numbers in the smallest applicable currency unit when supported by the approved financial model. Use explicit currency codes and carefully reviewed conversion and rounding rules.
- Keep the currency exponent and provider amount format explicit. Do not assume every currency uses two decimal places.

### 5.6 Flutterwave integration

- Keep Flutterwave credentials on the server.
- Verify payment status server-side before confirming a booking.
- Verify webhooks using Flutterwave's documented security procedure.
- Persist provider references and relevant event-processing state.
- Deduplicate events and make webhook processing safe to retry.
- Handle timeout, unknown status, delayed success, duplicate events, and provider outages.
- Use provider idempotency or transaction references where supported, and enforce Matinee's own idempotency rules regardless.
- Never assume a provider API call succeeded solely because the request was sent.
- Keep refund state separate from payment state and booking state.
- Never fabricate successful provider responses in production code.
- Test the actual documented Flutterwave flow in a controlled test environment before enabling live transactions.
- Never switch to live payment credentials until the relevant payment, recovery, reconciliation, and launch gates are approved.

### 5.7 Testing and supported versions

- Use the existing test framework unless an approved decision changes it.
- Write tests for normal behaviour, validation failures, authorization failures, concurrent requests, retries, and recovery.
- Test critical state transitions and database invariants, not only individual functions.
- Use supported, compatible dependency versions. Prefer maintained LTS releases when available and compatible with the locked stack.
- Review breaking changes before upgrading dependencies.
- Keep lockfiles consistent with the package manager already approved for the project.
- Do not report tests as passing unless they were actually run and passed.

---

## 6. What Counts as Done?

A task is complete only when its acceptance criteria are met, its implementation is consistent with this file and the PRD, and the relevant checks pass.

At the end of **every task**, provide a completion checklist showing what was done, what was tested, what passed, what remains unresolved, and whether any decision is blocking progress.

### 6.1 Required completion checklist

Include this checklist in the final task response and mark each item honestly.

- [ ] Read `AGENTS.md`, the relevant PRD requirements, and the existing implementation before making changes.
- [ ] Confirmed that the task belongs to the current roadmap phase.
- [ ] Implemented only the approved scope.
- [ ] Preserved all applicable business, security, payment, and inventory invariants.
- [ ] Added or updated tests for the behaviour and relevant edge cases.
- [ ] Verified authorization and server-side validation where applicable.
- [ ] Verified database constraints, migrations, and transaction behaviour where applicable.
- [ ] Verified idempotency and retry behaviour for relevant booking, payment, webhook, or refund changes.
- [ ] Ran the applicable automated tests and recorded the actual results.
- [ ] Ran linting, formatting checks, type checks if approved, and the relevant build command.
- [ ] Confirmed the code builds without errors for the affected application or service.
- [ ] Checked for accidental secrets, unsafe logging, disabled checks, and unrelated changes.
- [ ] Updated relevant API, architecture, operational, or decision documentation.
- [ ] Listed any remaining failures, unresolved decisions, limitations, or blocked acceptance criteria.
- [ ] Confirmed that no launch gate is being represented as passed without evidence.

### 6.2 Definition of done by work type

**For a feature**

- Acceptance criteria are implemented.
- Loading, empty, error, success, and relevant recovery states are handled.
- Tests cover expected behaviour and important edge cases.
- The feature does not bypass an existing domain rule.

**For a database change**

- The Prisma schema validates.
- Migrations apply successfully to a clean database and an existing test database.
- Constraints reject invalid data.
- Historical records remain safe.
- Concurrency-sensitive behaviour is tested against PostgreSQL.

**For booking or inventory work**

- Multi-seat operations are atomic.
- Expiry is checked authoritatively.
- Concurrent allocation tests demonstrate no duplicate current seat ownership.
- Cross-screen allocations are rejected.
- Failure and retry paths preserve correct state.

**For payment or refund work**

- Flutterwave integration uses verified provider outcomes.
- Idempotency, webhook deduplication, timeouts, delayed outcomes, and recovery are tested.
- Unresolved payments and refunds remain visible and recoverable.
- No booking is confirmed solely from a client redirect.

**For operational or launch work**

- Relevant monitoring and alerts exist.
- Recovery and reconciliation procedures are documented and tested.
- Load-test results use an approved traffic profile.
- Required launch gates have explicit evidence and approval.

### 6.3 Build and verification rules

- Never claim that the build passes unless the relevant build command has completed successfully.
- Never claim that tests pass when they were skipped, not run, or failed.
- If the repository currently has unrelated build failures, report them separately. Do not conceal them or claim a clean build.
- If the environment prevents a check from running, state exactly which check could not run and why.
- Do not mark a task complete when a required invariant, test, migration, or acceptance criterion is missing.
- Do not claim that Matinee is production-ready or launch-ready merely because the mobile app and API build.

The final response must contain a concise summary, the completion checklist, actual verification results, and any remaining blockers.

---

## 7. What Does the Agent Do When Unsure?

**When unsure, stop, inspect, and clarify. Never invent product scope or patch uncertainty with spaghetti code.**

Follow these rules in order:

1. **Read before guessing.** Check this file, the PRD, the current roadmap phase, related code, tests, migrations, and documented decisions.
2. **Identify the exact uncertainty.** State what is unknown, why it matters, which requirements it affects, and what decision is needed.
3. **Check whether the decision is already locked.** Follow confirmed choices without reopening them. Do not treat working assumptions as confirmed decisions.
4. **Protect critical invariants.** If an interpretation could affect seat ownership, payment correctness, refunds, permissions, privacy, historical records, or launch safety, do not implement it until the ambiguity is resolved.
5. **Do not invent scope.** Do not add features, workflows, user roles, payment methods, providers, infrastructure, or integrations that the PRD does not authorize.
6. **Do not silently resolve blocking decisions.** Request an explicit decision with an owner and deadline. Do not use a guessed default to unblock a critical implementation.
7. **Continue only on independent work.** You may proceed with tasks that are clearly independent of the unresolved decision and do not constrain future approved options.
8. **Prefer the smallest safe change.** Make the minimum focused change needed to meet the confirmed acceptance criteria. Avoid broad refactors and speculative abstractions.
9. **Document approved decisions.** Update the appropriate decision record and, when necessary, update the PRD or this file before implementing a changed rule.
10. **Report blockers honestly.** Explain what can proceed, what cannot proceed, and the evidence or decision required to continue.

### Decisions that require a stop

Stop the dependent work if any of these remain unresolved:

- Launch market, initial cinema pilot, or the required validation gate.
- Ownership of inventory shared with another ticketing channel.
- Guest versus authenticated checkout when implementing identity or checkout.
- Flutterwave capability verification, merchant of record, fund flow, or settlement model when implementing payment or approving commercial launch.
- Cancellation, refund, cinema-cancellation, or dispute policy when implementing affected flows or approving launch.
- Hold duration when finalizing hold configuration.
- TypeScript or administration-framework approval when scaffolding the affected application.
- Traffic profile, budget, and recovery objectives when signing off infrastructure or performance.
- Privacy, retention, or regulatory obligations when approving production launch.
- Any schema ambiguity that could permit double-selling, invalid seat allocation, lost financial history, or inconsistent state transitions.

### Final operating principle

Build the product the approved PRD describes, in the approved phase, using the locked technologies and the business rules in this file.

Do not optimize away a safety rule, invent a missing requirement, conceal an unresolved outcome, or trade data integrity for convenience.

**If the code runs but violates a rule in this file, the task has failed.**