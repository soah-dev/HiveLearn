import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { randomBytes } from 'crypto';

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'parent') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const inviteCode = randomBytes(4).toString('hex').toUpperCase();

  const invite = await prisma.parentChild.create({
    data: {
      parentId: user.id,
      inviteCode,
    },
  });

  return NextResponse.json({ inviteCode: invite.inviteCode });
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'parent') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const invites = await prisma.parentChild.findMany({
    where: { parentId: user.id },
    include: { child: { select: { id: true, name: true, email: true, image: true } } },
  });

  return NextResponse.json({ invites });
}
