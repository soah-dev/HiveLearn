import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { sendAssignmentNotification } from '@/lib/email';

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'parent') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { to } = await req.json();

  try {
    await sendAssignmentNotification({
      to: to || user.email,
      childName: 'Test Student',
      parentName: user.name || 'Parent',
      subject: 'Math',
      topic: 'Test Email',
      numQuestions: 5,
      difficulty: 'medium',
    });
    return NextResponse.json({ success: true, sentTo: to || user.email });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
