import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { normalizeLessonContent } from '@/lib/lesson';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'child') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const lesson = await prisma.studyLesson.findUnique({
    where: { id },
    include: {
      practiceSessions: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, difficulty: true, status: true, score: true, pointsAwarded: true, createdAt: true,
          _count: { select: { questions: true } },
        },
      },
    },
  });

  if (!lesson || lesson.childId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    lesson: {
      id: lesson.id,
      grade: lesson.grade,
      subject: lesson.subject,
      topic: lesson.topic,
      createdAt: lesson.createdAt,
      content: normalizeLessonContent(lesson.content),
      practiceSessions: lesson.practiceSessions.map(({ _count, ...session }) => ({ ...session, numQuestions: _count.questions })),
    },
  });
}
