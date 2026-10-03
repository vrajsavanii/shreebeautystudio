// app/api/my-appointments/send-otp/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateAndStoreOtp } from '@/lib/otp-auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawMobile = body.mobile || '';
    const clean = rawMobile.replace(/\D/g, '').slice(-10);

    if (clean.length !== 10) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid 10-digit mobile number.' },
        { status: 400 }
      );
    }

    // Generate 4-digit OTP
    const { otp, expiresAt } = generateAndStoreOtp(clean);

    // Mask phone number for UI display (e.g., +91 98765 ***10)
    const maskedMobile = `+91 ${clean.slice(0, 5)} ***${clean.slice(-2)}`;

    return NextResponse.json({
      success: true,
      message: 'OTP generated for mobile verification.',
      maskedMobile,
      expiresAt,
      // In development mode, include demo OTP for quick testing
      demoOtp: process.env.NODE_ENV === 'development' ? otp : undefined,
    });
  } catch (err: any) {
    console.error('Error in send-otp route:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'OTP મોકલવામાં ભૂલ આવી. ફરી પ્રયાસ કરો.' },
      { status: 500 }
    );
  }
}
