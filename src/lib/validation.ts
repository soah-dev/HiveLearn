/** Small, dependency-free input validators for API route bodies. */

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export const REVIEW_MODES = ['ai', 'parent'] as const;
export const QUESTION_TYPES = ['multiple_choice', 'true_false', 'fill_in_blank', 'open_ended'] as const;

export function asInt(value: unknown): number | null {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof n === 'number' && Number.isInteger(n) ? n : null;
}

export function intInRange(value: unknown, min: number, max: number): number | null {
  const n = asInt(value);
  return n !== null && n >= min && n <= max ? n : null;
}

export function isOneOf<T extends readonly string[]>(value: unknown, allowed: T): value is T[number] {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

export function isEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** "1,2,3" style list of weekday numbers 0-6 */
export function isDaysOfWeek(value: unknown): value is string {
  return typeof value === 'string' && /^[0-6](,[0-6])*$/.test(value);
}

/**
 * Validate assignment-preset fields. With `partial` true (PATCH) only the
 * provided fields are checked. Returns an error message or null.
 */
export function presetValidationError(body: Record<string, unknown>, partial: boolean): string | null {
  const has = (k: string) => body[k] !== undefined;

  if ((!partial || has('grade')) && intInRange(body.grade, 1, 12) === null) return 'grade must be an integer from 1 to 12';
  if ((!partial || has('subject')) && (typeof body.subject !== 'string' || !body.subject.trim())) return 'subject is required';
  if (has('difficulty') && !isOneOf(body.difficulty, DIFFICULTIES)) return 'difficulty must be easy, medium or hard';
  if (has('numQuestions') && intInRange(body.numQuestions, 1, 20) === null) return 'numQuestions must be between 1 and 20';
  if (has('reviewMode') && !isOneOf(body.reviewMode, REVIEW_MODES)) return 'reviewMode must be ai or parent';
  if (has('daysOfWeek') && !isDaysOfWeek(body.daysOfWeek)) return 'daysOfWeek must be a comma-separated list of 0-6';
  if (has('timeLimitMin') && body.timeLimitMin !== null && intInRange(body.timeLimitMin, 1, 180) === null) return 'timeLimitMin must be between 1 and 180';
  if (has('questionTypes')) {
    const types = Array.isArray(body.questionTypes)
      ? body.questionTypes
      : typeof body.questionTypes === 'string' ? body.questionTypes.split(',') : null;
    if (!types || types.length === 0 || !types.every(t => isOneOf(t, QUESTION_TYPES))) return 'questionTypes contains an unknown type';
  }
  return null;
}
