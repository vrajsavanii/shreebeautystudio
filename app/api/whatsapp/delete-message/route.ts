// app/api/whatsapp/delete-message/route.ts
// Deletes a message ("Delete for me" or "Delete for everyone" revocation)

import { NextRequest, NextResponse } from 'next/server';
import { whatsappService } from '@/lib/whatsapp-baileys-service';
import { whatsappStore } from '@/lib/whatsapp-backend-store';

export const dynamic = 'force-dynamic';

const WA_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jid, id, forEveryone } = body;

    if (!jid || !id) {
      return NextResponse.json({ success: false, error: 'jid and id are required' }, { status: 400 });
    }

    // 1. Try external Baileys service first
    try {
      const res = await fetch(`${WA_SERVICE_URL}/delete-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jid, id, forEveryone }),
      });
      if (res.ok) {
        const json = await res.json();
        return NextResponse.json(json);
      }
    } catch {
      // Fallback to in-process service
    }

    // 2. In-process fallback
    const result = await whatsappService.deleteMessage({ jid, id, forEveryone });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Error deleting WhatsApp message' },
      { status: 500 }
    );
  }
}
