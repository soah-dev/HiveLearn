/**
 * Backfill the PointsLedger from existing point-awarding activities.
 * One row per (sourceType, sourceId), occurredAt = the activity's own date.
 *
 * Run with: npx tsx scripts/backfill-ledger.ts
 */
import prisma from '../src/lib/prisma';

async function main() {
  const rows: Array<{
    childId: string;
    points: number;
    sourceType: string;
    sourceId: string;
    occurredAt: Date;
  }> = [];

  const [assignments, practice, offline, sat] = await Promise.all([
    prisma.assignment.findMany({
      where: { status: 'reviewed', pointsAwarded: { not: null } },
      select: { id: true, childId: true, pointsAwarded: true, submittedAt: true, createdAt: true },
    }),
    prisma.practiceSession.findMany({
      where: { status: 'completed', pointsAwarded: { not: null } },
      select: { id: true, childId: true, pointsAwarded: true, completedAt: true, createdAt: true },
    }),
    prisma.offlineWork.findMany({
      where: { status: 'approved', pointsAwarded: { not: null } },
      select: { id: true, childId: true, pointsAwarded: true, activityDate: true, createdAt: true },
    }),
    prisma.sATSession.findMany({
      where: { status: 'completed', pointsAwarded: { not: null } },
      select: { id: true, childId: true, pointsAwarded: true, completedAt: true, createdAt: true },
    }),
  ]);

  for (const a of assignments) {
    rows.push({
      childId: a.childId,
      points: a.pointsAwarded ?? 0,
      sourceType: 'assignment',
      sourceId: a.id,
      occurredAt: a.submittedAt ?? a.createdAt,
    });
  }
  for (const p of practice) {
    rows.push({
      childId: p.childId,
      points: p.pointsAwarded ?? 0,
      sourceType: 'practice',
      sourceId: p.id,
      occurredAt: p.completedAt ?? p.createdAt,
    });
  }
  for (const o of offline) {
    rows.push({
      childId: o.childId,
      points: o.pointsAwarded ?? 0,
      sourceType: 'offline',
      sourceId: o.id,
      occurredAt: o.activityDate ?? o.createdAt,
    });
  }
  for (const s of sat) {
    rows.push({
      childId: s.childId,
      points: s.pointsAwarded ?? 0,
      sourceType: 'sat',
      sourceId: s.id,
      occurredAt: s.completedAt ?? s.createdAt,
    });
  }

  let written = 0;
  for (const r of rows) {
    await prisma.pointsLedger.upsert({
      where: { sourceType_sourceId: { sourceType: r.sourceType, sourceId: r.sourceId } },
      update: { points: r.points, occurredAt: r.occurredAt, childId: r.childId },
      create: r,
    });
    written++;
  }

  // Validate: ledger sum per child should match gamification.totalPoints
  const ledgerByChild = await prisma.pointsLedger.groupBy({
    by: ['childId'],
    _sum: { points: true },
  });
  const gam = await prisma.gamification.findMany({
    select: { childId: true, totalPoints: true },
  });
  const gamMap = new Map(gam.map(g => [g.childId, g.totalPoints]));

  console.log(`Backfilled ${written} ledger rows.`);
  console.log('Validation (ledger sum vs gamification.totalPoints):');
  for (const l of ledgerByChild) {
    const ledgerSum = l._sum.points ?? 0;
    const total = gamMap.get(l.childId) ?? 0;
    const match = ledgerSum === total ? 'OK' : `MISMATCH (diff ${total - ledgerSum})`;
    console.log(`  ${l.childId}: ledger=${ledgerSum} total=${total} ${match}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
