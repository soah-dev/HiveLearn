import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { checkGenerationQuota, quotaExceededMessage } from '@/lib/ai-quota';
import { generateLesson } from '@/lib/lesson-generation';
import { cleanTopic } from '@/lib/lesson';
import { SUBJECTS } from '@/lib/subjects';
import { intInRange } from '@/lib/validation';

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'child') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const grade = intInRange(body.grade, 1, 12);
  const subject = SUBJECTS.find(s => s.value === body.subject)?.value;
  const topic = cleanTopic(body.topic);

  if (grade === null || !subject || !topic) {
    return NextResponse.json({ error: 'A grade from 1-12, a subject and a topic are required' }, { status: 400 });
  }

  // Same floor as practice: lesson practice awards points at the lesson's grade
  if (user.grade && grade < user.grade) {
    return NextResponse.json({ error: `You can only study Grade ${user.grade} and above` }, { status: 400 });
  }

  // Asking for a topic again reopens the saved lesson instead of spending another generation
  const existing = await prisma.studyLesson.findFirst({
    where: { childId: user.id, grade, subject, topic: { equals: topic, mode: 'insensitive' } },
    select: { id: true },
  });
  if (existing) return NextResponse.json({ lesson: existing });

  const quota = await checkGenerationQuota(user.id, user.role);
  if (!quota.allowed) {
    return NextResponse.json({ error: quotaExceededMessage(quota.limit) }, { status: 429 });
  }

  try {
    const { content, usage } = await generateLesson({ grade, subject, topic });

    await prisma.aiUsage.create({
      data: {
        userId: user.id,
        type: 'generation',
        model: usage.model,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
      },
    });

    if (!content) {
      return NextResponse.json({ error: "We can't make a lesson on that. Try a school topic, like one of the ideas above." }, { status: 400 });
    }

    const lesson = await prisma.studyLesson.create({
      data: { childId: user.id, grade, subject, topic, content },
      select: { id: true },
    });

    return NextResponse.json({ lesson });
  } catch (error) {
    console.error('Lesson generation error:', error);
    return NextResponse.json({ error: 'Failed to create the lesson. Please try again.' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'child') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const lessons = await prisma.studyLesson.findMany({
    where: { childId: user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, grade: true, subject: true, topic: true, createdAt: true,
      practiceSessions: { where: { status: 'completed' }, select: { score: true } },
    },
  });

  return NextResponse.json({
    lessons: lessons.map(({ practiceSessions, ...lesson }) => ({
      ...lesson,
      practiceCount: practiceSessions.length,
      bestScore: practiceSessions.length > 0 ? Math.max(...practiceSessions.map(p => p.score ?? 0)) : null,
    })),
  });
}
