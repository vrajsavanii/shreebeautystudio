// app/api/whatsapp/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { parseWhatsAppBookingMessage } from '@/lib/whatsapp-parser';
import { processWhatsAppAIMessage } from '@/lib/whatsapp-ai-responder';
import { mergeWithDefaults } from '@/lib/store';
import { uid } from '@/lib/utils';
import { Appointment, Customer, SalonData } from '@/types/salon';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'shree_beauty_webhook_token_2026';

// 1. GET: Webhook Verification with Meta Cloud API
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ WhatsApp Webhook verified successfully!');
    return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }

  return NextResponse.json({ error: 'Verification token mismatch' }, { status: 403 });
}

// 2. POST: Handle Incoming WhatsApp Message & Trigger AI Auto-Responder
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('📩 WhatsApp Webhook received:', JSON.stringify(body, null, 2));

    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0]?.value;
    const statuses = change?.statuses;
    const message = change?.messages?.[0];
    const contact = change?.contacts?.[0];

    // Handle Meta delivery status callbacks (failed, delivered, read, sent)
    if (statuses && Array.isArray(statuses) && statuses.length > 0) {
      const statusItem = statuses[0];
      console.log('📊 WhatsApp message delivery status callback:', JSON.stringify(statusItem));

      if (statusItem.status === 'failed') {
        const err = statusItem.errors?.[0];
        console.error('❌ Meta delivery failure:', err);
        const isPayment =
          err?.code === 131042 ||
          err?.title?.toLowerCase().includes('payment') ||
          err?.message?.toLowerCase().includes('payment');

        if (isPayment) {
          try {
            const stateRes = await fetch(`${SUPABASE_URL}/rest/v1/salon_state?limit=1`, {
              headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
            });
            const rows = await stateRes.json();
            if (rows && rows.length > 0) {
              const salonRow = rows[0];
              const cur = mergeWithDefaults(salonRow.data);
              cur.settings = cur.settings || {};
              cur.settings.whatsappPaymentIssue = {
                code: err?.code || 131042,
                title: err?.title || 'Business eligibility payment issue',
                details:
                  err?.error_data?.details ||
                  'Message failed to send because no payment method is set up for your WhatsApp Business account.',
                href:
                  err?.href ||
                  'https://business.facebook.com/billing_hub/accounts/details/?business_id=2541939702957992&asset_id=3350176545369989&wizard_name=ADD_PM&account_type=whatsapp-business-account',
                timestamp: new Date().toISOString(),
              };
              await fetch(`${SUPABASE_URL}/rest/v1/salon_state?owner_id=eq.${salonRow.owner_id}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${SERVICE_KEY}`,
                  apikey: SERVICE_KEY,
                },
                body: JSON.stringify({ data: cur, updated_at: new Date().toISOString() }),
              });
            }
          } catch (dbErr) {
            console.error('Error saving payment issue to DB:', dbErr);
          }
        }
      } else if (statusItem.status === 'delivered' || statusItem.status === 'sent') {
        // If a message was successfully delivered, clear payment issue if previously set
        try {
          const stateRes = await fetch(`${SUPABASE_URL}/rest/v1/salon_state?limit=1`, {
            headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
          });
          const rows = await stateRes.json();
          if (rows?.[0]?.data?.settings?.whatsappPaymentIssue) {
            const salonRow = rows[0];
            const cur = mergeWithDefaults(salonRow.data);
            delete cur.settings.whatsappPaymentIssue;
            await fetch(`${SUPABASE_URL}/rest/v1/salon_state?owner_id=eq.${salonRow.owner_id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${SERVICE_KEY}`,
                apikey: SERVICE_KEY,
              },
              body: JSON.stringify({ data: cur, updated_at: new Date().toISOString() }),
            });
          }
        } catch {}
      }

      return NextResponse.json({ status: 'status_processed' }, { status: 200 });
    }

    if (!message || message.type !== 'text') {
      return NextResponse.json({ status: 'ignored_or_non_text' }, { status: 200 });
    }

    const messageText = message.text?.body || '';
    const rawMobile = message.from || '';
    const mobile = rawMobile.replace(/^91/, '').slice(-10);
    const customerName = contact?.profile?.name || 'WhatsApp Customer';

    // Fetch existing salon_state from Supabase
    const stateRes = await fetch(`${SUPABASE_URL}/rest/v1/salon_state?limit=1`, {
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
      },
    });

    const rows = await stateRes.json();
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'No salon state found in Supabase' }, { status: 500 });
    }

    const salonRow = rows[0];
    const currentData: SalonData = mergeWithDefaults(salonRow.data);

    // Process WhatsApp AI Auto-Responder & PDF Dispatch
    const originUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    const aiResult = await processWhatsAppAIMessage(messageText, rawMobile, customerName, currentData, originUrl);

    // Track 24-Hour Free Customer Service Window (opened by customer's incoming message)
    const nowISO = new Date().toISOString();
    const activeUntilISO = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const updatedActiveSessions = {
      ...(currentData.whatsappActiveSessions || {}),
      [mobile]: {
        name: customerName,
        activeUntil: activeUntilISO,
        lastMessage: messageText,
        lastMessageAt: nowISO,
      },
    };

    // Auto-register or update customer with 24h window expiration
    let updatedCustomers: Customer[] = [...currentData.customers];
    const existingCustIdx = updatedCustomers.findIndex(
      (c) => (c.mobile && c.mobile.replace(/\D/g, '').slice(-10) === mobile) || (customerName && c.name === customerName)
    );

    if (existingCustIdx >= 0) {
      updatedCustomers[existingCustIdx] = {
        ...updatedCustomers[existingCustIdx],
        whatsappWindowExpiresAt: activeUntilISO,
        lastWhatsAppMessageAt: nowISO,
      };
    } else if (mobile || customerName) {
      updatedCustomers.push({
        id: uid(),
        name: customerName,
        mobile: mobile,
        birthday: '',
        anniversary: '',
        whatsappWindowExpiresAt: activeUntilISO,
        lastWhatsAppMessageAt: nowISO,
        notes: 'Acquired via WhatsApp (24h Free Window Active)',
      });
    }

    // Only create appointment if AI or user explicitly requested a booking
    let updatedAppointments = currentData.appointments;
    let newAppointment: Appointment | null = null;
    if (aiResult.appointmentCreated && aiResult.appointmentData) {
      const parsed = aiResult.appointmentData;
      newAppointment = {
        id: uid(),
        date: parsed.date,
        time: parsed.time,
        customer: parsed.customerName || customerName,
        mobile: mobile,
        service: parsed.service,
        staff: currentData.staff[0]?.name || 'Unassigned',
        advance: 0,
        status: 'Confirmed',
        notes: parsed.notes || `Booked via WhatsApp AI: "${messageText}"`,
      };
      updatedAppointments = [newAppointment, ...currentData.appointments];
    }

    const updatedData: SalonData = {
      ...currentData,
      customers: updatedCustomers,
      appointments: updatedAppointments,
      whatsappActiveSessions: updatedActiveSessions,
    };

    // Save updated state to Supabase
    await fetch(`${SUPABASE_URL}/rest/v1/salon_state?owner_id=eq.${salonRow.owner_id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
      },
      body: JSON.stringify({
        data: updatedData,
        updated_at: new Date().toISOString(),
      }),
    });

    return NextResponse.json({
      success: true,
      is24HourWindowActive: true,
      activeUntil: activeUntilISO,
      appointment: newAppointment,
      aiResponse: aiResult,
      message: 'WhatsApp message processed & 24h free service window activated successfully',
    });
  } catch (error: any) {
    console.error('Error processing WhatsApp webhook:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
