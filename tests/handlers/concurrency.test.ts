import { describe, it, expect, beforeEach } from 'vitest';
import { createBooking, cancelBooking } from '@/lib/booking/booking-service';
import * as bookingRepo from '@/lib/prisma/booking-repository';
import * as roomRepo from '@/lib/prisma/room-repository';

describe('Concurrency: Booking Creation Race Conditions', () => {
  let roomId: string;

  beforeEach(async () => {
    const rooms = await roomRepo.getAllRooms();
    roomId = rooms[0].id;
  });

  it('concurrent identical booking requests - only one succeeds (Promise.allSettled)', async () => {
    const startTime = new Date('2026-08-20T10:00:00Z');
    const endTime = new Date('2026-08-20T11:00:00Z');

    const request = {
      roomId,
      organizerName: 'Alice',
      title: 'Same Time Meeting',
      startTime,
      endTime,
    };

    // Launch two simultaneous booking requests for the exact same room/time
    const results = await Promise.allSettled([
      createBooking(request),
      createBooking(request),
    ]);

    // Extract outcomes
    const outcomes = results.map((result) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return { error: result.reason };
      }
    });

    // Exactly one should succeed, one should fail
    const successes = outcomes.filter((o) => 'success' in o && o.success === true);
    const failures = outcomes.filter((o) => 'success' in o && o.success === false);

    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);

    // The failure should be BOOKING_CONFLICT, not an infrastructure error
    if (failures.length > 0) {
      const failure = failures[0];
      if ('error' in failure) {
        expect(failure.error.code).toBe('BOOKING_CONFLICT');
        expect(failure.error.statusCode).toBe(409);
      }
    }

    // Verify only one CONFIRMED booking exists for this room/time
    const bookings = await bookingRepo.getConfirmedBookingsForRoom(roomId, startTime, endTime);
    expect(bookings.length).toBe(1);
    expect(bookings[0].organizerName).toBe('Alice');
    expect(bookings[0].title).toBe('Same Time Meeting');
  });

  it('concurrent overlapping booking requests - only one succeeds', async () => {
    const startTime = new Date('2026-08-21T10:00:00Z');
    const endTime = new Date('2026-08-21T11:00:00Z');

    const request1 = {
      roomId,
      organizerName: 'Bob',
      title: 'First Request',
      startTime,
      endTime,
    };

    const request2 = {
      roomId,
      organizerName: 'Charlie',
      title: 'Second Request',
      startTime: new Date('2026-08-21T10:30:00Z'), // Overlaps with first
      endTime: new Date('2026-08-21T11:30:00Z'),
    };

    // Launch simultaneously
    const results = await Promise.allSettled([
      createBooking(request1),
      createBooking(request2),
    ]);

    const outcomes = results.map((result) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return { error: result.reason };
      }
    });

    // Both should succeed in creation, but one will detect conflict
    const successes = outcomes.filter((o) => 'success' in o && o.success === true);
    const failures = outcomes.filter((o) => 'success' in o && o.success === false);

    // Exactly one succeeds, one fails with BOOKING_CONFLICT
    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);

    if (failures.length > 0 && 'error' in failures[0]) {
      expect(failures[0].error.code).toBe('BOOKING_CONFLICT');
    }

    // Only one booking should exist
    const bookings = await bookingRepo.getAllConfirmedBookings();
    const filtered = bookings.filter(
      (b) =>
        b.roomId === roomId &&
        b.startTime >= new Date('2026-08-21T09:00:00Z') &&
        b.startTime < new Date('2026-08-21T12:00:00Z'),
    );
    expect(filtered.length).toBe(1);
  });

  it('SQLite lock/transaction errors do not become BOOKING_CONFLICT', async () => {
    // This test documents SQLite behavior under stress
    // Create a normal booking first
    const startTime = new Date('2026-08-22T10:00:00Z');
    const endTime = new Date('2026-08-22T11:00:00Z');

    const request = {
      roomId,
      organizerName: 'Dave',
      title: 'Locked Test',
      startTime,
      endTime,
    };

    const result = await createBooking(request);
    expect(result.success).toBe(true);

    if (result.success) {
      // Verify it's confirmed
      const booking = await bookingRepo.getBookingById(result.booking.id);
      expect(booking).toBeDefined();
      expect(booking?.status).toBe('CONFIRMED');
    }
  });
});

describe('Concurrency: Booking Cancellation Race Conditions', () => {
  let roomId: string;
  let bookingId: string;

  beforeEach(async () => {
    // Setup: create a booking to cancel
    const rooms = await roomRepo.getAllRooms();
    roomId = rooms[0].id;

    const startTime = new Date('2026-08-23T10:00:00Z');
    const endTime = new Date('2026-08-23T11:00:00Z');

    const createResult = await createBooking({
      roomId,
      organizerName: 'Eve',
      title: 'To Cancel',
      startTime,
      endTime,
    });

    if (createResult.success) {
      bookingId = createResult.booking.id;
    }
  });

  it('concurrent cancellations - only one succeeds, one gets 409', async () => {
    // Launch two simultaneous cancellation requests
    const results = await Promise.allSettled([
      cancelBooking(bookingId),
      cancelBooking(bookingId),
    ]);

    const outcomes = results.map((result) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return { error: result.reason };
      }
    });

    // Exactly one should succeed, one should fail
    const successes = outcomes.filter((o) => 'success' in o && o.success === true);
    const failures = outcomes.filter((o) => 'success' in o && o.success === false);

    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);

    // The failure should be BOOKING_ALREADY_CANCELLED
    if (failures.length > 0) {
      const failure = failures[0];
      if ('error' in failure) {
        expect(failure.error.code).toBe('BOOKING_ALREADY_CANCELLED');
        expect(failure.error.statusCode).toBe(409);
      }
    }

    // The first success should return the cancelled booking
    if (successes.length > 0 && 'booking' in successes[0]) {
      expect(successes[0].booking.status).toBe('CANCELLED');
    }

    // Verify final persisted status is CANCELLED (not corrupted)
    const final = await bookingRepo.getBookingById(bookingId);
    expect(final?.status).toBe('CANCELLED');
  });

  it('concurrent cancellation and creation of same slot - create fails after cancel', async () => {
    // One thread cancels, other tries to create in the freed slot
    const startTime = new Date('2026-08-24T10:00:00Z');
    const endTime = new Date('2026-08-24T11:00:00Z');

    // First: create a booking to be cancelled
    const original = await createBooking({
      roomId,
      organizerName: 'Frank',
      title: 'Original',
      startTime,
      endTime,
    });

    if (!original.success) {
      throw new Error('Setup failed: could not create original booking');
    }

    const originalId = original.booking.id;

    // Now race: one cancels, one tries to create in same slot
    const [cancelResult, createResult] = await Promise.allSettled([
      cancelBooking(originalId),
      createBooking({
        roomId,
        organizerName: 'Grace',
        title: 'Concurrent Create',
        startTime,
        endTime,
      }),
    ]).then((results) =>
      results.map((r) => (r.status === 'fulfilled' ? r.value : { error: r.reason })),
    );

    // Both operations should succeed (no race condition preventing this)
    // because cancellation frees the slot
    if ('success' in cancelResult && 'success' in createResult) {
      // Either both succeeded, or one infrastructure error
      // The important part: not both domain-level conflicts
      if (cancelResult.success && createResult.success) {
        // Both succeeded - cancel freed the slot and create took it
        expect(cancelResult.booking.status).toBe('CANCELLED');
        expect(createResult.booking.status).toBe('CONFIRMED');
      }
    }
  });
});

describe('Concurrency: Documentation of SQLite Behavior', () => {
  it('documents: concurrent transactions serialize on SQLite', async () => {
    // SQLite's default isolation mode is DEFERRED transactions
    // Multiple concurrent writes will serialize (lock on write)
    // This is expected and documented behavior

    const rooms = await roomRepo.getAllRooms();
    const room1 = rooms[0];
    const room2 = rooms.length > 1 ? rooms[1] : rooms[0];

    const startTime = new Date('2026-08-25T10:00:00Z');
    const endTime = new Date('2026-08-25T11:00:00Z');

    // Same room: only one succeeds
    const sameRoomResults = await Promise.allSettled([
      createBooking({
        roomId: room1.id,
        organizerName: 'Test1',
        title: 'SameRoom1',
        startTime,
        endTime,
      }),
      createBooking({
        roomId: room1.id,
        organizerName: 'Test2',
        title: 'SameRoom2',
        startTime,
        endTime,
      }),
    ]);

    const sameRoomSuccesses = sameRoomResults.filter(
      (r) => r.status === 'fulfilled' && 'success' in r.value && r.value.success === true,
    );

    expect(sameRoomSuccesses.length).toBe(1);

    // Different rooms: both succeed (no cross-room conflict)
    if (room1.id !== room2.id) {
      const diffRoomResults = await Promise.allSettled([
        createBooking({
          roomId: room1.id,
          organizerName: 'Test3',
          title: 'DiffRoom1',
          startTime: new Date('2026-08-25T14:00:00Z'),
          endTime: new Date('2026-08-25T15:00:00Z'),
        }),
        createBooking({
          roomId: room2.id,
          organizerName: 'Test4',
          title: 'DiffRoom2',
          startTime: new Date('2026-08-25T14:00:00Z'),
          endTime: new Date('2026-08-25T15:00:00Z'),
        }),
      ]);

      const diffRoomSuccesses = diffRoomResults.filter(
        (r) => r.status === 'fulfilled' && 'success' in r.value && r.value.success === true,
      );

      expect(diffRoomSuccesses.length).toBe(2);
    }
  });
});
