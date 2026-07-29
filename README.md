# RoomFlow — Meeting Room Booking

RoomFlow is a lightweight meeting-room booking application. Users can view available rooms, create reservations with automatic conflict detection, view existing bookings, and cancel reservations.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| ORM | Prisma v7 |
| Database | SQLite (via `better-sqlite3` driver adapter) |
| Testing | Vitest |

## Setup

**Prerequisites**: Node.js 20+, pnpm

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment file
cp .env.example .env.local

# 3. Run database migration
pnpm db:migrate

# 4. Seed rooms (Orion, Andromeda, Apollo)
pnpm db:seed
```

## Running the Dev Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Quality Gates

```bash
pnpm lint        # ESLint
pnpm typecheck   # TypeScript strict type-check (no emit)
pnpm test        # Vitest unit + integration tests
pnpm build       # Next.js production build
```

All four gates must pass before merging changes.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── rooms/           # GET /api/rooms
│   │   └── bookings/        # GET+POST /api/bookings, POST /api/bookings/[id]/cancel
│   ├── bookings/new/        # Booking form page
│   └── page.tsx             # Room list + booking list home page
├── components/
│   ├── RoomList.tsx
│   ├── BookingList.tsx
│   └── BookingForm.tsx
└── lib/
    ├── booking/             # Domain rules and service (business logic)
    │   ├── booking-rules.ts
    │   ├── booking-service.ts
    │   └── error-types.ts
    └── prisma/              # Data access layer
        ├── client.ts
        ├── room-repository.ts
        └── booking-repository.ts

prisma/
├── schema.prisma
├── seed.ts
└── migrations/

tests/
├── booking-rules.test.ts    # Unit tests for domain rules
└── api/
    └── bookings.test.ts     # Integration tests for API endpoints
```

## Database

Uses SQLite with the Prisma `better-sqlite3` driver adapter. The database file is created at the path specified by `DATABASE_URL` in `.env.local` (default: `file:./dev.db`).

To open Prisma Studio:

```bash
pnpm db:studio
```

## Documentation

- [Architecture](docs/architecture.md) — Layer overview and design decisions
- [Booking Rules](docs/booking-rules.md) — Business rules and conflict detection logic
- [Specification](specs/001-room-booking/spec.md) — Feature specification
