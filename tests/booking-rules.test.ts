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
    });
});
