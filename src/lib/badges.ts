import prisma from './prisma';

export async function checkBadges(childId: string) {
  const child = await prisma.user.findUnique({
    where: { id: childId },
    include: {
      receivedAssignments: {
        where: { status: 'reviewed' },
      },
      gamification: true,
      earnedBadges: true,
    },
  });

  if (!child) return [];

  const reviewed = child.receivedAssignments;
  const earnedBadgeIds = new Set(child.earnedBadges.map(eb => eb.badgeId));

  const allBadges = await prisma.badge.findMany();
  const badgesToAward: string[] = [];

  for (const badge of allBadges) {
    if (earnedBadgeIds.has(badge.id)) continue;

    let earned = false;
    switch (badge.criteria) {
      case 'first_assignment':
        earned = reviewed.length >= 1;
        break;
      case 'perfect_score':
        earned = reviewed.some(a => a.score === 100);
        break;
      case 'streak_7':
        earned = (child.gamification?.currentStreak || 0) >= 7;
        break;
      case 'streak_30':
        earned = (child.gamification?.currentStreak || 0) >= 30;
        break;
      case 'mastery_math':
      case 'mastery_science':
      case 'mastery_reading':
      case 'mastery_history':
      case 'mastery_english':
      case 'mastery_geography': {
        const subject = badge.criteria.replace('mastery_', '');
        const count = reviewed.filter(a => a.subject === subject && (a.score || 0) >= 80).length;
        earned = count >= 10;
        break;
      }
      case 'speed_demon':
        earned = reviewed.some(a =>
          a.timeLimitMin &&
          a.startedAt &&
          a.submittedAt &&
          (a.score || 0) >= 90 &&
          (new Date(a.submittedAt).getTime() - new Date(a.startedAt).getTime()) <= (a.timeLimitMin * 60 * 1000 * 0.5)
        );
        break;
      case 'hardmode_hero': {
        const hardCount = reviewed.filter(a => a.difficulty === 'hard' && (a.score || 0) >= 80).length;
        earned = hardCount >= 10;
        break;
      }
      case 'points_1000':
        earned = (child.gamification?.totalPoints || 0) >= 1000;
        break;
      case 'all_rounder': {
        const subjects = new Set(reviewed.map(a => a.subject));
        earned = subjects.size >= 5;
        break;
      }
      case 'sat_first_test': {
        const satCount = await prisma.sATSession.count({ where: { childId, status: 'completed' } });
        earned = satCount >= 1;
        break;
      }
      case 'sat_score_1000': {
        const sat1000 = await prisma.sATSession.findFirst({ where: { childId, status: 'completed', compositeScore: { gte: 1000 } } });
        earned = !!sat1000;
        break;
      }
      case 'sat_score_1200': {
        const sat1200 = await prisma.sATSession.findFirst({ where: { childId, status: 'completed', compositeScore: { gte: 1200 } } });
        earned = !!sat1200;
        break;
      }
      case 'sat_score_1400': {
        const sat1400 = await prisma.sATSession.findFirst({ where: { childId, status: 'completed', compositeScore: { gte: 1400 } } });
        earned = !!sat1400;
        break;
      }
      case 'sat_perfect_section': {
        const satPerfect = await prisma.sATSession.findFirst({
          where: { childId, status: 'completed', OR: [{ rwScaledScore: 800 }, { mathScaledScore: 800 }] },
        });
        earned = !!satPerfect;
        break;
      }
      case 'sat_marathon': {
        const satMarathon = await prisma.sATSession.count({ where: { childId, status: 'completed' } });
        earned = satMarathon >= 5;
        break;
      }
    }

    if (earned) badgesToAward.push(badge.id);
  }

  // Award badges
  for (const badgeId of badgesToAward) {
    await prisma.earnedBadge.create({
      data: { childId, badgeId },
    });
  }

  return badgesToAward;
}
