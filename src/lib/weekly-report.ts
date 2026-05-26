import prisma from './prisma';

export interface ReportRow {
  type: 'Assignment' | 'Practice' | 'Offline Activity';
  subject: string;
  difficulty: string;
  numQuestions: number;
  score: number | null;
}

export interface WeeklyTotals {
  activities: number;
  totalQuestions: number;
  avgScore: number | null;
  timeSpentMin: number;
  streak: number;
}

export interface WeeklyReportData {
  childName: string;
  parentName: string;
  parentEmail: string;
  childId: string;
  rows: ReportRow[];
  totals: WeeklyTotals;
  prevTotals: WeeklyTotals;
  weekStart: Date;
  weekEnd: Date;
}

async function getWeekData(childId: string, weekStart: Date, weekEnd: Date, currentStreak: number) {
  const [assignments, practiceSessions, offlineWork] = await Promise.all([
    prisma.assignment.findMany({
      where: {
        childId,
        status: 'reviewed',
        reviewedAt: { gte: weekStart, lt: weekEnd },
      },
      select: { subject: true, difficulty: true, numQuestions: true, score: true, startedAt: true, submittedAt: true },
    }),
    prisma.practiceSession.findMany({
      where: {
        childId,
        status: 'completed',
        completedAt: { gte: weekStart, lt: weekEnd },
      },
      include: { _count: { select: { questions: true } } },
    }),
    prisma.offlineWork.findMany({
      where: {
        childId,
        status: 'reviewed',
        reviewedAt: { gte: weekStart, lt: weekEnd },
      },
      select: { subject: true, difficulty: true, numQuestions: true, score: true },
    }),
  ]);

  const rows: ReportRow[] = [
    ...assignments.map(a => ({
      type: 'Assignment' as const,
      subject: a.subject,
      difficulty: a.difficulty,
      numQuestions: a.numQuestions,
      score: a.score,
    })),
    ...practiceSessions.map(p => ({
      type: 'Practice' as const,
      subject: p.subject,
      difficulty: p.difficulty,
      numQuestions: p._count.questions,
      score: p.score,
    })),
    ...offlineWork.map(o => ({
      type: 'Offline Activity' as const,
      subject: o.subject,
      difficulty: o.difficulty,
      numQuestions: o.numQuestions,
      score: o.score,
    })),
  ];

  // Calculate time spent from assignments and practice sessions
  let timeSpentMin = 0;
  for (const a of assignments) {
    if (a.startedAt && a.submittedAt) {
      timeSpentMin += (a.submittedAt.getTime() - a.startedAt.getTime()) / 60000;
    }
  }
  for (const p of practiceSessions) {
    if (p.createdAt && p.completedAt) {
      timeSpentMin += (p.completedAt.getTime() - p.createdAt.getTime()) / 60000;
    }
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

export async function getWeeklyReportsToSend(): Promise<WeeklyReportData[]> {
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setHours(0, 0, 0, 0);
  const weekStart = new Date(weekEnd);
  weekStart.setDate(weekStart.getDate() - 7);
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);

  const links = await prisma.parentChild.findMany({
    where: {
      status: 'active',
      weeklyReportEnabled: true,
      childId: { not: null },
    },
    include: {
      parent: { select: { name: true, email: true } },
      child: {
        select: {
          id: true,
          name: true,
          gamification: { select: { currentStreak: true } },
        },
      },
    },
  });

  const activeLinks = links.filter(l => l.child);

  const reports = await Promise.all(
    activeLinks.map(async (link) => {
      const childId = link.child!.id;
      const childName = link.childName || link.child!.name || 'Your child';
      const currentStreak = link.child!.gamification?.currentStreak ?? 0;

      const [current, prev] = await Promise.all([
        getWeekData(childId, weekStart, weekEnd, currentStreak),
        getWeekData(childId, prevWeekStart, weekStart, 0),
      ]);

      return {
        childName,
        parentName: link.parent.name || 'Parent',
        parentEmail: link.parent.email,
        childId,
        rows: current.rows,
        totals: current.totals,
        prevTotals: prev.totals,
        weekStart,
        weekEnd,
      };
    })
  );

  return reports;
}
