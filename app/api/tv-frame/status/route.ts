// app/api/tv-frame/status/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tvUrlRaw = searchParams.get('url') || 'http://192.168.1.81:9095';
    const tvUrl = tvUrlRaw.replace(/\/+$/, '');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    try {
      const res = await fetch(`${tvUrl}/admin/`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      return NextResponse.json({
        online: res.ok || res.status === 200 || res.status === 302,
        statusCode: res.status,
        tvUrl,
        adminUrl: `${tvUrl}/admin/`,
      });
    } catch {
      clearTimeout(timeoutId);
      return NextResponse.json({
        online: false,
        tvUrl,
        adminUrl: `${tvUrl}/admin/`,
      });
    }
  } catch (err: any) {
    return NextResponse.json({
      online: false,
      error: err.message,
    });
  }
}
