import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    let phoneId =
      process.env.META_WHATSAPP_PHONE_NUMBER_ID ||
      process.env.WHATSAPP_PHONE_NUMBER_ID ||
      '';

    let accessToken =
      process.env.META_WHATSAPP_ACCESS_TOKEN ||
      process.env.WHATSAPP_ACCESS_TOKEN ||
      '';

    let wabaId =
      process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID ||
      process.env.WHATSAPP_BUSINESS_ACCOUNT_ID ||
      '';

    // Fallback: Check salon_state in database
    if (!accessToken || !phoneId) {
      try {
        const supabase = getSupabaseAdmin();
        if (supabase) {
          const { data: row } = await supabase.from('salon_state').select('data').eq('id', 1).single();
          if (row?.data?.settings?.whatsappAccessToken) {
            accessToken = row.data.settings.whatsappAccessToken;
          }
          if (row?.data?.settings?.whatsappPhoneId) {
            phoneId = row.data.settings.whatsappPhoneId;
          }
          if (row?.data?.settings?.whatsappBusinessAccountId) {
            wabaId = row.data.settings.whatsappBusinessAccountId;
          }
        }
      } catch (err) {
        console.warn('Could not read whatsapp credentials from salon_state:', err);
      }
    }

    if (!phoneId || !accessToken) {
      return NextResponse.json({
        connected: false,
        error: 'WhatsApp credentials not configured. Please set Phone Number ID and Access Token in Settings or .env.local.',
        phoneId: phoneId || null,
        hasToken: !!accessToken,
      });
    }

    // Call Meta Graph API to verify connection & fetch phone number details
    const metaRes = await fetch(
      `https://graph.facebook.com/v19.0/${phoneId}?fields=verified_name,display_phone_number,quality_rating,code_verification_status,throughput`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const metaJson = await metaRes.json();

    if (!metaRes.ok) {
      return NextResponse.json({
        connected: false,
        phoneId,
        wabaId,
        error: metaJson?.error?.message || 'Failed to authenticate with Meta Graph API',
        errorCode: metaJson?.error?.code,
        errorSubcode: metaJson?.error?.error_subcode,
        details: metaJson?.error,
      });
    }

    return NextResponse.json({
      connected: true,
      phoneId,
      wabaId,
      displayPhoneNumber: metaJson.display_phone_number || 'Registered Number',
      verifiedName: metaJson.verified_name || 'Verified Business Name',
      qualityRating: metaJson.quality_rating || 'UNKNOWN',
      verificationStatus: metaJson.code_verification_status || 'VERIFIED',
    });
  } catch (err: any) {
    return NextResponse.json(
      { connected: false, error: err?.message || 'Server error checking WhatsApp status' },
      { status: 500 }
    );
  }
}
