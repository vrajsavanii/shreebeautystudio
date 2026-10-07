import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { fileName, contentType } = await req.json();

    const ext = fileName?.split('.').pop() || (contentType?.startsWith('video/') ? 'mp4' : 'jpg');
    const safeName = `ig_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage.from('salon_media').createSignedUploadUrl(safeName);

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { success: false, error: error?.message || 'Failed to create signed upload URL' },
        { status: 500 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://eqwfbcouxozwfwkzqano.supabase.co';
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/salon_media/${safeName}`;

    return NextResponse.json({
      success: true,
      signedUrl: data.signedUrl,
      publicUrl,
      fileName: safeName,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Error generating upload URL' },
      { status: 500 }
    );
  }
}
