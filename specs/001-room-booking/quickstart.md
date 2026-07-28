# Quickstart: Validate RoomFlow Booking MVP

This guide verifies RoomFlow end-to-end behavior for rooms, bookings, overlap prevention, and cancellation in the MVP scope.

## Prerequisites

- Node.js LTS installed
- pnpm installed
- Repository dependencies installed

## Setup

1. Install dependencies.

```bash
pnpm install
```

2. Generate Prisma client and apply migrations.

```bash
pnpm prisma generate
pnpm prisma migrate dev
```

3. Seed default rooms.

```bash
pnpm prisma db seed
```

## Run the app

```bash
pnpm dev
```

Open http://localhost:3000.

## Run quality gates

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Expected outcome: all commands pass.

## Validation Scenarios

### Scenario 0: Empty states (if database unseeded)

- If rooms table is empty, GET /api/rooms returns empty array and UI displays "No rooms available".
- If bookings table is empty, GET /api/bookings returns empty array and UI displays "No bookings".

### Scenario 1: Room list loads

- Call GET /api/rooms or open the dashboard.
- Expected: seeded rooms (Orion, Andromeda, Apollo) are returned sorted alphabetically by name and rendered.

### Scenario 2: Successful booking creation

- Submit POST /api/bookings with valid roomId, title, organizerName, startTime, endTime.
- Expected: HTTP 201 and booking status CONFIRMED.

### Scenario 3: Overlap rejection

- Create booking A from 10:00 to 11:00.
- Attempt booking B from 10:30 to 11:30 in same room.
- Expected: HTTP 409 with error code BOOKING_CONFLICT.

### Scenario 4: Consecutive booking allowed

- With existing 10:00 to 11:00 booking, create 11:00 to 12:00 booking.
- Expected: HTTP 201; no conflict.

### Scenario 5: Invalid range rejection

- Submit booking where endTime is equal to or earlier than startTime.
- Expected: HTTP 422 with code INVALID_TIME_RANGE.

### Scenario 6: Maximum duration rejection

- Submit booking longer than 4 hours.
- Expected: HTTP 400 with code MAX_DURATION_EXCEEDED.

### Scenario 7: Past booking rejection

- Submit booking with startTime in the past.
- Expected: HTTP 400 with code BOOKING_IN_PAST.

### Scenario 8: Room not found error

- Submit POST /api/bookings with an invalid (non-existent) roomId.
- Expected: HTTP 400 with error code ROOM_NOT_FOUND.

### Scenario 9: String trimming and non-empty validation

- Submit booking with organizerName or title that is empty or contains only whitespace.
- Expected: HTTP 400 with error code INVALID_INPUT.
- Submit booking with organizerName or title that is valid after trimming (e.g., " Alice " or "  Meeting  ").
- Expected: HTTP 201 with trimmed values stored.

### Scenario 10: Cancellation preserves record and frees slot

- Cancel a CONFIRMED booking through POST /api/bookings/{id}/cancel.
- Expected: booking becomes CANCELLED.
- Then create a new booking in the same time slot.
- Expected: creation succeeds because CANCELLED bookings do not block availability.

## References

- Data model: specs/001-room-booking/data-model.md
- API contracts: specs/001-room-booking/contracts/booking-api.openapi.yaml
- Feature specification: specs/001-room-booking/spec.md
