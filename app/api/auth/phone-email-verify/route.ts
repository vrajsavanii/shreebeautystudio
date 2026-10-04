// app/api/auth/phone-email-verify/route.ts
// Handles Phone.Email Free SMS OTP Token Exchange, Customer Account Linking, and Session Creation
import { NextRequest, NextResponse } from 'next/server';
import { verifyPhoneEmailToken, verifyPhoneEmailUserJson, VerifiedPhoneUser } from '@/lib/phone-email';
import {
  findCustomerByIdentifier,
  upsertCustomerAccount,
  normalizeMobile,
} from '@/lib/customer-auth';
import { setCustomerSessionCookie } from '@/lib/customer-session-server';
import { Appointment, BridalBooking } from '@/types/salon';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const accessToken = body.access_token || body.accessToken || '';
    const userJsonUrl = body.user_json_url || '';
    const purpose = body.purpose || 'login'; // 'login' | 'signup' | 'my-appointments'

    if (!accessToken && !userJsonUrl) {
      return NextResponse.json(
        { success: false, error: 'Verification token or user JSON profile is required from Phone.Email.' },
        { status: 400 }
      );
    }

    // 1. Verify token or profile with Phone.Email API
    let verified: VerifiedPhoneUser;
    if (userJsonUrl) {
      verified = await verifyPhoneEmailUserJson(userJsonUrl);
      if (!verified.success && accessToken) {
        verified = await verifyPhoneEmailToken(accessToken);
      }
    } else {
      verified = await verifyPhoneEmailToken(accessToken);
    }

    if (!verified.success || !verified.cleanMobile) {
      return NextResponse.json(
        { success: false, error: verified.error || 'Invalid or expired phone verification token.' },
        { status: 400 }
      );
    }

    const cleanMobile = verified.cleanMobile;


    // 2. Look up customer account in salon state
    const { customer: existingCustomer, salonData } = await findCustomerByIdentifier(cleanMobile);

    let customer = existingCustomer;
    if (!customer) {
      // First-time visitor: Create customer profile with verified phone
      customer = await upsertCustomerAccount({
        name: body.name || 'Valued Client',
        mobile: cleanMobile,
        phoneVerified: true,
        source: 'phone_email_otp',
      } as any);
    } else {
      // Existing client: Mark phone as verified
      customer = await upsertCustomerAccount({
        ...customer,
        phoneVerified: true,
      } as any);
    }

    // 3. Extract client appointments and bridal bookings
    const allAppointments: Appointment[] = salonData.appointments || [];
    const allBridal: BridalBooking[] = salonData.bridal || [];

    const matchedAppointments = allAppointments
      .filter((a) => normalizeMobile(a.mobile || '').clean === cleanMobile)
      .map((a) => {
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

    const res = NextResponse.json({
      success: true,
      authenticated: true,
      message: 'Mobile number verified successfully via Phone.Email Free SMS OTP.',
      verifiedPhone: cleanMobile,
      customer: {
        id: customer.id,
        name: customer.name,
        mobile: cleanMobile,
        email: customer.email,
        phoneVerified: true,
      },
      appointments: matchedAppointments,
      bridal: matchedBridal,
    });

    // 4. Issue secure HTTP-only customer session cookie
    setCustomerSessionCookie(res, customer);

    return res;
  } catch (err: any) {
    console.error('Error in POST /api/auth/phone-email-verify:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error while verifying phone token.' },
      { status: 500 }
    );
  }
}
