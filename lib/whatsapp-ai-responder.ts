// lib/whatsapp-ai-responder.ts
//
// WhatsApp AI Auto-Responder & Interactive Workflow Engine for Shree Beauty Studio
// 100% Free via Meta WhatsApp Cloud API within 24-Hour Customer Service Window.
//
// Workflows supported:
// 1. Welcome Menu with Clickable Interactive Buttons (Book Appt, See Bookings, Other Inquiries)
// 2. Book Appointment (Instant portal link + conversational booking)
// 3. See Your Appointment (Live database lookup by customer phone number)
// 4. Other Inquiries (Bridal Rate Card PDF, Service Catalog, Location & Map, Timings)
// 5. Automated Bridal PDF Dispatch & AI NLP Booking parser

import { parseWhatsAppBookingMessage } from './whatsapp-parser';
import { SalonData, Appointment } from '@/types/salon';
import { fmtDate, money } from './utils';

export interface WhatsAppAIResponse {
  intent:
    | 'WELCOME_MENU'
    | 'BOOK_APPOINTMENT_MENU'
    | 'SEE_APPOINTMENTS'
    | 'OTHER_INQUIRIES'
    | 'BRIDAL_PDF'
    | 'APPOINTMENT_BOOKING'
    | 'GENERAL_INQUIRY';
  replyText: string;
  pdfSent: boolean;
  appointmentCreated: boolean;
  appointmentData?: any;
}

export async function processWhatsAppAIMessage(
  messageText: string,
  customerMobile: string,
  customerName: string,
  salonData: SalonData,
  originUrl?: string,
  buttonId?: string
): Promise<WhatsAppAIResponse> {
  const rawText = (messageText || '').trim();
  const lower = rawText.toLowerCase();
  const bId = (buttonId || '').trim();
  const cleanMobile = customerMobile.replace(/\D/g, '').slice(-10);
  const recipientName = customerName && customerName !== 'WhatsApp Customer' ? customerName : 'Valued Client';
  const salonName = salonData.settings?.salon || 'Shree Beauty Studio';
  const cleanSalon = (salonData.settings?.whatsapp || '919773240010').replace(/\D/g, '').slice(-10);
  const baseUrl = originUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://shree-beauty-studio.vercel.app';

  // ───────────────────────────────────────────────────────────────────────────
  // FLOW 2: "SEE YOUR APPOINTMENT" (Option 2 / btn_see_appointment)
  // ───────────────────────────────────────────────────────────────────────────
  if (
    bId === 'btn_see_appointment' ||
    lower === '2' ||
    lower === '2.' ||
    lower.startsWith('2 ') ||
    lower === '2️⃣' ||
    lower.includes('see appointment') ||
    lower.includes('my appointment') ||
    lower.includes('check appointment') ||
    lower.includes('view appointment') ||
    lower.includes('my booking') ||
    lower.includes('check booking') ||
    lower.includes('booking status') ||
    lower.includes('appointment status') ||
    lower.includes('when is my') ||
    lower === 'status' ||
    lower === 'appointments' ||
    lower === 'bookings'
  ) {
    // Look up upcoming appointments for this phone number
    const allUserAppts = (salonData.appointments || [])
      .filter((a) => (a.mobile || '').replace(/\D/g, '').slice(-10) === cleanMobile)
      .filter((a) => a.status !== 'Cancelled')
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    let replyText = '';

    if (allUserAppts.length > 0) {
      const apptList = allUserAppts
        .map((a, idx) => {
          const statusIcon = a.status === 'Confirmed' ? '✅ Confirmed' : '⏳ Pending Confirmation';
          const advText = Number(a.advance || 0) > 0 ? `\n   💵 Advance Paid: ${money(a.advance || 0)}` : '';
          return `${idx + 1}️⃣ *${a.service || 'Salon Service'}*\n   📅 Date: *${fmtDate(a.date)}*\n   ⏰ Time: *${a.time}*\n   👩‍💼 Specialist: *${a.staff || 'Studio Team'}*\n   📌 Status: ${statusIcon}${advText}`;
        })
        .join('\n\n');

      replyText = `📅 *YOUR SALON APPOINTMENTS — ${salonName.toUpperCase()}* 📅
────────────────────────────
Dear ${recipientName}, here are your booked appointments:

${apptList}

────────────────────────────
📍 *Studio Address:* 22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat
📍 *Google Map:* https://maps.app.goo.gl/cwP9HTnqTFzVPYDW8
📱 *View Online:* ${baseUrl}/my-appointments?mobile=${cleanMobile}

💬 Need to reschedule or have questions? Simply reply to this chat! 💖`;
    } else {
      replyText = `📅 *APPOINTMENT LOOKUP — ${salonName.toUpperCase()}* 📅
────────────────────────────
Dear ${recipientName}, no active upcoming appointments were found for mobile *+91 ${cleanMobile}*.

✨ *Would you like to schedule an appointment today?*
👉 *Book Online:* ${baseUrl}/book
💬 *Or reply in chat:* *"Book Facial tomorrow at 4 PM"*

We look forward to pampering you! 💖`;
    }

    try {
      await fetch(`${baseUrl}/api/whatsapp/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: `91${cleanMobile}`,
          message: replyText,
        }),
      });
    } catch {}

    return {
      intent: 'SEE_APPOINTMENTS',
      replyText,
      pdfSent: false,
      appointmentCreated: false,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // FLOW 1: "BOOK APPOINTMENT" (Option 1 / btn_book_appointment)
  // ───────────────────────────────────────────────────────────────────────────
  // Check if customer explicitly specified a full booking request with date/time
  const isDirectBookingRequest =
    (lower.includes('book') || lower.includes('appointment') || lower.includes('બુક')) &&
    (lower.includes('tomorrow') || lower.includes('today') || lower.includes('am') || lower.includes('pm') || lower.includes(':') || /\d{1,2}[\/\-]\d{1,2}/.test(lower));

  if (isDirectBookingRequest) {
    const parsed = parseWhatsAppBookingMessage(rawText, salonData.services || [], recipientName);
    const defaultStaff = salonData.staff?.[0]?.name || 'Amita';
    const replyText = `✨ *APPOINTMENT CONFIRMED — ${salonName.toUpperCase()}* ✨
────────────────────────────
Dear ${recipientName},
Your appointment has been scheduled successfully:

💄 Service: *${parsed.service}*
📅 Date: *${fmtDate(parsed.date)}*
⏰ Time: *${parsed.time}*
👩‍💼 Specialist: *${defaultStaff}*
📍 Location: 22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat
📍 Google Map: https://maps.app.goo.gl/cwP9HTnqTFzVPYDW8

Thank you for choosing ${salonName}! See you soon. 💖`;

    try {
      await fetch(`${baseUrl}/api/whatsapp/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: `91${cleanMobile}`,
          message: replyText,
        }),
      });
    } catch {}

    return {
      intent: 'APPOINTMENT_BOOKING',
      replyText,
      pdfSent: false,
      appointmentCreated: true,
      appointmentData: parsed,
    };
  }

  if (
    bId === 'btn_book_appointment' ||
    lower === '1' ||
    lower === '1.' ||
    lower.startsWith('1 ') ||
    lower === '1️⃣' ||
    lower === 'book' ||
    lower === 'book appointment' ||
    lower === 'new appointment' ||
    lower === 'appointment' ||
    lower === 'booking' ||
    lower === 'બુક' ||
    lower === 'એપોઈન્ટમેન્ટ'
  ) {
    const replyText = `✨ *BOOK AN APPOINTMENT — ${salonName.toUpperCase()}* ✨
────────────────────────────
Dear ${recipientName}, booking your beauty treatment is quick & easy!

📱 *1. Instant Online Booking (Pick Date, Time & Stylist):*
👉 ${baseUrl}/book

💬 *2. Or Book Directly in this WhatsApp Chat:*
Simply reply with your desired service & preferred time, for example:
• *"Book Hydra Facial tomorrow at 4 PM"*
• *"Book Hair Spa on Saturday 11 AM"*
• *"Book Bridal Makeup on 25th Dec"*

Our salon specialist will confirm your slot right here! 💖`;

    try {
      await fetch(`${baseUrl}/api/whatsapp/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: `91${cleanMobile}`,
          message: replyText,
        }),
      });
    } catch {}

    return {
      intent: 'BOOK_APPOINTMENT_MENU',
      replyText,
      pdfSent: false,
      appointmentCreated: false,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // BRIDAL RATE CARD & PDF DISPATCH
  // ───────────────────────────────────────────────────────────────────────────
  if (
    lower.includes('rate card') ||
    lower.includes('bridal') ||
    lower.includes('siders') ||
    lower.includes('wedding') ||
    (lower.includes('pdf') && !lower.includes('invoice'))
  ) {
    const replyText = `👑 *SHREE BEAUTY STUDIO — BRIDAL RATE CARD* 👑
────────────────────────────
Dear ${recipientName},
Here is our official 2-Page Bridal & Siders Rate Card PDF!

✨ *Bridal Packages* include Makeup, Hairstyle, Jewellery, Lenses, Extensions & Draping.
✨ *Siders Packages* include Makeup, Hairstyle & Draping.

📞 Booking Helpline: +91 ${cleanSalon}
💖 *Thank you for choosing ${salonName}!*`;

    let pdfSent = false;
    try {
      const resPdf = await fetch(`${baseUrl}/api/whatsapp/send-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: `91${cleanMobile}`,
          filename: 'Shree_Beauty_Studio_Bridal_Rate_Card.pdf',
          caption: replyText,
        }),
      });
      const json = await resPdf.json();
      if (json.success) pdfSent = true;
    } catch {
      pdfSent = false;
    }

    return {
      intent: 'BRIDAL_PDF',
      replyText,
      pdfSent,
      appointmentCreated: false,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // FLOW 3: "OTHER INQUIRIES" (Option 3 / btn_other_inquiries)
  // ───────────────────────────────────────────────────────────────────────────
  if (
    bId === 'btn_other_inquiries' ||
    lower === '3' ||
    lower === '3.' ||
    lower.startsWith('3 ') ||
    lower === '3️⃣' ||
    lower === 'other' ||
    lower === 'inquiry' ||
    lower === 'inquiries' ||
    lower === 'help' ||
    lower === 'info' ||
    lower === 'options' ||
    lower === 'menu' ||
    lower === 'માહિતી'
  ) {
    const replyText = `🌸 *${salonName.toUpperCase()} — INQUIRIES & SERVICES* 🌸
────────────────────────────
Dear ${recipientName}, how can we help you today?

👑 *1. Bridal & Siders Packages:*
Type *"Bridal Rate Card"* to receive our official 2-Page PDF catalog!

💄 *2. View Complete Services & Pricing:*
👉 ${baseUrl}/services

📍 *3. Studio Address & Directions:*
22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat
👉 Google Map: https://maps.app.goo.gl/cwP9HTnqTFzVPYDW8

⏰ *4. Working Hours:*
Monday – Sunday: 09:00 AM – 08:30 PM

📸 *5. Instagram Portfolio:*
Follow: @shreebeauty.studio (https://www.instagram.com/shreebeauty.studio/)

📞 *6. Speak With Master Stylist / Front Desk:*
Call: +91 ${cleanSalon} / +91 98253 39924

Reply with your choice or ask any question! ✨💖`;

    try {
      await fetch(`${baseUrl}/api/whatsapp/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: `91${cleanMobile}`,
          message: replyText,
        }),
      });
    } catch {}

    return {
      intent: 'OTHER_INQUIRIES',
      replyText,
      pdfSent: false,
      appointmentCreated: false,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // QUICK SHORTCUTS (Location, Timings)
  // ───────────────────────────────────────────────────────────────────────────
  if (lower.includes('address') || lower.includes('location') || lower.includes('સરનામું') || lower.includes('map')) {
    const replyText = `📍 *${salonName} Location* 📍
22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat - 395004.
📍 Google Map: https://maps.app.goo.gl/cwP9HTnqTFzVPYDW8
📸 Instagram: @shreebeauty.studio (https://www.instagram.com/shreebeauty.studio/)
📞 Front Desk: +91 ${cleanSalon}`;

    try {
      await fetch(`${baseUrl}/api/whatsapp/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: `91${cleanMobile}`, message: replyText }),
      });
    } catch {}

    return { intent: 'GENERAL_INQUIRY', replyText, pdfSent: false, appointmentCreated: false };
  }

  if (lower.includes('time') || lower.includes('hour') || lower.includes('open') || lower.includes('સમય')) {
    const replyText = `🌸 *${salonName} Hours* 🌸
We are open Monday to Sunday: 09:00 AM – 08:30 PM.
📞 For instant bookings: +91 ${cleanSalon}
👉 Book Online: ${baseUrl}/book`;

    try {
      await fetch(`${baseUrl}/api/whatsapp/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: `91${cleanMobile}`, message: replyText }),
      });
    } catch {}

    return { intent: 'GENERAL_INQUIRY', replyText, pdfSent: false, appointmentCreated: false };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // DEFAULT / WELCOME MENU (When customer sends "Hi", "Hello", or scans QR)
  // Sends WhatsApp Interactive Buttons + Text Menu Fallback
  // ───────────────────────────────────────────────────────────────────────────
  const welcomeBodyText = `🌸 *Welcome to ${salonName}!* 🌸
Hello *${recipientName}*, thank you for messaging us! 💖

Please choose an option below or reply with a number:
1️⃣ *Book Appointment*
2️⃣ *See Your Appointment*
3️⃣ *Other Inquiries (Prices, Bridal PDF, Location)*`;

  const interactivePayload = {
    type: 'button',
    header: {
      type: 'text',
      text: `${salonName} ✨`,
    },
    body: {
      text: welcomeBodyText,
    },
    footer: {
      text: `Katargam, Surat • +91 ${cleanSalon}`,
    },
    action: {
      buttons: [
        {
          type: 'reply',
          reply: {
            id: 'btn_book_appointment',
            title: '📅 Book Appt',
          },
        },
        {
          type: 'reply',
          reply: {
            id: 'btn_see_appointment',
            title: '🔍 My Bookings',
          },
        },
        {
          type: 'reply',
          reply: {
            id: 'btn_other_inquiries',
            title: '🌸 Other Inquiries',
          },
        },
      ],
    },
  };

  try {
    await fetch(`${baseUrl}/api/whatsapp/send-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: `91${cleanMobile}`,
        type: 'interactive',
        interactive: interactivePayload,
        message: welcomeBodyText,
      }),
    });
  } catch {}

  return {
    intent: 'WELCOME_MENU',
    replyText: welcomeBodyText,
    pdfSent: false,
    appointmentCreated: false,
  };
}
