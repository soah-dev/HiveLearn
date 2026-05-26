import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'parent') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [presets, links] = await Promise.all([
    prisma.assignmentPreset.findMany({
      where: { parentId: user.id },
      include: { child: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.parentChild.findMany({
      where: { parentId: user.id, status: 'active' },
      select: { childId: true, childName: true },
    }),
  ]);

  const childNameMap = new Map(links.filter(l => l.childId).map(l => [l.childId!, l.childName]));
  for (const p of presets) {
    if (p.child && childNameMap.has(p.childId)) {
      p.child.name = childNameMap.get(p.childId) || p.child.name;
    }
  }

  return NextResponse.json({ presets });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'parent') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { childId, grade, subject, topic, difficulty, numQuestions, questionTypes, timeLimitMin, reviewMode, daysOfWeek } = body;

  // Verify child is linked
  const link = await prisma.parentChild.findFirst({
    where: { parentId: user.id, childId, status: 'active' },
  });
  if (!link) {
    return NextResponse.json({ error: 'Child not linked to parent' }, { status: 400 });
  }

  const preset = await prisma.assignmentPreset.create({
    data: {
      parentId: user.id,
      childId,
      grade,
      subject,
      topic: topic || null,
      difficulty: difficulty || 'medium',
      numQuestions: numQuestions || 5,
      questionTypes: Array.isArray(questionTypes) ? questionTypes.join(',') : questionTypes || 'multiple_choice',
      timeLimitMin: timeLimitMin || null,
      reviewMode: reviewMode || 'ai',
      daysOfWeek: daysOfWeek || '1,2,3,4,5',
    },
    include: { child: { select: { id: true, name: true, email: true } } },
  });

  // Use parent-assigned child name
  if (preset.child) {
    preset.child.name = link.childName || preset.child.name;
  }

  return NextResponse.json({ preset });
}
