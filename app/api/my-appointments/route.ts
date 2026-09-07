// app/api/my-appointments/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { SalonData, Appointment, BridalBooking, Customer } from '@/types/salon';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawMobile = searchParams.get('mobile') || '';
    const clean = rawMobile.replace(/\D/g, '').slice(-10);

    if (clean.length !== 10) {
      return NextResponse.json(
        { success: false, error: 'A valid 10-digit mobile number is required.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data: rows, error } = await supabase
      .from('salon_state')
      .select('data')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error || !rows || rows.length === 0 || !rows[0].data) {
      return NextResponse.json({
        success: true,
        appointments: [],
        bridal: [],
        customer: null,
      });
    }

    const salonData = rows[0].data as SalonData;
    const allAppointments: Appointment[] = salonData.appointments || [];
    const allBridal: BridalBooking[] = salonData.bridal || [];
    const allCustomers: Customer[] = salonData.customers || [];

    // Filter appointments matching mobile
    const matchedAppointments = allAppointments
      .filter((a) => (a.mobile || '').replace(/\D/g, '').slice(-10) === clean)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    // Filter bridal bookings matching mobile
    const matchedBridal = allBridal
      .filter((b) => (b.mobile || '').replace(/\D/g, '').slice(-10) === clean)
      .sort((a, b) => (b.weddingDate || b.date || '').localeCompare(a.weddingDate || a.date || ''));

    // Customer profile info
    const customer = allCustomers.find(
      (c) => (c.mobile || '').replace(/\D/g, '').slice(-10) === clean
    ) || null;

    return NextResponse.json({
      success: true,
      appointments: matchedAppointments,
      bridal: matchedBridal,
      customer: customer ? { name: customer.name, mobile: customer.mobile } : null,
    });
  } catch (err: any) {
    console.error('Error in my-appointments API route:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error while fetching appointments.' },
      { status: 500 }
    );
  }
}
