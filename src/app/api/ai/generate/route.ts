import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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
- correct_answer: "A"/"B"/"C"/"D" for MC, "True"/"False" for T/F, the exact answer for fill-in-blank, or a grading rubric for open-ended

Return ONLY a JSON array. Ensure questions are age-appropriate, educational, and progressively challenging within the difficulty level. Distribute question types as evenly as possible among the requested types.`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    let jsonStr = response.text() || '';
    const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const questions = JSON.parse(jsonStr);
    return NextResponse.json({ questions });
  } catch (error) {
    console.error('AI generation error:', error);
    return NextResponse.json({ error: 'Failed to generate questions' }, { status: 500 });
  }
}
