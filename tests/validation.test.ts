import { describe, it, expect } from 'vitest';
import { intInRange, isEmail, isDaysOfWeek, presetValidationError } from '@/lib/validation';
import { validateGeneratedQuestions } from '@/lib/question-generation';

describe('validators', () => {
  it('intInRange coerces numeric strings and rejects out-of-range', () => {
    expect(intInRange('7', 1, 12)).toBe(7);
    expect(intInRange(7.5, 1, 12)).toBeNull();
    expect(intInRange(13, 1, 12)).toBeNull();
    expect(intInRange('', 1, 12)).toBeNull();
    expect(intInRange(undefined, 1, 12)).toBeNull();
  });
  it('isEmail / isDaysOfWeek', () => {
    expect(isEmail('kid@example.com')).toBe(true);
    expect(isEmail('not-an-email')).toBe(false);
    expect(isDaysOfWeek('1,2,3,4,5')).toBe(true);
    expect(isDaysOfWeek('1,7')).toBe(false);
  });
  it('presetValidationError full vs partial', () => {
    expect(presetValidationError({ grade: 6, subject: 'math' }, false)).toBeNull();
    expect(presetValidationError({ subject: 'math' }, false)).toMatch(/grade/);
    expect(presetValidationError({ numQuestions: 50 }, true)).toMatch(/numQuestions/);
    expect(presetValidationError({ active: false }, true)).toBeNull();
    expect(presetValidationError({ questionTypes: ['multiple_choice', 'essay'] }, true)).toMatch(/questionTypes/);
  });
});

describe('validateGeneratedQuestions', () => {
  const mc = { question_type: 'multiple_choice', question_text: 'Q?', option_a: 'a', option_b: 'b', option_c: 'c', option_d: 'd', correct_answer: 'b' };
  it('normalizes multiple choice letters and rejects missing options', () => {
    const { valid, invalid } = validateGeneratedQuestions([mc, { ...mc, option_d: null }, { ...mc, correct_answer: 'E' }], ['multiple_choice']);
    expect(valid).toHaveLength(1);
    expect(valid[0].correct_answer).toBe('B');
    expect(invalid).toBe(2);
  });
  it('normalizes true/false and drops disallowed types', () => {
    const { valid, invalid } = validateGeneratedQuestions([
      { question_type: 'true_false', question_text: 'Q?', correct_answer: 'true' },
      { question_type: 'open_ended', question_text: 'Q?', correct_answer: 'rubric' },
    ], ['true_false']);
    expect(valid).toHaveLength(1);
    expect(valid[0].correct_answer).toBe('True');
    expect(invalid).toBe(1);
  });
  it('tolerates non-array input', () => {
    expect(validateGeneratedQuestions({ nope: true }, ['multiple_choice'])).toEqual({ valid: [], invalid: 0 });
  });
});
