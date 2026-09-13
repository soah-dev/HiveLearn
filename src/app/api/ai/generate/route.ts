import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { checkGenerationQuota, quotaExceededMessage } from '@/lib/ai-quota';
import { generateQuestions, recentQuestionTexts, AiResponseFormatError } from '@/lib/question-generation';
import { intInRange, isOneOf, DIFFICULTIES, QUESTION_TYPES } from '@/lib/validation';

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'parent') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { childId, subject, topic, questionTypes } = body;
  const grade = intInRange(body.grade, 1, 12);
  const numQuestions = intInRange(body.numQuestions, 1, 20);
  const difficulty = isOneOf(body.difficulty, DIFFICULTIES) ? body.difficulty : null;

  if (grade === null || !difficulty || typeof subject !== 'string' || !subject.trim()) {
    return NextResponse.json({ error: 'grade (1-12), subject and difficulty (easy/medium/hard) are required' }, { status: 400 });
  }
  if (numQuestions === null) {
    return NextResponse.json({ error: 'numQuestions must be between 1 and 20' }, { status: 400 });
  }
  if (!Array.isArray(questionTypes) || questionTypes.length === 0 || !questionTypes.every(t => isOneOf(t, QUESTION_TYPES))) {
    return NextResponse.json({ error: 'questionTypes must be a non-empty array of known types' }, { status: 400 });
  }

  const quota = await checkGenerationQuota(user.id, user.role);
  if (!quota.allowed) {
    return NextResponse.json({ error: quotaExceededMessage(quota.limit) }, { status: 429 });
  }

  // Enforce grade floor — cannot generate below the child's grade level
  let avoidQuestions: string[] = [];
  if (childId) {
    const link = await prisma.parentChild.findFirst({
      where: { parentId: user.id, childId, status: 'active' },
      include: { child: { select: { grade: true } } },
    });
    const childGrade = link?.child?.grade ?? 1;
    if (grade < childGrade) {
      return NextResponse.json({ error: `Grade cannot be below the child's grade level (Grade ${childGrade})` }, { status: 400 });
    }
    // Per-child exclusion list so the model avoids repeating across sessions
    avoidQuestions = await recentQuestionTexts(childId, subject, grade);
  }

  try {
    // Higher temperature for more structural/content variety across sessions
    const { questions, usage } = await generateQuestions(
      { grade, subject, topic, difficulty, numQuestions, questionTypes, avoidQuestions },
      { generationConfig: { temperature: 0.95, topP: 0.95 } },
    );

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

    // May be fewer than requested if validation kept failing
    return NextResponse.json({ questions });
  } catch (error: unknown) {
    console.error('AI generation error:', error);

    let message = 'Failed to generate questions';
    let status = 500;

    if (error instanceof AiResponseFormatError) {
      message = 'AI returned an invalid response format. Please try again.';
      status = 502;
    } else if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('503') || msg.includes('service unavailable') || msg.includes('high demand')) {
        message = 'AI service is temporarily overloaded. Please wait a moment and try again.';
        status = 503;
      } else if (msg.includes('rate') || msg.includes('quota') || msg.includes('429')) {
        message = 'AI rate limit reached. Please wait a moment and try again.';
        status = 429;
      } else if (msg.includes('safety') || msg.includes('blocked') || msg.includes('filter')) {
        message = 'AI content filter blocked the request. Try a different topic or question type.';
        status = 400;
      } else if (msg.includes('timeout') || msg.includes('deadline')) {
        message = 'AI request timed out. Please try again.';
        status = 504;
      } else {
        message = `AI generation failed: ${error.message}`;
      }
    }

    return NextResponse.json({ error: message }, { status });
  }
}
