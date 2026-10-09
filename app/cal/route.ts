import { NextRequest, NextResponse } from 'next/server';
import { parseTimeTo24, toStandardYYYYMMDD, formatICSDate, addMinutes } from '@/lib/calendar';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const customer = searchParams.get('c') || searchParams.get('name') || '';
  const service = searchParams.get('s') || searchParams.get('service') || 'Salon Service';
  const rawDate = searchParams.get('d') || searchParams.get('date') || new Date().toISOString().split('T')[0];
  const date = toStandardYYYYMMDD(rawDate);
  const time = searchParams.get('t') || searchParams.get('time') || '10:00';
  const duration = parseInt(searchParams.get('dur') || '60', 10);
  const address = '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004';
  const phone = '+91 98241 83769';

  const time24 = parseTimeTo24(time);
  const dtStart = formatICSDate(date, time24);
  const dtEnd = addMinutes(date, time24, duration);

  const title = customer ? `💅 ${customer} — ${service}` : `💅 Shree Beauty Studio — ${service}`;
  const details = [
    `💅 SHREE BEAUTY STUDIO — APPOINTMENT`,
    `─────────────────────────────────`,
    customer ? `👤 Customer: ${customer}` : '',
    `💄 Service: ${service}`,
    `📅 Date: ${date}`,
    `⏰ Time: ${time}`,
    `📍 Address: ${address}`,
    `📍 Google Maps: https://maps.app.goo.gl/cwP9HTnqTFzVPYDW8`,
    `📸 Instagram: @shreebeauty.studio`,
    `📞 Contact: ${phone}`,
  ].filter(Boolean).join('\n');

  const gcalParams = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${dtStart}/${dtEnd}`,
    details: details,
    location: address,
    crm: 'BUSY',
    ctz: 'Asia/Kolkata',
  });

  const redirectUrl = `https://calendar.google.com/calendar/render?${gcalParams.toString()}`;
  return NextResponse.redirect(redirectUrl, { status: 307 });
}
