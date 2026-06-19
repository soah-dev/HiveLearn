import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const scope = new URL(req.url).searchParams.get('scope') === 'family' ? 'family' : 'global';

  let children;
  if (scope === 'family') {
    // In-family ranking: every active child in the viewer's family. For a parent
    // that's their linked children; for a child it's their siblings + self.
    // Opt-out is ignored — this is the viewer's own family.
    let familyChildIds: string[];
    if (user.role === 'parent') {
      const links = await prisma.parentChild.findMany({
        where: { parentId: user.id, status: 'active', childId: { not: null } },
        select: { childId: true },
      });
      familyChildIds = [...new Set(links.map(l => l.childId as string))];
    } else {
      const links = await prisma.parentChild.findMany({
        where: { childId: user.id, status: 'active' },
        select: { parentId: true },
      });
      const parentIds = [...new Set(links.map(l => l.parentId))];
      if (parentIds.length === 0) {
        return NextResponse.json({ scope, leaderboard: [] });
      }
      const siblingLinks = await prisma.parentChild.findMany({
        where: { parentId: { in: parentIds }, status: 'active', childId: { not: null } },
        select: { childId: true },
      });
      familyChildIds = [...new Set(siblingLinks.map(s => s.childId as string))];
    }
    children = await prisma.user.findMany({
      where: { id: { in: familyChildIds }, role: 'child' },
      select: { id: true, name: true, gamification: true },
    });
  } else {
    // Global leaderboard across all children on the platform (excluding opted-out)
    children = await prisma.user.findMany({
      where: { role: 'child', leaderboardOptOut: false },
      select: { id: true, name: true, gamification: true },
    });
  }

  if (children.length === 0) {
    return NextResponse.json({ scope, leaderboard: [] });
  }

  const childIds = children.map(c => c.id);

  // Weekly points: sum points earned this week across every activity that awards points
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  // Single ledger scan sums every point-earning source by the activity's own date
  const weeklyLedger = await prisma.pointsLedger.groupBy({
    by: ['childId'],
    where: { childId: { in: childIds }, occurredAt: { gte: weekStart } },
    _sum: { points: true },
  });

  const weeklyPoints: Record<string, number> = {};
  for (const r of weeklyLedger) {
    weeklyPoints[r.childId] = r._sum.points || 0;
  }

  // Within a family, show real first names. Across families, mask for privacy:
  // keep the first 3 letters, hide the rest.
  const firstName = (name: string | null) => name?.trim().split(/\s+/)[0] || null;
  const maskName = (name: string | null) => {
    const base = firstName(name);
    if (!base) return null;
    const head = base.charAt(0).toUpperCase() + base.slice(1, 3);
    return base.length <= 3 ? head : `${head}•••`;
  };
  const formatName = scope === 'family' ? firstName : maskName;

  const entries = children.map(c => ({
    id: c.id,
    name: formatName(c.name),
    totalPoints: c.gamification?.totalPoints || 0,
    weeklyPoints: weeklyPoints[c.id] || 0,
    currentStreak: c.gamification?.currentStreak || 0,
  }));

  let leaderboard;
  if (scope === 'family') {
    // Families are small — return everyone, sorted by all-time; the client
    // re-sorts for the weekly view.
    leaderboard = entries.sort((a, b) => b.totalPoints - a.totalPoints);
  } else {
    // Global view is weekly-only (all-time dropped — unfair to new joiners).
    leaderboard = entries.sort((a, b) => b.weeklyPoints - a.weeklyPoints).slice(0, 10);
  }

  return NextResponse.json({ scope, leaderboard });
}
