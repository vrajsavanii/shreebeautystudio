// app/api/cloud/sync/route.ts
// Direct Supabase Cloud Sync via Service Role Key
// Completely eliminates the need for user login / 'Sign In for Cloud'

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://eqwfbcouxozwfwkzqano.supabase.co';
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxd2ZiY291eG96d2Z3a3pxYW5vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Nzk4NDYxNiwiZXhwIjoyMTAzNTYwNjE2fQ.fEjqEpPf6PsbkvVoRMZ6zeqxKq1dOdnSTp3UR18DIwg';

export async function GET() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/salon_state?select=id,data,updated_at&limit=1`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[Cloud Sync GET] Supabase error:', errText);
      return NextResponse.json({ success: false, error: errText }, { status: res.status });
    }

    const rows = await res.json();
    if (Array.isArray(rows) && rows.length > 0) {
      return NextResponse.json({
        success: true,
        id: rows[0].id,
        data: rows[0].data,
        updated_at: rows[0].updated_at,
      });
    }

    return NextResponse.json({ success: true, data: null, message: 'No cloud state yet' });
  } catch (err: any) {
    console.error('[Cloud Sync GET] Exception:', err?.message || err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { data } = body;

    if (!data) {
      return NextResponse.json({ success: false, error: 'No data provided to save' }, { status: 400 });
    }

    // Clean out obsolete fake staff (st1/st2) and fake product data if sent by cached sessions
    if (Array.isArray(data.staff)) {
      data.staff = data.staff.filter((s: any) => s.id !== 'st1' && s.id !== 'st2');
    }
    if (Array.isArray(data.inventory)) {
      data.inventory = data.inventory.filter((i: any) =>
        i.id !== 'p1' && i.id !== 'p2' && i.id !== 'p3' && !String(i.barcode || '').startsWith('843')
      );
    }

    const stamp = new Date().toISOString();

    // 1. Check if row exists to update
    const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/salon_state?select=id&limit=1`, {
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
      },
      cache: 'no-store',
    });

    const checkRows = await checkRes.json();
    let rowId: string | null = null;

    if (Array.isArray(checkRows) && checkRows.length > 0) {
      rowId = checkRows[0].id;
    }

    let saveRes;
    if (rowId) {
      // Update existing row
      saveRes = await fetch(`${SUPABASE_URL}/rest/v1/salon_state?id=eq.${rowId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          data,
          updated_at: stamp,
        }),
      });
    } else {
      // Insert new row
      saveRes = await fetch(`${SUPABASE_URL}/rest/v1/salon_state`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          data,
          updated_at: stamp,
        }),
      });
    }

    if (!saveRes.ok) {
      const errText = await saveRes.text();
      console.error('[Cloud Sync POST] Supabase save error:', errText);
      return NextResponse.json({ success: false, error: errText }, { status: saveRes.status });
    }

    const savedJson = await saveRes.json();
    return NextResponse.json({
      success: true,
      updated_at: stamp,
      saved: savedJson,
    });
  } catch (err: any) {
    console.error('[Cloud Sync POST] Exception:', err?.message || err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
