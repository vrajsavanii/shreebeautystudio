// app/api/whatsapp/events/route.ts
// Streams Server-Sent Events from local Baileys service to the admin panel

import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const WA_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001';

export async function GET(req: NextRequest) {
  try {
    const upstreamRes = await fetch(`${WA_SERVICE_URL}/events`, {
      headers: { Accept: 'text/event-stream' },
      cache: 'no-store',
    });

    if (!upstreamRes.ok || !upstreamRes.body) {
      return new Response('WhatsApp service unavailable', { status: 503 });
    }

    return new Response(upstreamRes.body as any, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    return new Response('WhatsApp service connection error', { status: 502 });
  }
}
