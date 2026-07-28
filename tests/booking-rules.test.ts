import {describe, expect, it} from "vitest";
import {
    bookingsOverlap,
    isValidTimeRange,
} from "@/lib/booking/booking-rules";

describe("booking rules", () => {
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

    it("rejects a range whose end is before its start", () => {
        const result = isValidTimeRange({
            startTime: new Date("2026-07-28T11:00:00"),
            endTime: new Date("2026-07-28T10:00:00"),
        });

        expect(result).toBe(false);
    });
});
