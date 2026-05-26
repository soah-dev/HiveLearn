import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

function isAdmin(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
  return adminEmails.includes(email.toLowerCase());
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const children = await prisma.user.findMany({
    where: { role: 'child' },
    select: {
      id: true,
      name: true,
      email: true,
      satEnabled: true,
      parents: {
        where: { status: 'active' },
        select: { parent: { select: { name: true, email: true } } },
        take: 1,
      },
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({
    children: children.map(c => ({
      id: c.id,
      name: c.name,
      email: c.email,
      satEnabled: c.satEnabled,
      parentName: c.parents[0]?.parent.name || null,
      parentEmail: c.parents[0]?.parent.email || null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { childId, enabled } = await req.json();
  if (!childId || typeof enabled !== 'boolean') {
    return NextResponse.json({ error: 'childId and enabled (boolean) required' }, { status: 400 });
  }

  const child = await prisma.user.findUnique({ where: { id: childId } });
  if (!child || child.role !== 'child') {
    return NextResponse.json({ error: 'Child not found' }, { status: 404 });
  }

  await prisma.user.update({
    where: { id: childId },
    data: { satEnabled: enabled },
  });

  return NextResponse.json({ success: true, childId, satEnabled: enabled });
}
