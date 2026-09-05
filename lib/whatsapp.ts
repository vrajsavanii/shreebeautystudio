// lib/whatsapp.ts
//
// Meta WhatsApp Cloud API — Pure API System (No WhatsApp Web Redirects)

import { Appointment, Invoice } from '@/types/salon';
import { fmtDate, money } from './utils';

/**
 * Send a WhatsApp text message directly via Meta WhatsApp Cloud API (Zero Browser Redirects).
 */
export async function sendDirectWhatsAppMessage(
  mobile: string,
  message: string,
  settings?: any
): Promise<{ success: boolean; method: string; message: string }> {
  const num = mobile.replace(/\D/g, '').slice(-10);
  if (!num) {
    return { success: false, method: 'none', message: 'Recipient mobile number is invalid or missing.' };
  }

  try {
    const res = await fetch('/api/whatsapp/send-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: `91${num}`,
        message,
      }),
    });

    const json = await res.json();
    if (res.ok && json.success) {
      return { success: true, method: 'meta_cloud_api', message: 'Message sent via Meta WhatsApp API' };
    }
    return { success: false, method: 'none', message: json.error || 'Failed to send Meta WhatsApp API message' };
  } catch (err: any) {
    return { success: false, method: 'none', message: err?.message || 'Network error sending WhatsApp message' };
  }
}

// Backward compatibility helper wrappers (all redirect to Meta API with NO web popups)
export function openWA(mobile: string, message: string) {
  sendDirectWhatsAppMessage(mobile, message);
}

export function openWAWeb(mobile?: string, message?: string) {
  if (mobile && message) {
    sendDirectWhatsAppMessage(mobile, message);
  }
}

export function openWAApp(mobile: string, message: string) {
  sendDirectWhatsAppMessage(mobile, message);
}

export function appointmentStaffMessage(a: Appointment, salon: string): string {
  return `📢 *NEW APPOINTMENT ALERT — ${salon}* 📢
────────────────────────────
👤 Customer: ${a.customer}
📞 Mobile: ${a.mobile}
📅 Date: ${fmtDate(a.date)}
⏰ Time: ${a.time}
💄 Service: ${a.service}
👩‍💼 Assigned Staff: ${a.staff || 'Studio Team'}
💵 Advance Paid: ${money(a.advance || 0)}
📝 Notes: ${a.notes || 'None'}
────────────────────────────
Please prepare the station and products in advance. ✨`;
}

export function appointmentCustomerMessage(
  a: Appointment,
  salon: string,
  address: string
): string {
  return `✨ *APPOINTMENT CONFIRMED — ${salon}* ✨
────────────────────────────
Dear ${a.customer},
Your appointment is confirmed! Here are your booking details:

📅 Date: ${fmtDate(a.date)}
⏰ Time: ${a.time}
💄 Service: ${a.service}
👩‍💼 Artist: ${a.staff || 'Senior Beautician'}
💵 Advance Paid: ${money(a.advance || 0)}
📍 Address: ${address || 'Ring Road, Surat'}

Thank you for choosing ${salon}! We look forward to pampering you. 💖`;
}

export function appointmentReminderMessage(a: Appointment, salon: string): string {
  return `⏰ *APPOINTMENT REMINDER — ${salon}* ⏰
────────────────────────────
Dear ${a.customer},
This is a gentle reminder for your upcoming salon appointment:

📅 Date: ${fmtDate(a.date)}
⏰ Time: ${a.time}
💄 Service: ${a.service}

Please arrive 5-10 minutes prior to your time.
If you need to reschedule, reply to this message. See you soon! 💖`;
}

export function invoiceMessage(inv: Invoice, salon: string): string {
  return `🧾 *INVOICE RECEIPT — ${salon}* 🧾
────────────────────────────
Dear ${inv.customer},
Thank you for visiting ${salon}!

📄 Invoice No: ${inv.no}
📅 Date: ${fmtDate(inv.date)}
💵 Total Amount: ${money(inv.total)}
💳 Payment Mode: ${inv.mode}

Attached is your official digital PDF receipt. Have a wonderful day! ✨`;
}

export function bridalMessage(
  nameOrSalon: string,
  event?: string,
  date?: string,
  venue?: string,
  salonName?: string
): string {
  if (event || date || venue || salonName) {
    const salon = salonName || 'Shree Beauty Studio';
    const clientName = nameOrSalon || 'Bride';
    const eventText = event || 'Bridal & Events';
    const dateText = date ? fmtDate(date) : '';
    const venueText = venue ? `📍 Venue: ${venue}\n` : '';
    return `👑 *BRIDAL BOOKING CONFIRMATION — ${salon}* 👑
────────────────────────────
Dear ${clientName},
Thank you for booking your Bridal & Event makeup package with us!

👑 Package / Event: ${eventText}
${dateText ? `📅 Date: ${dateText}\n` : ''}${venueText}
✨ Our team will ensure a flawless, royalty glam look for your special day!

For details or changes, reply to this message. 💖`;
  }

  const salon = nameOrSalon || 'Shree Beauty Studio';
  return `👑 *THE GLAMOUR LOUNGE — BRIDAL & SIDERS PACKAGES* 👑
────────────────────────────
Dear Client,
Attached is our official 2-Page Bridal & Siders Rate Card PDF from ${salon}.

✨ *Bridal Packages* include Makeup, Hairstyle, Jewellery, Lenses, Extensions & Draping.
✨ *Siders Packages* include Makeup, Hairstyle & Draping.

For consultation & date bookings, feel free to reply to this message! 💖`;
}

export function sendWhatsAppDirectMessage(mobile: string, message: string, settings?: any) {
  return sendDirectWhatsAppMessage(mobile, message, settings);
}

export function customerReminderMessage(name: string, salon: string, address: string): string {
  return `✨ *HELLLO ${name.toUpperCase()} — ${salon}* ✨\nWe look forward to pampering you at ${salon}! Address: ${address || 'Surat'}. Have a wonderful day! 💖`;
}

export function birthdayMessage(name: string, salon: string, discount?: number): string {
  const discText = discount ? ` Visit us today for your special ${discount}% birthday treat discount! 🎁✨` : ' Visit us today for your special birthday treat discount! 🎁✨';
  return `🎉 *HAPPY BIRTHDAY ${name.toUpperCase()}!* 🎂\nFrom all of us at ${salon}, we wish you a fantastic year ahead!${discText}`;
}

export function anniversaryMessage(name: string, salon: string): string {
  return `💍 *HAPPY ANNIVERSARY ${name.toUpperCase()}!* 💕\nWishing you and your partner love and happiness on your anniversary! Celebrate with a relaxing pampering session at ${salon}! ✨`;
}

export function sagaiAnniversaryMessage(name: string, salon: string): string {
  return `✨ *HAPPY ENGAGEMENT ANNIVERSARY ${name.toUpperCase()}!* 💍\nWishing you joy on your Engagement Anniversary! Warm wishes from ${salon}. 💖`;
}

export function reviewRequestMessage(name: string, salon: string, link?: string): string {
  return `⭐ *HOW WAS YOUR EXPERIENCE AT ${salon.toUpperCase()}?* ⭐\nDear ${name}, thank you for visiting us! Please share your valuable feedback: ${link || 'Google Review'}. 💖`;
}

export function paymentReminderMessage(name: string, amount: number, salon: string, upiId?: string): string {
  const upiText = upiId ? `\n💳 UPI / GPay ID: ${upiId}` : '';
  return `🔔 *PAYMENT DUE REMINDER — ${salon}* 🔔\nDear ${name}, you have a pending balance of ${money(amount)} at ${salon}.${upiText}\nKindly settle your dues at your convenience. Thank you! 🙏`;
}

export function loyaltyBalanceMessage(name: string, points: number, walletOrSalon?: number | string, salonName?: string): string {
  let wallet = 0;
  let salon = 'Shree Beauty Studio';
  if (typeof walletOrSalon === 'number') {
    wallet = walletOrSalon;
    salon = salonName || 'Shree Beauty Studio';
  } else if (typeof walletOrSalon === 'string') {
    salon = walletOrSalon;
  }
  const walletText = wallet > 0 ? `\n💳 Wallet Balance: ${money(wallet)}` : '';
  return `⭐ *LOYALTY REWARDS & WALLET BALANCE — ${salon}* ⭐\nDear ${name}, you currently have ${points} VIP Loyalty Points!${walletText}\nRedeem them on your next salon service. ✨`;
}

export function festivalPromoMessage(name: string, promo: string, salon: string): string {
  return `🎉 *EXCLUSIVE FESTIVAL OFFER FOR ${name.toUpperCase()} — ${salon}* 🎉\n${promo}\nBook your slot today! Limited seats. 💖`;
}
