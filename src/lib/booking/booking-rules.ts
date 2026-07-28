export type TimeRange = {
    startTime: Date;
    endTime: Date;
};

export function isValidTimeRange(range: TimeRange): boolean {
    return range.startTime.getTime() < range.endTime.getTime();
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
