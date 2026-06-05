import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
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
}): Promise<{ answers: Array<{ question_id: string; is_correct: boolean; ai_score: number | null; ai_explanation: string }>; overall_score: number; overall_feedback: string; usage: AiUsageMetadata }> {
  // Only review non-flagged questions
  const reviewableQuestions = assignment.questions.filter(q => !q.answers[0]?.flagged);

  const questionsWithAnswers = reviewableQuestions.map((q, i) => ({
    index: i + 1,
    question_id: q.id,
    question_type: q.questionType,
    question_text: q.questionText,
    correct_answer: q.correctAnswer,
    student_answer: q.answers[0]?.selectedAnswer || '(no answer)',
  }));

  const prompt = `Review this grade ${assignment.grade} student's ${assignment.subject} assignment on "${assignment.topic}" (${assignment.difficulty} difficulty).

Questions and answers:
${JSON.stringify(questionsWithAnswers, null, 2)}

For each answer:
- Mark if correct/incorrect (for open-ended, score 0-100 based on the rubric)
- Provide a brief, encouraging explanation

Then provide:
- Overall score (percentage)
- 2-3 sentence motivational summary highlighting strengths and areas to improve

Return ONLY JSON in this format: { "answers": [{ "question_id": "...", "is_correct": true/false, "ai_score": null or 0-100, "ai_explanation": "..." }], "overall_score": 85, "overall_feedback": "..." }`;

  const generateResult = await generateWithUsage(prompt);
  let jsonStr = generateResult.text;
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) jsonStr = jsonMatch[0];

  const parsed = JSON.parse(jsonStr);
  return { ...parsed, usage: generateResult.usage };
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

  if (assignment.status !== 'submitted') {
    return NextResponse.json({ error: 'Assignment not submitted yet' }, { status: 400 });
  }

  let overallScore: number;
  let overallFeedback: string;
  let questionsGraded: number = assignment.questions.length;

  if (body.mode === 'parent' || assignment.reviewMode === 'parent') {
    // Parent review mode — any linked parent can review
    if (user.role !== 'parent') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const parentLink = await prisma.parentChild.findFirst({
      where: { parentId: user.id, childId: assignment.childId, status: 'active' },
    });
    if (!parentLink) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parent provides per-question feedback and marks
    for (const review of (body.reviews || [])) {
      await prisma.answer.updateMany({
        where: { questionId: review.questionId, childId: assignment.childId },
        data: {
          isCorrect: review.isCorrect,
          parentComment: review.comment || null,
          aiScore: review.score || null,
        },
      });
    }

    overallScore = body.overallScore || 0;
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
      const reviewResult = await aiReview(assignment);
      const reviewableQuestions = assignment.questions.filter(q => !q.answers[0]?.flagged);

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

      for (const ans of reviewResult.answers) {
        await prisma.answer.updateMany({
          where: { questionId: ans.question_id, childId: assignment.childId },
          data: {
            isCorrect: ans.is_correct,
            aiExplanation: ans.ai_explanation,
            aiScore: ans.ai_score || null,
          },
        });
      }

      // Fallback-grade any non-flagged, non-open-ended questions the AI didn't return results for
      const aiReviewedIds = new Set(reviewResult.answers.map((a: { question_id: string }) => a.question_id));
      for (const q of reviewableQuestions) {
        if (q.questionType === 'open_ended' || aiReviewedIds.has(q.id)) continue;
        const childAnswer = q.answers[0]?.selectedAnswer;
        const isCorrect = childAnswer?.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim();
        await prisma.answer.updateMany({
          where: { questionId: q.id, childId: assignment.childId },
          data: { isCorrect },
        });
      }

      // Calculate score from all reviewable questions (AI-reviewed + fallback-graded)
      let totalScore = 0;
      let scoredCount = 0;
      for (const q of reviewableQuestions) {
        const aiResult = reviewResult.answers.find((a: { question_id: string }) => a.question_id === q.id);
        if (q.questionType === 'open_ended') {
          const score = aiResult?.ai_score;
          if (score !== null && score !== undefined) {
            totalScore += score;
            scoredCount++;
          }
        } else {
          const isCorrect = aiResult
            ? aiResult.is_correct
            : (q.answers[0]?.selectedAnswer?.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim());
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
