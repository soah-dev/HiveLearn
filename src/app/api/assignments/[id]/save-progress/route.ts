import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'child') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { answers } = await req.json();

  const assignment = await prisma.assignment.findUnique({
    where: { id },
  });

  if (!assignment || assignment.childId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  for (const ans of answers) {
    await prisma.answer.upsert({
      where: {
        questionId_childId: {
          questionId: ans.questionId,
          childId: user.id,
        },
      },
      update: {
        selectedAnswer: ans.selectedAnswer,
      },
      create: {
        questionId: ans.questionId,
        childId: user.id,
        selectedAnswer: ans.selectedAnswer,
      },
    });
  }

  // Ensure status is in_progress
  if (assignment.status === 'pending') {
    await prisma.assignment.update({
      where: { id },
      data: { status: 'in_progress', startedAt: new Date() },
    });
  }

  return NextResponse.json({ success: true });
}
