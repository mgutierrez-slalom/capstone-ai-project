# Tasks: RoomFlow Meeting Room Booking

**Input**: Design documents from `/specs/001-room-booking/` (clarified 2026-07-28)

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, checklists/requirements.md

**Organization**: Tasks organized by user story to enable independent implementation and testing of each story.

**Specification Status**: ✅ Clarified and validated. All 10 clarifications integrated. All 8 acceptance criteria (AC-001 through AC-008) mapped to test tasks.

**Quality Gates**: All phases must pass: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic development environment

- [x] T001 Initialize Next.js project with TypeScript, Tailwind CSS, and pnpm in repository root
- [x] T002 Configure ESLint, Prettier, and TypeScript strict mode in eslint.config.mjs and tsconfig.json
- [x] T003 [P] Install Prisma and initialize schema template in prisma/schema.prisma
- [x] T004 [P] Install Vitest and configure vitest.config.ts for unit and integration tests
- [x] T005 Create base folder structure: src/app/, src/components/, src/lib/booking/, src/lib/prisma/, tests/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core database and business rule infrastructure required by all user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Define Prisma schema with Room and Booking models in prisma/schema.prisma with proper indexes (composite index on roomId, startTime, endTime)
- [x] T007 Create initial database migration in prisma/migrations/
- [x] T008 Implement PrismaClient singleton in src/lib/prisma/client.ts with proper initialization and error handling
- [x] T009 Create seed script in prisma/seed.ts with three seeded rooms: Orion (capacity 4, Floor 2), Andromeda (capacity 8, Floor 2), Apollo (capacity 12, Floor 3)
- [x] T010 Implement booking overlap detection in src/lib/booking/booking-rules.ts with function bookingsOverlap() using rule: newStart < existingEnd && newEnd > existingStart
- [x] T011 Implement time-range validation in src/lib/booking/booking-rules.ts with function isValidTimeRange() ensuring endTime > startTime (strictly greater)
- [x] T012 Implement maximum duration validation in src/lib/booking/booking-rules.ts with MAX_BOOKING_DURATION_HOURS = 4 (exactly 4h permitted, >4h rejected per clarification)
- [x] T013 Create unit tests in tests/booking-rules.test.ts for overlap detection (partial, complete, contained, consecutive)
- [x] T014 Create unit tests in tests/booking-rules.test.ts for time-range validation (valid, equal end/start, reversed order)
- [x] T015 Create unit tests in tests/booking-rules.test.ts for maximum duration (exactly 4h allowed, 4h+1ms rejected per clarification)
- [x] T016 Create unit tests in tests/booking-rules.test.ts for cancelled booking reuse scenarios (CANCELLED status does not block availability)

**Checkpoint**: Foundation ready - all user stories can now be implemented in parallel

---

## Phase 3: US-001 View Rooms (Priority: P1)

**Goal**: Users can see all available meeting rooms in the system, sorted alphabetically by name

**Independent Test Criteria**:
- Room list endpoint returns all seeded rooms (Orion, Andromeda, Apollo) sorted alphabetically by name (ascending)
- Room list UI renders all rooms with name, capacity, location
- Empty state: If no rooms exist, display "No rooms available" (AC-006)
- No duplicate rooms in list

- [x] T017 [P] [US1] Create room query repository in src/lib/prisma/room-repository.ts with function getAllRooms() returning rooms sorted by name ascending
- [x] T018 [P] [US1] Create GET /api/rooms endpoint in src/app/api/rooms/route.ts that returns all rooms sorted by name as JSON
- [x] T019 [US1] Create integration test in tests/api/rooms.test.ts verifying GET /api/rooms returns seeded rooms in alphabetical order (Andromeda, Apollo, Orion)
- [x] T020 [P] [US1] Create RoomList component in src/components/RoomList.tsx to display rooms with empty state "No rooms available"
- [x] T021 [P] [US1] Create room list page at src/app/page.tsx that renders RoomList component
- [x] T022 [US1] Add Tailwind styling to RoomList and page layout in globals.css

---

## Phase 4: US-002 & US-003 Create Booking + Prevent Conflicts (Priority: P2)

**Goal**: Users can create bookings with automatic conflict detection and validation

**Independent Test Criteria**:
- Valid booking is created with CONFIRMED status
- Overlapping booking is rejected with 409 error
- Consecutive bookings are allowed
- Invalid time ranges rejected with 422 error
- Past bookings rejected with 400 error
- Bookings over 4 hours rejected with 400 error
- Missing/invalid room rejected with 400 error (AC-008)
- Empty/whitespace-only title or organizerName rejected with 400 error

- [x] T023 [P] [US2] Create booking repository in src/lib/prisma/booking-repository.ts with functions: getConfirmedBookingsForRoom(), createBooking(), getBooking()
- [x] T024 [P] [US2] Create booking validation service in src/lib/booking/booking-service.ts with createBooking() orchestrating all validation and transaction logic with internal conflict re-check
- [x] T025 [US2] Implement within booking-service.ts: past booking rejection (FR-004) using server UTC time reference
- [x] T026 [US2] Implement within booking-service.ts: overlap detection using booking-rules.ts (FR-005, FR-006) for CONFIRMED bookings only
- [x] T027 [US2] Implement within booking-service.ts: transactional conflict check and insert to prevent race conditions (Prisma transaction with re-check)
- [x] T028 [US2] Implement structured error responses in src/lib/booking/error-types.ts with error codes: INVALID_TIME_RANGE, BOOKING_IN_PAST, BOOKING_CONFLICT, MAX_DURATION_EXCEEDED, ROOM_NOT_FOUND, INVALID_INPUT
- [x] T029 [P] [US2] Create POST /api/bookings endpoint in src/app/api/bookings/route.ts with proper HTTP status codes (201 success, 400/409/422 errors)
- [x] T030 [US2] Create integration test in tests/api/bookings.test.ts for successful booking creation with all constraints (AC-001): valid range, future start, ≤4h duration, existing room, no conflict
- [x] T031 [US2] Create integration test in tests/api/bookings.test.ts for overlapping booking rejection (AC-002): HTTP 409 with BOOKING_CONFLICT
- [x] T032 [US2] Create integration test in tests/api/bookings.test.ts for consecutive booking allowance (AC-003): 11:00 start with previous 10:00 end
- [x] T033 [US2] Create integration test in tests/api/bookings.test.ts for invalid time range rejection (AC-004): HTTP 422 with INVALID_TIME_RANGE
- [x] T033b [US2] Create integration test in tests/api/bookings.test.ts for room-not-found error (AC-008): HTTP 400 with ROOM_NOT_FOUND when posting with invalid roomId
- [x] T033c [US2] Create integration test in tests/api/bookings.test.ts for string validation: empty/whitespace-only title and organizerName rejected with HTTP 400 and INVALID_INPUT error
- [x] T034 [P] [US2] Create BookingForm component in src/components/BookingForm.tsx with input fields: room, organizer, title, startTime, endTime with UTC timestamp handling
- [x] T035 [US2] Implement form validation in BookingForm.tsx: trim strings, validate non-empty, check time range, verify future start, enforce ≤4h duration; display API error codes
- [x] T036 [US2] Create booking form page at src/app/bookings/new/page.tsx
- [x] T037 [US2] Add loading state during booking submission in BookingForm.tsx and page

---

## Phase 5: US-004 View Bookings (Priority: P3)

**Goal**: Users can see all existing bookings to understand room usage and availability, ordered by start time

**Independent Test Criteria**:
- Booking list shows all CONFIRMED bookings ordered by startTime (ascending)
- Cancelled bookings not shown in main list or shown separately with clear indication
- Booking details include room name, organizer, title, time range
- Empty state: If no bookings exist, display "No bookings" (AC-007)

- [x] T038 [P] [US4] Create GET /api/bookings endpoint in src/app/api/bookings/route.ts that returns all CONFIRMED bookings ordered by startTime ascending (no filtering available in MVP)
- [x] T039 [US4] Create integration test in tests/api/bookings.test.ts for GET /api/bookings returning all CONFIRMED bookings sorted by start time ascending
- [x] T040 [P] [US4] Create BookingList component in src/components/BookingList.tsx to display bookings in table format with empty state "No bookings"
- [x] T041 [US4] Create booking list section on src/app/page.tsx that shows upcoming bookings with empty state
- [x] T042 [US4] Add Tailwind styling for booking table, time display formatting, and empty state message

---

## Phase 6: US-005 Cancel Booking (Priority: P4)

**Goal**: Users can cancel existing bookings to free up room availability

**Independent Test Criteria**:
- Confirmed booking status changes to CANCELLED
- Cancelled booking row preserved in database (soft delete)
- Time slot of cancelled booking becomes available for new bookings
- Cancelling already-cancelled booking is rejected or handled gracefully

- [x] T043 [P] [US5] Create cancelBooking() function in src/lib/booking/booking-service.ts with status transition logic
- [x] T044 [P] [US5] Create cancelBooking() repository function in src/lib/prisma/booking-repository.ts (status update to CANCELLED, no hard delete)
- [x] T045 [P] [US5] Create POST /api/bookings/{id}/cancel endpoint in src/app/api/bookings/[id]/cancel/route.ts
- [x] T046 [US5] Create integration test in tests/api/bookings.test.ts for successful cancellation (AC-005): status changes to CANCELLED
- [x] T047 [US5] Create integration test in tests/api/bookings.test.ts verifying cancelled booking does not block future reservations (AC-005)
- [x] T048 [US5] Create integration test in tests/api/bookings.test.ts for double-cancellation handling (cancel already-CANCELLED booking returns error)
- [x] T049 [P] [US5] Add cancel button to BookingList component that calls POST /api/bookings/{id}/cancel
- [x] T050 [US5] Implement confirmation dialog before cancelling booking
- [x] T051 [US5] Add success/error toast notifications for cancel operations

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Quality gates, testing completeness, documentation, and CI/CD setup

- [x] T052 Run full test suite: `pnpm test` passes with coverage for all critical rules (overlap, duration, consecutive, cancellation reuse, empty states, string validation, room-not-found)
- [x] T053 Run type checking: `pnpm typecheck` passes with no errors
- [x] T054 Run linting: `pnpm lint` passes with no errors
- [x] T055 Run build: `pnpm build` completes successfully with no errors
- [x] T056 Create GitHub Actions CI workflow in .github/workflows/ci.yml that runs lint, typecheck, test, build on every push
- [x] T057 Add environment configuration management (.env.example, .env.local) for database URL and app settings
- [x] T058 Update README.md with project overview, tech stack, setup instructions, running dev server, and quality gate commands
- [x] T059 Add architectural documentation in docs/architecture.md covering layers (presentation, service, domain, persistence)
- [x] T060 Document booking business rules and conflict detection in docs/booking-rules.md
- [x] T061 Verify all repository instructions followed: strict TypeScript, business rules in lib/booking, persistence in lib/prisma, thin handlers
- [x] T062 Final validation: manually test all user stories end-to-end (room list alphabetical sort → create booking with all validations → view bookings sorted → cancel booking)
- [x] T063 Verify acceptance criteria met for all user stories (AC-001 through AC-008 including empty states and room-not-found)

---

## Phase 8: Concurrency & Atomicity (Priority: P0 - Blocking)

**Purpose**: Implement transaction ownership at persistence layer and ensure atomic operations prevent race conditions

**Specification Status**: ✅ Phase 4 requirements fully implemented and tested

- [x] T064 Refactor booking-repository.ts to own transaction lifecycle with function createBookingWithConflictCheck() that:
  - Executes entire transaction internally (conflict detection, insert)
  - Re-checks overlaps inside transaction (prevents race conditions)
  - Returns Booking on success or null on conflict
  - Throws infrastructure errors unchanged (lets handler convert to 500)
- [x] T065 Implement atomic cancelBookingIfConfirmed() in booking-repository.ts using conditional UPDATE with WHERE status='CONFIRMED':
  - Returns Booking on success or null if already cancelled/not found
  - Throws infrastructure errors unchanged
  - Guarantees only one concurrent cancellation succeeds
- [x] T066 Refactor booking-service.ts to remove direct PrismaClient import and transaction management:
  - Call repository functions for all persistence operations
  - Map repository outcomes to domain errors (null → BOOKING_CONFLICT/BOOKING_ALREADY_CANCELLED)
  - Throw infrastructure errors without catching (let handlers catch)
  - Keep all domain validations as domain errors
- [x] T067 Update HTTP handlers (src/app/api/bookings/route.ts and src/app/api/bookings/[id]/cancel/route.ts) to wrap service calls in try-catch:
  - Catch infrastructure errors (Prisma, SQLite, I/O) → return HTTP 500
  - Return domain errors from result object → appropriate 4xx status
  - Never automatically classify infrastructure errors as domain errors
- [x] T068 Create concurrency tests in tests/handlers/concurrency.test.ts with Promise.allSettled() for true simultaneous execution:
  - Concurrent identical booking requests: verify only one succeeds, other gets BOOKING_CONFLICT (409)
  - Concurrent overlapping bookings: verify serialization
  - Concurrent double-cancellations: verify only one succeeds (200), other gets BOOKING_ALREADY_CANCELLED (409)
  - Concurrent cancellation + creation in freed slot: verify both succeed atomically
  - Same room serialization: concurrent bookings to same room at same time
  - Different rooms parallelism: concurrent bookings to different rooms at same time both succeed
- [x] T069 Document persistence boundary in docs/architecture.md with sections on:
  - Transaction ownership at repository layer
  - Atomic booking creation with conflict re-check
  - Atomic cancellation with conditional update
  - SQLite serialization behavior under concurrent writes
  - Error classification (domain vs infrastructure)
- [x] T070 Update docs/testing-strategy.md with concurrency section covering:
  - Promise.allSettled() approach for true concurrent testing
  - SQLite locking behavior and database lock warnings
  - Separate test execution strategy (pnpm test:concurrency separate from other tests)
  - Explanation of why concurrency tests must run separately (high contention on single database)
- [x] T071 Update package.json test scripts to separate concurrency tests:
  - `pnpm test`: runs handlers + unit tests (no concurrency tests)
  - `pnpm test:concurrency`: runs concurrency tests separately
  - `pnpm test:service`: runs service tests separately
  - `pnpm test:all`: runs all tests (may have SQLite contention)
- [x] T072 Run full validation: `pnpm lint; pnpm typecheck; pnpm test; pnpm test:concurrency; pnpm build`
  - All handler/unit tests pass (38+)
  - All concurrency tests pass (6+)
  - No lint or typecheck errors
  - Production build completes successfully
- [x] T073 Verify concurrency outcomes:
  - Concurrent identical booking requests: exactly one succeeds, other gets 409
  - Only one concurrent cancellation succeeds
  - Infrastructure errors never misclassified as BOOKING_CONFLICT
  - Repository layer owns transactions
  - Service layer does not import PrismaClient directly
  - No database locks when tests run separately

**Checkpoint**: Concurrency and atomicity fully implemented. System ready for production-scale concurrent load.

---

## Task Dependencies & Execution Strategy

### Critical Path (Sequential)

1. **Phase 1** → **Phase 2** (setup must complete before foundation)
2. **Phase 2** → **All other phases** (foundation blocks all user stories)

### Parallel Opportunities

- **Phase 3, 4, 5, 6** can run mostly in parallel after Phase 2 completes
- Within each phase, tasks marked `[P]` can run concurrently (different files)
- Example: T017 + T020 + T034 + T040 can run simultaneously

### Suggested MVP Scope (First Iteration)

**Minimum for MVP delivery**: Phase 1 + Phase 2 + Phase 3 + Phase 4 (US-001, US-002/003)

```
Iteration 1: T001-T037 (Setup + Foundation + View Rooms + Create/Prevent)
  Delivers: Users can view rooms (sorted by name) and create bookings with comprehensive validation
  Includes: overlap detection, 4-hour duration limit (inclusive), string trimming, room-not-found error, empty states
  Quality gates pass
  Ready for user testing

Iteration 2: T038-T051 (View Bookings + Cancel)
  Adds: Booking listing (sorted by startTime) and cancellation
  Completes all user stories

Iteration 3: T052-T063 (Polish)
  Adds: CI/CD, documentation, final validation, acceptance criteria verification
  Release ready
```

### Task Count by Phase

- Phase 1 (Setup): 5 tasks
- Phase 2 (Foundation): 11 tasks
- Phase 3 (US-001): 6 tasks
- Phase 4 (US-002/003): 16 tasks (includes T033b for room-not-found, T033c for string validation)
- Phase 5 (US-004): 5 tasks
- Phase 6 (US-005): 9 tasks
- Phase 7 (Polish): 12 tasks
- Phase 8 (Concurrency & Atomicity): 10 tasks (T064–T073)
- **Total**: 74 tasks

### Test Coverage Summary

**Unit Tests** (Phase 2):
- T013–T016: Overlap, time-range, duration, cancellation scenarios

**Integration Tests** (Phases 3–6):
- T019: Room list endpoint and sorting (AC-001 precursor)
- T030–T033c: Booking creation with all validations including room-not-found (AC-001, AC-002, AC-003, AC-004, AC-008)
- T033c: String validation (title, organizerName trimmed, non-empty)
- T039: Booking list endpoint sorting (AC-007 precursor)
- T046–T048: Cancellation and double-cancel handling (AC-005)

**Acceptance Criteria Mapping**:
- AC-001: T030 (successful booking with all constraints)
- AC-002: T031 (overlap rejection)
- AC-003: T032 (consecutive bookings)
- AC-004: T033 (invalid time range)
- AC-005: T046–T048 (cancellation)
- AC-006: T020, T041 (empty states in UI)
- AC-007: T041 (no bookings empty state)
- AC-008: T033b (room not found error)

---

## Format Reference

Each task follows: `- [ ] [ID] [P?] [Story?] Description with exact file path`

- `- [ ]` = unchecked markdown checkbox
- `[ID]` = sequential task ID (T001, T002, …, T063) with T033b, T033c for sub-tasks
- `[P]` = parallelizable (only if task uses different files and no dependencies on incomplete tasks)
- `[USx]` = user story mapping (US1, US2, US3, US4, US5)
- File paths are relative to repository root: `src/app/`, `tests/`, `prisma/`, `.github/`

## Key Clarifications Applied (Session 2026-07-28)

1. ✅ Room sort order (FR-001): Explicitly alphabetical by name ascending
2. ✅ 4-hour boundary (FR-010): Exactly 4 hours permitted (≤4h inclusive)
3. ✅ Room not found (AC-008): HTTP 400 with code ROOM_NOT_FOUND (test T033b)
4. ✅ String validation (FR-002): title and organizerName trimmed and non-empty (test T033c)
5. ✅ Timestamp format: ISO 8601 UTC (reflected in form validation tasks)
6. ✅ Booking order (FR-001, AS-004): startTime ascending (explicit in T038, T039)
7. ✅ Seeded rooms (FR-001): Orion/4/Floor2, Andromeda/8/Floor2, Apollo/12/Floor3 (T009, T019)
8. ✅ Empty states (AC-006, AC-007): "No rooms available" and "No bookings" messages (T020, T041)
9. ✅ Booking filtering removed: Not in MVP (no filtering parameters in T038, T040)
10. ✅ Successful booking criteria (AC-001): Valid range, future start, ≤4h, existing room, no conflict (T030)
