import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getLinkedChild } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const session = await prisma.practiceSession.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { orderIndex: 'asc' },
        include: {
          answers: {
            where: { childId: user.role === 'child' ? user.id : undefined },
          },
        },
      },
      child: { select: { id: true, name: true } },
    },
  });

  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Child can only access their own sessions; parent can access their children's
  if (user.role === 'child' && session.childId !== user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role === 'parent') {
    const link = await getLinkedChild(user.id, session.childId);
    if (!link) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ session });
  }

  if (user.role !== 'child') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Never send the answer key to the child while the session is in progress
  if (session.status !== 'completed') {
    return NextResponse.json({
      session: {
        ...session,
        questions: session.questions.map(q => ({ ...q, correctAnswer: undefined })),
      },
    });
  }

  return NextResponse.json({ session });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'child') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const session = await prisma.practiceSession.findUnique({ where: { id } });

  if (!session || session.childId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Completed sessions have already awarded points and appear in analytics
  // and the points ledger; deleting them would leave those out of sync.
  if (session.status === 'completed') {
    return NextResponse.json({ error: 'Completed sessions cannot be removed' }, { status: 400 });
  }

  await prisma.practiceSession.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
