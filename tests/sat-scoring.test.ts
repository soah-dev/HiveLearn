import { describe, it, expect } from 'vitest';
import { isStudentProducedCorrect, getModule2Difficulty, getScaledScore, getCompositeScore, calculateSATPoints } from '@/lib/sat-scoring';

describe('isStudentProducedCorrect', () => {
  it('accepts numerically equivalent answers', () => {
    expect(isStudentProducedCorrect('3/4', '0.75')).toBe(true);
    expect(isStudentProducedCorrect(' 42 ', '42')).toBe(true);
    expect(isStudentProducedCorrect('7/2', '3.5')).toBe(true);
  });
  it('rejects wrong or empty answers', () => {
    expect(isStudentProducedCorrect('', '5')).toBe(false);
    expect(isStudentProducedCorrect('4', '5')).toBe(false);
    expect(isStudentProducedCorrect('1/0', '5')).toBe(false);
  });
  it('falls back to case-insensitive text match', () => {
    expect(isStudentProducedCorrect('Pi', 'pi')).toBe(true);
  });
});

describe('adaptive routing and scaling', () => {
  it('routes to hard at 70%+', () => {
    expect(getModule2Difficulty(19, 27)).toBe('hard');
    expect(getModule2Difficulty(18, 27)).toBe('easy');
  });
  it('maps 0% to 200 and 100% to 800', () => {
    expect(getScaledScore(0, 0, 'easy', 27, 27)).toBe(200);
    expect(getScaledScore(27, 27, 'hard', 27, 27)).toBe(800);
  });
  it('gives the harder module 2 more weight', () => {
    const hard = getScaledScore(20, 20, 'hard', 27, 27);
    const easy = getScaledScore(20, 20, 'easy', 27, 27);
    expect(hard).toBeGreaterThanOrEqual(easy);
  });
  it('composite and points', () => {
    expect(getCompositeScore(650, 700)).toBe(1350);
    expect(calculateSATPoints(1400)).toBe(150);
    expect(calculateSATPoints(1200)).toBe(120);
    expect(calculateSATPoints(1000)).toBe(90);
    expect(calculateSATPoints(800)).toBe(70);
    expect(calculateSATPoints(600)).toBe(50);
  });
});
