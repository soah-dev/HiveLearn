import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { WeeklyReportData, getWeekData } from '@/lib/weekly-report';
import { buildWeeklyReportHtml } from '@/lib/email';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;
  const user = auth.user;

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
