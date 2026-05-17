import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { startOfWeek, format } from 'date-fns';

export async function GET(req: NextRequest, { params }: { params: Promise<{ childId: string }> }) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'parent') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { childId } = await params;

  // Verify parent-child link
  const link = await prisma.parentChild.findFirst({
    where: { parentId: user.id, childId, status: 'active' },
  });
  if (!link) {
    return NextResponse.json({ error: 'Not linked' }, { status: 403 });
  }

  // Parse date range params (default: week-to-date)
  const searchParams = req.nextUrl.searchParams;
  const now = new Date();
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');
  const from = fromParam ? new Date(fromParam + 'T00:00:00') : startOfWeek(now, { weekStartsOn: 1 });
  const to = toParam ? new Date(toParam + 'T23:59:59.999') : now;

  // --- Lifetime data (unchanged) ---
  const assignments = await prisma.assignment.findMany({
    where: { childId, status: 'reviewed' },
    orderBy: { reviewedAt: 'asc' },
    select: {
      id: true,
      subject: true,
      topic: true,
      difficulty: true,
      score: true,
      pointsAwarded: true,
      reviewedAt: true,
      createdAt: true,
    },
  });

  // Score trends over time
  const scoreTrends = assignments.map(a => ({
    date: a.reviewedAt?.toISOString().split('T')[0],
    score: a.score,
    subject: a.subject,
  }));

  // Scores by subject
  const subjectScores: Record<string, { total: number; count: number }> = {};
  for (const a of assignments) {
    if (!subjectScores[a.subject]) subjectScores[a.subject] = { total: 0, count: 0 };
    subjectScores[a.subject].total += a.score || 0;
    subjectScores[a.subject].count += 1;
  }
  const bySubject = Object.entries(subjectScores).map(([subject, data]) => ({
    subject,
    avgScore: Math.round(data.total / data.count),
    count: data.count,
  }));

  // Scores by difficulty
  const diffScores: Record<string, { total: number; count: number }> = {};
  for (const a of assignments) {
    if (!diffScores[a.difficulty]) diffScores[a.difficulty] = { total: 0, count: 0 };
    diffScores[a.difficulty].total += a.score || 0;
    diffScores[a.difficulty].count += 1;
  }
  const byDifficulty = Object.entries(diffScores).map(([difficulty, data]) => ({
    difficulty,
    avgScore: Math.round(data.total / data.count),
    count: data.count,
  }));

  // Overall stats
  const totalAssignments = assignments.length;
  const totalCreated = await prisma.assignment.count({ where: { childId } });
  const completionRate = totalCreated > 0 ? Math.round((totalAssignments / totalCreated) * 100) : 0;
  const avgScore = totalAssignments > 0
    ? Math.round(assignments.reduce((sum, a) => sum + (a.score || 0), 0) / totalAssignments)
    : 0;

  // Strongest/weakest
  const sorted = [...bySubject].sort((a, b) => b.avgScore - a.avgScore);
  const strongest = sorted[0]?.subject || null;
  const weakest = sorted[sorted.length - 1]?.subject || null;

  // --- Activity View (date-filtered, unified) ---
  const [filteredAssignments, filteredPractice, filteredOffline] = await Promise.all([
    prisma.assignment.findMany({
      where: {
        childId,
        status: 'reviewed',
        reviewedAt: { gte: from, lte: to },
      },
      select: {
        id: true, subject: true, topic: true, difficulty: true,
        score: true, pointsAwarded: true, reviewedAt: true,
      },
    }),
    prisma.practiceSession.findMany({
      where: {
        childId,
        status: 'completed',
        completedAt: { gte: from, lte: to },
      },
      select: {
        id: true, subject: true, topic: true, difficulty: true,
        score: true, pointsAwarded: true, completedAt: true,
      },
    }),
    prisma.offlineWork.findMany({
      where: {
        childId,
        status: 'approved',
        OR: [
          { activityDate: { gte: from, lte: to } },
          { activityDate: null, createdAt: { gte: from, lte: to } },
        ],
      },
      select: {
        id: true, subject: true, bookReference: true, difficulty: true,
        score: true, pointsAwarded: true, activityDate: true, createdAt: true,
      },
    }),
  ]);

  // Normalize into unified shape
  type ActivityItem = {
    id: string;
    type: 'assignment' | 'practice' | 'offline';
    date: string;
    subject: string;
    topic: string;
    difficulty: string;
    score: number | null;
    pointsAwarded: number | null;
  };

  const activities: ActivityItem[] = [
    ...filteredAssignments.map(a => ({
      id: a.id,
      type: 'assignment' as const,
      date: format(a.reviewedAt!, 'yyyy-MM-dd'),
      subject: a.subject,
      topic: a.topic,
      difficulty: a.difficulty,
      score: a.score,
      pointsAwarded: a.pointsAwarded,
    })),
    ...filteredPractice.map(p => ({
      id: p.id,
      type: 'practice' as const,
      date: format(p.completedAt!, 'yyyy-MM-dd'),
      subject: p.subject,
      topic: p.topic || '',
      difficulty: p.difficulty,
      score: p.score,
      pointsAwarded: p.pointsAwarded,
    })),
    ...filteredOffline.map(o => ({
      id: o.id,
      type: 'offline' as const,
      date: format(o.activityDate || o.createdAt, 'yyyy-MM-dd'),
      subject: o.subject,
      topic: o.bookReference || '',
      difficulty: o.difficulty,
      score: o.score,
      pointsAwarded: o.pointsAwarded,
    })),
  ];

  // Summary
  const totalActivities = activities.length;
  const assignmentCount = filteredAssignments.length;
  const practiceCount = filteredPractice.length;
  const offlineCount = filteredOffline.length;
  const activitiesWithScore = activities.filter(a => a.score !== null);
  const activityAvgScore = activitiesWithScore.length > 0
    ? Math.round(activitiesWithScore.reduce((sum, a) => sum + (a.score || 0), 0) / activitiesWithScore.length)
    : 0;
  const totalPoints = activities.reduce((sum, a) => sum + (a.pointsAwarded || 0), 0);

  // Chart data sorted ascending by date
  const chartData = activities
    .filter(a => a.score !== null)
    .map(a => ({ date: a.date, score: a.score, type: a.type }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Activities sorted descending for feed
  const sortedActivities = [...activities].sort((a, b) => b.date.localeCompare(a.date));

  return NextResponse.json({
    scoreTrends,
    bySubject,
    byDifficulty,
    totalAssignments,
    completionRate,
    avgScore,
    strongest,
    weakest,
    activityView: {
      from: format(from, 'yyyy-MM-dd'),
      to: format(to, 'yyyy-MM-dd'),
      summary: {
        totalActivities,
        assignmentCount,
        practiceCount,
        offlineCount,
        avgScore: activityAvgScore,
        totalPoints,
      },
      chartData,
      activities: sortedActivities,
    },
  });
}
