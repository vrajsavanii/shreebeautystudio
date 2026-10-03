// app/api/my-appointments/route.ts
// Secure My Appointments API: Requires Mobile Number + Password or Authenticated Session
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedCustomer, setCustomerSessionCookie } from '@/lib/customer-session-server';
import {
  findCustomerByIdentifier,
  verifyPassword,
  normalizeMobile,
  getSalonDataFromCloud,
} from '@/lib/customer-auth';
import { Appointment, BridalBooking } from '@/types/salon';

export const dynamic = 'force-dynamic';

/**
 * Helper to extract appointments and bridal bookings for a verified mobile number
 */
function extractCustomerBookings(salonData: any, cleanMobile: string) {
  const allAppointments: Appointment[] = salonData.appointments || [];
  const allBridal: BridalBooking[] = salonData.bridal || [];

  const matchedAppointments = allAppointments
    .filter((a) => normalizeMobile(a.mobile || '').clean === cleanMobile)
    .map((a) => {
      // Strip staff assignment for customer privacy
      const { staff, ...rest } = a;
      return rest;
    })
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const matchedBridal = allBridal
    .filter((b) => normalizeMobile(b.mobile || '').clean === cleanMobile)
    .map((b) => {
      const { staff, assignedStaff, ...rest } = b as any;
      return rest;
    })
    .sort((a, b) => (b.weddingDate || b.date || '').localeCompare(a.weddingDate || a.date || ''));

  return { matchedAppointments, matchedBridal };
}

/**
 * POST /api/my-appointments
 * Authenticates user via Mobile Number + Password and returns their appointments
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawMobile = body.mobile || body.phone || '';
    const password = body.password || '';

    const { clean } = normalizeMobile(rawMobile);

    if (!clean || clean.length !== 10) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid 10-digit mobile number.' },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        {
          success: false,
          error: 'Password is required to view your appointments for privacy & security.',
        },
        { status: 400 }
      );
    }

    // 1. Look up customer account
    const { customer, salonData } = await findCustomerByIdentifier(clean);

    if (!customer) {
      // Check if mobile has appointments in salon state
      const hasAppointments = (salonData.appointments || []).some(
        (a) => normalizeMobile(a.mobile || '').clean === clean
      );
      const hasBridal = (salonData.bridal || []).some(
        (b) => normalizeMobile(b.mobile || '').clean === clean
      );

      if (hasAppointments || hasBridal) {
        return NextResponse.json(
          {
            success: false,
            needsPasswordSetup: true,
            error:
              'You have bookings with us, but haven\'t set up a password yet. Please click "Set Password" to create your password and protect your appointments.',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          notFound: true,
          error: 'No account or appointments found for this mobile number.',
        },
        { status: 404 }
      );
    }

    // 2. Check if customer has passwordHash
    if (!customer.passwordHash) {
      return NextResponse.json(
        {
          success: false,
          needsPasswordSetup: true,
          error:
            'You do not have a password set yet. Please click "Set Password" or "Forgot Password" to create one.',
        },
        { status: 400 }
      );
    }

    // 3. Verify password
    const isMatch = await verifyPassword(password, customer.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        {
          success: false,
          error: 'Incorrect password for this mobile number. Please check and try again.',
        },
        { status: 401 }
      );
    }

    // 4. Password verified! Retrieve customer's bookings
    const { matchedAppointments, matchedBridal } = extractCustomerBookings(salonData, clean);

    const res = NextResponse.json({
      success: true,
      authenticated: true,
      appointments: matchedAppointments,
      bridal: matchedBridal,
      customer: {
        id: customer.id,
        name: customer.name,
        mobile: clean,
      },
    });

    // 5. Set secure HTTP-only customer session cookie
    setCustomerSessionCookie(res, customer);

    return res;
  } catch (err: any) {
    console.error('Error in POST /api/my-appointments:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error while verifying credentials.' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/my-appointments
 * Retrieves appointments for the currently authenticated session only
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedCustomer(req);

    if (!auth) {
      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          error: 'Authentication required. Please enter your mobile number and password.',
        },
        { status: 401 }
      );
    }

    const clean = normalizeMobile(auth.customer.mobile).clean;
    const { data: salonData } = await getSalonDataFromCloud();

    const { matchedAppointments, matchedBridal } = extractCustomerBookings(salonData, clean);

    return NextResponse.json({
      success: true,
      authenticated: true,
      appointments: matchedAppointments,
      bridal: matchedBridal,
      customer: {
        id: auth.customer.id,
        name: auth.customer.name,
        mobile: clean,
      },
    });
  } catch (err: any) {
    console.error('Error in GET /api/my-appointments:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error while fetching appointments.' },
      { status: 500 }
    );
  }
}
