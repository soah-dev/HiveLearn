import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { role, inviteToken } = await req.json();

  if (!role || !['parent', 'child'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { role },
  });


  // If child role and invite token provided, link to parent
  if (role === 'child' && inviteToken) {
    const invite = await prisma.parentChild.findUnique({
      where: { inviteToken },
    });

    if (!invite || invite.status !== 'pending' || invite.childId) {
      return NextResponse.json({ error: 'Invalid or already-used invite' }, { status: 400 });
    }

    if (new Date() > invite.expiresAt) {
      return NextResponse.json({ error: 'This invite has expired' }, { status: 400 });
    }

    if (invite.childEmail.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json({ error: 'This invite was sent to a different email address' }, { status: 400 });
    }

    await prisma.parentChild.update({
      where: { id: invite.id },
      data: { childId: user.id, status: 'active', acceptedAt: new Date() },
    });

    // Set child's grade from invite
    await prisma.user.update({
      where: { id: user.id },
      data: { grade: invite.childGrade },
    });

    // Create gamification record for child
    await prisma.gamification.upsert({
      where: { childId: user.id },
      update: {},
      create: { childId: user.id },
    });
  }

  return NextResponse.json({ user: updatedUser });
}
