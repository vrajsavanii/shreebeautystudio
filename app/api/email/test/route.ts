// app/api/email/test/route.ts
// Handles test email sending for verification
import { NextRequest, NextResponse } from 'next/server';
import { sendResendEmail, DEFAULT_REPLY_TO, DEFAULT_SENDER_EMAIL } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, apiKey, fromEmail, replyTo } = body;

    if (!to || typeof to !== 'string' || !to.includes('@')) {
      return NextResponse.json({ error: 'Valid recipient email address is required.' }, { status: 400 });
    }

    const testTime = new Date().toLocaleString('en-IN');
    const sender = fromEmail || process.env.RESEND_FROM_EMAIL || DEFAULT_SENDER_EMAIL;
    const reply = replyTo || DEFAULT_REPLY_TO;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 28px; color: #05424A; background: #FAF9F6; border-radius: 12px; border: 1px solid #E2E8F0; max-width: 580px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #05424A; font-size: 22px; margin: 0 0 6px; letter-spacing: 1px;">SHREE BEAUTY STUDIO</h1>
          <p style="color: #D4AF37; font-size: 13px; font-weight: 700; text-transform: uppercase; margin: 0;">Verified Custom Domain Email Test</p>
        </div>
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
          <h2 style="color: #15803d; font-size: 18px; margin: 0 0 10px; display: flex; align-items: center; gap: 8px;">
            ✨ Resend Service Connection Active!
          </h2>
          <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 16px;">
            Congratulations! Your official custom domain email dispatching via <strong>Resend</strong> is active and delivering perfectly.
          </p>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr style="border-bottom: 1px solid #F1F5F9;">
              <td style="padding: 8px 0; color: #64748B; font-weight: 600;">Sender Address:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #05424A;">${sender}</td>
            </tr>
            <tr style="border-bottom: 1px solid #F1F5F9;">
              <td style="padding: 8px 0; color: #64748B; font-weight: 600;">Reply-To Address:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #05424A;">${reply}</td>
            </tr>
            <tr style="border-bottom: 1px solid #F1F5F9;">
              <td style="padding: 8px 0; color: #64748B; font-weight: 600;">Recipient:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #05424A;">${to}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748B; font-weight: 600;">Timestamp:</td>
              <td style="padding: 8px 0; text-align: right; color: #64748B;">${testTime}</td>
            </tr>
          </table>
        </div>
        <p style="font-size: 12px; color: #94A3B8; text-align: center; margin: 20px 0 0;">
          Shree Beauty Studio &bull; 22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004
        </p>
      </div>
    `;

    const result = await sendResendEmail({
      to,
      subject: '✨ Shree Beauty Studio — Resend Domain Verification Test',
      html,
      from: sender,
      replyTo: reply,
      apiKey,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Test email successfully dispatched to ${to}!`,
      id: result.id,
    });
  } catch (err: any) {
    console.error('[Email Test API Error]:', err);
    return NextResponse.json({ error: err?.message || 'Failed to send test email' }, { status: 500 });
  }
}
