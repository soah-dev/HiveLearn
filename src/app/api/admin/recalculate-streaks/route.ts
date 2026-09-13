import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { recalculateStreak } from '@/lib/streak';

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

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
