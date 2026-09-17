import { NextRequest, NextResponse } from 'next/server';
import { parseTimeTo24 } from '@/lib/calendar';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get('title') || searchParams.get('s') || 'Salon Appointment — Shree Beauty Studio';
  const date = searchParams.get('date') || searchParams.get('d') || new Date().toISOString().split('T')[0];
  const time = searchParams.get('time') || searchParams.get('t') || '10:00';
  const duration = parseInt(searchParams.get('dur') || '60', 10);

  const [y, m, d] = date.split('-');
  const time24 = parseTimeTo24(time);
  const [h, min] = time24.split(':');
  const dtStart = `${y}${m}${d}T${h}${min}00`;

  const endDate = new Date(`${date}T${time24}:00`);
  endDate.setMinutes(endDate.getMinutes() + (duration || 60));
  const endY = endDate.getFullYear();
  const endM = String(endDate.getMonth() + 1).padStart(2, '0');
  const endD = String(endDate.getDate()).padStart(2, '0');
  const endH = String(endDate.getHours()).padStart(2, '0');
  const endMin = String(endDate.getMinutes()).padStart(2, '0');
  const dtEnd = `${endY}${endM}${endD}T${endH}${endMin}00`;

  const gcalParams = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${title} — Shree Beauty Studio`,
    dates: `${dtStart}/${dtEnd}`,
    location: 'Shree Beauty Studio, 22 Radhika Society, Katargam, Surat',
  });

  const redirectUrl = `https://calendar.google.com/calendar/render?${gcalParams.toString()}`;
  return NextResponse.redirect(redirectUrl, { status: 307 });
}
