// app/api/auth/verify-otp/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthOtp } from '@/lib/customer-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { target, type = 'mobile', purpose = 'signup', code } = body;

    if (!target || !code) {
      return NextResponse.json(
        { success: false, error: 'Target and verification code are required.' },
        { status: 400 }
      );
    }

    const result = verifyAuthOtp(target, type, purpose, code);
    if (!result.valid) {
      return NextResponse.json(
        { success: false, error: result.error || 'Invalid verification code.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Code verified successfully.',
      verified: true,
    });
  } catch (err: any) {
    console.error('Error in verify-otp route:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Verification failed.' },
      { status: 500 }
    );
  }
}
