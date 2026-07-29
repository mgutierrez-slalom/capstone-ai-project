import { describe, it, expect } from 'vitest';
import { GET } from '@/app/api/rooms/route';

describe('GET /api/rooms (Handler)', () => {
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
});
