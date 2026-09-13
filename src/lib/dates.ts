/**
 * Calendar-day helpers pinned to the app's single timezone. Every "what day
 * is it" decision (streaks, preset schedules, stale-streak display) must go
 * through here so they agree with each other.
 */
export const APP_TIMEZONE = 'America/Chicago';

/** YYYY-MM-DD for the given instant in the app timezone (en-CA formats ISO-style). */
export function toLocalDateStr(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: APP_TIMEZONE });
}

export function getTodayStr(): string {
  return toLocalDateStr(new Date());
}

/** Subtract N days from a YYYY-MM-DD string. Pure calendar math, server-timezone independent. */
export function subtractDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday for a YYYY-MM-DD string. */
export function dayOfWeek(dateStr: string): number {
  return new Date(dateStr + 'T12:00:00Z').getUTCDay();
}
