import { PrismaClient } from '@prisma/client';
import { calculatePoints } from '../src/lib/points';

const prisma = new PrismaClient();

async function recalculateScores() {
  const assignments = await prisma.assignment.findMany({
    where: { status: 'reviewed' },
    include: {
      questions: {
        include: { answers: true },
      },
      child: { select: { id: true, grade: true, name: true } },
    },
  });

  console.log(`Found ${assignments.length} reviewed assignments to check.\n`);
  console.log('| # | Child | Subject | Topic | Difficulty | Questions | Correct | Wrong | Excluded | Stored Score | Calculated Score | Points |');
  console.log('|---|-------|---------|-------|------------|-----------|---------|-------|----------|--------------|------------------|--------|');

  let fixed = 0;

  for (const [i, assignment] of assignments.entries()) {
    const childName = assignment.child?.name || assignment.childId;

    let correctCount = 0;
    let wrongCount = 0;
    let excludedCount = 0;

    const allAnswers = assignment.questions.flatMap(q =>
      q.answers.map(a => ({ ...a, questionType: q.questionType, correctAnswer: q.correctAnswer, questionText: q.questionText }))
    );

    const scoredAnswers = allAnswers.filter(a => {
      if (a.questionType === 'open_ended') return a.aiScore !== null;
      return a.isCorrect !== null;
    });

    let totalScore = 0;
    for (const a of allAnswers) {
      if (a.isCorrect === null && a.questionType !== 'open_ended') {
        excludedCount++;
      } else if (a.questionType === 'open_ended') {
        if (a.aiScore !== null) {
          totalScore += a.aiScore;
          if (a.aiScore >= 50) correctCount++; else wrongCount++;
        } else {
          excludedCount++;
        }
      } else {
        totalScore += a.isCorrect ? 100 : 0;
        if (a.isCorrect) correctCount++; else wrongCount++;
      }
    }
    const correctScore = scoredAnswers.length > 0 ? Math.round(totalScore / scoredAnswers.length) : 0;

    console.log(`| ${i + 1} | ${childName} | ${assignment.subject} | ${assignment.topic} | ${assignment.difficulty} | ${assignment.questions.length} | ${correctCount} | ${wrongCount} | ${excludedCount} | ${assignment.score}% | ${correctScore}% | ${assignment.pointsAwarded} |`);

    if (correctScore !== assignment.score) {
      const newPoints = calculatePoints(
        assignment.difficulty,
        correctScore,
        assignment.timeLimitMin,
        assignment.child?.grade,
        assignment.grade
      );
      const oldPoints = assignment.pointsAwarded ?? 0;
      const pointsDelta = newPoints - oldPoints;

      console.log(`  ^ MISMATCH: ${assignment.score}% → ${correctScore}%, points ${oldPoints} → ${newPoints}`);

      await prisma.assignment.update({
        where: { id: assignment.id },
        data: { score: correctScore, pointsAwarded: newPoints },
      });

      if (pointsDelta !== 0 && assignment.childId) {
        await prisma.gamification.updateMany({
          where: { childId: assignment.childId },
          data: { totalPoints: { increment: pointsDelta } },
        });
      }

      fixed++;
    }
  }

  // Fix non-flagged answers that have null isCorrect (AI missed them during review)
  console.log('\n--- Fixing ungraded non-flagged answers ---\n');
  let answersFixed = 0;
  for (const assignment of assignments) {
    for (const q of assignment.questions) {
      if (q.questionType === 'open_ended') continue;
      for (const a of q.answers) {
        if (a.isCorrect !== null || a.flagged) continue;
        const isCorrect = a.selectedAnswer?.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim();
        const childName = assignment.child?.name || assignment.childId;
        console.log(`  ${childName} - ${q.questionText.slice(0, 60)}... → selected=${a.selectedAnswer} correct=${q.correctAnswer} → isCorrect=${isCorrect}`);
        await prisma.answer.update({ where: { id: a.id }, data: { isCorrect } });
        answersFixed++;
      }
    }
  }
  console.log(`\nFixed ${answersFixed} answer(s).\n`);

  // Now recalculate scores for affected assignments
  if (answersFixed > 0) {
    console.log('--- Recalculating assignment scores ---\n');
    for (const assignment of assignments) {
      const freshAnswers = await prisma.answer.findMany({
        where: { question: { assignmentId: assignment.id } },
        include: { question: true },
      });

      const scoredAnswers = freshAnswers.filter(a => {
        if (a.question.questionType === 'open_ended') return a.aiScore !== null;
        return a.isCorrect !== null;
      });

      let totalScore = 0;
      for (const a of scoredAnswers) {
        if (a.question.questionType === 'open_ended') {
          totalScore += (a.aiScore ?? 0);
        } else {
          totalScore += a.isCorrect ? 100 : 0;
        }
      }
      const correctScore = scoredAnswers.length > 0 ? Math.round(totalScore / scoredAnswers.length) : 0;

      if (correctScore === assignment.score) continue;

      const newPoints = calculatePoints(
        assignment.difficulty,
        correctScore,
        assignment.timeLimitMin,
        assignment.child?.grade,
        assignment.grade
      );
      const oldPoints = assignment.pointsAwarded ?? 0;
      const pointsDelta = newPoints - oldPoints;
      const childName = assignment.child?.name || assignment.childId;

      console.log(`  ${childName} - ${assignment.subject} (${assignment.difficulty}): ${assignment.score}% → ${correctScore}%, points ${oldPoints} → ${newPoints}`);

      await prisma.assignment.update({
        where: { id: assignment.id },
        data: { score: correctScore, pointsAwarded: newPoints },
      });

      if (pointsDelta !== 0 && assignment.childId) {
        await prisma.gamification.updateMany({
          where: { childId: assignment.childId },
          data: { totalPoints: { increment: pointsDelta } },
        });
      }

      fixed++;
    }
  }

  console.log(`\nDone. ${fixed} assignment(s) corrected out of ${assignments.length} checked.`);
  await prisma.$disconnect();
}

recalculateScores().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
