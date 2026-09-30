// app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  normalizeMobile,
  normalizeEmail,
  findCustomerByIdentifier,
  generateAuthOtp,
} from '@/lib/customer-auth';
import { dispatchCustomerOtp } from '@/lib/customer-otp-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifier, method = 'mobile' } = body;

    const normalized =
      method === 'email' ? normalizeEmail(identifier || '') : normalizeMobile(identifier || '').clean;

    if (!normalized) {
      return NextResponse.json(
        { success: false, error: 'Please enter your registered mobile number or email.' },
        { status: 400 }
      );
    }

    const { customer } = await findCustomerByIdentifier(normalized);

    // If customer not found, respond with neutral success to prevent enumeration
    if (!customer) {
      return NextResponse.json({
        success: true,
        message: 'If an account is associated with this detail, a verification code has been dispatched.',
      });
    }

    // Generate recovery OTP
    const { otp, cooldownSeconds } = generateAuthOtp(normalized, method, 'reset');

    const origin = req.nextUrl.origin;
    const dispatchResult = await dispatchCustomerOtp({
      target: normalized,
      type: method,
      purpose: 'reset',
      code: otp,
      name: customer.name,
      reqOrigin: origin,
    });

    const masked =
      method === 'mobile'
        ? `+91 ${normalized.slice(0, 5)} ***${normalized.slice(-2)}`
        : `${normalized.slice(0, 2)}***@${normalized.split('@')[1]}`;

    return NextResponse.json({
      success: true,
      message: `Password reset verification code sent to ${masked}.`,
      maskedTarget: masked,
      channel: dispatchResult.channel,
      fallbackUrl: dispatchResult.fallbackUrl,
      cooldownSeconds,
      demoOtp: process.env.NODE_ENV === 'development' ? otp : undefined,
    });
  } catch (err: any) {
    console.error('Error in forgot-password route:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to initiate password reset.' },
      { status: 500 }
    );
  }
}
