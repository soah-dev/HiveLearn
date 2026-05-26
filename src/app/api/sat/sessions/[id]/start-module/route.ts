import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { generateSATQuestions } from '@/lib/sat-prompts';
import { getModule2Difficulty } from '@/lib/sat-scoring';

// State machine: valid transitions
const validTransitions: Record<string, { section: string; moduleNumber: number }> = {
  not_started: { section: 'rw', moduleNumber: 1 },
  rw_mod1: { section: 'rw', moduleNumber: 1 }, // already in progress, allow re-entry
  rw_mod2: { section: 'rw', moduleNumber: 2 },
  break: { section: 'math', moduleNumber: 1 }, // handled by end-break
  math_mod1: { section: 'math', moduleNumber: 1 },
  math_mod2: { section: 'math', moduleNumber: 2 },
};

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
  const { section, moduleNumber } = await req.json();

  const session = await prisma.sATSession.findUnique({
    where: { id, childId: user.id },
    include: { modules: { include: { questions: true } } },
  });

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Validate state machine
  const expected = validTransitions[session.status];
  if (!expected || (expected.section !== section || expected.moduleNumber !== moduleNumber)) {
    // Allow starting current module if it's already the active one
    const currentStatus = session.status;
    const isReEntry = (
      (currentStatus === 'rw_mod1' && section === 'rw' && moduleNumber === 1) ||
      (currentStatus === 'rw_mod2' && section === 'rw' && moduleNumber === 2) ||
      (currentStatus === 'math_mod1' && section === 'math' && moduleNumber === 1) ||
      (currentStatus === 'math_mod2' && section === 'math' && moduleNumber === 2)
    );
    if (!isReEntry) {
      return NextResponse.json({ error: `Cannot start ${section} module ${moduleNumber} in state ${session.status}` }, { status: 400 });
    }
  }

  const targetModule = session.modules.find(m => m.section === section && m.moduleNumber === moduleNumber);
  if (!targetModule) {
    return NextResponse.json({ error: 'Module not found' }, { status: 404 });
  }

  // If module already in progress, just return success
  if (targetModule.status === 'in_progress') {
    return NextResponse.json({ success: true, moduleId: targetModule.id });
  }

  // If this is Module 2, grade Module 1 first and set adaptive difficulty + generate questions
  if (moduleNumber === 2) {
    const mod1 = session.modules.find(m => m.section === section && m.moduleNumber === 1);
    if (!mod1 || mod1.status !== 'completed') {
      return NextResponse.json({ error: 'Module 1 must be completed first' }, { status: 400 });
    }

    const mod1Total = mod1.numQuestions;
    const mod1Raw = mod1.rawScore ?? 0;
    const difficulty = getModule2Difficulty(mod1Raw, mod1Total);

    // Update module difficulty
    await prisma.sATModule.update({
      where: { id: targetModule.id },
      data: { difficulty },
    });

    // Update session with mod2 difficulty
    if (section === 'rw') {
      await prisma.sATSession.update({ where: { id }, data: { rwMod2Difficulty: difficulty } });
    } else {
      await prisma.sATSession.update({ where: { id }, data: { mathMod2Difficulty: difficulty } });
    }

    // Generate Module 2 questions if not already generated
    if (targetModule.questions.length === 0) {
      const numQ = section === 'rw' ? 27 : 22;
      let questions;
      try {
        questions = await generateSATQuestions(section as 'rw' | 'math', numQ, difficulty, user.id);
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
            moduleId: targetModule.id,
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
      if (questions.length !== numQ) {
        await prisma.sATModule.update({
          where: { id: targetModule.id },
          data: { numQuestions: questions.length },
        });
      }
    }
  }

  // Start the module
  const now = new Date();
  await prisma.sATModule.update({
    where: { id: targetModule.id },
    data: { status: 'in_progress', startedAt: now },
  });

  // Update session status and startedAt
  const statusMap: Record<string, string> = {
    'rw-1': 'rw_mod1',
    'rw-2': 'rw_mod2',
    'math-1': 'math_mod1',
    'math-2': 'math_mod2',
  };
  const newStatus = statusMap[`${section}-${moduleNumber}`];
  const updateData: Record<string, unknown> = { status: newStatus };
  if (!session.startedAt) updateData.startedAt = now;

  await prisma.sATSession.update({ where: { id }, data: updateData });

  return NextResponse.json({ success: true, moduleId: targetModule.id });
}
