import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { generateSATQuestions } from '@/lib/sat-prompts';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'child') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!user.satEnabled) {
    return NextResponse.json({ error: 'SAT practice not enabled for your account' }, { status: 403 });
  }

  const { id } = await params;

  const session = await prisma.sATSession.findUnique({
    where: { id, childId: user.id },
    include: { modules: { include: { questions: true } } },
  });

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  if (session.status !== 'break') {
    return NextResponse.json({ error: 'Session is not in break state' }, { status: 400 });
  }

  // Generate Math Module 1 questions if not already generated
  const mathMod1 = session.modules.find(m => m.section === 'math' && m.moduleNumber === 1)!;
  if (mathMod1.questions.length === 0) {
    let questions;
    try {
      questions = await generateSATQuestions('math', 22, 'standard', user.id);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Failed to generate questions. Please try again.' },
        { status: 503 }
      );
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await prisma.sATQuestion.create({
        data: {
          moduleId: mathMod1.id,
          questionType: q.question_type,
          passage: null,
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
    if (questions.length !== 22) {
      await prisma.sATModule.update({
        where: { id: mathMod1.id },
        data: { numQuestions: questions.length },
      });
    }
  }

  // Transition to math_mod1
  await prisma.sATSession.update({
    where: { id },
    data: { status: 'math_mod1' },
  });

  return NextResponse.json({ success: true });
}
