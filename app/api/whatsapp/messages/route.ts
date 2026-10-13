// app/api/whatsapp/messages/route.ts
// Proxies to local Baileys WhatsApp service for message history

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const WA_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const jid = url.searchParams.get('jid') || '';
    const res = await fetch(`${WA_SERVICE_URL}/messages?jid=${encodeURIComponent(jid)}`, {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Service returned HTTP ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      messages: [],
      error: err?.message || 'Failed to fetch messages from WhatsApp service',
    });
  }
}
