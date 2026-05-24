import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Find the family (all children linked to same parent(s))
  let siblingIds: string[] = [];

  let childNameMap = new Map<string, string>();

  if (user.role === 'child') {
    // Get parent(s)
    const parentLinks = await prisma.parentChild.findMany({
      where: { childId: user.id, status: 'active' },
    });
    const parentIds = parentLinks.map(l => l.parentId);

    // Get all children of those parents
    const siblingLinks = await prisma.parentChild.findMany({
      where: { parentId: { in: parentIds }, status: 'active' },
      select: { childId: true, childName: true },
    });
    siblingIds = siblingLinks.map(l => l.childId).filter((id): id is string => id !== null);
    for (const l of siblingLinks) {
      if (l.childId && l.childName) childNameMap.set(l.childId, l.childName);
    }
  } else {
    // Parent viewing
    const childLinks = await prisma.parentChild.findMany({
      where: { parentId: user.id, status: 'active' },
      select: { childId: true, childName: true },
    });
    siblingIds = childLinks.map(l => l.childId).filter((id): id is string => id !== null);
    for (const l of childLinks) {
      if (l.childId && l.childName) childNameMap.set(l.childId, l.childName);
    }
  }

  if (siblingIds.length === 0) {
    return NextResponse.json({ leaderboard: [] });
  }

  const children = await prisma.user.findMany({
    where: { id: { in: siblingIds } },
    select: {
      id: true,
      name: true,
      image: true,
      gamification: true,
    },
  });

  // Weekly points: sum pointsAwarded for assignments reviewed this week
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weeklyAssignments = await prisma.assignment.findMany({
    where: {
      childId: { in: siblingIds },
      status: 'reviewed',
      reviewedAt: { gte: weekStart },
    },
    select: { childId: true, pointsAwarded: true },
  });

  const weeklyPoints: Record<string, number> = {};
  for (const a of weeklyAssignments) {
    weeklyPoints[a.childId] = (weeklyPoints[a.childId] || 0) + (a.pointsAwarded || 0);
  }

  const leaderboard = children.map(c => ({
    id: c.id,
    name: childNameMap.get(c.id) || c.name,
    image: c.image,
    totalPoints: c.gamification?.totalPoints || 0,
    weeklyPoints: weeklyPoints[c.id] || 0,
    currentStreak: c.gamification?.currentStreak || 0,
  })).sort((a, b) => b.totalPoints - a.totalPoints);

  return NextResponse.json({ leaderboard });
}
