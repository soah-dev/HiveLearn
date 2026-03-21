import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

function calculatePoints(difficulty: string, score: number): number {
  const base = difficulty === 'easy' ? 10 : difficulty === 'medium' ? 20 : 30;
  let bonus = 1;
  if (score >= 90) bonus = 1.5;
  else if (score >= 80) bonus = 1.25;
  else if (score >= 70) bonus = 1.1;
  return Math.round(base * bonus * (score / 100));
}

async function updateStreakAndPoints(childId: string, points: number) {
  const today = new Date().toISOString().split('T')[0];

  const gam = await prisma.gamification.upsert({
    where: { childId },
    update: {},
    create: { childId },
  });

  let newStreak = gam.currentStreak;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (gam.lastCompletedDate === yesterdayStr) {
    newStreak += 1;
  } else if (gam.lastCompletedDate !== today) {
    newStreak = 1;
  }

  await prisma.gamification.update({
    where: { childId },
    data: {
      totalPoints: gam.totalPoints + points,
      currentStreak: newStreak,
      longestStreak: Math.max(gam.longestStreak, newStreak),
      lastCompletedDate: today,
    },
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'child') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { answers } = await req.json();

  const session = await prisma.practiceSession.findUnique({
    where: { id },
    include: { questions: true },
  });

  if (!session || session.childId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (session.status === 'completed') {
    return NextResponse.json({ error: 'Session already completed' }, { status: 400 });
  }

  // Save answers and grade
  let correct = 0;
  for (const ans of answers) {
    const question = session.questions.find(q => q.id === ans.questionId);
    if (!question) continue;

    const isCorrect = ans.selectedAnswer?.toUpperCase().trim() === question.correctAnswer.toUpperCase().trim();
    if (isCorrect) correct++;

    await prisma.practiceAnswer.upsert({
      where: { questionId_childId: { questionId: ans.questionId, childId: user.id } },
      update: { selectedAnswer: ans.selectedAnswer, isCorrect },
      create: { sessionId: id, questionId: ans.questionId, childId: user.id, selectedAnswer: ans.selectedAnswer, isCorrect },
    });
  }

  const score = Math.round((correct / session.questions.length) * 100);
  const points = calculatePoints(session.difficulty, score);

  await prisma.practiceSession.update({
    where: { id },
    data: { status: 'completed', score, pointsAwarded: points, completedAt: new Date() },
  });

  await updateStreakAndPoints(user.id, points);

  return NextResponse.json({ score, pointsAwarded: points, correct, total: session.questions.length });
}
