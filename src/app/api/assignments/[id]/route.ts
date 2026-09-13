import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getLinkedChild } from '@/lib/auth';
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

  if (user.role === 'parent') {
    // Any linked parent can view
    const link = await getLinkedChild(user.id, assignment.childId);
    if (!link) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Prefer parent-assigned child name
    if (assignment.child && link.childName) {
      assignment.child.name = link.childName;
    }
    return NextResponse.json({ assignment });
  }

  if (user.role === 'child' && assignment.childId === user.id) {
    // Never send the answer key to the child until the assignment is reviewed
    if (assignment.status !== 'reviewed') {
      return NextResponse.json({
        assignment: {
          ...assignment,
          questions: assignment.questions.map(q => ({ ...q, correctAnswer: undefined })),
        },
      });
    }
    return NextResponse.json({ assignment });
  }

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// NOTE: the former PATCH handler accepted an arbitrary body into
// prisma.assignment.update with no ownership check. It had no callers and was
// removed. Add a field-allowlisted, parent-only handler here if editing is needed.
