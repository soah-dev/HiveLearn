import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { WeeklyReportData, ReportRow, WeeklyTotals } from '@/lib/weekly-report';
import { buildWeeklyReportHtml } from '@/lib/email';

async function getWeekData(childId: string, weekStart: Date, weekEnd: Date, currentStreak: number) {
  const [assignments, practiceSessions, offlineWork] = await Promise.all([
    prisma.assignment.findMany({
      where: { childId, status: 'reviewed', reviewedAt: { gte: weekStart, lt: weekEnd } },
      select: { subject: true, difficulty: true, numQuestions: true, score: true, startedAt: true, submittedAt: true },
    }),
    prisma.practiceSession.findMany({
      where: { childId, status: 'completed', completedAt: { gte: weekStart, lt: weekEnd } },
      include: { _count: { select: { questions: true } } },
    }),
    prisma.offlineWork.findMany({
      where: { childId, status: 'reviewed', reviewedAt: { gte: weekStart, lt: weekEnd } },
      select: { subject: true, difficulty: true, numQuestions: true, score: true },
    }),
  ]);

  const rows: ReportRow[] = [
    ...assignments.map(a => ({ type: 'Assignment' as const, subject: a.subject, difficulty: a.difficulty, numQuestions: a.numQuestions, score: a.score })),
    ...practiceSessions.map(p => ({ type: 'Practice' as const, subject: p.subject, difficulty: p.difficulty, numQuestions: p._count.questions, score: p.score })),
    ...offlineWork.map(o => ({ type: 'Offline Activity' as const, subject: o.subject, difficulty: o.difficulty, numQuestions: o.numQuestions, score: o.score })),
  ];

  let timeSpentMin = 0;
  for (const a of assignments) {
    if (a.startedAt && a.submittedAt) timeSpentMin += (a.submittedAt.getTime() - a.startedAt.getTime()) / 60000;
  }
  for (const p of practiceSessions) {
    if (p.createdAt && p.completedAt) timeSpentMin += (p.completedAt.getTime() - p.createdAt.getTime()) / 60000;
  }

  const scoredRows = rows.filter(r => r.score != null);
  const avgScore = scoredRows.length > 0
    ? Math.round(scoredRows.reduce((sum, r) => sum + r.score!, 0) / scoredRows.length)
    : null;

  const totals: WeeklyTotals = {
    activities: rows.length,
    totalQuestions: rows.reduce((sum, r) => sum + r.numQuestions, 0),
    avgScore,
    timeSpentMin: Math.round(timeSpentMin),
    streak: currentStreak,
  };

  return { rows, totals };
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
  if (!adminEmails.includes(user.email.toLowerCase())) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const childId = req.nextUrl.searchParams.get('childId');
  if (!childId) {
    return NextResponse.json({ error: 'childId query param required' }, { status: 400 });
  }

  const child = await prisma.user.findUnique({
    where: { id: childId },
    select: { id: true, name: true, email: true, gamification: { select: { currentStreak: true } } },
  });
  if (!child) {
    return NextResponse.json({ error: 'Child not found' }, { status: 404 });
  }

  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setHours(0, 0, 0, 0);
  const weekStart = new Date(weekEnd);
  weekStart.setDate(weekStart.getDate() - 7);
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);

  const currentStreak = child.gamification?.currentStreak ?? 0;
  const [current, prev] = await Promise.all([
    getWeekData(childId, weekStart, weekEnd, currentStreak),
    getWeekData(childId, prevWeekStart, weekStart, 0),
  ]);

  const report: WeeklyReportData = {
    childName: child.name || child.email,
    parentName: user.name || 'Admin',
    parentEmail: user.email,
    childId,
    rows: current.rows,
    totals: current.totals,
    prevTotals: prev.totals,
    weekStart,
    weekEnd,
  };

  const html = buildWeeklyReportHtml(report);
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } });
}
