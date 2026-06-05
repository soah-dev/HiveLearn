import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Global leaderboard across all children on the platform (excluding opted-out)
  const children = await prisma.user.findMany({
    where: { role: 'child', leaderboardOptOut: false },
    select: {
      id: true,
      name: true,
      gamification: true,
    },
  });

  if (children.length === 0) {
    return NextResponse.json({ leaderboard: [] });
  }

  const childIds = children.map(c => c.id);

  // Weekly points: sum pointsAwarded for assignments reviewed this week
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weeklyAssignments = await prisma.assignment.findMany({
    where: {
      childId: { in: childIds },
      status: 'reviewed',
      reviewedAt: { gte: weekStart },
    },
    select: { childId: true, pointsAwarded: true },
  });

  const weeklyPoints: Record<string, number> = {};
  for (const a of weeklyAssignments) {
    weeklyPoints[a.childId] = (weeklyPoints[a.childId] || 0) + (a.pointsAwarded || 0);
  }

  // Mask names for privacy across families: keep the first 3 letters, hide the rest
  const maskName = (name: string | null) => {
    const base = name?.trim().split(/\s+/)[0];
    if (!base) return null;
    const head = base.charAt(0).toUpperCase() + base.slice(1, 3);
    return base.length <= 3 ? head : `${head}•••`;
  };

  const entries = children.map(c => ({
    id: c.id,
    name: maskName(c.name),
    totalPoints: c.gamification?.totalPoints || 0,
    weeklyPoints: weeklyPoints[c.id] || 0,
    currentStreak: c.gamification?.currentStreak || 0,
  }));

  // Cap to top 10, but include both all-time and weekly leaders so newcomers
  // who rank high this week aren't excluded by a low lifetime total
  const topByTotal = [...entries].sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 10);
  const topByWeekly = [...entries].sort((a, b) => b.weeklyPoints - a.weeklyPoints).slice(0, 10);
  const keep = new Map<string, typeof entries[number]>();
  for (const e of [...topByTotal, ...topByWeekly]) keep.set(e.id, e);

  const leaderboard = [...keep.values()]
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, 10);

  return NextResponse.json({ leaderboard });
}
