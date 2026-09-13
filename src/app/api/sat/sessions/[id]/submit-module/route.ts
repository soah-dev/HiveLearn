import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { isStudentProducedCorrect, getScaledScore, getCompositeScore, calculateSATPoints } from '@/lib/sat-scoring';
import { updateStreakAndPoints } from '@/lib/streak';
import { checkBadges } from '@/lib/badges';
import { isPastTimeLimit } from '@/lib/time-limit';

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
  const { moduleId, answers } = await req.json();

  const session = await prisma.sATSession.findUnique({
    where: { id, childId: user.id },
    include: {
      modules: {
        include: { questions: true },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const mod = session.modules.find(m => m.id === moduleId);
  if (!mod || mod.status !== 'in_progress') {
    return NextResponse.json({ error: 'Module not in progress' }, { status: 400 });
  }

  // Save and grade all answers. If the module's time limit (plus grace) has
  // passed, ignore the posted answers and grade only what was saved in time.
  const late = isPastTimeLimit(mod.startedAt, mod.timeLimitMin);
  let answerMap: Map<string, string | null>;
  if (late) {
    const saved = await prisma.sATAnswer.findMany({
      where: { childId: user.id, questionId: { in: mod.questions.map(q => q.id) } },
      select: { questionId: true, selectedAnswer: true },
    });
    answerMap = new Map(saved.map(a => [a.questionId, a.selectedAnswer]));
  } else {
    const list = Array.isArray(answers) ? answers : [];
    answerMap = new Map(
      (list as Array<{ questionId: string; selectedAnswer: string | null }>)
        .map(a => [a.questionId, typeof a.selectedAnswer === 'string' ? a.selectedAnswer : null])
    );
  }
  let rawScore = 0;

  for (const q of mod.questions) {
    const selected = answerMap.get(q.id) ?? null;
    let isCorrect = false;

    if (selected) {
      if (q.questionType === 'student_produced') {
        isCorrect = isStudentProducedCorrect(selected, q.correctAnswer);
      } else {
        isCorrect = selected.toUpperCase().trim() === q.correctAnswer.toUpperCase().trim();
      }
    }

    if (isCorrect) rawScore++;

    await prisma.sATAnswer.upsert({
      where: { questionId_childId: { questionId: q.id, childId: user.id } },
      update: { selectedAnswer: selected, isCorrect },
      create: { questionId: q.id, childId: user.id, selectedAnswer: selected, isCorrect },
    });
  }

  // Complete the module
  await prisma.sATModule.update({
    where: { id: moduleId },
    data: { status: 'completed', completedAt: new Date(), rawScore },
  });

  // Determine next state
  const section = mod.section;
  const moduleNumber = mod.moduleNumber;

  if (section === 'rw' && moduleNumber === 1) {
    // After R&W Module 1 -> transition to rw_mod2
    await prisma.sATSession.update({ where: { id }, data: { status: 'rw_mod2' } });
    return NextResponse.json({ success: true, rawScore, nextStep: 'rw_mod2' });
  }

  if (section === 'rw' && moduleNumber === 2) {
    // After R&W Module 2 -> break
    await prisma.sATSession.update({
      where: { id },
      data: { status: 'break', breakStartedAt: new Date() },
    });
    return NextResponse.json({ success: true, rawScore, nextStep: 'break' });
  }

  if (section === 'math' && moduleNumber === 1) {
    // After Math Module 1 -> transition to math_mod2
    await prisma.sATSession.update({ where: { id }, data: { status: 'math_mod2' } });
    return NextResponse.json({ success: true, rawScore, nextStep: 'math_mod2' });
  }

  // After Math Module 2 -> calculate scores, award points, complete
  const rwMod1 = session.modules.find(m => m.section === 'rw' && m.moduleNumber === 1)!;
  const rwMod2 = session.modules.find(m => m.section === 'rw' && m.moduleNumber === 2)!;
  const mathMod1 = session.modules.find(m => m.section === 'math' && m.moduleNumber === 1)!;

  const rwScaled = getScaledScore(
    rwMod1.rawScore ?? 0,
    rwMod2.rawScore ?? 0,
    session.rwMod2Difficulty || 'standard',
    rwMod1.numQuestions,
    rwMod2.numQuestions,
  );
  const mathScaled = getScaledScore(
    mathMod1.rawScore ?? 0,
    rawScore,
    session.mathMod2Difficulty || 'standard',
    mathMod1.numQuestions,
    mod.numQuestions,
  );
  const composite = getCompositeScore(rwScaled, mathScaled);
  const points = calculateSATPoints(composite);

  await prisma.sATSession.update({
    where: { id },
    data: {
      status: 'completed',
      completedAt: new Date(),
      rwScaledScore: rwScaled,
      mathScaledScore: mathScaled,
      compositeScore: composite,
      pointsAwarded: points,
    },
  });

  // Award points and update streak
  await updateStreakAndPoints(user.id, points, null, { type: 'sat', id });

  // Check badges
  const newBadges = await checkBadges(user.id);

  return NextResponse.json({
    success: true,
    rawScore,
    nextStep: 'completed',
    rwScaledScore: rwScaled,
    mathScaledScore: mathScaled,
    compositeScore: composite,
    pointsAwarded: points,
    newBadges,
  });
}
