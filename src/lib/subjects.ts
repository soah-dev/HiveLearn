export const SUBJECTS = [
  { value: 'math', label: 'Math' },
  { value: 'reading', label: 'Reading' },
  { value: 'science', label: 'Science' },
  { value: 'history', label: 'History' },
  { value: 'english', label: 'English' },
  { value: 'geography', label: 'Geography' },
  { value: 'art', label: 'Art' },
  { value: 'music', label: 'Music' },
  { value: 'computer_science', label: 'Computer Science' },
  { value: 'foreign_languages', label: 'Foreign Languages' },
] as const;

const labels: Record<string, string> = Object.fromEntries(SUBJECTS.map(s => [s.value, s.label]));

/** Display name for a subject key; unknown keys are title-cased. */
export function subjectLabel(subject: string): string {
  return labels[subject] ?? subject.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export const DIFFICULTIES = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
] as const;
