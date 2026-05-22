import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { generateWithFallback } from '@/lib/gemini';

interface GeneratedQuestion {
  question_type: string;
  question_text: string;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  correct_answer: string;
}

function validateQuestions(questions: GeneratedQuestion[]): { valid: GeneratedQuestion[]; invalid: GeneratedQuestion[] } {
  const valid: GeneratedQuestion[] = [];
  const invalid: GeneratedQuestion[] = [];

  for (const q of questions) {
    if (q.question_type === 'multiple_choice') {
      const answer = q.correct_answer?.toUpperCase().trim();
      const options: Record<string, string | null> = { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d };

      // correct_answer must be A/B/C/D and that option must not be empty
      if (!['A', 'B', 'C', 'D'].includes(answer) || !options[answer]) {
        invalid.push(q);
      } else {
        // Normalize correct_answer to uppercase
        valid.push({ ...q, correct_answer: answer });
      }
    } else if (q.question_type === 'true_false') {
      const answer = q.correct_answer?.trim();
      if (!['True', 'False'].includes(answer) && !['true', 'false'].includes(answer)) {
        invalid.push(q);
      } else {
        // Normalize to "True"/"False"
        valid.push({ ...q, correct_answer: answer.charAt(0).toUpperCase() + answer.slice(1).toLowerCase() });
      }
    } else {
      // fill_in_blank and open_ended: just need a non-empty correct_answer
      if (!q.correct_answer?.trim()) {
        invalid.push(q);
      } else {
        valid.push(q);
      }
    }
  }

  return { valid, invalid };
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'parent') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { grade, subject, topic, difficulty, numQuestions, questionTypes } = await req.json();

  const topicClause = topic?.trim()
    ? `on the topic "${topic.trim()}"`
    : `covering a variety of appropriate topics`;

  const allowedTypes = questionTypes.join(', ');

  const prompt = `Generate ${numQuestions} questions for a grade ${grade} student ${topicClause} in ${subject} at ${difficulty} difficulty. ONLY use these question types: ${allowedTypes}. Do NOT generate any other question types.

For each question, return a JSON object with:
- question_type: MUST be one of: ${questionTypes.map((t: string) => `"${t}"`).join(' | ')}
- question_text: the question
- option_a, option_b, option_c, option_d: options (null for non-MC types)
- correct_answer: For multiple_choice this MUST be exactly one of "A", "B", "C", or "D" matching which option contains the correct answer. For true_false use "True" or "False". For fill_in_blank use the exact answer text. For open_ended use a grading rubric.

CRITICAL RULES:
- EVERY question MUST have question_type set to one of: ${allowedTypes}. No other types are allowed.
- For multiple_choice: The correct_answer MUST be the letter (A/B/C/D) of the option that is correct. Double-check that the option text for that letter actually contains the right answer.
- All four options (option_a through option_d) must be non-null and non-empty for multiple_choice questions.
- Do NOT put the answer text in correct_answer for multiple_choice — only the letter.
- For reading/language arts: If you include a passage, you MUST also include an explicit question after the passage in question_text (e.g. "Read the passage below:\\n\\n[passage]\\n\\nWhat is the main idea of this passage?"). Never leave the question implied — always state what the student is being asked.

Return ONLY a JSON array. Ensure questions are age-appropriate, educational, and progressively challenging within the difficulty level. Distribute question types as evenly as possible among: ${allowedTypes}.`;

  try {
    let allValid: GeneratedQuestion[] = [];
    let attempts = 0;
    let remaining = numQuestions;

    // Generate with retry for invalid questions (max 2 attempts)
    while (remaining > 0 && attempts < 2) {
      attempts++;
      const generatePrompt = attempts === 1
        ? prompt
        : `Generate ${remaining} MORE ${subject} questions for grade ${grade} ${topicClause} at ${difficulty} difficulty. Types: ${questionTypes.join(', ')}.\n\nSame format as before. CRITICAL: For multiple_choice, correct_answer MUST be "A", "B", "C", or "D" and that option must contain the correct answer. Return ONLY a JSON array.`;

      const rawText = await generateWithFallback(generatePrompt);

      if (!rawText.trim()) {
        console.error('AI returned empty response for subject:', subject);
        throw new Error('AI returned an empty response. The content may have been filtered.');
      }

      let jsonStr = rawText;
      const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      } else {
        console.error('No JSON array found in AI response:', rawText.substring(0, 500));
        throw new SyntaxError('AI response did not contain a valid question array');
      }

      let questions: GeneratedQuestion[];
      try {
        questions = JSON.parse(jsonStr);
      } catch (parseErr) {
        console.error('JSON parse failed for subject:', subject, 'Raw:', jsonStr.substring(0, 500));
        throw new SyntaxError('AI returned malformed JSON');
      }
      const { valid, invalid } = validateQuestions(questions);

      // Filter out questions that don't match the requested types
      const typeFiltered = valid.filter(q => questionTypes.includes(q.question_type));
      if (typeFiltered.length < valid.length) {
        console.warn(`AI generation: ${valid.length - typeFiltered.length} questions discarded for wrong type (requested: ${allowedTypes})`);
      }

      allValid = [...allValid, ...typeFiltered];
      remaining = numQuestions - allValid.length;

      if (invalid.length > 0) {
        console.warn(`AI generation: ${invalid.length} invalid questions discarded (attempt ${attempts})`);
      }
    }

    // Return what we have (may be fewer than requested if validation kept failing)
    return NextResponse.json({ questions: allValid.slice(0, numQuestions) });
  } catch (error: unknown) {
    console.error('AI generation error:', error);

    let message = 'Failed to generate questions';
    let status = 500;

    if (error instanceof SyntaxError) {
      message = 'AI returned an invalid response format. Please try again.';
    } else if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('503') || msg.includes('service unavailable') || msg.includes('high demand')) {
        message = 'AI service is temporarily overloaded. Please wait a moment and try again.';
        status = 503;
      } else if (msg.includes('rate') || msg.includes('quota') || msg.includes('429')) {
        message = 'AI rate limit reached. Please wait a moment and try again.';
        status = 429;
      } else if (msg.includes('safety') || msg.includes('blocked') || msg.includes('filter')) {
        message = 'AI content filter blocked the request. Try a different topic or question type.';
        status = 400;
      } else if (msg.includes('timeout') || msg.includes('deadline')) {
        message = 'AI request timed out. Please try again.';
        status = 504;
      } else {
        message = `AI generation failed: ${error.message}`;
      }
    }

    return NextResponse.json({ error: message }, { status });
  }
}
