import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getLinkedChild } from '@/lib/auth';
import prisma from '@/lib/prisma';

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

  // Check if streak is stale (last activity was 3+ days ago)
  let adjustedGamification = gamification;
  if (gamification?.lastCompletedDate) {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
    const twoDaysAgo = new Date(today + 'T12:00:00');
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];
    if (gamification.lastCompletedDate < twoDaysAgoStr) {
      adjustedGamification = { ...gamification, currentStreak: 0 };
    }
  }

  return NextResponse.json({ gamification: adjustedGamification, earnedBadges, allBadges });
}
