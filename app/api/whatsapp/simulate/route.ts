// app/api/whatsapp/simulate/route.ts
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    success: false,
    message: 'Booking simulation is disabled. Real bookings are accepted via appointments and Meta WhatsApp webhook.',
  });
}

export async function GET() {
  return NextResponse.json({
    status: 'disabled',
    message: 'Booking simulation is disabled.',
  });
}

