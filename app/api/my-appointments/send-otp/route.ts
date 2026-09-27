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
        { success: false, error: 'કૃપા કરીને માન્ય ૧૦ આંકડાનો મોબાઈલ નંબર નાખો (Please enter valid 10-digit mobile).' },
        { status: 400 }
      );
    }

    // Generate 4-digit OTP
    const { otp, expiresAt } = generateAndStoreOtp(clean);

    // Formatted message in Gujarati + English
    const message = `🌸 *Shree Beauty Studio | સિક્યોરિટી ઓટીપી*\n\nતમારી એપોઇન્ટમેન્ટ્સ & બુકિંગ હિસ્ટ્રી જોવા માટેનો સિક્યોર વેરિફિકેશન કોડ:\n\n🔢 *${otp}*\n\n_(આ કોડ ૫ મિનિટ માટે માન્ય છે. કોઈ સાથે શેર કરશો નહીં.)_\n\n📍 Shree Beauty Studio, Katargam, Surat\n📞 Helpline: +91 97732 40010`;

    // Attempt to send via WhatsApp Cloud API
    let sentViaWhatsApp = false;
    let fallbackWaUrl = `https://wa.me/91${clean}?text=${encodeURIComponent(message)}`;

    try {
      const origin = req.nextUrl.origin;
      const waRes = await fetch(`${origin}/api/whatsapp/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: clean,
          message,
        }),
      });

      if (waRes.ok) {
        const json = await waRes.json();
        if (json.success || json.messages || json.messageId) {
          sentViaWhatsApp = true;
        }
      }
    } catch (waErr) {
      console.warn('Could not dispatch direct WhatsApp OTP:', waErr);
    }

    // Mask phone number for UI display (e.g., +91 98765 ***10)
    const maskedMobile = `+91 ${clean.slice(0, 5)} ***${clean.slice(-2)}`;

    return NextResponse.json({
      success: true,
      message: 'OTP સફળતાપૂર્વક મોકલવામાં આવ્યો છે.',
      maskedMobile,
      expiresAt,
      sentViaWhatsApp,
      fallbackWaUrl,
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
