# Implementation Plan

## Technical Stack

- Next.js
- TypeScript
- App Router
- Tailwind CSS
- Prisma
- SQLite
- Vitest
- GitHub Actions
- pnpm

## Architecture

The project uses a single Next.js application containing:

- frontend pages and components;
- route handlers;
- domain rules;
- application services;
- Prisma persistence.

## Layers

### Presentation

Location:

- src/app
- src/components

Responsibilities:

- render rooms and bookings;
- collect booking input;
- display validation errors;
- trigger booking and cancellation actions.

### Application

Location:

- src/lib/booking/booking-service.ts

Responsibilities:

- create bookings;
- validate input;
- check room existence;
- detect conflicts;
- cancel bookings.

### Domain

Location:

- src/lib/booking/booking-rules.ts

Responsibilities:

- validate time ranges;
- calculate duration;
- detect overlap;
- enforce critical booking rules.

### Persistence

Location:

- src/lib/prisma
- prisma

Responsibilities:

- store rooms;
- store bookings;
- query confirmed bookings;
- preserve cancelled reservations.

## Data Model

### Room

- id
- name
- capacity
- location
- createdAt
- updatedAt

### Booking

- id
- roomId
- organizerName
- title
- startTime
- endTime
- status
- createdAt
- updatedAt

## API

### GET /api/rooms

Returns seeded meeting rooms.

### GET /api/bookings

Returns bookings ordered by start time.

### POST /api/bookings

Creates a booking after validating all business rules.

### POST /api/bookings/{id}/cancel

Changes a confirmed booking to CANCELLED.

## Testing Strategy

Unit tests must cover booking rules independently from the database.

Integration tests should cover:

- successful booking creation;
- conflict rejection;
- cancellation;
- reuse of a cancelled booking slot.

## Quality Gates

The following commands must pass:

- pnpm lint
- pnpm typecheck
- pnpm test
- pnpm build
