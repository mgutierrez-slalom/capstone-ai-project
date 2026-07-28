# RoomFlow Constitution

## 1. Specification First

Every feature must begin with a written specification containing:

- user scenarios;
- functional requirements;
- acceptance criteria;
- assumptions;
- explicit out-of-scope items.

Implementation must not begin before the specification is sufficiently clear.

## 2. Business Rules Outside the UI

Core business rules must not be implemented exclusively inside React components, route handlers or database queries.

The meeting-room booking rules must live in reusable domain or service modules.

## 3. Critical Rules Must Be Tested

The following cases require automated tests:

- partial booking overlap;
- complete overlap;
- contained booking;
- consecutive bookings;
- invalid date ranges;
- cancelled bookings not blocking availability.

## 4. Small and Reviewable Changes

Each implementation task must be:

- traceable to the specification;
- independently testable;
- small enough to review;
- completed only after linting, type checking and tests pass.

## 5. AI-Assisted, Human-Reviewed

AI-generated code must:

- follow repository instructions;
- avoid unnecessary dependencies;
- preserve architectural boundaries;
- include appropriate tests;
- be reviewed before being accepted.

## 6. MVP Simplicity

The MVP must remain intentionally small.

The following capabilities are excluded:

- authentication;
- recurring bookings;
- external calendar integrations;
- notifications;
- microservices;
- cloud provisioning;
- administrative room management.
