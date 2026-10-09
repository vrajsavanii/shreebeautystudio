// app/api/tv-frame/control/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'current'; // 'next' | 'previous' | 'current' | 'data'
    const tvUrlRaw = searchParams.get('url') || 'http://192.168.1.81:9095';
    const tvUrl = tvUrlRaw.replace(/\/+$/, '');

    let endpoint = `${tvUrl}/api/current`;
    if (action === 'next') endpoint = `${tvUrl}/api/next`;
    else if (action === 'previous' || action === 'prev') endpoint = `${tvUrl}/api/previous`;
    else if (action === 'data') endpoint = `${tvUrl}/api/data`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    try {
      const res = await fetch(endpoint, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      let data: any = null;
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = { rawResponse: text };
      }

      return NextResponse.json({
        success: res.ok || res.status === 200,
        action,
        tvUrl,
        statusCode: res.status,
        data,
      });
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      return NextResponse.json({
        success: false,
        action,
        tvUrl,
        offline: true,
        message: `Could not reach 4kFrame TV at ${endpoint}: ${fetchErr.message}`,
      });
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
