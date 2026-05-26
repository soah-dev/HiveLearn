import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'child') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const session = await prisma.sATSession.findUnique({
    where: { id, childId: user.id },
    include: {
      modules: {
        orderBy: [{ section: 'asc' }, { moduleNumber: 'asc' }],
        include: {
          questions: {
            orderBy: { orderIndex: 'asc' },
            include: {
              answers: {
                where: { childId: user.id },
              },
            },
          },
        },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Strip correctAnswer from non-completed modules to prevent cheating
  const sanitizedModules = session.modules.map(mod => ({
    ...mod,
    questions: mod.questions.map(q => ({
      ...q,
      correctAnswer: mod.status === 'completed' ? q.correctAnswer : undefined,
    })),
  }));

  return NextResponse.json({
    session: {
      ...session,
      modules: sanitizedModules,
    },
  });
}
