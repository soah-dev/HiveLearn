import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
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
    const link = await prisma.parentChild.findFirst({
      where: { parentId: user.id, childId: session.childId, status: 'active' },
    });
    if (!link) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ session });
}
