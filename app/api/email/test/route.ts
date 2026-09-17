// app/api/email/test/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sendResendEmail, sendGmailSmtpEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, apiKey, fromEmail, smtpUser, smtpPassword, provider } = body;

    if (!to || typeof to !== 'string' || !to.includes('@')) {
      return NextResponse.json({ error: 'Valid recipient email address is required.' }, { status: 400 });
    }

    const testTime = new Date().toLocaleString('en-IN');
    const isGmail = provider === 'gmail' || (!!smtpPassword && (!fromEmail || fromEmail.includes('@resend.dev')));

    if (isGmail) {
      const html = `
        <div style="font-family: sans-serif; padding: 24px; color: #05424A;">
          <h2 style="color: #05424A; margin-top: 0;">✨ Gmail SMTP Connection Verified!</h2>
          <p style="font-size: 14px; color: #475569;">
            Congratulations! Your <strong>Gmail SMTP</strong> integration with <strong>Shree Beauty Studio</strong> is working flawlessly.
          </p>
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 16px; border-radius: 8px; font-size: 13px;">
            <div><strong>Engine:</strong> Gmail SMTP (Free, Up to 500 emails/day)</div>
            <div><strong>Sender:</strong> ${smtpUser || 'shreebeauty.studio22@gmail.com'}</div>
            <div><strong>Timestamp:</strong> ${testTime}</div>
            <div><strong>Status:</strong> Active &amp; Ready for Automated Invoices &amp; Reminders</div>
          </div>
          <p style="font-size: 12px; color: #94A3B8; margin-top: 20px;">
            Shree Beauty Studio &bull; Surat, Gujarat
          </p>
        </div>
      `;

      const result = await sendGmailSmtpEmail({
        to,
        subject: '✨ Shree Beauty Studio — Gmail SMTP Connection Test',
        html,
        user: smtpUser,
        pass: smtpPassword,
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        provider: 'gmail',
        message: `Gmail SMTP test email successfully delivered to ${to}!`,
        id: result.id,
      });
    }

    const html = `
      <div style="font-family: sans-serif; padding: 24px; color: #05424A;">
        <h2 style="color: #05424A; margin-top: 0;">✨ Resend Email Connection Verified!</h2>
        <p style="font-size: 14px; color: #475569;">
          Congratulations! Your <strong>Resend</strong> integration with <strong>Shree Beauty Studio</strong> is working flawlessly.
        </p>
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 16px; border-radius: 8px; font-size: 13px;">
          <div><strong>Timestamp:</strong> ${testTime}</div>
          <div><strong>Environment:</strong> Production / Localhost</div>
          <div><strong>Status:</strong> Active &amp; Ready for Reminders &amp; Marketing</div>
        </div>
        <p style="font-size: 12px; color: #94A3B8; margin-top: 20px;">
          Shree Beauty Studio &bull; Surat, Gujarat
        </p>
      </div>
    `;

    const result = await sendResendEmail({
      to,
      subject: '✨ Shree Beauty Studio — Resend Email Verification Test',
      html,
      from: fromEmail,
      apiKey,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      provider: 'resend',
      message: `Test email successfully dispatched to ${to}`,
      id: result.id,
    });
  } catch (err: any) {
    console.error('[Email Test API Error]:', err);
    return NextResponse.json({ error: err?.message || 'Failed to send test email' }, { status: 500 });
  }
}
