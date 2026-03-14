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

  return NextResponse.json({ gamification, earnedBadges, allBadges });
}
