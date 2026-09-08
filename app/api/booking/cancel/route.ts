// app/api/booking/cancel/route.ts
// Cancel an appointment — verified by mobile number
import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { appointmentId, mobile: rawMobile } = body;
    const mobile = (rawMobile || '').replace(/\D/g, '').slice(-10);

    if (!appointmentId || mobile.length !== 10) {
      return NextResponse.json({ error: 'appointmentId and valid mobile are required' }, { status: 400 });
    }

    // Fetch current state
    const stateRes = await fetch(`${SUPABASE_URL}/rest/v1/salon_state?select=id,data&limit=1`, {
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
      },
      cache: 'no-store',
    });

    if (!stateRes.ok) {
      return NextResponse.json({ error: 'Failed to access database' }, { status: 500 });
    }

    const rows = await stateRes.json();
    if (!rows?.length || !rows[0]?.data) {
      return NextResponse.json({ error: 'No data found' }, { status: 500 });
    }

    const row = rows[0];
    const data = row.data;

    // Find the appointment
    const appt = (data.appointments || []).find(
      (a: any) => a.id === appointmentId && a.mobile === mobile
    );

    if (!appt) {
      return NextResponse.json(
        { error: 'Appointment not found or mobile number does not match' },
        { status: 404 }
      );
    }

    if (appt.status === 'Cancelled') {
      return NextResponse.json({ error: 'Appointment is already cancelled' }, { status: 400 });
    }

    if (appt.status === 'Completed' || appt.workStatus === 'Completed' || appt.workStatus === 'Billed') {
      return NextResponse.json({ error: 'Cannot cancel a completed appointment' }, { status: 400 });
    }

    // Update the appointment status
    const updatedAppointments = (data.appointments || []).map((a: any) =>
      a.id === appointmentId
        ? { ...a, status: 'Cancelled', workStatus: 'Cancelled', notes: (a.notes || '') + ' | Cancelled by customer online' }
        : a
    );

    const updatedData = { ...data, appointments: updatedAppointments };

    const saveRes = await fetch(`${SUPABASE_URL}/rest/v1/salon_state?id=eq.${row.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: updatedData,
        updated_at: new Date().toISOString(),
      }),
    });

    if (!saveRes.ok) {
      return NextResponse.json({ error: 'Failed to cancel appointment' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Appointment cancelled successfully',
    });
  } catch (err: any) {
    console.error('[Booking Cancel]', err?.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
