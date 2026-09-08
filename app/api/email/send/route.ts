// app/api/email/send/route.ts
// Handles transactional email sending (confirmations, reminders, wishes, invoices)
import { NextRequest, NextResponse } from 'next/server';
import {
  sendResendEmail,
  renderAppointmentConfirmationHtml,
  renderAppointmentReminderHtml,
  renderMilestoneWishHtml,
  renderInvoiceReceiptHtml,
} from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, to, subject, data, apiKey, fromEmail } = body;

    if (!to || typeof to !== 'string' || !to.includes('@')) {
      return NextResponse.json({ error: 'Valid recipient email address is required.' }, { status: 400 });
    }

    let emailHtml = '';
    let emailSubject = subject;

    switch (type) {
      case 'confirmation': {
        emailSubject = emailSubject || `✨ Appointment Confirmed — ${data?.service || 'Shree Beauty Studio'}`;
        emailHtml = renderAppointmentConfirmationHtml({
          customerName: data?.customerName || 'Valued Guest',
          service: data?.service || 'Salon Service',
          staff: data?.staff || 'Studio Stylist',
          date: data?.date || '',
          time: data?.time || '',
          price: data?.price,
          address: data?.address,
          salonName: data?.salonName,
        });
        break;
      }

      case 'reminder': {
        emailSubject = emailSubject || `⏰ Reminder: Upcoming Appointment at ${data?.salonName || 'Shree Beauty Studio'}`;
        emailHtml = renderAppointmentReminderHtml({
          customerName: data?.customerName || 'Valued Guest',
          service: data?.service || 'Salon Service',
          staff: data?.staff || 'Studio Specialist',
          date: data?.date || '',
          time: data?.time || '',
          address: data?.address,
          salonName: data?.salonName,
        });
        break;
      }

      case 'milestone': {
        const milestoneType = data?.milestoneType || 'birthday';
        const title = milestoneType === 'anniversary' ? 'Happy Wedding Anniversary! 💍' : milestoneType === 'sagai' ? 'Happy Engagement Anniversary! ✨' : 'Happy Birthday! 🎂';
        emailSubject = emailSubject || `${title} — Special Gift from Shree Beauty Studio`;
        emailHtml = renderMilestoneWishHtml({
          customerName: data?.customerName || 'Valued Guest',
          type: milestoneType,
          yearsCount: data?.yearsCount,
          discountPercent: data?.discountPercent || 15,
          couponCode: data?.couponCode || 'SHREE-CELEBRATE',
          salonName: data?.salonName,
        });
        break;
      }

      case 'invoice': {
        emailSubject = emailSubject || `📄 Invoice #${data?.invoiceNo || ''} from ${data?.salonName || 'Shree Beauty Studio'}`;
        emailHtml = renderInvoiceReceiptHtml({
          customerName: data?.customerName || 'Valued Customer',
          invoiceNo: data?.invoiceNo || 'INV-001',
          date: data?.date || new Date().toISOString().slice(0, 10),
          total: data?.total || 0,
          mode: data?.mode || 'GPay UPI',
          lines: data?.lines || [],
          salonName: data?.salonName,
        });
        break;
      }

      case 'custom':
      default: {
        if (!body.html && !body.message) {
          return NextResponse.json({ error: 'Message content or HTML is required for custom email' }, { status: 400 });
        }
        emailHtml = body.html || `<div style="font-family: sans-serif; padding: 20px; line-height: 1.6;">${body.message}</div>`;
        emailSubject = emailSubject || 'Message from Shree Beauty Studio';
        break;
      }
    }

    const result = await sendResendEmail({
      to,
      subject: emailSubject,
      html: emailHtml,
      from: fromEmail,
      apiKey,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      id: result.id,
      message: 'Email dispatched successfully!',
    });
  } catch (err: any) {
    console.error('[Email Send API Error]:', err);
    return NextResponse.json({ error: err?.message || 'Failed to dispatch email' }, { status: 500 });
  }
}
