import { NextRequest, NextResponse } from 'next/server';
import { parseTimeTo24, toStandardYYYYMMDD, formatICSDate, addMinutes } from '@/lib/calendar';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get('title') || searchParams.get('s') || 'Salon Appointment — Shree Beauty Studio';
  const rawDate = searchParams.get('date') || searchParams.get('d') || new Date().toISOString().split('T')[0];
  const date = toStandardYYYYMMDD(rawDate);
  const time = searchParams.get('time') || searchParams.get('t') || '10:00';
  const duration = parseInt(searchParams.get('dur') || '60', 10);
  const details = searchParams.get('desc') || searchParams.get('details') || `Appointment at Shree Beauty Studio, Katargam, Surat. Contact: +91 98241 83769.`;

  const time24 = parseTimeTo24(time);
  const dtStart = formatICSDate(date, time24);
  const dtEnd = addMinutes(date, time24, duration);

  const gcalParams = new URLSearchParams({
    action: 'TEMPLATE',
    text: title.includes('Shree Beauty Studio') ? title : `${title} — Shree Beauty Studio`,
    dates: `${dtStart}/${dtEnd}`,
    details: details,
    location: 'Shree Beauty Studio, 22 Radhika Society, Opp. Cancer Hospital, Katargam, Surat',
    ctz: 'Asia/Kolkata',
  });

  const redirectUrl = `https://calendar.google.com/calendar/render?${gcalParams.toString()}`;
  return NextResponse.redirect(redirectUrl, { status: 307 });
}
