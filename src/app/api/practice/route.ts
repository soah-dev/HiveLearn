import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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
- option_a, option_b, option_c, option_d: four answer options
- correct_answer: "A", "B", "C", or "D"

Return ONLY a JSON array. Ensure questions are age-appropriate and progressively challenging.`;

  try {
    const result = await model.generateContent(prompt);
    let jsonStr = result.response.text() || '';
    const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (jsonMatch) jsonStr = jsonMatch[0];
    const questions = JSON.parse(jsonStr);

    const session = await prisma.practiceSession.create({
      data: {
        childId: user.id,
        grade,
        subject,
        topic: topic?.trim() || null,
        difficulty,
        questions: {
          create: questions.map((q: {
            question_text: string;
            option_a: string;
            option_b: string;
            option_c: string;
            option_d: string;
            correct_answer: string;
          }, i: number) => ({
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
