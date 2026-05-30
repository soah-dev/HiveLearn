import prisma from '@/lib/prisma';

/**
 * Streak freeze: students get a 1-day grace period.
 * A gap of 1 missed day keeps the streak alive. Two consecutive misses resets it.
 */

/**
 * Get a date string in US Central timezone (YYYY-MM-DD).
 */
function toLocalDateStr(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
  // en-CA locale formats as YYYY-MM-DD
}

/** Subtract N days from a YYYY-MM-DD string and return YYYY-MM-DD */
function subtractDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00'); // noon to avoid DST issues
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function getTodayStr(): string {
  return toLocalDateStr(new Date());
}

/**
 * Recalculate a child's streak from scratch by looking at all completed activities.
 * Allows a 1-day gap (streak freeze) between active days.
 */
export async function recalculateStreak(childId: string) {
  const [assignments, practice, offline, satSessions] = await Promise.all([
    prisma.assignment.findMany({
      where: { childId, status: 'reviewed', submittedAt: { not: null } },
      select: { submittedAt: true },
    }),
    prisma.practiceSession.findMany({
      where: { childId, status: 'completed', completedAt: { not: null } },
      select: { completedAt: true },
    }),
    prisma.offlineWork.findMany({
      where: { childId, status: 'approved' },
      select: { activityDate: true, createdAt: true },
    }),
    prisma.sATSession.findMany({
      where: { childId, status: 'completed', completedAt: { not: null } },
      select: { completedAt: true },
    }),
  ]);

  // Collect all unique activity days (Central timezone)
  const daySet = new Set<string>();
  for (const a of assignments) {
    if (a.submittedAt) daySet.add(toLocalDateStr(a.submittedAt));
  }
  for (const p of practice) {
    if (p.completedAt) daySet.add(toLocalDateStr(p.completedAt));
  }
  for (const o of offline) {
    daySet.add(toLocalDateStr(o.activityDate || o.createdAt));
  }
  for (const s of satSessions) {
    if (s.completedAt) daySet.add(toLocalDateStr(s.completedAt));
  }

  const days = [...daySet].sort();

  if (days.length === 0) {
    await prisma.gamification.upsert({
      where: { childId },
      update: { currentStreak: 0, longestStreak: 0, lastCompletedDate: null },
      create: { childId },
    });
    return { currentStreak: 0, longestStreak: 0, lastCompletedDate: null, activeDays: 0 };
  }

  // Walk through days — allow 1-day gap (streak freeze)
  let currentStreak = 1;
  let longestStreak = 1;

  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1] + 'T12:00:00');
    const curr = new Date(days[i] + 'T12:00:00');
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000));

    if (diffDays <= 2) {
      // Consecutive day (1) or 1-day freeze gap (2) — streak continues
      currentStreak += 1;
    } else {
      currentStreak = 1;
    }
    longestStreak = Math.max(longestStreak, currentStreak);
  }

  // Check if the streak is still active
  // With freeze: streak holds if last activity was today, yesterday, or 2 days ago
  const lastDay = days[days.length - 1];
  const today = getTodayStr();
  const yesterday = subtractDays(today, 1);
  const dayBefore = subtractDays(today, 2);

  if (lastDay !== today && lastDay !== yesterday && lastDay !== dayBefore) {
    currentStreak = 0;
  }

  await prisma.gamification.upsert({
    where: { childId },
    update: { currentStreak, longestStreak, lastCompletedDate: lastDay },
    create: { childId, currentStreak, longestStreak, lastCompletedDate: lastDay },
  });

  return { currentStreak, longestStreak, lastCompletedDate: lastDay, activeDays: days.length };
}

/**
 * Update a child's streak and points.
 * Allows a 1-day gap (streak freeze) — missing one day doesn't break the streak.
 */
export async function updateStreakAndPoints(
  childId: string,
  points: number,
  activityDate?: Date | null,
) {
  const effectiveDate = activityDate || new Date();
  const today = getTodayStr();
  const activityDay = toLocalDateStr(effectiveDate);
  const yesterday = subtractDays(today, 1);
  const dayBefore = subtractDays(today, 2);

  const gam = await prisma.gamification.upsert({
    where: { childId },
    update: {},
    create: { childId },
  });

  let newStreak = gam.currentStreak;
  const lastDate = gam.lastCompletedDate;

  if (lastDate === activityDay) {
    // Already completed on this activity day — just add points, no streak change
  } else if (lastDate && activityDay < lastDate) {
    // Activity is older than most recent — don't touch streak, just add points
  } else if (!lastDate) {
    // First ever completion
    newStreak = 1;
  } else {
    // activityDay > lastDate — this is a new, more recent activity
    const lastDateObj = new Date(lastDate + 'T12:00:00');
    const activityDateObj = new Date(activityDay + 'T12:00:00');
    const gap = Math.round((activityDateObj.getTime() - lastDateObj.getTime()) / (24 * 60 * 60 * 1000));

    if (gap <= 2) {
      // Consecutive day (1) or 1-day freeze gap (2) — streak continues
      newStreak += 1;
    } else {
      // Gap of 3+ days — reset streak
      newStreak = 1;
    }
  }

  const newLastDate = !lastDate || activityDay > lastDate ? activityDay : lastDate;

  await prisma.gamification.update({
    where: { childId },
    data: {
      totalPoints: gam.totalPoints + points,
      currentStreak: newStreak,
      longestStreak: Math.max(gam.longestStreak, newStreak),
      lastCompletedDate: newLastDate,
    },
  });
}
