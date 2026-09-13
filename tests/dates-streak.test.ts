import { describe, it, expect } from 'vitest';
import { subtractDays, dayOfWeek, toLocalDateStr } from '@/lib/dates';
import { isStreakActive } from '@/lib/streak';
import { isPastTimeLimit, TIME_LIMIT_GRACE_MS } from '@/lib/time-limit';

describe('dates', () => {
  it('subtracts calendar days across month and year boundaries', () => {
    expect(subtractDays('2026-03-01', 1)).toBe('2026-02-28');
    expect(subtractDays('2026-01-01', 1)).toBe('2025-12-31');
    expect(subtractDays('2026-09-13', 0)).toBe('2026-09-13');
  });
  it('computes weekday', () => {
    expect(dayOfWeek('2026-09-13')).toBe(0); // Sunday
    expect(dayOfWeek('2026-09-14')).toBe(1);
  });
  it('formats in the app timezone', () => {
    // 04:00Z is still the previous evening in Chicago
    expect(toLocalDateStr(new Date('2026-09-14T04:00:00Z'))).toBe('2026-09-13');
  });
});

describe('isStreakActive', () => {
  const today = '2026-09-13';
  it('stays alive through a 3-day gap (2-day freeze)', () => {
    expect(isStreakActive('2026-09-13', today)).toBe(true);
    expect(isStreakActive('2026-09-12', today)).toBe(true);
    expect(isStreakActive('2026-09-11', today)).toBe(true);
    expect(isStreakActive('2026-09-10', today)).toBe(true);
  });
  it('expires on the fourth day', () => {
    expect(isStreakActive('2026-09-09', today)).toBe(false);
  });
  it('is inactive with no history', () => {
    expect(isStreakActive(null, today)).toBe(false);
    expect(isStreakActive(undefined, today)).toBe(false);
  });
});

describe('isPastTimeLimit', () => {
  const start = new Date('2026-09-13T12:00:00Z');
  it('is never past for untimed work', () => {
    expect(isPastTimeLimit(start, null)).toBe(false);
    expect(isPastTimeLimit(null, 10)).toBe(false);
  });
  it('allows the grace window then expires', () => {
    const limitEnd = start.getTime() + 10 * 60_000;
    expect(isPastTimeLimit(start, 10, new Date(limitEnd + TIME_LIMIT_GRACE_MS - 1000))).toBe(false);
    expect(isPastTimeLimit(start, 10, new Date(limitEnd + TIME_LIMIT_GRACE_MS + 1000))).toBe(true);
  });
});
