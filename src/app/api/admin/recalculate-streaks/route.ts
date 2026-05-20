import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { recalculateStreak } from '@/lib/streak';

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
  if (!adminEmails.includes(user.email.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { childId } = body as { childId?: string };

  if (childId) {
    // Recalculate for a single child
    const result = await recalculateStreak(childId);
    return NextResponse.json({ results: [{ childId, ...result }] });
  }

  // Recalculate for all children
  const children = await prisma.user.findMany({
    where: { role: 'child' },
    select: { id: true, name: true, email: true },
  });

  const results = [];
  for (const child of children) {
    const result = await recalculateStreak(child.id);
    results.push({
      childId: child.id,
      name: child.name,
      email: child.email,
      ...result,
    });
  }

  return NextResponse.json({ results });
}
