# AGENTS.md

## Project

RoomFlow is a meeting-room booking capstone project.

## Required Reading

Before implementing changes, read:

1. .specify/memory/constitution.md
2. specs/001-room-booking/spec.md
3. specs/001-room-booking/plan.md
4. specs/001-room-booking/tasks.md

## Engineering Rules

- Use TypeScript strict typing.
- Do not use `any`.
- Keep business rules outside React components.
- Keep route handlers thin.
- Put booking rules in `src/lib/booking`.
- Preserve cancelled bookings.
- Do not physically delete bookings.
- Do not introduce new dependencies without justification.
- Do not add functionality outside the specification.
- Add tests for every critical business rule.

## Validation

Before completing a task, run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build