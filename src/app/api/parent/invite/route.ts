import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getLinkedChild } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { sendInviteEmail } from '@/lib/email';
import { intInRange, isEmail } from '@/lib/validation';

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'parent') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const childName = typeof body.childName === 'string' ? body.childName.trim() : '';
  const childEmail = typeof body.childEmail === 'string' ? body.childEmail.trim().toLowerCase() : '';
  const childGrade = intInRange(body.childGrade, 1, 12);

  if (!childName || !childEmail || childGrade === null) {
    return NextResponse.json({ error: 'Name, email and grade (1-12) are required' }, { status: 400 });
  }
  if (!isEmail(childEmail)) {
    return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
  }

  // Check if a user with this email already exists and is linked to this parent
  const existingUser = await prisma.user.findFirst({
    where: { email: { equals: childEmail, mode: 'insensitive' } },
  });

  if (existingUser) {
    const existingLink = await getLinkedChild(user.id, existingUser.id);
    if (existingLink) {
      return NextResponse.json({ error: 'This child is already linked to your account' }, { status: 400 });
    }
  }

  // Check for existing pending invite with same email from this parent
  const existingInvite = await prisma.parentChild.findFirst({
    where: { parentId: user.id, childEmail: { equals: childEmail, mode: 'insensitive' }, status: 'pending' },
  });

  if (existingInvite) {
    return NextResponse.json({ error: 'An invite has already been sent to this email' }, { status: 400 });
  }

  const inviteToken = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invite = await prisma.parentChild.create({
    data: {
      parentId: user.id,
      inviteToken,
      childEmail,
      childName,
      childGrade,
      expiresAt,
    },
  });

  try {
    await sendInviteEmail({
      to: childEmail,
      childName,
      parentName: user.name || 'Your parent',
      inviteToken,
    });
  } catch (err) {
    // Clean up the invite if email fails
    await prisma.parentChild.delete({ where: { id: invite.id } });
    console.error('Failed to send invite email:', err);
    return NextResponse.json({ error: 'Failed to send invite email' }, { status: 500 });
  }

  return NextResponse.json({ success: true, invite: { id: invite.id, childName, childEmail, status: invite.status } });
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'parent') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const invites = await prisma.parentChild.findMany({
    where: { parentId: user.id },
    include: { child: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ invites });
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'parent') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Invite ID required' }, { status: 400 });
  }

  const invite = await prisma.parentChild.findFirst({
    where: { id, parentId: user.id, status: 'pending' },
  });

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  }

  await prisma.parentChild.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
