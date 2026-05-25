import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'parent') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const todayDayOfWeek = now.getDay(); // 0=Sunday, 1=Monday...6=Saturday
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const presets = await prisma.assignmentPreset.findMany({
    where: { parentId: user.id, active: true },
    include: { child: { select: { id: true, name: true, email: true } } },
  });

  // Filter presets that are due today (scheduled for today's day and not yet generated today)
  const duePresets = presets.filter(preset => {
    const days = preset.daysOfWeek.split(',').map(Number);
    if (!days.includes(todayDayOfWeek)) return false;

    // Check if already generated today
    if (preset.lastGeneratedAt && preset.lastGeneratedAt >= todayStart) return false;

    return true;
  });

  return NextResponse.json({ duePresets, total: duePresets.length });
}
