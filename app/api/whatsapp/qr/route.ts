// app/api/whatsapp/qr/route.ts
// Proxies to local Baileys WhatsApp service for live QR code

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const WA_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001';

export async function GET(req: NextRequest) {
  try {
    const res = await fetch(`${WA_SERVICE_URL}/qr`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Service returned HTTP ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      status: 'disconnected',
      connected: false,
      qr: null,
      qrDataUrl: null,
      error: 'WhatsApp backend service not connected.',
    });
  }
}
