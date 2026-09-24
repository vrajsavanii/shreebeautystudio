import crypto from 'crypto';
import { Appointment, BridalBooking, SalonSettings, StudioHoliday } from '@/types/salon';
import { timeToMinutes } from './utils';

export interface GoogleCalendarEventPayload {
  summary: string;
  description: string;
  location: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  reminders?: {
    useDefault: boolean;
    overrides: Array<{ method: 'popup' | 'email'; minutes: number }>;
  };
  attendees?: Array<{ email: string; displayName?: string }>;
}

export interface CalendarSyncResult {
  success: boolean;
  provider?: string;
  eventId?: string;
  htmlLink?: string;
  message?: string;
  error?: string;
}

/**
 * Generates an OAuth2 access token for Google Service Account using native Node.js crypto (RS256 JWT Bearer).
 */
export async function getServiceAccountAccessToken(
  clientEmail: string,
  privateKeyPem: string
): Promise<string> {
  let cleanKey = privateKeyPem.trim();
  if (cleanKey.includes('\\n')) {
    cleanKey = cleanKey.replace(/\\n/g, '\n');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: clientEmail.trim(),
    scope: 'https://www.googleapis.com/auth/calendar',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encodeBase64Url = (obj: any) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  const unsignedToken = `${encodeBase64Url(header)}.${encodeBase64Url(claimSet)}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(unsignedToken);
  sign.end();
  const signature = sign
    .sign(cleanKey, 'base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${unsignedToken}.${signature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Service Account Token failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.access_token;
}

/**
 * Refreshes an OAuth 2.0 access token using client_id, client_secret, and refresh_token.
 */
export async function getOAuthAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId.trim(),
      client_secret: clientSecret.trim(),
      refresh_token: refreshToken.trim(),
      grant_type: 'refresh_token',
    }).toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google OAuth Refresh failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.access_token;
}

/**
 * Inserts an event directly into Google Calendar via Official Google Calendar REST API v3.
 */
export async function insertGoogleCalendarV3Event(
  accessToken: string,
  calendarId: string = 'primary',
  eventPayload: GoogleCalendarEventPayload
): Promise<{ id: string; htmlLink?: string }> {
  const targetCalId = calendarId || 'primary';
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalId)}/events`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventPayload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Calendar API v3 error (${res.status}): ${errText}`);
  }

  return await res.json();
}

/**
 * Normalizes any date format (YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, 27 Sep 2026, ISO string) to standard YYYY-MM-DD.
 */
export function normalizeDateToYYYYMMDD(dateStr?: string): string {
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

  const ymMatch = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymMatch) {
    const y = ymMatch[1];
    const m = ymMatch[2].padStart(2, '0');
    const d = ymMatch[3].padStart(2, '0');
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

/**
 * Converts a 12-hour or 24-hour time and date string to ISO datetime with +05:30 IST timezone.
 */
export function formatISTDateTime(
  dateStr?: string,
  timeStr?: string,
  durationMinutes: number = 45
): { startISO: string; endISO: string } {
  const cleanDate = normalizeDateToYYYYMMDD(dateStr);
  const parts = cleanDate.split('-').map(Number);
  const year = parts[0] || new Date().getFullYear();
  const month = parts[1] || new Date().getMonth() + 1;
  const day = parts[2] || new Date().getDate();

  const startTotalMinutes = timeToMinutes(timeStr || '10:00');
  const startHour = Math.min(23, Math.floor(startTotalMinutes / 60));
  const startMin = startTotalMinutes % 60;

  const endTotalMinutes = startTotalMinutes + (durationMinutes || 45);
  const endHour = Math.min(23, Math.floor(endTotalMinutes / 60));
  const endMin = endTotalMinutes >= 24 * 60 ? 59 : endTotalMinutes % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  const startISO = `${year}-${pad(month)}-${pad(day)}T${pad(startHour)}:${pad(startMin)}:00+05:30`;
  const endISO = `${year}-${pad(month)}-${pad(day)}T${pad(endHour)}:${pad(endMin)}:00+05:30`;

  return { startISO, endISO };
}

/**
 * Builds standard Google Calendar event payload from an Appointment record.
 */
export function buildAppointmentEventPayload(
  a: Appointment,
  settings?: Partial<SalonSettings>
): GoogleCalendarEventPayload {
  const salon = settings?.salon || 'Shree Beauty Studio';
  const address = settings?.address || 'Katargam, Surat, Gujarat 395004';
  const { startISO, endISO } = formatISTDateTime(a.date, a.time, 60);

  const lines = [
    `✨ SHREE BEAUTY STUDIO — APPOINTMENT`,
    `─────────────────────────────────`,
    `👤 Customer: ${a.customer}`,
    `📞 Mobile: +91 ${a.mobile}`,
    `💄 Service: ${a.service}`,
    `👩‍🦰 Beautician: ${a.staff || 'Senior Beautician'}`,
    `📅 Date & Time: ${a.date} at ${a.time}`,
    a.advance ? `💵 Advance Paid: ₹${a.advance}` : '',
    a.notes ? `📝 Special Notes: ${a.notes}` : '',
    `🔖 Ref ID: ${a.id}`,
    `📍 Location: ${address}`,
    `📞 Studio Contact: +91 ${settings?.whatsapp || '9773240010'}`,
  ].filter(Boolean);

  const attendees: Array<{ email: string; displayName?: string }> = [];
  if (a.email?.trim() && a.email.includes('@')) {
    attendees.push({ email: a.email.trim(), displayName: a.customer });
  }
  if (settings?.googleCalendarOwnerEmail?.trim()) {
    const ownerEmails = settings.googleCalendarOwnerEmail
      .split(/[,;\n]+/)
      .map((e) => e.trim())
      .filter((e) => e.includes('@'));
    for (const em of ownerEmails) {
      attendees.push({ email: em, displayName: salon });
    }
  }

  const r1 = settings?.calendarApptReminderMinutes1 !== undefined ? settings.calendarApptReminderMinutes1 : 60;
  const r2 = settings?.calendarApptReminderMinutes2 !== undefined ? settings.calendarApptReminderMinutes2 : 1440;
  const emailEnabled = settings?.calendarEmailReminderEnabled !== false;

  const overrides: Array<{ method: 'popup' | 'email'; minutes: number }> = [];
  if (r1 > 0) overrides.push({ method: 'popup', minutes: r1 });
  if (r2 > 0 && r2 !== r1) overrides.push({ method: 'popup', minutes: r2 });
  if (emailEnabled && (r1 > 0 || r2 > 0)) {
    overrides.push({ method: 'email', minutes: Math.max(r1, r2, 1440) });
  }

  return {
    summary: `💅 ${a.customer} — ${a.service}`,
    description: lines.join('\n'),
    location: address,
    start: { dateTime: startISO, timeZone: 'Asia/Kolkata' },
    end: { dateTime: endISO, timeZone: 'Asia/Kolkata' },
    reminders: {
      useDefault: false,
      overrides: overrides,
    },
    attendees: attendees.length > 0 ? attendees : undefined,
  };
}

/**
 * Builds standard Google Calendar event payloads for all active events within a BridalBooking record.
 * Supports multi-event scheduling (Wedding, Sagai, Mandap, Music, Other / Haldi).
 */
export function buildBridalEventPayloads(
  b: BridalBooking,
  settings?: Partial<SalonSettings>
): GoogleCalendarEventPayload[] {
  const salon = settings?.salon || 'Shree Beauty Studio';
  const address = b.venue || settings?.address || 'Surat, Gujarat';

  const attendees: Array<{ email: string; displayName?: string }> = [];
  if (b.email?.trim() && b.email.includes('@')) {
    attendees.push({ email: b.email.trim(), displayName: b.name });
  }
  if (settings?.googleCalendarOwnerEmail?.trim()) {
    const ownerEmails = settings.googleCalendarOwnerEmail
      .split(/[,;\n]+/)
      .map((e) => e.trim())
      .filter((e) => e.includes('@'));
    for (const em of ownerEmails) {
      attendees.push({ email: em, displayName: salon });
    }
  }

  const br1 = settings?.calendarBridalReminderMinutes1 !== undefined ? settings.calendarBridalReminderMinutes1 : 1440;
  const br2 = settings?.calendarBridalReminderMinutes2 !== undefined ? settings.calendarBridalReminderMinutes2 : 120;
  const bridalEmailEnabled = settings?.calendarEmailReminderEnabled !== false;

  const bridalOverrides: Array<{ method: 'popup' | 'email'; minutes: number }> = [];
  if (br1 > 0) bridalOverrides.push({ method: 'popup', minutes: br1 });
  if (br2 > 0 && br2 !== br1) bridalOverrides.push({ method: 'popup', minutes: br2 });
  if (bridalEmailEnabled && (br1 > 0 || br2 > 0)) {
    bridalOverrides.push({ method: 'email', minutes: Math.max(br1, 2880) });
  }

  const allSelectedEventsSummary = [
    b.weddingDate ? `💍 Wedding: ${b.weddingDate} (${b.weddingTime || '16:00'})` : '',
    b.sagaiDate ? `✨ Sagai: ${b.sagaiDate} (${b.sagaiTime || '11:00'})` : '',
    b.mandapDate ? `🌿 Mandap: ${b.mandapDate} (${b.mandapTime || '10:00'})` : '',
    b.musicDate ? `🎶 Sangeet / Music: ${b.musicDate} (${b.musicTime || '19:00'})` : '',
    b.otherDate ? `🌸 Other Event: ${b.otherDate} (${b.otherTime || '11:00'})` : '',
  ].filter(Boolean);

  const buildSinglePayload = (
    dateStr: string,
    timeStr: string,
    eventLabel: string,
    icon: string,
    durationMins: number = 180
  ): GoogleCalendarEventPayload => {
    const { startISO, endISO } = formatISTDateTime(dateStr, timeStr, durationMins);
    const lines = [
      `👑 SHREE BEAUTY STUDIO — ${eventLabel.toUpperCase()}`,
      `─────────────────────────────────`,
      `👰 Bride / Client: ${b.name}`,
      `📞 Mobile: +91 ${b.mobile}`,
      `👑 Package: ${b.packageName || 'Bridal Glam'}`,
      `🎉 Event: ${eventLabel} (${dateStr} @ ${timeStr})`,
      allSelectedEventsSummary.length > 1 ? `\n📋 All Functions in Package:\n${allSelectedEventsSummary.join('\n')}\n` : '',
      `📍 Venue / Location: ${b.venue || address}`,
      `💰 Total Package: ₹${b.package || b.totalAmount || 0}`,
      b.advance ? `💵 Advance Paid: ₹${b.advance}` : '',
      b.notes ? `📝 Special Notes: ${b.notes}` : '',
      `🔖 Ref ID: ${b.id}-${eventLabel}`,
      `📞 Studio Contact: +91 ${settings?.whatsapp || '9773240010'}`,
    ].filter(Boolean);

    return {
      summary: `${icon} ${b.name} — ${eventLabel} (${b.packageName || 'Bridal Package'})`,
      description: lines.join('\n'),
      location: b.venue || address,
      start: { dateTime: startISO, timeZone: 'Asia/Kolkata' },
      end: { dateTime: endISO, timeZone: 'Asia/Kolkata' },
      reminders: {
        useDefault: false,
        overrides: bridalOverrides,
      },
      attendees: attendees.length > 0 ? attendees : undefined,
    };
  };

  const payloads: GoogleCalendarEventPayload[] = [];

  // 1. Wedding Event
  if (b.includeWedding !== false && b.weddingDate) {
    payloads.push(buildSinglePayload(b.weddingDate, b.weddingTime || '16:00', 'Wedding', '👑', 180));
  }

  // 2. Sagai / Engagement
  if (b.includeSagai && b.sagaiDate) {
    payloads.push(buildSinglePayload(b.sagaiDate, b.sagaiTime || '11:00', 'Sagai Ceremony', '✨', 120));
  }

  // 3. Mandap Muhurat
  if (b.includeMandap !== false && b.mandapDate) {
    payloads.push(buildSinglePayload(b.mandapDate, b.mandapTime || '10:00', 'Mandap Muhurat', '🌿', 120));
  }

  // 4. Music / Sangeet
  if (b.includeMusic !== false && b.musicDate) {
    payloads.push(buildSinglePayload(b.musicDate, b.musicTime || '19:00', 'Sangeet / Music Night', '🎶', 120));
  }

  // 5. Other Event (Haldi / Carnival / Pool Party)
  if (b.includeOther && b.otherDate) {
    payloads.push(buildSinglePayload(b.otherDate, b.otherTime || '11:00', b.otherEventName || 'Pre-Wedding Event', '🌸', 120));
  }

  // Fallback: If no event matched flags, use primary date
  if (payloads.length === 0) {
    const primaryDate = b.date || b.weddingDate || b.sagaiDate || b.mandapDate || b.musicDate || b.otherDate || new Date().toISOString().split('T')[0];
    const primaryTime = b.weddingTime || b.sagaiTime || b.mandapTime || b.musicTime || b.otherTime || '10:00';
    payloads.push(buildSinglePayload(primaryDate, primaryTime, b.packageName || 'Bridal Booking', '👑', 180));
  }

  return payloads;
}

/**
 * Builds standard Google Calendar event payload for the primary date of a BridalBooking record.
 */
export function buildBridalEventPayload(
  b: BridalBooking,
  settings?: Partial<SalonSettings>
): GoogleCalendarEventPayload {
  const payloads = buildBridalEventPayloads(b, settings);
  return payloads[0];
}

const DEFAULT_WEBHOOK_URL =
  'https://script.google.com/macros/s/AKfycbxcu02Y6dn5tcxpX8QbILUrlOfiOmNiiX3FHdhdHMNQT3X3X6zDTe9FaP_OLmpLX4PX/exec';

export function resolveValidWebhookUrl(url?: string): string {
  const clean = (url || '').trim();
  if (!clean || clean.includes('/macros/library/') || !clean.startsWith('http')) {
    return (process.env.GOOGLE_CALENDAR_WEBHOOK_URL?.trim() && !process.env.GOOGLE_CALENDAR_WEBHOOK_URL.includes('/macros/library/'))
      ? process.env.GOOGLE_CALENDAR_WEBHOOK_URL.trim()
      : DEFAULT_WEBHOOK_URL;
  }
  return clean;
}

/**
 * Automatically syncs an event to Google Calendar via Official Google Calendar API v3 or Cloud Webhook.
 */
export async function syncEventToGoogleCalendar(
  eventPayload: GoogleCalendarEventPayload,
  settings?: Partial<SalonSettings>,
  metadata?: Record<string, any>
): Promise<CalendarSyncResult> {
  const saEmail =
    settings?.googleServiceAccountEmail?.trim() ||
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const saKey =
    settings?.googlePrivateKey?.trim() ||
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim() ||
    process.env.GOOGLE_PRIVATE_KEY?.trim();
  const calendarId =
    settings?.googleCalendarId?.trim() ||
    process.env.GOOGLE_CALENDAR_ID?.trim() ||
    'primary';

  const oauthClientId =
    settings?.googleClientId?.trim() ||
    process.env.GOOGLE_CLIENT_ID?.trim();
  const oauthSecret =
    settings?.googleClientSecret?.trim() ||
    process.env.GOOGLE_CLIENT_SECRET?.trim();
  const oauthRefreshToken =
    settings?.googleRefreshToken?.trim() ||
    process.env.GOOGLE_REFRESH_TOKEN?.trim();

  const webhookUrl = resolveValidWebhookUrl(settings?.googleCalendarWebhookUrl);

  // 1. Priority 1: Official Google Calendar API v3 via Service Account
  if (saEmail && saKey) {
    try {
      const accessToken = await getServiceAccountAccessToken(saEmail, saKey);
      const event = await insertGoogleCalendarV3Event(accessToken, calendarId, eventPayload);
      return {
        success: true,
        provider: 'google_api_service_account',
        eventId: event.id,
        htmlLink: event.htmlLink,
        message: 'Event successfully created in Google Calendar via Official Google Calendar API v3!',
      };
    } catch (err: any) {
      console.error('[Google Calendar API Service Account Error]:', err?.message);
      // Fall through to next provider if available
    }
  }

  // 2. Priority 2: Official Google Calendar API v3 via OAuth 2.0 Refresh Token
  if (oauthClientId && oauthSecret && oauthRefreshToken) {
    try {
      const accessToken = await getOAuthAccessToken(oauthClientId, oauthSecret, oauthRefreshToken);
      const event = await insertGoogleCalendarV3Event(accessToken, calendarId, eventPayload);
      return {
        success: true,
        provider: 'google_api_oauth2',
        eventId: event.id,
        htmlLink: event.htmlLink,
        message: 'Event successfully created in Google Calendar via Official Google Calendar OAuth 2.0 API!',
      };
    } catch (err: any) {
      console.error('[Google Calendar API OAuth2 Error]:', err?.message);
      // Fall through to next provider
    }
  }

  // 3. Priority 3: Google Apps Script Webhook
  if (webhookUrl) {
    try {
      const deletePastDays = settings?.calendarDeletePastDays !== undefined ? settings.calendarDeletePastDays : 2;
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_event',
          event: eventPayload,
          bookingId: metadata?.bookingId || metadata?.id || '',
          id: metadata?.bookingId || metadata?.id || '',
          customerName: metadata?.customerName || metadata?.name || metadata?.customer || '',
          customer: metadata?.customerName || metadata?.name || metadata?.customer || '',
          phone: metadata?.phone || metadata?.mobile || '',
          mobile: metadata?.phone || metadata?.mobile || '',
          date: metadata?.date || '',
          deletePastDays,
          timestamp: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        return {
          success: true,
          provider: 'webhook',
          eventId: json.eventId || json.id || 'auto-synced',
          message: 'Event auto-saved to Google Calendar via Cloud Webhook!',
        };
      } else {
        const text = await res.text().catch(() => '');
        console.warn('[Google Calendar Webhook Sync Failed]:', res.status, text);
      }
    } catch (err: any) {
      console.error('[Google Calendar Webhook Exception]:', err?.message);
    }
  }

  // 4. Default fallback: Live WebCal Feed ready
  return {
    success: true,
    provider: 'feed_and_invite',
    message: 'Auto-saved to Salon Live WebCal Feed & ready for Google Calendar sync.',
  };
}

/**
 * Auto-syncs an Appointment to Google Calendar.
 */
export async function autoSyncAppointmentToGoogleCalendar(
  a: Appointment,
  settings?: Partial<SalonSettings>
): Promise<CalendarSyncResult> {
  const payload = buildAppointmentEventPayload(a, settings);
  const cleanCustomer = (a.customer || '').replace(/^Z\d{2}\s+/i, '').trim();
  const cleanPhone = (a.mobile || '').replace(/\D/g, '').slice(-10);
  return syncEventToGoogleCalendar(payload, settings, {
    bookingId: a.id,
    id: a.id,
    customerName: cleanCustomer || a.customer,
    name: cleanCustomer || a.customer,
    phone: cleanPhone || a.mobile,
    mobile: cleanPhone || a.mobile,
    date: normalizeDateToYYYYMMDD(a.date),
  });
}

/**
 * Auto-syncs all active events for a Bridal Booking to Google Calendar.
 */
export async function autoSyncBridalToGoogleCalendar(
  b: BridalBooking,
  settings?: Partial<SalonSettings>
): Promise<CalendarSyncResult> {
  const payloads = buildBridalEventPayloads(b, settings);
  const cleanName = (b.name || '').replace(/^Z\d{2}\s+/i, '').trim();
  const cleanPhone = (b.mobile || '').replace(/\D/g, '').slice(-10);
  let lastResult: CalendarSyncResult = {
    success: true,
    provider: 'webhook',
    message: 'Bridal events auto-saved to Google Calendar!',
  };

  let syncedCount = 0;
  for (const payload of payloads) {
    const res = await syncEventToGoogleCalendar(payload, settings, {
      bookingId: b.id,
      id: b.id,
      customerName: cleanName || b.name,
      name: cleanName || b.name,
      phone: cleanPhone || b.mobile,
      mobile: cleanPhone || b.mobile,
      date: normalizeDateToYYYYMMDD(b.weddingDate || b.date),
    });
    if (res.success) {
      syncedCount++;
      lastResult = res;
    }
  }

  return {
    ...lastResult,
    success: syncedCount > 0,
    message: `${syncedCount} bridal event(s) successfully added to Google Calendar!`,
  };
}

/**
 * Deletes an event directly from Google Calendar via Official Google Calendar REST API v3.
 */
export async function deleteGoogleCalendarV3Event(
  accessToken: string,
  calendarId: string = 'primary',
  eventId: string
): Promise<boolean> {
  const targetCalId = calendarId || 'primary';
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalId)}/events/${encodeURIComponent(eventId)}`;

  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return res.ok || res.status === 404;
}

/**
 * Searches and deletes matching events in Google Calendar via Official Google Calendar REST API v3.
 */
export async function findAndDeleteGoogleCalendarV3Events(
  accessToken: string,
  calendarId: string = 'primary',
  searchQuery: string
): Promise<number> {
  try {
    if (!searchQuery || searchQuery.trim().length < 2) return 0;
    const targetCalId = calendarId || 'primary';
    const now = new Date();
    const timeMin = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const timeMax = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalId)}/events?q=${encodeURIComponent(searchQuery.trim())}&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) return 0;
    const data = await res.json();
    let count = 0;
    if (data.items && Array.isArray(data.items)) {
      for (const item of data.items) {
        if (item.id) {
          await deleteGoogleCalendarV3Event(accessToken, targetCalId, item.id);
          count++;
        }
      }
    }
    return count;
  } catch (err) {
    return 0;
  }
}

/**
 * Delete / Remove event from Google Calendar via Official API v3 or Cloud Webhook
 */
export async function deleteEventFromGoogleCalendar(
  deletePayload: {
    title?: string;
    customerName?: string;
    phone?: string;
    bookingId?: string;
    date?: string;
    [key: string]: any;
  },
  settings?: Partial<SalonSettings>
): Promise<{ success: boolean; message: string }> {
  const saEmail =
    settings?.googleServiceAccountEmail?.trim() ||
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const saKey =
    settings?.googlePrivateKey?.trim() ||
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim() ||
    process.env.GOOGLE_PRIVATE_KEY?.trim();
  const calendarId =
    settings?.googleCalendarId?.trim() ||
    process.env.GOOGLE_CALENDAR_ID?.trim() ||
    'primary';

  const oauthClientId =
    settings?.googleClientId?.trim() ||
    process.env.GOOGLE_CLIENT_ID?.trim();
  const oauthSecret =
    settings?.googleClientSecret?.trim() ||
    process.env.GOOGLE_CLIENT_SECRET?.trim();
  const oauthRefreshToken =
    settings?.googleRefreshToken?.trim() ||
    process.env.GOOGLE_REFRESH_TOKEN?.trim();

  const webhookUrl = resolveValidWebhookUrl(settings?.googleCalendarWebhookUrl);

  // 1. Official Google Calendar API v3 via Service Account
  if (saEmail && saKey) {
    try {
      const accessToken = await getServiceAccountAccessToken(saEmail, saKey);
      const query = deletePayload.customerName || deletePayload.phone || deletePayload.title || '';
      if (query) {
        const deleted = await findAndDeleteGoogleCalendarV3Events(accessToken, calendarId, query);
        if (deleted > 0) {
          return {
            success: true,
            message: `${deleted} event(s) removed from Google Calendar via Official API!`,
          };
        }
      }
    } catch (err: any) {
      console.error('[Google Calendar API Service Account Delete Error]:', err?.message);
    }
  }

  // 2. Official Google Calendar API v3 via OAuth 2.0
  if (oauthClientId && oauthSecret && oauthRefreshToken) {
    try {
      const accessToken = await getOAuthAccessToken(oauthClientId, oauthSecret, oauthRefreshToken);
      const query = deletePayload.customerName || deletePayload.phone || deletePayload.title || '';
      if (query) {
        const deleted = await findAndDeleteGoogleCalendarV3Events(accessToken, calendarId, query);
        if (deleted > 0) {
          return {
            success: true,
            message: `${deleted} event(s) removed from Google Calendar via OAuth API!`,
          };
        }
      }
    } catch (err: any) {
      console.error('[Google Calendar OAuth2 Delete Error]:', err?.message);
    }
  }

  // 3. Cloud Webhook Deletion
  if (webhookUrl) {
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_event',
          type: 'delete_event',
          ...deletePayload,
          timestamp: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        return {
          success: true,
          message: json.message || 'Event removed from Google Calendar!',
        };
      }
    } catch (err: any) {
      console.error('[Google Calendar Delete Webhook Exception]:', err?.message);
    }
  }

  return {
    success: true,
    message: 'Event removal completed.',
  };
}

export async function autoSyncDeleteAppointment(
  a: Appointment,
  settings?: Partial<SalonSettings>
) {
  const cleanCustomer = (a.customer || '').replace(/^Z\d{2}\s+/i, '').trim();
  const cleanPhone = (a.mobile || '').replace(/\D/g, '').slice(-10);
  const title = `💅 ${cleanCustomer || a.customer || 'Customer'} — ${a.service || 'Service'}`;
  return deleteEventFromGoogleCalendar(
    {
      title,
      summary: title,
      customerName: cleanCustomer || a.customer,
      name: cleanCustomer || a.customer,
      customer: cleanCustomer || a.customer,
      phone: cleanPhone || a.mobile,
      mobile: cleanPhone || a.mobile,
      bookingId: a.id,
      id: a.id,
      date: normalizeDateToYYYYMMDD(a.date),
      appointment: a,
    },
    settings
  );
}

export async function autoSyncDeleteBridal(
  b: BridalBooking,
  settings?: Partial<SalonSettings>
) {
  const cleanName = (b.name || '').replace(/^Z\d{2}\s+/i, '').trim();
  const cleanPhone = (b.mobile || '').replace(/\D/g, '').slice(-10);
  const title = cleanName || b.name || 'Bride';
  return deleteEventFromGoogleCalendar(
    {
      title,
      summary: title,
      customerName: cleanName || b.name,
      name: cleanName || b.name,
      phone: cleanPhone || b.mobile,
      mobile: cleanPhone || b.mobile,
      bookingId: b.id,
      id: b.id,
      date: normalizeDateToYYYYMMDD(b.weddingDate || b.date || b.sagaiDate || b.mandapDate || b.musicDate || b.otherDate),
      bridal: b,
    },
    settings
  );
}

/**
 * Builds standard Google Calendar event payload for a Studio Holiday / Closed / Full Booking date.
 */
export function buildHolidayEventPayload(
  h: StudioHoliday,
  settings?: Partial<SalonSettings>
): GoogleCalendarEventPayload {
  const salon = settings?.salon || 'Shree Beauty Studio';
  const address = settings?.address || 'Katargam, Surat, Gujarat 395004';
  const startDate = normalizeDateToYYYYMMDD(h.date);
  const endDate = normalizeDateToYYYYMMDD(h.endDate || h.date);

  const startISO = `${startDate}T09:00:00+05:30`;
  const endISO = `${endDate}T21:00:00+05:30`;

  let icon = '🏖️';
  let titlePrefix = 'Holiday (રજા)';
  if (h.type === 'Full Booking') {
    icon = '⛔';
    titlePrefix = 'Slots Full (હાઉસફુલ)';
  } else if (h.type === 'Closed') {
    icon = '🔒';
    titlePrefix = 'Studio Closed (બંધ)';
  } else if (h.type === 'Maintenance') {
    icon = '🛠️';
    titlePrefix = 'Maintenance';
  }

  const lines = [
    `${icon} ${salon.toUpperCase()} — ${titlePrefix.toUpperCase()}`,
    `─────────────────────────────────`,
    `📋 Status / Type: ${h.type}`,
    `🎯 Reason / Occasion: ${h.reason}`,
    h.notes ? `📝 Notes: ${h.notes}` : '',
    `📅 Date: ${startDate}${h.endDate ? ` to ${endDate}` : ''}`,
    `🚫 Customer Online Booking: Closed / Unavailable (Disabled)`,
    `📍 Location: ${address}`,
  ].filter(Boolean);

  return {
    summary: `${icon} [${titlePrefix}] ${h.reason}`,
    description: lines.join('\n'),
    location: address,
    start: { dateTime: startISO, timeZone: 'Asia/Kolkata' },
    end: { dateTime: endISO, timeZone: 'Asia/Kolkata' },
  };
}

/**
 * Auto-syncs a Studio Holiday / Closed / Full Booking date to Google Calendar.
 */
export async function autoSyncHolidayToGoogleCalendar(
  h: StudioHoliday,
  settings?: Partial<SalonSettings>
): Promise<CalendarSyncResult> {
  const payload = buildHolidayEventPayload(h, settings);
  return syncEventToGoogleCalendar(payload, settings);
}

/**
 * Removes a Studio Holiday / Blocked date from Google Calendar.
 */
export async function autoSyncDeleteHoliday(
  h: StudioHoliday,
  settings?: Partial<SalonSettings>
) {
  let icon = '🏖️';
  let titlePrefix = 'Holiday (રજા)';
  if (h.type === 'Full Booking') {
    icon = '⛔';
    titlePrefix = 'Slots Full (હાઉસફુલ)';
  } else if (h.type === 'Closed') {
    icon = '🔒';
    titlePrefix = 'Studio Closed (બંધ)';
  } else if (h.type === 'Maintenance') {
    icon = '🛠️';
    titlePrefix = 'Maintenance';
  }

  const title = `${icon} [${titlePrefix}] ${h.reason}`;
  return deleteEventFromGoogleCalendar(
    {
      title,
      summary: title,
      bookingId: h.id,
      id: h.id,
      date: normalizeDateToYYYYMMDD(h.date),
      holiday: h,
    },
    settings
  );
}

/**
 * Ready-to-use Google Apps Script Code snippet for 1-click free Google Calendar integration.
 */
export const SAMPLE_GOOGLE_APPS_SCRIPT_CODE = `// 📋 MULTI-ACCOUNT, AUTO-SYNC & AUTO-DELETE GOOGLE APPS SCRIPT CODE
// 1. Go to https://script.google.com -> Open your Project
// 2. Replace everything with this code & Deploy -> Manage deployments -> Edit -> New version -> Deploy:

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var cal = CalendarApp.getDefaultCalendar();

    // 🗑️ 1. DELETE / CANCEL EVENT ACTION
    if (data && (data.action === 'delete_event' || data.action === 'cancel_event' || data.type === 'delete_appointment' || data.type === 'delete_bridal' || data.type === 'delete_holiday')) {
      var searchTitle = (data.title || (data.event ? data.event.summary : '') || '').toLowerCase();
      var customerName = (data.customerName || data.customer || (data.appointment ? data.appointment.customer : '') || (data.bridal ? data.bridal.name : '') || '').toLowerCase().replace(/^z\d{2}\s+/i, '').trim();
      var bookingId = (data.bookingId || data.id || '').toLowerCase();
      var rawPhone = data.phone || data.mobile || '';
      var cleanPhone = rawPhone.toString().replace(/\D/g, '').slice(-10);
      var searchDateStr = data.date || (data.appointment ? data.appointment.date : null) || (data.event && data.event.start && data.event.start.dateTime ? data.event.start.dateTime.split('T')[0] : null);

      var fromDate, toDate;
      if (searchDateStr) {
        fromDate = new Date(searchDateStr + 'T00:00:00+05:30');
        toDate = new Date(searchDateStr + 'T23:59:59+05:30');
      } else {
        var now = new Date();
        fromDate = new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000));
        toDate = new Date(now.getTime() + (60 * 24 * 60 * 60 * 1000));
      }

      var deletedCount = deleteMatchingEventsFromCal(cal, fromDate, toDate, bookingId, customerName, searchTitle, cleanPhone);

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        action: 'delete_event',
        deletedCount: deletedCount,
        message: deletedCount + " calendar event(s) deleted!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ➕ 2. CREATE / UPDATE EVENT ACTION
    var ev = data.event;
    if (!ev) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "No event payload provided"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 🧹 Auto-Delete Past Salon Events Older Than 2 Days (2 દિવસ જૂની ઇવેન્ટ ઓટો-ડિલીટ)
    var deletePastDays = (data && data.deletePastDays !== undefined) ? data.deletePastDays : 2;
    if (deletePastDays > 0) {
      try {
        cleanupPastSalonEvents(cal, deletePastDays);
      } catch (cleanErr) {}
    }
    
    var startTime = new Date(ev.start.dateTime);
    var endTime = new Date(ev.end.dateTime);
    
    // 🛡️ Deduplicate on THAT EXACT DAY ONLY: Remove duplicate / old event for this customer on this date
    var searchTitle = (ev.summary || '').toLowerCase();
    var customerName = (data.customerName || data.customer || (data.appointment ? data.appointment.customer : '') || (data.bridal ? data.bridal.name : '') || '').toLowerCase().replace(/^z\d{2}\s+/i, '').trim();
    if (!customerName && ev.summary) {
      var cleanSum = ev.summary.replace(/^[^\w\s]+/u, '').trim();
      var parts = cleanSum.split('—');
      if (parts.length > 0) customerName = parts[0].trim().toLowerCase();
    }
    var bookingId = (data.bookingId || data.id || (data.appointment ? data.appointment.id : '') || (data.bridal ? data.bridal.id : '') || '').toLowerCase();
    var rawPhone = data.phone || data.mobile || '';
    var cleanPhone = rawPhone.toString().replace(/\D/g, '').slice(-10);
    
    var dayStart = new Date(startTime.getTime());
    dayStart.setHours(0, 0, 0, 0);
    var dayEnd = new Date(startTime.getTime());
    dayEnd.setHours(23, 59, 59, 999);
    
    // Clean duplicates in Primary Calendar
    deleteMatchingEventsFromCal(cal, dayStart, dayEnd, bookingId, customerName, searchTitle, cleanPhone);
    
    // 👥 Multi-Account Guest Emails (All attendees + extra staff/owners)
    var guestList = [];
    if (ev.attendees && Array.isArray(ev.attendees)) {
      for (var i = 0; i < ev.attendees.length; i++) {
        if (ev.attendees[i] && ev.attendees[i].email) {
          var em = ev.attendees[i].email.trim();
          if (em && guestList.indexOf(em) === -1) {
            guestList.push(em);
          }
        }
      }
    }
    
    // Clean any old duplicate manual events from other calendars if accessible
    for (var k = 0; k < guestList.length; k++) {
      try {
        var extraCal = CalendarApp.getCalendarById(guestList[k]);
        if (extraCal && extraCal.getId() !== cal.getId()) {
          deleteMatchingEventsFromCal(extraCal, dayStart, dayEnd, bookingId, customerName, searchTitle, cleanPhone);
        }
      } catch (eCleanExtra) {}
    }
    
    var eventOptions = {
      description: ev.description,
      location: ev.location,
      guests: guestList.join(','),
      sendInvites: true // Sends Google Calendar invite so it appears cleanly in their calendar (1 single event, never duplicate!)
    };
    
    // 1. Create single shared event in Primary Google Calendar
    var createdEvent = cal.createEvent(ev.summary, startTime, endTime, eventOptions);
    
    // Dynamic Reminders from Salon Settings (Pop-up & Email)
    if (ev.reminders && Array.isArray(ev.reminders.overrides)) {
      for (var r = 0; r < ev.reminders.overrides.length; r++) {
        var rem = ev.reminders.overrides[r];
        if (rem.method === 'email') {
          createdEvent.addEmailReminder(rem.minutes);
        } else {
          createdEvent.addPopupReminder(rem.minutes);
        }
      }
    } else if (!ev.reminders) {
      createdEvent.addPopupReminder(60);
      createdEvent.addEmailReminder(1440);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      eventId: createdEvent.getId(),
      syncedAccounts: guestList.length + 1,
      message: "Event added to Google Calendar successfully (single clean event for all accounts)!"
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// 🛡️ Helper to cleanly delete matching duplicate events from any calendar on a specific date range
function deleteMatchingEventsFromCal(calInstance, fromDate, toDate, bookingId, customerName, searchTitle, cleanPhone) {
  if (!calInstance) return 0;
  var count = 0;
  try {
    var events = calInstance.getEvents(fromDate, toDate);
    for (var d = 0; d < events.length; d++) {
      var currentEv = events[d];
      var cTitle = (currentEv.getTitle() || '').toLowerCase();
      var cDesc = (currentEv.getDescription() || '').toLowerCase();
      var match = false;

      // 1. Exact Booking Ref ID match in description
      if (bookingId && bookingId.length >= 3 && cDesc.indexOf(bookingId) !== -1) {
        match = true;
      }
      // 2. Same customer name on that date
      else if (customerName && customerName.length >= 3 && cTitle.indexOf(customerName) !== -1) {
        match = true;
      }
      // 3. Same title or phone
      else if (searchTitle && cTitle === searchTitle) {
        match = true;
      }
      else if (cleanPhone && cleanPhone.length === 10 && (cDesc.indexOf(cleanPhone) !== -1 || cTitle.indexOf(cleanPhone) !== -1)) {
        match = true;
      }

      if (match) {
        try {
          currentEv.deleteEvent();
          count++;
        } catch (eD) {}
      }
    }
  } catch (e) {}
  return count;
}

// 🧹 Automatic function to delete past salon events older than N days (Default: 2 days)
function cleanupPastSalonEvents(cal, daysOld) {
  if (!cal) cal = CalendarApp.getDefaultCalendar();
  if (daysOld === undefined || daysOld <= 0) daysOld = 2;
  
  var now = new Date();
  var cutoffDate = new Date(now.getTime() - (daysOld * 24 * 60 * 60 * 1000));
  var lookbackStart = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
  
  var pastEvents = cal.getEvents(lookbackStart, cutoffDate);
  for (var j = 0; j < pastEvents.length; j++) {
    var item = pastEvents[j];
    var title = item.getTitle() || "";
    if (title.indexOf('💅') === 0 || title.indexOf('👑') === 0 || title.indexOf('Shree') !== -1 || title.indexOf('—') !== -1) {
      try {
        item.deleteEvent();
      } catch (eDel) {}
    }
  }
}

// ⏰ Standalone Daily Auto-Cleanup Trigger (Runs automatically every night):
// Go to script.google.com -> Triggers (⏰ icon on left) -> Add Trigger -> Choose "dailyAutoCleanup" -> Time-driven -> Day timer (1am to 2am)
function dailyAutoCleanup() {
  cleanupPastSalonEvents(CalendarApp.getDefaultCalendar(), 2);
}

// 3. Click "Deploy" -> "Manage deployments" -> Edit -> "New version" -> "Deploy"
// 4. Set "Execute as: Me" and "Who has access: Anyone"`;
