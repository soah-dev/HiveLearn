import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getTodayStr, dayOfWeek, toLocalDateStr } from '@/lib/dates';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'parent') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // "Today" is the app timezone's calendar day, matching streaks and the rest of the app
  const today = getTodayStr();
  const todayDayOfWeek = dayOfWeek(today); // 0=Sunday, 1=Monday...6=Saturday

  const [presets, links] = await Promise.all([
    prisma.assignmentPreset.findMany({
      where: { parentId: user.id, active: true },
      include: { child: { select: { id: true, name: true, email: true } } },
    }),
    prisma.parentChild.findMany({
      where: { parentId: user.id, status: 'active' },
      select: { childId: true, childName: true },
    }),
  ]);

  const childNameMap = new Map(links.filter(l => l.childId).map(l => [l.childId!, l.childName]));

  // Filter presets that are due today (scheduled for today's day and not yet generated today)
  const duePresets = presets.filter(preset => {
    const days = preset.daysOfWeek.split(',').map(Number);
    if (!days.includes(todayDayOfWeek)) return false;

    // Check if already generated today
    if (preset.lastGeneratedAt && toLocalDateStr(preset.lastGeneratedAt) === today) return false;

    return true;
  });

  // Use parent-assigned child names
  for (const p of duePresets) {
    if (p.child && childNameMap.has(p.childId)) {
      p.child.name = childNameMap.get(p.childId) || p.child.name;
    }
  }

  return NextResponse.json({ duePresets, total: duePresets.length });
}
