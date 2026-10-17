---
trigger: always_on
---


# Database Schema and Migrations

## Authority and Scope

- Follow the logical data model and invariants in `PRD.md` and the database requirements in `AGENTS.md`.
- PostgreSQL is authoritative for Matinee-managed cinema inventory, showtimes, prices, holds, current allocations, bookings, payment attempts, and refunds.
- Prisma is the primary ORM. Use reviewed PostgreSQL SQL and migrations when required constraints or concurrency controls cannot be expressed adequately in Prisma.
- Treat illustrative schemas as examples, not production-ready models.
- Do not weaken an invariant to accommodate an inconvenient schema design.

## Required Data Model

Represent the logical entities required by the PRD, including:

- Users and authentication-related identity records.
- Cinemas and explicit cinema memberships.
- Movies with nullable external TMDB identifiers where appropriate.
- Screens, configured seats, and showtimes.
- Showtime-specific seat restrictions where required.
- Seat holds and current seat allocations.
- Bookings and immutable booking-seat snapshots.
- Separate payment attempts and provider references.
- Webhook events and processing state.
- Refund records and idempotency references.
- Durable notification jobs.
- Audit logs and relevant correlation identifiers.

Exact names and supporting entities may evolve, but all required relationships, historical records, and business invariants must remain represented.

## Relationships and Integrity

- Every screen belongs to exactly one cinema.
- Every configured seat belongs to exactly one screen.
- Every showtime references one movie and one screen.
- Every allocation must reference a seat belonging to the showtime's screen.
- A booking must reference the correct showtime and approved customer or guest identity.
- Every booking-seat snapshot belongs to a booking and preserves purchase-time details.
- Payment attempts belong to a booking and remain separate historical records.
- Webhook event uniqueness must follow the provider's documented event-identity scope.
- Idempotency keys must be unique within their explicitly defined operation scope.
- Reusing an idempotency key with a different request fingerprint must be rejected.

## Seat Allocation and Concurrency

- PostgreSQL must prevent more than one current owner for a given `(showtimeId, seatId)`.
- Do not rely on a Prisma relation or application-level existence check as the sole double-allocation safeguard.
- If released allocations are retained as history, use a model and database constraints that permit valid future ownership without allowing overlapping current ownership.
- Use an appropriate PostgreSQL partial unique index or another reviewed database-enforced design when state-dependent uniqueness requires it.
- Validate that a seat belongs to the screen assigned to its showtime through database-enforced constraints where feasible and transactional validation otherwise.
- Do not assume ordinary foreign keys enforce cross-table screen membership.
- Multi-seat allocation must be atomic: all requested seats are secured or none are.
- Use transactions, conditional updates, appropriate row locks, and consistent lock ordering.
- Handle uniqueness conflicts, deadlocks, and serialization failures safely with bounded retries.
- A failed or exhausted transaction must not leave a partial allocation or falsely report success.
- Hold expiry must be checked against authoritative time inside the transaction that makes the relevant allocation decision.

## Historical Records and Deletion

- Preserve historical booking, payment, refund, webhook, audit, and purchase records.
- Do not cascade-delete financial history because a user, cinema, screen, seat, showtime, or other related record is deleted or deactivated.
- Use restrictive deletion, archival, nullable references where justified, or other explicit retention strategies appropriate to the relationship.
- Never delete a historical booking-seat record merely because current inventory is released.
- Preserve purchase-time seat labels, ticket categories, unit prices, currency, and applicable fee/tax snapshots.
- Inventory label changes and price changes must not rewrite historical purchases.
- Keep current operational state distinct from historical transaction records.
- Never store monetary amounts as floating-point values. Use an explicitly defined integer minor-unit representation when supported by the approved financial model, or another precisely specified representation where necessary.
- Keep currency codes, currency exponents, provider amount formats, and rounding rules explicit.

## Schema Changes and Migrations

- Update the Prisma schema and migrations together.
- Review generated migration SQL before applying schema changes.
- Use migrations for schema changes; do not manually modify production schema as a substitute.
- Do not introduce destructive migrations that silently discard historical or financially relevant data.
- Use an expand-and-contract migration approach when a change requires compatibility across deployment stages.
- Consider existing data, concurrent application versions, rollback limitations, and backfill safety before deployment.
- Add reviewed SQL migrations for required indexes or constraints not adequately expressible in Prisma.
- Document changes that affect domain invariants, data retention, or operational recovery.
- Never represent an illustrative schema fragment as the complete production model.

## Required Verification

For applicable database changes:

- `prisma validate` passes.
- Migrations apply to a clean database.
- Migrations apply to a representative existing test database.
- Foreign keys, uniqueness constraints, and relevant check constraints reject invalid data.
- Cross-screen allocations are rejected.
- Concurrent transactions cannot establish duplicate current seat ownership.
- Released historical allocations do not block valid future allocations.
- Historical purchase snapshots remain unchanged after inventory edits.
- Payment, webhook, refund, and idempotency records survive retries and recovery.
- Deletion behaviour preserves required historical records.
- Failure-injection and rollback or recovery behaviour are tested where applicable.

Do not report database work as complete while a required invariant is unimplemented or unverified.
