// app/api/whatsapp/chat-actions/route.ts
// Updates chat status (pin, archive, mute)

import { NextRequest, NextResponse } from 'next/server';
import { whatsappService } from '@/lib/whatsapp-baileys-service';

export const dynamic = 'force-dynamic';

const WA_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jid, action, value } = body;

    if (!jid || !action) {
      return NextResponse.json({ success: false, error: 'jid and action are required' }, { status: 400 });
    }

    try {
      const res = await fetch(`${WA_SERVICE_URL}/chat-actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jid, action, value }),
      });
      if (res.ok) {
        const json = await res.json();
        return NextResponse.json(json);
      }
    } catch {
      // Fallback
    }

    const result = await whatsappService.chatAction({ jid, action, value });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Error updating chat actions' },
      { status: 500 }
    );
  }
}
