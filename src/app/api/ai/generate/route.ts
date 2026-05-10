import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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

  const prompt = `Generate ${numQuestions} questions for a grade ${grade} student ${topicClause} in ${subject} at ${difficulty} difficulty. Include the following question types: ${questionTypes.join(', ')}.

For each question, return a JSON object with:
- question_type: "multiple_choice" | "true_false" | "fill_in_blank" | "open_ended"
- question_text: the question
- option_a, option_b, option_c, option_d: options (null for non-MC types)
- correct_answer: For multiple_choice this MUST be exactly one of "A", "B", "C", or "D" matching which option contains the correct answer. For true_false use "True" or "False". For fill_in_blank use the exact answer text. For open_ended use a grading rubric.

CRITICAL RULES:
- For multiple_choice: The correct_answer MUST be the letter (A/B/C/D) of the option that is correct. Double-check that the option text for that letter actually contains the right answer.
- All four options (option_a through option_d) must be non-null and non-empty for multiple_choice questions.
- Do NOT put the answer text in correct_answer for multiple_choice — only the letter.

Return ONLY a JSON array. Ensure questions are age-appropriate, educational, and progressively challenging within the difficulty level. Distribute question types as evenly as possible among the requested types.`;

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

      const result = await model.generateContent(generatePrompt);
      const response = result.response;
      let jsonStr = response.text() || '';
      const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      const questions: GeneratedQuestion[] = JSON.parse(jsonStr);
      const { valid, invalid } = validateQuestions(questions);

      allValid = [...allValid, ...valid];
      remaining = numQuestions - allValid.length;

      if (invalid.length > 0) {
        console.warn(`AI generation: ${invalid.length} invalid questions discarded (attempt ${attempts})`);
      }
    }

    // Return what we have (may be fewer than requested if validation kept failing)
    return NextResponse.json({ questions: allValid.slice(0, numQuestions) });
  } catch (error) {
    console.error('AI generation error:', error);
    return NextResponse.json({ error: 'Failed to generate questions' }, { status: 500 });
  }
}
