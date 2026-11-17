import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { checkGenerationQuota, quotaExceededMessage } from '@/lib/ai-quota';
import { generateQuestions, AiResponseFormatError } from '@/lib/question-generation';
import { lessonNotes, normalizeLessonContent } from '@/lib/lesson';
import { subjectLabel } from '@/lib/subjects';
import { isOneOf, DIFFICULTIES } from '@/lib/validation';

/** Start a practice session on a study lesson, with questions drawn from what the lesson taught. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'child') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { difficulty, numQuestions } = await req.json();

  if (!isOneOf(difficulty, DIFFICULTIES)) {
    return NextResponse.json({ error: 'A difficulty of easy, medium or hard is required' }, { status: 400 });
  }
  const count = [5, 10].includes(numQuestions) ? numQuestions : 5;

  const lesson = await prisma.studyLesson.findUnique({ where: { id } });
  if (!lesson || lesson.childId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const content = normalizeLessonContent(lesson.content);
  if (!content) {
    return NextResponse.json({ error: 'This lesson could not be loaded' }, { status: 500 });
  }

  const quota = await checkGenerationQuota(user.id, user.role);
  if (!quota.allowed) {
    return NextResponse.json({ error: quotaExceededMessage(quota.limit) }, { status: 429 });
  }

  // Questions from earlier rounds on this lesson, so another round asks something new
  const earlier = await prisma.practiceQuestion.findMany({
    where: { session: { lessonId: id } },
    orderBy: { session: { createdAt: 'desc' } },
    select: { questionText: true },
    take: 40,
  });

  try {
    const { questions, usage } = await generateQuestions({
      grade: lesson.grade,
      subject: subjectLabel(lesson.subject),
      topic: lesson.topic,
      difficulty,
      numQuestions: count,
      questionTypes: ['multiple_choice'],
      avoidQuestions: earlier.map(q => q.questionText.trim()),
      lessonNotes: lessonNotes(content),
    });

    await prisma.aiUsage.create({
      data: {
        userId: user.id,
        type: 'generation',
        model: usage.model,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
      },
    });

    if (questions.length === 0) {
      return NextResponse.json({ error: 'Failed to generate valid questions. Please try again.' }, { status: 500 });
    }

    const session = await prisma.practiceSession.create({
      data: {
        childId: user.id,
        lessonId: lesson.id,
        grade: lesson.grade,
        subject: lesson.subject,
        topic: lesson.topic,
        difficulty,
        questions: {
          create: questions.map((q, i) => ({
            questionText: q.question_text,
            optionA: q.option_a ?? '',
            optionB: q.option_b ?? '',
            optionC: q.option_c ?? '',
            optionD: q.option_d ?? '',
            correctAnswer: q.correct_answer,
            orderIndex: i,
          })),
        },
      },
      select: { id: true },
    });

    return NextResponse.json({ session });
  } catch (error) {
    console.error('Lesson practice generation error:', error);
    const message = error instanceof AiResponseFormatError
      ? 'AI returned an invalid response format. Please try again.'
      : 'Failed to generate practice questions. Please try again.';
    return NextResponse.json({ error: message }, { status: error instanceof AiResponseFormatError ? 502 : 500 });
  }
}
