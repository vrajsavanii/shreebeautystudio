// app/api/whatsapp/reconnect/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const WA_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001';

export async function POST(req: NextRequest) {
  try {
    const res = await fetch(`${WA_SERVICE_URL}/reconnect`, { method: 'POST' });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to reconnect WhatsApp.' },
      { status: 500 }
    );
  }
}
