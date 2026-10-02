// app/api/email/send/route.ts
// Handles transactional email sending (invoices, confirmations, reminders, milestones)
import { NextRequest, NextResponse } from 'next/server';
import {
  sendResendEmail,
  renderAppointmentConfirmedHtml,
  renderBookingPendingHtml,
  renderAppointmentReminderHtml,
  renderMilestoneWishHtml,
  renderInvoiceReceiptHtml,
  DEFAULT_REPLY_TO,
  getSenderEmailForType,
} from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, to, subject, data, apiKey, fromEmail, replyTo } = body;

    if (!to || typeof to !== 'string' || !to.includes('@')) {
      return NextResponse.json({ error: 'Valid recipient email address is required.' }, { status: 400 });
    }

    // Support both flat params (from appointments page) and nested { data: {...} }
    const p = data || body;

    let emailHtml = '';
    let emailSubject = subject;
    let plainTextSummary = '';

    switch (type) {
      case 'confirmation': {
        // Sent by admin when confirming a pending booking
        emailSubject = emailSubject || `✅ Appointment Confirmed — ${p?.service || 'Shree Beauty Studio'}`;
        emailHtml = renderAppointmentConfirmedHtml({
          customerName: p?.customerName || 'Valued Guest',
          service: p?.service || 'Salon Service',
          staff: p?.staff || 'Studio Specialist',
          date: p?.date || '',
          time: p?.time || '',
          price: p?.price,
          address: p?.address,
          salonName: p?.salonName,
        });
        plainTextSummary = `✅ Your appointment for ${p?.service} on ${p?.date} at ${p?.time} has been confirmed!`;
        break;
      }

      case 'booking_pending': {
        // Sent immediately when customer books online (pending admin confirmation)
        emailSubject = emailSubject || `📋 Booking Received — ${p?.service || 'Shree Beauty Studio'} (Pending Confirmation)`;
        emailHtml = renderBookingPendingHtml({
          customerName: p?.customerName || 'Valued Guest',
          service: p?.service || 'Salon Service',
          date: p?.date || '',
          time: p?.time || '',
          salonName: p?.salonName,
        });
        plainTextSummary = `We've received your booking request for ${p?.service} on ${p?.date}. We'll confirm shortly!`;
        break;
      }

      case 'reminder': {
        emailSubject = emailSubject || `⏰ Reminder: Upcoming Appointment at ${p?.salonName || 'Shree Beauty Studio'}`;
        emailHtml = renderAppointmentReminderHtml({
          customerName: p?.customerName || 'Valued Guest',
          service: p?.service || 'Salon Service',
          staff: p?.staff || 'Studio Specialist',
          date: p?.date || '',
          time: p?.time || '',
          address: p?.address,
          salonName: p?.salonName,
        });
        plainTextSummary = `⏰ Reminder: Your appointment for ${p?.service} is scheduled on ${p?.date} at ${p?.time}`;
        break;
      }

      case 'milestone': {
        const milestoneType = p?.milestoneType || p?.type || 'birthday';
        const title =
          milestoneType === 'anniversary'
            ? 'Happy Wedding Anniversary! 💍'
            : milestoneType === 'sagai'
            ? 'Happy Engagement Anniversary! ✨'
            : 'Happy Birthday! 🎂';
        emailSubject = emailSubject || `${title} — Special Gift from Shree Beauty Studio`;
        emailHtml = renderMilestoneWishHtml({
          customerName: p?.customerName || 'Valued Guest',
          type: milestoneType,
          yearsCount: p?.yearsCount,
          discountPercent: p?.discountPercent || 15,
          couponCode: p?.couponCode || 'SHREE-CELEBRATE',
          salonName: p?.salonName,
        });
        plainTextSummary = `${title} — Enjoy a special discount gift on your next salon visit!`;
        break;
      }

      case 'invoice': {
        emailSubject = emailSubject || `📄 Official Invoice #${p?.invoiceNo || ''} from ${p?.salonName || 'Shree Beauty Studio'}`;
        emailHtml = renderInvoiceReceiptHtml({
          customerName: p?.customerName || 'Valued Customer',
          invoiceNo: p?.invoiceNo || 'INV-001',
          date: p?.date || new Date().toISOString().slice(0, 10),
          total: p?.total || 0,
          mode: p?.mode || 'GPay UPI',
          lines: p?.lines || [],
          salonName: p?.salonName,
        });
        const linesText = (p?.lines || [])
          .map((l: any) => `• ${l.name} (${l.qty || 1}x) - ₹${l.price * (l.qty || 1)}`)
          .join('\n');
        plainTextSummary = `🧾 INVOICE — ${p?.salonName || 'Shree Beauty Studio'}\nDear ${p?.customerName || 'Customer'},\n\nInvoice No: ${p?.invoiceNo || 'INV-001'}\nDate: ${p?.date || ''}\nPayment: ${p?.mode || 'GPay UPI'}\n\n${linesText || '• Salon Services'}\n\nTotal: ₹${p?.total || 0}\n\n📍 22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat\n📞 +91 98241 83769\nThank you! ✨`;
        break;
      }

      case 'custom':
      default: {
        if (!body.html && !body.message) {
          return NextResponse.json(
            { error: 'Message content or HTML is required for custom email' },
            { status: 400 }
          );
        }
        emailHtml =
          body.html ||
          `<div style="font-family: sans-serif; padding: 20px; line-height: 1.6;">${body.message}</div>`;
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
      type,
      replyTo: replyToAddress,
      apiKey,
    });

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(plainTextSummary)}`;
    const mailtoUrl = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(plainTextSummary)}`;

    if (!result.success) {
      console.warn('[Email Send] Resend failed:', result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          fallback: { subject: emailSubject, body: plainTextSummary, gmailUrl, mailtoUrl },
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      id: result.id,
      message: 'Email dispatched successfully!',
      fallback: { subject: emailSubject, body: plainTextSummary, gmailUrl, mailtoUrl },
    });
  } catch (err: any) {
    console.error('[Email Send API Error]:', err);
    return NextResponse.json({ error: err?.message || 'Failed to dispatch email' }, { status: 500 });
  }
}
