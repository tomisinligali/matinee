---
trigger: always_on
---

# Scheduling and Inventory Integrity Rules

## Authority and Scope
- Follow `AGENTS.md`, the PRD, `database-schema.md`, and `booking-lifecycle.md`.
- PostgreSQL is the authoritative source for showtimes, seat availability, holds, and allocations.
- Caches and client-side state may improve performance but must never authorize a seat sale.
- Do not invent showtime, seat-release, or external inventory-coordination policies.

## Showtime Integrity
- Every showtime must reference a valid cinema, screen, movie, and applicable schedule data.
- Validate showtime dates, times, duration, status, and screen compatibility on the server.
- Prevent conflicting showtimes on the same screen according to the approved scheduling rules.
- Revalidate showtime status before creating holds and proceeding to checkout.
- Cancel or update showtimes through explicit, auditable transitions; do not silently delete history.
- Suspended cinemas and cancelled showtimes must not accept new bookings.
- Apply material schedule changes transactionally where related records must remain consistent.

## Seat and Screen Integrity
- Every configured seat belongs to its intended screen.
- Validate requested seats against the screen assigned to the selected showtime.
- Represent physical seat configuration, showtime-specific restrictions, temporary holds, active allocations, and historical purchased seats as distinct concepts.
- A disabled seat must not be represented as a customer allocation.
- Preserve historical seat labels and purchase details even if cinema configuration changes later.
- Never trust client-provided seat availability or allocation status.

## Holds and Expiry
- Create seat holds atomically for the entire requested seat set.
- A multi-seat request must either secure all requested seats or fail without leaving a partial hold.
- Each hold must have a clear owner, associated showtime, seat set, status, and authoritative expiry.
- Enforce expiry using server/database time within the transaction that claims or reallocates inventory.
- A scheduled cleanup job may remove expired records but must not determine whether a hold is valid.
- Revalidate hold ownership and expiry before checkout and confirmation.
- Prevent expired holds from being extended or reused through stale requests.

## Concurrency and Allocation
- Enforce seat uniqueness for active holds and confirmed allocations using appropriate PostgreSQL constraints and transactional logic.
- Concurrent requests for the same seat must not both succeed.
- Use transactions, appropriate locking, and constraint-conflict handling for allocation.
- Treat unique-constraint conflicts as expected inventory conflicts where appropriate; do not hide them.
- Retry only safe, transient transaction failures with bounded attempts.
- A confirmed seat allocation must never be overwritten by a stale request or delayed event.
- Redis locks or application-level checks must never replace PostgreSQL integrity constraints.

## Cross-Channel Inventory
- Do not assume Matinee is the only system selling a cinema's seats.
- Confirm the inventory ownership and coordination model before enabling shared or externally managed inventory.
- If another channel can sell the same seats, use an approved integration or allocation agreement.
- Where inventory synchronization is asynchronous, define how conflicts are detected, reconciled, and escalated.
- Do not claim double-selling prevention across systems without a verified coordination mechanism.

## Testing Requirements
Test:
- Concurrent customers competing for the same seat.
- Concurrent multi-seat requests with overlapping seats.
- Expired-hold reclamation by competing transactions.
- Hold expiry during checkout.
- Invalid seat-to-screen and showtime relationships.
- Cancelled showtimes and suspended cinemas.
- Database constraint conflicts and transaction retries.
- Late payment after seats have been allocated elsewhere.
- External inventory conflicts where cross-channel sales are supported.

## Completion Requirements
- PostgreSQL constraints and transactional logic enforce inventory correctness.
- The defined concurrency test suite must demonstrate zero double-allocation.
- Preserve booking history while safely releasing current inventory under approved transitions.
- Document unresolved cross-channel inventory assumptions as blockers.