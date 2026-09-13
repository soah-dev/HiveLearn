import prisma from './prisma';
import { generateWithUsage, AiUsageMetadata } from './gemini';
import { QUESTION_TYPES } from './validation';

/**
 * Shared Gemini question generation used by the parent "create assignment"
 * flow and by scheduled presets. Owns the prompt, response validation, the
 * retry-for-shortfall loop, and usage aggregation so the two callers can't drift.
 */

export interface GeneratedQuestion {
  question_type: string;
  question_text: string;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  correct_answer: string;
}

export interface GenerationParams {
  grade: number;
  subject: string;
  topic?: string | null;
  difficulty: string;
  numQuestions: number;
  questionTypes: string[];
  /** Question texts the student has seen recently; the model is told not to repeat them. */
  avoidQuestions?: string[];
}

export class AiResponseFormatError extends Error {}

export function validateGeneratedQuestions(
  questions: unknown,
  allowedTypes: string[],
): { valid: GeneratedQuestion[]; invalid: number } {
  const valid: GeneratedQuestion[] = [];
  let invalid = 0;
  if (!Array.isArray(questions)) return { valid, invalid: 0 };

  for (const raw of questions) {
    const q = raw as Partial<GeneratedQuestion> | null;
    if (!q || typeof q !== 'object' || typeof q.question_text !== 'string' || !q.question_text.trim()) { invalid++; continue; }
    if (!allowedTypes.includes(q.question_type as string)) { invalid++; continue; }

    const base: GeneratedQuestion = {
      question_type: q.question_type as string,
      question_text: q.question_text,
      option_a: q.option_a ?? null,
      option_b: q.option_b ?? null,
      option_c: q.option_c ?? null,
      option_d: q.option_d ?? null,
      correct_answer: typeof q.correct_answer === 'string' ? q.correct_answer : '',
    };

    if (base.question_type === 'multiple_choice') {
      const answer = base.correct_answer.toUpperCase().trim();
      const options: Record<string, string | null> = { A: base.option_a, B: base.option_b, C: base.option_c, D: base.option_d };
      // correct_answer must be A/B/C/D, that option must exist, and all four options must be present
      if (!['A', 'B', 'C', 'D'].includes(answer) || !options[answer] || !base.option_a || !base.option_b || !base.option_c || !base.option_d) {
        invalid++; continue;
      }
      valid.push({ ...base, correct_answer: answer });
    } else if (base.question_type === 'true_false') {
      const answer = base.correct_answer.trim().toLowerCase();
      if (answer !== 'true' && answer !== 'false') { invalid++; continue; }
      valid.push({ ...base, correct_answer: answer === 'true' ? 'True' : 'False' });
    } else {
      // fill_in_blank and open_ended: just need a non-empty correct_answer / rubric
      if (!base.correct_answer.trim()) { invalid++; continue; }
      valid.push(base);
    }
  }

  return { valid, invalid };
}

function topicClause(topic?: string | null): string {
  return topic?.trim() ? `on the topic "${topic.trim()}"` : 'covering a variety of appropriate topics';
}

export function buildGenerationPrompt(p: GenerationParams): string {
  const allowedTypes = p.questionTypes.join(', ');
  const avoidClause = p.avoidQuestions && p.avoidQuestions.length > 0
    ? `\n\nThe student has recently been asked the following questions. Do NOT repeat or closely paraphrase any of them — generate fresh, distinct questions with different scenarios, numbers, and phrasing:\n${p.avoidQuestions.map(q => `- ${q}`).join('\n')}`
    : '';

  return `Generate ${p.numQuestions} questions for a grade ${p.grade} student ${topicClause(p.topic)} in ${p.subject} at ${p.difficulty} difficulty. ONLY use these question types: ${allowedTypes}. Do NOT generate any other question types.

For each question, return a JSON object with:
- question_type: MUST be one of: ${p.questionTypes.map(t => `"${t}"`).join(' | ')}
- question_text: the question
- option_a, option_b, option_c, option_d: options (null for non-MC types)
- correct_answer: For multiple_choice this MUST be exactly one of "A", "B", "C", or "D" matching which option contains the correct answer. For true_false use "True" or "False". For fill_in_blank use the exact answer text. For open_ended use a grading rubric.

CRITICAL RULES:
- EVERY question MUST have question_type set to one of: ${allowedTypes}. No other types are allowed.
- For multiple_choice: The correct_answer MUST be the letter (A/B/C/D) of the option that is correct. Double-check that the option text for that letter actually contains the right answer.
- All four options (option_a through option_d) must be non-null and non-empty for multiple_choice questions.
- Do NOT put the answer text in correct_answer for multiple_choice — only the letter.
- For reading/language arts: If you include a passage, you MUST also include an explicit question after the passage in question_text (e.g. "Read the passage below:\\n\\n[passage]\\n\\nWhat is the main idea of this passage?"). Never leave the question implied — always state what the student is being asked.
- For any math expressions, wrap them in dollar signs for LaTeX rendering: e.g. $\\frac{1}{2}$, $3 \\times 10^2$, $x^2 + y^2 = z^2$. Use $...$ for inline math in question_text, options, and correct_answer.

Return ONLY a JSON array. Ensure questions are age-appropriate, educational, and progressively challenging within the difficulty level. Distribute question types as evenly as possible among: ${allowedTypes}.${avoidClause}`;
}

function buildRetryPrompt(p: GenerationParams, remaining: number): string {
  const avoidClause = p.avoidQuestions && p.avoidQuestions.length > 0
    ? `\n\nDo NOT repeat any of these recently asked questions:\n${p.avoidQuestions.map(q => `- ${q}`).join('\n')}`
    : '';
  return `Generate ${remaining} MORE ${p.subject} questions for grade ${p.grade} ${topicClause(p.topic)} at ${p.difficulty} difficulty. Types: ${p.questionTypes.join(', ')}.\n\nSame format as before. CRITICAL: For multiple_choice, correct_answer MUST be "A", "B", "C", or "D" and that option must contain the correct answer. Return ONLY a JSON array.${avoidClause}`;
}

/** Recent question texts for this child in the same subject and grade, bounded to keep prompt size small. */
export async function recentQuestionTexts(childId: string, subject: string, grade: number): Promise<string[]> {
  const recentAssignments = await prisma.assignment.findMany({
    where: { childId, subject, grade },
    orderBy: { createdAt: 'desc' },
    take: 8,
    select: { questions: { select: { questionText: true } } },
  });
  return recentAssignments
    .flatMap(a => a.questions.map(q => q.questionText.trim()))
    .filter(Boolean)
    .slice(0, 40);
}

function sumUsage(records: AiUsageMetadata[]): AiUsageMetadata {
  return records.reduce(
    (acc, u) => ({
      model: u.model,
      promptTokens: acc.promptTokens + u.promptTokens,
      completionTokens: acc.completionTokens + u.completionTokens,
      totalTokens: acc.totalTokens + u.totalTokens,
    }),
    { model: 'unknown', promptTokens: 0, completionTokens: 0, totalTokens: 0 },
  );
}

/**
 * Generate up to `numQuestions` validated questions, retrying once for any
 * shortfall. Throws AiResponseFormatError when the model returns no usable JSON.
 * Usage is returned (not logged) so callers can attribute it.
 */
export async function generateQuestions(
  params: GenerationParams,
  options: { maxAttempts?: number; generationConfig?: { temperature?: number; topP?: number } } = {},
): Promise<{ questions: GeneratedQuestion[]; usage: AiUsageMetadata }> {
  const maxAttempts = options.maxAttempts ?? 2;
  const types = params.questionTypes.filter(t => (QUESTION_TYPES as readonly string[]).includes(t));
  if (types.length === 0) throw new Error('No valid question types requested');
  const p = { ...params, questionTypes: types };

  const collected: GeneratedQuestion[] = [];
  const usageRecords: AiUsageMetadata[] = [];
  let attempts = 0;

  while (collected.length < p.numQuestions && attempts < maxAttempts) {
    attempts++;
    const remaining = p.numQuestions - collected.length;
    const prompt = attempts === 1 ? buildGenerationPrompt(p) : buildRetryPrompt(p, remaining);

    const result = await generateWithUsage(prompt, options.generationConfig);
    usageRecords.push(result.usage);

    const rawText = result.text;
    if (!rawText.trim()) {
      throw new AiResponseFormatError('AI returned an empty response. The content may have been filtered.');
    }
    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('No JSON array found in AI response:', rawText.substring(0, 500));
      throw new AiResponseFormatError('AI response did not contain a valid question array');
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      console.error('JSON parse failed. Raw:', jsonMatch[0].substring(0, 500));
      throw new AiResponseFormatError('AI returned malformed JSON');
    }

    const { valid, invalid } = validateGeneratedQuestions(parsed, types);
    if (invalid > 0) console.warn(`AI generation: ${invalid} invalid questions discarded (attempt ${attempts})`);
    collected.push(...valid);
  }

  return { questions: collected.slice(0, p.numQuestions), usage: sumUsage(usageRecords) };
}
