import { Resend } from 'resend';

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
    subject: `New Assignment: ${subject} - ${topic}`,
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
