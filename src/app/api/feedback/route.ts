import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

const VALID_CATEGORIES = ['general', 'bug', 'feature_request'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const message = formData.get('message') as string | null;
  const category = (formData.get('category') as string) || 'general';
  const screenshot = formData.get('screenshot') as File | null;

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
  }

  let screenshotUrl: string | null = null;

  if (screenshot && screenshot.size > 0) {
    if (screenshot.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Screenshot must be under 5MB' }, { status: 400 });
    }

    if (!screenshot.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Store as base64 data URL in the database
    const buffer = await screenshot.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    screenshotUrl = `data:${screenshot.type};base64,${base64}`;
  }

  const feedback = await prisma.feedback.create({
    data: {
      userId: user.id,
      category,
      message: message.trim(),
      screenshotUrl,
    },
  });

  return NextResponse.json({ success: true, id: feedback.id });
}
