# Booking Business Rules

This document describes all booking validation rules enforced by RoomFlow and explains the conflict detection algorithm.

## Rules

### 1. Valid Time Range

A booking is valid only when `endTime > startTime` (strictly greater — equal times are rejected).

```ts
// src/lib/booking/booking-rules.ts
export function isValidTimeRange(range: TimeRange): boolean {
    return range.startTime.getTime() < range.endTime.getTime();
}
```

### 2. Future Start Time

The booking `startTime` must be after the current server UTC time. Past bookings are rejected with `BOOKING_IN_PAST`.

### 3. Maximum Duration

Bookings may last **at most 4 hours** (exactly 4 hours is allowed; any duration exceeding 4 hours is rejected).

```ts
export const MAX_BOOKING_DURATION_HOURS = 4;

export function isWithinMaximumDuration(range: TimeRange): boolean {
    const ms = range.endTime.getTime() - range.startTime.getTime();
    return ms <= MAX_BOOKING_DURATION_HOURS * 60 * 60 * 1000;
}
```

### 4. Existing Room

The `roomId` in the request must correspond to a room that exists in the database. Unknown rooms are rejected with `ROOM_NOT_FOUND`.

### 5. Non-Empty Strings

`title` and `organizerName` must be non-empty after trimming whitespace. Blank-only values are rejected with `INVALID_INPUT`.

### 6. No Overlapping Confirmed Bookings

A new booking is rejected when it overlaps any existing `CONFIRMED` booking for the same room. **Cancelled bookings do not block availability.**

## Overlap Detection Algorithm

Two time ranges overlap when:

```
newStart < existingEnd  AND  newEnd > existingStart
```

This covers all overlap cases:

| Scenario | Result |
|---|---|
| Partial overlap (new starts before existing ends) | Conflict |
| Complete overlap (new fully contains existing) | Conflict |
| Contained (new fully inside existing) | Conflict |
| Consecutive (new starts exactly when existing ends) | **Allowed** |
| Adjacent with gap | Allowed |

```ts
export function bookingsOverlap(
    candidate: TimeRange,
    existing: TimeRange,
): boolean {
    return (
        candidate.startTime.getTime() < existing.endTime.getTime() &&
        candidate.endTime.getTime() > existing.startTime.getTime()
    );
}
```

Note: `<` and `>` (not `<=`/`>=`) ensure consecutive bookings (end of one equals start of next) are not treated as conflicts.

## Race Condition Prevention

`booking-service.ts` uses a Prisma transaction with an internal re-check of confirmed bookings for the same room immediately before inserting the new row. This prevents two concurrent requests from both passing the initial overlap check and both succeeding.

## Cancellation

Cancellation is a status transition from `CONFIRMED` to `CANCELLED`. The booking row is **never deleted**. Once cancelled, the time slot is immediately available for new bookings because overlap checks only consider `CONFIRMED` rows.

## Error Codes

| Code | HTTP Status | Cause |
|---|---|---|
| `INVALID_TIME_RANGE` | 422 | `endTime ≤ startTime` |
| `BOOKING_IN_PAST` | 400 | `startTime` is in the past |
| `MAX_DURATION_EXCEEDED` | 400 | Duration exceeds 4 hours |
| `ROOM_NOT_FOUND` | 400 | `roomId` does not match any room |
| `INVALID_INPUT` | 400 | Empty/whitespace `title` or `organizerName` |
| `BOOKING_CONFLICT` | 409 | Overlaps an existing CONFIRMED booking |
| `BOOKING_ALREADY_CANCELLED` | 409 | Attempting to cancel an already-cancelled booking |
