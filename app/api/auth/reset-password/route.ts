// app/api/auth/reset-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  normalizeMobile,
  normalizeEmail,
  verifyAuthOtp,
  findCustomerByIdentifier,
  hashPassword,
  upsertCustomerAccount,
  toSafeCustomerProfile,
} from '@/lib/customer-auth';
import { setCustomerSessionCookie } from '@/lib/customer-session-server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifier, method = 'mobile', otp, newPassword } = body;

    const normalized =
      method === 'email' ? normalizeEmail(identifier || '') : normalizeMobile(identifier || '').clean;

    if (!normalized || !otp || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Identifier, verification code, and new password are required.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'New password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    // 1. Verify OTP
    const otpRes = verifyAuthOtp(normalized, method, 'reset', otp);
    if (!otpRes.valid) {
      return NextResponse.json(
        { success: false, error: otpRes.error || 'Invalid or expired verification code.' },
        { status: 400 }
      );
    }

    // 2. Find customer
    const { customer } = await findCustomerByIdentifier(normalized);
    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Account not found.' },
        { status: 404 }
      );
    }

    // 3. Hash new password & update
    const passwordHash = await hashPassword(newPassword);
    const updated = await upsertCustomerAccount({
      ...customer,
      passwordHash,
      phoneVerified: method === 'mobile' ? true : customer.phoneVerified,
      emailVerified: method === 'email' ? true : customer.emailVerified,
      lastLoginAt: new Date().toISOString(),
    });

    const safeProfile = toSafeCustomerProfile(updated);
    const res = NextResponse.json({
      success: true,
      message: 'Your password has been reset successfully! You are now logged in.',
      profile: safeProfile,
    });

    // 4. Log customer in immediately with session cookie
    setCustomerSessionCookie(res, updated);
    return res;
  } catch (err: any) {
    console.error('Error in reset-password route:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to reset password.' },
      { status: 500 }
    );
  }
}
