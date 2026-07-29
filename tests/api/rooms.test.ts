import { describe, it, expect } from 'vitest';
import * as roomRepo from '@/lib/prisma/room-repository';

describe('GET /api/rooms', () => {
  it('returns all seeded rooms sorted by name', async () => {
    const rooms = await roomRepo.getAllRooms();

    expect(Array.isArray(rooms)).toBe(true);
    expect(rooms.length).toBeGreaterThan(0);

    // Check rooms are sorted alphabetically
    const names = rooms.map((r: { name: string }) => r.name);
    expect(names).toEqual([...names].sort());

    // Check seeded rooms exist with correct attributes
    const roomNames = new Set(names);
    expect(roomNames.has('Orion')).toBe(true);
    expect(roomNames.has('Andromeda')).toBe(true);
    expect(roomNames.has('Apollo')).toBe(true);

    // Verify room attributes
    const orion = rooms.find((r: { name: string }) => r.name === 'Orion');
    expect(orion).toBeDefined();
    expect(orion?.capacity).toBe(4);
    expect(orion?.location).toBe('Floor 2');

    const andromeda = rooms.find((r: { name: string }) => r.name === 'Andromeda');
    expect(andromeda).toBeDefined();
    expect(andromeda?.capacity).toBe(8);
    expect(andromeda?.location).toBe('Floor 2');

    const apollo = rooms.find((r: { name: string }) => r.name === 'Apollo');
    expect(apollo).toBeDefined();
    expect(apollo?.capacity).toBe(12);
    expect(apollo?.location).toBe('Floor 3');
  });
});
