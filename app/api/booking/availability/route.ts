// app/api/booking/availability/route.ts
// Computes available time slots for a given service, staff, and date
import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const BUFFER_MINUTES = 15; // buffer between appointments

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60);
  const mins = m % 60;
  return `${h.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function formatTimeDisplay(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${hr}:${(m || 0).toString().padStart(2, '0')} ${ampm}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { serviceId, staffId, date } = body;

    if (!serviceId || !date) {
      return NextResponse.json({ error: 'serviceId and date are required' }, { status: 400 });
    }

    // Don't allow booking in the past
    const today = new Date().toISOString().slice(0, 10);
    if (date < today) {
      return NextResponse.json({ slots: [], message: 'Cannot book past dates' });
    }

    // Fetch salon data
    const res = await fetch(`${SUPABASE_URL}/rest/v1/salon_state?select=data&limit=1`, {
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }

    const rows = await res.json();
    if (!rows?.length || !rows[0]?.data) {
      return NextResponse.json({ slots: [], message: 'No salon data available' });
    }

    const data = rows[0].data;
    const settings = data.settings || {};
    const openTime = timeToMinutes(settings.open || '10:00');
    const closeTime = timeToMinutes(settings.close || '19:00');

    // Find the service
    const service = (data.services || []).find((s: any) => s.id === serviceId);
    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    const duration = service.duration || 45;

    // Get existing appointments for this date
    const appointments = (data.appointments || []).filter(
      (a: any) =>
        a.date === date &&
        a.status !== 'Cancelled' &&
        a.workStatus !== 'Cancelled'
    );

    // Filter by staff if specified
    const relevantAppointments = staffId
      ? appointments.filter((a: any) => {
          const staff = (data.staff || []).find((s: any) => s.id === staffId);
          return staff ? a.staff === staff.name : false;
        })
      : appointments;

    // Build busy intervals [startMin, endMin]
    const busyIntervals: [number, number][] = relevantAppointments.map((a: any) => {
      const startMin = timeToMinutes(a.time || '10:00');
      // Look up service duration from the appointment
      const apptService = (data.services || []).find((s: any) => s.name === a.service);
      const apptDuration = apptService?.duration || 45;
      return [startMin, startMin + apptDuration + BUFFER_MINUTES] as [number, number];
    });

    // Generate available slots in 30-minute intervals
    const slots: { time: string; display: string }[] = [];
    const now = new Date();
    const currentMinutes = date === today ? now.getHours() * 60 + now.getMinutes() + 30 : 0; // 30min buffer for today

    for (let startMin = openTime; startMin + duration <= closeTime; startMin += 30) {
      // Skip if this slot is in the past (for today)
      if (startMin < currentMinutes) continue;

      const endMin = startMin + duration;

      // Check overlap with busy intervals
      const hasConflict = busyIntervals.some(
        ([busyStart, busyEnd]) => startMin < busyEnd && endMin > busyStart
      );

      if (!hasConflict) {
        const timeStr = minutesToTime(startMin);
        slots.push({
          time: timeStr,
          display: formatTimeDisplay(timeStr),
        });
      }
    }

    return NextResponse.json({
      slots,
      service: {
        id: service.id,
        name: service.name,
        duration: service.duration,
        price: service.price,
      },
      date,
      staffId: staffId || null,
    });
  } catch (err: any) {
    console.error('[Booking Availability API]', err?.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
