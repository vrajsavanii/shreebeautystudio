// app/api/public-data/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { DEFAULT_DATA, DEFAULT_BRIDAL_PACKAGES } from '@/lib/store';
import { SalonData } from '@/types/salon';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data: rows, error } = await supabase
      .from('salon_state')
      .select('data, updated_at')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error || !rows || rows.length === 0 || !rows[0].data) {
      return NextResponse.json({
        success: true,
        source: 'default',
        settings: DEFAULT_DATA.settings,
        services: DEFAULT_DATA.services,
        bridalPackages: DEFAULT_BRIDAL_PACKAGES,
      });
    }

    const cloudData = rows[0].data as SalonData;

    return NextResponse.json({
      success: true,
      source: 'cloud',
      updatedAt: rows[0].updated_at,
      settings: cloudData.settings || DEFAULT_DATA.settings,
      services: cloudData.services && cloudData.services.length > 0 ? cloudData.services : DEFAULT_DATA.services,
      bridalPackages: cloudData.bridalPackages && cloudData.bridalPackages.length > 0 ? cloudData.bridalPackages : DEFAULT_BRIDAL_PACKAGES,
      staff: cloudData.staff && cloudData.staff.length > 0 ? cloudData.staff : DEFAULT_DATA.staff,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Failed to fetch public data',
        settings: DEFAULT_DATA.settings,
        services: DEFAULT_DATA.services,
        bridalPackages: DEFAULT_BRIDAL_PACKAGES,
      },
      { status: 500 }
    );
  }
}
