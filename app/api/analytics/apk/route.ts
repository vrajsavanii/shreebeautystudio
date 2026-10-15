// app/api/analytics/apk/route.ts
// Ingests APK download clicks, first-time app installs, and active user sessions.
// Returns comprehensive mobile app analytics to the Admin Dashboard.

import { NextRequest, NextResponse } from 'next/server';
import { apkAnalyticsStore } from '@/lib/apk-analytics-store';

export const dynamic = 'force-dynamic';

function parseUserAgent(ua: string) {
  let os = 'Unknown OS';
  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  let deviceModel = 'Web Browser';

  if (/Android/i.test(ua)) {
    os = 'Android';
    deviceType = /Mobile/i.test(ua) ? 'mobile' : 'tablet';

    // Extract device model like "SM-G998B", "Vivo V2140", "CPH2211"
    const androidMatch = ua.match(/Android\s+([0-9.]+);?\s*([^;)]+)?/i);
    if (androidMatch) {
      const ver = androidMatch[1];
      const model = (androidMatch[2] || '').trim();
      os = `Android ${ver}`;
      if (model && !/Build|wv|Version/i.test(model)) {
        deviceModel = model.replace(/Build\/.*/i, '').trim();
      } else {
        deviceModel = 'Android Phone';
      }
    }
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    os = 'iOS';
    deviceType = /iPad/i.test(ua) ? 'tablet' : 'mobile';
    deviceModel = /iPad/i.test(ua) ? 'Apple iPad' : 'Apple iPhone';
  } else if (/Windows/i.test(ua)) {
    os = 'Windows PC';
    deviceType = 'desktop';
    deviceModel = 'Windows Desktop';
  } else if (/Macintosh/i.test(ua)) {
    os = 'macOS';
    deviceType = 'desktop';
    deviceModel = 'Mac';
  }

  // Refine known Indian phone brands commonly used in Surat
  if (/SM-[A-Z0-9]+/i.test(ua) || /Samsung/i.test(ua)) {
    deviceModel = 'Samsung Galaxy';
  } else if (/V2[0-9]{3}|vivo/i.test(ua)) {
    deviceModel = 'Vivo Phone';
  } else if (/CPH[0-9]{4}|oppo/i.test(ua)) {
    deviceModel = 'Oppo Phone';
  } else if (/Redmi|POCO|M2[0-9]{3}|Xiaomi/i.test(ua)) {
    deviceModel = 'Xiaomi / Redmi';
  } else if (/OnePlus|NE2211|GM1901/i.test(ua)) {
    deviceModel = 'OnePlus';
  } else if (/Realme|RMX[0-9]{4}/i.test(ua)) {
    deviceModel = 'Realme Phone';
  }

  return { os, deviceType, deviceModel };
}

export async function GET(req: NextRequest) {
  try {
    // Optionally trigger a cloud pull for freshness
    await apkAnalyticsStore.pullFromCloud();
    const summary = apkAnalyticsStore.getSummary();

    return NextResponse.json({
      success: true,
      data: summary,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[API /analytics/apk GET] Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { type, payload } = body;

    const ua = req.headers.get('user-agent') || '';
    const forwarded = req.headers.get('x-forwarded-for') || '';
    const realIp = req.headers.get('x-real-ip') || '';
    const clientIp = forwarded.split(',')[0].trim() || realIp || '127.0.0.1';
    const referrer = req.headers.get('referer') || '';

    const { os, deviceType, deviceModel } = parseUserAgent(ua);

    if (type === 'download') {
      const appType = payload?.appType === 'admin' ? 'admin' : 'customer';
      const event = apkAnalyticsStore.recordDownload({
        appType,
        ip: clientIp,
        userAgent: ua,
        deviceType,
        os,
        deviceModel,
        city: 'Surat, Gujarat',
        referrer,
      });
      return NextResponse.json({ success: true, eventId: event.id });
    }

    if (type === 'install' || type === 'open' || type === 'heartbeat') {
      const installationId = payload?.installationId || 'unknown_inst';
      const appType = payload?.appType === 'admin' ? 'admin' : 'customer';
      const event = apkAnalyticsStore.recordSession({
        installationId,
        appType,
        event: type,
        deviceModel: payload?.deviceModel || deviceModel,
        osVersion: payload?.osVersion || os,
        screenResolution: payload?.screenResolution || '',
        ip: clientIp,
      });
      return NextResponse.json({ success: true, eventId: event.id });
    }

    if (type === 'booking') {
      const event = apkAnalyticsStore.recordBooking({
        installationId: payload?.installationId,
        customerName: payload?.customerName,
        service: payload?.service,
        amount: Number(payload?.amount || 0),
      });
      return NextResponse.json({ success: true, eventId: event.id });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid event type. Supported: download, install, open, booking' },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('[API /analytics/apk POST] Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to record event' },
      { status: 500 }
    );
  }
}
