---
name: api-endpoint-builder
description: >-
  Use this skill when creating or modifying backend Express API endpoints in Matinee.
  Trigger: Creating or modifying a backend API endpoint.
  Load when: Implementing routes for cinema inventory, showtimes, bookings, payments, refunds, or administration.
  Teaches the ordered process for defining the API contract, validating inputs, enforcing access, invoking domain logic, handling errors and retries, and testing the endpoint.
---

# API Endpoint Builder

This skill defines the mandatory, step-by-step workflow for creating or modifying backend API endpoints in Matinee's Express and Prisma backend.

All endpoints must respect the separation of concerns mandated in `coding-standard.md`, `security.md`, `booking-lifecycle.md`, and `money-billing.md`. Express route handlers are thin orchestrators: they validate input, enforce authentication and authorization, invoke domain services, and translate outcomes into standard HTTP responses.

---

## Architecture & Boundaries

```
[ HTTP Request ]
       │
       ▼
[ Rate Limiter & Security Headers ]
       │
       ▼
[ Route Handler / Controller ]
  ├─ 1. Authenticate Request
  ├─ 2. Authorize Resource & Tenant Access
  └─ 3. Validate Request Parameters & Body (Schema)
       │
       ▼
[ Domain Service Layer ] ──> [ Prisma / PostgreSQL Transaction ]
       │
       ▼
[ Canonical HTTP Response Formatter ]
```

---

## Step-by-Step Implementation Sequence

### Step 1: Define the API Contract & Route Interface
1. Define the HTTP method, endpoint path, URL parameters, query parameters, request headers (including `Idempotency-Key` where applicable), and response body schemas.
2. Follow RESTful conventions and versioning:
   - Group routes logically under their domain namespace (e.g. `/api/v1/cinemas`, `/api/v1/showtimes`, `/api/v1/bookings`, `/api/v1/payments`).
   - Reserve state-changing POST/PUT/PATCH endpoints for explicit, intentional domain mutations.
3. For retryable state-changing operations (such as checkout, hold creation, payments, or refunds), require a stable client-generated `Idempotency-Key` header.

### Step 2: Validate Untrusted Input at the System Boundary
1. Validate all inputs before touching domain services or database queries:
   - Route path parameters (e.g. UUIDs, IDs).
   - Query strings (pagination limits, date ranges, filters).
   - Request bodies (schema validation, field types, string lengths, integer boundaries).
2. Never rely on TypeScript types alone for runtime safety. Use runtime schema validation.
3. Reject unknown, malformed, or out-of-range inputs immediately with `400 Bad Request` or `422 Unprocessable Entity` and standard descriptive error objects.
4. Monetary values must strictly be integer minor units (e.g. kobo/cents). Never accept floating-point numbers for amounts.

### Step 3: Enforce Authentication & Role-Based Authorization
1. Verify authentication using the approved authentication middleware (e.g. session or verified token).
2. Enforce tenancy and ownership:
   - **Customer Endpoints**: Verify the requesting user owns the requested booking, ticket, or profile (`req.user.id === resource.userId`). Never trust client-supplied `userId`.
   - **Cinema Operator Endpoints**: Verify that the authenticated operator has an active membership for the specific `cinemaId` targeted by the request. Verify their assigned role permissions.
   - **Platform Administration**: Verify platform-level administrative privileges for sensitive global operations.
3. Return `401 Unauthorized` for missing/invalid credentials, and `403 Forbidden` for authenticated requests lacking permission. Do not leak details about the existence of protected resources to unauthorized callers.

### Step 4: Delegate to Domain Services (No Business Logic in Controllers)
1. Route handlers must never execute raw database queries, compute prices, or manage transaction rollbacks directly.
2. Pass sanitized, validated parameters and actor context to the appropriate domain service (e.g., `BookingService`, `InventoryService`, `PaymentService`).
3. Domain operations that modify multiple entities or enforce inventory exclusivity must be wrapped in PostgreSQL database transactions with explicit isolation levels.

### Step 5: Canonical Error Handling & Response Mapping
Map domain outcomes to consistent HTTP status codes:

| Outcome | HTTP Status | Description |
|---|---|---|
| Success (Read / Update) | `200 OK` | Normalized response payload |
| Resource Created | `201 Created` | Created resource representation |
| Invalid Input / Schema | `400 Bad Request` | Detailed field validation errors |
| Unauthenticated | `401 Unauthorized` | Missing or invalid authentication |
| Forbidden Access | `403 Forbidden` | Authenticated, but unauthorized for this resource |
| Not Found | `404 Not Found` | Entity does not exist or user cannot see it |
| Inventory Conflict | `409 Conflict` | Seat already held or booked; showtime full |
| Business Invariant Failed | `422 Unprocessable Entity` | Expired hold, invalid state transition |
| Rate Limited | `429 Too Many Requests` | Rate limit threshold exceeded |
| Internal Server Error | `500 Internal Server Error` | Unexpected failure; log securely, sanitize response |

**Critical Error Rules**:
- Never swallow exceptions or return `200 OK` with `{ success: false }`.
- Never expose internal database error details, stack traces, or credentials in API responses.
- Structured errors should follow the consistent JSON format:
  ```json
  {
    "error": {
      "code": "INVENTORY_CONFLICT",
      "message": "One or more requested seats are no longer available.",
      "details": []
    }
  }
  ```

### Step 6: Automated Verification & Testing
Before considering the endpoint complete, write or update automated tests covering:
1. **Happy Path**: Successful execution and correct schema output.
2. **Schema & Input Validation**: Missing required fields, invalid formats, negative numbers, extra malicious fields.
3. **Authentication & Authorization**: Unauthenticated request (401), unauthorized customer accessing another customer's booking (403/404), operator accessing another cinema's data (403).
4. **Domain Conflicts & Invariants**: Inventory conflicts (409), expired holds (422), showtime status violations.
5. **Idempotency**: Repeated requests with the same idempotency key return the cached/stable result without re-executing side effects.

---

## Prohibited Shortcuts & Anti-Patterns
- **NO Business Logic in Routes**: Handlers must not compute ticket prices, decide hold validity, or manipulate database transactions directly.
- **NO Client Trust**: Never trust client-supplied prices, totals, fee percentages, booking statuses, or user IDs.
- **NO Swallowing Errors**: Never convert database failures or ambiguous external outcomes into `200 OK`.
- **NO Floating-Point Currency**: Never accept or return fractional currency amounts; use integer minor units.
