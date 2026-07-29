import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { beforeAll, afterEach, afterAll } from 'vitest';

// ============================================================================
// PHASE 1: Set test environment BEFORE importing Prisma client
// ============================================================================

// Set DATABASE_URL to test database (must be before importing Prisma)
const testDbPath = path.resolve(process.cwd(), 'prisma', 'test.db');
process.env.DATABASE_URL = `file:${testDbPath}`;

// Now we can safely import Prisma (it will use the test database URL)
import { prisma } from '@/lib/prisma/client';

// ============================================================================
// PHASE 2: Test database lifecycle
// ============================================================================

/**
 * Initialize test database: create, migrate, seed
 */
async function initializeTestDatabase() {
  // Ensure test database directory exists
  const dbDir = path.dirname(testDbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Check if test database exists - if not, we'll create it
  const dbExists = fs.existsSync(testDbPath);

  if (!dbExists) {
    // Database doesn't exist, migrations will create it
    try {
      execSync('npx prisma migrate deploy', {
        cwd: process.cwd(),
        env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
        stdio: 'pipe',
      });
    } catch (error) {
      console.error('Failed to apply migrations to test database:', error);
      throw error;
    }
  }

  // Seed test data (will skip if rooms already exist)
  await seedTestData();
}

/**
 * Seed test database with minimal required test data
 */
async function seedTestData() {
  // Check if rooms already exist, if so, skip seeding
  const existingRooms = await prisma.room.findMany();
  if (existingRooms.length > 0) {
    return; // Rooms already exist, skip seeding
  }

  // Create test rooms (same as dev seed)
  await prisma.room.create({
    data: {
      name: 'Orion',
      capacity: 4,
      location: 'Floor 2',
    },
  });

  await prisma.room.create({
    data: {
      name: 'Andromeda',
      capacity: 8,
      location: 'Floor 2',
    },
  });

  await prisma.room.create({
    data: {
      name: 'Apollo',
      capacity: 12,
      location: 'Floor 3',
    },
  });
}

/**
 * Clear mutable test data between test suites
 * (preserves room schema but clears all bookings)
 */
async function clearMutableData() {
  await prisma.booking.deleteMany({});
}

// ============================================================================
// PHASE 3: Vitest hooks
// ============================================================================

/**
 * Before all tests: initialize test database once
 */
beforeAll(async () => {
  await initializeTestDatabase();
});

/**
 * After each test suite: clear bookings to ensure isolation
 * (rooms remain as test fixtures)
 */
afterEach(async () => {
  await clearMutableData();
});

/**
 * After all tests: close Prisma connection gracefully
 */
afterAll(async () => {
  await prisma.$disconnect();
});
