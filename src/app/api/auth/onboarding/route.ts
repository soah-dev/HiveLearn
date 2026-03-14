import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { role, inviteCode } = await req.json();

  if (!role || !['parent', 'child'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { role },
  });

  // If child role and invite code provided, link to parent
  if (role === 'child' && inviteCode) {
    const invite = await prisma.parentChild.findUnique({
      where: { inviteCode },
    });

    if (invite && invite.status === 'pending' && !invite.childId) {
      await prisma.parentChild.update({
        where: { id: invite.id },
        data: { childId: user.id, status: 'active' },
      });

      // Create gamification record for child
      await prisma.gamification.upsert({
        where: { childId: user.id },
        update: {},
        create: { childId: user.id },
      });
    } else {
      return NextResponse.json({ error: 'Invalid or expired invite code' }, { status: 400 });
    }
  }

  return NextResponse.json({ user: updatedUser });
}
