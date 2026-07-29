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
