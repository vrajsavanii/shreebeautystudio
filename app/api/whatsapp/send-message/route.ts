import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      to,
      message,
      whatsappPhoneId,
      whatsappAccessToken,
    } = body;

    if (!to) {
      return NextResponse.json(
        { error: 'Recipient mobile number is required' },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { error: 'Message text is required' },
        { status: 400 }
      );
    }

    const cleanNumber = to.replace(/\D/g, '').slice(-10);
    const recipient = `91${cleanNumber}`;

    let phoneId =
      whatsappPhoneId ||
      process.env.META_WHATSAPP_PHONE_NUMBER_ID ||
      process.env.WHATSAPP_PHONE_NUMBER_ID ||
      '';

    let accessToken =
      whatsappAccessToken ||
      process.env.META_WHATSAPP_ACCESS_TOKEN ||
      process.env.WHATSAPP_ACCESS_TOKEN ||
      '';

    // Fallback: Check salon_state in database if credentials are not in env or are placeholders
    if (!accessToken || accessToken.startsWith('LLM_') || !phoneId) {
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
        }
      } catch (err) {
        console.warn('Could not read whatsapp credentials from salon_state:', err);
      }
    }

    // If Meta Cloud API credentials are provided, send message directly via WhatsApp Business API
    if (phoneId && accessToken) {
      const metaRes = await fetch(
        `https://graph.facebook.com/v19.0/${phoneId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: recipient,
            type: 'text',
            text: {
              preview_url: false,
              body: message,
            },
          }),
        }
      );

      const metaJson = await metaRes.json();

      if (!metaRes.ok) {
        console.error('Meta WhatsApp Text API Error:', metaJson);
        let errMsg = metaJson?.error?.message || 'Failed to send WhatsApp message via Meta Cloud API';
        if (metaJson?.error?.code === 190 || errMsg.toLowerCase().includes('oauth access token')) {
          errMsg = '❌ Invalid Meta Access Token: Token must start with EAAG... Copy the Access Token from Meta Developer Portal (WhatsApp -> API Setup).';
        }
        return NextResponse.json(
          {
            success: false,
            error: errMsg,
            details: metaJson,
          },
          { status: metaRes.status || 500 }
        );
      }

      return NextResponse.json({
        success: true,
        method: 'meta_cloud_api',
        messageId: metaJson?.messages?.[0]?.id,
        recipient,
        message: '✅ Message sent successfully via WhatsApp Business Cloud API! 🚀',
      });
    }

    // If credentials are not configured yet, notify client to fallback to WhatsApp Web
    return NextResponse.json({
      success: false,
      notConfigured: true,
      recipient,
      message: 'WhatsApp Cloud API credentials not configured in Settings.',
    });
  } catch (error: any) {
    console.error('Error in send-message route:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
