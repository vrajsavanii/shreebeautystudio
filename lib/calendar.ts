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

/**
 * Bulletproof normalizer for ANY date string format (YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, 27 Sep 2026, ISO strings).
 */
export function toStandardYYYYMMDD(dateStr?: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  const clean = String(dateStr).trim().split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

  const dmMatch = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmMatch) {
    const d = dmMatch[1].padStart(2, '0');
    const m = dmMatch[2].padStart(2, '0');
    const y = dmMatch[3];
    return `${y}-${m}-${d}`;
  }

  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return new Date().toISOString().split('T')[0];
}

export function formatICSDate(dateStr: string, timeStr: string = '10:00'): string {
  const standardDate = toStandardYYYYMMDD(dateStr);
  const [y, m, d] = standardDate.split('-');
  const time24 = parseTimeTo24(timeStr);
  const [h, min] = time24.split(':');
  return `${y}${m}${d}T${h}${min}00`;
}

export function addMinutes(dateStr: string, timeStr: string, minutes: number): string {
  const standardDate = toStandardYYYYMMDD(dateStr);
  const time24 = parseTimeTo24(timeStr);
  const date = new Date(`${standardDate}T${time24}:00`);
  if (isNaN(date.getTime())) {
    return formatICSDate(standardDate, timeStr);
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
    ctz: 'Asia/Kolkata',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate a clean, short 1-click Google Calendar URL for regular appointments.
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
  const cleanDate = toStandardYYYYMMDD(a.date);
  const time24 = parseTimeTo24(a.time || '10:00');
  const dtStart = formatICSDate(cleanDate, time24);
  const dtEnd = addMinutes(cleanDate, time24, 60);

  const details = [
    `💅 SHREE BEAUTY STUDIO — APPOINTMENT`,
    `─────────────────────────────────`,
    `👤 Customer: ${a.customer}`,
    `📞 Mobile: +91 ${a.mobile || ''}`,
    `💄 Service: ${a.service}`,
    `📅 Date: ${cleanDate}`,
    `⏰ Time: ${a.time || '10:00 AM'}`,
    a.staff ? `👩‍💼 Specialist: ${a.staff}` : '',
    a.price ? `💵 Price: ₹${a.price}` : '',
    a.advance ? `💵 Advance Paid: ₹${a.advance}` : '',
    a.notes ? `📝 Notes: ${a.notes}` : '',
    `📍 Studio Address: ${address}`,
    `📍 Google Maps: https://maps.app.goo.gl/cwP9HTnqTFzVPYDW8`,
    `📸 Instagram: @shreebeauty.studio (https://www.instagram.com/shreebeauty.studio/)`,
    `📞 Contact: +91 97732 40010`,
  ].filter(Boolean).join('\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `💅 ${a.customer} — ${a.service}`,
    dates: `${dtStart}/${dtEnd}`,
    details: details,
    location: address || '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat',
    ctz: 'Asia/Kolkata',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate a clean, short 1-click Google Calendar URL for bridal appointments.
 */
export function getBridalGoogleCalendarUrl(
  b: {
    name: string;
    mobile?: string;
    packageName?: string;
    weddingDate?: string;
    weddingTime?: string;
    mandapDate?: string;
    mandapTime?: string;
    musicDate?: string;
    musicTime?: string;
    sagaiDate?: string;
    sagaiTime?: string;
    otherDate?: string;
    otherTime?: string;
    date?: string;
    time?: string;
    venue?: string;
    advance?: number;
    totalAmount?: number;
    package?: number;
    notes?: string;
    includeWedding?: boolean;
    includeMandap?: boolean;
    includeMusic?: boolean;
    includeSagai?: boolean;
    includeOther?: boolean;
    otherEventName?: string;
  },
  salon: string = 'Shree Beauty Studio',
  address: string = '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004'
): string {
  const primaryDate = b.weddingDate || b.date || b.sagaiDate || b.mandapDate || b.musicDate || b.otherDate || todayDateString();
  const primaryTime = b.weddingTime || b.time || b.mandapTime || b.musicTime || b.sagaiTime || b.otherTime || '16:00';
  const pkgName = b.packageName || 'Bridal Package';
  const dtStart = formatICSDate(primaryDate, primaryTime);
  const dtEnd = addMinutes(primaryDate, primaryTime, 180);

  const allSelectedEventsSummary = [
    b.weddingDate ? `💍 Wedding: ${b.weddingDate} (${b.weddingTime || '16:00'})` : '',
    b.mandapDate ? `🌿 Mandap: ${b.mandapDate} (${b.mandapTime || '10:00'})` : '',
    b.musicDate ? `🎶 Sangeet / Music: ${b.musicDate} (${b.musicTime || '19:00'})` : '',
    b.sagaiDate ? `✨ Sagai: ${b.sagaiDate} (${b.sagaiTime || '11:00'})` : '',
    b.otherDate ? `🌸 Other (${b.otherEventName || 'Event'}): ${b.otherDate} (${b.otherTime || '11:00'})` : '',
  ].filter(Boolean);

  const details = [
    `👑 SHREE BEAUTY STUDIO — BRIDAL BOOKING`,
    `─────────────────────────────────`,
    `👰 Bride: ${b.name}`,
    `📞 Mobile: +91 ${b.mobile || ''}`,
    `👑 Package: ${pkgName}`,
    allSelectedEventsSummary.length > 0 ? `\n📋 Scheduled Functions:\n${allSelectedEventsSummary.join('\n')}\n` : '',
    `📍 Venue / Address: ${b.venue || address}`,
    `🏢 Studio Address: ${address}`,
    `💵 Total Package: ₹${b.package || b.totalAmount || 0}`,
    b.advance ? `💵 Advance Paid: ₹${b.advance}` : '',
    b.notes ? `📝 Special Notes: ${b.notes}` : '',
    `📍 Google Maps: https://maps.app.goo.gl/cwP9HTnqTFzVPYDW8`,
    `📸 Instagram: @shreebeauty.studio (https://www.instagram.com/shreebeauty.studio/)`,
    `📞 Studio Contact: +91 97732 40010`,
  ].filter(Boolean).join('\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `👑 ${b.name} — ${pkgName}`,
    dates: `${dtStart}/${dtEnd}`,
    details: details,
    location: b.venue || address || '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat',
    ctz: 'Asia/Kolkata',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate 1-click Google Calendar URL for a specific Bridal Function (Wedding, Mandap, Music, Sagai, Other).
 */
export function getBridalFunctionGoogleCalendarUrl(
  b: {
    name: string;
    mobile?: string;
    packageName?: string;
    weddingDate?: string;
    weddingTime?: string;
    mandapDate?: string;
    mandapTime?: string;
    musicDate?: string;
    musicTime?: string;
    sagaiDate?: string;
    sagaiTime?: string;
    otherDate?: string;
    otherTime?: string;
    venue?: string;
    notes?: string;
    otherEventName?: string;
    package?: number;
    totalAmount?: number;
    advance?: number;
  },
  functionType: 'wedding' | 'mandap' | 'music' | 'sagai' | 'other' = 'wedding',
  salon: string = 'Shree Beauty Studio',
  address: string = '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004'
): string {
  let dateStr = b.weddingDate;
  let timeStr = b.weddingTime || '16:00';
  let title = `👑 ${b.name} — Wedding Makeup (${b.packageName || 'Bridal Package'})`;
  let duration = 180;

  if (functionType === 'mandap') {
    dateStr = b.mandapDate || b.weddingDate;
    timeStr = b.mandapTime || '10:00';
    title = `🌿 ${b.name} — Mandap Muhurat (${b.packageName || 'Bridal Package'})`;
    duration = 120;
  } else if (functionType === 'music') {
    dateStr = b.musicDate || b.weddingDate;
    timeStr = b.musicTime || '19:00';
    title = `🎶 ${b.name} — Sangeet / Music Night (${b.packageName || 'Bridal Package'})`;
    duration = 120;
  } else if (functionType === 'sagai') {
    dateStr = b.sagaiDate || b.weddingDate;
    timeStr = b.sagaiTime || '11:00';
    title = `✨ ${b.name} — Sagai Ceremony (${b.packageName || 'Bridal Package'})`;
    duration = 120;
  } else if (functionType === 'other') {
    dateStr = b.otherDate || b.weddingDate;
    timeStr = b.otherTime || '11:00';
    title = `🌸 ${b.name} — ${b.otherEventName || 'Pre-Wedding Function'} (${b.packageName || 'Bridal Package'})`;
    duration = 120;
  }

  const cleanDate = toStandardYYYYMMDD(dateStr);
  const time24 = parseTimeTo24(timeStr);
  const dtStart = formatICSDate(cleanDate, time24);
  const dtEnd = addMinutes(cleanDate, time24, duration);

  const details = [
    `👑 SHREE BEAUTY STUDIO — BRIDAL BOOKING`,
    `─────────────────────────────────`,
    `👰 Bride: ${b.name}`,
    `📞 Mobile: +91 ${b.mobile || ''}`,
    `👑 Package: ${b.packageName || 'Bridal Package'}`,
    `🎉 Scheduled Function: ${title}`,
    `📅 Date: ${cleanDate} @ ${timeStr}`,
    `📍 Venue / Address: ${b.venue || address}`,
    `🏢 Studio Address: ${address}`,
    `💵 Total Package: ₹${b.package || b.totalAmount || 0}`,
    b.advance ? `💵 Advance Paid: ₹${b.advance}` : '',
    b.notes ? `📝 Special Notes: ${b.notes}` : '',
    `📍 Google Maps: https://maps.app.goo.gl/cwP9HTnqTFzVPYDW8`,
    `📸 Instagram: @shreebeauty.studio (https://www.instagram.com/shreebeauty.studio/)`,
    `📞 Studio Contact: +91 97732 40010`,
  ].filter(Boolean).join('\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${dtStart}/${dtEnd}`,
    details: details,
    location: b.venue || address || '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat',
    ctz: 'Asia/Kolkata',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
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
    sagaiDate?: string;
    mandapDate?: string;
    musicDate?: string;
    otherDate?: string;
    date?: string;
    venue?: string;
    advance?: number;
    totalAmount?: number;
    package?: number;
    status?: string;
  }> = [],
  salon: string = 'Shree Beauty Studio',
  address: string = '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004',
  deletePastDays: number = 2
): string {
  const nowStamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const events: string[] = [];

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - (deletePastDays > 0 ? deletePastDays : 0));
  const cutoffISO = cutoffDate.toISOString().split('T')[0];

  (appointments || [])
    .filter((a) => {
      if (!a.date || a.status === 'Cancelled' || a.workStatus === 'Cancelled') return false;
      if (deletePastDays === 0) return true;
      const stdDate = toStandardYYYYMMDD(a.date);
      return stdDate >= cutoffISO;
    })
    .forEach((a) => {
      const dtStart = formatICSDate(a.date, a.time || '10:00');
      const dtEnd = addMinutes(a.date, a.time || '10:00', 60);
      const summary = `💅 ${a.customer} — ${a.service}`;
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
    .filter((b: any) => b.status !== 'Cancelled')
    .forEach((b: any) => {
      const pkg = b.packageName || 'Bridal Package';
      const venueLoc = b.venue || address;

      const pushBridalEvent = (dateStr: string, timeStr: string, functionName: string, icon: string, durationMins: number = 180) => {
        const standardDate = toStandardYYYYMMDD(dateStr);
        if (!standardDate) return;
        if (deletePastDays > 0 && standardDate < cutoffISO) return;

        const time24 = parseTimeTo24(timeStr);
        const dtStart = formatICSDate(standardDate, time24);
        const dtEnd = addMinutes(standardDate, time24, durationMins);
        const summary = `${icon} ${b.name} — ${functionName} (${pkg})`;
        const desc = [
          `👑 SHREE BEAUTY STUDIO — BRIDAL EVENT`,
          `Function: ${functionName}`,
          `Bride / Client: ${b.name}`,
          b.mobile ? `Mobile: +91 ${b.mobile}` : '',
          `Package: ${pkg}`,
          `Date & Time: ${standardDate} @ ${timeStr}`,
          b.totalAmount || b.package ? `Total Package: ₹${b.totalAmount || b.package}` : '',
          b.advance ? `Advance Paid: ₹${b.advance}` : '',
          `Venue: ${venueLoc}`,
          `Studio Address: ${address}`,
          `Google Maps: https://maps.app.goo.gl/cwP9HTnqTFzVPYDW8`,
          `Contact: +91 97732 40010`,
        ].filter(Boolean).join('\\n');

        events.push(`BEGIN:VEVENT
UID:bridal-${b.id || Math.random().toString(36).slice(2)}-${functionName.replace(/\s+/g, '')}@shreebeautystudio
DTSTAMP:${nowStamp}
DTSTART;TZID=Asia/Kolkata:${dtStart}
DTEND;TZID=Asia/Kolkata:${dtEnd}
SUMMARY:${summary.replace(/,/g, '\\,')}
DESCRIPTION:${desc}
LOCATION:${venueLoc.replace(/,/g, '\\,')}
STATUS:CONFIRMED
BEGIN:VALARM
TRIGGER:-PT1440M
ACTION:DISPLAY
DESCRIPTION:Bridal Reminder (1 day before): ${functionName} for ${b.name}
END:VALARM
BEGIN:VALARM
TRIGGER:-PT120M
ACTION:DISPLAY
DESCRIPTION:Bridal Event Today (in 2 hours): ${functionName} for ${b.name}
END:VALARM
END:VEVENT`);
      };

      let hasAddedAny = false;

      if (b.includeWedding !== false && b.weddingDate) {
        pushBridalEvent(b.weddingDate, b.weddingTime || '16:00', 'Wedding', '👑', 180);
        hasAddedAny = true;
      }
      if (b.includeMandap !== false && b.mandapDate) {
        pushBridalEvent(b.mandapDate, b.mandapTime || '10:00', 'Mandap Muhurat', '🌿', 120);
        hasAddedAny = true;
      }
      if (b.includeMusic !== false && b.musicDate) {
        pushBridalEvent(b.musicDate, b.musicTime || '19:00', 'Sangeet / Music Night', '🎶', 120);
        hasAddedAny = true;
      }
      if (b.includeSagai && b.sagaiDate) {
        pushBridalEvent(b.sagaiDate, b.sagaiTime || '11:00', 'Sagai Ceremony', '✨', 120);
        hasAddedAny = true;
      }
      if (b.includeOther && b.otherDate) {
        pushBridalEvent(b.otherDate, b.otherTime || '11:00', b.otherEventName || 'Pre-Wedding Function', '🌸', 120);
        hasAddedAny = true;
      }

      if (!hasAddedAny) {
        const fallbackDate = b.date || b.weddingDate || b.mandapDate || b.musicDate || b.sagaiDate || b.otherDate;
        if (fallbackDate) {
          pushBridalEvent(fallbackDate, b.time || b.weddingTime || '10:00', pkg, '👑', 180);
        }
      }
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
  address: string = '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004',
  deletePastDays: number = 2
) {
  if (typeof window === 'undefined') return;
  const ics = generateBulkAppointmentsICS(appointments, bridals, salon, address, deletePastDays);
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

export function generateSingleBridalICS(
  b: any,
  salon: string = 'Shree Beauty Studio',
  address: string = '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004'
): string {
  const nowStamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\\.\\d{3}/, '');
  const events: string[] = [];

  const addEvent = (date: string | undefined, time: string | undefined, eventName: string, include?: boolean) => {
    if (include === false || !date) return;
    const dtStart = formatICSDate(date, time || '08:00');
    const dtEnd = addMinutes(date, time || '08:00', 180);
    const pkg = b.packageName || 'Bridal Package';
    const summary = `👑 ${b.name} — ${eventName}`;
    const desc = [
      `Event: ${eventName}`,
      `Bridal Makeup: ${pkg}`,
      `Bride: ${b.name}`,
      b.mobile ? `Mobile: +91 ${b.mobile}` : '',
      `Total: ₹${b.totalAmount || b.package || 0}`,
      b.advance ? `Advance: ₹${b.advance}` : '',
      b.venue ? `Venue: ${b.venue}` : `Studio: ${address}`,
    ].filter(Boolean).join('\\n');

    events.push(`BEGIN:VEVENT
UID:bridal-${b.id || Math.random().toString(36).slice(2)}-${eventName.replace(/\\s+/g, '')}@shreebeautystudio
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
DESCRIPTION:Bridal Event Tomorrow: ${b.name} (${eventName})
END:VALARM
BEGIN:VALARM
TRIGGER:-PT120M
ACTION:DISPLAY
DESCRIPTION:Bridal Event Today: ${b.name} (${eventName}) in 2 hours
END:VALARM
END:VEVENT`);
  };

  addEvent(b.weddingDate, b.weddingTime, 'Wedding', b.includeWedding);
  addEvent(b.sagaiDate, b.sagaiTime, 'Sagai', b.includeSagai);
  addEvent(b.mandapDate, b.mandapTime, 'Mandap', b.includeMandap);
  addEvent(b.musicDate, b.musicTime, 'Music', b.includeMusic);
  addEvent(b.otherDate, b.otherTime, b.otherEventName || 'Pre-Event', b.includeOther);

  if (events.length === 0) {
    addEvent(b.date || todayDateString(), b.weddingTime, 'Bridal Makeup');
  }

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Shree Beauty Studio//Salon Management//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${b.name} - Bridal Booking
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

export function downloadBridalICS(
  b: any,
  salon: string = 'Shree Beauty Studio',
  address: string = '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004'
) {
  if (typeof window === 'undefined') return;
  const ics = generateSingleBridalICS(b, salon, address);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bridal-${b.name.replace(/\\s+/g, '-').toLowerCase()}-events.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function generateSingleAppointmentICS(
  a: any,
  salon: string = 'Shree Beauty Studio',
  address: string = '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004'
): string {
  const nowStamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\\.\\d{3}/, '');
  const dtStart = formatICSDate(a.date, a.time || '10:00');
  const dtEnd = addMinutes(a.date, a.time || '10:00', 60);
  const summary = `💅 ${a.customer} — ${a.service}`;
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

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Shree Beauty Studio//Salon Management//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${a.customer} - Appointment
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
BEGIN:VEVENT
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
END:VEVENT
END:VCALENDAR`;
}

export function downloadAppointmentICS(
  a: any,
  salon: string = 'Shree Beauty Studio',
  address: string = '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004'
) {
  if (typeof window === 'undefined') return;
  const ics = generateSingleAppointmentICS(a, salon, address);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `appointment-${a.customer.replace(/\\s+/g, '-').toLowerCase()}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadCancellationICS(
  item: any,
  type: 'appointment' | 'bridal',
  salon: string = 'Shree Beauty Studio',
  address: string = '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004'
) {
  if (typeof window === 'undefined') return;
  
  // Generate the exact same ICS, but replace PUBLISH with CANCEL and CONFIRMED with CANCELLED
  let ics = type === 'bridal' 
    ? generateSingleBridalICS(item, salon, address) 
    : generateSingleAppointmentICS(item, salon, address);
    
  ics = ics.replace('METHOD:PUBLISH', 'METHOD:CANCEL');
  ics = ics.replace(/STATUS:CONFIRMED/g, 'STATUS:CANCELLED');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const name = type === 'bridal' ? item.name : item.customer;
  a.download = `cancel-${type}-${(name || 'event').replace(/\\s+/g, '-').toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
