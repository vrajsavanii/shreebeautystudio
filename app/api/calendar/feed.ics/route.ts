// app/api/calendar/feed.ics/route.ts
// Live iCal / WebCal Google Calendar Subscription Feed
// Allows Salon Owner & Staff to subscribe directly in Google Calendar (Add calendar -> From URL)
// for continuous 24/7 background synchronization.

import { getSupabaseAdmin } from '@/lib/supabase-server';
import { DEFAULT_DATA } from '@/lib/store';
import { SalonData } from '@/types/salon';
import { generateBulkAppointmentsICS } from '@/lib/calendar';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const { data: rows, error: sErr } = await supabase
      .from('salon_state')
      .select('data')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (sErr) console.error('[feed.ics Supabase error]:', sErr);

    const salonData: SalonData = rows && rows.length > 0 && rows[0].data
      ? (rows[0].data as SalonData)
      : { ...DEFAULT_DATA };

    const salon = salonData.settings?.salon || 'Shree Beauty Studio';
    const address = salonData.settings?.address || '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004';
    const deletePastDays = salonData.settings?.calendarDeletePastDays !== undefined
      ? salonData.settings.calendarDeletePastDays
      : 2;

    const icsContent = generateBulkAppointmentsICS(
      salonData.appointments || [],
      salonData.bridal || [],
      salon,
      address,
      deletePastDays
    );

    return new Response(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="shree-beauty-studio.ics"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('[Calendar Feed ICS Error]:', err?.message);
    return new Response('Error generating calendar feed', { status: 500 });
  }
}
