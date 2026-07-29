/**
 * Clock-relative test helpers that generate future/past timestamps.
 *
 * Tests that create real bookings must stay valid regardless of execution date.
 * Use these helpers instead of hard-coded calendar dates.
 */

const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * Returns a Date that is `hours` hours from now, truncated to whole seconds.
 * Minimum 24 hours ensures no CI machine is too slow to fall inside the window.
 */
export function hoursFromNow(hours: number): Date {
  const d = new Date(Date.now() + hours * ONE_HOUR_MS);
  d.setMilliseconds(0); // whole-second precision avoids serialisation drift
  return d;
}

/**
 * Returns a Date that is `hours` hours in the past, truncated to whole seconds.
 */
export function hoursAgo(hours: number): Date {
  const d = new Date(Date.now() - hours * ONE_HOUR_MS);
  d.setMilliseconds(0);
  return d;
}

/**
 * Returns an interval [startTime, endTime] where startTime is `startHours`
 * hours from now and endTime is `endHours` hours from now.
 *
 * Both values share the same `Date.now()` snapshot so concurrent-test helpers
 * always produce the same interval.
 */
export function futureInterval(startHours: number, endHours: number): { startTime: Date; endTime: Date } {
  const base = Date.now();
  const startTime = new Date(base + startHours * ONE_HOUR_MS);
  startTime.setMilliseconds(0);
  const endTime = new Date(base + endHours * ONE_HOUR_MS);
  endTime.setMilliseconds(0);
  return { startTime, endTime };
}
