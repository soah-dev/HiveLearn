import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { generateWithUsage, AiUsageMetadata } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'child') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { grade, subject, topic, difficulty } = await req.json();

  if (!grade || !subject || !difficulty) {
    return NextResponse.json({ error: 'Grade, subject and difficulty are required' }, { status: 400 });
  }

  if (user.grade && grade < user.grade) {
    return NextResponse.json({ error: `You can only practice Grade ${user.grade} and above` }, { status: 400 });
  }

  const topicClause = topic?.trim() ? `on the topic "${topic.trim()}"` : `covering a variety of appropriate topics`;

  const prompt = `Generate 10 multiple choice questions for a grade ${grade} student ${topicClause} in ${subject} at ${difficulty} difficulty.

For each question return:
- question_text: the question
- option_a, option_b, option_c, option_d: four answer options (all must be non-empty)
- correct_answer: MUST be exactly "A", "B", "C", or "D" — the letter of the option that contains the correct answer

CRITICAL RULES:
- Double-check that correct_answer is the letter whose option actually contains the right answer. Do NOT put answer text in correct_answer — only the letter.
- For reading/language arts: If you include a passage, you MUST also include an explicit question after the passage in question_text (e.g. "Read the passage below:\\n\\n[passage]\\n\\nWhat is the main idea of this passage?"). Never leave the question implied — always state what the student is being asked.

Return ONLY a JSON array. Ensure questions are age-appropriate and progressively challenging.`;

  try {
    let validQuestions: Array<{
      question_text: string;
      option_a: string;
      option_b: string;
      option_c: string;
      option_d: string;
      correct_answer: string;
    }> = [];
    let attempts = 0;
    const usageRecords: AiUsageMetadata[] = [];

    while (validQuestions.length < 10 && attempts < 2) {
      attempts++;
      const remaining = 10 - validQuestions.length;
      const genPrompt = attempts === 1
        ? prompt
        : `Generate ${remaining} MORE multiple choice questions for grade ${grade} in ${subject} ${topicClause} at ${difficulty} difficulty. Same format. correct_answer MUST be "A", "B", "C", or "D". Return ONLY a JSON array.`;

      const generateResult = await generateWithUsage(genPrompt);
      usageRecords.push(generateResult.usage);
      let jsonStr = generateResult.text;
      const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
      if (jsonMatch) jsonStr = jsonMatch[0];
      const questions = JSON.parse(jsonStr);

      // Validate each question
      for (const q of questions) {
        const answer = q.correct_answer?.toUpperCase().trim();
        const options: Record<string, string> = { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d };
        if (['A', 'B', 'C', 'D'].includes(answer) && options[answer]) {
          validQuestions.push({ ...q, correct_answer: answer });
        }
      }
    }

    // Use up to 10 valid questions
    validQuestions = validQuestions.slice(0, 10);

    if (validQuestions.length === 0) {
      return NextResponse.json({ error: 'Failed to generate valid questions' }, { status: 500 });
    }

    // Log AI usage
    if (usageRecords.length > 0) {
      const totalUsage = usageRecords.reduce(
        (acc, u) => ({
          promptTokens: acc.promptTokens + u.promptTokens,
          completionTokens: acc.completionTokens + u.completionTokens,
          totalTokens: acc.totalTokens + u.totalTokens,
        }),
        { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      );
      await prisma.aiUsage.create({
        data: {
          userId: user.id,
          type: 'generation',
          model: usageRecords[usageRecords.length - 1]?.model || 'unknown',
          promptTokens: totalUsage.promptTokens,
          completionTokens: totalUsage.completionTokens,
          totalTokens: totalUsage.totalTokens,
        },
      });
    }

    const session = await prisma.practiceSession.create({
      data: {
        childId: user.id,
        grade,
        subject,
        topic: topic?.trim() || null,
        difficulty,
        questions: {
          create: validQuestions.map((q, i) => ({
            questionText: q.question_text,
            optionA: q.option_a,
            optionB: q.option_b,
            optionC: q.option_c,
            optionD: q.option_d,
            correctAnswer: q.correct_answer,
            orderIndex: i,
          })),
        },
      },
      include: { questions: { orderBy: { orderIndex: 'asc' } } },
    });

    return NextResponse.json({ session });
  } catch (error) {
    console.error('Practice generation error:', error);
    return NextResponse.json({ error: 'Failed to generate practice questions' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (user.role === 'child') {
    const sessions = await prisma.practiceSession.findMany({
      where: { childId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ sessions });
  }

  if (user.role === 'parent') {
    const links = await prisma.parentChild.findMany({
      where: { parentId: user.id, status: 'active' },
      select: { childId: true, child: { select: { id: true, name: true } } },
    });
    const childIds = links.map(l => l.childId).filter(Boolean) as string[];
    const sessions = await prisma.practiceSession.findMany({
      where: { childId: { in: childIds } },
      include: { child: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ sessions });
  }

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
