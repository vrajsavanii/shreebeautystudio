// app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedCustomer } from '@/lib/customer-session-server';
import { getSalonDataFromCloud, normalizeMobile } from '@/lib/customer-auth';
import { Appointment, BridalBooking, Invoice } from '@/types/salon';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedCustomer(req);
    if (!auth) {
      return NextResponse.json(
        { success: false, authenticated: false, error: 'Not authenticated.' },
        { status: 401 }
      );
    }

    const { profile, customer } = auth;
    const cleanMobile = normalizeMobile(customer.mobile).clean;

    // Load full salon state for matching customer's real appointments & invoices
    const { data: salonData } = await getSalonDataFromCloud();
    const allAppointments: Appointment[] = salonData.appointments || [];
    const allBridal: BridalBooking[] = salonData.bridal || [];
    const allInvoices: Invoice[] = salonData.invoices || [];

    const appointments = allAppointments
      .filter((a) => normalizeMobile(a.mobile || '').clean === cleanMobile)
      .map((a) => {
        // Strip sensitive internal staff notes for customer privacy
        const { staff, ...rest } = a;
        return rest;
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const bridal = allBridal
      .filter((b) => normalizeMobile(b.mobile || '').clean === cleanMobile)
      .sort((a, b) => (b.weddingDate || b.date || '').localeCompare(a.weddingDate || a.date || ''));

    const invoices = allInvoices
      .filter((i) => normalizeMobile(i.mobile || '').clean === cleanMobile)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    return NextResponse.json({
      success: true,
      authenticated: true,
      profile,
      appointments,
      bridal,
      invoices,
    });
  } catch (err: any) {
    console.error('Error in /api/auth/me route:', err);
    return NextResponse.json(
      { success: false, authenticated: false, error: err?.message || 'Server error.' },
      { status: 500 }
    );
  }
}
