// app/api/whatsapp/send-pdf/route.ts
//
// Meta WhatsApp Cloud API — Official PDF Invoice Dispatch
//
// ✅ Credentials are read EXCLUSIVELY from server environment variables.
// ✅ NEVER reads credentials from the request body.
// ✅ NEVER exposes credentials in responses or logs.
// ✅ Returns structured, user-friendly error messages.

import { NextRequest, NextResponse } from 'next/server';

// ─── Utility: Classify Meta API error into a user-friendly message ──────────
function classifyMetaError(metaJson: any, statusCode: number): string {
  const code = metaJson?.error?.code;
  const subcode = metaJson?.error?.error_subcode;
  const msg = metaJson?.error?.message || '';

  if (statusCode === 401 || code === 190) {
    return 'WhatsApp connection error — your access token has expired or is invalid. Please update it in Settings → WhatsApp.';
  }
  if (code === 100 && subcode === 33) {
    return 'Invalid Phone Number ID. Please check your WhatsApp setup in Settings.';
  }
  if (code === 131026 || msg.toLowerCase().includes('phone number')) {
    return "The customer's phone number is not a valid WhatsApp number.";
  }
  if (code === 131047 || code === 131056) {
    return 'You can only message customers who have messaged you first (outside the 24-hour window). Use an approved template.';
  }
  if (code === 80007 || code === 4 || statusCode === 429) {
    return 'Too many WhatsApp messages sent. Please wait a moment and try again.';
  }
  if (msg.toLowerCase().includes('template')) {
    return 'WhatsApp message template not approved yet. Please approve your template in Meta Business Manager.';
  }
  if (code === 131000) {
    return 'WhatsApp Business API error. Please check your configuration in Settings.';
  }
  return `Unable to send WhatsApp message (code ${code || statusCode}). Please check your API credentials in Settings.`;
}

// ─── Utility: Normalise phone number to E.164 with India +91 prefix ─────────
function normalizePhone(raw: string): { valid: boolean; e164: string } {
  const digits = raw.replace(/\D/g, '');

  // Already in E.164 format with country code (12+ digits)
  if (digits.length >= 11 && digits.startsWith('91')) {
    return { valid: true, e164: digits };
  }

  // 10-digit Indian mobile — prepend 91
  if (digits.length === 10) {
    const first = Number(digits[0]);
    if (first >= 6) {
      return { valid: true, e164: `91${digits}` };
    }
  }

  return { valid: false, e164: '' };
}

// ─── POST /api/whatsapp/send-pdf ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, caption, filename, pdfBase64, pdfUrl } = body;

    // ── 1. Validate phone number ──────────────────────────────────────────────
    if (!to || typeof to !== 'string' || to.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'This invoice has no mobile number for the customer.' },
        { status: 400 }
      );
    }

    const { valid, e164: recipient } = normalizePhone(to);
    if (!valid) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please check the customer's phone number — it doesn't look like a valid Indian mobile number.",
        },
        { status: 400 }
      );
    }

    // ── 2. Read credentials from server env only — NEVER from request body ────
    const phoneId = process.env.META_WHATSAPP_PHONE_NUMBER_ID || '';
    const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN || '';

    if (!phoneId || !accessToken || phoneId.startsWith('PASTE_') || accessToken.startsWith('PASTE_')) {
      return NextResponse.json(
        {
          success: false,
          notConfigured: true,
          error:
            'WhatsApp API not configured yet. Please add your Phone Number ID and Access Token in Settings → WhatsApp.',
        },
        { status: 503 }
      );
    }

    // ── 3. Upload PDF to Meta Media API (if base64 provided) ─────────────────
    let mediaId: string | null = null;

    if (pdfBase64 && !pdfUrl) {
      try {
        const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const blob = new Blob([buffer], { type: 'application/pdf' });

        const fd = new FormData();
        fd.append('file', blob, filename || `Invoice_${recipient}.pdf`);
        fd.append('type', 'application/pdf');
        fd.append('messaging_product', 'whatsapp');

        const uploadRes = await fetch(
          `https://graph.facebook.com/v21.0/${phoneId}/media`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` },
            body: fd,
          }
        );

        const uploadJson = await uploadRes.json();

        if (uploadRes.ok && uploadJson.id) {
          mediaId = uploadJson.id;
          console.log('[WhatsApp] PDF uploaded to Meta media API. Media ID:', mediaId);
        } else {
          console.error('[WhatsApp] Media upload failed:', JSON.stringify(uploadJson));
          let errMsg = uploadJson?.error?.message || 'Could not upload the PDF to WhatsApp servers.';
          if (uploadJson?.error?.code === 190 || errMsg.toLowerCase().includes('oauth access token')) {
            errMsg = '❌ Invalid Meta Access Token: Token must start with EAAG... Copy the Access Token from Meta Developer Portal (WhatsApp -> API Setup).';
          }
          return NextResponse.json(
            {
              success: false,
              error: errMsg,
            },
            { status: 502 }
          );
        }
      } catch (uploadErr: any) {
        console.error('[WhatsApp] PDF upload exception:', uploadErr?.message || uploadErr);
        return NextResponse.json(
          {
            success: false,
            error: 'PDF upload failed due to a network error. Please try again.',
          },
          { status: 502 }
        );
      }
    }

    // ── 4. Build document payload ─────────────────────────────────────────────
    const documentPayload: Record<string, string> = {
      caption: caption || '✨ Shree Beauty Studio — Official PDF Invoice Receipt',
      filename: filename || `Invoice_${recipient}.pdf`,
    };

    if (mediaId) {
      documentPayload.id = mediaId;
    } else if (pdfUrl) {
      documentPayload.link = pdfUrl;
    } else {
      return NextResponse.json(
        { success: false, error: 'No PDF content available to send.' },
        { status: 400 }
      );
    }

    // ── 5. Send document message via Meta Cloud API ───────────────────────────
    const metaRes = await fetch(
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
          type: 'document',
          document: documentPayload,
        }),
      }
    );

    const metaJson = await metaRes.json();

    if (!metaRes.ok) {
      // Log full error server-side without exposing it to the client
      console.error('[WhatsApp] Meta API error response:', JSON.stringify(metaJson));
      const userMessage = classifyMetaError(metaJson, metaRes.status);
      return NextResponse.json(
        { success: false, error: userMessage },
        { status: 200 } // Return 200 so client can read the error body
      );
    }

    const messageId = metaJson?.messages?.[0]?.id;
    console.log(`[WhatsApp] ✅ PDF sent to ${recipient}. Message ID: ${messageId}`);

    return NextResponse.json({
      success: true,
      method: 'meta_cloud_api',
      messageId,
      recipient,
      message: '✅ PDF Invoice sent successfully via WhatsApp!',
    });

  } catch (error: any) {
    // Top-level catch — log full error, return only safe message
    console.error('[WhatsApp] Unexpected error in send-pdf route:', error?.message || error);
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred while sending WhatsApp message. Please try again.',
      },
      { status: 500 }
    );
  }
}
