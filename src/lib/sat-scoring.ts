/**
 * SAT scoring utilities: adaptive routing, scaled score calculation, points.
 */

/** Check if a student-produced (grid-in) answer is correct via numeric equivalence. */
export function isStudentProducedCorrect(studentAnswer: string, correctAnswer: string): boolean {
  if (!studentAnswer || !correctAnswer) return false;

  const normalize = (s: string): number | null => {
    const trimmed = s.trim();
    // Handle fractions like "3/4"
    if (trimmed.includes('/')) {
      const [num, den] = trimmed.split('/').map(Number);
      if (den && !isNaN(num) && !isNaN(den)) return num / den;
      return null;
    }
    const n = Number(trimmed);
    return isNaN(n) ? null : n;
  };

  const student = normalize(studentAnswer);
  const correct = normalize(correctAnswer);

  if (student === null || correct === null) {
    return studentAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
  }

  return Math.abs(student - correct) < 0.001;
}

/** Determine Module 2 difficulty based on Module 1 performance. */
export function getModule2Difficulty(mod1Raw: number, mod1Total: number): 'easy' | 'hard' {
  return mod1Raw / mod1Total >= 0.7 ? 'hard' : 'easy';
}

/**
 * Calculate SAT scaled score (200-800) for one section.
 * Uses piecewise linear interpolation with adaptive weighting.
 * mod1Total/mod2Total are the actual question counts (may differ from
 * the standard 27/22 if generation had a shortfall).
 */
export function getScaledScore(
  mod1Raw: number,
  mod2Raw: number,
  mod2Difficulty: string,
  mod1Total: number,
  mod2Total: number,
): number {

  // Apply adaptive weighting to Module 2
  const mod2Weight = mod2Difficulty === 'hard' ? 1.15 : 0.85;

  // Combined weighted percentage
  const weightedCorrect = mod1Raw + mod2Raw * mod2Weight;
  const weightedTotal = mod1Total + mod2Total * mod2Weight;
  const pct = weightedCorrect / weightedTotal;

  // Piecewise linear mapping to 200-800
  // 0% -> 200, 25% -> 350, 50% -> 500, 75% -> 650, 100% -> 800
  const breakpoints = [
    { pct: 0, score: 200 },
    { pct: 0.25, score: 350 },
    { pct: 0.5, score: 500 },
    { pct: 0.75, score: 650 },
    { pct: 1.0, score: 800 },
  ];

  for (let i = 1; i < breakpoints.length; i++) {
    if (pct <= breakpoints[i].pct) {
      const prev = breakpoints[i - 1];
      const curr = breakpoints[i];
      const t = (pct - prev.pct) / (curr.pct - prev.pct);
      return Math.round(prev.score + t * (curr.score - prev.score));
    }
  }

  return 800;
}

/** Sum of R&W and Math scaled scores. */
export function getCompositeScore(rwScaled: number, mathScaled: number): number {
  return rwScaled + mathScaled;
}

/** Calculate gamification points from SAT composite score. */
export function calculateSATPoints(compositeScore: number): number {
  let points = 50; // base
  if (compositeScore >= 1400) points += 100;
  else if (compositeScore >= 1200) points += 70;
  else if (compositeScore >= 1000) points += 40;
  else if (compositeScore >= 800) points += 20;
  return points;
}
