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

## Functional Requirements

### FR-001

The system must display all seeded meeting rooms.

### FR-002

The system must allow a user to create a booking with:

- room;
- title;
- organizer name;
- start date and time;
- end date and time.

### FR-003

The end time must be later than the start time.

### FR-004

The system must reject bookings in the past.

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

The maximum booking duration is four hours.

## Conflict Rule

Two bookings overlap when:

newStart < existingEnd

and

newEnd > existingStart

Only confirmed bookings participate in conflict validation.

## Acceptance Criteria

### AC-001 Successful booking

Given a room without conflicting bookings  
When the user submits a valid reservation  
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
- cloud deployment.
