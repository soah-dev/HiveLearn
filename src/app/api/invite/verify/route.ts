import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  const invite = await prisma.parentChild.findUnique({
    where: { inviteToken: token },
    include: { parent: { select: { name: true } } },
  });

  if (!invite) {
    return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 });
  }

  if (invite.status !== 'pending') {
    return NextResponse.json({ error: 'This invite has already been used' }, { status: 400 });
  }

  if (new Date() > invite.expiresAt) {
    return NextResponse.json({ error: 'This invite has expired' }, { status: 400 });
  }

  return NextResponse.json({
    childEmail: invite.childEmail,
    childName: invite.childName,
    childGrade: invite.childGrade,
    parentName: invite.parent.name || 'Your parent',
  });
}
