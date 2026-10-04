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
    let mediaUrls: string[] = [];
    let mediaType: 'photo' | 'reel' | 'carousel' = 'photo';
    let caption = '';
    let location = '';
    let collaborator = '';

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://eqwfbcouxozwfwkzqano.supabase.co';

    if (reqContentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      caption = (formData.get('caption') as string) || '';
      location = (formData.get('location') as string) || '';
      collaborator = (formData.get('collaborator') as string) || '';
      mediaType = (formData.get('mediaType') as any) || 'photo';

      const files = formData.getAll('files') as File[];
      const singleFile = formData.get('file') as File | null;

      const uploadList: File[] = [];
      if (files && files.length > 0 && files[0].size > 0) {
        uploadList.push(...files.filter((f) => f.size > 0));
      } else if (singleFile && singleFile.size > 0) {
        uploadList.push(singleFile);
      }

      if (uploadList.length > 1) {
        mediaType = 'carousel';
      }

      if (uploadList.length > 0) {
        const supabase = getSupabaseAdmin();

        for (const file of uploadList) {
          const isVid = file.type.startsWith('video/');
          const ext = file.name.split('.').pop() || (isVid ? 'mp4' : 'jpg');
          const fileName = `ig_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
          const buffer = Buffer.from(await file.arrayBuffer());

          const fileMime = file.type || (isVid ? 'video/mp4' : 'image/jpeg');

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

          mediaUrls.push(`${supabaseUrl}/storage/v1/object/public/salon_media/${fileName}`);
        }
      } else {
        const rawUrl = (formData.get('mediaUrl') as string) || '';
        if (rawUrl) mediaUrls.push(rawUrl);
      }
    } else {
      const json = await req.json();
      caption = json.caption || '';
      mediaType = json.mediaType || 'photo';
      if (Array.isArray(json.mediaUrls)) {
        mediaUrls = json.mediaUrls;
      } else if (json.mediaUrl) {
        mediaUrls = [json.mediaUrl];
      }
      if (mediaUrls.length > 1) {
        mediaType = 'carousel';
      }
    }

    if (mediaUrls.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Please select photo(s) or video to publish to Instagram!' },
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

    let creationId = '';

    const LOCATION_PAGE_IDS: Record<string, string> = {
      'Katargam, Surat': '108873722476595',
      'Shree Beauty Studio': '108873722476595',
      'Shree Beauty Studio, Katargam': '108873722476595',
      'Surat, Gujarat': '106720849363574',
      'Mota Varachha, Surat': '106720849363574',
      'Varachha, Surat': '106720849363574',
      'Adajan, Surat': '106720849363574',
      'Vesu, Surat': '106720849363574',
      'VIP Road, Surat': '106720849363574',
      'Ghod Dod Road, Surat': '106720849363574',
      'Surat': '106720849363574',
    };
    const matchedLocId = location.trim() ? (LOCATION_PAGE_IDS[location.trim()] || '108873722476595') : undefined;

    const cleanUser = collaborator ? collaborator.replace(/^@/, '').trim() : '';

    // ── CASE 1: MULTI-PHOTO CAROUSEL ──
    if (mediaType === 'carousel' || mediaUrls.length > 1) {
      const childContainerIds: string[] = [];

      for (const itemUrl of mediaUrls) {
        const isVid = itemUrl.includes('.mp4') || itemUrl.includes('.mov');
        const childParams: Record<string, string> = {
          access_token: token,
          is_carousel_item: 'true',
        };

        if (isVid) {
          childParams.media_type = 'VIDEO';
          childParams.video_url = itemUrl;
        } else {
          childParams.image_url = itemUrl;
          if (cleanUser) {
            childParams.user_tags = JSON.stringify([{ username: cleanUser, x: 0.5, y: 0.5 }]);
          }
        }

        const childRes = await fetch(`https://graph.facebook.com/v19.0/${accountId}/media`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(childParams).toString(),
        });

        const childData = await childRes.json();
        if (childRes.ok && childData.id) {
          childContainerIds.push(childData.id);
        } else {
          return NextResponse.json(
            { success: false, error: `Carousel item error: ${childData?.error?.message || 'Failed item container'}` },
            { status: 400 }
          );
        }
      }

      // Create Parent Carousel Container
      const parentParams: Record<string, string> = {
        access_token: token,
        media_type: 'CAROUSEL',
        children: childContainerIds.join(','),
        caption: caption,
      };
      if (matchedLocId) {
        parentParams.location_id = matchedLocId;
      }

      const carouselRes = await fetch(`https://graph.facebook.com/v19.0/${accountId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(parentParams).toString(),
      });

      const carouselData = await carouselRes.json();
      if (!carouselRes.ok || !carouselData.id) {
        return NextResponse.json(
          { success: false, error: `Carousel creation error: ${carouselData?.error?.message || 'Failed'}` },
          { status: 400 }
        );
      }

      creationId = carouselData.id;
    }
    // ── CASE 2: SINGLE REEL VIDEO ──
    else if (mediaType === 'reel') {
      const reelParams: Record<string, string> = {
        access_token: token,
        media_type: 'REELS',
        video_url: mediaUrls[0],
        share_to_feed: 'true',
        caption: caption,
      };
      if (matchedLocId) {
        reelParams.location_id = matchedLocId;
      }

      const createRes = await fetch(`https://graph.facebook.com/v19.0/${accountId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(reelParams).toString(),
      });

      const createData = await createRes.json();
      if (!createRes.ok || !createData.id) {
        return NextResponse.json(
          { success: false, error: `Reel creation error: ${createData?.error?.message || 'Failed'}` },
          { status: 400 }
        );
      }

      creationId = createData.id;

      // Poll Reel encoding
      let isReady = false;
      let attempts = 0;
      while (!isReady && attempts < 15) {
        await sleep(2000);
        attempts++;
        const statusRes = await fetch(`https://graph.facebook.com/v19.0/${creationId}?fields=status_code,status&access_token=${token}`);
        const statusData = await statusRes.json().catch(() => ({}));
        if (statusData.status_code === 'FINISHED') {
          isReady = true;
          break;
        } else if (statusData.status_code === 'ERROR') {
          return NextResponse.json(
            { success: false, error: `Video processing error on Instagram: ${statusData.status || 'Format invalid'}` },
            { status: 400 }
          );
        }
      }
    }
    // ── CASE 3: SINGLE PHOTO ──
    else {
      const photoParams: Record<string, string> = {
        access_token: token,
        image_url: mediaUrls[0],
        caption: caption,
      };
      if (matchedLocId) {
        photoParams.location_id = matchedLocId;
      }
      if (cleanUser) {
        photoParams.user_tags = JSON.stringify([{ username: cleanUser, x: 0.5, y: 0.5 }]);
      }

      const createRes = await fetch(`https://graph.facebook.com/v19.0/${accountId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(photoParams).toString(),
      });

      const createData = await createRes.json();
      if (!createRes.ok || !createData.id) {
        return NextResponse.json(
          { success: false, error: `Photo container error: ${createData?.error?.message || 'Failed'}` },
          { status: 400 }
        );
      }

      creationId = createData.id;
    }

    // ── STEP 3: PUBLISH CONTAINER TO INSTAGRAM ──
    const publishRes = await fetch(`https://graph.facebook.com/v19.0/${accountId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        creation_id: creationId,
        access_token: token,
      }).toString(),
    });

    const publishData = await publishRes.json();

    if (!publishRes.ok || !publishData.id) {
      return NextResponse.json(
        { success: false, error: `Publish Error: ${publishData?.error?.message || 'Publishing failed'}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      published: true,
      postId: publishData.id,
      message: `🎉 Successfully published live to Instagram @shreebeauty.studio! (Post ID: ${publishData.id})`,
      permalink: `https://www.instagram.com/shreebeauty.studio/`,
      mediaCount: mediaUrls.length,
      mediaUrls,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Error processing publish request' },
      { status: 500 }
    );
  }
}
