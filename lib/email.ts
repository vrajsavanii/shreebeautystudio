// lib/email.ts
// Centralized Resend Email Service for Shree Beauty Studio
// Provides luxury-styled HTML email templates and delivery helpers for:
// 1. Appointment Confirmations
// 2. Appointment Reminders
// 3. Milestone Wishes (Birthdays, Anniversaries, Sagai)
// 4. Digital Invoices & Receipts
// 5. Marketing & Promotional Campaigns

import { Resend } from 'resend';

export interface EmailSendResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Retrieves the Resend client instance.
 * Prefers explicit apiKey passed in, falling back to process.env.RESEND_API_KEY.
 */
export function getResendClient(customApiKey?: string): Resend | null {
  const key = customApiKey?.trim() || process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  try {
    return new Resend(key);
  } catch (err: any) {
    console.error('[Resend Init Error]:', err?.message);
    return null;
  }
}

/**
 * Returns the default "From" address for email dispatch.
 */
export function getDefaultFromEmail(customFrom?: string): string {
  if (customFrom?.trim()) return customFrom.trim();
  if (process.env.RESEND_FROM_EMAIL?.trim()) return process.env.RESEND_FROM_EMAIL.trim();
  return 'Shree Beauty Studio <onboarding@resend.dev>';
}

/**
 * Generic email dispatcher via Resend SDK
 */
export async function sendResendEmail({
  to,
  subject,
  html,
  text,
  from,
  apiKey,
}: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  apiKey?: string;
}): Promise<EmailSendResult> {
  const client = getResendClient(apiKey);
  if (!client) {
    return {
      success: false,
      error: 'Resend API key is missing. Please configure it in Settings -> Email & Resend.',
    };
  }

  const sender = getDefaultFromEmail(from);
  const recipients = Array.isArray(to) ? to : [to];

  if (!recipients.length || !recipients[0]) {
    return { success: false, error: 'Recipient email address is required.' };
  }

  try {
    const response = await client.emails.send({
      from: sender,
      to: recipients,
      subject,
      html,
      text: text || subject,
    });

    if (response.error) {
      console.error('[Resend Send Error]:', response.error);
      return {
        success: false,
        error: response.error.message || 'Failed to send email via Resend',
      };
    }

    return {
      success: true,
      id: response.data?.id,
    };
  } catch (err: any) {
    console.error('[Resend Exception]:', err);
    return {
      success: false,
      error: err?.message || 'Unexpected error occurred while dispatching email',
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML EMAIL TEMPLATE BUILDERS (Luxury Shree Beauty Studio Branding)
// ─────────────────────────────────────────────────────────────────────────────

const BRAND_COLORS = {
  primary: '#05424A',       // Deep Teal
  primaryDark: '#032C32',
  gold: '#D4AF37',          // Rich Metallic Gold
  goldLight: '#FDFBF5',
  rose: '#9D174D',
  charcoal: '#1E293B',
  muted: '#64748B',
  cardBg: '#FFFFFF',
  bodyBg: '#F8FAFC',
  border: '#E2E8F0',
};

function baseLayout(content: string, previewText: string = ''): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shree Beauty Studio</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: ${BRAND_COLORS.bodyBg}; color: ${BRAND_COLORS.charcoal}; -webkit-font-smoothing: antialiased; }
    .wrapper { max-width: 600px; margin: 0 auto; padding: 24px 16px; }
    .card { background-color: ${BRAND_COLORS.cardBg}; border-radius: 16px; border: 1px solid ${BRAND_COLORS.border}; overflow: hidden; box-shadow: 0 4px 12px rgba(5,66,74,0.06); }
    .header { background: linear-gradient(135deg, ${BRAND_COLORS.primaryDark} 0%, ${BRAND_COLORS.primary} 100%); padding: 32px 24px; text-align: center; border-bottom: 3px solid ${BRAND_COLORS.gold}; }
    .header h1 { margin: 0; color: #FFFFFF; font-size: 24px; letter-spacing: 1.5px; font-weight: 800; text-transform: uppercase; }
    .header p { margin: 6px 0 0; color: ${BRAND_COLORS.gold}; font-size: 13px; letter-spacing: 1px; font-weight: 600; text-transform: uppercase; }
    .content { padding: 32px 28px; }
    .footer { text-align: center; padding: 24px; font-size: 12px; color: ${BRAND_COLORS.muted}; line-height: 1.6; }
    .footer a { color: ${BRAND_COLORS.primary}; text-decoration: none; font-weight: 600; }
    .btn { display: inline-block; background: linear-gradient(135deg, #EABA38 0%, #D4AF37 100%); color: #000000 !important; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 99px; text-align: center; margin: 16px 0; box-shadow: 0 3px 10px rgba(212,175,55,0.3); }
    .table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
    .table td { padding: 10px 12px; border-bottom: 1px solid #F1F5F9; }
    .table td.label { font-weight: 600; color: ${BRAND_COLORS.muted}; width: 38%; }
    .table td.val { font-weight: 700; color: ${BRAND_COLORS.charcoal}; text-align: right; }
    .pill { display: inline-block; padding: 4px 12px; border-radius: 99px; font-size: 12px; font-weight: 700; }
    .pill-gold { background-color: #FEF9C3; color: #854D0E; border: 1px solid #FEF08A; }
    .coupon-box { background: ${BRAND_COLORS.goldLight}; border: 2px dashed ${BRAND_COLORS.gold}; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0; }
    .coupon-code { font-family: monospace; font-size: 20px; font-weight: 800; color: ${BRAND_COLORS.primary}; letter-spacing: 2px; }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${previewText}
  </div>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <h1>SHREE BEAUTY STUDIO</h1>
        <p>Luxury Salon &amp; Bridal Lounge</p>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        <p><strong>Shree Beauty Studio</strong> &bull; Surat, Gujarat</p>
        <p>For inquiries, WhatsApp us at <a href="https://wa.me/919876543210">+91 98765 43210</a></p>
        <p style="margin-top: 12px; font-size: 11px; color: #94A3B8;">&copy; ${new Date().getFullYear()} Shree Beauty Studio. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. APPOINTMENT CONFIRMATION EMAIL
// ─────────────────────────────────────────────────────────────────────────────

export interface AppointmentConfirmationEmailProps {
  customerName: string;
  service: string;
  staff: string;
  date: string;
  time: string;
  price?: number;
  address?: string;
  salonName?: string;
}

export function renderAppointmentConfirmationHtml(props: AppointmentConfirmationEmailProps): string {
  const { customerName, service, staff, date, time, price, address, salonName = 'Shree Beauty Studio' } = props;
  
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span class="pill pill-gold">✨ APPOINTMENT CONFIRMED ✨</span>
      <h2 style="color: ${BRAND_COLORS.primary}; font-size: 22px; margin: 14px 0 6px;">We look forward to welcoming you, ${customerName}!</h2>
      <p style="color: ${BRAND_COLORS.muted}; font-size: 14px; margin: 0;">Your appointment has been successfully scheduled at ${salonName}.</p>
    </div>

    <table class="table">
      <tr>
        <td class="label">📅 Date</td>
        <td class="val">${date}</td>
      </tr>
      <tr>
        <td class="label">⏰ Time</td>
        <td class="val">${time}</td>
      </tr>
      <tr>
        <td class="label">💄 Service</td>
        <td class="val" style="color: ${BRAND_COLORS.primary};">${service}</td>
      </tr>
      <tr>
        <td class="label">👩‍💼 Specialist</td>
        <td class="val">Studio Specialist</td>
      </tr>
      ${price !== undefined ? `
      <tr>
        <td class="label">💰 Total Amount</td>
        <td class="val">₹${price}</td>
      </tr>` : ''}
      <tr>
        <td class="label">📍 Studio Location</td>
        <td class="val" style="font-size: 13px;">${address || 'Shree Beauty Studio, Surat, Gujarat'}</td>
      </tr>
    </table>

    <div style="text-align: center; margin-top: 28px;">
      <a href="https://wa.me/919876543210" class="btn">Chat on WhatsApp</a>
    </div>

    <div style="background-color: #F8FAFC; border-radius: 10px; padding: 14px 18px; margin-top: 24px; border-left: 3px solid ${BRAND_COLORS.primary};">
      <p style="margin: 0; font-size: 12.5px; color: ${BRAND_COLORS.muted}; line-height: 1.5;">
        <strong>Studio Policy:</strong> Please arrive 5-10 minutes prior to your scheduled slot. If you need to reschedule or cancel, kindly let us know at least 2 hours in advance.
      </p>
    </div>
  `;

  return baseLayout(content, `Your appointment for ${service} on ${date} is confirmed!`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. APPOINTMENT REMINDER EMAIL
// ─────────────────────────────────────────────────────────────────────────────

export interface AppointmentReminderEmailProps {
  customerName: string;
  service: string;
  staff: string;
  date: string;
  time: string;
  address?: string;
  salonName?: string;
}

export function renderAppointmentReminderHtml(props: AppointmentReminderEmailProps): string {
  const { customerName, service, staff, date, time, address, salonName = 'Shree Beauty Studio' } = props;

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span class="pill pill-gold">⏰ APPOINTMENT REMINDER</span>
      <h2 style="color: ${BRAND_COLORS.primary}; font-size: 22px; margin: 14px 0 6px;">See you soon, ${customerName}!</h2>
      <p style="color: ${BRAND_COLORS.muted}; font-size: 14px; margin: 0;">This is a friendly reminder for your upcoming session at ${salonName}.</p>
    </div>

    <table class="table">
      <tr>
        <td class="label">📅 Appointment Date</td>
        <td class="val">${date}</td>
      </tr>
      <tr>
        <td class="label">⏰ Time Slot</td>
        <td class="val" style="color: ${BRAND_COLORS.primary}; font-size: 16px;">${time}</td>
      </tr>
      <tr>
        <td class="label">💄 Service</td>
        <td class="val">${service}</td>
      </tr>
      <tr>
        <td class="label">👩‍💼 Professional</td>
        <td class="val">${staff}</td>
      </tr>
      <tr>
        <td class="label">📍 Location</td>
        <td class="val" style="font-size: 13px;">${address || 'Shree Beauty Studio, Surat'}</td>
      </tr>
    </table>

    <div style="text-align: center; margin: 24px 0;">
      <a href="https://wa.me/919876543210" class="btn">Confirm / Reschedule via WhatsApp</a>
    </div>

    <p style="font-size: 13px; color: ${BRAND_COLORS.muted}; text-align: center;">
      Need directions or assistance? Feel free to contact our studio reception anytime.
    </p>
  `;

  return baseLayout(content, `Reminder: Your appointment at Shree Beauty Studio on ${date} at ${time}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. MILESTONE WISH EMAIL (Birthday / Anniversary / Sagai)
// ─────────────────────────────────────────────────────────────────────────────

export interface MilestoneWishEmailProps {
  customerName: string;
  type: 'birthday' | 'anniversary' | 'sagai';
  yearsCount?: number;
  discountPercent?: number;
  couponCode?: string;
  salonName?: string;
}

export function renderMilestoneWishHtml(props: MilestoneWishEmailProps): string {
  const { customerName, type, yearsCount, discountPercent = 15, couponCode = 'SHREE-CELEBRATE', salonName = 'Shree Beauty Studio' } = props;

  let title = 'Happy Birthday! 🎂';
  let badge = '🎂 BIRTHDAY CELEBRATION';
  let message = `Wishing you a day filled with joy, laughter, and beauty. May your special day bring as much happiness as you bring to everyone around you!`;

  if (type === 'anniversary') {
    title = `Happy Wedding Anniversary! 💍`;
    badge = '💍 WEDDING ANNIVERSARY';
    message = `Warmest wishes on your ${yearsCount ? `${yearsCount}th ` : ''}anniversary! May the love you share continue to grow stronger with every passing year.`;
  } else if (type === 'sagai') {
    title = `Happy Sagai Anniversary! ✨`;
    badge = '✨ SAGAI / ENGAGEMENT CELEBRATION';
    message = `Wishing you both a very Happy Engagement Anniversary! May your bond shine brighter each day.`;
  }

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span class="pill pill-gold">${badge}</span>
      <h2 style="color: ${BRAND_COLORS.primary}; font-size: 24px; margin: 16px 0 8px;">${title}</h2>
      <p style="font-size: 16px; color: ${BRAND_COLORS.charcoal}; line-height: 1.6; max-width: 480px; margin: 0 auto 16px;">
        Dear <strong>${customerName}</strong>,
      </p>
      <p style="font-size: 14px; color: ${BRAND_COLORS.muted}; line-height: 1.6; max-width: 480px; margin: 0 auto;">
        ${message}
      </p>
    </div>

    <div class="coupon-box">
      <div style="font-size: 12px; font-weight: 700; color: ${BRAND_COLORS.primary}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
        A Special Gift Just For You 🎁
      </div>
      <div style="font-size: 26px; font-weight: 800; color: ${BRAND_COLORS.primary}; margin-bottom: 6px;">
        FLAT ${discountPercent}% OFF
      </div>
      <p style="font-size: 13px; color: ${BRAND_COLORS.muted}; margin: 0 0 12px;">Valid on all hair, skin, and salon pampering packages this month.</p>
      <div class="coupon-code">${couponCode}</div>
      <p style="font-size: 11px; color: #94A3B8; margin: 8px 0 0;">Show this email or code at our salon front desk.</p>
    </div>

    <div style="text-align: center;">
      <a href="https://wa.me/919876543210" class="btn">Claim &amp; Book Pampering Session</a>
    </div>

    <p style="font-size: 13px; color: ${BRAND_COLORS.muted}; text-align: center; margin-top: 24px;">
      With love,<br><strong>The Team at ${salonName} 💖</strong>
    </p>
  `;

  return baseLayout(content, `${title} — A special ${discountPercent}% discount gift from Shree Beauty Studio!`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. INVOICE / RECEIPT EMAIL
// ─────────────────────────────────────────────────────────────────────────────

export interface InvoiceReceiptEmailProps {
  customerName: string;
  invoiceNo: string;
  date: string;
  total: number;
  mode: string;
  lines: Array<{ name: string; qty: number; price: number }>;
  salonName?: string;
}

export function renderInvoiceReceiptHtml(props: InvoiceReceiptEmailProps): string {
  const { customerName, invoiceNo, date, total, mode, lines = [], salonName = 'Shree Beauty Studio' } = props;

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span class="pill pill-gold">📄 OFFICIAL RECEIPT</span>
      <h2 style="color: ${BRAND_COLORS.primary}; font-size: 22px; margin: 14px 0 6px;">Thank You, ${customerName}!</h2>
      <p style="color: ${BRAND_COLORS.muted}; font-size: 14px; margin: 0;">Here is your digital invoice for your visit at ${salonName}.</p>
    </div>

    <div style="background-color: #F8FAFC; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
        <span style="color: ${BRAND_COLORS.muted};">Invoice No:</span>
        <strong style="color: ${BRAND_COLORS.primary}; font-family: monospace;">#${invoiceNo}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
        <span style="color: ${BRAND_COLORS.muted};">Date:</span>
        <strong>${date}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 13px;">
        <span style="color: ${BRAND_COLORS.muted};">Payment Mode:</span>
        <strong>${mode}</strong>
      </div>
    </div>

    <table class="table">
      <thead>
        <tr style="border-bottom: 2px solid ${BRAND_COLORS.border};">
          <th style="text-align: left; padding: 8px 12px; font-size: 12px; color: ${BRAND_COLORS.muted}; text-transform: uppercase;">Item / Service</th>
          <th style="text-align: center; padding: 8px 12px; font-size: 12px; color: ${BRAND_COLORS.muted}; text-transform: uppercase;">Qty</th>
          <th style="text-align: right; padding: 8px 12px; font-size: 12px; color: ${BRAND_COLORS.muted}; text-transform: uppercase;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${lines.map(line => `
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #F1F5F9; font-weight: 600;">${line.name}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #F1F5F9; text-align: center; color: ${BRAND_COLORS.muted};">${line.qty}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #F1F5F9; text-align: right; font-weight: 700;">₹${line.price * line.qty}</td>
          </tr>
        `).join('')}
        <tr>
          <td colspan="2" style="padding: 14px 12px; font-size: 15px; font-weight: 800; color: ${BRAND_COLORS.primary}; text-align: right;">Total Paid:</td>
          <td style="padding: 14px 12px; font-size: 18px; font-weight: 800; color: ${BRAND_COLORS.primary}; text-align: right;">₹${total}</td>
        </tr>
      </tbody>
    </table>

    <div style="text-align: center; margin-top: 24px;">
      <a href="https://wa.me/919876543210" class="btn">Book Your Next Session</a>
    </div>

    <p style="font-size: 12px; color: ${BRAND_COLORS.muted}; text-align: center; margin-top: 16px;">
      We appreciate your patronage. Have a glamorous day! ✨
    </p>
  `;

  return baseLayout(content, `Official digital invoice #${invoiceNo} from Shree Beauty Studio (₹${total})`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. MARKETING / PROMOTIONAL CAMPAIGN EMAIL
// ─────────────────────────────────────────────────────────────────────────────

export interface MarketingCampaignEmailProps {
  headline: string;
  message: string;
  promoCode?: string;
  discountText?: string;
  ctaText?: string;
  ctaLink?: string;
  salonName?: string;
}

export function renderMarketingCampaignHtml(props: MarketingCampaignEmailProps): string {
  const {
    headline,
    message,
    promoCode,
    discountText,
    ctaText = 'Book Appointment Now',
    ctaLink = 'http://localhost:3000/book',
    salonName = 'Shree Beauty Studio',
  } = props;

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span class="pill pill-gold">✨ EXCLUSIVE SALON OFFER ✨</span>
      <h2 style="color: ${BRAND_COLORS.primary}; font-size: 24px; margin: 16px 0 10px; line-height: 1.3;">
        ${headline}
      </h2>
      <div style="font-size: 15px; color: ${BRAND_COLORS.charcoal}; line-height: 1.7; max-width: 500px; margin: 0 auto; white-space: pre-line;">
        ${message}
      </div>
    </div>

    ${discountText || promoCode ? `
    <div class="coupon-box">
      ${discountText ? `
      <div style="font-size: 24px; font-weight: 800; color: ${BRAND_COLORS.primary}; margin-bottom: 6px;">
        ${discountText}
      </div>` : ''}
      ${promoCode ? `
      <p style="font-size: 13px; color: ${BRAND_COLORS.muted}; margin: 4px 0 10px;">Use promo code at checkout or mention upon arrival:</p>
      <div class="coupon-code">${promoCode}</div>` : ''}
    </div>` : ''}

    <div style="text-align: center; margin: 28px 0;">
      <a href="${ctaLink}" class="btn">${ctaText}</a>
    </div>

    <p style="font-size: 12.5px; color: ${BRAND_COLORS.muted}; text-align: center;">
      Visit us at ${salonName} or WhatsApp us directly for personalized styling consultations.
    </p>
  `;

  return baseLayout(content, headline);
}
