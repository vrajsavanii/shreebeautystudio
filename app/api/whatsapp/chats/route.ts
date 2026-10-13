// app/api/whatsapp/chats/route.ts
// Proxies to local Baileys WhatsApp service for chat list

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const WA_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001';

export async function GET(req: NextRequest) {
  try {
    const res = await fetch(`${WA_SERVICE_URL}/chats`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Service returned HTTP ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      chats: [],
      error: err?.message || 'Failed to fetch chats from WhatsApp service',
    });
  }
}
