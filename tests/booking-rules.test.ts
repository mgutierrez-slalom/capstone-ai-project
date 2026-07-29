import {describe, expect, it} from "vitest";
import {
    bookingsOverlap,
    isWithinMaximumDuration,
    isValidTimeRange,
} from "@/lib/booking/booking-rules";

describe("booking rules", () => {
    describe("time-range validation", () => {
        it("accepts a range whose end is after its start", () => {
            const result = isValidTimeRange({
                startTime: new Date("2026-07-28T10:00:00"),
                endTime: new Date("2026-07-28T11:00:00"),
            });

            expect(result).toBe(true);
        });

        it("rejects a range whose end equals its start", () => {
            const result = isValidTimeRange({
                startTime: new Date("2026-07-28T10:00:00"),
                endTime: new Date("2026-07-28T10:00:00"),
            });

            expect(result).toBe(false);
        });

        it("rejects a range whose end is before its start", () => {
            const result = isValidTimeRange({
                startTime: new Date("2026-07-28T11:00:00"),
                endTime: new Date("2026-07-28T10:00:00"),
            });

            expect(result).toBe(false);
        });
    });

    describe("maximum duration validation", () => {
        it("accepts a booking with exactly four hours", () => {
            const result = isWithinMaximumDuration({
                startTime: new Date("2026-07-28T09:00:00"),
                endTime: new Date("2026-07-28T13:00:00"),
            });

            expect(result).toBe(true);
        });

        it("rejects a booking with more than four hours", () => {
            const result = isWithinMaximumDuration({
                startTime: new Date("2026-07-28T09:00:00"),
                endTime: new Date("2026-07-28T13:00:01"),
            });

            expect(result).toBe(false);
        });

        it("rejects an invalid time range", () => {
            const result = isWithinMaximumDuration({
                startTime: new Date("2026-07-28T13:00:00"),
                endTime: new Date("2026-07-28T09:00:00"),
            });

            expect(result).toBe(false);
        });

        it("accepts a one-millisecond booking", () => {
            const startTime = new Date("2026-07-28T10:00:00.000");
            const endTime = new Date("2026-07-28T10:00:00.001");

            const result = isWithinMaximumDuration({
                startTime,
                endTime,
            });

            expect(result).toBe(true);
        });

        it("accepts a one-second booking", () => {
            const startTime = new Date("2026-07-28T10:00:00.000");
            const endTime = new Date("2026-07-28T10:00:01.000");

            const result = isWithinMaximumDuration({
                startTime,
                endTime,
            });

            expect(result).toBe(true);
        });

        it("accepts a one-minute booking", () => {
            const startTime = new Date("2026-07-28T10:00:00.000");
            const endTime = new Date("2026-07-28T10:01:00.000");

            const result = isWithinMaximumDuration({
                startTime,
                endTime,
            });

            expect(result).toBe(true);
        });

        it("accepts a booking just under four hours (3h 59m 59s 999ms)", () => {
            const startTime = new Date("2026-07-28T10:00:00.000");
            const endTime = new Date("2026-07-28T13:59:59.999");

            const result = isWithinMaximumDuration({
                startTime,
                endTime,
            });

            expect(result).toBe(true);
        });

        it("rejects a booking just over four hours (4h 0m 0s 1ms)", () => {
            const startTime = new Date("2026-07-28T10:00:00.000");
            const endTime = new Date("2026-07-28T14:00:00.001");

            const result = isWithinMaximumDuration({
                startTime,
                endTime,
            });

            expect(result).toBe(false);
        });
    });

    describe("overlap detection", () => {
        it("detects a partial overlap", () => {
            const result = bookingsOverlap(
                {
                    startTime: new Date("2026-07-28T10:30:00"),
                    endTime: new Date("2026-07-28T11:30:00"),
                },
                {
                    startTime: new Date("2026-07-28T10:00:00"),
                    endTime: new Date("2026-07-28T11:00:00"),
                },
            );

            expect(result).toBe(true);
        });

        it("detects a complete overlap", () => {
            const result = bookingsOverlap(
                {
                    startTime: new Date("2026-07-28T09:00:00"),
                    endTime: new Date("2026-07-28T12:00:00"),
                },
                {
                    startTime: new Date("2026-07-28T10:00:00"),
                    endTime: new Date("2026-07-28T11:00:00"),
                },
            );

            expect(result).toBe(true);
        });

        it("detects a contained booking", () => {
            const result = bookingsOverlap(
                {
                    startTime: new Date("2026-07-28T10:15:00"),
                    endTime: new Date("2026-07-28T10:45:00"),
                },
                {
                    startTime: new Date("2026-07-28T10:00:00"),
                    endTime: new Date("2026-07-28T11:00:00"),
                },
            );

            expect(result).toBe(true);
        });

        it("allows consecutive bookings", () => {
            const result = bookingsOverlap(
                {
                    startTime: new Date("2026-07-28T11:00:00"),
                    endTime: new Date("2026-07-28T12:00:00"),
                },
                {
                    startTime: new Date("2026-07-28T10:00:00"),
                    endTime: new Date("2026-07-28T11:00:00"),
                },
            );

            expect(result).toBe(false);
        });

        it("allows consecutive bookings with millisecond precision at boundary", () => {
            // Existing booking ends at exact millisecond, candidate starts at exact same millisecond
            const existingEnd = new Date("2026-07-28T10:00:00.500");
            const candidateStart = new Date(existingEnd.getTime()); // exact same timestamp

            const result = bookingsOverlap(
                {
                    startTime: candidateStart,
                    endTime: new Date(candidateStart.getTime() + 3600000), // 1 hour later
                },
                {
                    startTime: new Date("2026-07-28T09:00:00.000"),
                    endTime: existingEnd,
                },
            );

            // Should not overlap because candidate.start (10:00:00.500) is NOT < existing.end (10:00:00.500)
            expect(result).toBe(false);
        });

        it("detects overlap by one millisecond", () => {
            // Existing: 10:00:00.000 to 11:00:00.000
            // Candidate: 10:59:59.999 to 11:00:00.001 (overlaps by 1ms from 11:00:00.000 to 11:00:00.001)
            const result = bookingsOverlap(
                {
                    startTime: new Date("2026-07-28T10:59:59.999"),
                    endTime: new Date("2026-07-28T11:00:00.001"),
                },
                {
                    startTime: new Date("2026-07-28T10:00:00.000"),
                    endTime: new Date("2026-07-28T11:00:00.000"),
                },
            );

            expect(result).toBe(true);
        });
    });
});
