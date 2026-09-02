// lib/whatsapp-ai-responder.ts
//
// WhatsApp AI Auto-Responder Engine for Shree Beauty Studio
// Automatically replies to incoming customer WhatsApp messages with AI text or PDF dispatches.

import { parseWhatsAppBookingMessage } from './whatsapp-parser';
import { BridalPackage, SalonData } from '@/types/salon';

export interface WhatsAppAIResponse {
  intent: 'BRIDAL_PDF' | 'APPOINTMENT_BOOKING' | 'GENERAL_INQUIRY' | 'PRICE_INQUIRY';
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
  originUrl?: string
): Promise<WhatsAppAIResponse> {
  const lower = messageText.toLowerCase().trim();
  const cleanMobile = customerMobile.replace(/\D/g, '').slice(-10);
  const recipientName = customerName || 'Valued Client';
  const salonName = salonData.settings?.salon || 'Shree Beauty Studio';
  const baseUrl = originUrl || 'http://localhost:3000';

  // 1. Check if customer asked for Bridal Rate Card / PDF / Prices
  if (
    lower.includes('rate card') ||
    lower.includes('bridal') ||
    lower.includes('siders') ||
    lower.includes('pdf') ||
    lower.includes('package price') ||
    lower.includes('wedding')
  ) {
    const replyText = `👑 *SHREE BEAUTY STUDIO — BRIDAL RATE CARD* 👑\n\nDear ${recipientName},\nHere is our official 2-Page Bridal & Siders Rate Card PDF.\n\n✨ *Bridal Packages* include Makeup, Hairstyle, Jewellery, Lenses, Extensions & Draping.\n✨ *Siders Packages* include Makeup, Hairstyle & Draping.\n\n📞 Booking WhatsApp: +${salonData.settings?.whatsapp || '919824183769'}\n💖 *Thank you for choosing ${salonName}!*`;

    let pdfSent = false;

    // Send PDF via Meta Cloud API if configured
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

  // 2. Check if customer asked for Appointment Booking
  if (
    lower.includes('book') ||
    lower.includes('appointment') ||
    lower.includes(' facial') ||
    lower.includes(' haircut') ||
    lower.includes(' spa') ||
    lower.includes('મેકઅપ') ||
    lower.includes('બુક')
  ) {
    const parsed = parseWhatsAppBookingMessage(messageText, salonData.services || [], recipientName);
    const replyText = `✨ *SHREE BEAUTY STUDIO — APPOINTMENT CONFIRMED* ✨\n\nDear ${recipientName},\nYour appointment for *${parsed.service}* has been scheduled:\n📅 Date: *${parsed.date}*\n⏰ Time: *${parsed.time}*\n💇‍♀️ Staff: *Pooja*\n📍 Location: Surat Studio\n\nThank you for choosing ${salonName}! See you soon.💖`;

    // Send confirmation text via Meta Cloud API
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

  // 3. General AI Response for Salon Inquiries
  let aiReplyText = '';
  if (lower.includes('time') || lower.includes('hour') || lower.includes('open') || lower.includes('સમય')) {
    aiReplyText = `🌸 *${salonName} Hours* 🌸\nWe are open Monday to Sunday: 09:00 AM – 08:30 PM.\n📞 For instant bookings: +${salonData.settings?.whatsapp || '919824183769'}`;
  } else if (lower.includes('address') || lower.includes('location') || lower.includes('સરનામું')) {
    aiReplyText = `📍 *${salonName} Location* 📍\nShree Beauty Studio & Bridal Lounge, Ring Road, Surat, Gujarat.\nMap: https://maps.google.com`;
  } else {
    aiReplyText = `🌸 *Welcome to ${salonName}!* 🌸\nDear ${recipientName},\nThank you for messaging us!\n\n✨ Type *"Bridal Rate Card"* to receive our official PDF price list.\n✨ Type *"Book Facial tomorrow 4pm"* to schedule an appointment.\n\nHow can we pamper you today? 💖`;
  }

  // Send AI response text via Meta Cloud API
  try {
    await fetch(`${baseUrl}/api/whatsapp/send-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: `91${cleanMobile}`,
        message: aiReplyText,
      }),
    });
  } catch {}

  return {
    intent: 'GENERAL_INQUIRY',
    replyText: aiReplyText,
    pdfSent: false,
    appointmentCreated: false,
  };
}
