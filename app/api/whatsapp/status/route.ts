// app/api/whatsapp/status/route.ts
// Proxies to local Baileys WhatsApp service

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const WA_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001';

export async function GET(req: NextRequest) {
  try {
    const res = await fetch(`${WA_SERVICE_URL}/status`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Service returned HTTP ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      status: 'disconnected',
      connected: false,
      phone: '',
      name: '',
      qr: null,
      qrDataUrl: null,
      error: 'WhatsApp service not running. Start with node scripts/whatsapp-service.mjs',
    });
  }
}
