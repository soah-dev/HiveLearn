import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { generateSATQuestions } from '@/lib/sat-prompts';

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'child') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!user.satEnabled) {
    return NextResponse.json({ error: 'SAT practice not enabled for your account' }, { status: 403 });
  }

  // Rate limit: max 2 sessions per day
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todayCount = await prisma.sATSession.count({
    where: { childId: user.id, createdAt: { gte: startOfDay } },
  });
  if (todayCount >= 2) {
    return NextResponse.json(
      { error: 'You can only start 2 SAT practice tests per day. Try again tomorrow!' },
      { status: 429 }
    );
  }

  // Create session with 4 modules
  const session = await prisma.sATSession.create({
    data: {
      childId: user.id,
      status: 'not_started',
      modules: {
        create: [
          { section: 'rw', moduleNumber: 1, difficulty: 'standard', numQuestions: 27, timeLimitMin: 32, status: 'not_started' },
          { section: 'rw', moduleNumber: 2, difficulty: 'standard', numQuestions: 27, timeLimitMin: 32, status: 'not_started' },
          { section: 'math', moduleNumber: 1, difficulty: 'standard', numQuestions: 22, timeLimitMin: 35, status: 'not_started' },
          { section: 'math', moduleNumber: 2, difficulty: 'standard', numQuestions: 22, timeLimitMin: 35, status: 'not_started' },
        ],
      },
    },
    include: { modules: true },
  });

  // Generate R&W Module 1 questions
  const rwMod1 = session.modules.find(m => m.section === 'rw' && m.moduleNumber === 1)!;
  let questions;
  try {
    questions = await generateSATQuestions('rw', 27, 'standard', user.id);
  } catch (err) {
    // Clean up the session on generation failure
    await prisma.sATSession.delete({ where: { id: session.id } });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate questions. Please try again.' },
      { status: 503 }
    );
  }

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    await prisma.sATQuestion.create({
      data: {
        moduleId: rwMod1.id,
        questionType: q.question_type,
        passage: q.passage || null,
        questionText: q.question_text,
        optionA: q.option_a,
        optionB: q.option_b,
        optionC: q.option_c,
        optionD: q.option_d,
        correctAnswer: q.correct_answer,
        domain: q.domain,
        orderIndex: i,
      },
    });
  }

  // Update numQuestions to actual count if shortfall occurred
  if (questions.length !== 27) {
    await prisma.sATModule.update({
      where: { id: rwMod1.id },
      data: { numQuestions: questions.length },
    });
  }

  return NextResponse.json({ sessionId: session.id });
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'child') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!user.satEnabled) {
    return NextResponse.json({ error: 'SAT practice not enabled for your account' }, { status: 403 });
  }

  const sessions = await prisma.sATSession.findMany({
    where: { childId: user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true,
      rwScaledScore: true,
      mathScaledScore: true,
      compositeScore: true,
      pointsAwarded: true,
      startedAt: true,
      completedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ sessions });
}
