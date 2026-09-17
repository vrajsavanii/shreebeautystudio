// app/api/email/send/route.ts
// Handles transactional email sending (confirmations, reminders, wishes, invoices)
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import {
  sendResendEmail,
  sendGmailSmtpEmail,
  renderAppointmentConfirmationHtml,
  renderAppointmentReminderHtml,
  renderMilestoneWishHtml,
  renderInvoiceReceiptHtml,
} from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      type,
      to,
      subject,
      data,
      apiKey: reqApiKey,
      fromEmail: reqFromEmail,
      smtpUser: reqSmtpUser,
      smtpPassword: reqSmtpPassword,
      provider: reqProvider,
    } = body;

    if (!to || typeof to !== 'string' || !to.includes('@')) {
      return NextResponse.json({ error: 'Valid recipient email address is required.' }, { status: 400 });
    }

    let apiKey = reqApiKey;
    let fromEmail = reqFromEmail;
    let smtpUser = reqSmtpUser;
    let smtpPassword = reqSmtpPassword;
    let emailProvider = reqProvider;

    // Check salon_state in database if credentials are not in request body
    try {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        const { data: row } = await supabase
          .from('salon_state')
          .select('data')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const s = row?.data?.settings;
        if (s) {
          if (!apiKey && s.resendApiKey) apiKey = s.resendApiKey;
          if (!fromEmail && s.resendFromEmail) fromEmail = s.resendFromEmail;
          if (!smtpUser && s.smtpUser) smtpUser = s.smtpUser;
          if (!smtpPassword && s.smtpPassword) smtpPassword = s.smtpPassword;
          if (!emailProvider && s.emailProvider) emailProvider = s.emailProvider;
        }
      }
    } catch (err) {
      console.warn('Could not read email credentials from salon_state:', err);
    }

    // Fall back to server environment variables if available
    smtpUser = smtpUser || process.env.GMAIL_USER || 'shreebeauty.studio22@gmail.com';
    smtpPassword = smtpPassword || process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASSWORD || '';

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
        plainTextSummary = `✨ APPOINTMENT CONFIRMED — ${data?.salonName || 'Shree Beauty Studio'}\n\nDear ${data?.customerName || 'Valued Guest'},\nYour appointment for ${data?.service || 'Salon Service'} is confirmed on ${data?.date || ''} at ${data?.time || ''}.\nStylist: ${data?.staff || 'Studio Specialist'}\nAddress: ${data?.address || 'Surat, Gujarat'}\n\nWe look forward to welcoming you! 💖`;
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
        plainTextSummary = `⏰ APPOINTMENT REMINDER — ${data?.salonName || 'Shree Beauty Studio'}\n\nDear ${data?.customerName || 'Valued Guest'},\nThis is a gentle reminder for your upcoming appointment for ${data?.service || 'Salon Service'} on ${data?.date || ''} at ${data?.time || ''}.\nAddress: ${data?.address || 'Surat, Gujarat'}\n\nSee you soon! 💖`;
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
        plainTextSummary = `🎉 ${title} — ${data?.salonName || 'Shree Beauty Studio'}\n\nDear ${data?.customerName || 'Valued Guest'},\nWishing you joy, happiness and radiance! Celebrate your special occasion with an exclusive ${data?.discountPercent || 15}% treat discount.\nCoupon Code: ${data?.couponCode || 'SHREE-CELEBRATE'}\n\nWarm regards,\nShree Beauty Studio 💖`;
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
        const linesText = (data?.lines || [])
          .map((l: any) => `• ${l.name} (${l.qty || 1}x) - ₹${l.price}`)
          .join('\n');
        plainTextSummary = `🧾 INVOICE RECEIPT — ${data?.salonName || 'Shree Beauty Studio'}\n────────────────────────────\nDear ${data?.customerName || 'Customer'},\nThank you for visiting ${data?.salonName || 'Shree Beauty Studio'}!\n\n📄 Invoice No: ${data?.invoiceNo || 'INV-001'}\n📅 Date: ${data?.date || ''}\n💳 Payment Mode: ${data?.mode || 'GPay UPI'}\n\nServices / Items:\n${linesText || '• Salon Services'}\n\n💵 Total Bill: ₹${data?.total || 0}\n\n📍 Shree Beauty Studio, Surat, Gujarat\n📞 +91 97732 40010\nThank you & have a wonderful day! ✨`;
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

    let result: any = null;
    let usedProvider = 'resend';

    // Check if Gmail SMTP should be used (if explicitly chosen OR if App Password exists)
    const hasSmtp = !!smtpPassword;
    const preferGmail = emailProvider === 'gmail' || (hasSmtp && (!fromEmail || fromEmail.includes('@resend.dev')));

    if (preferGmail && hasSmtp) {
      usedProvider = 'gmail';
      result = await sendGmailSmtpEmail({
        to,
        subject: emailSubject,
        html: emailHtml,
        text: plainTextSummary,
        user: smtpUser,
        pass: smtpPassword,
        from: `Shree Beauty Studio <${smtpUser}>`,
      });
    } else {
      // Dispatch via Resend
      result = await sendResendEmail({
        to,
        subject: emailSubject,
        html: emailHtml,
        text: plainTextSummary,
        from: fromEmail,
        apiKey,
      });

      // If Resend failed due to sandbox domain restriction, and Gmail SMTP is configured, auto-fallback to Gmail SMTP!
      if (!result.success && hasSmtp) {
        const errLower = (result.error || '').toLowerCase();
        if (errLower.includes('only send testing emails') || errLower.includes('verify a domain')) {
          const smtpFallback = await sendGmailSmtpEmail({
            to,
            subject: emailSubject,
            html: emailHtml,
            text: plainTextSummary,
            user: smtpUser,
            pass: smtpPassword,
            from: `Shree Beauty Studio <${smtpUser}>`,
          });
          if (smtpFallback.success) {
            result = smtpFallback;
            usedProvider = 'gmail';
          }
        }
      }
    }

    // Fallback URLs for seamless client-side dispatch (Gmail Web & Mailto)
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(plainTextSummary)}`;
    const mailtoUrl = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(plainTextSummary)}`;

    if (!result.success) {
      const errLower = (result.error || '').toLowerCase();
      const isDomainRestriction =
        errLower.includes('only send testing emails') ||
        errLower.includes('verify a domain') ||
        errLower.includes('sandbox') ||
        errLower.includes('validation_error');

      return NextResponse.json({
        success: false,
        isDomainRestriction,
        provider: usedProvider,
        error: result.error,
        fallback: {
          subject: emailSubject,
          body: plainTextSummary,
          gmailUrl,
          mailtoUrl,
        },
      }, { status: 200 }); // Return status 200 so UI can seamlessly handle fallback
    }

    return NextResponse.json({
      success: true,
      provider: usedProvider,
      id: result.id,
      message: `Email dispatched successfully via ${usedProvider === 'gmail' ? 'Gmail SMTP' : 'Resend'}!`,
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
