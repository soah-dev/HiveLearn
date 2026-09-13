import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getLinkedChild } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { isStreakActive } from '@/lib/streak';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let childId: string;
  if (user.role === 'child') {
    childId = user.id;
  } else if (user.role === 'parent') {
    const requested = new URL(req.url).searchParams.get('childId');
    if (!requested) {
      return NextResponse.json({ error: 'childId required' }, { status: 400 });
    }
    if (!(await getLinkedChild(user.id, requested))) {
      return NextResponse.json({ error: 'Child not linked to parent' }, { status: 403 });
    }
    childId = requested;
  } else {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const gamification = await prisma.gamification.findUnique({
    where: { childId },
  });

  const earnedBadges = await prisma.earnedBadge.findMany({
    where: { childId },
    include: { badge: true },
    orderBy: { earnedAt: 'desc' },
  });

  const allBadges = await prisma.badge.findMany();

  // Zero the displayed streak once the freeze window has lapsed (same rule as streak.ts)
  const adjustedGamification = gamification && !isStreakActive(gamification.lastCompletedDate)
    ? { ...gamification, currentStreak: 0 }
    : gamification;

  return NextResponse.json({ gamification: adjustedGamification, earnedBadges, allBadges });
}
