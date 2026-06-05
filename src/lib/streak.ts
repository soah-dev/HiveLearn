import prisma from '@/lib/prisma';

/**
 * Streak freeze: students get a 2-day grace period (covers weekends).
 * A gap of up to 2 missed days keeps the streak alive. Three consecutive misses resets it.
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
 * Allows up to a 2-day gap (streak freeze) between active days.
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

  // Walk through days — allow up to a 2-day gap (streak freeze)
  let currentStreak = 1;
  let longestStreak = 1;

  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1] + 'T12:00:00');
    const curr = new Date(days[i] + 'T12:00:00');
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000));

    if (diffDays <= 3) {
      // Consecutive day (1) or up to a 2-day freeze gap (2-3) — streak continues
      currentStreak += 1;
    } else {
      currentStreak = 1;
    }
    longestStreak = Math.max(longestStreak, currentStreak);
  }

  // Check if the streak is still active
  // With freeze: streak holds if last activity was today, or within the last 3 days
  const lastDay = days[days.length - 1];
  const today = getTodayStr();
  const yesterday = subtractDays(today, 1);
  const dayBefore = subtractDays(today, 2);
  const threeDaysAgo = subtractDays(today, 3);

  if (lastDay !== today && lastDay !== yesterday && lastDay !== dayBefore && lastDay !== threeDaysAgo) {
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
 * Allows up to a 2-day gap (streak freeze) — missing up to two days doesn't break the streak.
 */
export async function updateStreakAndPoints(
  childId: string,
  points: number,
  activityDate?: Date | null,
  source?: { type: string; id: string },
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

    if (gap <= 3) {
      // Consecutive day (1) or up to a 2-day freeze gap (2-3) — streak continues
      newStreak += 1;
    } else {
      // Gap of 4+ days — reset streak
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

  // Record the award in the points ledger for fast time-windowed sums.
  // One upsertable row per source — keyed on (sourceType, sourceId).
  if (source) {
    await prisma.pointsLedger.upsert({
      where: { sourceType_sourceId: { sourceType: source.type, sourceId: source.id } },
      update: { points, occurredAt: effectiveDate, childId },
      create: { childId, points, sourceType: source.type, sourceId: source.id, occurredAt: effectiveDate },
    });
  }
}
