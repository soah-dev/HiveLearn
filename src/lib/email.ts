import { Resend } from 'resend';
import { WeeklyReportData } from './weekly-report';

if (!process.env.RESEND_API_KEY) {
  console.warn('RESEND_API_KEY is not set — emails will not be sent');
}

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

export async function sendInviteEmail({
  to,
  childName,
  parentName,
  inviteToken,
}: {
  to: string;
  childName: string;
  parentName: string;
  inviteToken: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const inviteLink = `${appUrl}/invite/${inviteToken}`;

  await resend.emails.send({
    from: `HiveExcel <${FROM_EMAIL}>`,
    to,
    subject: `${parentName} invited you to HiveExcel!`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #4f46e5; margin: 0; font-size: 28px;">HiveExcel</h1>
        </div>
        <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 32px;">
          <h2 style="color: #111827; margin: 0 0 8px;">Hi ${childName}!</h2>
          <p style="color: #6b7280; line-height: 1.6;">
            <strong>${parentName}</strong> has invited you to join HiveExcel. Click the button below to create your account and get started with your assignments.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${inviteLink}" style="background: #4f46e5; color: #ffffff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
              Join HiveExcel
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 13px; text-align: center;">
            This invite expires in 7 days.
          </p>
        </div>
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
          If you didn&rsquo;t expect this email, you can safely ignore it.
        </p>
      </div>
    `,
  });
}

export async function sendAssignmentNotification({
  to,
  childName,
  parentName,
  subject,
  topic,
  numQuestions,
  difficulty,
}: {
  to: string;
  childName: string;
  parentName: string;
  subject: string;
  topic: string;
  numQuestions: number;
  difficulty: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  await resend.emails.send({
    from: `HiveExcel <${FROM_EMAIL}>`,
    to,
    subject: `You have a new ${subject} assignment`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #4f46e5; margin: 0; font-size: 28px;">HiveExcel</h1>
        </div>
        <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 32px;">
          <h2 style="color: #111827; margin: 0 0 8px;">Hi ${childName}!</h2>
          <p style="color: #6b7280; line-height: 1.6;">
            <strong>${parentName}</strong> has assigned you new homework. Here are the details:
          </p>
          <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="color: #6b7280; padding: 6px 0; font-size: 14px;">Subject</td>
                <td style="color: #111827; padding: 6px 0; font-weight: 600; text-align: right; font-size: 14px;">${subject}</td>
              </tr>
              <tr>
                <td style="color: #6b7280; padding: 6px 0; font-size: 14px;">Topic</td>
                <td style="color: #111827; padding: 6px 0; font-weight: 600; text-align: right; font-size: 14px;">${topic}</td>
              </tr>
              <tr>
                <td style="color: #6b7280; padding: 6px 0; font-size: 14px;">Questions</td>
                <td style="color: #111827; padding: 6px 0; font-weight: 600; text-align: right; font-size: 14px;">${numQuestions}</td>
              </tr>
              <tr>
                <td style="color: #6b7280; padding: 6px 0; font-size: 14px;">Difficulty</td>
                <td style="color: #111827; padding: 6px 0; font-weight: 600; text-align: right; font-size: 14px; text-transform: capitalize;">${difficulty}</td>
              </tr>
            </table>
          </div>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${appUrl}/child/dashboard" style="background: #4f46e5; color: #ffffff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
              Start Assignment
            </a>
          </div>
        </div>
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
          You're receiving this because you have a HiveExcel account.
        </p>
      </div>
    `,
  });
}

export function buildWeeklyReportHtml(report: WeeklyReportData): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const weekLabel = `${formatDate(report.weekStart)} - ${formatDate(report.weekEnd)}`;
  const { totals, prevTotals } = report;
  const hasActivity = report.rows.length > 0;

  function delta(current: number, previous: number): string {
    const diff = current - previous;
    if (diff === 0) return '';
    const arrow = diff > 0 ? '&#9650;' : '&#9660;';
    const color = diff > 0 ? '#16a34a' : '#dc2626';
    return ` <span style="color: ${color}; font-size: 11px;">${arrow} ${Math.abs(diff)}</span>`;
  }

  function formatTime(min: number): string {
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  const totalsHtml = `
    <table style="width: 100%; border-collapse: collapse; margin: 0 0 24px;">
      <tr>
        <td style="padding: 12px; text-align: center; width: 20%;">
          <div style="font-size: 22px; font-weight: 700; color: #111827;">${totals.activities}${delta(totals.activities, prevTotals.activities)}</div>
          <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px;">Activities</div>
        </td>
        <td style="padding: 12px; text-align: center; width: 20%;">
          <div style="font-size: 22px; font-weight: 700; color: #111827;">${totals.totalQuestions}${delta(totals.totalQuestions, prevTotals.totalQuestions)}</div>
          <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px;">Questions</div>
        </td>
        <td style="padding: 12px; text-align: center; width: 20%;">
          <div style="font-size: 22px; font-weight: 700; color: #111827;">${totals.avgScore != null ? `${totals.avgScore}%` : '-'}${totals.avgScore != null && prevTotals.avgScore != null ? delta(totals.avgScore, prevTotals.avgScore) : ''}</div>
          <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px;">Avg Score</div>
        </td>
        <td style="padding: 12px; text-align: center; width: 20%;">
          <div style="font-size: 22px; font-weight: 700; color: #111827;">${formatTime(totals.timeSpentMin)}${delta(totals.timeSpentMin, prevTotals.timeSpentMin)}</div>
          <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px;">Time Spent</div>
        </td>
        <td style="padding: 12px; text-align: center; width: 20%;">
          <div style="font-size: 22px; font-weight: 700; color: #111827;">${totals.streak} day${totals.streak !== 1 ? 's' : ''}</div>
          <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px;">Streak</div>
        </td>
      </tr>
    </table>`;

  const activityRows = report.rows
    .map(
      (r) => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f3f4f6; color: #374151; font-size: 14px;">${r.type}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f3f4f6; color: #374151; font-size: 14px;">${r.subject}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f3f4f6; color: #374151; font-size: 14px; text-transform: capitalize;">${r.difficulty}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f3f4f6; color: #374151; font-size: 14px; text-align: center;">${r.numQuestions}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f3f4f6; color: #374151; font-size: 14px; text-align: center; font-weight: 600;">${r.score != null ? `${r.score}%` : '-'}</td>
      </tr>`
    )
    .join('');

  const activityTable = `
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="background: #f9fafb;">
          <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Type</th>
          <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Subject</th>
          <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Difficulty</th>
          <th style="padding: 10px 12px; text-align: center; font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Questions</th>
          <th style="padding: 10px 12px; text-align: center; font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Score</th>
        </tr>
      </thead>
      <tbody>
        ${activityRows}
      </tbody>
    </table>`;

  const quietWeekNudge = `
    <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 20px; text-align: center;">
      <p style="color: #92400e; margin: 0; font-size: 14px; line-height: 1.6;">
        No completed activities this week. Consider assigning something new to keep the momentum going!
      </p>
      <a href="${appUrl}/parent/create" style="display: inline-block; margin-top: 12px; background: #f59e0b; color: #ffffff; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
        Create Assignment
      </a>
    </div>`;

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 32px;">
        <h2 style="color: #111827; margin: 0 0 4px; font-size: 20px;">${report.childName}'s Week</h2>
        <p style="color: #9ca3af; margin: 0 0 24px; font-size: 13px;">${weekLabel}</p>

        ${totalsHtml}

        ${hasActivity ? activityTable : quietWeekNudge}
      </div>
      <div style="text-align: center; margin-top: 24px;">
        <a href="${appUrl}/parent/analytics/${report.childId}" style="color: #4f46e5; font-size: 14px; text-decoration: none; font-weight: 600;">
          View Full Analytics
        </a>
        <span style="color: #d1d5db; margin: 0 12px;">|</span>
        <a href="${appUrl}/settings" style="color: #9ca3af; font-size: 14px; text-decoration: none;">
          Email Preferences
        </a>
      </div>
    </div>
  `;
}

export async function sendWeeklyReport(report: WeeklyReportData) {
  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const weekLabel = `${formatDate(report.weekStart)} - ${formatDate(report.weekEnd)}`;

  await resend.emails.send({
    from: `HiveExcel <${FROM_EMAIL}>`,
    to: report.parentEmail,
    subject: `Weekly Report for ${report.childName} (${weekLabel})`,
    html: buildWeeklyReportHtml(report),
  });
}
