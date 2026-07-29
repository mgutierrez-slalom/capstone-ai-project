# Feature Specification: Meeting Room Booking

## Overview

RoomFlow is a lightweight meeting-room booking application that allows users to view rooms, create reservations, detect scheduling conflicts and cancel existing reservations.

## User Stories

### US-001 View rooms

As a user, I want to view available meeting rooms so that I can select an appropriate room.

### US-002 Create booking

As a user, I want to create a room booking so that I can reserve a meeting space.

### US-003 Prevent conflicts

As a user, I want the system to reject overlapping bookings so that a room cannot be reserved twice for the same time.

### US-004 View bookings

As a user, I want to view existing bookings so that I can understand room usage.

### US-005 Cancel booking

As a user, I want to cancel a booking so that the room becomes available again.

## Clarifications

### Session 2026-07-28

- Room sort order: Alphabetically by name (ascending)
- 4-hour boundary: Exactly 4h permitted (≤4h inclusive)
- Room not found error: HTTP 400 with code ROOM_NOT_FOUND
- Timestamps: ISO 8601 UTC; server validates against current UTC; frontend converts local input to UTC
- String fields: title and organizerName must be trimmed and non-empty
- Booking list order: By startTime ascending
- Seeded rooms: Orion (capacity 4, Floor 2), Andromeda (capacity 8, Floor 2), Apollo (capacity 12, Floor 3)
- Empty states: Define for no rooms and no bookings
- Booking list filtering: Remove roomId and status filters; not in MVP scope
- Successful booking criteria: Valid time range, future start time, duration ≤4 hours, existing room, no conflict

## Functional Requirements

### FR-001

The system must display all seeded meeting rooms sorted alphabetically by name in ascending order.

### FR-002

The system must allow a user to create a booking with:

- room (must exist);
- title (required, trimmed, non-empty);
- organizer name (required, trimmed, non-empty);
- start date and time (must be in the future, UTC);
- end date and time (must be after start time, UTC).

### FR-003

The end time must be strictly later than the start time (endTime > startTime).

### FR-004

The system must reject bookings where the start time is in the past. Past validation is performed against the current server time (UTC).

### FR-005

The system must reject overlapping confirmed bookings for the same room.

### FR-006

The system must allow consecutive bookings.

Example:

- Existing booking: 10:00 to 11:00
- New booking: 11:00 to 12:00
- Result: allowed

### FR-007

The system must preserve cancelled bookings for audit purposes.

### FR-008

Cancelled bookings must not block future reservations.

### FR-009

A booking must have one of these statuses:

- CONFIRMED
- CANCELLED

### FR-010

Booking duration must not exceed four hours (inclusive). Bookings exactly 4 hours long are permitted; durations greater than 4 hours are rejected.

## Conflict Rule

Two bookings overlap when:

newStart < existingEnd

and

newEnd > existingStart

Only confirmed bookings participate in conflict validation.

## Acceptance Criteria

### AC-001 Successful booking

Given a room without conflicting bookings  
When the user submits a valid reservation with:  
  - end time later than start time;  
  - start time in the future (UTC);  
  - duration ≤ 4 hours;  
  - existing room;  
Then the booking is created with status CONFIRMED.

### AC-002 Overlapping booking

Given a room booked from 10:00 to 11:00  
When a user attempts to book it from 10:30 to 11:30  
Then the system rejects the booking.

### AC-003 Consecutive booking

Given a room booked from 10:00 to 11:00  
When a user books it from 11:00 to 12:00  
Then the booking is accepted.

### AC-004 Invalid time range

Given an end time equal to or earlier than the start time  
When the user submits the booking  
Then the system rejects the request.

### AC-005 Cancellation

Given a confirmed booking  
When the user cancels it  
Then its status changes to CANCELLED  
And its time slot becomes available.

### AC-006 Empty room list

Given no rooms have been seeded  
When the user opens the dashboard  
Then the UI displays "No rooms available".

### AC-007 Empty booking list

Given no bookings exist  
When the user views the booking list  
Then the UI displays "No bookings".

### AC-008 Room not found error

Given a booking creation request with an invalid (non-existent) roomId  
When the user submits the form  
Then the system returns HTTP 400 with error code ROOM_NOT_FOUND.

## Seeded Rooms

The system must pre-populate the database with three meeting rooms:

- **Orion**: capacity 4, location "Floor 2"
- **Andromeda**: capacity 8, location "Floor 2"
- **Apollo**: capacity 12, location "Floor 3"

## API Timestamp Format

All booking timestamps (startTime, endTime, createdAt, updatedAt) are stored and returned in ISO 8601 UTC format (e.g., "2026-07-28T14:30:00Z").

Frontend logic must:
- Convert user-provided local time to UTC before submission
- Display UTC timestamps in local timezone to the user

## Out of Scope

- user authentication;
- recurring reservations;
- email notifications;
- Google Calendar integration;
- Microsoft Outlook integration;
- room administration;
- editing bookings;
- check-in functionality;
- multiple offices;
- cloud deployment;
- booking list filtering by roomId or status.
