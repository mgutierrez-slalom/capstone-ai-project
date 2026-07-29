# Implementation Tasks

## Foundation

- [ ] T001 Initialize the Next.js project with TypeScript, Tailwind and pnpm.
- [ ] T002 Configure Prisma with SQLite.
- [ ] T003 Define Room, Booking and BookingStatus models.
- [ ] T004 Create database migration.
- [ ] T005 Create seed data for Orion, Andromeda and Apollo.
- [ ] T006 Create a reusable Prisma client.

## Domain Rules

- [ ] T007 Implement time-range validation.
- [ ] T008 Implement maximum duration validation.
- [ ] T009 Implement booking overlap detection.
- [ ] T010 Add unit tests for overlap scenarios.
- [ ] T011 Add tests for consecutive bookings.
- [ ] T012 Add tests for invalid time ranges.

## Backend

- [ ] T013 Implement room query service.
- [ ] T014 Implement booking query service.
- [ ] T015 Implement booking creation service.
- [ ] T016 Reject bookings in the past.
- [ ] T017 Reject overlapping confirmed bookings.
- [ ] T018 Implement booking cancellation.
- [ ] T019 Add API error responses.

## Frontend

- [ ] T020 Build the dashboard layout.
- [ ] T021 Display the room list.
- [ ] T022 Display the booking list.
- [ ] T023 Build the booking form.
- [ ] T024 Display validation and conflict errors.
- [ ] T025 Add the cancel-booking action.
- [ ] T026 Add loading and empty states.

## Delivery

- [ ] T027 Add GitHub Actions CI.
- [ ] T028 Run lint, type checking, tests and build in CI.
- [ ] T029 Complete the README.
- [ ] T030 Document architecture and demo steps.
