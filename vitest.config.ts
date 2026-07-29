import path from "node:path";
import {fileURLToPath} from "node:url";
import {defineConfig} from "vitest/config";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

// Resolve the test database path once here so it is available before any
// module (including the Prisma client) is evaluated inside test workers.
const testDbPath = path.resolve(currentDirectory, "prisma", "test.db");

export default defineConfig({
    resolve: {
        alias: {
            "@": path.resolve(currentDirectory, "./src"),
        },
    },
    test: {
        environment: "node",
        include: ["tests/**/*.test.ts"],
        setupFiles: ["./tests/setup.ts"],
        // Inject DATABASE_URL before any worker module is imported.
        // This guarantees the Prisma client picks up test.db even though
        // ESM static imports are hoisted to the top of each module.
        env: {
            DATABASE_URL: `file:${testDbPath}`,
        },
        // Serialize test files so concurrent SQLite writes do not race.
        fileParallelism: false,
        testTimeout: 30000,
        hookTimeout: 30000,
    },
});