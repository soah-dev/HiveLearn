import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';

/** Fetch one feedback item's screenshot (a data URL) on demand. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  const { id } = await params;
  const feedback = await prisma.feedback.findUnique({ where: { id }, select: { screenshotUrl: true } });
  if (!feedback) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ screenshotUrl: feedback.screenshotUrl });
}
