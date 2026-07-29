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

### 2. Service Layer Tests: Business Logic & Database

**Files**: `tests/service/booking-service.test.ts`, `tests/service/room-repository.test.ts`

Integration tests exercising service layer with real database (test.db):

- **Booking creation** — valid inputs, field validation, conflict detection
- **Booking cancellation** — state transitions, idempotency checks
- **Room operations** — listing, fetching by ID
- **Conflict resolution** — concurrent bookings in different rooms allowed
- **Error handling** — correct error codes and status codes
- **API response contracts** — all Booking responses include all 9 fields

**Key scenarios**:
- Creating booking with empty/whitespace organizer or title (validation)
- Booking at future time vs. past/present time (rejection)
- Overlapping bookings in same room (409 conflict)
- Concurrent bookings in different rooms (both succeed)
- Cancelling already-cancelled booking (409 error)
- Cancelling non-existent booking (404 error)

### 3. HTTP Handler Tests: API Endpoints

**File**: `tests/handlers/bookings.handler.test.ts`, `tests/handlers/rooms.handler.test.ts`

Direct invocation of Next.js route handlers to verify HTTP API behavior:

- **GET /api/rooms** — returns 200 with all rooms sorted alphabetically
- **GET /api/bookings** — returns 200 with only CONFIRMED bookings, sorted by startTime
- **POST /api/bookings** — returns 201 with complete created Booking, verifies all validation rules
- **POST /api/bookings/{id}/cancel** — returns 200 with cancelled Booking, handles 404/409 errors

**What's tested**:
- HTTP status codes (200, 201, 400, 404, 409, 422, 500)
- Response shapes match OpenAPI contract
- Request validation (empty fields, invalid types, malformed JSON)
- Error responses include code, message, and optional field
- Timestamps are valid ISO 8601 strings
- Text field trimming (whitespace removed)
- 4-hour maximum duration boundary (exactly 4h accepted, 4h 0m 0s 1ms rejected)
- Overlap detection across rooms
- State transitions (CONFIRMED → CANCELLED)
- Database isolation (uses test.db, not dev.db)

**Test fixtures**:
- Uses deterministic future timestamps (2026-08-15T...)
- Seeded test rooms (Orion, Andromeda, Apollo) from `tests/setup.ts`
- `beforeEach` clears bookings; rooms remain for next test
- No relative dates or "now ± N hours" (ensures reproducibility)

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
# Run Phase 3 handler + unit tests (default)
pnpm test

# Run concurrency tests (must run separately due to SQLite locking)
pnpm test:concurrency

# Run service layer tests separately (to avoid SQLite locking)
pnpm test:service

# Run all tests together (may have SQLite contention; use separately instead)
pnpm test:all

# Run with watch mode
pnpm test:watch

# Run specific test file
pnpm vitest run tests/handlers/bookings.handler.test.ts

# Run with verbose output
pnpm test -- --reporter=verbose
```

**None of these commands touch `prisma/dev.db`.**

## Concurrency Testing

Concurrency tests verify that the atomic operations and transaction logic correctly prevent race conditions under simultaneous booking requests. These tests must run **separately** from other tests due to SQLite's behavior under high contention.

### Test Scenarios

| Test | Purpose | Approach |
|---|---|---|
| Concurrent identical requests | Verify only one succeeds, other gets BOOKING_CONFLICT (409) | `Promise.allSettled()` on two identical booking calls |
| Concurrent overlapping requests | Verify serialization when requests overlap same time slot | `Promise.allSettled()` on two overlapping booking calls |
| Concurrent double-cancellations | Verify only one succeeds (200), other gets BOOKING_ALREADY_CANCELLED (409) | `Promise.allSettled()` on two identical cancel calls |
| Cancellation + creation in freed slot | Verify both operations succeed (atomicity + ordering) | Sequential operations showing atomic transitions |
| Different rooms at same time | Verify concurrent bookings succeed in different rooms | `Promise.allSettled()` on same time, different rooms |

### SQLite Serialization Behavior

SQLite uses **pessimistic locking with serialization**:

1. Transaction 1 acquires WRITE lock on table
2. Transaction 2 blocks waiting for lock release
3. Transaction 1 commits, releases lock
4. Transaction 2 acquires lock, re-executes query (sees Transaction 1's writes)
5. Transaction 2 either succeeds or returns conflict

**Key Insight**: Concurrent requests to the **same room** serialize and only one succeeds. Concurrent requests to **different rooms** can proceed in parallel.

### Database Lock Warnings

When running concurrency tests alongside other tests:
- SQLite may report "database is locked" or transaction timeouts
- This is **expected and normal behavior**
- Solution: Run concurrency tests separately with `pnpm test:concurrency`
- Once all transactions finish, the lock releases and other tests run fine

## Test Coverage

| Category | Count | Status | Location |
|---|---|---|---|
| Unit (booking-rules) | 15+ | ✅ | `tests/booking-rules.test.ts` |
| Handlers (HTTP API) | 19+ | ✅ | `tests/handlers/bookings.handler.test.ts` |
| Room handlers | 4+ | ✅ | `tests/handlers/rooms.handler.test.ts` |
| Concurrency | 6+ | ✅ | `tests/handlers/concurrency.test.ts` |
| Service Layer | 20+ | ✅ | `tests/service/*.test.ts` |
| **Total** | **64+** | **✅ Passing** | All layers combined |

**Default run** (`pnpm test`): 38 tests (handlers + unit)
**Service run** (`pnpm test:service`): 20 tests (service layer)
**All** (`pnpm test:all`): 58+ tests (all layers, run separately for best results)

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
