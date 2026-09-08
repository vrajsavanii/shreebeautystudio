// app/api/booking/staff/route.ts
// Public endpoint — returns staff data safe for customer display (no salary/commission/mobile)
import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const revalidate = 0;

export async function GET() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/salon_state?select=data&limit=1`, {
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch staff data' }, { status: 500 });
    }

    const rows = await res.json();
    if (!rows?.length || !rows[0]?.data) {
      return NextResponse.json({ staff: [] });
    }

    const data = rows[0].data;
    // Only expose public-safe fields
    const staff = (data.staff || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      role: s.role || 'Beautician',
      services: s.services || '', // comma-separated service categories
    }));

    return NextResponse.json({ staff });
  } catch (err: any) {
    console.error('[Booking Staff API]', err?.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
