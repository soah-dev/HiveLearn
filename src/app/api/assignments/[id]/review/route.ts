import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { calculatePoints } from '@/lib/points';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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
}) {
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

  const result = await model.generateContent(prompt);
  const response = result.response;
  let jsonStr = response.text() || '';
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) jsonStr = jsonMatch[0];

  return JSON.parse(jsonStr);
}

async function checkBadges(childId: string) {
  const child = await prisma.user.findUnique({
    where: { id: childId },
    include: {
      receivedAssignments: {
        where: { status: 'reviewed' },
      },
      gamification: true,
      earnedBadges: true,
    },
  });

  if (!child) return;

  const reviewed = child.receivedAssignments;
  const earnedBadgeIds = new Set(child.earnedBadges.map(eb => eb.badgeId));

  const allBadges = await prisma.badge.findMany();
  const badgesToAward: string[] = [];

  for (const badge of allBadges) {
    if (earnedBadgeIds.has(badge.id)) continue;

    let earned = false;
    switch (badge.criteria) {
      case 'first_assignment':
        earned = reviewed.length >= 1;
        break;
      case 'perfect_score':
        earned = reviewed.some(a => a.score === 100);
        break;
      case 'streak_7':
        earned = (child.gamification?.currentStreak || 0) >= 7;
        break;
      case 'streak_30':
        earned = (child.gamification?.currentStreak || 0) >= 30;
        break;
      case 'mastery_math':
      case 'mastery_science':
      case 'mastery_reading':
      case 'mastery_history':
      case 'mastery_english':
      case 'mastery_geography': {
        const subject = badge.criteria.replace('mastery_', '');
        const count = reviewed.filter(a => a.subject === subject && (a.score || 0) >= 80).length;
        earned = count >= 10;
        break;
      }
      case 'speed_demon':
        earned = reviewed.some(a =>
          a.timeLimitMin &&
          a.startedAt &&
          a.submittedAt &&
          (a.score || 0) >= 90 &&
          (new Date(a.submittedAt).getTime() - new Date(a.startedAt).getTime()) <= (a.timeLimitMin * 60 * 1000 * 0.5)
        );
        break;
      case 'hardmode_hero': {
        const hardCount = reviewed.filter(a => a.difficulty === 'hard' && (a.score || 0) >= 80).length;
        earned = hardCount >= 10;
        break;
      }
      case 'points_1000':
        earned = (child.gamification?.totalPoints || 0) >= 1000;
        break;
      case 'all_rounder': {
        const subjects = new Set(reviewed.map(a => a.subject));
        earned = subjects.size >= 5;
        break;
      }
    }

    if (earned) badgesToAward.push(badge.id);
  }

  // Award badges
  for (const badgeId of badgesToAward) {
    await prisma.earnedBadge.create({
      data: { childId, badgeId },
    });
  }

  return badgesToAward;
}

async function updateStreakAndPoints(childId: string, points: number) {
  const today = new Date().toISOString().split('T')[0];

  const gam = await prisma.gamification.upsert({
    where: { childId },
    update: {},
    create: { childId },
  });

  let newStreak = gam.currentStreak;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (gam.lastCompletedDate === yesterdayStr) {
    newStreak += 1;
  } else if (gam.lastCompletedDate !== today) {
    newStreak = 1;
  }

  await prisma.gamification.update({
    where: { childId },
    data: {
      totalPoints: gam.totalPoints + points,
      currentStreak: newStreak,
      longestStreak: Math.max(gam.longestStreak, newStreak),
      lastCompletedDate: today,
    },
  });
}

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
      overallFeedback = 'All questions were flagged by the student. Please review manually.';
    } else {
      const reviewResult = await aiReview(assignment);

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

      overallScore = reviewResult.overall_score;
      overallFeedback = reviewResult.overall_feedback;
      if (flaggedCount > 0) {
        overallFeedback += ` (${flaggedCount} question${flaggedCount > 1 ? 's' : ''} excluded — flagged by student)`;
      }
    }
  }

  // Calculate points
  const points = calculatePoints(assignment.difficulty, overallScore, assignment.timeLimitMin);

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
  await updateStreakAndPoints(assignment.childId, points);

  // Check badges
  await checkBadges(assignment.childId);

  return NextResponse.json({
    score: overallScore,
    feedback: overallFeedback,
    pointsAwarded: points,
  });
}
