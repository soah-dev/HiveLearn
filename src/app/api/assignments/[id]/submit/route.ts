import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { isPastTimeLimit } from '@/lib/time-limit';

interface SubmittedAnswer {
  questionId: string;
  selectedAnswer?: string | null;
  flagged?: boolean;
  flagReason?: string | null;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'child') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const answers: SubmittedAnswer[] = Array.isArray(body?.answers) ? body.answers : [];

  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: { questions: { orderBy: { orderIndex: 'asc' } } },
  });

  if (!assignment || assignment.childId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (assignment.status !== 'in_progress' && assignment.status !== 'pending') {
    return NextResponse.json({ error: 'Assignment already submitted' }, { status: 400 });
  }

  const now = new Date();
  // Timed assignment past its deadline (plus grace): the posted answers are
  // ignored and the assignment is closed with whatever was saved before the
  // limit, so a stalled tab can't buy extra time.
  const late = isPastTimeLimit(assignment.startedAt, assignment.timeLimitMin, now);

  if (!late) {
    for (const ans of answers) {
      const question = assignment.questions.find(q => q.id === ans.questionId);
      if (!question) continue;

      const flagged = ans.flagged === true;
      const selectedAnswer = typeof ans.selectedAnswer === 'string' ? ans.selectedAnswer : null;

      // Auto-grade non-open-ended questions (skip grading for flagged questions)
      let isCorrect: boolean | null = null;
      if (!flagged && question.questionType !== 'open_ended') {
        isCorrect = selectedAnswer?.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
      }

      await prisma.answer.upsert({
        where: {
          questionId_childId: {
            questionId: ans.questionId,
            childId: user.id,
          },
        },
        update: {
          selectedAnswer,
          isCorrect,
          flagged,
          flagReason: ans.flagReason || null,
        },
        create: {
          questionId: ans.questionId,
          childId: user.id,
          selectedAnswer,
          isCorrect,
          flagged,
          flagReason: ans.flagReason || null,
        },
      });
    }
  } else {
    // Grade whatever was saved via save-progress before the deadline
    const saved = await prisma.answer.findMany({
      where: { childId: user.id, questionId: { in: assignment.questions.map(q => q.id) } },
    });
    for (const a of saved) {
      const question = assignment.questions.find(q => q.id === a.questionId);
      if (!question || a.flagged || question.questionType === 'open_ended') continue;
      const isCorrect = a.selectedAnswer?.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
      await prisma.answer.update({ where: { id: a.id }, data: { isCorrect } });
    }
  }

  await prisma.assignment.update({
    where: { id },
    data: {
      status: 'submitted',
      submittedAt: now,
      startedAt: assignment.startedAt || now,
    },
  });

  return NextResponse.json({ success: true, lateSubmission: late });
}
