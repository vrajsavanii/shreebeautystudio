import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { DEFAULT_DATA } from '@/lib/store';
import { SalonData } from '@/types/salon';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // Extend Vercel function timeout to 120 seconds

const META_API_VERSION = 'v21.0';
const DEFAULT_ACCOUNT_ID = '17841408494357129';
const DEFAULT_TOKEN = 'EAAPI3xAR034BSnTH6MZBmQfFzkvdhBgjdUUspaC7u5XNMmc05ZCR7yoMvaXhk40IYl39MpIwgTROMaNQYbu2syGQQ5rvHUdj0SuttbB1FHIobn51XAxRRFgvABs8mPhorFhMS1rYW4u6pkTRzew4r0A3yGZBZB80e1AAPZCs7f6ijUAE958zOmcRvqourBgZDZD';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ── HELPER: Make a Meta Graph API request with built-in error normalization ──
async function metaPost(url: string, params: Record<string, string>): Promise<{ ok: boolean; data: any; status: number }> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
    });
    const data = await res.json().catch(() => ({ error: { message: 'Invalid JSON response from Meta API' } }));
    return { ok: res.ok && !!data.id, data, status: res.status };
  } catch (err: any) {
    return { ok: false, data: { error: { message: `Network error contacting Meta API: ${err.message}` } }, status: 0 };
  }
}

// ── HELPER: Check if a token is expired/invalid ──
function isTokenError(data: any): boolean {
  const msg = data?.error?.message?.toLowerCase() || '';
  const code = data?.error?.code;
  const subcode = data?.error?.error_subcode;
  return (
    code === 190 || // OAuthException - invalid/expired token
    subcode === 463 || // Token expired
    subcode === 467 || // Invalid token
    msg.includes('access token') ||
    msg.includes('session has expired') ||
    msg.includes('oauthexception')
  );
}

// ── HELPER: Sanitize caption for Instagram limits ──
function sanitizeCaption(rawCaption: string): string {
  let safe = (rawCaption || '').trim();

  // Remove invisible unicode, zero-width chars, etc.
  safe = safe.replace(/[\u200B-\u200D\uFEFF\u2060]/g, '');

  // Limit hashtags to max 25 (Instagram allows 30, we keep margin)
  const hashtagMatches = safe.match(/#[a-zA-Z0-9_\u0900-\u0D7F]+/g) || [];
  if (hashtagMatches.length > 25) {
    let tagCount = 0;
    safe = safe.replace(/#[a-zA-Z0-9_\u0900-\u0D7F]+/g, (match) => {
      tagCount++;
      return tagCount <= 25 ? match : '';
    });
  }

  // Collapse multiple blank lines to max 2
  safe = safe.replace(/\n{4,}/g, '\n\n\n');

  // Limit to safe 2000 chars (well under 2200 IG limit)
  if (safe.length > 2000) {
    safe = safe.substring(0, 1990) + '...';
  }

  return safe;
}

// ── HELPER: Create container with self-healing fallback retries ──
async function createContainerWithFallback(
  accountId: string,
  token: string,
  params: Record<string, string>
): Promise<{ success: boolean; id?: string; error?: string; tokenExpired?: boolean }> {
  const baseUrl = `https://graph.facebook.com/${META_API_VERSION}/${accountId}/media`;

  // Attempt 1: Full params
  let result = await metaPost(baseUrl, params);
  if (result.ok && result.data.id) return { success: true, id: result.data.id };
  if (isTokenError(result.data)) return { success: false, error: 'Instagram Access Token has expired. Please reconnect Instagram in Settings.', tokenExpired: true };

  // Attempt 2: Strip user_tags + location_id (common failure sources)
  if (params.user_tags || params.location_id) {
    const fallback1 = { ...params };
    delete fallback1.location_id;
    delete fallback1.user_tags;
    result = await metaPost(baseUrl, fallback1);
    if (result.ok && result.data.id) return { success: true, id: result.data.id };
    if (isTokenError(result.data)) return { success: false, error: 'Instagram Access Token has expired. Please reconnect Instagram in Settings.', tokenExpired: true };
  }

  // Attempt 3: Shorten caption if length/format related
  const errMsg = result.data?.error?.message?.toLowerCase() || '';
  if (params.caption && (errMsg.includes('caption') || errMsg.includes('too long') || errMsg.includes('param'))) {
    const fallback2 = { ...params };
    delete fallback2.location_id;
    delete fallback2.user_tags;
    fallback2.caption = fallback2.caption.substring(0, 800);
    result = await metaPost(baseUrl, fallback2);
    if (result.ok && result.data.id) return { success: true, id: result.data.id };
  }

  // Attempt 4: Absolute minimum — just media + token, no caption at all
  const minimal: Record<string, string> = { access_token: params.access_token };
  if (params.image_url) minimal.image_url = params.image_url;
  if (params.video_url) minimal.video_url = params.video_url;
  if (params.media_type) minimal.media_type = params.media_type;
  if (params.is_carousel_item) minimal.is_carousel_item = params.is_carousel_item;
  if (params.share_to_feed) minimal.share_to_feed = params.share_to_feed;
  if (params.children) minimal.children = params.children;

  result = await metaPost(baseUrl, minimal);
  if (result.ok && result.data.id) return { success: true, id: result.data.id };

  return {
    success: false,
    error: result.data?.error?.message || 'Failed to create Instagram media container after 4 attempts',
  };
}

// ── HELPER: Wait for container to be ready with exponential backoff ──
async function waitForContainerReady(
  creationId: string,
  token: string,
  maxWaitMs: number = 90000,
  isSingleImage: boolean = false
): Promise<{ ready: boolean; error?: string }> {
  const startTime = Date.now();
  let delay = isSingleImage ? 2000 : 3000;

  // For single image, give Meta a brief initial window to fetch the public URL
  if (isSingleImage) {
    await sleep(2500);
  }

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const statusRes = await fetch(
        `https://graph.facebook.com/${META_API_VERSION}/${creationId}?fields=status_code,status&access_token=${token}`
      );
      const statusData = await statusRes.json().catch(() => ({}));

      if (statusData.status_code === 'FINISHED') {
        return { ready: true };
      }

      if (statusData.status_code === 'ERROR') {
        return {
          ready: false,
          error: `Instagram media processing failed: ${statusData.status || 'The uploaded media could not be processed. Please try a different photo/video.'}`,
        };
      }

      if (statusData.status_code === 'EXPIRED') {
        return {
          ready: false,
          error: 'The media container expired before it could be published. Please try again.',
        };
      }

      // For single image containers, Meta Graph API often does not return status_code (undefined/null)
      // If status_code is undefined and there is no error in statusData, the container is ready for publish attempts
      if (!statusData.status_code && statusData.id && !statusData.error) {
        if (isSingleImage || Date.now() - startTime >= 3500) {
          return { ready: true };
        }
      }

      // IN_PROGRESS or unknown — keep waiting with backoff
      delay = Math.min(delay * 1.25, 5000);
      await sleep(delay);
    } catch {
      // Network hiccup — keep trying, don't fail yet
      delay = Math.min(delay * 1.3, 5000);
      await sleep(delay);
    }
  }

  return { ready: true };
}

// ── HELPER: Publish with retry (Meta can have transient failures) ──
async function publishWithRetry(
  accountId: string,
  creationId: string,
  token: string,
  maxRetries: number = 12 // Allow up to 12 progressive retries (~60s total) for Meta media processing
): Promise<{ success: boolean; postId?: string; error?: string }> {
  const publishUrl = `https://graph.facebook.com/${META_API_VERSION}/${accountId}/media_publish`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await metaPost(publishUrl, {
      creation_id: creationId,
      access_token: token,
    });

    if (result.ok && result.data.id) {
      return { success: true, postId: result.data.id };
    }

    if (isTokenError(result.data)) {
      return { success: false, error: 'Instagram Access Token has expired. Please reconnect Instagram in Settings.' };
    }

    const errObj = result.data?.error || {};
    const errMsg = (errObj.message || '').toLowerCase();
    const errCode = errObj.code;
    const errSubcode = errObj.error_subcode;
    const isTransient = errObj.is_transient === true;

    // "Media ID is not available" (error_subcode 2207027 / 2207001 / code 9007) — Meta is still ingesting/encoding the media
    const isMediaNotReady =
      errSubcode === 2207027 ||
      errSubcode === 2207001 ||
      errSubcode === 2207005 ||
      errCode === 9007 ||
      isTransient ||
      errMsg.includes('media id is not available') ||
      errMsg.includes('not available') ||
      errMsg.includes('not ready') ||
      errMsg.includes('being processed') ||
      errMsg.includes('wait a moment') ||
      errMsg.includes('wait a few minutes');

    if (isMediaNotReady) {
      if (attempt < maxRetries) {
        const waitTime = Math.min(3000 + (attempt * 750), 6000);
        console.log(`[Instagram Publish] Media ${creationId} still being processed by Meta (attempt ${attempt}/${maxRetries}). Waiting ${waitTime}ms...`);
        await sleep(waitTime);
        continue;
      }
    }

    // Rate limit — back off aggressively
    if (result.status === 429 || errMsg.includes('rate limit')) {
      if (attempt < maxRetries) {
        await sleep(8000);
        continue;
      }
    }

    // Other permanent errors — don't retry
    if (!isMediaNotReady || attempt === maxRetries) {
      return { success: false, error: errObj.message || 'Instagram publishing failed after multiple attempts' };
    }

    await sleep(3500);
  }

  return { success: false, error: 'Publishing timed out while waiting for Instagram media processing. Please try again in a moment.' };
}

// ── MAIN ROUTE HANDLER ──
export async function POST(req: NextRequest) {
  try {
    const reqContentType = req.headers.get('content-type') || '';
    let mediaUrls: string[] = [];
    let mediaType: 'photo' | 'reel' | 'carousel' = 'photo';
    let caption = '';
    let location = '';
    let collaborator = '';

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://eqwfbcouxozwfwkzqano.supabase.co';

    // ── STEP 1: PARSE INPUT (multipart form or JSON) ──
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
          const isVid = file.type?.startsWith('video/') || /\.(mp4|mov|m4v|3gp|webm|avi|mkv)$/i.test(file.name || '');
          let ext = file.name.split('.').pop()?.toLowerCase();
          if (isVid) {
            if (!ext || ext === 'blob' || !['mp4', 'mov', 'm4v', 'webm'].includes(ext)) ext = 'mp4';
          } else {
            if (!ext || ext === 'heic' || ext === 'heif' || ext === 'blob') ext = 'jpg';
          }
          const fileName = `ig_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
          const buffer = Buffer.from(await file.arrayBuffer());

          const fileMime = file.type || (isVid ? (ext === 'mov' ? 'video/quicktime' : 'video/mp4') : 'image/jpeg');

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

    // ── STEP 2: VALIDATE MEDIA URLS ARE ACCESSIBLE ──
    for (const url of mediaUrls) {
      try {
        const headRes = await fetch(url, { method: 'HEAD' });
        if (!headRes.ok) {
          return NextResponse.json(
            { success: false, error: `Media file is not accessible (HTTP ${headRes.status}). The image may have failed to upload. Please try again.` },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json(
          { success: false, error: `Cannot reach media file at storage. Please check your connection and try again.` },
          { status: 400 }
        );
      }
    }

    // ── STEP 3: FETCH LATEST TOKEN & ACCOUNT ID ──
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

    // ── STEP 4: VALIDATE TOKEN BEFORE PROCEEDING ──
    try {
      const tokenCheck = await fetch(`https://graph.facebook.com/${META_API_VERSION}/me?access_token=${token}`);
      const tokenData = await tokenCheck.json().catch(() => ({}));
      if (!tokenCheck.ok || tokenData?.error) {
        return NextResponse.json(
          { success: false, error: `Instagram token is invalid or expired: ${tokenData?.error?.message || 'Please reconnect Instagram in Settings.'}` },
          { status: 401 }
        );
      }
    } catch {}

    let creationId = '';
    const cleanUser = collaborator ? collaborator.replace(/^@/, '').trim() : '';
    const safeCaption = sanitizeCaption(caption);

    // ── STEP 5: CREATE MEDIA CONTAINER(S) ──

    // CASE 1: CAROUSEL (multiple media)
    if (mediaType === 'carousel' || mediaUrls.length > 1) {
      const childContainerIds: string[] = [];

      for (const itemUrl of mediaUrls) {
        const isVid = /\.(mp4|mov|m4v|3gp|webm|avi|mkv)(\?|$)/i.test(itemUrl);
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

        const childResult = await createContainerWithFallback(accountId, token, childParams);
        if (childResult.tokenExpired) {
          return NextResponse.json({ success: false, error: childResult.error }, { status: 401 });
        }
        if (!childResult.success || !childResult.id) {
          return NextResponse.json(
            { success: false, error: `Carousel item error: ${childResult.error || 'Failed to create media item container'}` },
            { status: 400 }
          );
        }

        // Wait for each child carousel item to be ready
        const childReady = await waitForContainerReady(childResult.id, token, 45000, !isVid);
        if (!childReady.ready) {
          return NextResponse.json(
            { success: false, error: `Carousel item processing failed: ${childReady.error || 'Please try again'}` },
            { status: 400 }
          );
        }

        childContainerIds.push(childResult.id);
      }

      // Create Parent Carousel Container
      const parentParams: Record<string, string> = {
        access_token: token,
        media_type: 'CAROUSEL',
        children: childContainerIds.join(','),
        caption: safeCaption,
      };

      const parentResult = await createContainerWithFallback(accountId, token, parentParams);
      if (parentResult.tokenExpired) {
        return NextResponse.json({ success: false, error: parentResult.error }, { status: 401 });
      }
      if (!parentResult.success || !parentResult.id) {
        return NextResponse.json(
          { success: false, error: `Carousel creation error: ${parentResult.error || 'Failed to create carousel container'}` },
          { status: 400 }
        );
      }

      creationId = parentResult.id;
    }
    // CASE 2: REEL (single video)
    else if (mediaType === 'reel') {
      const reelParams: Record<string, string> = {
        access_token: token,
        media_type: 'REELS',
        video_url: mediaUrls[0],
        share_to_feed: 'true',
        caption: safeCaption,
      };

      const reelResult = await createContainerWithFallback(accountId, token, reelParams);
      if (reelResult.tokenExpired) {
        return NextResponse.json({ success: false, error: reelResult.error }, { status: 401 });
      }
      if (!reelResult.success || !reelResult.id) {
        return NextResponse.json(
          { success: false, error: `Reel creation error: ${reelResult.error || 'Failed to create reel container'}` },
          { status: 400 }
        );
      }

      creationId = reelResult.id;
    }
    // CASE 3: SINGLE PHOTO
    else {
      const photoParams: Record<string, string> = {
        access_token: token,
        image_url: mediaUrls[0],
        caption: safeCaption,
      };
      if (cleanUser) {
        photoParams.user_tags = JSON.stringify([{ username: cleanUser, x: 0.5, y: 0.5 }]);
      }

      const photoResult = await createContainerWithFallback(accountId, token, photoParams);
      if (photoResult.tokenExpired) {
        return NextResponse.json({ success: false, error: photoResult.error }, { status: 401 });
      }
      if (!photoResult.success || !photoResult.id) {
        return NextResponse.json(
          { success: false, error: `Photo container error: ${photoResult.error || 'Failed to create photo container'}` },
          { status: 400 }
        );
      }

      creationId = photoResult.id;
    }

    // ── SAFETY CHECK: Ensure we actually have a creation ID ──
    if (!creationId) {
      return NextResponse.json(
        { success: false, error: 'Internal error: No media container ID was created. Please try again.' },
        { status: 500 }
      );
    }

    // ── STEP 6: WAIT FOR CONTAINER TO BE READY (with exponential backoff) ──
    const readyResult = await waitForContainerReady(creationId, token, 90000, mediaType === 'photo');
    if (!readyResult.ready) {
      return NextResponse.json(
        { success: false, error: readyResult.error || 'Media processing timed out. Please try again.' },
        { status: 408 }
      );
    }

    // ── STEP 7: PUBLISH TO INSTAGRAM (with progressive retry for Media ID availability) ──
    const publishResult = await publishWithRetry(accountId, creationId, token, 12);
    if (!publishResult.success || !publishResult.postId) {
      return NextResponse.json(
        { success: false, error: `Publish Error: ${publishResult.error || 'Publishing failed'}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      published: true,
      postId: publishResult.postId,
      message: `🎉 Successfully published live to Instagram @shreebeauty.studio! (Post ID: ${publishResult.postId})`,
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
