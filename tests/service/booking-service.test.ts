import { describe, it, expect, beforeAll } from 'vitest';
import { createBooking, cancelBooking } from '@/lib/booking/booking-service';
import * as bookingRepo from '@/lib/prisma/booking-repository';
import * as roomRepo from '@/lib/prisma/room-repository';

describe('Booking Service Integration Tests', () => {
  let orionRoom: { id: string; name: string };

  beforeAll(async () => {
    const room = await roomRepo.getRoomById((await roomRepo.getAllRooms())[0].id);
    if (!room) throw new Error('Orion room not found');
    orionRoom = room;
  });

  describe('createBooking()', () => {
    it('creates a valid booking with all constraints (AC-001)', async () => {
      const startTime = new Date();
      startTime.setHours(startTime.getHours() + 24); // 24 hours from now
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 1);

      const result = await createBooking({
        roomId: orionRoom.id,
        organizerName: 'Alice',
        title: 'Team Meeting',
        startTime,
        endTime,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.booking).toBeDefined();
        expect(result.booking.id).toBeDefined();
        expect(result.booking.roomId).toBe(orionRoom.id);
        expect(result.booking.title).toBe('Team Meeting');
        expect(result.booking.organizerName).toBe('Alice');
        expect(result.booking.status).toBe('CONFIRMED');
        expect(result.booking.startTime).toEqual(startTime);
        expect(result.booking.endTime).toEqual(endTime);
        expect(result.booking.createdAt).toBeDefined();
        expect(result.booking.updatedAt).toBeDefined();
      }
    });

    it('rejects overlapping booking (AC-002)', async () => {
      // Create first booking
      const startTime1 = new Date();
      startTime1.setHours(startTime1.getHours() + 25);
      const endTime1 = new Date(startTime1);
      endTime1.setHours(endTime1.getHours() + 1);

      const res1 = await createBooking({
        roomId: orionRoom.id,
        organizerName: 'Bob',
        title: 'Meeting 1',
        startTime: startTime1,
        endTime: endTime1,
      });

      expect(res1.success).toBe(true);

      // Try to create overlapping booking
      const startTime2 = new Date(startTime1);
      startTime2.setMinutes(startTime2.getMinutes() + 30);
      const endTime2 = new Date(startTime2);
      endTime2.setHours(endTime2.getHours() + 1);

      const res2 = await createBooking({
        roomId: orionRoom.id,
        organizerName: 'Charlie',
        title: 'Meeting 2',
        startTime: startTime2,
        endTime: endTime2,
      });

      expect(res2.success).toBe(false);
      if (!res2.success) {
        expect(res2.error.code).toBe('BOOKING_CONFLICT');
      }
    });

    it('allows consecutive bookings (AC-003)', async () => {
      // Create first booking
      const startTime1 = new Date();
      startTime1.setHours(startTime1.getHours() + 26);
      const endTime1 = new Date(startTime1);
      endTime1.setHours(endTime1.getHours() + 1);

      const res1 = await createBooking({
        roomId: orionRoom.id,
        organizerName: 'Dave',
        title: 'Booking 1',
        startTime: startTime1,
        endTime: endTime1,
      });

      expect(res1.success).toBe(true);

      // Create consecutive booking
      const startTime2 = new Date(endTime1);
      const endTime2 = new Date(startTime2);
      endTime2.setHours(endTime2.getHours() + 1);

      const res2 = await createBooking({
        roomId: orionRoom.id,
        organizerName: 'Eve',
        title: 'Booking 2',
        startTime: startTime2,
        endTime: endTime2,
      });

      expect(res2.success).toBe(true);
    });

    it('rejects invalid time range (AC-004)', async () => {
      const startTime = new Date();
      startTime.setHours(startTime.getHours() + 1);
      const endTime = new Date(startTime);

      const result = await createBooking({
        roomId: orionRoom.id,
        organizerName: 'Frank',
        title: 'Bad Meeting',
        startTime,
        endTime,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_TIME_RANGE');
      }
    });

    it('rejects past bookings (FR-004)', async () => {
      const startTime = new Date();
      startTime.setHours(startTime.getHours() - 1);
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 1);

      const result = await createBooking({
        roomId: orionRoom.id,
        organizerName: 'Grace',
        title: 'Past Meeting',
        startTime,
        endTime,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('BOOKING_IN_PAST');
      }
    });

    it('accepts bookings of exactly 4 hours', async () => {
      const startTime = new Date();
      startTime.setHours(startTime.getHours() + 1);
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 4);

      const result = await createBooking({
        roomId: orionRoom.id,
        organizerName: 'Henry',
        title: 'Exactly 4 Hours',
        startTime,
        endTime,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.booking.status).toBe('CONFIRMED');
      }
    });

    it('rejects bookings exceeding 4 hours by 1 millisecond (FR-010)', async () => {
      const startTime = new Date();
      startTime.setHours(startTime.getHours() + 5);
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 4);
      endTime.setMilliseconds(endTime.getMilliseconds() + 1);

      const result = await createBooking({
        roomId: orionRoom.id,
        organizerName: 'Henry2',
        title: 'Too Long',
        startTime,
        endTime,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('MAX_DURATION_EXCEEDED');
      }
    });

    it('rejects booking with room-not-found (AC-008)', async () => {
      const startTime = new Date();
      startTime.setHours(startTime.getHours() + 1);
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 1);

      const result = await createBooking({
        roomId: 'invalid-room-id',
        organizerName: 'Ivy',
        title: 'Invalid Room',
        startTime,
        endTime,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('ROOM_NOT_FOUND');
      }
    });

    it('rejects empty/whitespace title and organizer (FR-002)', async () => {
      const startTime = new Date();
      startTime.setHours(startTime.getHours() + 1);
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 1);

      // Empty title
      const res1 = await createBooking({
        roomId: orionRoom.id,
        organizerName: 'Jack',
        title: '   ',
        startTime,
        endTime,
      });

      expect(res1.success).toBe(false);
      if (!res1.success) {
        expect(res1.error.code).toBe('INVALID_INPUT');
      }

      // Empty organizer
      const res2 = await createBooking({
        roomId: orionRoom.id,
        organizerName: '',
        title: 'Meeting',
        startTime,
        endTime,
      });

      expect(res2.success).toBe(false);
      if (!res2.success) {
        expect(res2.error.code).toBe('INVALID_INPUT');
      }
    });

    it('rejects booking with start time exactly equal to current UTC time', async () => {
      const now = new Date();
      const endTime = new Date(now.getTime() + 3600000); // 1 hour later

      const result = await createBooking({
        roomId: orionRoom.id,
        organizerName: 'Oscar',
        title: 'Now Booking',
        startTime: now,
        endTime,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('BOOKING_IN_PAST');
      }
    });

    it('allows bookings in different rooms at same time', async () => {
      // Get two different rooms
      const allRooms = await roomRepo.getAllRooms();
      if (allRooms.length < 2) {
        throw new Error('Test requires at least 2 seeded rooms');
      }

      const room1 = allRooms[0];
      const room2 = allRooms[1];

      const startTime = new Date();
      startTime.setHours(startTime.getHours() + 40);
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 1);

      // Create booking in first room (sequential, not concurrent)
      const res1 = await createBooking({
        roomId: room1.id,
        organizerName: 'Paul',
        title: 'Meeting Room 1',
        startTime,
        endTime,
      });

      expect(res1.success).toBe(true);

      // Create booking at exact same time in second room
      const res2 = await createBooking({
        roomId: room2.id,
        organizerName: 'Quinn',
        title: 'Meeting Room 2',
        startTime,
        endTime,
      });

      expect(res2.success).toBe(true);
      if (res1.success && res2.success) {
        expect(res1.booking.roomId).not.toBe(res2.booking.roomId);
      }
    });

    it('rejects third overlapping booking when two conflict exists', async () => {
      // First booking: 42 hours from now
      const startTime1 = new Date();
      startTime1.setHours(startTime1.getHours() + 42);
      const endTime1 = new Date(startTime1);
      endTime1.setHours(endTime1.getHours() + 1);

      const res1 = await createBooking({
        roomId: orionRoom.id,
        organizerName: 'Ryan',
        title: 'First Booking',
        startTime: startTime1,
        endTime: endTime1,
      });

      expect(res1.success).toBe(true);

      // Second booking: overlaps first (30 min after start)
      const startTime2 = new Date(startTime1);
      startTime2.setMinutes(startTime2.getMinutes() + 30);
      const endTime2 = new Date(startTime2);
      endTime2.setHours(endTime2.getHours() + 1);

      const res2 = await createBooking({
        roomId: orionRoom.id,
        organizerName: 'Sam',
        title: 'Overlapping Booking',
        startTime: startTime2,
        endTime: endTime2,
      });

      expect(res2.success).toBe(false);
      if (!res2.success) {
        expect(res2.error.code).toBe('BOOKING_CONFLICT');
      }

      // Third booking: also overlaps first (in different part, 15 min after start)
      const startTime3 = new Date(startTime1);
      startTime3.setMinutes(startTime3.getMinutes() + 15);
      const endTime3 = new Date(startTime3);
      endTime3.setMinutes(endTime3.getMinutes() + 20);

      const res3 = await createBooking({
        roomId: orionRoom.id,
        organizerName: 'Taylor',
        title: 'Another Overlapping Booking',
        startTime: startTime3,
        endTime: endTime3,
      });

      expect(res3.success).toBe(false);
      if (!res3.success) {
        expect(res3.error.code).toBe('BOOKING_CONFLICT');
      }
    });
  });

  describe('getAllConfirmedBookings()', () => {
    it('returns all CONFIRMED bookings sorted by startTime', async () => {
      const bookings = await bookingRepo.getAllConfirmedBookings();

      expect(Array.isArray(bookings)).toBe(true);

      // Check all bookings are CONFIRMED
      bookings.forEach((booking: { status: string }) => {
        expect(booking.status).toBe('CONFIRMED');
      });

      // Check sorted by startTime
      const times = bookings.map((b: { startTime: Date }) => b.startTime.getTime());
      expect(times).toEqual([...times].sort((a, b) => a - b));
    });
  });

  describe('cancelBooking()', () => {
    it('cancels a confirmed booking (AC-005)', async () => {
      // Create booking
      const startTime = new Date();
      startTime.setHours(startTime.getHours() + 30);
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 1);

      const createRes = await createBooking({
        roomId: orionRoom.id,
        organizerName: 'Kate',
        title: 'Cancelable',
        startTime,
        endTime,
      });

      expect(createRes.success).toBe(true);
      if (createRes.success) {
        const result = await cancelBooking(createRes.booking.id);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.booking.status).toBe('CANCELLED');
          expect(result.booking.id).toBe(createRes.booking.id);
          expect(result.booking.updatedAt).toBeDefined();
        }
      }
    });

    it('cancelled booking does not block future reservations (AC-005, FR-008)', async () => {
      // Create and cancel first booking
      const startTime1 = new Date();
      startTime1.setHours(startTime1.getHours() + 31);
      const endTime1 = new Date(startTime1);
      endTime1.setHours(endTime1.getHours() + 1);

      const createRes1 = await createBooking({
        roomId: orionRoom.id,
        organizerName: 'Leo',
        title: 'To Cancel',
        startTime: startTime1,
        endTime: endTime1,
      });

      expect(createRes1.success).toBe(true);
      if (createRes1.success) {
        await cancelBooking(createRes1.booking.id);

        // Try to book same slot again
        const createRes2 = await createBooking({
          roomId: orionRoom.id,
          organizerName: 'Mike',
          title: 'After Cancel',
          startTime: startTime1,
          endTime: endTime1,
        });

        expect(createRes2.success).toBe(true);
      }
    });

    it('rejects double-cancellation', async () => {
      // Create booking
      const startTime = new Date();
      startTime.setHours(startTime.getHours() + 32);
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 1);

      const createRes = await createBooking({
        roomId: orionRoom.id,
        organizerName: 'Nancy',
        title: 'Double Cancel Test',
        startTime,
        endTime,
      });

      expect(createRes.success).toBe(true);
      if (createRes.success) {
        // Cancel first time
        const cancelRes1 = await cancelBooking(createRes.booking.id);
        expect(cancelRes1.success).toBe(true);
        if (cancelRes1.success) {
          expect(cancelRes1.booking.status).toBe('CANCELLED');
        }

        // Try to cancel again
        const cancelRes2 = await cancelBooking(createRes.booking.id);
        expect(cancelRes2.success).toBe(false);
        if (!cancelRes2.success) {
          expect(cancelRes2.error.code).toBe('BOOKING_ALREADY_CANCELLED');
          expect(cancelRes2.error.statusCode).toBe(409);
        }
      }
    });

    it('rejects cancellation of unknown booking', async () => {
      const result = await cancelBooking('invalid-booking-id');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('BOOKING_NOT_FOUND');
        expect(result.error.statusCode).toBe(404);
      }
    });
  });
});
