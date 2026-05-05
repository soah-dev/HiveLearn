import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { calculatePoints } from '@/lib/points';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'parent') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { action, parentComment } = await req.json();

  const entry = await prisma.offlineWork.findUnique({ where: { id } });

  if (!entry || entry.status !== 'pending') {
    return NextResponse.json({ error: 'Not found or already reviewed' }, { status: 404 });
  }

  // Verify parent owns this child
  const link = await prisma.parentChild.findFirst({
    where: { parentId: user.id, childId: entry.childId, status: 'active' },
  });
  if (!link) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (action === 'reject') {
    await prisma.offlineWork.update({
      where: { id },
      data: {
        status: 'rejected',
        parentComment: parentComment || null,
        reviewedAt: new Date(),
      },
    });
    return NextResponse.json({ success: true, status: 'rejected' });
  }

  // Approve — calculate points and update streak
  const points = calculatePoints(entry.difficulty, entry.score, null);

  await prisma.offlineWork.update({
    where: { id },
    data: {
      status: 'approved',
      parentComment: parentComment || null,
      pointsAwarded: points,
      reviewedAt: new Date(),
    },
  });

  // Update streak and points
  const today = new Date().toISOString().split('T')[0];
  const gam = await prisma.gamification.upsert({
    where: { childId: entry.childId },
    update: {},
    create: { childId: entry.childId },
  });

  let newStreak = gam.currentStreak;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (gam.lastCompletedDate === yesterdayStr) {
    newStreak += 1;
  } else if (gam.lastCompletedDate !== today) {
    newStreak = 1;
  }

  await prisma.gamification.update({
    where: { childId: entry.childId },
    data: {
      totalPoints: gam.totalPoints + points,
      currentStreak: newStreak,
      longestStreak: Math.max(gam.longestStreak, newStreak),
      lastCompletedDate: today,
    },
  });

  return NextResponse.json({ success: true, status: 'approved', pointsAwarded: points });
}
