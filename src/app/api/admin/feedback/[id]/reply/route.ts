import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { sendFeedbackReply } from '@/lib/email';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
  if (!adminEmails.includes(user.email.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

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
