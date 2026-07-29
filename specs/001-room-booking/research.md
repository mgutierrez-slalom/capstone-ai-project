# Phase 0 Research: RoomFlow Booking

## Decision 1: Overlap Behavior

Decision: Use strict overlap comparison `newStart < existingEnd && newEnd > existingStart` and include only CONFIRMED bookings in conflict checks.

Rationale: This exactly matches FR-005, FR-006, and the conflict rule in the feature spec while allowing consecutive bookings.

Alternatives considered: Inclusive boundaries were rejected because they block consecutive bookings; checking all statuses was rejected because CANCELLED bookings must not block availability.

## Decision 2: Date and Timezone Handling

Decision: Persist booking times as UTC DateTime values through Prisma, parse client input into Date objects in the application service, and compare against server current time when enforcing past-booking rejection.

Rationale: UTC storage avoids ambiguous timezone interpretation in SQLite and keeps conflict logic deterministic. Server-time validation ensures a single source of truth.

Alternatives considered: Storing local time with offsets was rejected for MVP complexity; storing timestamps only was rejected because ISO DateTime values are simpler with Prisma.

## Decision 3: Cancellation Rule and Audit Preservation

Decision: Cancellation is a status transition from CONFIRMED to CANCELLED; booking rows are never physically deleted.

Rationale: This satisfies FR-007 and FR-008 while preserving auditability through status, createdAt, and updatedAt.

Alternatives considered: Hard delete was rejected because it removes audit history; separate audit tables were rejected as unnecessary for MVP scope.

## Decision 4: Maximum Duration Enforcement

Decision: Enforce a maximum duration of four hours in domain rules in `src/lib/booking/booking-rules.ts` before persistence.

Rationale: Domain-level validation is reusable, testable, and keeps handlers thin. Existing tests already codify exact-boundary behavior.

Alternatives considered: Database-only constraints were rejected for lower readability and weaker portability in SQLite.

## Decision 5: Validation Error Contract

Decision: Return structured JSON errors with `code`, `message`, and optional `field`. Use status codes 400 for invalid business input, 409 for booking conflicts, and 422 for semantically invalid date ranges.

Rationale: A stable error shape simplifies frontend rendering and keeps route handlers focused on HTTP mapping.

Alternatives considered: Free-text error strings were rejected due to brittle UI parsing; using one status for every error was rejected because it hides conflict semantics.

## Decision 6: Concurrency Handling for Booking Creation

Decision: Execute overlap lookup and booking insert within a single Prisma transaction and re-check conflicts inside that transaction.

Rationale: This prevents check-then-insert race windows under concurrent requests, which is necessary even for SQLite-backed MVP behavior.

Alternatives considered: Unique constraints were rejected because they cannot encode interval overlap; no transaction was rejected due to race-condition risk.

## Decision 7: MVP Scope Boundaries

Decision: Keep implementation limited to room list, booking list, booking creation, and cancellation APIs/pages, without auth, microservices, or external integrations.

Rationale: This is required by constitution section 6 and out-of-scope items in the specification.

Alternatives considered: Adding user identity, notifications, or calendar integrations was rejected because it expands beyond MVP and violates explicit boundaries.
