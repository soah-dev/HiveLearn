export function calculatePoints(
  difficulty: string,
  score: number,
  timeLimitMin: number | null,
  childGrade?: number | null,
  assignmentGrade?: number | null,
  questionsGraded: number = 10
): number {
  const base = difficulty === 'easy' ? 10 : difficulty === 'medium' ? 20 : 30;

  // Score bonus multiplier
  let scoreBonus = 1;
  if (score >= 90) scoreBonus = 1.5;
  else if (score >= 80) scoreBonus = 1.25;
  else if (score >= 70) scoreBonus = 1.1;

  // Grade gap multiplier — rewards working above grade level
  let gradeBonus = 1;
  if (childGrade != null && assignmentGrade != null) {
    const gap = assignmentGrade - childGrade;
    if (gap >= 3) gradeBonus = 1.5;
    else if (gap === 2) gradeBonus = 1.3;
    else if (gap === 1) gradeBonus = 1.15;
  }

  // Question count multiplier — scales linearly based on 10 questions as standard
  const questionMultiplier = questionsGraded / 10;

  let points = Math.round(base * scoreBonus * gradeBonus * questionMultiplier * (score / 100));
  if (timeLimitMin && score > 0) points += 5;
  return points;
}
