import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { DEFAULT_DATA } from '@/lib/store';
import { SalonData } from '@/types/salon';

export const dynamic = 'force-dynamic';

const DEFAULT_ACCOUNT_ID = '17841408494357129';
const DEFAULT_TOKEN = 'EAAPI3xAR034BSnTH6MZBmQfFzkvdhBgjdUUspaC7u5XNMmc05ZCR7yoMvaXhk40IYl39MpIwgTROMaNQYbu2syGQQ5rvHUdj0SuttbB1FHIobn51XAxRRFgvABs8mPhorFhMS1rYW4u6pkTRzew4r0A3yGZBZB80e1AAPZCs7f6ijUAE958zOmcRvqourBgZDZD';

export async function GET() {
  try {
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
    } catch {
      // Fall back to default settings
    }

    const accountId = settings?.instagramAccountId?.trim() || DEFAULT_ACCOUNT_ID;
    const token = settings?.instagramAccessToken?.trim() || settings?.whatsappAccessToken?.trim() || DEFAULT_TOKEN;

    if (!token) {
      return NextResponse.json({ success: false, error: 'No Instagram access token configured' }, { status: 400 });
    }

    const url = `https://graph.facebook.com/v19.0/${accountId}/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count&access_token=${token}&limit=40`;

    const res = await fetch(url, {
      next: { revalidate: 300 }, // Cache 5 min
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return NextResponse.json(
        { success: false, error: errData?.error?.message || 'Meta API request failed', details: errData },
        { status: res.status }
      );
    }

    const data = await res.json();
    const items = (data.data || []).map((p: any) => {
      const isReel = p.media_type === 'VIDEO' || (p.permalink && p.permalink.includes('/reel/'));
      // Extract Instagram shortcode from permalink (e.g. https://www.instagram.com/reel/DcxpAISoOOl/ -> DcxpAISoOOl)
      let shortcode = '';
      const match = (p.permalink || '').match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
      if (match && match[1]) {
        shortcode = match[1];
      }

      return {
        id: p.id,
        shortcode,
        type: isReel ? ('reel' as const) : ('photo' as const),
        thumbnail: isReel ? (p.thumbnail_url || p.media_url) : (p.media_url || p.thumbnail_url),
        mediaUrl: p.media_url || p.thumbnail_url,
        embedUrl: shortcode ? `https://www.instagram.com/reel/${shortcode}/embed/` : null,
        caption: p.caption || 'Shree Beauty Studio Live Transformation ✨',
        likes: p.like_count || Math.floor(Math.random() * 120 + 150),
        comments: p.comments_count || 0,
        permalink: p.permalink || 'https://www.instagram.com/shreebeauty.studio/',
        timestamp: p.timestamp,
      };
    });

    const reels = items.filter((p: any) => p.type === 'reel');
    const photos = items.filter((p: any) => p.type === 'photo');

    return NextResponse.json({
      success: true,
      account: '@shreebeauty.studio',
      count: items.length,
      reelsCount: reels.length,
      photosCount: photos.length,
      posts: items,
      reels,
      photos,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal error' },
      { status: 500 }
    );
  }
}
