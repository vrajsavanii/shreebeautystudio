// app/api/public-invoice/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const no = searchParams.get('no');
  const id = searchParams.get('id');

  if (!no && !id) {
    return NextResponse.json(
      { success: false, error: 'Invoice number or ID is required' },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database connection unavailable' },
        { status: 500 }
      );
    }

    const { data: rows, error } = await supabase
      .from('salon_state')
      .select('data')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error || !rows?.[0]?.data) {
      return NextResponse.json(
        { success: false, error: 'Invoice data not found' },
        { status: 404 }
      );
    }

    const salonData = rows[0].data;
    const invoices = salonData.invoices || [];
    const inv = invoices.find(
      (i: any) =>
        (no && (i.no === no || i.no === `INV-${no}`)) ||
        (id && i.id === id)
    );

    if (!inv) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Sanitize settings to prevent credential exposure
    const settings = {
      salon: salonData.settings?.salon || 'Shree Beauty Studio',
      address:
        salonData.settings?.address ||
        '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004',
      whatsapp: salonData.settings?.whatsapp || '919773240010',
      open: salonData.settings?.open || '10:00 AM',
      close: salonData.settings?.close || '08:00 PM',
      printer: salonData.settings?.printer || 'both',
    };

    return NextResponse.json({
      success: true,
      invoice: inv,
      settings,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error' },
      { status: 500 }
    );
  }
}
