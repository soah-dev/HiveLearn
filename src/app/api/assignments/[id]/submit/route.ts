import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'child') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { answers } = await req.json();

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

  // Save answers
  for (const ans of answers) {
    const question = assignment.questions.find(q => q.id === ans.questionId);
    if (!question) continue;

    // Auto-grade non-open-ended questions
    let isCorrect: boolean | null = null;
    if (question.questionType !== 'open_ended') {
      isCorrect = ans.selectedAnswer?.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
    }

    await prisma.answer.upsert({
      where: {
        questionId_childId: {
          questionId: ans.questionId,
          childId: user.id,
        },
      },
      update: {
        selectedAnswer: ans.selectedAnswer,
        isCorrect,
      },
      create: {
        questionId: ans.questionId,
        childId: user.id,
        selectedAnswer: ans.selectedAnswer,
        isCorrect,
      },
    });
  }

  // Update assignment status
  await prisma.assignment.update({
    where: { id },
    data: {
      status: 'submitted',
      submittedAt: new Date(),
      startedAt: assignment.startedAt || new Date(),
    },
  });

  return NextResponse.json({ success: true });
}
