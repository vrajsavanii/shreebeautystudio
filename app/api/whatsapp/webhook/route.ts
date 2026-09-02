// app/api/whatsapp/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { parseWhatsAppBookingMessage } from '@/lib/whatsapp-parser';
import { processWhatsAppAIMessage } from '@/lib/whatsapp-ai-responder';
import { mergeWithDefaults } from '@/lib/store';
import { uid } from '@/lib/utils';
import { Appointment, Customer, SalonData } from '@/types/salon';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://eqwfbcouxozwfwkzqano.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxd2ZiY291eG96d2Z3a3pxYW5vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Nzk4NDYxNiwiZXhwIjoyMTAzNTYwNjE2fQ.fEjqEpPf6PsbkvVoRMZ6zeqxKq1dOdnSTp3UR18DIwg';
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
    const message = change?.messages?.[0];
    const contact = change?.contacts?.[0];

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
    const originUrl = req.nextUrl.origin;
    const aiResult = await processWhatsAppAIMessage(messageText, rawMobile, customerName, currentData, originUrl);

    // Parse booking details
    const parsed = parseWhatsAppBookingMessage(messageText, currentData.services, customerName);

    // Create new appointment
    const newAppointment: Appointment = {
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

    // Auto-register customer if not in customer list
    let updatedCustomers: Customer[] = [...currentData.customers];
    const existingCust = updatedCustomers.find((c) => c.mobile === mobile || c.name === customerName);
    if (!existingCust && (mobile || customerName)) {
      updatedCustomers.push({
        id: uid(),
        name: customerName,
        mobile: mobile,
        birthday: '',
        anniversary: '',
        notes: 'Acquired via WhatsApp Business AI',
      });
    }

    const updatedData: SalonData = {
      ...currentData,
      customers: updatedCustomers,
      appointments: [newAppointment, ...currentData.appointments],
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
      appointment: newAppointment,
      aiResponse: aiResult,
      message: 'WhatsApp AI auto-response processed successfully',
    });
  } catch (error: any) {
    console.error('Error processing WhatsApp webhook:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
