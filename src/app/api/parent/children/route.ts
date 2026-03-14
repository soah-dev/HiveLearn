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
          gamification: true,
        },
      },
    },
  });

  const children = links.filter(l => l.child).map(l => l.child);
  return NextResponse.json({ children });
}
