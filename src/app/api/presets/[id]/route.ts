import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'parent') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const preset = await prisma.assignmentPreset.findFirst({
    where: { id, parentId: user.id },
  });
  if (!preset) {
    return NextResponse.json({ error: 'Preset not found' }, { status: 404 });
  }

  const body = await req.json();
  const { grade, subject, topic, difficulty, numQuestions, questionTypes, timeLimitMin, reviewMode, daysOfWeek, active } = body;

  const updated = await prisma.assignmentPreset.update({
    where: { id },
    data: {
      ...(grade !== undefined && { grade }),
      ...(subject !== undefined && { subject }),
      ...(topic !== undefined && { topic: topic || null }),
      ...(difficulty !== undefined && { difficulty }),
      ...(numQuestions !== undefined && { numQuestions }),
      ...(questionTypes !== undefined && { questionTypes: Array.isArray(questionTypes) ? questionTypes.join(',') : questionTypes }),
      ...(timeLimitMin !== undefined && { timeLimitMin: timeLimitMin || null }),
      ...(reviewMode !== undefined && { reviewMode }),
      ...(daysOfWeek !== undefined && { daysOfWeek }),
      ...(active !== undefined && { active }),
    },
    include: { child: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({ preset: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'parent') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const preset = await prisma.assignmentPreset.findFirst({
    where: { id, parentId: user.id },
  });
  if (!preset) {
    return NextResponse.json({ error: 'Preset not found' }, { status: 404 });
  }

  await prisma.assignmentPreset.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
