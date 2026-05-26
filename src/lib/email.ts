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

  function formatSubject(s: string): string {
    return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function delta(current: number, previous: number): string {
    const diff = current - previous;
    if (diff === 0) return '';
    const arrow = diff > 0 ? '&#9650;' : '&#9660;';
    const color = diff > 0 ? '#16a34a' : '#dc2626';
    return `<span style="color: ${color}; font-size: 11px; font-weight: 500;">${arrow}${Math.abs(diff)}</span>`;
  }

  function formatTime(min: number): string {
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  function scoreColor(score: number | null): string {
    if (score == null) return '#6b7280';
    if (score >= 90) return '#16a34a';
    if (score >= 70) return '#d97706';
    return '#dc2626';
  }

  function statCard(value: string, label: string, deltaHtml: string): string {
    return `
      <td style="padding: 6px;">
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 8px; text-align: center;">
          <div style="font-size: 24px; font-weight: 800; color: #1e293b; line-height: 1;">${value}</div>
          ${deltaHtml ? `<div style="margin-top: 4px;">${deltaHtml}</div>` : ''}
          <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 6px; font-weight: 600;">${label}</div>
        </div>
      </td>`;
  }

  const totalsHtml = `
    <table style="width: 100%; border-collapse: collapse; margin: 0 0 28px;">
      <tr>
        ${statCard(String(totals.activities), 'Activities', delta(totals.activities, prevTotals.activities))}
        ${statCard(String(totals.totalQuestions), 'Questions', delta(totals.totalQuestions, prevTotals.totalQuestions))}
        ${statCard(totals.avgScore != null ? `${totals.avgScore}%` : '-', 'Avg Score', totals.avgScore != null && prevTotals.avgScore != null ? delta(totals.avgScore, prevTotals.avgScore) : '')}
      </tr>
      <tr>
        <td style="padding: 6px;" colspan="1">
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 8px; text-align: center;">
            <div style="font-size: 24px; font-weight: 800; color: #1e293b; line-height: 1;">${formatTime(totals.timeSpentMin)}</div>
            ${delta(totals.timeSpentMin, prevTotals.timeSpentMin) ? `<div style="margin-top: 4px;">${delta(totals.timeSpentMin, prevTotals.timeSpentMin)}</div>` : ''}
            <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 6px; font-weight: 600;">Time Spent</div>
          </div>
        </td>
        <td style="padding: 6px;" colspan="2">
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 8px; text-align: center;">
            <div style="font-size: 24px; font-weight: 800; color: #1e293b; line-height: 1;">${totals.streak} day${totals.streak !== 1 ? 's' : ''} ${totals.streak >= 7 ? '&#128293;' : ''}</div>
            <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 6px; font-weight: 600;">Streak</div>
          </div>
        </td>
      </tr>
    </table>`;

  const activityRows = report.rows
    .map(
      (r, i) => `
      <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="padding: 12px 14px; color: #475569; font-size: 13px;">
          <span style="display: inline-block; background: ${r.type === 'Assignment' ? '#eef2ff' : r.type === 'Practice' ? '#f0fdf4' : '#fefce8'}; color: ${r.type === 'Assignment' ? '#4338ca' : r.type === 'Practice' ? '#15803d' : '#a16207'}; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;">${r.type}</span>
        </td>
        <td style="padding: 12px 14px; color: #1e293b; font-size: 13px; font-weight: 500;">${formatSubject(r.subject)}</td>
        <td style="padding: 12px 14px; color: #475569; font-size: 13px; text-transform: capitalize;">${r.difficulty}</td>
        <td style="padding: 12px 14px; color: #475569; font-size: 13px; text-align: center;">${r.numQuestions}</td>
        <td style="padding: 12px 14px; font-size: 13px; text-align: center; font-weight: 700; color: ${scoreColor(r.score)};">${r.score != null ? `${r.score}%` : '-'}</td>
      </tr>`
    )
    .join('');

  const activityTable = `
    <div style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #4f46e5;">
            <th style="padding: 12px 14px; text-align: left; font-size: 11px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.06em;">Type</th>
            <th style="padding: 12px 14px; text-align: left; font-size: 11px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.06em;">Subject</th>
            <th style="padding: 12px 14px; text-align: left; font-size: 11px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.06em;">Difficulty</th>
            <th style="padding: 12px 14px; text-align: center; font-size: 11px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.06em;">Qs</th>
            <th style="padding: 12px 14px; text-align: center; font-size: 11px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.06em;">Score</th>
          </tr>
        </thead>
        <tbody>
          ${activityRows}
        </tbody>
      </table>
    </div>`;

  const quietWeekNudge = `
    <div style="background: linear-gradient(135deg, #fffbeb, #fef3c7); border: 1px solid #fde68a; border-radius: 12px; padding: 28px 20px; text-align: center;">
      <div style="font-size: 32px; margin-bottom: 12px;">&#128218;</div>
      <p style="color: #92400e; margin: 0 0 4px; font-size: 15px; font-weight: 600;">Quiet week!</p>
      <p style="color: #a16207; margin: 0; font-size: 13px; line-height: 1.5;">
        No completed activities this week. Assign something new to keep the momentum going.
      </p>
      <a href="${appUrl}/parent/create" style="display: inline-block; margin-top: 16px; background: #f59e0b; color: #ffffff; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 14px;">
        Create Assignment
      </a>
    </div>`;

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #f1f5f9;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 32px 32px 28px; border-radius: 0 0 24px 24px;">
        <table style="width: 100%;">
          <tr>
            <td>
              <h1 style="color: #ffffff; margin: 0 0 2px; font-size: 22px; font-weight: 800;">${report.childName}'s Week</h1>
              <p style="color: #c7d2fe; margin: 0; font-size: 13px; font-weight: 500;">${weekLabel}</p>
            </td>
            <td style="text-align: right; vertical-align: top;">
              <span style="color: #e0e7ff; font-size: 16px; font-weight: 800; letter-spacing: -0.02em;">HiveExcel</span>
            </td>
          </tr>
        </table>
      </div>

      <!-- Body -->
      <div style="padding: 24px 20px 32px;">
        ${totalsHtml}
        ${hasActivity ? activityTable : quietWeekNudge}

        <!-- CTA -->
        <div style="text-align: center; margin-top: 28px;">
          <a href="${appUrl}/parent/analytics/${report.childId}" style="display: inline-block; background: #4f46e5; color: #ffffff; padding: 14px 36px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 14px;">
            View Full Analytics
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="text-align: center; padding: 0 20px 32px;">
        <p style="color: #94a3b8; font-size: 11px; margin: 0; line-height: 1.8;">
          Sent weekly by HiveExcel &middot;
          <a href="${appUrl}/settings" style="color: #64748b; text-decoration: underline;">Email Preferences</a>
        </p>
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
