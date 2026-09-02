// app/api/whatsapp/simulate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { parseWhatsAppBookingMessage } from '@/lib/whatsapp-parser';
import { processWhatsAppAIMessage } from '@/lib/whatsapp-ai-responder';
import { mergeWithDefaults } from '@/lib/store';
import { uid } from '@/lib/utils';
import { Appointment, Customer, SalonData } from '@/types/salon';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://eqwfbcouxozwfwkzqano.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxd2ZiY291eG96d2Z3a3pxYW5vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Nzk4NDYxNiwiZXhwIjoyMTAzNTYwNjE2fQ.fEjqEpPf6PsbkvVoRMZ6zeqxKq1dOdnSTp3UR18DIwg';

export async function POST(req: NextRequest) {
  try {
    const { customerName = 'Priyanka Sharma', mobile = '9825123456', messageText = 'Hi, please book Haircut and Facial tomorrow at 4pm' } = await req.json();

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

    // Process WhatsApp AI Auto-Responder Engine
    const originUrl = req.nextUrl.origin;
    const aiResult = await processWhatsAppAIMessage(messageText, mobile, customerName, currentData, originUrl);

    // Parse the booking details from message text
    const parsed = parseWhatsAppBookingMessage(messageText, currentData.services, customerName);

    // Create new appointment
    const newAppointment: Appointment = {
      id: uid(),
      date: parsed.date,
      time: parsed.time,
      customer: customerName,
      mobile: mobile,
      service: parsed.service,
      staff: currentData.staff[0]?.name || 'Unassigned',
      advance: 0,
      status: 'Confirmed',
      notes: `Simulated WhatsApp AI Booking: "${messageText}"`,
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
        notes: 'Acquired via WhatsApp Business (Simulated AI)',
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
      message: 'Simulated WhatsApp AI Auto-Responder processed successfully!',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Simulation error' }, { status: 500 });
  }
}
