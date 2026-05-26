import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
  if (!adminEmails.includes(user.email.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') || 'month';

  let since: Date;
  const now = new Date();
  if (period === 'week') {
    since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (period === 'month') {
    since = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    since = new Date(0);
  }

  const usage = await prisma.aiUsage.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { name: true, email: true } } },
  });

  const totals = usage.reduce(
    (acc, u) => ({
      promptTokens: acc.promptTokens + u.promptTokens,
      completionTokens: acc.completionTokens + u.completionTokens,
      totalTokens: acc.totalTokens + u.totalTokens,
      generations: acc.generations + (u.type === 'generation' ? 1 : 0),
      reviews: acc.reviews + (u.type === 'review' ? 1 : 0),
    }),
    { promptTokens: 0, completionTokens: 0, totalTokens: 0, generations: 0, reviews: 0 }
  );

  // Daily breakdown
  const dailyMap = new Map<string, { promptTokens: number; completionTokens: number; totalTokens: number }>();
  for (const u of usage) {
    const day = u.createdAt.toISOString().split('T')[0];
    const existing = dailyMap.get(day) || { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    dailyMap.set(day, {
      promptTokens: existing.promptTokens + u.promptTokens,
      completionTokens: existing.completionTokens + u.completionTokens,
      totalTokens: existing.totalTokens + u.totalTokens,
    });
  }

  const daily = Array.from(dailyMap.entries())
    .map(([date, tokens]) => ({ date, ...tokens }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Per-user breakdown
  const userMap = new Map<string, { name: string; email: string; totalTokens: number; calls: number }>();
  for (const u of usage) {
    const key = u.userId;
    const existing = userMap.get(key) || { name: u.user.name || 'Unknown', email: u.user.email, totalTokens: 0, calls: 0 };
    userMap.set(key, {
      ...existing,
      totalTokens: existing.totalTokens + u.totalTokens,
      calls: existing.calls + 1,
    });
  }
  const byUser = Array.from(userMap.values()).sort((a, b) => b.totalTokens - a.totalTokens);

  return NextResponse.json({
    totals,
    daily,
    byUser,
    requestCount: usage.length,
  });
}
