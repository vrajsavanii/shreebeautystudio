// app/api/calendar/auto-sync/route.ts
// Cloud API endpoint to auto-sync appointments and bridal bookings to Google Calendar

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { DEFAULT_DATA } from '@/lib/store';
import { SalonData } from '@/types/salon';
import {
  autoSyncAppointmentToGoogleCalendar,
  autoSyncBridalToGoogleCalendar,
  autoSyncHolidayToGoogleCalendar,
  autoSyncDeleteAppointment,
  autoSyncDeleteBridal,
  autoSyncDeleteHoliday,
  deleteEventFromGoogleCalendar,
} from '@/lib/google-calendar-server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, appointment, bridal, holiday, appointments, bridals, holidays, action } = body;

    // 1. Fetch salon settings from database
    const supabase = getSupabaseAdmin();
    const { data: rows } = await supabase
      .from('salon_state')
      .select('data')
      .order('updated_at', { ascending: false })
      .limit(1);

    const salonData: SalonData = rows && rows.length > 0 && rows[0].data
      ? (rows[0].data as SalonData)
      : { ...DEFAULT_DATA };

    const settings = { ...(salonData.settings || {}), ...(body.settings || {}) };

    // 2. Handle Event Deletion / Cancellation
    if (
      action === 'delete_event' ||
      action === 'cancel_event' ||
      type === 'delete_appointment' ||
      type === 'cancel_appointment' ||
      type === 'delete_bridal' ||
      type === 'cancel_bridal' ||
      type === 'delete_holiday'
    ) {
      if (type === 'delete_appointment' || type === 'cancel_appointment' || appointment) {
        const appt = appointment || body.appt;
        if (appt) {
          const res = await autoSyncDeleteAppointment(appt, settings);
          return NextResponse.json({ success: true, message: res.message });
        }
      }
      if (type === 'delete_bridal' || type === 'cancel_bridal' || bridal) {
        const b = bridal;
        if (b) {
          const res = await autoSyncDeleteBridal(b, settings);
          return NextResponse.json({ success: true, message: res.message });
        }
      }
      if (type === 'delete_holiday' || holiday) {
        const h = holiday || body.holiday;
        if (h) {
          const res = await autoSyncDeleteHoliday(h, settings);
          return NextResponse.json({ success: true, message: res.message });
        }
      }
      const res = await deleteEventFromGoogleCalendar(body, settings);
      return NextResponse.json({ success: true, message: res.message });
    }

    if (!appointment && !bridal && !holiday && !appointments && !bridals && !holidays) {
      return NextResponse.json(
        { success: false, error: 'Appointment, Bridal, Holiday, or Bulk payload required' },
        { status: 400 }
      );
    }

    if (type === 'bulk' || appointments || bridals || holidays) {
      const apptList = appointments || salonData.appointments || [];
      const bridalList = bridals || salonData.bridal || [];
      const holidayList = holidays || salonData.holidays || [];
      let syncedCount = 0;

      for (const a of apptList) {
        if (a.date && a.status !== 'Cancelled') {
          await autoSyncAppointmentToGoogleCalendar(a, settings);
          syncedCount++;
        }
      }

      for (const b of bridalList) {
        if (
          (b.weddingDate || b.date || b.sagaiDate || b.mandapDate || b.musicDate || b.otherDate) &&
          b.status !== 'Cancelled'
        ) {
          await autoSyncBridalToGoogleCalendar(b, settings);
          syncedCount++;
        }
      }

      for (const h of holidayList) {
        if (h.date) {
          await autoSyncHolidayToGoogleCalendar(h, settings);
          syncedCount++;
        }
      }

      return NextResponse.json({
        success: true,
        provider: settings.googleCalendarWebhookUrl ? 'webhook' : 'live-feed',
        syncedCount,
        message: `Successfully processed ${syncedCount} items for Google Calendar sync!`,
      });
    }

    let result;
    if (type === 'holiday' || holiday) {
      result = await autoSyncHolidayToGoogleCalendar(holiday, settings);
    } else if (type === 'bridal' || bridal) {
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
