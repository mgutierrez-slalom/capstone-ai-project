# RoomFlow Testing Strategy

This document outlines the testing approach, test database isolation, and quality assurance lifecycle for RoomFlow.

## Overview

RoomFlow uses a **layered testing strategy** with **isolated test database** to ensure:
- Business logic correctness (unit tests)
- API contract compliance (integration tests)
- Development data integrity (test isolation)
- Reproducible, deterministic test runs

## Testing Layers

### 1. Unit Tests: Booking Domain Rules

**File**: `tests/booking-rules.test.ts`

Pure function tests for booking business logic with no I/O or side effects:

- **Time range validation** — `startTime` < `endTime` (strict)
- **Future booking validation** — `startTime` > current UTC time
- **Maximum duration** — bookings ≤ 4 hours (inclusive)
- **Overlap detection** — no two confirmed bookings overlap in same room
- **Boundary precision** — millisecond-level accuracy for time calculations

**Key assertions**:
- Consecutive bookings allowed (no overlap at exact same timestamp)
- Overlaps detected with 1ms precision
- Very short bookings accepted (1ms, 1s, 1min)
- Near-4-hour boundaries tested (3h 59m 59s 999ms accepted, 4h 0m 0s 1ms rejected)

### 2. Integration Tests: Booking Service & API

**File**: `tests/api/bookings.test.ts`

Full stack tests exercising service layer + API endpoint handlers with real database:

- **Booking creation** — valid inputs, field validation, conflict detection
- **Booking cancellation** — state transitions, idempotency checks
- **Room isolation** — concurrent bookings in different rooms allowed
- **Error handling** — correct HTTP status codes and error codes
- **API response contracts** — all Booking responses include id, roomId, title, organizerName, startTime, endTime, status, createdAt, updatedAt

**Key scenarios**:
- Creating booking with empty/whitespace organizer or title (validation)
- Booking at future time vs. past/present time (rejection)
- Overlapping bookings in same room (409 conflict)
- Concurrent bookings in different rooms (both succeed)
- Cancelling already-cancelled booking (409 error)
- Cancelling non-existent booking (404 error)

### 3. Room API Tests

**File**: `tests/api/rooms.test.ts`

Verify room listing API behavior:

- Returns all seeded rooms
- Ordered alphabetically by name
- Each room includes id, name, capacity, location

## Test Database Isolation

### Lifecycle

```
Test Run Start
  ↓
[setup.ts] beforeAll
  - Set DATABASE_URL to prisma/test.db
  - Remove existing test.db (if present)
  - Create fresh test.db
  - Execute: prisma migrate deploy
  - Seed 3 test rooms (Orion, Andromeda, Apollo)
  ↓
[Each Test Suite]
  - Run tests with seeded rooms
  ↓
[setup.ts] afterEach
  - Clear all bookings (DELETE FROM booking WHERE TRUE)
  - Preserve rooms for next suite
  ↓
[All Tests Complete]
  - Test database remains as prisma/test.db
  - Development database unchanged
  - Next run: fresh test.db created
```

### Database Selection

| When | Database | Connection |
|---|---|---|
| **Development** | `prisma/dev.db` | `DATABASE_URL="file:./dev.db"` in `.env.local` |
| **Tests** | `prisma/test.db` | `DATABASE_URL="file:./test.db"` set by `tests/setup.ts` |
| **Production** | Cloud PostgreSQL | `DATABASE_URL=postgres://...` in `.env` |

**Critical**: Test database URL is set **before** importing Prisma client in `tests/setup.ts`, ensuring the client never connects to development data.

### Key Properties

1. **Isolation**: Tests cannot modify `dev.db`
2. **Reproducibility**: Fresh schema + fixtures on each run
3. **Determinism**: Booking data cleared between suites
4. **Safety**: Development workflow uninterrupted by test runs
5. **Efficiency**: Single test database per run (not per test)

## Setup and Cleanup

### Before All Tests (beforeAll)

1. Verify `prisma/` directory exists
2. Delete existing `prisma/test.db` and `prisma/test.db-journal`
3. Execute `prisma migrate deploy` to apply all migrations
4. Seed 3 rooms into test database
5. Prisma client ready for tests

### After Each Suite (afterEach)

- `DELETE FROM booking WHERE TRUE` (clears all bookings)
- Rooms remain intact as test fixtures

### Why This Works

- **Rooms are immutable** in tests (no creation/deletion/modification)
- **Bookings are mutable** (created/cancelled in tests)
- **No fixture interdependencies** — each test suite starts with clean bookings
- **Database state matches schema** — migrations always reflect current schema

## CI Behavior

In GitHub Actions:

```yaml
- name: Test
  run: pnpm test
  env:
    DATABASE_URL: "file:./prisma/test.db"  # (optional, set by setup.ts)
    NODE_ENV: test
```

- Test database created in runner's `/tmp` or workspace directory
- Migrations applied automatically
- Tests run in isolation
- Logs contain any test failures (never dev.db issues)
- Success = all 35+ tests pass

## Running Tests Locally

```bash
# Run all tests (uses isolated test.db)
pnpm test

# Run with watch mode
pnpm test:watch

# Run specific test file
pnpm test tests/booking-rules.test.ts

# Run with verbose output
pnpm test -- --reporter=verbose
```

**None of these commands touch `prisma/dev.db`.**

## Test Coverage

| Category | Count | Status |
|---|---|---|
| Unit (booking-rules) | 15+ | ✅ |
| Integration (bookings API) | 15+ | ✅ |
| Room API | 3+ | ✅ |
| **Total** | **35+** | **✅ Passing** |

## Future Enhancements

Possible expansions without breaking isolation:

- E2E browser tests with separate ephemeral test database
- Performance benchmarking against seeded dataset
- Contract testing against OpenAPI specification
- Database snapshot testing for migrations
- Concurrent test execution with database pooling

All can use the same isolated test database pattern.

## Troubleshooting

### "Test database corruption"
→ Delete `prisma/test.db` and `prisma/test.db-journal`, re-run tests

### "Migration failed"
→ Ensure `prisma migrate deploy` succeeds locally: `DATABASE_URL="file:./test.db" npx prisma migrate deploy`

### "Tests modify dev.db"
→ This should never happen. Check `tests/setup.ts` sets `DATABASE_URL` before any Prisma import.

### "Room fixtures missing"
→ `seedTestData()` in `tests/setup.ts` failed. Check migration success and Prisma schema consistency.
