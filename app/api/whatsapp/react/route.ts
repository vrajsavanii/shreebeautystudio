// app/api/whatsapp/react/route.ts
// Sends or removes an emoji reaction to a WhatsApp message

import { NextRequest, NextResponse } from 'next/server';
import { whatsappService } from '@/lib/whatsapp-baileys-service';

export const dynamic = 'force-dynamic';

const WA_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jid, id, emoji, fromMe } = body;

    if (!jid || !id) {
      return NextResponse.json({ success: false, error: 'jid and id are required' }, { status: 400 });
    }

    // 1. Try external Baileys service first
    try {
      const res = await fetch(`${WA_SERVICE_URL}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jid, id, emoji, fromMe }),
      });
      if (res.ok) {
        const json = await res.json();
        return NextResponse.json(json);
      }
    } catch {
      // Fallback
    }

    // 2. In-process fallback
    const result = await whatsappService.sendReaction({ jid, id, emoji, fromMe });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Error reacting to WhatsApp message' },
      { status: 500 }
    );
  }
}
