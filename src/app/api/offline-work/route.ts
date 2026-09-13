import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { intInRange, isOneOf, DIFFICULTIES } from '@/lib/validation';

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'child') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { subject, bookReference, activityDate } = body;
  const numQuestions = intInRange(body.numQuestions, 1, 200);
  const score = intInRange(body.score, 0, 100);
  const difficulty = isOneOf(body.difficulty, DIFFICULTIES) ? body.difficulty : 'medium';

  if (typeof subject !== 'string' || !subject.trim()) {
    return NextResponse.json({ error: 'Subject is required' }, { status: 400 });
  }
  if (numQuestions === null) {
    return NextResponse.json({ error: 'Number of questions must be a whole number from 1 to 200' }, { status: 400 });
  }
  if (score === null) {
    return NextResponse.json({ error: 'Score must be a whole number between 0 and 100' }, { status: 400 });
  }

  // Reject work dated more than 7 days ago (or in the future)
  if (activityDate) {
    const activity = new Date(activityDate);
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    if (activity < sevenDaysAgo) {
      return NextResponse.json({ error: 'Activity date cannot be more than 7 days ago' }, { status: 400 });
    }
    if (activity > now) {
      return NextResponse.json({ error: 'Activity date cannot be in the future' }, { status: 400 });
    }
  }

  const offlineWork = await prisma.offlineWork.create({
    data: {
      childId: user.id,
      parentId: null,
      subject,
      bookReference: bookReference || null,
      numQuestions,
      score,
      difficulty,
      activityDate: activityDate ? new Date(activityDate) : null,
    },
  });

  return NextResponse.json({ offlineWork });
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role === 'child') {
    const entries = await prisma.offlineWork.findMany({
      where: { childId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ entries });
  }

  if (user.role === 'parent') {
    // Get all children linked to this parent
    const links = await prisma.parentChild.findMany({
      where: { parentId: user.id, status: 'active' },
      select: { childId: true },
    });
    const childIds = links.map(l => l.childId).filter(Boolean) as string[];

    const entries = await prisma.offlineWork.findMany({
      where: { childId: { in: childIds } },
      include: { child: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ entries });
  }

  return NextResponse.json({ entries: [] });
}
