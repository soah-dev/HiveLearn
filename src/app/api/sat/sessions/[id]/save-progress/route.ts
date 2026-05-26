import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'child') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!user.satEnabled) {
    return NextResponse.json({ error: 'SAT practice not enabled for your account' }, { status: 403 });
  }

  const { id } = await params;
  const { moduleId, answers } = await req.json();

  // Verify session and module belong to user
  const session = await prisma.sATSession.findUnique({
    where: { id, childId: user.id },
    include: { modules: true },
  });
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const mod = session.modules.find(m => m.id === moduleId);
  if (!mod || mod.status !== 'in_progress') {
    return NextResponse.json({ error: 'Module not in progress' }, { status: 400 });
  }

  // Upsert answers
  for (const a of answers as Array<{ questionId: string; selectedAnswer: string | null }>) {
    await prisma.sATAnswer.upsert({
      where: { questionId_childId: { questionId: a.questionId, childId: user.id } },
      update: { selectedAnswer: a.selectedAnswer },
      create: { questionId: a.questionId, childId: user.id, selectedAnswer: a.selectedAnswer },
    });
  }

  return NextResponse.json({ success: true });
}
