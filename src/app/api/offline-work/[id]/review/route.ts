import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { calculatePoints } from '@/lib/points';
import { updateStreakAndPoints } from '@/lib/streak';

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
  const points = calculatePoints(entry.difficulty, entry.score, null, undefined, undefined, entry.numQuestions);

  await prisma.offlineWork.update({
    where: { id },
    data: {
      status: 'approved',
      parentComment: parentComment || null,
      pointsAwarded: points,
      reviewedAt: new Date(),
    },
  });

  // Update streak and points (use activityDate if available)
  await updateStreakAndPoints(entry.childId, points, entry.activityDate);

  return NextResponse.json({ success: true, status: 'approved', pointsAwarded: points });
}
