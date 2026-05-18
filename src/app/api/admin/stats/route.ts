import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { format, subDays } from 'date-fns';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
  if (!adminEmails.includes(user.email.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30);
  const sevenDaysAgo = subDays(now, 7);

  // Run all queries in parallel
  const [
    totalUsers,
    parentCount,
    childCount,
    unfinishedOnboarding,
    recentUsers,
    activeFamilyLinks,
    totalAssignments,
    reviewedAssignments,
    submittedAssignments,
    totalPractice,
    completedPractice,
    totalOffline,
    approvedOffline,
    recentAssignments,
    recentPractice,
    recentOffline,
    assignmentsBySubject,
    practiceBySubject,
    offlineBySubject,
    assignmentsByParent,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'parent' } }),
    prisma.user.count({ where: { role: 'child' } }),
    prisma.user.count({ where: { role: null } }),
    prisma.user.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    }),
    prisma.parentChild.count({ where: { status: 'active' } }),
    prisma.assignment.count(),
    prisma.assignment.count({ where: { status: 'reviewed' } }),
    prisma.assignment.count({ where: { status: 'submitted' } }),
    prisma.practiceSession.count(),
    prisma.practiceSession.count({ where: { status: 'completed' } }),
    prisma.offlineWork.count(),
    prisma.offlineWork.count({ where: { status: 'approved' } }),
    // Active users (last 7 days)
    prisma.assignment.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { childId: true, parentId: true },
    }),
    prisma.practiceSession.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { childId: true },
    }),
    prisma.offlineWork.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { childId: true },
    }),
    // Subject popularity
    prisma.assignment.groupBy({
      by: ['subject'],
      _count: { subject: true },
    }),
    prisma.practiceSession.groupBy({
      by: ['subject'],
      _count: { subject: true },
    }),
    prisma.offlineWork.groupBy({
      by: ['subject'],
      _count: { subject: true },
    }),
    // Most active families
    prisma.assignment.groupBy({
      by: ['parentId'],
      _count: { parentId: true },
      orderBy: { _count: { parentId: 'desc' } },
      take: 10,
    }),
  ]);

  // Signup trend (last 30 days, grouped by day)
  const signupMap: Record<string, number> = {};
  for (let i = 30; i >= 0; i--) {
    signupMap[format(subDays(now, i), 'yyyy-MM-dd')] = 0;
  }
  for (const u of recentUsers) {
    const day = format(u.createdAt, 'yyyy-MM-dd');
    if (signupMap[day] !== undefined) signupMap[day]++;
  }
  const signupTrend = Object.entries(signupMap).map(([date, count]) => ({ date, count }));

  // Active users (last 7 days)
  const activeUserIds = new Set<string>();
  recentAssignments.forEach(a => { activeUserIds.add(a.childId); activeUserIds.add(a.parentId); });
  recentPractice.forEach(p => activeUserIds.add(p.childId));
  recentOffline.forEach(o => activeUserIds.add(o.childId));

  // Subject popularity (merge all sources)
  const subjectMap: Record<string, number> = {};
  for (const s of assignmentsBySubject) {
    subjectMap[s.subject] = (subjectMap[s.subject] || 0) + s._count.subject;
  }
  for (const s of practiceBySubject) {
    subjectMap[s.subject] = (subjectMap[s.subject] || 0) + s._count.subject;
  }
  for (const s of offlineBySubject) {
    subjectMap[s.subject] = (subjectMap[s.subject] || 0) + s._count.subject;
  }
  const subjects = Object.entries(subjectMap)
    .map(([subject, count]) => ({ subject, count }))
    .sort((a, b) => b.count - a.count);

  // Most active families — fetch parent info
  const parentIds = assignmentsByParent.map(a => a.parentId);
  const parents = parentIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: parentIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const parentMap = new Map(parents.map(p => [p.id, p]));

  const childCounts = parentIds.length > 0
    ? await prisma.parentChild.groupBy({
        by: ['parentId'],
        where: { parentId: { in: parentIds }, status: 'active' },
        _count: { parentId: true },
      })
    : [];
  const childCountMap = new Map(childCounts.map(c => [c.parentId, c._count.parentId]));

  const mostActiveFamilies = assignmentsByParent.map(a => {
    const parent = parentMap.get(a.parentId);
    return {
      parentName: parent?.name || 'Unknown',
      parentEmail: parent?.email || '',
      childCount: childCountMap.get(a.parentId) || 0,
      assignmentCount: a._count.parentId,
    };
  });

  return NextResponse.json({
    users: {
      total: totalUsers,
      parents: parentCount,
      children: childCount,
      unfinishedOnboarding,
      activeLastWeek: activeUserIds.size,
      signupTrend,
    },
    families: {
      totalLinks: activeFamilyLinks,
      mostActive: mostActiveFamilies,
    },
    assignments: {
      total: totalAssignments,
      completed: reviewedAssignments,
      submitted: submittedAssignments,
      completionRate: totalAssignments > 0 ? Math.round((reviewedAssignments / totalAssignments) * 100) : 0,
    },
    practice: {
      total: totalPractice,
      completed: completedPractice,
    },
    offlineWork: {
      total: totalOffline,
      approved: approvedOffline,
    },
    subjects,
  });
}
