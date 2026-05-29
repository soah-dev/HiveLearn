import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decoded = await adminAuth.verifyIdToken(token);

    let user = await prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          firebaseUid: decoded.uid,
          email: decoded.email || '',
          name: decoded.name || decoded.display_name || decoded.email?.split('@')[0] || null,
          image: decoded.picture || null,
        },
      });
    }

    // Auto-link any pending invites for existing children who missed the invite flow
    if (user.role === 'child') {
      const pendingInvites = await prisma.parentChild.findMany({
        where: {
          childEmail: { equals: user.email, mode: 'insensitive' },
          status: 'pending',
          childId: null,
          expiresAt: { gt: new Date() },
        },
      });

      for (const invite of pendingInvites) {
        await prisma.parentChild.update({
          where: { id: invite.id },
          data: { childId: user.id, status: 'active', acceptedAt: new Date() },
        });

        if (!user.grade) {
          await prisma.user.update({
            where: { id: user.id },
            data: { grade: invite.childGrade },
          });
        }
      }

      if (pendingInvites.length > 0) {
        await prisma.gamification.upsert({
          where: { childId: user.id },
          update: {},
          create: { childId: user.id },
        });
        // Re-fetch user with updated grade
        user = await prisma.user.findUnique({ where: { id: user.id } }) || user;
      }
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }
}
