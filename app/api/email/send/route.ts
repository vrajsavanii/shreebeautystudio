// app/api/email/send/route.ts
// Handles transactional email sending (invoices, confirmations, reminders, milestones)
import { NextRequest, NextResponse } from 'next/server';
import {
  sendResendEmail,
  sendUniversalEmail,
  renderAppointmentConfirmationHtml,
  renderAppointmentReminderHtml,
  renderMilestoneWishHtml,
  renderInvoiceReceiptHtml,
  DEFAULT_REPLY_TO,
  DEFAULT_SENDER_EMAIL,
  getSenderEmailForType,
  SENDER_EMAILS,
} from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, to, subject, data, apiKey, fromEmail, replyTo } = body;

    if (!to || typeof to !== 'string' || !to.includes('@')) {
      return NextResponse.json({ error: 'Valid recipient email address is required.' }, { status: 400 });
    }

    let emailHtml = '';
    let emailSubject = subject;
    let plainTextSummary = '';

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
        plainTextSummary = `✨ Appointment Confirmed: ${data?.service} on ${data?.date} at ${data?.time}`;
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
        plainTextSummary = `⏰ Reminder: Your appointment for ${data?.service} is scheduled on ${data?.date} at ${data?.time}`;
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
        plainTextSummary = `${title} — Enjoy a special discount gift on your next salon visit!`;
        break;
      }

      case 'invoice': {
        emailSubject = emailSubject || `📄 Official Invoice #${data?.invoiceNo || ''} from ${data?.salonName || 'Shree Beauty Studio'}`;
        emailHtml = renderInvoiceReceiptHtml({
          customerName: data?.customerName || 'Valued Customer',
          invoiceNo: data?.invoiceNo || 'INV-001',
          date: data?.date || new Date().toISOString().slice(0, 10),
          total: data?.total || 0,
          mode: data?.mode || 'GPay UPI',
          lines: data?.lines || [],
          salonName: data?.salonName,
        });
        const linesText = (data?.lines || [])
          .map((l: any) => `• ${l.name} (${l.qty || 1}x) - ₹${l.price * (l.qty || 1)}`)
          .join('\n');
        plainTextSummary = `🧾 INVOICE RECEIPT — ${data?.salonName || 'Shree Beauty Studio'}\n────────────────────────────\nDear ${data?.customerName || 'Customer'},\nThank you for visiting ${data?.salonName || 'Shree Beauty Studio'}!\n\n📄 Invoice No: ${data?.invoiceNo || 'INV-001'}\n📅 Date: ${data?.date || ''}\n💳 Payment Mode: ${data?.mode || 'GPay UPI'}\n\nServices / Items:\n${linesText || '• Salon Services'}\n\n💵 Total Bill: ₹${data?.total || 0}\n\n📍 22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004\n📞 +91 97732 40010\nThank you & have a wonderful day! ✨`;
        break;
      }

      case 'custom':
      default: {
        if (!body.html && !body.message) {
          return NextResponse.json({ error: 'Message content or HTML is required for custom email' }, { status: 400 });
        }
        emailHtml = body.html || `<div style="font-family: sans-serif; padding: 20px; line-height: 1.6;">${body.message}</div>`;
        emailSubject = emailSubject || 'Message from Shree Beauty Studio';
        plainTextSummary = body.message || emailSubject;
        break;
      }
    }

    const replyToAddress = replyTo || DEFAULT_REPLY_TO;
    const fromAddress = getSenderEmailForType(type, fromEmail);

    const result = await sendResendEmail({
      to,
      subject: emailSubject,
      html: emailHtml,
      text: plainTextSummary,
      from: fromAddress,
      replyTo: replyToAddress,
      apiKey,
    });

    // Fallback URLs for client-side dispatch (Gmail Web & Mailto)
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(plainTextSummary)}`;
    const mailtoUrl = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(plainTextSummary)}`;

    if (!result.success) {
      console.warn('[Email Send] Resend failed:', result.error);
      return NextResponse.json({
        success: false,
        error: result.error,
        fallback: {
          subject: emailSubject,
          body: plainTextSummary,
          gmailUrl,
          mailtoUrl,
        },
      }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      id: result.id,
      message: 'Email dispatched successfully!',
      fallback: {
        subject: emailSubject,
        body: plainTextSummary,
        gmailUrl,
        mailtoUrl,
      },
    });
  } catch (err: any) {
    console.error('[Email Send API Error]:', err);
    return NextResponse.json({ error: err?.message || 'Failed to dispatch email' }, { status: 500 });
  }
}
