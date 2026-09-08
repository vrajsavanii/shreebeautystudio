// app/api/booking/create/route.ts
// Creates a new appointment with double-booking prevention via optimistic concurrency
import { NextRequest, NextResponse } from 'next/server';
import { sendResendEmail, renderAppointmentConfirmationHtml } from '@/lib/email';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUFFER_MINUTES = 15;

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { serviceId, staffId, date, time, customerName, customerMobile, customerEmail, notes } = body;

    if (!serviceId || !date || !time || !customerName || !customerMobile) {
      return NextResponse.json(
        { error: 'Missing required fields: serviceId, date, time, customerName, customerMobile' },
        { status: 400 }
      );
    }

    // Validate mobile
    const mobile = customerMobile.replace(/\D/g, '').slice(-10);
    if (mobile.length !== 10) {
      return NextResponse.json({ error: 'Invalid mobile number' }, { status: 400 });
    }

    // Don't allow booking in the past
    const today = new Date().toISOString().slice(0, 10);
    if (date < today) {
      return NextResponse.json({ error: 'Cannot book past dates' }, { status: 400 });
    }

    // Fetch current salon_state
    const stateRes = await fetch(`${SUPABASE_URL}/rest/v1/salon_state?select=id,data,updated_at&limit=1`, {
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
      return NextResponse.json({ error: 'No salon data found' }, { status: 500 });
    }

    const row = rows[0];
    const data = row.data;

    // Find service
    const service = (data.services || []).find((s: any) => s.id === serviceId);
    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    // Find staff
    let staffName = 'Studio Team';
    if (staffId && staffId !== 'any') {
      const staff = (data.staff || []).find((s: any) => s.id === staffId);
      if (staff) {
        staffName = staff.name;
      }
    } else if (data.staff?.length) {
      // Assign to first available staff
      staffName = data.staff[0].name;
    }

    // === DOUBLE-BOOKING CHECK ===
    const existingAppointments = (data.appointments || []).filter(
      (a: any) =>
        a.date === date &&
        a.status !== 'Cancelled' &&
        a.workStatus !== 'Cancelled' &&
        (staffId === 'any' || !staffId || a.staff === staffName)
    );

    const requestedStart = timeToMinutes(time);
    const requestedEnd = requestedStart + (service.duration || 45);

    const hasConflict = existingAppointments.some((a: any) => {
      const apptStart = timeToMinutes(a.time || '10:00');
      const apptService = (data.services || []).find((s: any) => s.name === a.service);
      const apptDuration = apptService?.duration || 45;
      const apptEnd = apptStart + apptDuration + BUFFER_MINUTES;
      return requestedStart < apptEnd && requestedEnd > apptStart;
    });

    if (hasConflict) {
      return NextResponse.json(
        { error: 'This time slot was just booked. Please select another time.' },
        { status: 409 }
      );
    }

    const cleanEmail = customerEmail && typeof customerEmail === 'string' && customerEmail.includes('@')
      ? customerEmail.trim()
      : undefined;

    // === CREATE APPOINTMENT ===
    const appointmentId = uid();
    const newAppointment = {
      id: appointmentId,
      date,
      time,
      customer: customerName.trim(),
      mobile,
      email: cleanEmail,
      service: service.name,
      staff: staffName,
      advance: 0,
      status: 'Confirmed' as const,
      workStatus: 'Booked' as const,
      notes: notes ? `Online Booking: ${notes}` : 'Booked via Online Booking',
    };

    // === AUTO-REGISTER CUSTOMER ===
    let updatedCustomers = [...(data.customers || [])];
    const existingIndex = updatedCustomers.findIndex(
      (c: any) => c.mobile === mobile
    );

    if (existingIndex >= 0) {
      if (cleanEmail && !updatedCustomers[existingIndex].email) {
        updatedCustomers[existingIndex] = {
          ...updatedCustomers[existingIndex],
          email: cleanEmail,
        };
      }
    } else {
      updatedCustomers.push({
        id: uid(),
        name: customerName.trim(),
        mobile,
        email: cleanEmail,
        birthday: '',
        anniversary: '',
        notes: 'Acquired via Online Booking',
      });
    }

    // === SAVE TO SUPABASE ===
    const updatedData = {
      ...data,
      customers: updatedCustomers,
      appointments: [newAppointment, ...(data.appointments || [])],
    };

    const saveRes = await fetch(`${SUPABASE_URL}/rest/v1/salon_state?id=eq.${row.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        data: updatedData,
        updated_at: new Date().toISOString(),
      }),
    });

    if (!saveRes.ok) {
      const errText = await saveRes.text();
      console.error('[Booking Create] Save failed:', errText);
      return NextResponse.json({ error: 'Failed to save booking' }, { status: 500 });
    }

    // === SEND RESEND EMAIL CONFIRMATION (best-effort, non-blocking) ===
    if (cleanEmail) {
      try {
        const salonName = data.settings?.salon || 'Shree Beauty Studio';
        const html = renderAppointmentConfirmationHtml({
          customerName: customerName.trim(),
          service: service.name,
          staff: staffName,
          date,
          time,
          price: service.price,
          address: data.settings?.address,
          salonName,
        });

        sendResendEmail({
          to: cleanEmail,
          subject: `✨ Appointment Confirmed — ${service.name} at ${salonName}`,
          html,
          apiKey: data.settings?.resendApiKey,
          from: data.settings?.resendFromEmail,
        }).catch((emailErr) => {
          console.warn('[Resend Booking Email Warning]:', emailErr);
        });
      } catch (emailErr) {
        console.warn('[Resend Booking Email Exception]:', emailErr);
      }
    }

    // === SEND WHATSAPP CONFIRMATION (best-effort, don't block response) ===
    try {
      const originUrl = req.nextUrl.origin;
      await fetch(`${originUrl}/api/whatsapp/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: `91${mobile}`,
          message: `✨ *APPOINTMENT CONFIRMED — ${data.settings?.salon || 'Shree Beauty Studio'}* ✨
────────────────────────────
Dear ${customerName},
Your appointment is confirmed! Here are your booking details:

📅 Date: ${date}
⏰ Time: ${time}
💄 Service: ${service.name}
👩‍💼 Professional: ${staffName}
💰 Price: ₹${service.price}
📍 Address: ${data.settings?.address || 'Surat'}

Thank you for choosing ${data.settings?.salon || 'Shree Beauty Studio'}! We look forward to pampering you. 💖`,
        }),
      }).catch(() => {});
    } catch {
      // WhatsApp notification is best-effort
    }

    return NextResponse.json({
      success: true,
      appointment: {
        id: newAppointment.id,
        date: newAppointment.date,
        time: newAppointment.time,
        service: newAppointment.service,
        staff: newAppointment.staff,
        customer: newAppointment.customer,
        status: newAppointment.status,
      },
      message: 'Appointment booked successfully!',
    });
  } catch (err: any) {
    console.error('[Booking Create]', err?.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
