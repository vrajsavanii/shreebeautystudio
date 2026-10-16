// app/api/whatsapp/send/route.ts
// Proxies sending messages to local Baileys WhatsApp service with in-process fallback

import { NextRequest, NextResponse } from 'next/server';
import { whatsappService } from '@/lib/whatsapp-baileys-service';

export const dynamic = 'force-dynamic';

const WA_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://127.0.0.1:3001';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    try {
      const res = await fetch(`${WA_SERVICE_URL}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch {
      // Standalone service not running - fallback to in-process service
    }

    const result = await whatsappService.sendMessage(body);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Failed to send' }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error sending WhatsApp message.' },
      { status: 500 }
    );
  }
}
