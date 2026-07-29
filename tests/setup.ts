import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { beforeAll, afterEach, afterAll } from 'vitest';

// ============================================================================
// PHASE 1: Safety guard — verify the Prisma client is pointed at test.db
//
// DATABASE_URL is injected by vitest.config.ts `test.env` before any worker
// module is evaluated, so the Prisma client's static import (which is hoisted
// by ESM semantics) already sees the correct URL.
//
// This guard makes the safety invariant explicit: if the wrong URL somehow
// reaches this point the test run aborts before touching any data.
// ============================================================================

const expectedTestDbPath = path.resolve(process.cwd(), 'prisma', 'test.db');

function resolveDbPath(url: string): string {
  if (!url.startsWith('file:')) return url;
  const raw = url.slice('file:'.length);
  // Absolute paths start with / (POSIX) or a drive letter followed by : (Win)
  return path.isAbsolute(raw) ? path.normalize(raw) : path.resolve(process.cwd(), raw);
}

const configuredUrl = process.env.DATABASE_URL ?? '';
const resolvedConfiguredPath = resolveDbPath(configuredUrl);

if (path.normalize(resolvedConfiguredPath) !== path.normalize(expectedTestDbPath)) {
  throw new Error(
    `[TEST SAFETY] DATABASE_URL resolves to "${resolvedConfiguredPath}" ` +
      `but the test suite requires "${expectedTestDbPath}". ` +
      `Refusing to run to protect the development database.`,
  );
}

// Safe to import Prisma — the env var is already set correctly.
import { prisma } from '@/lib/prisma/client';

// ============================================================================
// PHASE 2: Test database lifecycle
// ============================================================================

const testDbPath = expectedTestDbPath;

/**
 * Initialize test database: apply migrations if the file does not yet exist,
 * then seed with fixture rooms.
 *
 * The test.db file is NOT deleted on every run; only booking rows are cleared
 * between test suites (rooms are preserved as stable fixtures).
 */
async function initializeTestDatabase() {
  const dbDir = path.dirname(testDbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  if (!fs.existsSync(testDbPath)) {
    try {
      execSync('npx prisma migrate deploy', {
        cwd: process.cwd(),
        env: { ...process.env },
        stdio: 'pipe',
      });
    } catch (error) {
      console.error('Failed to apply migrations to test database:', error);
      throw error;
    }
  }

  await seedTestData();
}

/**
 * Seed fixture rooms if none exist yet.
 */
async function seedTestData() {
  const existingRooms = await prisma.room.findMany();
  if (existingRooms.length > 0) {
    return;
  }

  await prisma.room.createMany({
    data: [
      { name: 'Orion', capacity: 4, location: 'Floor 2' },
      { name: 'Andromeda', capacity: 8, location: 'Floor 2' },
      { name: 'Apollo', capacity: 12, location: 'Floor 3' },
    ],
  });
}

/**
 * Clear mutable test data between test suites (preserves rooms).
 */
async function clearMutableData() {
  await prisma.booking.deleteMany({});
}

// ============================================================================
// PHASE 3: Vitest hooks
// ============================================================================

beforeAll(async () => {
  await initializeTestDatabase();
});

afterEach(async () => {
  await clearMutableData();
});

afterAll(async () => {
  await prisma.$disconnect();
});
