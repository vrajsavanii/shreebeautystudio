// app/api/email/marketing/route.ts
// Broadcasts marketing, promotional, and seasonal festival emails to salon customers
import { NextRequest, NextResponse } from 'next/server';
import { sendResendEmail, renderMarketingCampaignHtml } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      recipients,
      subject,
      headline,
      message,
      promoCode,
      discountText,
      ctaText,
      ctaLink,
      salonName,
      apiKey,
      fromEmail,
    } = body;

    if (!Array.isArray(recipients) || !recipients.length) {
      return NextResponse.json({ error: 'At least one recipient email is required.' }, { status: 400 });
    }

    if (!subject || !headline || !message) {
      return NextResponse.json(
        { error: 'Subject, headline, and promotional message are required.' },
        { status: 400 }
      );
    }

    // Filter valid email addresses
    const validEmails = recipients
      .map((e: string) => (typeof e === 'string' ? e.trim() : ''))
      .filter((e: string) => e.includes('@') && e.includes('.'));

    if (!validEmails.length) {
      return NextResponse.json({ error: 'No valid recipient email addresses found.' }, { status: 400 });
    }

    const html = renderMarketingCampaignHtml({
      headline,
      message,
      promoCode,
      discountText,
      ctaText,
      ctaLink,
      salonName: salonName || 'Shree Beauty Studio',
    });

    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Send emails in batches of 5 to avoid API rate limits
    const BATCH_SIZE = 5;
    for (let i = 0; i < validEmails.length; i += BATCH_SIZE) {
      const batch = validEmails.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (email) => {
          const res = await sendResendEmail({
            to: email,
            subject,
            html,
            from: fromEmail,
            apiKey,
          });

          if (res.success) {
            sentCount++;
          } else {
            failedCount++;
            if (res.error && !errors.includes(res.error)) {
              errors.push(res.error);
            }
          }
        })
      );
    }

    return NextResponse.json({
      success: true,
      total: validEmails.length,
      sentCount,
      failedCount,
      errors: errors.length ? errors : undefined,
      message: `Marketing campaign dispatched: ${sentCount} sent, ${failedCount} failed.`,
    });
  } catch (err: any) {
    console.error('[Marketing Email API Error]:', err);
    return NextResponse.json({ error: err?.message || 'Failed to dispatch marketing campaign' }, { status: 500 });
  }
}
