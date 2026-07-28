# Implementation Plan: RoomFlow Meeting Room Booking

**Branch**: `001-room-booking` | **Date**: 2026-07-28 | **Spec**: `/specs/001-room-booking/spec.md`

**Input**: Feature specification from `/specs/001-room-booking/spec.md`

## Summary

Build a modular monolith RoomFlow MVP in a single Next.js App Router codebase that supports room listing, booking creation, overlap prevention, booking listing, and cancellation while preserving cancelled rows. Business rules are enforced in `src/lib/booking`, persistence access is isolated to `src/lib/prisma`, and route handlers remain thin.

## Technical Context

**Language/Version**: TypeScript (strict), Node.js runtime for Next.js route handlers

**Primary Dependencies**: Next.js App Router, React, Tailwind CSS, Prisma ORM, Prisma Client, Vitest

**Storage**: SQLite via Prisma

**Testing**: Vitest for unit tests and integration-style service/API tests

**Target Platform**: Web application (desktop and mobile browsers) hosted as a single Next.js app

**Project Type**: Web application (modular monolith)

**Performance Goals**: Correctness-first MVP with responsive validation and conflict checks for small office-scale usage

**Constraints**: No authentication, no microservices, no external integrations, no recurring bookings, no hard deletes for bookings, max booking duration 4 hours

**Scale/Scope**: MVP for a single office with seeded rooms and moderate concurrent booking attempts

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Specification First: PASS. Feature spec exists and defines stories, requirements, acceptance criteria, assumptions, and out-of-scope boundaries.
- Business Rules Outside UI: PASS. Plan places overlap, duration, date-range, and temporal validation in `src/lib/booking`.
- Critical Rules Must Be Tested: PASS. Test coverage is planned for partial/complete/contained overlaps, consecutive bookings, invalid ranges, and cancelled booking reuse.
- Small and Reviewable Changes: PASS. Work is decomposed into spec-linked tasks and quality gates.
- AI-Assisted, Human-Reviewed: PASS. No unnecessary dependencies; architecture boundaries preserved.
- MVP Simplicity: PASS. Explicitly excludes authentication, external integrations, and microservices.

## Project Structure

### Documentation (this feature)

```text
specs/001-room-booking/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma
└── seed.ts

src/
├── app/
│   ├── api/
│   │   ├── rooms/
│   │   └── bookings/
│   │       └── [id]/cancel/
│   ├── bookings/new/
│   ├── layout.tsx
│   └── page.tsx
├── components/
└── lib/
	├── booking/
	│   ├── booking-rules.ts
	│   └── booking-service.ts
	└── prisma/
		├── client.ts
		├── room-repository.ts
		└── booking-repository.ts

tests/
├── booking-rules.test.ts
├── booking-service.test.ts
└── api/
	└── bookings.test.ts
```

**Structure Decision**: Single Next.js modular monolith. Keep HTTP concerns in route handlers, domain policy in `src/lib/booking`, and persistence access in `src/lib/prisma`.

## Phase 0 Research Output

Research completed in `/specs/001-room-booking/research.md` with concrete decisions on:

- overlap semantics for confirmed bookings;
- UTC normalization and server-time validation;
- cancellation as status transition (soft-state retention);
- 4-hour duration enforcement;
- structured API validation error format;
- transaction-based concurrency handling in SQLite/Prisma.

## Phase 1 Design Output

Design artifacts generated:

- `/specs/001-room-booking/data-model.md`
- `/specs/001-room-booking/contracts/booking-api.openapi.yaml`
- `/specs/001-room-booking/quickstart.md`

## Constitution Check (Post-Design)

- Specification First: PASS. Contracts and data model map directly to FR and AC clauses.
- Business Rules Outside UI: PASS. Contracts keep route handlers thin and delegate validation to booking service.
- Critical Rules Must Be Tested: PASS. Quickstart includes scenarios covering all constitution-mandated rule tests.
- Small and Reviewable Changes: PASS. Artifacts keep scope focused on MVP without expansion.
- AI-Assisted, Human-Reviewed: PASS. Design avoids unnecessary packages and preserves repository boundaries.
- MVP Simplicity: PASS. No auth, microservices, or external integrations introduced.

## Complexity Tracking

No constitution violations requiring justification.
