import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { SalonData, SalonSettings } from '@/types/salon';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      authorName = 'Client',
      reviewText = '',
      replyText = '',
      reviewId = '',
      rating = 5,
    } = body;

    if (!replyText || !replyText.trim()) {
      return NextResponse.json(
        { success: false, error: 'Reply text is required' },
        { status: 400 }
      );
    }

    const reviewKey = reviewId || `${authorName}_${reviewText.slice(0, 15)}`;
    const nowIso = new Date().toISOString();

    // 1. Fetch current settings from Supabase
    let salonData: SalonData | null = null;
    try {
      const { data: dbRow } = await supabase
        .from('salon_state')
        .select('data')
        .limit(1)
        .single();

      if (dbRow?.data) {
        salonData = dbRow.data as SalonData;
      }
    } catch (dbErr) {
      console.warn('Could not fetch salon_state from Supabase:', dbErr);
    }

    const settings = salonData?.settings;
    const accountId = settings?.googleBusinessAccountId || process.env.GOOGLE_BUSINESS_ACCOUNT_ID;
    const locationId = settings?.googleBusinessLocationId || process.env.GOOGLE_BUSINESS_LOCATION_ID;
    const accessToken = settings?.googleBusinessAccessToken || process.env.GOOGLE_BUSINESS_ACCESS_TOKEN;

    let apiPosted = false;
    let apiError: string | null = null;

    // 2. If Google Business Profile API OAuth access token & location are configured, post directly to Google API
    if (accessToken && accountId && locationId && reviewId) {
      try {
        const cleanAccount = accountId.startsWith('accounts/') ? accountId : `accounts/${accountId}`;
        const cleanLocation = locationId.startsWith('locations/') ? locationId : `locations/${locationId}`;
        const cleanReview = reviewId.startsWith('reviews/') ? reviewId : `reviews/${reviewId}`;
        
        const googleUrl = `https://mybusiness.googleapis.com/v4/${cleanAccount}/${cleanLocation}/${cleanReview}/reply`;
        
        const res = await fetch(googleUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            comment: replyText.trim(),
          }),
        });

        if (res.ok) {
          apiPosted = true;
        } else {
          const errJson = await res.json().catch(() => null);
          apiError = errJson?.error?.message || `Google Business API returned status ${res.status}`;
        }
      } catch (err: any) {
        apiError = err?.message || 'Failed to communicate with Google Business Profile API';
      }
    }

    // 3. Update Supabase salon state with replied status
    if (salonData && salonData.settings) {
      const currentRepliedMap = salonData.settings.googleReviewsRepliedMap || {};
      const updatedRepliedMap = {
        ...currentRepliedMap,
        [reviewKey]: {
          text: replyText.trim(),
          time: nowIso,
          source: (apiPosted ? 'api' : 'ai') as any,
        },
      };

      const updatedData: SalonData = {
        ...salonData,
        settings: {
          ...salonData.settings,
          googleReviewsRepliedMap: updatedRepliedMap,
        },
      };

      try {
        await supabase
          .from('salon_state')
          .update({ data: updatedData, updated_at: nowIso })
          .eq('id', 'singleton');
      } catch (saveErr) {
        console.warn('Could not update salon_state with reply in Supabase:', saveErr);
      }
    }

    return NextResponse.json({
      success: true,
      apiPosted,
      apiError,
      key: reviewKey,
      authorName,
      replyText: replyText.trim(),
      time: nowIso,
      message: apiPosted
        ? '✅ Successfully posted reply directly to Google Business Profile via API!'
        : '✅ Reply generated, recorded in system, and ready for Google Maps.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to process Google review reply' },
      { status: 500 }
    );
  }
}
