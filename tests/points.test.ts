import { describe, it, expect } from 'vitest';
import { calculatePoints } from '@/lib/points';

describe('calculatePoints', () => {
  it('scales base by difficulty and score', () => {
    expect(calculatePoints('easy', 100, null, null, null, 10)).toBe(15);   // 10 * 1.5
    expect(calculatePoints('medium', 100, null, null, null, 10)).toBe(30); // 20 * 1.5
    expect(calculatePoints('hard', 100, null, null, null, 10)).toBe(45);   // 30 * 1.5
  });

  it('applies score bonus tiers', () => {
    expect(calculatePoints('medium', 95, null, null, null, 10)).toBe(Math.round(20 * 1.5 * 0.95));
    expect(calculatePoints('medium', 85, null, null, null, 10)).toBe(Math.round(20 * 1.25 * 0.85));
    expect(calculatePoints('medium', 75, null, null, null, 10)).toBe(Math.round(20 * 1.1 * 0.75));
    expect(calculatePoints('medium', 50, null, null, null, 10)).toBe(10);
  });

  it('rewards working above grade level', () => {
    const base = calculatePoints('medium', 100, null, 6, 6, 10);
    expect(calculatePoints('medium', 100, null, 6, 7, 10)).toBe(Math.round(base * 1.15));
    expect(calculatePoints('medium', 100, null, 6, 8, 10)).toBe(Math.round(base * 1.3));
    expect(calculatePoints('medium', 100, null, 6, 9, 10)).toBe(Math.round(base * 1.5));
    expect(calculatePoints('medium', 100, null, 8, 6, 10)).toBe(base); // below grade: no penalty, no bonus
  });

  it('scales with question count and adds a flat timed bonus', () => {
    expect(calculatePoints('medium', 100, null, null, null, 5)).toBe(15);
    expect(calculatePoints('medium', 100, 20, null, null, 10)).toBe(35);
    expect(calculatePoints('medium', 0, 20, null, null, 10)).toBe(0); // no timed bonus for a zero score
  });
});
