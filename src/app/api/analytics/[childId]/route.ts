import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { childId: string } }) {
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

  // Recent activity
  const recentAssignments = await prisma.assignment.findMany({
    where: { childId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      subject: true,
      topic: true,
      status: true,
      score: true,
      createdAt: true,
      reviewedAt: true,
    },
  });

  return NextResponse.json({
    scoreTrends,
    bySubject,
    byDifficulty,
    totalAssignments,
    completionRate,
    avgScore,
    strongest,
    weakest,
    recentActivity: recentAssignments,
  });
}
