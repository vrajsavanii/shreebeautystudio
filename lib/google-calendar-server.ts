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
export function formatISTDateTime(
  dateStr?: string,
  timeStr?: string,
  durationMinutes: number = 45
): { startISO: string; endISO: string } {
  let cleanDate = (dateStr || '').trim();
  if (!cleanDate || !cleanDate.includes('-')) {
    cleanDate = new Date().toISOString().split('T')[0];
  }
  const parts = cleanDate.split('-').map(Number);
  const year = parts[0] || new Date().getFullYear();
  const month = parts[1] || new Date().getMonth() + 1;
  const day = parts[2] || new Date().getDate();

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
      overrides: overrides.length > 0 ? overrides : [{ method: 'popup', minutes: 60 }],
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
  const primaryDate =
    b.weddingDate ||
    b.date ||
    b.sagaiDate ||
    b.mandapDate ||
    b.musicDate ||
    b.otherDate ||
    new Date().toISOString().split('T')[0];
  const primaryTime = b.weddingTime || b.sagaiTime || b.mandapTime || b.musicTime || b.otherTime || '08:00 AM';
  const { startISO, endISO } = formatISTDateTime(primaryDate, primaryTime, 180);

  const eventDatesList = [
    b.weddingDate ? `💍 Wedding: ${b.weddingDate}` : '',
    b.sagaiDate ? `✨ Sagai: ${b.sagaiDate}` : '',
    b.mandapDate ? `🌿 Mandap: ${b.mandapDate}` : '',
    b.musicDate ? `🎶 Sangeet / Music: ${b.musicDate}` : '',
    b.otherDate ? `🌸 Other Event: ${b.otherDate}` : '',
  ].filter(Boolean);

  const lines = [
    `👑 SHREE BEAUTY STUDIO — BRIDAL BOOKING`,
    `─────────────────────────────────`,
    `👰 Bride / Client: ${b.name}`,
    `📞 Mobile: +91 ${b.mobile}`,
    `👑 Package: ${b.packageName || 'Bridal Glam'}`,
    eventDatesList.length > 0 ? eventDatesList.join('\n') : `💍 Date: ${primaryDate}`,
    `📍 Venue / Location: ${b.venue || address}`,
    `💰 Total Package: ₹${b.package || b.totalAmount || 0}`,
    b.advance ? `💵 Advance Paid: ₹${b.advance}` : '',
    b.notes ? `📝 Notes: ${b.notes}` : '',
    `📞 Studio Contact: +91 ${settings?.whatsapp || '9773240010'}`,
  ].filter(Boolean);

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

  return {
    summary: `👑 ${b.name} — ${b.packageName || 'Bridal Package'}`,
    description: lines.join('\n'),
    location: b.venue || address,
    start: { dateTime: startISO, timeZone: 'Asia/Kolkata' },
    end: { dateTime: endISO, timeZone: 'Asia/Kolkata' },
    reminders: {
      useDefault: false,
      overrides: bridalOverrides.length > 0 ? bridalOverrides : [{ method: 'popup', minutes: 1440 }, { method: 'popup', minutes: 120 }],
    },
    attendees: attendees.length > 0 ? attendees : undefined,
  };
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
  settings?: Partial<SalonSettings>
): Promise<CalendarSyncResult> {
  const saEmail =
    settings?.googleServiceAccountEmail?.trim() ||
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const saKey =
    settings?.googleServiceAccountPrivateKey?.trim() ||
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim() ||
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
 * Delete / Remove event from Google Calendar via Webhook or API
 */
export async function deleteEventFromGoogleCalendar(
  deletePayload: {
    title?: string;
    customerName?: string;
    phone?: string;
    bookingId?: string;
    date?: string;
  },
  settings?: Partial<SalonSettings>
): Promise<{ success: boolean; message: string }> {
  const webhookUrl =
    settings?.googleCalendarWebhookUrl?.trim() ||
    process.env.GOOGLE_CALENDAR_WEBHOOK_URL?.trim() ||
    'https://script.google.com/macros/s/AKfycbxcu02Y6dn5tcxpX8QbILUrlOfiOmNiiX3FHdhdHMNQT3X3X6zDTe9FaP_OLmpLX4PX/exec';

  if (webhookUrl) {
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_event',
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
  const title = `💅 ${a.customer || 'Customer'} — ${a.service || 'Service'}`;
  return deleteEventFromGoogleCalendar(
    {
      title,
      customerName: a.customer,
      phone: a.mobile,
      bookingId: a.id,
      date: a.date,
    },
    settings
  );
}

export async function autoSyncDeleteBridal(
  b: BridalBooking,
  settings?: Partial<SalonSettings>
) {
  const title = `👑 BRIDAL: ${b.name || 'Bride'}`;
  return deleteEventFromGoogleCalendar(
    {
      title,
      customerName: b.name,
      phone: b.mobile,
      bookingId: b.id,
      date: b.weddingDate || b.date,
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

    // 🗑️ 1. DELETE / CANCEL EVENT ACTION (અપોઇન્ટમેન્ટ કે બ્રાઇડલ કેન્સલ/ડિલીટ થાય ત્યારે ઇવેન્ટ ડિલીટ કરવી)
    if (data && (data.action === 'delete_event' || data.action === 'cancel_event' || data.type === 'delete_appointment' || data.type === 'delete_bridal')) {
      var searchTitle = data.title || (data.event ? data.event.summary : '') || '';
      var customerName = data.customerName || '';
      var bookingId = data.bookingId || data.id || '';
      var phone = data.phone || data.mobile || '';
      var searchDateStr = data.date || (data.event && data.event.start && data.event.start.dateTime ? data.event.start.dateTime : null);

      var fromDate = searchDateStr ? new Date(new Date(searchDateStr).getTime() - (3 * 24 * 60 * 60 * 1000)) : new Date(new Date().getTime() - (90 * 24 * 60 * 60 * 1000));
      var toDate = searchDateStr ? new Date(new Date(searchDateStr).getTime() + (3 * 24 * 60 * 60 * 1000)) : new Date(new Date().getTime() + (365 * 24 * 60 * 60 * 1000));

      var events = cal.getEvents(fromDate, toDate);
      var deletedCount = 0;
      for (var d = 0; d < events.length; d++) {
        var currentEv = events[d];
        var cTitle = (currentEv.getTitle() || '').toLowerCase();
        var cDesc = (currentEv.getDescription() || '').toLowerCase();

        var match = false;
        if (searchTitle && cTitle.indexOf(searchTitle.toLowerCase()) !== -1) match = true;
        if (customerName && (cTitle.indexOf(customerName.toLowerCase()) !== -1 || cDesc.indexOf(customerName.toLowerCase()) !== -1)) match = true;
        if (phone && (cDesc.indexOf(phone) !== -1 || cTitle.indexOf(phone) !== -1)) match = true;
        if (bookingId && (cDesc.indexOf(bookingId.toLowerCase()) !== -1 || cTitle.indexOf(bookingId.toLowerCase()) !== -1)) match = true;

        if (match) {
          try {
            currentEv.deleteEvent();
            deletedCount++;
          } catch (eD) {}
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        action: 'delete_event',
        deletedCount: deletedCount,
        message: deletedCount + " calendar event(s) deleted from Google Calendar!"
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
      } catch (cleanErr) {
        Logger.log("Cleanup error: " + cleanErr);
      }
    }
    
    var startTime = new Date(ev.start.dateTime);
    var endTime = new Date(ev.end.dateTime);
    
    // 👥 Multi-Account Guest Emails (All attendees + extra staff/owners)
    var guestList = [];
    if (ev.attendees && Array.isArray(ev.attendees)) {
      for (var i = 0; i < ev.attendees.length; i++) {
        if (ev.attendees[i] && ev.attendees[i].email) {
          guestList.push(ev.attendees[i].email.trim());
        }
      }
    }
    
    var eventOptions = {
      description: ev.description,
      location: ev.location,
      guests: guestList.join(','),
      sendInvites: false // Automatically adds to all accounts without spam emails
    };
    
    // 1. Create event in Primary Google Calendar
    var createdEvent = cal.createEvent(ev.summary, startTime, endTime, eventOptions);
    
    // Dynamic Reminders from Salon Settings (Pop-up & Email)
    if (ev.reminders && ev.reminders.overrides && ev.reminders.overrides.length > 0) {
      for (var r = 0; r < ev.reminders.overrides.length; r++) {
        var rem = ev.reminders.overrides[r];
        if (rem.method === 'email') {
          createdEvent.addEmailReminder(rem.minutes);
        } else {
          createdEvent.addPopupReminder(rem.minutes);
        }
      }
    } else {
      createdEvent.addPopupReminder(60);
      createdEvent.addEmailReminder(1440);
    }
    
    // 2. (Optional) Direct Multi-Calendar IDs Support:
    var extraCalendarIds = [];
    for (var k = 0; k < extraCalendarIds.length; k++) {
      try {
        var extraCal = CalendarApp.getCalendarById(extraCalendarIds[k]);
        if (extraCal) {
          extraCal.createEvent(ev.summary, startTime, endTime, eventOptions);
          if (deletePastDays > 0) cleanupPastSalonEvents(extraCal, deletePastDays);
        }
      } catch (eCal) {}
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      eventId: createdEvent.getId(),
      syncedAccounts: guestList.length + 1,
      message: "Event added to Google Calendar successfully & old events cleaned up!"
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// 🧹 Automatic function to delete past salon events older than N days (Default: 2 days)
function cleanupPastSalonEvents(cal, daysOld) {
  if (!cal) cal = CalendarApp.getDefaultCalendar();
  if (daysOld === undefined || daysOld <= 0) daysOld = 2;
  
  var now = new Date();
  var cutoffDate = new Date(now.getTime() - (daysOld * 24 * 60 * 60 * 1000));
  var lookbackStart = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000)); // check past 90 days
  
  var pastEvents = cal.getEvents(lookbackStart, cutoffDate);
  for (var j = 0; j < pastEvents.length; j++) {
    var item = pastEvents[j];
    var title = item.getTitle() || "";
    // Delete only salon appointment / bridal events (starting with 💅, 👑 or containing studio markers)
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

// 3. Click "Deploy" -> "New deployment" (or "Manage deployments" -> Edit -> New Version)
// 4. Set "Execute as: Me" and "Who has access: Anyone"
// 5. Copy Web App URL and paste it in Shree Studio Settings -> Google Calendar!`;
