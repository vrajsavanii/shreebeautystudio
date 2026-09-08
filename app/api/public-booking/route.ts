// app/api/public-booking/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { DEFAULT_DATA } from '@/lib/store';
import { SalonData, Appointment, BridalBooking, Customer } from '@/types/salon';
import { uid } from '@/lib/utils';
import { sendDirectWhatsAppMessage, appointmentCustomerMessage, bridalMessage } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, appointment, bridal, customer } = body;

    if (!appointment && !bridal) {
      return NextResponse.json(
        { success: false, error: 'Appointment or Bridal details required.' },
        { status: 400 }
      );
    }

    const mobile = (appointment?.mobile || bridal?.mobile || '').replace(/\D/g, '').slice(-10);
    const customerName = (appointment?.customer || bridal?.name || '').trim();

    if (!customerName) {
      return NextResponse.json(
        { success: false, error: 'Customer name is required.' },
        { status: 400 }
      );
    }

    if (mobile.length !== 10) {
      return NextResponse.json(
        { success: false, error: 'Valid 10-digit mobile number is required.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 1. Fetch current salon state
    const { data: rows, error: selectErr } = await supabase
      .from('salon_state')
      .select('id, owner_id, data')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (selectErr) {
      console.error('Error fetching salon_state in public-booking:', selectErr);
    }

    let existingData: SalonData = rows && rows.length > 0 && rows[0].data
      ? (rows[0].data as SalonData)
      : { ...DEFAULT_DATA };

    // 2. Prepare new appointment
    const newAppointment: Appointment = appointment
      ? {
          id: appointment.id || uid(),
          date: appointment.date,
          time: appointment.time,
          customer: customerName,
          mobile,
          service: appointment.service,
          staff: appointment.staff || 'Senior Beautician',
          advance: Number(appointment.advance) || 0,
          status: appointment.status || 'Confirmed',
          workStatus: appointment.workStatus || 'Booked',
          notes: appointment.notes || 'Online Self-Booking',
        }
      : {
          id: uid(),
          date: bridal.weddingDate || bridal.date,
          time: '08:00 AM',
          customer: `👑 ${customerName} (BRIDAL)`,
          mobile,
          service: `👑 Bridal: ${bridal.packageName || 'Bridal Package'}`,
          staff: 'Master Bridal Artist',
          advance: Number(bridal.advance) || 0,
          status: 'Confirmed',
          workStatus: 'Booked',
          notes: `Venue: ${bridal.venue || 'Surat'} | Event: ${bridal.event || 'Wedding'}`,
        };

    // 3. Prepare new bridal booking if bridal mode
    let newBridal: BridalBooking | null = null;
    if (type === 'bridal' && bridal) {
      newBridal = {
        id: bridal.id || uid(),
        name: customerName,
        mobile,
        venue: bridal.venue || 'Surat Venue',
        event: bridal.event || 'Bridal Glam',
        date: bridal.date || bridal.weddingDate,
        weddingDate: bridal.weddingDate || bridal.date,
        sagaiDate: bridal.sagaiDate || undefined,
        includeWedding: true,
        includeSagai: !!bridal.sagaiDate,
        packageName: bridal.packageName || 'Bridal Package',
        package: Number(bridal.package) || 0,
        advance: Number(bridal.advance) || 0,
        balance: (Number(bridal.package) || 0) - (Number(bridal.advance) || 0),
        status: bridal.status || 'Booked',
        notes: bridal.notes || 'Online Bridal Self-Booking',
      };
    }

    // 4. Update Customers Directory
    const existingCustomers = existingData.customers || [];
    let updatedCustomers: Customer[] = [...existingCustomers];
    const custIdx = updatedCustomers.findIndex(
      (c) => (c.mobile || '').replace(/\D/g, '').slice(-10) === mobile
    );

    if (custIdx >= 0) {
      updatedCustomers[custIdx] = {
        ...updatedCustomers[custIdx],
        name: customerName,
        totalVisits: (updatedCustomers[custIdx].totalVisits || 0) + 1,
        lastVisit: newAppointment.date,
        anniversary: bridal?.weddingDate || updatedCustomers[custIdx].anniversary,
        sagaiDate: bridal?.sagaiDate || updatedCustomers[custIdx].sagaiDate,
      };
    } else {
      updatedCustomers = [
        {
          id: uid(),
          name: customerName,
          mobile,
          totalVisits: 1,
          totalSpend: 0,
          lastVisit: newAppointment.date,
          anniversary: bridal?.weddingDate,
          sagaiDate: bridal?.sagaiDate,
        },
        ...updatedCustomers,
      ];
    }

    // 5. Build updated salon data payload
    const updatedData: SalonData = {
      ...existingData,
      appointments: [newAppointment, ...(existingData.appointments || []).filter((a) => a.id !== newAppointment.id)],
      bridal: newBridal
        ? [newBridal, ...(existingData.bridal || []).filter((b) => b.id !== newBridal!.id)]
        : existingData.bridal || [],
      customers: updatedCustomers,
    };

    const nowISO = new Date().toISOString();

    // 6. Save to Supabase
    if (rows && rows.length > 0 && rows[0].id) {
      const { error: updateErr } = await supabase
        .from('salon_state')
        .update({
          data: updatedData,
          updated_at: nowISO,
        })
        .eq('id', rows[0].id);

      if (updateErr) {
        console.error('Error updating salon_state:', updateErr);
      }
    } else {
      // Fallback: create row if none exists
      const { data: usersData } = await supabase.auth.admin.listUsers();
      const ownerId = usersData?.users?.[0]?.id;
      if (ownerId) {
        await supabase.from('salon_state').upsert(
          { owner_id: ownerId, data: updatedData, updated_at: nowISO },
          { onConflict: 'owner_id' }
        );
      }
    }

    // 7. Dispatch customer confirmation via WhatsApp (pure Meta API)
    const salon = updatedData.settings?.salon || 'Shree Beauty Studio';
    const address = updatedData.settings?.address || 'Ring Road, Surat, Gujarat';
    const msg =
      type === 'bridal' && newBridal
        ? bridalMessage(customerName, newBridal.packageName, newBridal.weddingDate, newBridal.venue, salon)
        : appointmentCustomerMessage(newAppointment, salon, address);

    let waResult: any = null;
    try {
      waResult = await sendDirectWhatsAppMessage(mobile, msg, updatedData.settings);
      console.log(`[Public Booking WhatsApp] Sent confirmation to ${mobile}:`, waResult);
    } catch (err: any) {
      console.warn('[Public Booking WhatsApp] Dispatch error:', err?.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Booking successfully confirmed & synced with studio.',
      appointment: newAppointment,
      bridal: newBridal,
      whatsapp: waResult,
    });
  } catch (err: any) {
    console.error('Error in public-booking API route:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error while processing booking.' },
      { status: 500 }
    );
  }
}
