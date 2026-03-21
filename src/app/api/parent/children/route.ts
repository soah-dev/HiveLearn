import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'parent') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const links = await prisma.parentChild.findMany({
    where: { parentId: user.id, status: 'active' },
    include: {
      child: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          grade: true,
          gamification: true,
        },
      },
    },
  });

  const children = links.filter(l => l.child).map(l => l.child);
  return NextResponse.json({ children });
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'parent') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { childId, grade } = await req.json();

  if (!childId || !grade || grade < 1 || grade > 12) {
    return NextResponse.json({ error: 'Valid childId and grade (1-12) are required' }, { status: 400 });
  }

  // Verify parent-child link
  const link = await prisma.parentChild.findFirst({
    where: { parentId: user.id, childId, status: 'active' },
  });
  if (!link) return NextResponse.json({ error: 'Not linked' }, { status: 403 });

  const updated = await prisma.user.update({
    where: { id: childId },
    data: { grade },
    select: { id: true, name: true, grade: true },
  });

  return NextResponse.json({ child: updated });
}
