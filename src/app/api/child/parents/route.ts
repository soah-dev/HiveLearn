import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'child') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const links = await prisma.parentChild.findMany({
    where: { childId: user.id, status: 'active' },
    include: {
      parent: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  const parents = links.map(l => l.parent);
  return NextResponse.json({ parents });
}
