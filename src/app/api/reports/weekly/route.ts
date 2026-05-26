import { NextRequest, NextResponse } from 'next/server';
import { getWeeklyReportsToSend } from '@/lib/weekly-report';
import { sendWeeklyReport } from '@/lib/email';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const reports = await getWeeklyReportsToSend();

  const results = await Promise.allSettled(
    reports.map(report => sendWeeklyReport(report))
  );

  const sent = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error(`Failed to send weekly report for ${reports[i].childName} to ${reports[i].parentEmail}:`, r.reason);
    }
  });

  return NextResponse.json({ total: reports.length, sent, failed });
}
