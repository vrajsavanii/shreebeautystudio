// app/api/whatsapp/events/route.ts
// Streams Server-Sent Events from local Baileys service or in-process singleton to the admin panel

import { NextRequest } from 'next/server';
import { whatsappService } from '@/lib/whatsapp-baileys-service';

export const dynamic = 'force-dynamic';

const WA_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001';

export async function GET(req: NextRequest) {
  // 1. Try upstream standalone service first
  try {
    const upstreamRes = await fetch(`${WA_SERVICE_URL}/events`, {
      headers: { Accept: 'text/event-stream' },
      cache: 'no-store',
    });

    if (upstreamRes.ok && upstreamRes.body) {
      return new Response(upstreamRes.body as any, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      });
    }
  } catch {
    // Fall through to in-process service
  }

  // 2. In-process SSE stream fallback
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // Initial connection events
  writer.write(encoder.encode(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`));
  writer.write(encoder.encode(`event: status\ndata: ${JSON.stringify(whatsappService.getStatus())}\n\n`));

  // Subscribe to in-process service events
  const unsubscribe = whatsappService.subscribe((event) => {
    try {
      const payload = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
      writer.write(encoder.encode(payload));
    } catch {
      unsubscribe();
    }
  });

  req.signal.addEventListener('abort', () => {
    unsubscribe();
    try {
      writer.close();
    } catch {}
  });

  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
