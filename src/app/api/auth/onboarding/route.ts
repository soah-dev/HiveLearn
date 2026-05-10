import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { role, inviteToken } = await req.json();

  // If existing child is accepting a new parent invite
  if (user.role === 'child' && inviteToken) {
    return handleExistingChildInvite(user, inviteToken);
  }

  // If user is already a parent, they can't accept child invites
  if (user.role === 'parent' && role === 'child') {
    return NextResponse.json({ error: 'You are signed in as a parent. Sign in with your child account to accept this invite.' }, { status: 400 });
  }

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

async function handleExistingChildInvite(user: { id: string; email: string; role: string | null; grade?: number | null }, inviteToken: string) {
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

  // Check if already linked to this parent
  const existingLink = await prisma.parentChild.findFirst({
    where: { parentId: invite.parentId, childId: user.id, status: 'active' },
  });
  if (existingLink) {
    return NextResponse.json({ error: 'You are already linked to this parent' }, { status: 400 });
  }

  // Accept the invite — link child to new parent
  await prisma.parentChild.update({
    where: { id: invite.id },
    data: { childId: user.id, status: 'active', acceptedAt: new Date() },
  });

  // Only set grade if child doesn't have one yet
  if (!user.grade) {
    await prisma.user.update({
      where: { id: user.id },
      data: { grade: invite.childGrade },
    });
  }

  // Ensure gamification record exists
  await prisma.gamification.upsert({
    where: { childId: user.id },
    update: {},
    create: { childId: user.id },
  });

  const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
  return NextResponse.json({ user: updatedUser });
}
