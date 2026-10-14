// app/api/whatsapp/messages/route.ts
// Proxies to local Baileys WhatsApp service for message history with in-process fallback

import { NextRequest, NextResponse } from 'next/server';
import { whatsappStore } from '@/lib/whatsapp-backend-store';

export const dynamic = 'force-dynamic';

const WA_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const jid = url.searchParams.get('jid') || '';

  try {
    const res = await fetch(`${WA_SERVICE_URL}/messages?jid=${encodeURIComponent(jid)}`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {
    // Fallback to in-process store below
  }

  try {
    const msgs = whatsappStore.getMessages(jid);
    return NextResponse.json({
      success: true,
      jid,
      messages: msgs,
      total: msgs.length,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      messages: [],
      error: err?.message || 'Failed to fetch messages',
    });
  }
}
