import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { sendAssignmentNotification } from '@/lib/email';
import { checkGenerationQuota, quotaExceededMessage } from '@/lib/ai-quota';
import { generateQuestions, recentQuestionTexts, AiResponseFormatError } from '@/lib/question-generation';

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'parent') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { presetId } = await req.json();

  const preset = await prisma.assignmentPreset.findFirst({
    where: { id: presetId, parentId: user.id, active: true },
    include: { child: { select: { id: true, name: true, email: true } } },
  });

  if (!preset) {
    return NextResponse.json({ error: 'Preset not found or inactive' }, { status: 404 });
  }

  const quota = await checkGenerationQuota(user.id, user.role);
  if (!quota.allowed) {
    return NextResponse.json({ error: quotaExceededMessage(quota.limit), presetId: preset.id }, { status: 429 });
  }

  const questionTypes = preset.questionTypes.split(',').map(t => t.trim()).filter(Boolean);
  const topic = preset.topic || `${preset.subject} practice`;

  try {
    const avoidQuestions = await recentQuestionTexts(preset.childId, preset.subject, preset.grade);
    const { questions, usage } = await generateQuestions({
      grade: preset.grade,
      subject: preset.subject,
      topic: preset.topic,
      difficulty: preset.difficulty,
      numQuestions: preset.numQuestions,
      questionTypes,
      avoidQuestions,
    });

    await prisma.aiUsage.create({
      data: {
        userId: user.id,
        type: 'generation',
        model: usage.model,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
        assignmentId: null,
      },
    });

    if (questions.length === 0) {
      throw new Error('No valid questions were generated');
    }

    // Create the assignment
    const assignment = await prisma.assignment.create({
      data: {
        parentId: user.id,
        childId: preset.childId,
        grade: preset.grade,
        subject: preset.subject,
        topic,
        difficulty: preset.difficulty,
        numQuestions: questions.length,
        timeLimitMin: preset.timeLimitMin,
        reviewMode: preset.reviewMode,
        questions: {
          create: questions.map((q, i) => ({
            questionType: q.question_type,
            questionText: q.question_text,
            optionA: q.option_a || null,
            optionB: q.option_b || null,
            optionC: q.option_c || null,
            optionD: q.option_d || null,
            correctAnswer: q.correct_answer,
            orderIndex: i,
          })),
        },
      },
      include: { questions: true },
    });

    await prisma.assignmentPreset.update({
      where: { id: preset.id },
      data: { lastGeneratedAt: new Date() },
    });

    try {
      if (preset.child.email) {
        await sendAssignmentNotification({
          to: preset.child.email,
          childName: preset.child.name || 'Student',
          parentName: user.name || 'Your parent',
          subject: preset.subject,
          topic,
          numQuestions: questions.length,
          difficulty: preset.difficulty,
        });
      }
    } catch (err) {
      console.error('Failed to send assignment notification:', err);
    }

    return NextResponse.json({ assignment, presetId: preset.id });
  } catch (error: unknown) {
    console.error('Preset generation error:', error);
    const message = error instanceof AiResponseFormatError
      ? 'AI returned an invalid response format. Please try again.'
      : error instanceof Error ? error.message : 'Failed to generate questions';
    return NextResponse.json({ error: message, presetId: preset.id }, { status: error instanceof AiResponseFormatError ? 502 : 500 });
  }
}
