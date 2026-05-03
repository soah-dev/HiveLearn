export function calculatePoints(difficulty: string, score: number, timeLimitMin: number | null): number {
  const base = difficulty === 'easy' ? 10 : difficulty === 'medium' ? 20 : 30;
  let bonus = 1;
  if (score >= 90) bonus = 1.5;
  else if (score >= 80) bonus = 1.25;
  else if (score >= 70) bonus = 1.1;

  let points = Math.round(base * bonus * (score / 100));
  if (timeLimitMin && score > 0) points += 5;
  return points;
}
