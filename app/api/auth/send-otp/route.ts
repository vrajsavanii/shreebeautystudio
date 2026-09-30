// app/api/auth/send-otp/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  normalizeMobile,
  normalizeEmail,
  generateAuthOtp,
  findCustomerByIdentifier,
} from '@/lib/customer-auth';
import { dispatchCustomerOtp } from '@/lib/customer-otp-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { target, type = 'mobile', purpose = 'signup' } = body;

    let normalized = '';
    let masked = '';

    if (type === 'mobile') {
      const { clean } = normalizeMobile(target || '');
      if (!clean || clean.length !== 10) {
        return NextResponse.json(
          { success: false, error: 'Please enter a valid 10-digit mobile number.' },
          { status: 400 }
        );
      }
      normalized = clean;
      masked = `+91 ${clean.slice(0, 5)} ***${clean.slice(-2)}`;
    } else {
      normalized = normalizeEmail(target || '');
      if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
        return NextResponse.json(
          { success: false, error: 'Please enter a valid email address.' },
          { status: 400 }
        );
      }
      const [user, domain] = normalized.split('@');
      masked = `${user.slice(0, 2)}***@${domain}`;
    }

    // Lookup customer name if existing
    const { customer } = await findCustomerByIdentifier(normalized);
    const customerName = customer?.name || undefined;

    // Generate OTP
    const { otp, cooldownSeconds } = generateAuthOtp(normalized, type, purpose);

    // Dispatch via WhatsApp or Email
    const origin = req.nextUrl.origin;
    const dispatchResult = await dispatchCustomerOtp({
      target: normalized,
      type,
      purpose,
      code: otp,
      name: customerName,
      reqOrigin: origin,
    });

    return NextResponse.json({
      success: true,
      message: `Verification code sent successfully to ${masked}.`,
      maskedTarget: masked,
      channel: dispatchResult.channel,
      fallbackUrl: dispatchResult.fallbackUrl,
      cooldownSeconds,
      // For testing/development convenience
      demoOtp: process.env.NODE_ENV === 'development' ? otp : undefined,
    });
  } catch (err: any) {
    console.error('Error in send-otp route:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to dispatch verification code.' },
      { status: 500 }
    );
  }
}
