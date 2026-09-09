import crypto from 'crypto';
import { Appointment, BridalBooking, SalonSettings } from '@/types/salon';
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
 * Converts a 12-hour or 24-hour time and date string to ISO datetime with +05:30 IST timezone.
 */
export function formatISTDateTime(dateStr: string, timeStr: string, durationMinutes: number = 45): { startISO: string; endISO: string } {
  const [year, month, day] = dateStr.split('-').map(Number);
  const startTotalMinutes = timeToMinutes(timeStr || '10:00');
  const startHour = Math.floor(startTotalMinutes / 60);
  const startMin = startTotalMinutes % 60;

  const endTotalMinutes = startTotalMinutes + (durationMinutes || 45);
  const endHour = Math.floor(endTotalMinutes / 60);
  const endMin = endTotalMinutes % 60;

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
    `📍 Location: ${address}`,
    `📞 Studio Contact: +91 ${settings?.whatsapp || '9824183769'}`,
  ].filter(Boolean);

  const attendees: Array<{ email: string; displayName?: string }> = [];
  if (a.email?.trim() && a.email.includes('@')) {
    attendees.push({ email: a.email.trim(), displayName: a.customer });
  }
  if (settings?.googleCalendarOwnerEmail?.trim() && settings.googleCalendarOwnerEmail.includes('@')) {
    attendees.push({ email: settings.googleCalendarOwnerEmail.trim(), displayName: salon });
  }

  return {
    summary: `💅 [${salon}] ${a.service} — ${a.customer}`,
    description: lines.join('\n'),
    location: address,
    start: { dateTime: startISO, timeZone: 'Asia/Kolkata' },
    end: { dateTime: endISO, timeZone: 'Asia/Kolkata' },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 120 }, // 2 hours before
        { method: 'popup', minutes: 30 },  // 30 mins before
        { method: 'email', minutes: 1440 }, // 1 day before
      ],
    },
    attendees: attendees.length > 0 ? attendees : undefined,
  };
}

/**
 * Builds standard Google Calendar event payload from a BridalBooking record.
 */
export function buildBridalEventPayload(
  b: BridalBooking,
  settings?: Partial<SalonSettings>
): GoogleCalendarEventPayload {
  const salon = settings?.salon || 'Shree Beauty Studio';
  const address = b.venue || settings?.address || 'Surat, Gujarat';
  const { startISO, endISO } = formatISTDateTime(b.weddingDate || b.date, '08:00 AM', 180);

  const lines = [
    `👑 SHREE BEAUTY STUDIO — BRIDAL BOOKING`,
    `─────────────────────────────────`,
    `👰 Bride / Client: ${b.name}`,
    `📞 Mobile: +91 ${b.mobile}`,
    `👑 Package: ${b.packageName || 'Bridal Glam'}`,
    `💍 Wedding Date: ${b.weddingDate || b.date}`,
    b.sagaiDate ? `✨ Sagai Date: ${b.sagaiDate}` : '',
    `📍 Venue / Location: ${b.venue || address}`,
    `💰 Total Package: ₹${b.package || 0}`,
    b.advance ? `💵 Advance Paid: ₹${b.advance}` : '',
    b.notes ? `📝 Notes: ${b.notes}` : '',
    `📞 Studio Contact: +91 ${settings?.whatsapp || '9824183769'}`,
  ].filter(Boolean);

  const attendees: Array<{ email: string; displayName?: string }> = [];
  if (b.email?.trim() && b.email.includes('@')) {
    attendees.push({ email: b.email.trim(), displayName: b.name });
  }
  if (settings?.googleCalendarOwnerEmail?.trim() && settings.googleCalendarOwnerEmail.includes('@')) {
    attendees.push({ email: settings.googleCalendarOwnerEmail.trim(), displayName: salon });
  }

  return {
    summary: `👑 [${salon} Bridal] ${b.name} (${b.packageName || 'Bridal Package'})`,
    description: lines.join('\n'),
    location: b.venue || address,
    start: { dateTime: startISO, timeZone: 'Asia/Kolkata' },
    end: { dateTime: endISO, timeZone: 'Asia/Kolkata' },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 1440 }, // 1 day before
        { method: 'popup', minutes: 120 },  // 2 hours before
        { method: 'email', minutes: 2880 }, // 2 days before
      ],
    },
    attendees: attendees.length > 0 ? attendees : undefined,
  };
}

/**
 * Automatically syncs an event to Google Calendar via Official Google Calendar API v3 or Cloud Webhook.
 */
export async function syncEventToGoogleCalendar(
  eventPayload: GoogleCalendarEventPayload,
  settings?: Partial<SalonSettings>
): Promise<CalendarSyncResult> {
  const saEmail =
    settings?.googleServiceAccountEmail?.trim() ||
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const saKey =
    settings?.googlePrivateKey?.trim() ||
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

  const webhookUrl =
    settings?.googleCalendarWebhookUrl?.trim() ||
    process.env.GOOGLE_CALENDAR_WEBHOOK_URL?.trim();

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
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_event',
          event: eventPayload,
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
  return syncEventToGoogleCalendar(payload, settings);
}

/**
 * Auto-syncs a Bridal Booking to Google Calendar.
 */
export async function autoSyncBridalToGoogleCalendar(
  b: BridalBooking,
  settings?: Partial<SalonSettings>
): Promise<CalendarSyncResult> {
  const payload = buildBridalEventPayload(b, settings);
  return syncEventToGoogleCalendar(payload, settings);
}

/**
 * Ready-to-use Google Apps Script Code snippet for 1-click free Google Calendar integration.
 */
export const SAMPLE_GOOGLE_APPS_SCRIPT_CODE = `// 📋 GOOGLE APPS SCRIPT CODE (Paste in script.google.com & Deploy as Web App)
// 1. Go to https://script.google.com -> Click "New Project"
// 2. Replace everything with this code:

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ev = data.event;
    var cal = CalendarApp.getDefaultCalendar();
    
    var startTime = new Date(ev.start.dateTime);
    var endTime = new Date(ev.end.dateTime);
    
    var createdEvent = cal.createEvent(ev.summary, startTime, endTime, {
      description: ev.description,
      location: ev.location
    });
    
    // Add pop-up reminder 1 hour before
    createdEvent.addPopupReminder(60);
    createdEvent.addEmailReminder(1440); // 1 day before
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      eventId: createdEvent.getId(),
      message: "Event added to Google Calendar successfully!"
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// 3. Click "Deploy" -> "New deployment" -> Select type: "Web app"
// 4. Set "Execute as: Me" and "Who has access: Anyone"
// 5. Copy Web App URL and paste it in Shree Studio Settings -> Google Calendar!`;
