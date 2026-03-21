import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { orderIndex: 'asc' },
        include: {
          answers: true,
        },
      },
      child: { select: { id: true, name: true, image: true } },
      parent: { select: { id: true, name: true } },
    },
  });

  if (!assignment) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Verify access
  if (user.role === 'parent' && assignment.parentId !== user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (user.role === 'child' && assignment.childId !== user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ assignment });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const assignment = await prisma.assignment.findUnique({
    where: { id },
  });

  if (!assignment) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (user.role === 'parent' && assignment.parentId !== user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const updated = await prisma.assignment.update({
    where: { id },
    data: body,
    include: {
      questions: { orderBy: { orderIndex: 'asc' } },
    },
  });

  return NextResponse.json({ assignment: updated });
}
