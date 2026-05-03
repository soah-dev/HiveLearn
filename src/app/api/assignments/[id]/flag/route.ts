import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'child') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { questionId, flagged, flagReason } = await req.json();

  const assignment = await prisma.assignment.findUnique({
    where: { id },
  });

  if (!assignment || assignment.childId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (assignment.status !== 'reviewed') {
    return NextResponse.json({ error: 'Can only flag reviewed assignments' }, { status: 400 });
  }

  await prisma.answer.updateMany({
    where: { questionId, childId: user.id },
    data: {
      flagged: flagged ?? true,
      flagReason: flagged ? (flagReason || null) : null,
      flagResolvedAt: flagged ? null : undefined,
    },
  });

  return NextResponse.json({ success: true });
}
