import { prisma } from '@/lib/prisma/client';
import { beforeAll } from 'vitest';

beforeAll(async () => {
  // Clear all bookings before running tests to ensure clean state
  await prisma.booking.deleteMany({});
});
