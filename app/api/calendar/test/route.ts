// app/api/calendar/test/route.ts
// Test endpoint for Google Calendar cloud sync connection

import { NextResponse } from 'next/server';
import { syncEventToGoogleCalendar, formatISTDateTime } from '@/lib/google-calendar-server';
import { todayISO } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { webhookUrl, ownerEmail, salonName } = body;

    const today = todayISO();
    const { startISO, endISO } = formatISTDateTime(today, '14:00', 45);
    const salon = salonName || 'Shree Beauty Studio';

    const testEvent = {
      summary: `✨ [${salon} TEST] Google Calendar Cloud Auto-Sync Live Test`,
      description: `🎉 Congratulations! Your Shree Beauty Studio Google Calendar auto-sync is connected successfully.\n\nAll new appointments and bridal bookings will now automatically save directly to your Google Calendar in the cloud with automated reminders!`,
      location: 'Katargam, Surat, Gujarat',
      start: { dateTime: startISO, timeZone: 'Asia/Kolkata' },
      end: { dateTime: endISO, timeZone: 'Asia/Kolkata' },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup' as const, minutes: 30 },
          { method: 'email' as const, minutes: 60 },
        ],
      },
      attendees: ownerEmail && ownerEmail.includes('@') ? [{ email: ownerEmail, displayName: salon }] : undefined,
    };

    const result = await syncEventToGoogleCalendar(testEvent, {
      googleCalendarWebhookUrl: webhookUrl,
      googleCalendarOwnerEmail: ownerEmail,
      salon: salon,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[API Calendar Test Error]:', err?.message);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to test Google Calendar sync' },
      { status: 500 }
    );
  }
}
