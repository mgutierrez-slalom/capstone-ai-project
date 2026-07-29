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

**Prerequisites**: Node.js 24+, pnpm

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

## Database Configuration

### Development Database

The development database is configured via `DATABASE_URL` in `.env.local`. By default:

```bash
DATABASE_URL="file:./dev.db"
```

**Important**: The `prisma/dev.db` and `prisma/test.db` files are not tracked in Git. When you first run the project:
- `pnpm db:migrate` creates and migrates `dev.db`
- `pnpm db:seed` populates it with test rooms

### Migrations

To create a new migration after schema changes:

```bash
pnpm db:migrate
```

To manually apply existing migrations:

```bash
npx prisma migrate deploy
```

### Seeding Development Data

The development database is seeded with three rooms via `prisma/seed.ts`:

```bash
pnpm db:seed
```

Seeds run automatically after migrations during initial setup.

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

## Testing

Tests are run using Vitest and validate:
- **Booking domain rules** (unit tests): time validation, overlap detection, duration limits
- **API endpoints** (integration tests): full request/response cycles with database state
- **Business logic** (service tests): creation, cancellation, conflict resolution

### Test Database Isolation

All tests use an **isolated test database** that is:
- Created fresh before each test run
- Automatically migrated with current schema
- Seeded with test fixtures (3 rooms)
- Cleaned of booking data between test suites
- Never connected to development data

See [docs/testing-strategy.md](docs/testing-strategy.md) for detailed testing strategy and lifecycle.

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

### Test Database Isolation

**Tests use an isolated SQLite database (`prisma/test.db`) that is completely separate from development data.**

- Each test run creates a fresh test database
- Migrations are applied automatically during test setup
- Test rooms (Orion, Andromeda, Apollo) are seeded before each test run
- Booking data is cleared between tests to ensure isolation
- **The development database (`dev.db`) is never modified by tests**

This ensures:
- Tests cannot interfere with development data
- Tests are reproducible and deterministic
- Development workflow is uninterrupted by test runs

## Documentation

- [Architecture](docs/architecture.md) — Layer overview and design decisions
- [Booking Rules](docs/booking-rules.md) — Business rules and conflict detection logic
- [Specification](specs/001-room-booking/spec.md) — Feature specification
