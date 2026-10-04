import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { DEFAULT_DATA } from '@/lib/store';
import { SalonData } from '@/types/salon';

export const dynamic = 'force-dynamic';

const DEFAULT_ACCOUNT_ID = '17841408494357129';
const DEFAULT_TOKEN = 'EAAPI3xAR034BSnTH6MZBmQfFzkvdhBgjdUUspaC7u5XNMmc05ZCR7yoMvaXhk40IYl39MpIwgTROMaNQYbu2syGQQ5rvHUdj0SuttbB1FHIobn51XAxRRFgvABs8mPhorFhMS1rYW4u6pkTRzew4r0A3yGZBZB80e1AAPZCs7f6ijUAE958zOmcRvqourBgZDZD';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  try {
    const reqContentType = req.headers.get('content-type') || '';
    let mediaUrl = '';
    let mediaType: 'photo' | 'reel' = 'photo';
    let caption = '';

    if (reqContentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      caption = (formData.get('caption') as string) || '';
      mediaType = (formData.get('mediaType') as string) === 'reel' ? 'reel' : 'photo';
      const file = formData.get('file') as File | null;

      if (file && file.size > 0) {
        const supabase = getSupabaseAdmin();
        const ext = file.name.split('.').pop() || (mediaType === 'reel' ? 'mp4' : 'jpg');
        const fileName = `ig_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
        const buffer = Buffer.from(await file.arrayBuffer());

        const fileMime = file.type || (mediaType === 'reel' ? 'video/mp4' : 'image/jpeg');

        const { error: uploadErr } = await supabase.storage
          .from('salon_media')
          .upload(fileName, buffer, {
            contentType: fileMime,
            upsert: true,
          });

        if (uploadErr) {
          return NextResponse.json(
            { success: false, error: `Media Storage Error: ${uploadErr.message}` },
            { status: 500 }
          );
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://eqwfbcouxozwfwkzqano.supabase.co';
        mediaUrl = `${supabaseUrl}/storage/v1/object/public/salon_media/${fileName}`;
      } else {
        mediaUrl = (formData.get('mediaUrl') as string) || '';
      }
    } else {
      const json = await req.json();
      caption = json.caption || '';
      mediaType = json.mediaType === 'reel' ? 'reel' : 'photo';
      mediaUrl = json.mediaUrl || '';
    }

    if (!mediaUrl) {
      return NextResponse.json(
        { success: false, error: 'Please select a photo or video file from your device first!' },
        { status: 400 }
      );
    }

    // Fetch latest token & account ID
    let settings = DEFAULT_DATA.settings;
    try {
      const supabase = getSupabaseAdmin();
      const { data: rows } = await supabase
        .from('salon_state')
        .select('data')
        .order('updated_at', { ascending: false })
        .limit(1);

      if (rows && rows.length > 0 && rows[0]?.data?.settings) {
        settings = (rows[0].data as SalonData).settings;
      }
    } catch {}

    const accountId = settings?.instagramAccountId?.trim() || DEFAULT_ACCOUNT_ID;
    const token = settings?.instagramAccessToken?.trim() || DEFAULT_TOKEN;

    // ── STEP 1: Create Container on Meta Graph API ──
    const containerEndpoint = `https://graph.facebook.com/v19.0/${accountId}/media`;
    const containerParams: Record<string, string> = {
      access_token: token,
      caption: caption,
    };

    if (mediaType === 'reel') {
      containerParams.media_type = 'REELS';
      containerParams.video_url = mediaUrl;
      containerParams.share_to_feed = 'true';
    } else {
      containerParams.image_url = mediaUrl;
    }

    const createRes = await fetch(containerEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(containerParams).toString(),
    });

    const createData = await createRes.json();

    if (!createRes.ok || !createData.id) {
      const errMsg = createData?.error?.message || 'Meta API container creation failed';
      return NextResponse.json(
        {
          success: false,
          error: `Instagram Publishing Failed: ${errMsg}`,
          details: createData,
        },
        { status: 400 }
      );
    }

    const creationId = createData.id;

    // ── STEP 2: If Video/Reel, poll status until FINISHED ──
    if (mediaType === 'reel') {
      let isReady = false;
      let attempts = 0;
      const maxAttempts = 15; // 15 * 2s = 30s max wait

      while (!isReady && attempts < maxAttempts) {
        await sleep(2000);
        attempts++;

        const statusRes = await fetch(
          `https://graph.facebook.com/v19.0/${creationId}?fields=status_code,status&access_token=${token}`
        );
        const statusData = await statusRes.json().catch(() => ({}));

        if (statusData.status_code === 'FINISHED') {
          isReady = true;
          break;
        } else if (statusData.status_code === 'ERROR') {
          return NextResponse.json(
            {
              success: false,
              error: `Video processing error on Instagram: ${statusData.status || 'Format invalid'}`,
            },
            { status: 400 }
          );
        }
      }
    }

    // ── STEP 3: Publish Container to Instagram ──
    const publishEndpoint = `https://graph.facebook.com/v19.0/${accountId}/media_publish`;
    const publishRes = await fetch(publishEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        creation_id: creationId,
        access_token: token,
      }).toString(),
    });

    const publishData = await publishRes.json();

    if (!publishRes.ok || !publishData.id) {
      const errMsg = publishData?.error?.message || 'Failed to publish container';
      return NextResponse.json(
        {
          success: false,
          error: `Instagram Publish Error: ${errMsg}`,
          details: publishData,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      published: true,
      postId: publishData.id,
      message: `🎉 Post successfully published live to Instagram @shreebeauty.studio! (Post ID: ${publishData.id})`,
      permalink: `https://www.instagram.com/shreebeauty.studio/`,
      mediaUrl,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error during Instagram publish' },
      { status: 500 }
    );
  }
}
