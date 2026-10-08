import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const audioUrl = searchParams.get('url');

    if (!audioUrl) {
      return new NextResponse('Missing url parameter', { status: 400 });
    }

    const res = await fetch(audioUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ShreeBeautyStudio/1.0)',
      },
    });

    if (!res.ok) {
      return new NextResponse(`Failed to fetch audio stream (HTTP ${res.status})`, { status: 502 });
    }

    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || 'audio/mp4';

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(buffer.byteLength),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err: any) {
    return new NextResponse(`Audio Proxy Error: ${err.message}`, { status: 500 });
  }
}
