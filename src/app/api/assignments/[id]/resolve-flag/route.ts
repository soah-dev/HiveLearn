import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { calculatePoints } from '@/lib/points';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'parent') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { questionId, isCorrect, parentComment, aiScore, dismiss } = await req.json();

  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: {
      questions: {
        include: { answers: true },
      },
    },
  });

  if (!assignment || assignment.parentId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Find the flagged answer
  const question = assignment.questions.find(q => q.id === questionId);
  const answer = question?.answers.find(a => a.childId === assignment.childId);

  if (!answer || !answer.flagged) {
    return NextResponse.json({ error: 'Answer is not flagged' }, { status: 400 });
  }

  // Update the answer
  if (dismiss) {
    // Dismiss without changing grade
    await prisma.answer.update({
      where: { id: answer.id },
      data: {
        flagResolvedAt: new Date(),
        parentComment: parentComment || answer.parentComment,
      },
    });
  } else {
    // Override the grade
    await prisma.answer.update({
      where: { id: answer.id },
      data: {
        isCorrect,
        aiScore: aiScore ?? answer.aiScore,
        parentComment: parentComment || null,
        flagResolvedAt: new Date(),
      },
    });
  }

  // Recalculate assignment score from all answers
  const allAnswers = await prisma.answer.findMany({
    where: { question: { assignmentId: id } },
    include: { question: true },
  });

  let totalScore = 0;
  for (const a of allAnswers) {
    if (a.question.questionType === 'open_ended') {
      totalScore += (a.aiScore ?? 0);
    } else {
      totalScore += a.isCorrect ? 100 : 0;
    }
  }
  const newScore = Math.round(totalScore / allAnswers.length);
  const oldPoints = assignment.pointsAwarded ?? 0;
  const newPoints = calculatePoints(assignment.difficulty, newScore, assignment.timeLimitMin);
  const pointsDelta = newPoints - oldPoints;

  // Update assignment score and points
  await prisma.assignment.update({
    where: { id },
    data: { score: newScore, pointsAwarded: newPoints },
  });

  // Adjust gamification points
  if (pointsDelta !== 0) {
    await prisma.gamification.updateMany({
      where: { childId: assignment.childId },
      data: { totalPoints: { increment: pointsDelta } },
    });
  }

  return NextResponse.json({ success: true, newScore, newPoints });
}
