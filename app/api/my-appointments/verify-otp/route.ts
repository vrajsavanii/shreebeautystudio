// app/api/my-appointments/verify-otp/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyOtp } from '@/lib/otp-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawMobile = body.mobile || '';
    const code = body.otp || '';
    const clean = rawMobile.replace(/\D/g, '').slice(-10);

    if (clean.length !== 10) {
      return NextResponse.json(
        { success: false, error: 'માન્ય ૧૦ આંકડાનો મોબાઈલ નંબર જરૂરી છે.' },
        { status: 400 }
      );
    }

    if (!code || code.trim().length !== 4) {
      return NextResponse.json(
        { success: false, error: 'કૃપા કરીને ૪ આંકડાનો સાચો OTP દાખલ કરો.' },
        { status: 400 }
      );
    }

    const result = verifyOtp(clean, code.trim());

    if (!result.valid) {
      return NextResponse.json(
        { success: false, error: result.error || 'અમાન્ય OTP. કૃપા કરીને ફરીથી તપાસો.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'OTP સફળતાપૂર્વક વેરિફાઈ થઈ ગયો છે.',
      token: result.token,
    });
  } catch (err: any) {
    console.error('Error in verify-otp route:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'OTP ચકાસણીમાં સર્વર ભૂલ આવી.' },
      { status: 500 }
    );
  }
}
