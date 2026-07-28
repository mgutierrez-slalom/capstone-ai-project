import { describe, it, expect, beforeAll } from 'vitest';
import { createBooking, cancelBooking } from '@/lib/booking/booking-service';
import * as roomRepo from '@/lib/prisma/room-repository';
import * as bookingRepo from '@/lib/prisma/booking-repository';

describe('Booking Integration Tests', () => {
  let orionRoom: { id: string; name: string };

  beforeAll(async () => {
    const room = await roomRepo.getRoomById((await roomRepo.getAllRooms())[0].id);
    if (!room) throw new Error('Orion room not found');
    orionRoom = room;
  });

  describe('GET /api/rooms', () => {
    it('returns all seeded rooms sorted by name', async () => {
      const rooms = await roomRepo.getAllRooms();

      expect(Array.isArray(rooms)).toBe(true);
      expect(rooms.length).toBeGreaterThan(0);

      // Check rooms are sorted alphabetically
      const names = rooms.map((r: { name: string }) => r.name);
      expect(names).toEqual([...names].sort());

      // Check seeded rooms exist
      const roomNames = new Set(names);
      expect(roomNames.has('Orion')).toBe(true);
      expect(roomNames.has('Andromeda')).toBe(true);
      expect(roomNames.has('Apollo')).toBe(true);
    });
  });

  describe('POST /api/bookings', () => {
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
        const booking = await bookingRepo.getBookingById(result.bookingId);
        expect(booking?.status).toBe('CONFIRMED');
        expect(booking?.title).toBe('Team Meeting');
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

    it('rejects bookings exceeding 4 hours (FR-010)', async () => {
      const startTime = new Date();
      startTime.setHours(startTime.getHours() + 1);
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 4);
      endTime.setSeconds(endTime.getSeconds() + 1);

      const result = await createBooking({
        roomId: orionRoom.id,
        organizerName: 'Henry',
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
  });

  describe('GET /api/bookings', () => {
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

  describe('POST /api/bookings/{id}/cancel', () => {
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
        const result = await cancelBooking(createRes.bookingId);
        expect(result.success).toBe(true);

        // Verify cancelled in database
        const booking = await bookingRepo.getBookingById(createRes.bookingId);
        expect(booking?.status).toBe('CANCELLED');
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
        await cancelBooking(createRes1.bookingId);

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
        const cancelRes1 = await cancelBooking(createRes.bookingId);
        expect(cancelRes1.success).toBe(true);

        // Try to cancel again
        const cancelRes2 = await cancelBooking(createRes.bookingId);
        expect(cancelRes2.success).toBe(false);
        if (!cancelRes2.success) {
          expect(cancelRes2.error.code).toBe('INVALID_INPUT');
        }
      }
    });
  });
});
