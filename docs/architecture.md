# Architecture: RoomFlow

## Overview

RoomFlow is a modular monolith built with Next.js App Router. All layers live in a single repository but are separated by directory convention and import discipline.

```
HTTP Request
    │
    ▼
┌─────────────────────────┐
│   Presentation Layer    │  src/app/  (pages, layout)
│   React Components      │  src/components/
└────────────┬────────────┘
             │ calls
             ▼
┌─────────────────────────┐
│   Route Handler Layer   │  src/app/api/**/route.ts
│   (thin HTTP adapters)  │
└────────────┬────────────┘
             │ calls
             ▼
┌─────────────────────────┐
│   Service / Domain      │  src/lib/booking/
│   Layer                 │  booking-service.ts, booking-rules.ts
└────────────┬────────────┘
             │ calls
             ▼
┌─────────────────────────┐
│   Persistence Layer     │  src/lib/prisma/
│   (repositories)        │  room-repository.ts, booking-repository.ts
└────────────┬────────────┘
             │ uses
             ▼
┌─────────────────────────┐
│   Database              │  SQLite (better-sqlite3 driver adapter)
└─────────────────────────┘
```

## Layer Responsibilities

### Presentation Layer (`src/app/`, `src/components/`)

- Renders UI with React and Tailwind CSS.
- Calls the API tier via `fetch`; does not import from `src/lib/` directly.
- Components are responsible for local UI state (loading, optimistic updates) only.

### Route Handler Layer (`src/app/api/`)

- Thin HTTP adapters: parse request body, call the service layer, return JSON responses.
- No business logic.
- Responsible for HTTP status code mapping.

| Endpoint | Method | Description |
|---|---|---|
| `/api/rooms` | GET | Return all rooms sorted by name |
| `/api/bookings` | GET | Return all CONFIRMED bookings sorted by startTime |
| `/api/bookings` | POST | Create a booking with full validation |
| `/api/bookings/[id]/cancel` | POST | Cancel a confirmed booking |

### Service / Domain Layer (`src/lib/booking/`)

- Orchestrates validation and persistence in a single logical unit.
- `booking-rules.ts` — pure functions for overlap detection, time-range validation, and maximum duration enforcement.
- `booking-service.ts` — coordinates rule checks, transactional conflict re-check, and repository calls.
- `error-types.ts` — structured error codes returned to callers.

### Persistence Layer (`src/lib/prisma/`)

- Repository functions isolate all SQL/ORM access.
- `client.ts` — PrismaClient singleton (global instance in development to avoid hot-reload exhaustion).
- `room-repository.ts` — read-only room queries.
- `booking-repository.ts` — booking queries, creation, and status updates.

## Key Design Decisions

| Decision | Rationale |
|---|---|
| SQLite via `better-sqlite3` | Zero-config, file-based, sufficient for single-office MVP |
| Soft-delete cancellations | Preserves audit trail; cancelled rows do not block availability |
| Server UTC as time reference | Prevents client clock skew for past-booking validation |
| Transactional conflict re-check | Prevents race conditions under concurrent booking attempts |
| No authentication | Explicitly out of scope for MVP |

## Data Model

```
Room
  id        String  (cuid)
  name      String  (unique)
  capacity  Int
  location  String
  bookings  Booking[]

Booking
  id            String  (cuid)
  roomId        String  → Room.id
  organizerName String
  title         String
  startTime     DateTime
  endTime       DateTime
  status        BookingStatus  (CONFIRMED | CANCELLED)
  createdAt     DateTime
  updatedAt     DateTime
```

Composite index on `(roomId, startTime, endTime)` optimizes overlap queries.

## Persistence Boundary & Transaction Ownership

The **booking-repository** layer owns all transaction logic and database operations. The service layer coordinates domain decisions but **does not** interact with PrismaClient directly.

### Atomic Booking Creation

Function: `bookingRepo.createBookingWithConflictCheck(input)`

- Owns the transaction lifecycle
- Performs conflict re-check inside the transaction
- Returns the created Booking on success, or `null` if a conflict was detected
- Throws infrastructure errors (Prisma/SQLite failures) unchanged
- **Prevents race conditions**: two concurrent identical requests for the same room/time cannot both succeed

**SQLite Behavior**: Transactions serialize on write. The first writer succeeds; the second blocks, re-checks inside its transaction, finds the conflict, and returns null.

### Atomic Booking Cancellation

Function: `bookingRepo.cancelBookingIfConfirmed(bookingId)`

- Uses conditional UPDATE: only rows where `status = 'CONFIRMED'` are updated to `'CANCELLED'`
- No read-then-update pattern (avoids race-prone double-cancellation)
- Returns the cancelled Booking on success, or `null` if the booking didn't exist or was already cancelled
- Throws infrastructure errors unchanged
- **Guarantees**: only one concurrent cancellation can succeed

### Service Layer Coordination

The booking-service layer:

1. Validates domain rules (empty fields, time ranges, future times, duration, room existence)
2. Calls atomic repository functions
3. Maps outcomes to domain errors (BOOKING_CONFLICT, BOOKING_ALREADY_CANCELLED, BOOKING_NOT_FOUND)
4. Lets infrastructure errors bubble up (logs with context)

## Error Classification

### Domain Errors

These are expected and represent business rule violations. Returned to the client with appropriate HTTP status codes:

| Error Code | HTTP | Meaning |
|---|---|---|
| INVALID_INPUT | 400 | Empty/whitespace field or missing required field |
| INVALID_TIME_RANGE | 422 | `endTime ≤ startTime` |
| BOOKING_IN_PAST | 400 | `startTime ≤ current UTC time` |
| MAX_DURATION_EXCEEDED | 400 | Booking duration > 4 hours |
| ROOM_NOT_FOUND | 400 | Room ID does not exist |
| BOOKING_CONFLICT | 409 | Time slot already booked in same room |
| BOOKING_NOT_FOUND | 404 | Booking ID does not exist |
| BOOKING_ALREADY_CANCELLED | 409 | Attempt to cancel an already-CANCELLED booking |

### Infrastructure Errors

Unexpected failures from Prisma, SQLite, transactions, or I/O:

- **Never automatically classified** as a domain error (especially not as BOOKING_CONFLICT)
- Logged with full context (stack trace) for debugging
- Returned to the client as HTTP 500 with generic message (no SQL, file paths, or internal details)
- Examples: database locked, connection pool exhausted, schema mismatch, corrupted index
