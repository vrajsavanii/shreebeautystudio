// app/api/whatsapp/chats/route.ts
// Proxies to local Baileys WhatsApp service for chat list with in-process fallback

import { NextRequest, NextResponse } from 'next/server';
import { whatsappStore } from '@/lib/whatsapp-backend-store';

export const dynamic = 'force-dynamic';

const WA_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001';

export async function GET(req: NextRequest) {
  try {
    const res = await fetch(`${WA_SERVICE_URL}/chats`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {
    // Fallback to in-process store below
  }

  try {
    const chatsList = whatsappStore.getChats();
    return NextResponse.json({
      success: true,
      chats: chatsList,
      total: chatsList.length,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      chats: [],
      error: err?.message || 'Failed to fetch chats',
    });
  }
}
