import prisma from '@/lib/prisma';

/**
 * Get a date string in US Central timezone (YYYY-MM-DD).
 * This ensures streaks are consistent for US-based users regardless of
 * server timezone or UTC offset.
 */
function toLocalDateStr(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
  // en-CA locale formats as YYYY-MM-DD
}

function getYesterdayStr(): string {
  const now = new Date();
  // Get today in Central time, then subtract one day
  const todayStr = toLocalDateStr(now);
  const yesterday = new Date(todayStr + 'T12:00:00'); // noon to avoid DST issues
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

/**
 * Recalculate a child's streak from scratch by looking at all completed activities.
 * Returns the recalculated values.
 */
export async function recalculateStreak(childId: string) {
  // Gather all activity dates from the three sources
  const [assignments, practice, offline] = await Promise.all([
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

  // Sort days ascending
  const days = [...daySet].sort();

  if (days.length === 0) {
    await prisma.gamification.upsert({
      where: { childId },
      update: { currentStreak: 0, longestStreak: 0, lastCompletedDate: null },
      create: { childId },
    });
    return { currentStreak: 0, longestStreak: 0, lastCompletedDate: null, activeDays: 0 };
  }

  // Walk through days and compute streaks
  let currentStreak = 1;
  let longestStreak = 1;

  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1] + 'T12:00:00');
    const curr = new Date(days[i] + 'T12:00:00');
    const diffMs = curr.getTime() - prev.getTime();
    const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));

    if (diffDays === 1) {
      currentStreak += 1;
    } else {
      currentStreak = 1;
    }
    longestStreak = Math.max(longestStreak, currentStreak);
  }

  // Check if the streak is still active (last day is today or yesterday)
  const lastDay = days[days.length - 1];
  const today = toLocalDateStr(new Date());
  const yesterdayStr = getYesterdayStr();

  if (lastDay !== today && lastDay !== yesterdayStr) {
    // Streak has lapsed
    currentStreak = 0;
  }

  await prisma.gamification.upsert({
    where: { childId },
    update: {
      currentStreak,
      longestStreak,
      lastCompletedDate: lastDay,
    },
    create: {
      childId,
      currentStreak,
      longestStreak,
      lastCompletedDate: lastDay,
    },
  });

  return { currentStreak, longestStreak, lastCompletedDate: lastDay, activeDays: days.length };
}

/**
 * Update a child's streak and points.
 * @param childId - The child's user ID
 * @param points - Points to award
 * @param activityDate - The date the work was actually done (optional, defaults to now)
 */
export async function updateStreakAndPoints(
  childId: string,
  points: number,
  activityDate?: Date | null,
) {
  const effectiveDate = activityDate || new Date();
  const today = toLocalDateStr(new Date());
  const activityDay = toLocalDateStr(effectiveDate);
  const yesterdayStr = getYesterdayStr();

  const gam = await prisma.gamification.upsert({
    where: { childId },
    update: {},
    create: { childId },
  });

  let newStreak = gam.currentStreak;

  // Use the more recent of activityDay and lastCompletedDate to determine streak
  const lastDate = gam.lastCompletedDate;

  if (lastDate === activityDay) {
    // Already completed on this activity day — just add points, no streak change
  } else if (lastDate === yesterdayStr && (activityDay === today || activityDay === yesterdayStr)) {
    // Last completed yesterday, and activity is today or yesterday — continue streak
    newStreak += 1;
  } else if (!lastDate && activityDay) {
    // First ever completion
    newStreak = 1;
  } else if (activityDay === today && lastDate !== today) {
    // Activity is today but last completion was before yesterday — reset
    newStreak = 1;
  } else if (activityDay !== today && activityDay !== yesterdayStr) {
    // Activity date is further in the past — don't break current streak, just add points
    // (e.g., parent approving old offline work shouldn't reset a current streak)
  } else if (lastDate !== yesterdayStr && lastDate !== activityDay) {
    // Gap in dates — reset
    newStreak = 1;
  }

  // Only update lastCompletedDate if activityDay is more recent
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
