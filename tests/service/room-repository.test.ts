import { describe, it, expect } from 'vitest';
import * as roomRepo from '@/lib/prisma/room-repository';

describe('Room Repository Tests', () => {
  it('getAllRooms returns all seeded rooms sorted by name', async () => {
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

  it('getRoomById returns room with correct attributes', async () => {
    const allRooms = await roomRepo.getAllRooms();
    expect(allRooms.length).toBeGreaterThan(0);

    const room = await roomRepo.getRoomById(allRooms[0].id);
    expect(room).toBeDefined();
    expect(room?.id).toBe(allRooms[0].id);
    expect(room?.name).toBeDefined();
    expect(room?.capacity).toBeGreaterThan(0);
    expect(room?.location).toBeDefined();
  });

  it('getRoomById returns null for unknown room', async () => {
    const room = await roomRepo.getRoomById('nonexistent-id-xyz');
    expect(room).toBeNull();
  });
});
