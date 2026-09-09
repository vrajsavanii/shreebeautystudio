// lib/calendar.ts
// Generate .ics calendar file and Google Calendar URL for appointment confirmation & auto reminders

export interface CalendarEvent {
  title: string;
  description: string;
  location: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm or HH:mm AM/PM
  durationMinutes: number;
}

export function parseTimeTo24(timeStr: string = '10:00'): string {
  const str = (timeStr || '').trim();
  if (!str) return '10:00';

  // Match 12-hour format "08:00 AM" or "2:30 PM"
  const match12 = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const mins = match12[2];
    const ampm = match12[3].toUpperCase();
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${mins}`;
  }

  // Match 24-hour format "14:30" or "9:00"
  const match24 = str.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const mins = match24[2];
    return `${String(hours).padStart(2, '0')}:${mins}`;
  }

  return '10:00';
}

function formatICSDate(dateStr: string, timeStr: string): string {
  const [y, m, d] = (dateStr || '2026-09-10').split('-');
  const time24 = parseTimeTo24(timeStr);
  const [h, min] = time24.split(':');
  return `${y}${m}${d}T${h}${min}00`;
}

function addMinutes(dateStr: string, timeStr: string, minutes: number): string {
  const time24 = parseTimeTo24(timeStr);
  const date = new Date(`${dateStr}T${time24}:00`);
  if (isNaN(date.getTime())) {
    return formatICSDate(dateStr, timeStr);
  }
  date.setMinutes(date.getMinutes() + (minutes || 60));
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}${m}${d}T${h}${min}00`;
}

export function generateICS(event: CalendarEvent): string {
  const dtStart = formatICSDate(event.startDate, event.startTime);
  const dtEnd = addMinutes(event.startDate, event.startTime, event.durationMinutes);
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Shree Beauty Studio//Booking System//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
DTSTART:${dtStart}
DTEND:${dtEnd}
DTSTAMP:${now}
SUMMARY:${event.title}
DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n')}
LOCATION:${event.location || 'Shree Beauty Studio, Surat'}
STATUS:CONFIRMED
BEGIN:VALARM
TRIGGER:-PT30M
ACTION:DISPLAY
DESCRIPTION:Reminder: ${event.title} in 30 minutes
END:VALARM
BEGIN:VALARM
TRIGGER:-PT2H
ACTION:DISPLAY
DESCRIPTION:Reminder: ${event.title} in 2 hours
END:VALARM
END:VEVENT
END:VCALENDAR`;
}

export function downloadICS(event: CalendarEvent) {
  if (typeof window === 'undefined') return;
  const icsContent = generateICS(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `appointment-${event.startDate || 'event'}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function getGoogleCalendarUrl(event: CalendarEvent): string {
  const dtStart = formatICSDate(event.startDate, event.startTime);
  const dtEnd = addMinutes(event.startDate, event.startTime, event.durationMinutes);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${dtStart}/${dtEnd}`,
    details: event.description,
    location: event.location,
    crm: 'BUSY',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate a 1-click Google Calendar URL with reminder details for regular appointments.
 */
export function getAppointmentGoogleCalendarUrl(
  a: {
    customer: string;
    mobile?: string;
    service: string;
    date: string;
    time?: string;
    staff?: string;
    advance?: number;
    notes?: string;
    price?: number;
  },
  salon: string = 'Shree Beauty Studio',
  address: string = '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004'
): string {
  const time24 = parseTimeTo24(a.time || '10:00');
  const details = [
    `✨ Appointment Confirmed with ${salon}`,
    `👤 Customer: ${a.customer}`,
    a.mobile ? `📞 Mobile: +91 ${a.mobile}` : '',
    `💄 Service: ${a.service}`,
    a.staff ? `👩‍💼 Beautician: ${a.staff}` : '',
    a.price ? `💰 Price: ₹${a.price}` : '',
    Number(a.advance || 0) > 0 ? `💵 Advance Paid: ₹${a.advance}` : '',
    a.notes ? `📝 Notes: ${a.notes}` : '',
    `\n📍 Studio Address:\n${address}`,
    `📞 Salon Helpline: +91 9824183769`,
  ].filter(Boolean).join('\n');

  return getGoogleCalendarUrl({
    title: `💅 ${a.service} — ${salon} (${a.customer})`,
    description: details,
    location: address || salon,
    startDate: a.date,
    startTime: time24,
    durationMinutes: 60,
  });
}

/**
 * Generate a 1-click Google Calendar URL for bridal appointments.
 */
export function getBridalGoogleCalendarUrl(
  b: {
    name: string;
    mobile?: string;
    packageName?: string;
    weddingDate?: string;
    date?: string;
    venue?: string;
    advance?: number;
    totalAmount?: number;
    sagaiDate?: string;
    event?: string;
  },
  salon: string = 'Shree Beauty Studio',
  address: string = '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004'
): string {
  const eventDate = b.weddingDate || b.date || todayDateString();
  const pkgName = b.packageName || 'Bridal Package';
  const details = [
    `👑 BRIDAL APPOINTMENT — ${salon}`,
    `👰 Bride: ${b.name}`,
    b.mobile ? `📞 Mobile: +91 ${b.mobile}` : '',
    `💄 Package: ${pkgName}`,
    b.event ? `🎉 Event: ${b.event}` : '',
    b.venue ? `📍 Venue: ${b.venue}` : `📍 Studio: ${address}`,
    b.totalAmount ? `💰 Package Total: ₹${b.totalAmount}` : '',
    Number(b.advance || 0) > 0 ? `💵 Advance Paid: ₹${b.advance}` : '',
    `\n📞 Studio Contact: +91 9824183769`,
  ].filter(Boolean).join('\n');

  return getGoogleCalendarUrl({
    title: `👑 Bridal Makeup: ${pkgName} — ${b.name} (${salon})`,
    description: details,
    location: b.venue || address || salon,
    startDate: eventDate,
    startTime: '08:00',
    durationMinutes: 180,
  });
}

function todayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Generates a complete RFC 5545 iCalendar (.ics) string containing ALL active appointments & bridal events.
 */
export function generateBulkAppointmentsICS(
  appointments: Array<{
    id?: string;
    customer: string;
    mobile?: string;
    service: string;
    date: string;
    time?: string;
    staff?: string;
    advance?: number;
    notes?: string;
    price?: number;
    status?: string;
  }>,
  bridals: Array<{
    id?: string;
    name: string;
    mobile?: string;
    packageName?: string;
    weddingDate?: string;
    date?: string;
    venue?: string;
    advance?: number;
    totalAmount?: number;
    package?: number;
    status?: string;
  }> = [],
  salon: string = 'Shree Beauty Studio',
  address: string = '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004'
): string {
  const nowStamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const events: string[] = [];

  (appointments || [])
    .filter((a) => a.date && a.status !== 'Cancelled')
    .forEach((a) => {
      const dtStart = formatICSDate(a.date, a.time || '10:00');
      const dtEnd = addMinutes(a.date, a.time || '10:00', 60);
      const summary = `💅 ${a.service} — ${a.customer} (${salon})`;
      const desc = [
        `Appointment: ${a.service}`,
        `Customer: ${a.customer}`,
        a.mobile ? `Mobile: +91 ${a.mobile}` : '',
        a.staff ? `Beautician: ${a.staff}` : '',
        a.price ? `Price: ₹${a.price}` : '',
        a.advance ? `Advance: ₹${a.advance}` : '',
        a.notes ? `Notes: ${a.notes}` : '',
        `Address: ${address}`,
      ].filter(Boolean).join('\\n');

      events.push(`BEGIN:VEVENT
UID:appt-${a.id || Math.random().toString(36).slice(2)}@shreebeautystudio
DTSTAMP:${nowStamp}
DTSTART;TZID=Asia/Kolkata:${dtStart}
DTEND;TZID=Asia/Kolkata:${dtEnd}
SUMMARY:${summary.replace(/,/g, '\\,')}
DESCRIPTION:${desc}
LOCATION:${address.replace(/,/g, '\\,')}
STATUS:CONFIRMED
BEGIN:VALARM
TRIGGER:-PT30M
ACTION:DISPLAY
DESCRIPTION:Reminder: ${a.service} for ${a.customer} in 30 minutes
END:VALARM
BEGIN:VALARM
TRIGGER:-PT2H
ACTION:DISPLAY
DESCRIPTION:Reminder: ${a.service} for ${a.customer} in 2 hours
END:VALARM
END:VEVENT`);
    });

  (bridals || [])
    .filter((b) => (b.weddingDate || b.date) && b.status !== 'Cancelled')
    .forEach((b) => {
      const bDate = b.weddingDate || b.date || todayDateString();
      const dtStart = formatICSDate(bDate, '08:00');
      const dtEnd = addMinutes(bDate, '08:00', 180);
      const pkg = b.packageName || 'Bridal Package';
      const summary = `👑 Bridal: ${pkg} — ${b.name} (${salon})`;
      const desc = [
        `Bridal Makeup: ${pkg}`,
        `Bride: ${b.name}`,
        b.mobile ? `Mobile: +91 ${b.mobile}` : '',
        `Total: ₹${b.totalAmount || b.package || 0}`,
        b.advance ? `Advance: ₹${b.advance}` : '',
        b.venue ? `Venue: ${b.venue}` : `Studio: ${address}`,
      ].filter(Boolean).join('\\n');

      events.push(`BEGIN:VEVENT
UID:bridal-${b.id || Math.random().toString(36).slice(2)}@shreebeautystudio
DTSTAMP:${nowStamp}
DTSTART;TZID=Asia/Kolkata:${dtStart}
DTEND;TZID=Asia/Kolkata:${dtEnd}
SUMMARY:${summary.replace(/,/g, '\\,')}
DESCRIPTION:${desc}
LOCATION:${(b.venue || address).replace(/,/g, '\\,')}
STATUS:CONFIRMED
BEGIN:VALARM
TRIGGER:-PT1440M
ACTION:DISPLAY
DESCRIPTION:Bridal Event Tomorrow: ${b.name}
END:VALARM
BEGIN:VALARM
TRIGGER:-PT120M
ACTION:DISPLAY
DESCRIPTION:Bridal Event Today: ${b.name} in 2 hours
END:VALARM
END:VEVENT`);
    });

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Shree Beauty Studio//Salon Management//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${salon} - Appointments & Bookings
X-WR-TIMEZONE:Asia/Kolkata
BEGIN:VTIMEZONE
TZID:Asia/Kolkata
X-LIC-LOCATION:Asia/Kolkata
BEGIN:STANDARD
TZOFFSETFROM:+0530
TZOFFSETTO:+0530
TZNAME:IST
DTSTART:19700101T000000
END:STANDARD
END:VTIMEZONE
${events.join('\n')}
END:VCALENDAR`;
}

/**
 * One-click download of all salon appointments as a single .ics calendar file.
 */
export function downloadBulkAppointmentsICS(
  appointments: any[],
  bridals: any[] = [],
  salon: string = 'Shree Beauty Studio',
  address: string = '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004'
) {
  if (typeof window === 'undefined') return;
  const ics = generateBulkAppointmentsICS(appointments, bridals, salon, address);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `shree-beauty-studio-all-appointments-${todayDateString()}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

