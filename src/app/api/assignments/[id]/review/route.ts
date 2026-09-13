import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getLinkedChild } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { calculatePoints } from '@/lib/points';
import { checkBadges } from '@/lib/badges';
import { updateStreakAndPoints } from '@/lib/streak';
import { generateWithUsage, AiUsageMetadata } from '@/lib/gemini';

async function aiReview(assignment: {
  grade: number;
  subject: string;
  topic: string;
  difficulty: string;
  questions: Array<{
    id: string;
    questionType: string;
    questionText: string;
    correctAnswer: string;
    answers: Array<{ selectedAnswer: string | null; flagged: boolean }>;
  }>;
}): Promise<{ answers: AiAnswerReview[]; overall_feedback: string; usage: AiUsageMetadata }> {
  // Only review non-flagged questions
  const reviewableQuestions = assignment.questions.filter(q => !q.answers[0]?.flagged);

  // Objective question types are graded deterministically by exact match; the
  // model is told the verdict and only asked to explain. It scores open-ended
  // answers against the rubric.
  const questionsWithAnswers = reviewableQuestions.map((q, i) => ({
    index: i + 1,
    question_id: q.id,
    question_type: q.questionType,
    question_text: q.questionText,
    correct_answer: q.correctAnswer,
    student_answer: q.answers[0]?.selectedAnswer || '(no answer)',
    ...(q.questionType !== 'open_ended'
      ? { auto_graded_correct: isExactMatch(q.answers[0]?.selectedAnswer, q.correctAnswer) }
      : {}),
  }));

  const prompt = `Review this grade ${assignment.grade} student's ${assignment.subject} assignment on "${assignment.topic}" (${assignment.difficulty} difficulty).

Questions and answers:
${JSON.stringify(questionsWithAnswers, null, 2)}

For each answer:
- If auto_graded_correct is present, that verdict is final — do NOT change it. Just write a brief, encouraging explanation (why the answer is right, or what the correct answer is and why).
- For open_ended questions, score 0-100 against the rubric in correct_answer and explain.

Then provide a 2-3 sentence motivational summary highlighting strengths and areas to improve.

Return ONLY JSON in this format: { "answers": [{ "question_id": "...", "is_correct": true/false, "ai_score": null or 0-100, "ai_explanation": "..." }], "overall_feedback": "..." }`;

  const generateResult = await generateWithUsage(prompt);
  let jsonStr = generateResult.text;
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) jsonStr = jsonMatch[0];

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new AiResponseError('AI returned malformed JSON');
  }
  if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as { answers?: unknown }).answers)) {
    throw new AiResponseError('AI response was missing the answers list');
  }
  const p = parsed as { answers: unknown[]; overall_feedback?: unknown };
  const answers: AiAnswerReview[] = p.answers
    .filter((a): a is Record<string, unknown> => !!a && typeof a === 'object' && typeof (a as { question_id?: unknown }).question_id === 'string')
    .map(a => ({
      question_id: a.question_id as string,
      is_correct: a.is_correct === true,
      ai_score: typeof a.ai_score === 'number' ? Math.max(0, Math.min(100, Math.round(a.ai_score))) : null,
      ai_explanation: typeof a.ai_explanation === 'string' ? a.ai_explanation : '',
    }));

  return {
    answers,
    overall_feedback: typeof p.overall_feedback === 'string' ? p.overall_feedback : '',
    usage: generateResult.usage,
  };
}

interface AiAnswerReview {
  question_id: string;
  is_correct: boolean;
  ai_score: number | null;
  ai_explanation: string;
}

class AiResponseError extends Error {}

function isExactMatch(selected: string | null | undefined, correct: string): boolean {
  return (selected ?? '').toLowerCase().trim() === correct.toLowerCase().trim();
}


// Streak logic moved to @/lib/streak

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { orderIndex: 'asc' },
        include: { answers: true },
      },
    },
  });

  if (!assignment) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Only a parent linked to this child may trigger a review (AI or manual).
  // The child must not be able to grade their own work, and unrelated users
  // must not be able to spend AI quota on someone else's assignment.
  if (user.role !== 'parent' || !(await getLinkedChild(user.id, assignment.childId))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (assignment.status !== 'submitted') {
    return NextResponse.json({ error: 'Assignment not submitted yet' }, { status: 400 });
  }

  let overallScore: number;
  let overallFeedback: string;
  let questionsGraded: number = assignment.questions.length;

  if (body.mode === 'parent' || assignment.reviewMode === 'parent') {
    // Parent provides per-question feedback and marks
    for (const review of (Array.isArray(body.reviews) ? body.reviews : [])) {
      await prisma.answer.updateMany({
        where: { questionId: review.questionId, childId: assignment.childId },
        data: {
          isCorrect: typeof review.isCorrect === 'boolean' ? review.isCorrect : null,
          parentComment: review.comment || null,
          // `?? null` keeps a legitimate score of 0 instead of dropping it
          aiScore: typeof review.score === 'number' ? Math.max(0, Math.min(100, Math.round(review.score))) : null,
        },
      });
    }

    const rawScore = Number(body.overallScore);
    overallScore = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, Math.round(rawScore))) : 0;
    overallFeedback = body.parentComment || '';
  } else {
    // AI auto-review — skip flagged questions
    const flaggedCount = assignment.questions.filter(q => q.answers[0]?.flagged).length;

    if (flaggedCount === assignment.questions.length) {
      // All questions flagged — no scoring possible
      overallScore = 0;
      questionsGraded = 0;
      overallFeedback = 'All questions were flagged by the student. Please review manually.';
    } else {
      let reviewResult: Awaited<ReturnType<typeof aiReview>>;
      try {
        reviewResult = await aiReview(assignment);
      } catch (err) {
        console.error('AI review failed:', err);
        const message = err instanceof AiResponseError
          ? 'AI returned an invalid response. Please try again.'
          : 'AI review is temporarily unavailable. Please try again.';
        return NextResponse.json({ error: message }, { status: 502 });
      }
      const reviewableQuestions = assignment.questions.filter(q => !q.answers[0]?.flagged);
      const aiById = new Map(reviewResult.answers.map(a => [a.question_id, a]));

      // Log token usage
      await prisma.aiUsage.create({
        data: {
          userId: user.id,
          type: 'review',
          model: reviewResult.usage.model,
          promptTokens: reviewResult.usage.promptTokens,
          completionTokens: reviewResult.usage.completionTokens,
          totalTokens: reviewResult.usage.totalTokens,
          assignmentId: id,
        },
      });

      // Persist per-question results. Objective types always use the exact-match
      // verdict; the AI contributes explanations, and scores for open-ended only.
      let totalScore = 0;
      let scoredCount = 0;
      for (const q of reviewableQuestions) {
        const aiResult = aiById.get(q.id);
        if (q.questionType === 'open_ended') {
          const score = aiResult?.ai_score ?? null;
          await prisma.answer.updateMany({
            where: { questionId: q.id, childId: assignment.childId },
            data: {
              isCorrect: aiResult ? aiResult.is_correct : null,
              aiExplanation: aiResult?.ai_explanation || null,
              aiScore: score,
            },
          });
          if (score !== null) {
            totalScore += score;
            scoredCount++;
          }
        } else {
          const isCorrect = isExactMatch(q.answers[0]?.selectedAnswer, q.correctAnswer);
          await prisma.answer.updateMany({
            where: { questionId: q.id, childId: assignment.childId },
            data: {
              isCorrect,
              aiExplanation: aiResult?.ai_explanation || null,
              aiScore: null,
            },
          });
          totalScore += isCorrect ? 100 : 0;
          scoredCount++;
        }
      }
      overallScore = scoredCount > 0 ? Math.round(totalScore / scoredCount) : 0;
      questionsGraded = scoredCount;
      overallFeedback = reviewResult.overall_feedback;
      if (flaggedCount > 0) {
        overallFeedback += ` (${flaggedCount} question${flaggedCount > 1 ? 's' : ''} excluded — flagged by student)`;
      }
    }
  }

  // Calculate points
  const child = await prisma.user.findUnique({ where: { id: assignment.childId }, select: { grade: true } });
  const points = calculatePoints(assignment.difficulty, overallScore, assignment.timeLimitMin, child?.grade, assignment.grade, questionsGraded);

  // Update assignment
  await prisma.assignment.update({
    where: { id },
    data: {
      status: 'reviewed',
      score: overallScore,
      aiFeedback: overallFeedback,
      parentComment: body.parentComment || null,
      pointsAwarded: points,
      reviewedAt: new Date(),
    },
  });

  // Update streak and points
  await updateStreakAndPoints(assignment.childId, points, assignment.submittedAt, { type: 'assignment', id: assignment.id });

  // Check badges
  await checkBadges(assignment.childId);

  return NextResponse.json({
    score: overallScore,
    feedback: overallFeedback,
    pointsAwarded: points,
  });
}
