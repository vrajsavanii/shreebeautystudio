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

    if (!message && !body.templateName && !body.interactive) {
      return NextResponse.json(
        { error: 'Message text, templateName, or interactive payload is required' },
        { status: 400 }
      );
    }

    const digits = to.replace(/\D/g, '');
    const recipient = digits.length === 10 ? `91${digits}` : (digits.startsWith('91') && digits.length >= 12 ? digits : `91${digits.slice(-10)}`);

    let phoneId = whatsappPhoneId || '';
    let accessToken = whatsappAccessToken || '';
    let paymentIssue: any = null;

    // Check salon_state in database if credentials are not in request body
    try {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        const { data: row } = await supabase.from('salon_state').select('data').order('updated_at', { ascending: false }).limit(1).maybeSingle();
        if (row?.data?.settings?.whatsappPaymentIssue) {
          paymentIssue = row.data.settings.whatsappPaymentIssue;
        }
        if (!accessToken && row?.data?.settings?.whatsappAccessToken) {
          accessToken = row.data.settings.whatsappAccessToken;
        }
        if (!phoneId && row?.data?.settings?.whatsappPhoneId) {
          phoneId = row.data.settings.whatsappPhoneId;
        }
      }
    } catch (err) {
      console.warn('Could not read whatsapp credentials from salon_state:', err);
    }

    // Fall back to server env or verified salon default
    if (!phoneId) {
      phoneId =
        process.env.META_WHATSAPP_PHONE_NUMBER_ID ||
        process.env.WHATSAPP_PHONE_NUMBER_ID ||
        '1313759075154191';
    }

    if (!accessToken || accessToken.startsWith('LLM_')) {
      accessToken =
        process.env.META_WHATSAPP_ACCESS_TOKEN ||
        process.env.WHATSAPP_ACCESS_TOKEN ||
        '';
    }

    const clickToChatUrl = `https://wa.me/${recipient}?text=${encodeURIComponent(message || '')}`;

    // If Meta Cloud API credentials are provided, send message directly via WhatsApp Business API
    if (phoneId && accessToken) {
      const isInteractive = (body.type === 'interactive' || Boolean(body.interactive)) && body.interactive;
      const isTemplate = Boolean(body.templateName);
      const rawParams = body.templateParameters || body.bodyParameters || [];
      let payload: any;

      if (isInteractive) {
        payload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipient,
          type: 'interactive',
          interactive: body.interactive,
        };
      } else if (isTemplate) {
        payload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipient,
          type: 'template',
          template: {
            name: body.templateName,
            language: { code: body.languageCode || 'en_US' },
            components: [
              {
                type: 'body',
                parameters: rawParams.map((t: any) => ({ type: 'text', text: String(t ?? '') })),
              },
            ],
          },
        };
      } else {
        payload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipient,
          type: 'text',
          text: {
            preview_url: false,
            body: message || '',
          },
        };
      }

      let metaRes = await fetch(
        `https://graph.facebook.com/v21.0/${phoneId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(payload),
        }
      );

      let metaJson = await metaRes.json();

      // If interactive failed, fall back to plain text
      if (!metaRes.ok && isInteractive) {
        console.warn('Interactive WhatsApp message failed, falling back to plain text:', metaJson);
        const fallbackText = body.interactive?.body?.text || message || 'Welcome to Shree Beauty Studio!';
        const fallbackRes = await fetch(
          `https://graph.facebook.com/v21.0/${phoneId}/messages`,
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
              text: { preview_url: false, body: fallbackText },
            }),
          }
        );
        const fallbackJson = await fallbackRes.json();
        if (fallbackRes.ok) {
          metaRes = fallbackRes;
          metaJson = fallbackJson;
        }
      }

      if (!metaRes.ok) {
        console.error('Meta WhatsApp Text API Error:', metaJson);
        const code = metaJson?.error?.code;
        const is24HourWindow = code === 131047 || code === 131056;
        const isPaymentRequired =
          code === 131042 ||
          metaJson?.error?.title?.toLowerCase()?.includes('payment') ||
          metaJson?.error?.message?.toLowerCase()?.includes('payment');
        const paymentUrl = isPaymentRequired
          ? metaJson?.error?.href || 'https://business.facebook.com/billing_hub/accounts/details/?business_id=2541939702957992&asset_id=3350176545369989&wizard_name=ADD_PM&account_type=whatsapp-business-account'
          : undefined;

        let errMsg = metaJson?.error?.message || 'Failed to send WhatsApp message via Meta Cloud API';
        if (code === 190 || errMsg.toLowerCase().includes('oauth access token')) {
          errMsg = '❌ Invalid or expired Meta Access Token. Please refresh your token from Meta Developer Portal.';
        } else if (code === 131030) {
          errMsg = `⚠️ Recipient number (+${recipient}) is not on your Meta Test Number allowed list. In Meta Developer Portal → "Step 2: Send and receive messages", click "Manage phone number list", add your mobile number and verify with the OTP.`;
        } else if (isPaymentRequired) {
          errMsg = '⚠️ Payment method required on WhatsApp Business Account to dispatch messages outside test sandbox.';
        } else if (is24HourWindow) {
          errMsg = '⚠️ Customer 24-hour messaging window closed. Dispatched via WhatsApp Web/Direct.';
        }

        return NextResponse.json(
          {
            success: false,
            error: errMsg,
            errorCode: code,
            is24HourWindow,
            isPaymentRequired,
            paymentUrl,
            clickToChatUrl,
            details: metaJson,
          },
          { status: 200 }
        );
      }

      return NextResponse.json({
        success: true,
        method: isTemplate ? 'meta_template_api' : 'meta_cloud_api',
        messageId: metaJson?.messages?.[0]?.id,
        recipient,
        clickToChatUrl,
        message: '✅ Message sent successfully via WhatsApp Business Cloud API! 🚀',
      });
    }

    // If credentials are not configured yet, notify client to fallback to WhatsApp Web
    return NextResponse.json({
      success: false,
      notConfigured: true,
      recipient,
      clickToChatUrl,
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
