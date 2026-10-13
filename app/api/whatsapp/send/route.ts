// app/api/whatsapp/send/route.ts
// Proxies sending messages to local Baileys WhatsApp service

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const WA_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${WA_SERVICE_URL}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: data?.error || 'Failed to send message.' },
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error sending WhatsApp message.' },
      { status: 500 }
    );
  }
}
