# Tasks: RoomFlow Meeting Room Booking

**Input**: Design documents from `/specs/001-room-booking/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks organized by user story to enable independent implementation and testing of each story.

**Quality Gates**: All phases must pass: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic development environment

- [ ] T001 Initialize Next.js project with TypeScript, Tailwind CSS, and pnpm in repository root
- [ ] T002 Configure ESLint, Prettier, and TypeScript strict mode in eslint.config.mjs and tsconfig.json
- [ ] T003 [P] Install Prisma and initialize schema template in prisma/schema.prisma
- [ ] T004 [P] Install Vitest and configure vitest.config.ts for unit and integration tests
- [ ] T005 Create base folder structure: src/app/, src/components/, src/lib/booking/, src/lib/prisma/, tests/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core database and business rule infrastructure required by all user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 Define Prisma schema with Room and Booking models in prisma/schema.prisma with proper indexes
- [ ] T007 Create initial database migration in prisma/migrations/
- [ ] T008 Implement PrismaClient singleton in src/lib/prisma/client.ts with proper initialization and error handling
- [ ] T009 Create seed script in prisma/seed.ts with three seeded rooms (Orion, Andromeda, Apollo)
- [ ] T010 Implement booking overlap detection in src/lib/booking/booking-rules.ts with function bookingsOverlap()
- [ ] T011 Implement time-range validation in src/lib/booking/booking-rules.ts with function isValidTimeRange()
- [ ] T012 Implement maximum duration validation in src/lib/booking/booking-rules.ts with MAX_BOOKING_DURATION_HOURS = 4
- [ ] T013 Create unit tests in tests/booking-rules.test.ts for overlap detection (partial, complete, contained, consecutive)
- [ ] T014 Create unit tests in tests/booking-rules.test.ts for time-range validation (valid, equal, reversed)
- [ ] T015 Create unit tests in tests/booking-rules.test.ts for maximum duration (exactly 4h, over 4h, invalid range)
- [ ] T016 Create unit tests in tests/booking-rules.test.ts for cancelled booking reuse scenarios

**Checkpoint**: Foundation ready - all user stories can now be implemented in parallel

---

## Phase 3: US-001 View Rooms (Priority: P1)

**Goal**: Users can see all available meeting rooms in the system

**Independent Test Criteria**:
- Room list endpoint returns all seeded rooms
- Room list UI renders all rooms with name, capacity, location
- No duplicate rooms in list

- [ ] T017 [P] [US1] Create room query repository in src/lib/prisma/room-repository.ts with function getAllRooms()
- [ ] T018 [P] [US1] Create GET /api/rooms endpoint in src/app/api/rooms/route.ts that returns all rooms as JSON
- [ ] T019 [US1] Create integration test in tests/api/rooms.test.ts verifying GET /api/rooms returns seeded rooms
- [ ] T020 [P] [US1] Create RoomList component in src/components/RoomList.tsx to display rooms
- [ ] T021 [P] [US1] Create room list page at src/app/page.tsx that renders RoomList component
- [ ] T022 [US1] Add Tailwind styling to RoomList and page layout in globals.css

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
- Missing/invalid room rejected with 400 error

- [ ] T023 [P] [US2] Create booking repository in src/lib/prisma/booking-repository.ts with functions: getConfirmedBookingsForRoom(), createBooking(), getBooking()
- [ ] T024 [P] [US2] Create booking validation service in src/lib/booking/booking-service.ts with createBooking() orchestrating all validation and transaction logic
- [ ] T025 [US2] Implement within booking-service.ts: past booking rejection (FR-004)
- [ ] T026 [US2] Implement within booking-service.ts: overlap detection using booking-rules.ts (FR-005, FR-006)
- [ ] T027 [US2] Implement within booking-service.ts: transactional conflict check and insert to prevent race conditions
- [ ] T028 [US2] Implement structured error responses in src/lib/booking/error-types.ts with error codes: INVALID_TIME_RANGE, BOOKING_IN_PAST, BOOKING_CONFLICT, MAX_DURATION_EXCEEDED, ROOM_NOT_FOUND
- [ ] T029 [P] [US2] Create POST /api/bookings endpoint in src/app/api/bookings/route.ts with proper HTTP status codes (201 success, 400/409/422 errors)
- [ ] T030 [US2] Create integration test in tests/api/bookings.test.ts for successful booking creation (AC-001)
- [ ] T031 [US2] Create integration test in tests/api/bookings.test.ts for overlapping booking rejection (AC-002)
- [ ] T032 [US2] Create integration test in tests/api/bookings.test.ts for consecutive booking allowance (AC-003)
- [ ] T033 [US2] Create integration test in tests/api/bookings.test.ts for invalid time range rejection (AC-004)
- [ ] T033b [US2] Create integration test in tests/api/bookings.test.ts for room-not-found error when posting booking with invalid roomId (AC-008)
- [ ] T034 [P] [US2] Create BookingForm component in src/components/BookingForm.tsx with input fields: room, organizer, title, startTime, endTime
- [ ] T035 [US2] Implement form validation and error display in BookingForm.tsx matching API error codes
- [ ] T036 [US2] Create booking form page at src/app/bookings/new/page.tsx
- [ ] T037 [US2] Add loading state during booking submission in BookingForm.tsx and page

---

## Phase 5: US-004 View Bookings (Priority: P3)

**Goal**: Users can see all existing bookings to understand room usage and availability

**Independent Test Criteria**:
- Booking list shows all CONFIRMED bookings
- Bookings ordered by start time
- Cancelled bookings not shown in main list (or shown separately with clear indication)
- Booking details include room, organizer, title, time range

- [ ] T038 [P] [US4] Create GET /api/bookings endpoint in src/app/api/bookings/route.ts that returns all bookings ordered by startTime (ascending)
- [ ] T039 [US4] Create integration test in tests/api/bookings.test.ts for GET /api/bookings returning all bookings sorted by start time
- [ ] T040 [P] [US4] Create BookingList component in src/components/BookingList.tsx to display bookings in table format
- [ ] T040 [P] [US4] Create BookingList component in src/components/BookingList.tsx to display bookings in table format
- [ ] T041 [US4] Create booking list section or page in src/app/page.tsx that shows upcoming bookings
- [ ] T042 [US4] Add Tailwind styling for booking table and time display formatting

---

## Phase 6: US-005 Cancel Booking (Priority: P4)

**Goal**: Users can cancel existing bookings to free up room availability

**Independent Test Criteria**:
- Confirmed booking status changes to CANCELLED
- Cancelled booking row preserved in database (soft delete)
- Time slot of cancelled booking becomes available for new bookings
- Cancelling already-cancelled booking is rejected or handled gracefully

- [ ] T043 [P] [US5] Create cancelBooking() function in src/lib/booking/booking-service.ts
- [ ] T044 [P] [US5] Create cancelBooking() repository function in src/lib/prisma/booking-repository.ts (status update to CANCELLED)
- [ ] T045 [P] [US5] Create POST /api/bookings/{id}/cancel endpoint in src/app/api/bookings/[id]/cancel/route.ts
- [ ] T046 [US5] Create integration test in tests/api/bookings.test.ts for successful cancellation (AC-005)
- [ ] T047 [US5] Create integration test in tests/api/bookings.test.ts verifying cancelled booking does not block future reservations
- [ ] T048 [US5] Create integration test in tests/api/bookings.test.ts for double-cancellation error handling
- [ ] T049 [P] [US5] Add cancel button to BookingList component that calls POST /api/bookings/{id}/cancel
- [ ] T050 [US5] Implement confirmation dialog before cancelling booking
- [ ] T051 [US5] Add success/error toast notifications for cancel operations

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Quality gates, testing completeness, documentation, and CI/CD setup

- [ ] T052 Run full test suite: `pnpm test` passes with coverage for all critical rules (overlap, duration, consecutive, cancellation reuse)
- [ ] T053 Run type checking: `pnpm typecheck` passes with no errors
- [ ] T054 Run linting: `pnpm lint` passes with no errors
- [ ] T055 Run build: `pnpm build` completes successfully with no errors
- [ ] T056 Create GitHub Actions CI workflow in .github/workflows/ci.yml that runs lint, typecheck, test, build on every push
- [ ] T057 Add environment configuration management (.env.example, .env.local) for database URL and app settings
- [ ] T058 Update README.md with project overview, tech stack, setup instructions, running dev server, and quality gate commands
- [ ] T059 Add architectural documentation in docs/architecture.md covering layers (presentation, service, domain, persistence)
- [ ] T060 Document booking business rules and conflict detection in docs/booking-rules.md
- [ ] T061 Verify all repository instructions followed: strict TypeScript, business rules in lib/booking, persistence in lib/prisma, thin handlers
- [ ] T062 Final validation: manually test all user stories end-to-end (room list → create booking → view bookings → cancel booking)
- [ ] T063 Verify acceptance criteria met for all user stories (AC-001 through AC-008)

---

## Task Dependencies & Execution Strategy

### Critical Path (Sequential)

1. **Phase 1** → **Phase 2** (setup must complete before foundation)
2. **Phase 2** → **All other phases** (foundation blocks all user stories)

### Parallel Opportunities

- **Phase 3, 4, 5, 6** can run mostly in parallel after Phase 2 completes
- Within each phase, tasks marked `[P]` can run concurrently (different files)
- Example: T017 + T020 + T034 can run simultaneously

### Suggested MVP Scope (First Iteration)

**Minimum for MVP delivery**: Phase 1 + Phase 2 + Phase 3 + Phase 4 (US-001, US-002/003)

```
Iteration 1: T001-T037 (Setup + Foundation + View Rooms + Create/Prevent)
  Delivers: Users can view rooms and create bookings with conflict detection (including room-not-found error)
  Quality gates pass
  Ready for user testing

Iteration 2: T038-T051 (View Bookings + Cancel)
  Adds: Booking listing and cancellation
  Completes all user stories

Iteration 3: T052-T063 (Polish)
  Adds: CI/CD, documentation, final validation
  Release ready
```

---

## Format Reference

Each task follows: `- [ ] [ID] [P?] [Story?] Description with exact file path`

- `- [ ]` = unchecked markdown checkbox
- `[ID]` = sequential task ID (T001, T002, …, T063) — note T033b for room-not-found test
- `[P]` = parallelizable (only if task uses different files and no dependencies on incomplete tasks)
- `[USx]` = user story mapping (US1, US2, US3, US4, US5)
- File paths are relative to repository root: `src/app/`, `tests/`, `prisma/`, `.github/`
