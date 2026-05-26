import { generateWithUsage, AiUsageMetadata } from '@/lib/gemini';
import prisma from '@/lib/prisma';

interface SATGeneratedQuestion {
  question_type: 'multiple_choice' | 'student_produced';
  passage?: string | null;
  question_text: string;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  correct_answer: string;
  domain: string;
}

function validateSATQuestions(questions: SATGeneratedQuestion[], section: 'rw' | 'math'): SATGeneratedQuestion[] {
  const valid: SATGeneratedQuestion[] = [];

  const rwDomains = ['craft_structure', 'information_ideas', 'conventions', 'expression_of_ideas'];
  const mathDomains = ['algebra', 'advanced_math', 'problem_solving', 'geometry_trig'];
  const allowedDomains = section === 'rw' ? rwDomains : mathDomains;

  for (const q of questions) {
    if (!q.question_text || !q.correct_answer) continue;

    // Normalize domain
    if (!allowedDomains.includes(q.domain)) {
      q.domain = allowedDomains[Math.floor(Math.random() * allowedDomains.length)];
    }

    if (q.question_type === 'multiple_choice') {
      const answer = q.correct_answer?.toUpperCase().trim();
      if (!['A', 'B', 'C', 'D'].includes(answer)) continue;
      if (!q.option_a || !q.option_b || !q.option_c || !q.option_d) continue;
      valid.push({ ...q, correct_answer: answer });
    } else if (q.question_type === 'student_produced') {
      if (!q.correct_answer.trim()) continue;
      valid.push(q);
    } else {
      // Default to multiple_choice for R&W, try to keep for math
      if (section === 'rw' && q.option_a && q.option_b && q.option_c && q.option_d) {
        valid.push({ ...q, question_type: 'multiple_choice' });
      }
    }
  }

  return valid;
}

function buildRWPrompt(numQuestions: number, difficulty: string): string {
  const difficultyDesc = difficulty === 'hard'
    ? 'college-level complexity, nuanced vocabulary, complex sentence structures'
    : difficulty === 'easy'
    ? 'straightforward passages, basic vocabulary, clear structure'
    : 'moderate complexity typical of Digital SAT';

  return `Generate ${numQuestions} Digital SAT Reading & Writing section questions.

Difficulty: ${difficultyDesc}

Each question MUST include a short passage (50-150 words) followed by a question about it.
All questions are multiple choice with exactly 4 options (A, B, C, D).

Distribute domains evenly across: craft_structure, information_ideas, conventions, expression_of_ideas

For each question return a JSON object:
- question_type: "multiple_choice"
- passage: a short passage (50-150 words) - literary, informational, or argumentative
- question_text: the question about the passage
- option_a, option_b, option_c, option_d: four answer choices
- correct_answer: MUST be exactly "A", "B", "C", or "D"
- domain: one of "craft_structure", "information_ideas", "conventions", "expression_of_ideas"

CRITICAL:
- correct_answer MUST be the letter (A/B/C/D) of the correct option
- Every question MUST have a passage
- Passages should be diverse: science, history, literature, social studies
- Questions should test reading comprehension, grammar, vocabulary in context, and rhetorical analysis

Return ONLY a JSON array.`;
}

function buildMathPrompt(numQuestions: number, difficulty: string): string {
  const mcCount = Math.round(numQuestions * 0.75);
  const spCount = numQuestions - mcCount;

  const difficultyDesc = difficulty === 'hard'
    ? 'advanced problems requiring multi-step reasoning, complex algebra, and advanced concepts'
    : difficulty === 'easy'
    ? 'basic arithmetic, simple algebra, and foundational geometry'
    : 'moderate difficulty typical of Digital SAT Math';

  return `Generate ${numQuestions} Digital SAT Math section questions: ${mcCount} multiple choice and ${spCount} student-produced response (grid-in).

Difficulty: ${difficultyDesc}

Distribute domains evenly across: algebra, advanced_math, problem_solving, geometry_trig

Use $...$ for inline LaTeX math notation (e.g., $x^2 + 3x - 4 = 0$).

For each question return a JSON object:
- question_type: "multiple_choice" or "student_produced"
- passage: null (no passages for math)
- question_text: the math question (use $...$ for math notation)
- For multiple_choice: option_a, option_b, option_c, option_d with answer choices. correct_answer MUST be "A", "B", "C", or "D".
- For student_produced: option_a through option_d should be null. correct_answer is the numeric answer as a string (e.g., "42", "3.5", "7/2").
- domain: one of "algebra", "advanced_math", "problem_solving", "geometry_trig"

CRITICAL:
- For multiple_choice, correct_answer MUST be the letter (A/B/C/D)
- For student_produced, correct_answer MUST be a numeric value (integer, decimal, or fraction)
- Use $...$ LaTeX delimiters for all math expressions in questions and options

Return ONLY a JSON array.`;
}

/** Generate SAT questions for a module, with batch splitting and retry. */
export async function generateSATQuestions(
  section: 'rw' | 'math',
  numQuestions: number,
  difficulty: string,
  userId: string,
): Promise<SATGeneratedQuestion[]> {
  const batches: number[] = [];
  let remaining = numQuestions;
  while (remaining > 0) {
    const batchSize = Math.min(remaining, 14);
    batches.push(batchSize);
    remaining -= batchSize;
  }

  let allValid: SATGeneratedQuestion[] = [];
  const usageRecords: AiUsageMetadata[] = [];

  for (const batchSize of batches) {
    const needed = Math.min(batchSize, numQuestions - allValid.length);
    if (needed <= 0) break;

    let attempts = 0;
    let batchCollected: SATGeneratedQuestion[] = [];

    while (batchCollected.length < needed && attempts < 2) {
      attempts++;
      const toGenerate = needed - batchCollected.length;
      const prompt = section === 'rw'
        ? buildRWPrompt(toGenerate, difficulty)
        : buildMathPrompt(toGenerate, difficulty);

      const result = await generateWithUsage(prompt);
      usageRecords.push(result.usage);

      const rawText = result.text;
      if (!rawText.trim()) continue;

      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) continue;

      try {
        const parsed = JSON.parse(jsonMatch[0]);
        const validated = validateSATQuestions(parsed, section);
        batchCollected = [...batchCollected, ...validated];
      } catch {
        continue;
      }
    }

    allValid = [...allValid, ...batchCollected];
  }

  // Log AI usage
  if (usageRecords.length > 0) {
    const totalUsage = usageRecords.reduce(
      (acc, u) => ({
        promptTokens: acc.promptTokens + u.promptTokens,
        completionTokens: acc.completionTokens + u.completionTokens,
        totalTokens: acc.totalTokens + u.totalTokens,
      }),
      { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
    );
    await prisma.aiUsage.create({
      data: {
        userId,
        type: 'sat_generation',
        model: usageRecords[usageRecords.length - 1]?.model || 'unknown',
        promptTokens: totalUsage.promptTokens,
        completionTokens: totalUsage.completionTokens,
        totalTokens: totalUsage.totalTokens,
      },
    });
  }

  const result = allValid.slice(0, numQuestions);

  // Shortfall check: fail hard if we got less than 50%
  const minRequired = Math.ceil(numQuestions * 0.5);
  if (result.length < minRequired) {
    throw new Error(
      `Question generation failed: only ${result.length}/${numQuestions} valid questions generated for ${section} (minimum ${minRequired} required). Please try again.`
    );
  }

  if (result.length < numQuestions) {
    console.warn(`SAT generation shortfall: ${result.length}/${numQuestions} for ${section} ${difficulty}`);
  }

  return result;
}
