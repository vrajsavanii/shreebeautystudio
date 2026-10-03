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

    // Formatted message in English
    const message = `🌸 *Shree Beauty Studio | Security OTP*\n\nYour security verification code to access your appointment & booking history is:\n\n🔢 *${otp}*\n\n_(This code is valid for 5 minutes. Please do not share it with anyone.)_\n\n📍 Shree Beauty Studio, Katargam, Surat\n📞 Helpline: +91 98241 83769\n🌐 https://shreebeauty.studio`;

    // Attempt to send via WhatsApp Cloud API
    let sentViaWhatsApp = false;
    let fallbackWaUrl = `https://wa.me/919824183769?text=${encodeURIComponent(`Hi Shree Beauty Studio, please send my security verification code for mobile +91 ${clean} to view my appointments`)}`;

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
      message: 'OTP sent successfully.',
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
