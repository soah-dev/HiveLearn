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
