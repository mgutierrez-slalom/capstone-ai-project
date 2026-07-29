import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, POST } from '@/app/api/bookings/route';
import { POST as CANCEL_POST } from '@/app/api/bookings/[id]/cancel/route';
import type { NextRequest } from 'next/server';
import * as roomRepo from '@/lib/prisma/room-repository';
import { prisma } from '@/lib/prisma/client';
import { hoursFromNow, hoursAgo, futureInterval } from '../helpers/time-fixtures';

describe('GET /api/bookings (Handler)', () => {
  beforeEach(async () => {
    // Clear all bookings before each test
    await prisma.booking.deleteMany({});
  });

  it('returns HTTP 200 with empty array when no confirmed bookings', async () => {
    const response = (await GET()) as Response;

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');

    const bookings = await response.json();
    expect(Array.isArray(bookings)).toBe(true);
    expect(bookings.length).toBe(0);
  });

  it('returns only CONFIRMED bookings, excluding cancelled ones', async () => {
    // Get a room to book
    const rooms = await roomRepo.getAllRooms();
    const roomId = rooms[0].id;

    // Create a confirmed booking
    const time1 = hoursFromNow(25);
    await prisma.booking.create({
      data: {
        roomId,
        organizerName: 'Alice',
        title: 'Confirmed Meeting',
        startTime: time1,
        endTime: hoursFromNow(26),
        status: 'CONFIRMED',
      },
    });

    // Create a cancelled booking (should not be returned)
    const time2 = hoursFromNow(27);
    await prisma.booking.create({
      data: {
        roomId,
        organizerName: 'Bob',
        title: 'Cancelled Meeting',
        startTime: time2,
        endTime: hoursFromNow(28),
        status: 'CANCELLED',
      },
    });

    const response = (await GET()) as Response;
    const bookings = await response.json();

    expect(bookings.length).toBe(1);
    expect(bookings[0].title).toBe('Confirmed Meeting');
    expect(bookings[0].status).toBe('CONFIRMED');
  });

  it('returns CONFIRMED bookings sorted by startTime ascending', async () => {
    // Get a room to book
    const rooms = await roomRepo.getAllRooms();
    const roomId = rooms[0].id;

    // Create bookings in reverse chronological order to verify sorting
    const laterTime = hoursFromNow(30);
    const earlierTime = hoursFromNow(25);

    // Create the later booking first (reverse order)
    const booking1 = await prisma.booking.create({
      data: {
        roomId,
        organizerName: 'Bob',
        title: 'Later Meeting',
        startTime: laterTime,
        endTime: hoursFromNow(31),
        status: 'CONFIRMED',
      },
    });
    expect(booking1).toBeDefined();
    expect(booking1.id).toBeTruthy();

    // Create the earlier booking second
    const booking2 = await prisma.booking.create({
      data: {
        roomId,
        organizerName: 'Alice',
        title: 'Earlier Meeting',
        startTime: earlierTime,
        endTime: hoursFromNow(26),
        status: 'CONFIRMED',
      },
    });
    expect(booking2).toBeDefined();
    expect(booking2.id).toBeTruthy();

    const response = (await GET()) as Response;
    const bookings = await response.json();

    expect(bookings.length).toBe(2);
    // Verify they're sorted by startTime ascending
    expect(new Date(bookings[0].startTime) < new Date(bookings[1].startTime)).toBe(true);
    expect(bookings[0].title).toBe('Earlier Meeting');
    expect(bookings[1].title).toBe('Later Meeting');
  });

  it('returns complete Booking shape with createdAt and updatedAt', async () => {
    const rooms = await roomRepo.getAllRooms();
    const roomId = rooms[0].id;

    await prisma.booking.create({
      data: {
        roomId,
        organizerName: 'Alice',
        title: 'Team Meeting',
        startTime: hoursFromNow(25),
        endTime: hoursFromNow(26),
        status: 'CONFIRMED',
      },
    });

    const response = (await GET()) as Response;
    const bookings = await response.json();

    expect(bookings.length).toBe(1);
    const booking = bookings[0];

    expect(booking).toHaveProperty('id');
    expect(booking).toHaveProperty('roomId');
    expect(booking).toHaveProperty('organizerName');
    expect(booking).toHaveProperty('title');
    expect(booking).toHaveProperty('startTime');
    expect(booking).toHaveProperty('endTime');
    expect(booking).toHaveProperty('status');
    expect(booking).toHaveProperty('createdAt');
    expect(booking).toHaveProperty('updatedAt');

    expect(typeof booking.id).toBe('string');
    expect(typeof booking.roomId).toBe('string');
    expect(typeof booking.organizerName).toBe('string');
    expect(typeof booking.title).toBe('string');
    expect(typeof booking.startTime).toBe('string');
    expect(typeof booking.endTime).toBe('string');
    expect(booking.status).toBe('CONFIRMED');
    expect(typeof booking.createdAt).toBe('string');
    expect(typeof booking.updatedAt).toBe('string');

    // Verify timestamps are valid ISO strings
    expect(() => new Date(booking.createdAt)).not.toThrow();
    expect(() => new Date(booking.updatedAt)).not.toThrow();
  });
});

describe('POST /api/bookings (Handler)', () => {
  let roomId: string;

  beforeEach(async () => {
    // Clear bookings before each test
    await prisma.booking.deleteMany({});
    // Get a room to use for bookings
    const rooms = await roomRepo.getAllRooms();
    roomId = rooms[0].id;
  });

  it('returns HTTP 201 with complete created Booking', async () => {
    const { startTime, endTime } = futureInterval(25, 26);

    const request = new Request('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        organizerName: 'Alice',
        title: 'Team Meeting',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      }),
    });

    const response = (await POST(request)) as Response;
    expect(response.status).toBe(201);

    const booking = await response.json();
    expect(booking).toHaveProperty('id');
    expect(booking.roomId).toBe(roomId);
    expect(booking.organizerName).toBe('Alice');
    expect(booking.title).toBe('Team Meeting');
    expect(booking.status).toBe('CONFIRMED');
    expect(booking).toHaveProperty('createdAt');
    expect(booking).toHaveProperty('updatedAt');

    // Verify timestamps are valid ISO strings
    expect(() => new Date(booking.createdAt)).not.toThrow();
    expect(() => new Date(booking.updatedAt)).not.toThrow();
  });

  it('trims whitespace from text fields', async () => {
    const { startTime, endTime } = futureInterval(25, 26);

    const request = new Request('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        organizerName: '  Alice  ',
        title: '  Team Meeting  ',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      }),
    });

    const response = (await POST(request)) as Response;
    const booking = await response.json();

    expect(booking.organizerName).toBe('Alice');
    expect(booking.title).toBe('Team Meeting');
  });

  it('accepts exactly four hours as maximum duration', async () => {
    const startTime = hoursFromNow(25);
    const endTime = new Date(startTime.getTime() + 4 * 60 * 60 * 1000); // exactly 4 h

    const request = new Request('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        organizerName: 'Alice',
        title: 'Long Meeting',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      }),
    });

    const response = (await POST(request)) as Response;
    expect(response.status).toBe(201);

    const booking = await response.json();
    expect(booking.status).toBe('CONFIRMED');
  });

  it('returns HTTP 400 for malformed JSON', async () => {
    const request = new Request('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not valid json {',
    });

    const response = (await POST(request)) as Response;
    expect(response.status).toBe(400);

    const error = await response.json();
    expect(error.code).toBe('INVALID_INPUT');
    expect(error).toHaveProperty('message');
  });

  it('returns HTTP 400 for missing required fields', async () => {
    const request = new Request('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, organizerName: 'Alice' }), // missing title, startTime, endTime
    });

    const response = (await POST(request)) as Response;
    expect(response.status).toBe(400);

    const error = await response.json();
    expect(error.code).toBe('INVALID_INPUT');
    expect(error).toHaveProperty('message');
  });

  it('returns HTTP 400 for non-string title', async () => {
    const { startTime, endTime } = futureInterval(25, 26);

    const request = new Request('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        organizerName: 'Alice',
        title: 42, // not a string
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      }),
    });

    const response = (await POST(request)) as Response;
    expect(response.status).toBe(400);

    const error = await response.json();
    expect(error.code).toBe('INVALID_INPUT');
    expect(error.field).toBe('title');
  });

  it('returns HTTP 400 for non-string organizerName', async () => {
    const { startTime, endTime } = futureInterval(25, 26);

    const request = new Request('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        organizerName: true, // not a string
        title: 'Meeting',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      }),
    });

    const response = (await POST(request)) as Response;
    expect(response.status).toBe(400);

    const error = await response.json();
    expect(error.code).toBe('INVALID_INPUT');
    expect(error.field).toBe('organizerName');
  });

  it('returns HTTP 400 for invalid startTime date string', async () => {
    const request = new Request('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        organizerName: 'Alice',
        title: 'Meeting',
        startTime: 'not-a-date',
        endTime: hoursFromNow(26).toISOString(),
      }),
    });

    const response = (await POST(request)) as Response;
    expect(response.status).toBe(400);

    const error = await response.json();
    expect(error.code).toBe('INVALID_INPUT');
    expect(error.field).toBe('startTime');
  });

  it('returns HTTP 400 for invalid endTime date string', async () => {
    const request = new Request('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        organizerName: 'Alice',
        title: 'Meeting',
        startTime: hoursFromNow(25).toISOString(),
        endTime: 'not-a-date',
      }),
    });

    const response = (await POST(request)) as Response;
    expect(response.status).toBe(400);

    const error = await response.json();
    expect(error.code).toBe('INVALID_INPUT');
    expect(error.field).toBe('endTime');
  });

  it('returns HTTP 500 for internal repository failure without exposing details', async () => {
    const { startTime, endTime } = futureInterval(25, 26);
    const bookingService = await import('@/lib/booking/booking-service');
    const spy = vi
      .spyOn(bookingService, 'createBooking')
      .mockRejectedValueOnce(new Error('SQLite: disk I/O error'));

    const request = new Request('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        organizerName: 'Alice',
        title: 'Meeting',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      }),
    });

    const response = (await POST(request)) as Response;
    expect(response.status).toBe(500);

    const error = await response.json();
    expect(error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(JSON.stringify(error)).not.toContain('SQLite');
    expect(JSON.stringify(error)).not.toContain('disk I/O');

    spy.mockRestore();
  });

  it('returns HTTP 422 for endTime <= startTime', async () => {
    const startTime = hoursFromNow(26);
    const endTime = hoursFromNow(25); // end before start

    const request = new Request('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        organizerName: 'Alice',
        title: 'Meeting',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      }),
    });

    const response = (await POST(request)) as Response;
    expect(response.status).toBe(422);

    const error = await response.json();
    expect(error.code).toBe('INVALID_TIME_RANGE');
    expect(error).toHaveProperty('message');
  });

  it('returns HTTP 400 for startTime in the past', async () => {
    const startTime = hoursAgo(48); // clearly in the past
    const endTime = hoursAgo(47);

    const request = new Request('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        organizerName: 'Alice',
        title: 'Meeting',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      }),
    });

    const response = (await POST(request)) as Response;
    expect(response.status).toBe(400);

    const error = await response.json();
    expect(error.code).toBe('BOOKING_IN_PAST');
  });

  it('returns HTTP 400 for duration > 4 hours', async () => {
    const startTime = hoursFromNow(25);
    const endTime = new Date(startTime.getTime() + 4 * 60 * 60 * 1000 + 1000); // 4h + 1s

    const request = new Request('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        organizerName: 'Alice',
        title: 'Long Meeting',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      }),
    });

    const response = (await POST(request)) as Response;
    expect(response.status).toBe(400);

    const error = await response.json();
    expect(error.code).toBe('MAX_DURATION_EXCEEDED');
  });

  it('returns HTTP 400 for empty organizerName', async () => {
    const { startTime, endTime } = futureInterval(25, 26);

    const request = new Request('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        organizerName: '   ',
        title: 'Meeting',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      }),
    });

    const response = (await POST(request)) as Response;
    expect(response.status).toBe(400);

    const error = await response.json();
    expect(error.code).toBe('INVALID_INPUT');
  });

  it('returns HTTP 400 for empty title', async () => {
    const { startTime, endTime } = futureInterval(25, 26);

    const request = new Request('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        organizerName: 'Alice',
        title: '   ',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      }),
    });

    const response = (await POST(request)) as Response;
    expect(response.status).toBe(400);

    const error = await response.json();
    expect(error.code).toBe('INVALID_INPUT');
  });

  it('returns HTTP 400 for unknown roomId', async () => {
    const { startTime, endTime } = futureInterval(25, 26);

    const request = new Request('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: 'invalid-room-id-xyz',
        organizerName: 'Alice',
        title: 'Meeting',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      }),
    });

    const response = (await POST(request)) as Response;
    expect(response.status).toBe(400);

    const error = await response.json();
    expect(error.code).toBe('ROOM_NOT_FOUND');
  });

  it('returns HTTP 409 for overlapping booking', async () => {
    const { startTime, endTime } = futureInterval(25, 26);

    // Create first booking
    const request1 = new Request('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        organizerName: 'Alice',
        title: 'Meeting 1',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      }),
    });

    const response1 = (await POST(request1)) as Response;
    expect(response1.status).toBe(201);

    // Try to create overlapping booking
    const start2 = new Date(startTime.getTime() + 30 * 60 * 1000); // +30 min
    const end2 = new Date(endTime.getTime() + 30 * 60 * 1000);

    const request2 = new Request('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        organizerName: 'Bob',
        title: 'Meeting 2',
        startTime: start2.toISOString(),
        endTime: end2.toISOString(),
      }),
    });

    const response2 = (await POST(request2)) as Response;
    expect(response2.status).toBe(409);

    const error = await response2.json();
    expect(error.code).toBe('BOOKING_CONFLICT');
  });

  it('allows concurrent bookings in different rooms at same time', async () => {
    const rooms = await roomRepo.getAllRooms();
    const room1Id = rooms[0].id;
    const room2Id = rooms[1].id;

    const { startTime, endTime } = futureInterval(25, 26);

    // Create booking in room 1
    const request1 = new Request('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: room1Id,
        organizerName: 'Alice',
        title: 'Meeting 1',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      }),
    });

    const response1 = (await POST(request1)) as Response;
    expect(response1.status).toBe(201);

    // Create booking at same time in room 2
    const request2 = new Request('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: room2Id,
        organizerName: 'Bob',
        title: 'Meeting 2',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      }),
    });

    const response2 = (await POST(request2)) as Response;
    expect(response2.status).toBe(201);

    const booking1 = await response1.json();
    const booking2 = await response2.json();
    expect(booking1.roomId).not.toBe(booking2.roomId);
  });
});

describe('POST /api/bookings/[id]/cancel (Handler)', () => {
  let roomId: string;
  let bookingId: string;

  beforeEach(async () => {
    // Get a room and create a booking for cancellation tests
    const rooms = await roomRepo.getAllRooms();
    roomId = rooms[0].id;

    const booking = await prisma.booking.create({
      data: {
        roomId,
        organizerName: 'Alice',
        title: 'Meeting',
        startTime: hoursFromNow(25),
        endTime: hoursFromNow(26),
        status: 'CONFIRMED',
      },
    });

    bookingId = booking.id;
  });

  it('returns HTTP 200 with complete updated Booking', async () => {
    const request = new Request(`http://localhost:3000/api/bookings/${bookingId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }) as unknown as NextRequest;

    const response = (await CANCEL_POST(request, {
      params: Promise.resolve({ id: bookingId }),
    })) as Response;

    expect(response.status).toBe(200);

    const booking = await response.json();
    expect(booking).toHaveProperty('id');
    expect(booking.id).toBe(bookingId);
    expect(booking.status).toBe('CANCELLED');
    expect(booking).toHaveProperty('createdAt');
    expect(booking).toHaveProperty('updatedAt');

    // Verify timestamps are valid ISO strings
    expect(() => new Date(booking.createdAt)).not.toThrow();
    expect(() => new Date(booking.updatedAt)).not.toThrow();
  });

  it('returns HTTP 404 for unknown booking', async () => {
    const request = new Request('http://localhost:3000/api/bookings/unknown-id/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }) as unknown as NextRequest;

    const response = (await CANCEL_POST(request, {
      params: Promise.resolve({ id: 'unknown-id-xyz' }),
    })) as Response;

    expect(response.status).toBe(404);

    const error = await response.json();
    expect(error.code).toBe('BOOKING_NOT_FOUND');
    expect(error).toHaveProperty('message');
  });

  it('returns HTTP 409 for already cancelled booking', async () => {
    // First cancellation should succeed
    let request = new Request(`http://localhost:3000/api/bookings/${bookingId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }) as unknown as NextRequest;

    let response = (await CANCEL_POST(request, {
      params: Promise.resolve({ id: bookingId }),
    })) as Response;

    expect(response.status).toBe(200);

    // Second cancellation should fail
    request = new Request(`http://localhost:3000/api/bookings/${bookingId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }) as unknown as NextRequest;

    response = (await CANCEL_POST(request, {
      params: Promise.resolve({ id: bookingId }),
    })) as Response;

    expect(response.status).toBe(409);

    const error = await response.json();
    expect(error.code).toBe('BOOKING_ALREADY_CANCELLED');
  });
});
