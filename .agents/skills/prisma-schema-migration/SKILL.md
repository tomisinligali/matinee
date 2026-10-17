---
name: prisma-schema-migration
description: >-
  Use this skill whenever modifying the Prisma schema, database models, migrations, constraints, or indexes.
  Trigger: Any change to the Prisma schema, database structure, constraints, or indexes.
  Load when: Adding or changing stored data or migrating existing records.
  Teaches the safe sequence for inspecting dependencies, designing and applying migrations, preserving existing data and invariants, and verifying the resulting schema.
---

# Prisma Schema & Database Migration

This skill defines the mandatory workflow for schema modifications and PostgreSQL migrations in Matinee.

PostgreSQL is the single source of truth for Matinee inventory, bookings, and financial state. As mandated in `database-schema.md`, Prisma is our primary ORM, but Prisma migrations must be paired with reviewed, raw PostgreSQL SQL whenever business invariants, partial indexes, or check constraints cannot be natively expressed by Prisma.

---

## Migration Philosophy: Invariants First

1. **Monetary Integrity**:
   - Never use `Float` or floating-point types for currency amounts.
   - Always store monetary amounts as integers representing the smallest currency minor unit (e.g. `kobo` for NGN, `cents` for USD).
   - Pair every monetary amount with an explicit ISO 4217 currency column (`currency String @db.VarChar(3)`).
2. **Double-Allocation Prevention**:
   - Do not rely on application-level read-then-write checks for seat exclusivity.
   - PostgreSQL must enforce that no two active holds or confirmed bookings can hold the same `(showtime_id, seat_id)` simultaneously.
   - Use partial unique indexes where state determines uniqueness (e.g. `WHERE status IN ('HELD', 'CONFIRMED')`).
3. **Preservation of History**:
   - Never drop or truncate historical booking, payment attempt, refund, webhook event, or audit tables.
   - Never cascade-delete financial records upon the deletion of a user, cinema, screen, or seat.
   - Booking seat snapshots must preserve purchase-time unit prices, currency, seat labels, and ticket types.

---

## Step-by-Step Migration Sequence

### Step 1: Inspect Dependencies & Existing Data
1. Review all domain services, models, and queries interacting with the targeted tables.
2. Determine if the change alters existing column types, adds non-nullable fields, or drops tables/columns.
3. If changing active production data, plan an **Expand-and-Contract** phased migration:
   - *Expand*: Add the new nullable column or table; dual-write in application code.
   - *Backfill*: Safely migrate historical data in bounded batches.
   - *Contract*: Apply `NOT NULL` constraint or remove obsolete columns in a subsequent release.

### Step 2: Edit `prisma/schema.prisma`
1. Update models, relations, field attributes (`@id`, `@default`, `@db.*`), and indexes.
2. Ensure referential integrity:
   - Use `@relation(onDelete: Restrict)` for essential parent entities (e.g. Cinema, Screen, Showtime, Booking) to prevent accidental cascading deletion of financial or inventory history.
3. Run schema validation:
   ```bash
   npx prisma validate
   ```

### Step 3: Generate Draft Migration SQL
1. Generate the migration file using `prisma migrate dev --create-only`:
   ```bash
   npx prisma migrate dev --create-only --name <descriptive_snake_case_name>
   ```
2. Inspect the generated `.sql` file in `prisma/migrations/<timestamp>_<name>/migration.sql`.

### Step 4: Augment with Custom PostgreSQL Constraints & Partial Indexes
Prisma cannot express all required PostgreSQL constraints. Manually add reviewed SQL to the generated `migration.sql` for:

- **Partial Unique Indexes for Active Seat Allocations**:
  ```sql
  -- Ensure only one active hold or confirmed booking exists per seat per showtime
  CREATE UNIQUE INDEX IF NOT EXISTS "unique_active_seat_allocation"
  ON "seat_allocations" ("showtime_id", "seat_id")
  WHERE "status" IN ('HELD', 'CONFIRMED');
  ```

- **Cross-Screen Seat Validation Check**:
  ```sql
  -- Ensure non-negative minor-unit monetary values
  ALTER TABLE "bookings"
  ADD CONSTRAINT "check_total_amount_non_negative"
  CHECK ("total_amount_minor" >= 0);
  ```

- **Idempotency Key Fingerprint Uniqueness**:
  ```sql
  -- Enforce unique idempotency keys within scope
  CREATE UNIQUE INDEX IF NOT EXISTS "unique_idempotency_key_scope"
  ON "idempotency_keys" ("scope", "key");
  ```

### Step 5: Test & Apply Migration Locally
1. Apply migrations to the development database:
   ```bash
   npx prisma migrate dev
   ```
2. Verify Prisma Client generation:
   ```bash
   npx prisma generate
   ```

### Step 6: Verify Database Constraints & Invariants
Run automated integration tests verifying:
- [ ] Attempting to insert a duplicate active hold for `(showtime_id, seat_id)` throws a unique constraint violation (`P2002` or PostgreSQL `23505`).
- [ ] Attempting to insert negative monetary amounts fails via check constraint.
- [ ] Foreign key deletion on a parent cinema or screen with active bookings is rejected (`Restrict`).
- [ ] The migration applies cleanly from scratch onto an empty test database (`prisma migrate reset` in test environment).

---

## Prohibited Shortcuts & Anti-Patterns
- **NO Silent Destructive Migrations**: Never run `prisma db push` on staging/production databases.
- **NO Application-Only Invariants**: Never trust ORM lifecycle hooks for critical uniqueness. Enforce it in PostgreSQL.
- **NO Floating-Point Money**: Never use `Float` or `Decimal` without exact scale/precision for financial values.
- **NO Cascading Deletes on Financial Records**: Never allow `onDelete: Cascade` on bookings, payments, or refunds.
