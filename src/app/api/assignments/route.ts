import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { sendAssignmentNotification } from '@/lib/email';
import { intInRange, isOneOf, DIFFICULTIES, REVIEW_MODES, QUESTION_TYPES } from '@/lib/validation';

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'parent') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { childId, subject, topic, questions } = body;
  const grade = intInRange(body.grade, 1, 12);
  const difficulty = isOneOf(body.difficulty, DIFFICULTIES) ? body.difficulty : null;
  const reviewMode = isOneOf(body.reviewMode, REVIEW_MODES) ? body.reviewMode : 'ai';
  const timeLimitMin = body.timeLimitMin ? intInRange(body.timeLimitMin, 1, 180) : null;

  if (grade === null || !difficulty || typeof subject !== 'string' || !subject.trim() || typeof topic !== 'string') {
    return NextResponse.json({ error: 'grade (1-12), subject, topic and difficulty (easy/medium/hard) are required' }, { status: 400 });
  }
  if (body.timeLimitMin && timeLimitMin === null) {
    return NextResponse.json({ error: 'timeLimitMin must be between 1 and 180' }, { status: 400 });
  }
  if (!Array.isArray(questions) || questions.length === 0 || questions.length > 20) {
    return NextResponse.json({ error: 'Provide between 1 and 20 questions' }, { status: 400 });
  }
  for (const q of questions) {
    if (!q || typeof q !== 'object' || !isOneOf(q.questionType, QUESTION_TYPES)
        || typeof q.questionText !== 'string' || !q.questionText.trim()
        || typeof q.correctAnswer !== 'string' || !q.correctAnswer.trim()) {
      return NextResponse.json({ error: 'Each question needs a valid type, text and correct answer' }, { status: 400 });
    }
    if (q.questionType === 'multiple_choice' && (!q.optionA || !q.optionB || !q.optionC || !q.optionD)) {
      return NextResponse.json({ error: 'Multiple choice questions need all four options' }, { status: 400 });
    }
  }
  const numQuestions = questions.length;

  // Verify child is linked to parent
  const link = await prisma.parentChild.findFirst({
    where: { parentId: user.id, childId, status: 'active' },
    include: { child: { select: { grade: true } } },
  });
  if (!link) {
    return NextResponse.json({ error: 'Child not linked to parent' }, { status: 400 });
  }

  // Enforce grade floor — cannot assign below the child's grade level
  const childGrade = link.child?.grade ?? 1;
  if (grade < childGrade) {
    return NextResponse.json({ error: `Grade cannot be below the child's grade level (Grade ${childGrade})` }, { status: 400 });
  }

  const assignment = await prisma.assignment.create({
    data: {
      parentId: user.id,
      childId,
      grade,
      subject,
      topic,
      difficulty,
      numQuestions,
      timeLimitMin: timeLimitMin || null,
      reviewMode,
      questions: {
        create: questions.map((q: { questionType: string; questionText: string; optionA?: string; optionB?: string; optionC?: string; optionD?: string; correctAnswer: string }, i: number) => ({
          questionType: q.questionType,
          questionText: q.questionText,
          optionA: q.optionA || null,
          optionB: q.optionB || null,
          optionC: q.optionC || null,
          optionD: q.optionD || null,
          correctAnswer: q.correctAnswer,
          orderIndex: i,
        })),
      },
    },
    include: { questions: true },
  });

  // Send email notification to the child
  try {
    const child = await prisma.user.findUnique({
      where: { id: childId },
      select: { email: true, name: true },
    });

    if (child?.email) {
      await sendAssignmentNotification({
        to: child.email,
        childName: child.name || 'Student',
        parentName: user.name || 'Your parent',
        subject,
        topic,
        numQuestions,
        difficulty,
      });
    }
  } catch (err) {
    console.error('Failed to send assignment notification email:', err);
  }

  return NextResponse.json({ assignment });
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const childId = searchParams.get('childId');
  const status = searchParams.get('status');
  // Optional page size; the dashboards currently load everything, so no default cap
  const limit = intInRange(searchParams.get('limit'), 1, 200);

  const where: Record<string, unknown> = {};

  let childNameMap: Map<string, string> | null = null;

  if (user.role === 'parent') {
    // Show all assignments for children linked to this parent
    const links = await prisma.parentChild.findMany({
      where: { parentId: user.id, status: 'active' },
      select: { childId: true, childName: true },
    });
    const linkedChildIds = links.map(l => l.childId).filter(Boolean) as string[];
    if (childId && !linkedChildIds.includes(childId)) {
      return NextResponse.json({ error: 'Child not linked to parent' }, { status: 403 });
    }
    where.childId = childId ? childId : { in: linkedChildIds };
    childNameMap = new Map(links.filter(l => l.childId).map(l => [l.childId!, l.childName]));
  } else {
    where.childId = user.id;
  }

  if (status) where.status = status;

  // List payload carries no question bodies — the dashboards only need an
  // unresolved-flag count, which comes from a small second query.
  const assignments = await prisma.assignment.findMany({
    where,
    include: {
      child: { select: { id: true, name: true, image: true } },
      parent: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    ...(limit ? { take: limit } : {}),
  });

  const flagged = assignments.length > 0
    ? await prisma.answer.findMany({
        where: {
          flagged: true,
          flagResolvedAt: null,
          question: { assignmentId: { in: assignments.map(a => a.id) } },
        },
        select: { question: { select: { assignmentId: true } } },
      })
    : [];
  const flagCounts = new Map<string, number>();
  for (const f of flagged) {
    const aid = f.question.assignmentId;
    flagCounts.set(aid, (flagCounts.get(aid) || 0) + 1);
  }

  // For parents, prefer the childName set during invite over the user's profile name
  if (childNameMap) {
    for (const a of assignments) {
      if (a.child && childNameMap.has(a.childId)) {
        a.child.name = childNameMap.get(a.childId) || a.child.name;
      }
    }
  }

  return NextResponse.json({
    assignments: assignments.map(a => ({ ...a, unresolvedFlagCount: flagCounts.get(a.id) || 0 })),
  });
}
