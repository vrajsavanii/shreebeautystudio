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
    const { type, appointment, bridal } = body;

    if (!appointment && !bridal) {
      return NextResponse.json(
        { success: false, error: 'Appointment or Bridal payload required' },
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
