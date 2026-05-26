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

  const children = links.filter(l => l.child).map(l => ({
    ...l.child,
    name: l.childName || l.child!.name || l.child!.email,
    weeklyReportEnabled: l.weeklyReportEnabled,
  }));
  return NextResponse.json({ children });
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'parent') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { childId, grade, weeklyReportEnabled } = await req.json();

  if (!childId) {
    return NextResponse.json({ error: 'childId is required' }, { status: 400 });
  }

  // Verify parent-child link
  const link = await prisma.parentChild.findFirst({
    where: { parentId: user.id, childId, status: 'active' },
  });
  if (!link) return NextResponse.json({ error: 'Not linked' }, { status: 403 });

  // Update grade if provided
  if (grade !== undefined) {
    if (!grade || grade < 1 || grade > 12) {
      return NextResponse.json({ error: 'Grade must be 1-12' }, { status: 400 });
    }
    await prisma.user.update({
      where: { id: childId },
      data: { grade },
    });
  }

  // Update weekly report preference if provided
  if (typeof weeklyReportEnabled === 'boolean') {
    await prisma.parentChild.update({
      where: { id: link.id },
      data: { weeklyReportEnabled },
    });
  }

  return NextResponse.json({ success: true });
}
