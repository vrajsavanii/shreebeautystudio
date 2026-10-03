// app/api/my-appointments/verify-otp/route.ts
// Verifies 4-digit mobile OTP, creates secure customer session, and returns customer's appointments
import { NextRequest, NextResponse } from 'next/server';
import { verifyOtp } from '@/lib/otp-auth';
import {
  findCustomerByIdentifier,
  upsertCustomerAccount,
  normalizeMobile,
  verifyAuthOtp,
} from '@/lib/customer-auth';
import { setCustomerSessionCookie } from '@/lib/customer-session-server';
import { Appointment, BridalBooking } from '@/types/salon';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawMobile = body.mobile || body.phone || '';
    const code = (body.otp || body.code || '').trim();
    const clean = rawMobile.replace(/\D/g, '').slice(-10);

    if (clean.length !== 10) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid 10-digit mobile number.' },
        { status: 400 }
      );
    }

    if (!code || code.length < 4 || code.length > 6) {
      return NextResponse.json(
        { success: false, error: 'Please enter the verification code.' },
        { status: 400 }
      );
    }

    // 1. Verify OTP code (try verifyOtp first, fallback to verifyAuthOtp)
    let isValid = false;
    let errorMsg = 'Invalid or expired OTP. Please request a new code.';
    let sessionToken: string | undefined;

    const result = verifyOtp(clean, code);
    if (result.valid) {
      isValid = true;
      sessionToken = result.token;
    } else {
      const authResult = verifyAuthOtp(clean, 'mobile', 'login', code);
      if (authResult.valid) {
        isValid = true;
      } else {
        errorMsg = result.error || authResult.error || 'Invalid or expired OTP. Please request a new code.';
      }
    }

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: 400 }
      );
    }

    // 2. Look up customer account in cloud state
    const { customer: existingCustomer, salonData } = await findCustomerByIdentifier(clean);
    let customer = existingCustomer;

    if (!customer) {
      // Auto-provision verified customer profile
      customer = await upsertCustomerAccount({
        name: 'Valued Client',
        mobile: clean,
        phoneVerified: true,
      } as any);
    } else if (!customer.phoneVerified) {
      customer = await upsertCustomerAccount({
        ...customer,
        phoneVerified: true,
      } as any);
    }

    // 3. Extract verified bookings
    const allAppointments: Appointment[] = salonData.appointments || [];
    const allBridal: BridalBooking[] = salonData.bridal || [];

    const matchedAppointments = allAppointments
      .filter((a) => normalizeMobile(a.mobile || '').clean === clean)
      .map((a) => {
        const { staff, ...rest } = a;
        return rest;
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const matchedBridal = allBridal
      .filter((b) => normalizeMobile(b.mobile || '').clean === clean)
      .map((b) => {
        const { staff, assignedStaff, ...rest } = b as any;
        return rest;
      })
      .sort((a, b) => (b.weddingDate || b.date || '').localeCompare(a.weddingDate || a.date || ''));

    const res = NextResponse.json({
      success: true,
      authenticated: true,
      message: 'Mobile number verified successfully.',
      verifiedMobile: clean,
      customer: {
        id: customer.id,
        name: customer.name,
        mobile: clean,
        email: customer.email,
      },
      appointments: matchedAppointments,
      bridal: matchedBridal,
      token: result.token,
    });

    // 4. Issue secure HTTP-only customer session cookie
    setCustomerSessionCookie(res, customer);

    return res;
  } catch (err: any) {
    console.error('Error in POST /api/my-appointments/verify-otp:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error during OTP verification.' },
      { status: 500 }
    );
  }
}
