---
name: cinema-inventory-lifecycle
description: >-
  Use this skill when creating or modifying cinemas, screens, seats, or showtimes in Matinee.
  Trigger: Creating or changing cinemas, screens, seats, or showtimes.
  Load when: Implementing cinema administration or inventory-management workflows.
  Teaches how to validate ownership and entity relationships, safely create or modify inventory, account for existing bookings, and preserve audit history.
---

# Cinema Inventory Lifecycle

This skill defines the operational workflow for managing cinemas, screens, seat layouts, and showtimes within Matinee.

Cinema inventory rules are authoritative in PostgreSQL. Adhere to `scheduling-integrity.md`, `database-schema.md`, and `security.md`. Never allow client state or cached responses to bypass server-side validation.

---

## Entity Relationship Hierarchy

```
[ Cinema ]
   ├── Memberships (Operator Roles: ADMIN, MANAGER, STAFF)
   └── [ Screen ] (Belongs to exactly 1 Cinema)
         ├── [ Configured Seats ] (Belongs to exactly 1 Screen; row, column, label, tier)
         └── [ Showtimes ] (References 1 Screen, 1 Movie, start/end timestamps, status)
               ├── [ Seat Restrictions ] (Physical seat disabled/reserved per showtime)
               ├── [ Active Holds ] (Atomic, time-bounded reservations)
               └── [ Bookings & Ticket Snapshots ] (Authoritative historical allocations)
```

---

## Operational Workflows

### 1. Cinema & Operator Membership Validation
- Every administrative request must verify that the authenticated operator has an active membership associated with the specified `cinemaId`.
- Validate role permissions (e.g. only authorized cinema admins/managers can alter screen layouts or cancel showtimes).
- Revoking operator membership must take effect immediately and prevent future changes without affecting existing cinema bookings.

### 2. Screen & Seat Configuration Lifecycle
- **Creation**:
  - Configure screens with unique names/numbers within the cinema.
  - Generate physical seats deterministically with valid coordinates (`row`, `column`, `label`, `seatType` or `category`).
  - Enforce database uniqueness on `(screenId, row, column)` and `(screenId, label)`.
- **Modification & Deactivation**:
  - Do not alter or delete physical seat configurations if active holds or confirmed future bookings exist for that seat layout.
  - If seats are damaged or physically unavailable for a specific screening, use a **Showtime Seat Restriction** record rather than destroying the physical seat record or deleting historical purchases.
  - Never cascade-delete screens or seats that have historical booking associations. Use soft deactivation/archival flags (`isActive = false`).

### 3. Showtime Scheduling & Integrity
- **Conflict Prevention**:
  - When scheduling a showtime on a screen, calculate the total block time: `movie.runtimeMinutes + cleaningBufferMinutes`.
  - Enforce server-side overlap checks: no two non-cancelled showtimes on the same screen may overlap in time:
    ```sql
    -- Enforce no overlapping showtimes on the same screen
    SELECT id FROM showtimes
    WHERE screen_id = $screenId
      AND status != 'CANCELLED'
      AND start_time < $newEndTime
      AND end_time > $newStartTime;
    ```
- **Showtime Status Transitions**:
  - Valid statuses: `SCHEDULED`, `OPEN_FOR_BOOKING`, `CLOSED`, `CANCELLED`, `COMPLETED`.
  - Revalidate cinema status: If a cinema is suspended or deactivated, its showtimes must automatically reject new seat holds and booking attempts.

### 4. Showtime Cancellation & Schedule Alteration
- Never silently delete a showtime from the database.
- Transition status to `CANCELLED` transactionally.
- When cancelling a showtime with confirmed bookings:
  1. Record an audit log entry detailing the actor, reason, and timestamp.
  2. Prevent any new seat holds or checkout operations.
  3. Release all active temporary holds.
  4. Initiate the approved customer notification and refund/credit workflow for all confirmed bookings.
  5. Preserve all booking and ticket snapshot records for financial reconciliation.

### 5. Audit Logging & Historical Preservation
- Every mutation to cinema configurations, screens, seats, or showtimes must generate an audit log record:
  - `actorId`: The authenticated user initiating the change.
  - `cinemaId`: Target cinema.
  - `entityType`: `CINEMA`, `SCREEN`, `SEAT`, or `SHOWTIME`.
  - `action`: `CREATE`, `UPDATE`, `DEACTIVATE`, `CANCEL`.
  - `beforeSnapshot` / `afterSnapshot`: JSON diff of altered properties.
  - `timestamp`: Server-generated UTC timestamp.
- Changes to seat labels or ticket prices must never alter purchase-time snapshots of past or active bookings.

---

## Prohibited Shortcuts & Anti-Patterns
- **NO Hard Deletions**: Never delete seats, screens, or showtimes that have historical bookings or payments attached.
- **NO Unvalidated Overlaps**: Never schedule showtimes without database-level or transactional overlap verification.
- **NO Disabling Seats by Deleting Them**: Use showtime-specific seat restrictions rather than deleting seats from screens.
- **NO Silent Suspensions**: Cinema suspension must stop new bookings immediately while maintaining access to existing tickets for customers and auditors.
