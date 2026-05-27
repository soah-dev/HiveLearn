import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { generateWithUsage, AiUsageMetadata } from '@/lib/gemini';
import { sendAssignmentNotification } from '@/lib/email';

interface GeneratedQuestion {
  question_type: string;
  question_text: string;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  correct_answer: string;
}

function validateQuestions(questions: GeneratedQuestion[], allowedTypes: string[]): GeneratedQuestion[] {
  const valid: GeneratedQuestion[] = [];

  for (const q of questions) {
    if (!allowedTypes.includes(q.question_type)) continue;

    if (q.question_type === 'multiple_choice') {
      const answer = q.correct_answer?.toUpperCase().trim();
      const options: Record<string, string | null> = { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d };
      if (['A', 'B', 'C', 'D'].includes(answer) && options[answer]) {
        valid.push({ ...q, correct_answer: answer });
      }
    } else if (q.question_type === 'true_false') {
      const answer = q.correct_answer?.trim();
      if (['True', 'False', 'true', 'false'].includes(answer)) {
        valid.push({ ...q, correct_answer: answer.charAt(0).toUpperCase() + answer.slice(1).toLowerCase() });
      }
    } else {
      if (q.correct_answer?.trim()) {
        valid.push(q);
      }
    }
  }

  return valid;
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'parent') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { presetId } = await req.json();

  const preset = await prisma.assignmentPreset.findFirst({
    where: { id: presetId, parentId: user.id, active: true },
    include: { child: { select: { id: true, name: true, email: true } } },
  });

  if (!preset) {
    return NextResponse.json({ error: 'Preset not found or inactive' }, { status: 404 });
  }

  const questionTypes = preset.questionTypes.split(',');
  const topicClause = preset.topic?.trim()
    ? `on the topic "${preset.topic.trim()}"`
    : `covering a variety of appropriate topics`;
  const allowedTypes = questionTypes.join(', ');

  const prompt = `Generate ${preset.numQuestions} questions for a grade ${preset.grade} student ${topicClause} in ${preset.subject} at ${preset.difficulty} difficulty. ONLY use these question types: ${allowedTypes}. Do NOT generate any other question types.

For each question, return a JSON object with:
- question_type: MUST be one of: ${questionTypes.map((t: string) => `"${t}"`).join(' | ')}
- question_text: the question
- option_a, option_b, option_c, option_d: options (null for non-MC types)
- correct_answer: For multiple_choice this MUST be exactly one of "A", "B", "C", or "D" matching which option contains the correct answer. For true_false use "True" or "False". For fill_in_blank use the exact answer text. For open_ended use a grading rubric.

CRITICAL RULES:
- EVERY question MUST have question_type set to one of: ${allowedTypes}. No other types are allowed.
- For multiple_choice: The correct_answer MUST be the letter (A/B/C/D) of the option that is correct.
- All four options (option_a through option_d) must be non-null and non-empty for multiple_choice questions.
- Do NOT put the answer text in correct_answer for multiple_choice — only the letter.

Return ONLY a JSON array. Ensure questions are age-appropriate, educational, and progressively challenging within the difficulty level.`;

  try {
    const generateResult = await generateWithUsage(prompt);
    const rawText = generateResult.text;

    // Log AI usage
    await prisma.aiUsage.create({
      data: {
        userId: user.id,
        type: 'generation',
        model: generateResult.usage.model,
        promptTokens: generateResult.usage.promptTokens,
        completionTokens: generateResult.usage.completionTokens,
        totalTokens: generateResult.usage.totalTokens,
        assignmentId: null,
      },
    });

    if (!rawText.trim()) {
      throw new Error('AI returned an empty response');
    }

    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new SyntaxError('AI response did not contain a valid question array');
    }

    let questions: GeneratedQuestion[];
    try {
      questions = JSON.parse(jsonMatch[0]);
    } catch {
      throw new SyntaxError('AI returned malformed JSON');
    }

    const valid = validateQuestions(questions, questionTypes);
    if (valid.length === 0) {
      throw new Error('No valid questions were generated');
    }

    const finalQuestions = valid.slice(0, preset.numQuestions);

    // Create the assignment
    const assignment = await prisma.assignment.create({
      data: {
        parentId: user.id,
        childId: preset.childId,
        grade: preset.grade,
        subject: preset.subject,
        topic: preset.topic || `${preset.subject} practice`,
        difficulty: preset.difficulty,
        numQuestions: finalQuestions.length,
        timeLimitMin: preset.timeLimitMin,
        reviewMode: preset.reviewMode,
        questions: {
          create: finalQuestions.map((q, i) => ({
            questionType: q.question_type,
            questionText: q.question_text,
            optionA: q.option_a || null,
            optionB: q.option_b || null,
            optionC: q.option_c || null,
            optionD: q.option_d || null,
            correctAnswer: q.correct_answer,
            orderIndex: i,
          })),
        },
      },
      include: { questions: true },
    });

    // Update lastGeneratedAt
    await prisma.assignmentPreset.update({
      where: { id: preset.id },
      data: { lastGeneratedAt: new Date() },
    });

    // Send notification email
    try {
      if (preset.child.email) {
        await sendAssignmentNotification({
          to: preset.child.email,
          childName: preset.child.name || 'Student',
          parentName: user.name || 'Your parent',
          subject: preset.subject,
          topic: preset.topic || `${preset.subject} practice`,
          numQuestions: finalQuestions.length,
          difficulty: preset.difficulty,
        });
      }
    } catch (err) {
      console.error('Failed to send assignment notification:', err);
    }

    return NextResponse.json({ assignment, presetId: preset.id });
  } catch (error: unknown) {
    console.error('Preset generation error:', error);
    let message = 'Failed to generate questions';
    if (error instanceof Error) {
      message = error.message;
    }
    return NextResponse.json({ error: message, presetId: preset.id }, { status: 500 });
  }
}
