import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { isPastTimeLimit } from '@/lib/time-limit';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'child') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const answers: Array<{ questionId: string; selectedAnswer?: string | null }> =
    Array.isArray(body?.answers) ? body.answers : [];

  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: { questions: { select: { id: true } } },
  });

  if (!assignment || assignment.childId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (assignment.status !== 'in_progress' && assignment.status !== 'pending') {
    return NextResponse.json({ error: 'Assignment already submitted' }, { status: 400 });
  }

  if (isPastTimeLimit(assignment.startedAt, assignment.timeLimitMin)) {
    return NextResponse.json({ error: 'Time limit exceeded' }, { status: 400 });
  }

  const questionIds = new Set(assignment.questions.map(q => q.id));

  const writes = answers
    .filter(ans => questionIds.has(ans.questionId))
    .map(ans => {
      const selectedAnswer = typeof ans.selectedAnswer === 'string' ? ans.selectedAnswer : null;
      return prisma.answer.upsert({
        where: { questionId_childId: { questionId: ans.questionId, childId: user.id } },
        update: { selectedAnswer },
        create: { questionId: ans.questionId, childId: user.id, selectedAnswer },
      });
    });
  if (writes.length > 0) await prisma.$transaction(writes);

  // Ensure status is in_progress
  if (assignment.status === 'pending') {
    await prisma.assignment.update({
      where: { id },
      data: { status: 'in_progress', startedAt: new Date() },
    });
  }

  return NextResponse.json({ success: true });
}
