// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  normalizeMobile,
  normalizeEmail,
  verifyPassword,
  verifyAuthOtp,
  findCustomerByIdentifier,
  upsertCustomerAccount,
  toSafeCustomerProfile,
} from '@/lib/customer-auth';
import { setCustomerSessionCookie } from '@/lib/customer-session-server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { method = 'mobile', password, otp } = body;
    const rawMobile = body.mobile || body.phone || body.identifier || '';
    const rawEmail = body.email || body.identifier || '';

    let targetIdentifier = '';
    if (method === 'email') {
      targetIdentifier = normalizeEmail(rawEmail);
      if (!targetIdentifier || !targetIdentifier.includes('@')) {
        return NextResponse.json(
          { success: false, error: 'Please enter a valid email address.' },
          { status: 400 }
        );
      }
    } else {
      const { clean } = normalizeMobile(rawMobile);
      targetIdentifier = clean;
      if (!targetIdentifier || targetIdentifier.length !== 10) {
        return NextResponse.json(
          { success: false, error: 'Please enter a valid 10-digit mobile number.' },
          { status: 400 }
        );
      }
    }

    // 1. Find customer account
    const { customer } = await findCustomerByIdentifier(targetIdentifier);
    if (!customer) {
      return NextResponse.json(
        {
          success: false,
          error: 'No account found with this information. Please create a new account.',
          notFound: true,
        },
        { status: 404 }
      );
    }

    if (customer.status === 'suspended') {
      return NextResponse.json(
        { success: false, error: 'This account has been suspended. Please contact studio support.' },
        { status: 403 }
      );
    }

    // 2. Authenticate: Password vs OTP
    if (otp) {
      // Mobile OTP Login
      const otpRes = verifyAuthOtp(targetIdentifier, 'mobile', 'login', otp);
      if (!otpRes.valid) {
        return NextResponse.json(
          { success: false, error: otpRes.error || 'Invalid or expired OTP code.' },
          { status: 400 }
        );
      }
    } else {
      // Password Login
      if (!password) {
        return NextResponse.json(
          { success: false, error: 'Please enter your account password.' },
          { status: 400 }
        );
      }

      if (!customer.passwordHash) {
        return NextResponse.json(
          {
            success: false,
            error: 'You do not have a password set yet. Please log in with OTP or click "Forgot Password" to set one.',
            needsPasswordSetup: true,
          },
          { status: 400 }
        );
      }

      const isMatch = await verifyPassword(password, customer.passwordHash);
      if (!isMatch) {
        return NextResponse.json(
          { success: false, error: 'Invalid password. Please check your credentials and try again.' },
          { status: 401 }
        );
      }
    }

    // 3. Prepare updated customer profile with lastLoginAt
    const updated = {
      ...customer,
      lastLoginAt: new Date().toISOString(),
    };

    // Non-blocking background persistence so login returns instantly
    upsertCustomerAccount(updated).catch((err) => console.warn('[Login] Background lastLogin update failed:', err));

    const safeProfile = toSafeCustomerProfile(updated);
    const res = NextResponse.json({
      success: true,
      message: `Welcome back, ${customer.name}!`,
      profile: safeProfile,
    });

    // 4. Set secure HTTP-only session cookie
    setCustomerSessionCookie(res, updated);
    return res;
  } catch (err: any) {
    console.error('Error in customer login route:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error while logging in.' },
      { status: 500 }
    );
  }
}
