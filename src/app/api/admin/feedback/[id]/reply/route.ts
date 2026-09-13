import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { sendFeedbackReply } from '@/lib/email';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  const { id } = await params;
  const { response } = await req.json();

  if (!response?.trim()) {
    return NextResponse.json({ error: 'Response is required' }, { status: 400 });
  }

  const feedback = await prisma.feedback.findUnique({
    where: { id },
    include: { user: { select: { name: true, email: true } } },
  });

  if (!feedback) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const updated = await prisma.feedback.update({
    where: { id },
    data: { response: response.trim(), status: 'resolved', respondedAt: new Date() },
  });

  if (feedback.user.email) {
    try {
      await sendFeedbackReply({
        to: feedback.user.email,
        userName: feedback.user.name || 'there',
        originalMessage: feedback.message,
        response: response.trim(),
      });
    } catch (err) {
      console.error('Failed to send feedback reply email:', err);
    }
  }

  return NextResponse.json({
    feedback: {
      id: updated.id,
      status: updated.status,
      response: updated.response,
      respondedAt: updated.respondedAt?.toISOString() ?? null,
    },
  });
}
