// app/api/calendar/feed.ics/route.ts
// Live iCal / WebCal Google Calendar Subscription Feed
// Allows Salon Owner & Staff to subscribe directly in Google Calendar (Add calendar -> From URL)
// for continuous 24/7 background synchronization.

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { DEFAULT_DATA } from '@/lib/store';
import { SalonData, Appointment, BridalBooking } from '@/types/salon';
import { timeToMinutes } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function formatICSDate(dateStr: string, timeStr: string, durationMinutes: number = 45): { start: string; end: string } {
  const [y, m, d] = dateStr.split('-').map(Number);
  const startMins = timeToMinutes(timeStr || '10:00');
  const startH = Math.floor(startMins / 60);
  const startMin = startMins % 60;

  const endMins = startMins + (durationMinutes || 45);
  const endH = Math.floor(endMins / 60);
  const endMin = endMins % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  const start = `${y}${pad(m)}${pad(d)}T${pad(startH)}${pad(startMin)}00`;
  const end = `${y}${pad(m)}${pad(d)}T${pad(endH)}${pad(endMin)}00`;

  return { start, end };
}

function escapeICS(str: string): string {
  return (str || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const { data: rows } = await supabase
      .from('salon_state')
      .select('data')
      .order('updated_at', { ascending: false })
      .limit(1);

    const salonData: SalonData = rows && rows.length > 0 && rows[0].data
      ? (rows[0].data as SalonData)
      : { ...DEFAULT_DATA };

    const salon = salonData.settings?.salon || 'Shree Beauty Studio';
    const address = salonData.settings?.address || 'Katargam, Surat, Gujarat';
    const appointments: Appointment[] = (salonData.appointments || []).filter(
      (a) => a.status !== 'Cancelled' && a.workStatus !== 'Cancelled'
    );
    const bridalBookings: BridalBooking[] = (salonData.bridal || []).filter(
      (b) => b.status !== 'Cancelled'
    );

    const nowStamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

    const eventsICS: string[] = [];

    // 1. Convert regular appointments to VEVENT
    for (const a of appointments) {
      if (!a.date) continue;
      const { start, end } = formatICSDate(a.date, a.time || '10:00 AM', 60);
      const summary = `💅 [${salon}] ${a.service} - ${a.customer}`;
      const desc = `Customer: ${a.customer}\\nMobile: +91 ${a.mobile}\\nService: ${a.service}\\nStaff: ${a.staff || 'Beautician'}\\nAdvance: Rs.${a.advance || 0}\\nNotes: ${a.notes || ''}\\nLocation: ${address}`;

      eventsICS.push(`BEGIN:VEVENT
UID:appt-${a.id || Math.random().toString(36).slice(2)}@shreestudio
DTSTAMP:${nowStamp}
DTSTART;TZID=Asia/Kolkata:${start}
DTEND;TZID=Asia/Kolkata:${end}
SUMMARY:${escapeICS(summary)}
DESCRIPTION:${escapeICS(desc)}
LOCATION:${escapeICS(address)}
STATUS:CONFIRMED
BEGIN:VALARM
TRIGGER:-PT60M
ACTION:DISPLAY
DESCRIPTION:Appointment Reminder: ${escapeICS(summary)}
END:VALARM
BEGIN:VALARM
TRIGGER:-PT1440M
ACTION:DISPLAY
DESCRIPTION:Upcoming Appointment Tomorrow: ${escapeICS(summary)}
END:VALARM
END:VEVENT`);
    }

    // 2. Convert bridal bookings to VEVENT
    for (const b of bridalBookings) {
      const bDate = b.weddingDate || b.date;
      if (!bDate) continue;
      const { start, end } = formatICSDate(bDate, '08:00 AM', 180);
      const summary = `👑 [${salon} Bridal] ${b.name} (${b.packageName || 'Bridal Glam'})`;
      const desc = `Bride: ${b.name}\\nMobile: +91 ${b.mobile}\\nPackage: ${b.packageName || 'Bridal'}\\nTotal: Rs.${b.package || 0}\\nAdvance: Rs.${b.advance || 0}\\nVenue: ${b.venue || address}\\nNotes: ${b.notes || ''}`;

      eventsICS.push(`BEGIN:VEVENT
UID:bridal-${b.id || Math.random().toString(36).slice(2)}@shreestudio
DTSTAMP:${nowStamp}
DTSTART;TZID=Asia/Kolkata:${start}
DTEND;TZID=Asia/Kolkata:${end}
SUMMARY:${escapeICS(summary)}
DESCRIPTION:${escapeICS(desc)}
LOCATION:${escapeICS(b.venue || address)}
STATUS:CONFIRMED
BEGIN:VALARM
TRIGGER:-PT1440M
ACTION:DISPLAY
DESCRIPTION:Bridal Event Reminder: ${escapeICS(summary)}
END:VALARM
BEGIN:VALARM
TRIGGER:-PT120M
ACTION:DISPLAY
DESCRIPTION:Bridal Event Today: ${escapeICS(summary)}
END:VALARM
END:VEVENT`);
    }

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Shree Beauty Studio//Appointment Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${salon} Appointments
X-WR-TIMEZONE:Asia/Kolkata
X-WR-CALDESC:Live Appointment & Bridal Schedule for ${salon}
${eventsICS.join('\n')}
END:VCALENDAR`;

    return new Response(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="shree-studio-calendar.ics"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('[Calendar Feed ICS Error]:', err?.message);
    return new Response('Error generating calendar feed', { status: 500 });
  }
}
