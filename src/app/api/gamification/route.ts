import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const childId = user.role === 'child'
    ? user.id
    : new URL(req.url).searchParams.get('childId');

  if (!childId) {
    return NextResponse.json({ error: 'childId required' }, { status: 400 });
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
