// app/api/calendar/auto-sync/route.ts
// Cloud API endpoint to auto-sync appointments and bridal bookings to Google Calendar

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { DEFAULT_DATA } from '@/lib/store';
import { SalonData } from '@/types/salon';
import { autoSyncAppointmentToGoogleCalendar, autoSyncBridalToGoogleCalendar } from '@/lib/google-calendar-server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, appointment, bridal, appointments, bridals } = body;

    if (!appointment && !bridal && !appointments && !bridals) {
      return NextResponse.json(
        { success: false, error: 'Appointment, Bridal, or Bulk payload required' },
        { status: 400 }
      );
    }

    // 1. Fetch salon settings
    const supabase = getSupabaseAdmin();
    const { data: rows } = await supabase
      .from('salon_state')
      .select('data')
      .order('updated_at', { ascending: false })
      .limit(1);

    const salonData: SalonData = rows && rows.length > 0 && rows[0].data
      ? (rows[0].data as SalonData)
      : { ...DEFAULT_DATA };

    const settings = salonData.settings || {};

    if (type === 'bulk' || appointments || bridals) {
      const apptList = appointments || salonData.appointments || [];
      const bridalList = bridals || salonData.bridal || [];
      let syncedCount = 0;

      for (const a of apptList) {
        if (a.date && a.status !== 'Cancelled') {
          await autoSyncAppointmentToGoogleCalendar(a, settings);
          syncedCount++;
        }
      }

      for (const b of bridalList) {
        if ((b.weddingDate || b.date) && b.status !== 'Cancelled') {
          await autoSyncBridalToGoogleCalendar(b, settings);
          syncedCount++;
        }
      }

      return NextResponse.json({
        success: true,
        provider: settings.googleCalendarWebhookUrl ? 'webhook' : 'live-feed',
        syncedCount,
        message: `Successfully processed ${syncedCount} appointments for Google Calendar sync!`,
      });
    }

    let result;
    if (type === 'bridal' || bridal) {
      result = await autoSyncBridalToGoogleCalendar(bridal, settings);
    } else {
      result = await autoSyncAppointmentToGoogleCalendar(appointment, settings);
    }

    return NextResponse.json({
      success: result.success,
      provider: result.provider,
      eventId: result.eventId,
      message: result.message,
      error: result.error,
    });
  } catch (err: any) {
    console.error('[API Calendar Auto-Sync Error]:', err?.message);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to auto-sync to Google Calendar' },
      { status: 500 }
    );
  }
}
