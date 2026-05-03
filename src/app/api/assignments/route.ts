import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'parent') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { childId, grade, subject, topic, difficulty, numQuestions, timeLimitMin, reviewMode, questions } = body;

  // Verify child is linked to parent
  const link = await prisma.parentChild.findFirst({
    where: { parentId: user.id, childId, status: 'active' },
  });
  if (!link) {
    return NextResponse.json({ error: 'Child not linked to parent' }, { status: 400 });
  }

  const assignment = await prisma.assignment.create({
    data: {
      parentId: user.id,
      childId,
      grade,
      subject,
      topic,
      difficulty,
      numQuestions,
      timeLimitMin: timeLimitMin || null,
      reviewMode,
      questions: {
        create: questions.map((q: { questionType: string; questionText: string; optionA?: string; optionB?: string; optionC?: string; optionD?: string; correctAnswer: string }, i: number) => ({
          questionType: q.questionType,
          questionText: q.questionText,
          optionA: q.optionA || null,
          optionB: q.optionB || null,
          optionC: q.optionC || null,
          optionD: q.optionD || null,
          correctAnswer: q.correctAnswer,
          orderIndex: i,
        })),
      },
    },
    include: { questions: true },
  });

  return NextResponse.json({ assignment });
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const childId = searchParams.get('childId');
  const status = searchParams.get('status');

  const where: Record<string, unknown> = {};

  if (user.role === 'parent') {
    where.parentId = user.id;
    if (childId) where.childId = childId;
  } else {
    where.childId = user.id;
  }

  if (status) where.status = status;

  const assignments = await prisma.assignment.findMany({
    where,
    include: {
      questions: {
        orderBy: { orderIndex: 'asc' },
        include: {
          answers: {
            where: { flagged: true, flagResolvedAt: null },
            select: { id: true },
          },
        },
      },
      child: { select: { id: true, name: true, image: true } },
      parent: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ assignments });
}
