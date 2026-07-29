import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '@/app/api/rooms/route';
import * as roomRepo from '@/lib/prisma/room-repository';

describe('GET /api/rooms (Handler)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('returns HTTP 200 with all rooms sorted alphabetically', async () => {
    const response = (await GET()) as Response;

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');

    const rooms = await response.json();

    expect(Array.isArray(rooms)).toBe(true);
    expect(rooms.length).toBeGreaterThan(0);

    // Verify rooms are sorted alphabetically by name
    const names = rooms.map((r: { name: string }) => r.name);
    expect(names).toEqual([...names].sort());

    // Verify seeded rooms exist with correct attributes
    const orion = rooms.find((r: { name: string }) => r.name === 'Orion');
    expect(orion).toBeDefined();
    expect(orion?.id).toBeDefined();
    expect(orion?.capacity).toBe(4);
    expect(orion?.location).toBe('Floor 2');

    const andromeda = rooms.find((r: { name: string }) => r.name === 'Andromeda');
    expect(andromeda).toBeDefined();
    expect(andromeda?.id).toBeDefined();
    expect(andromeda?.capacity).toBe(8);
    expect(andromeda?.location).toBe('Floor 2');

    const apollo = rooms.find((r: { name: string }) => r.name === 'Apollo');
    expect(apollo).toBeDefined();
    expect(apollo?.id).toBeDefined();
    expect(apollo?.capacity).toBe(12);
    expect(apollo?.location).toBe('Floor 3');
  });

  it('returns room objects with required fields', async () => {
    const response = (await GET()) as Response;
    const rooms = await response.json();

    expect(rooms.length).toBeGreaterThan(0);

    // Verify each room has required fields
    for (const room of rooms) {
      expect(room).toHaveProperty('id');
      expect(room).toHaveProperty('name');
      expect(room).toHaveProperty('capacity');
      expect(room).toHaveProperty('location');
      expect(typeof room.id).toBe('string');
      expect(typeof room.name).toBe('string');
      expect(typeof room.capacity).toBe('number');
      expect(typeof room.location).toBe('string');
    }
  });

  it('returns HTTP 500 when repository throws infrastructure error', async () => {
    // Mock the repository to throw a Prisma/database error
    vi.spyOn(roomRepo, 'getAllRooms').mockRejectedValue(
      new Error('Database connection failed'),
    );

    const response = (await GET()) as Response;

    expect(response.status).toBe(500);
    expect(response.headers.get('content-type')).toContain('application/json');

    const error = await response.json();
    expect(error).toHaveProperty('code');
    expect(error).toHaveProperty('message');
    expect(error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(error.message).toBe('An unexpected error occurred');
  });

  it('does not expose internal error details in 500 response', async () => {
    // Mock a detailed error with sensitive info
    const detailedError = new Error('Connection refused to sqlite:///var/app/db.sqlite');
    vi.spyOn(roomRepo, 'getAllRooms').mockRejectedValue(detailedError);

    const response = (await GET()) as Response;
    const error = await response.json();

    // Verify error message is generic, not the detailed error
    expect(error.message).toBe('An unexpected error occurred');
    expect(error.message).not.toContain('sqlite');
    expect(error.message).not.toContain('Connection');
    expect(error.message).not.toContain('/var/app');
  });

  it('returns error in the established API error schema', async () => {
    vi.spyOn(roomRepo, 'getAllRooms').mockRejectedValue(new Error('DB error'));

    const response = (await GET()) as Response;
    const error = await response.json();

    // Verify response matches ApiError schema
    expect(error).toEqual({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    });

    // Verify only expected fields are present (no stack trace, etc.)
    expect(Object.keys(error).sort()).toEqual(['code', 'message']);
  });
});

