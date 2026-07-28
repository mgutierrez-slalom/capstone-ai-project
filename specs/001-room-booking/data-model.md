# Data Model: RoomFlow Booking

## Entity: Room

Purpose: Represents a meeting room users can book.

Fields:
- id: string, primary key, generated with cuid
- name: string, required, unique
- capacity: integer, required, positive
- location: string, required
- createdAt: datetime, generated at insert
- updatedAt: datetime, auto-updated on change

Relationships:
- one-to-many with Booking through Booking.roomId

Validation Rules:
- name must be unique across rooms
- capacity must be greater than zero

Seeded Rooms (Created in prisma/seed.ts):
- **Orion**: capacity 4, location "Floor 2"
- **Andromeda**: capacity 8, location "Floor 2"
- **Apollo**: capacity 12, location "Floor 3"

## Entity: Booking

Purpose: Represents a reservation for a room during a specific time range.

Fields:
- id: string, primary key, generated with cuid
- roomId: string, required, foreign key to Room.id
- organizerName: string, required, non-empty
- title: string, required, non-empty
- startTime: datetime, required, UTC
- endTime: datetime, required, UTC
- status: enum BookingStatus, required, default CONFIRMED
- createdAt: datetime, generated at insert
- updatedAt: datetime, auto-updated on change

Relationships:
- many-to-one with Room through roomId

Indexes:
- composite index on roomId, startTime, endTime to support overlap lookups

Validation Rules:
- organizerName and title must be trimmed and non-empty after validation
- endTime must be strictly later than startTime (endTime > startTime)
- startTime must be in the future at create time (compared against server UTC)
- duration must be less than or equal to 4 hours (inclusive: exactly 4h allowed)
- overlap with existing CONFIRMED bookings in same room is not allowed
- consecutive bookings are allowed
- CANCELLED bookings are excluded from overlap blocking

State Transitions:
- CONFIRMED -> CANCELLED via cancel operation
- CANCELLED is terminal in MVP (no restore flow)

## Enum: BookingStatus

Values:
- CONFIRMED
- CANCELLED

Semantics:
- CONFIRMED participates in availability checks
- CANCELLED remains persisted for audit and does not block future reservations

## Derived Rules and Invariants

- Overlap rule: candidate.start < existing.end AND candidate.end > existing.start
- Adjacent boundaries are valid and non-overlapping
- Booking rows are never hard deleted in MVP
- All business rule checks are implemented in src/lib/booking
- Persistence read and write access is isolated in src/lib/prisma
