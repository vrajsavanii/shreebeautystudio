// app/api/whatsapp/delete-chat/route.ts
// Deletes an entire conversation

import { NextRequest, NextResponse } from 'next/server';
import { whatsappService } from '@/lib/whatsapp-baileys-service';

export const dynamic = 'force-dynamic';

const WA_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jid } = body;

    if (!jid) {
      return NextResponse.json({ success: false, error: 'jid is required' }, { status: 400 });
    }

    try {
      const res = await fetch(`${WA_SERVICE_URL}/delete-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jid }),
      });
      if (res.ok) {
        const json = await res.json();
        return NextResponse.json(json);
      }
    } catch {
      // Fallback
    }

    const result = await whatsappService.deleteChat(jid);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Error deleting chat' },
      { status: 500 }
    );
  }
}
