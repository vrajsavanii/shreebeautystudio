// app/api/booking/services/route.ts
// Public endpoint — returns services, categories, and basic salon info for customer pages
import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const revalidate = 0; // no cache

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
      return NextResponse.json({ error: 'Failed to fetch salon data' }, { status: 500 });
    }

    const rows = await res.json();
    if (!rows?.length || !rows[0]?.data) {
      return NextResponse.json({ services: [], categories: [], settings: {} });
    }

    const data = rows[0].data;
    const services = (data.services || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      price: s.price,
      duration: s.duration || 45,
      category: s.category || 'General',
      description: s.description || '',
    }));

    const categories = Array.from(new Set(services.map((s: any) => s.category))).filter(Boolean) as string[];

    const settings = {
      salon: data.settings?.salon || 'Shree Beauty Studio',
      address: data.settings?.address || '',
      open: data.settings?.open || '10:00',
      close: data.settings?.close || '19:00',
      whatsapp: data.settings?.whatsapp || '',
    };

    // Bridal packages (public)
    const bridalPackages = (data.bridalPackages || []).map((p: any) => ({
      id: p.id,
      type: p.type,
      name: p.name,
      price: p.price,
      sessions: p.sessions,
      includes: p.includes,
    }));

    // Membership plans (public)
    const memberships = (data.memberships || []).map((m: any) => ({
      id: m.id,
      name: m.name,
      price: m.price,
      validityDays: m.validityDays,
      discountPercent: m.discountPercent,
      perks: m.perks || '',
      color: m.color || '#6b7880',
    }));

    return NextResponse.json({
      services,
      categories,
      settings,
      bridalPackages,
      memberships,
    });
  } catch (err: any) {
    console.error('[Booking Services API]', err?.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
