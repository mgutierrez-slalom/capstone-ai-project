export type TimeRange = {
    startTime: Date;
    endTime: Date;
};

export const MAX_BOOKING_DURATION_HOURS = 4;

export function isValidTimeRange(range: TimeRange): boolean {
    return range.startTime.getTime() < range.endTime.getTime();
}

export function isWithinMaximumDuration(
    range: TimeRange,
    maximumDurationHours = MAX_BOOKING_DURATION_HOURS,
): boolean {
    if (!isValidTimeRange(range)) {
        return false;
    }

    const durationInMilliseconds =
        range.endTime.getTime() - range.startTime.getTime();

    return durationInMilliseconds <= maximumDurationHours * 60 * 60 * 1000;
}

export function bookingsOverlap(
    candidate: TimeRange,
    existing: TimeRange,
): boolean {
    return (
        candidate.startTime.getTime() < existing.endTime.getTime() &&
        candidate.endTime.getTime() > existing.startTime.getTime()
    );
}
