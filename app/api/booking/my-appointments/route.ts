// app/api/booking/my-appointments/route.ts
// Lookup appointments by customer mobile — no auth, just mobile verification
import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawMobile = body.mobile || '';
    const mobile = rawMobile.replace(/\D/g, '').slice(-10);

    if (mobile.length !== 10) {
      return NextResponse.json({ error: 'Please enter a valid 10-digit mobile number' }, { status: 400 });
    }

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
      return NextResponse.json({ appointments: [] });
    }

    const data = rows[0].data;
    const allAppointments = data.appointments || [];

    // Filter by mobile and return only customer-safe fields
    const customerAppointments = allAppointments
      .filter((a: any) => a.mobile === mobile)
      .map((a: any) => ({
        id: a.id,
        date: a.date,
        time: a.time,
        service: a.service,
        staff: a.staff,
        status: a.status,
        workStatus: a.workStatus || 'Booked',
      }))
      .sort((a: any, b: any) => b.date.localeCompare(a.date) || b.time?.localeCompare(a.time || ''));

    return NextResponse.json({
      appointments: customerAppointments,
      customerName: allAppointments.find((a: any) => a.mobile === mobile)?.customer || '',
    });
  } catch (err: any) {
    console.error('[My Appointments API]', err?.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
