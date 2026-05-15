import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

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

  await transporter.sendMail({
    from: `"HiveExcel" <${process.env.GMAIL_USER}>`,
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
