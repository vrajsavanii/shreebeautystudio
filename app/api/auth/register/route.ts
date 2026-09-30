// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  normalizeMobile,
  normalizeEmail,
  hashPassword,
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
    const { name, password, method = 'mobile', otp } = body;
    const rawMobile = body.mobile || body.phone || '';
    const email = body.email || '';

    // 1. Validate inputs
    const trimmedName = (name || '').trim();
    if (!trimmedName || trimmedName.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Please enter your full name (minimum 2 characters).' },
        { status: 400 }
      );
    }

    const { clean: cleanMobile } = normalizeMobile(rawMobile);
    if (!cleanMobile || cleanMobile.length !== 10) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid 10-digit mobile number.' },
        { status: 400 }
      );
    }

    const cleanEmail = email ? normalizeEmail(email) : undefined;
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    if (method === 'email' && !cleanEmail) {
      return NextResponse.json(
        { success: false, error: 'Email address is required for email registration.' },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    // 2. Verify OTP if provided or required
    if (otp) {
      const verifyTarget = method === 'email' ? cleanEmail! : cleanMobile;
      const verifyType = method === 'email' ? 'email' : 'mobile';
      const otpRes = verifyAuthOtp(verifyTarget, verifyType, 'signup', otp);
      if (!otpRes.valid) {
        return NextResponse.json(
          { success: false, error: otpRes.error || 'Invalid or expired verification code.' },
          { status: 400 }
        );
      }
    }

    // 3. Check for existing customer identity
    const { customer: existingByPhone } = await findCustomerByIdentifier(cleanMobile);
    if (existingByPhone && existingByPhone.passwordHash) {
      return NextResponse.json(
        {
          success: false,
          error: 'An account with this mobile number already exists. Please log in or use Forgot Password.',
        },
        { status: 409 }
      );
    }

    if (cleanEmail) {
      const { customer: existingByEmail } = await findCustomerByIdentifier(cleanEmail);
      if (existingByEmail && existingByEmail.passwordHash && existingByEmail.id !== existingByPhone?.id) {
        return NextResponse.json(
          {
            success: false,
            error: 'An account with this email address already exists. Please log in with your email.',
          },
          { status: 409 }
        );
      }
    }

    // 4. Hash password securely
    const passwordHash = await hashPassword(password);

    // 5. Upsert customer account (links with existing salon records if present)
    const saved = await upsertCustomerAccount({
      id: existingByPhone?.id,
      name: trimmedName,
      mobile: cleanMobile,
      email: cleanEmail,
      passwordHash,
      phoneVerified: method === 'mobile' ? true : !!existingByPhone?.phoneVerified,
      emailVerified: method === 'email' ? true : !!existingByPhone?.emailVerified,
      status: 'active',
    });

    const safeProfile = toSafeCustomerProfile(saved);
    const res = NextResponse.json({
      success: true,
      message: 'Account created successfully! Welcome to Shree Beauty Studio.',
      profile: safeProfile,
    });

    // 6. Set secure HTTP-only session cookie
    setCustomerSessionCookie(res, saved);
    return res;
  } catch (err: any) {
    console.error('Error in customer register route:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error while creating your account.' },
      { status: 500 }
    );
  }
}
