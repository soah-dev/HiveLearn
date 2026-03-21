import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'child') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const assignment = await prisma.assignment.findUnique({ where: { id } });
  if (!assignment || assignment.childId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (assignment.status !== 'pending') {
    return NextResponse.json({ error: 'Assignment already started' }, { status: 400 });
  }

  const updated = await prisma.assignment.update({
    where: { id },
    data: { status: 'in_progress', startedAt: new Date() },
  });

  return NextResponse.json({ assignment: updated });
}
