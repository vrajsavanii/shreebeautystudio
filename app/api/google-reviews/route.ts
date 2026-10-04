import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { SalonData } from '@/types/salon';

export interface GoogleReviewItem {
  text: string;
  name: string;
  role: string;
  avatar: string;
  rating: number;
  time?: number;
  relativeTime?: string;
  authorUrl?: string;
}

// Fallback verified 5-Star reviews from Shree Beauty Studio (Surat)
const FALLBACK_REVIEWS: GoogleReviewItem[] = [
  {
    text: "I had a wonderful experience at Shree Beauty Studio. The staff was welcoming, the parlour clean, and my bridal look & hairstyling turned out even better than expected. Excellent service!",
    name: "Dhruti Nakrani",
    role: "Bridal Services · Surat",
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocIMVcUut1-F4xtAwopH1z6FUHCDR1KHF4eYtMQkvZ6ymmprPQ=s120-c-rp-mo-br100",
    rating: 5,
  },
  {
    text: "The bridal makeup was excellent! They highlighted my features perfectly and made me look so beautiful on my wedding day. Professional and polite team.",
    name: "Hemansi Vaghasiya",
    role: "Bride · Bridal Services",
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocJ4y2i3cnBzLWfvSaJqI_mW6De-EdU8rRyubcBLH0g5wkVnZg=s120-c-rp-mo-br100",
    rating: 5,
  },
  {
    text: "Thank you so much for making me look and feel beautiful on my special day. Absolutely loved my bridal makeup and hairstyle. Truly appreciate your attention to detail!",
    name: "Ekta Koladiya",
    role: "Bride · Bridal Services",
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocLcauLyD318u17rbgN2MkzikbTdao19SE1ORqTiQ5KBiKKjmw=s120-c-rp-mo-br100",
    rating: 5,
  },
  {
    text: "Shree beauty studio has a very friendly atmosphere. Amita and Bhavna aunty are so polite. They use 100% original products. The feeling is like home salon.",
    name: "Parul Savani",
    role: "Regular Client · Surat",
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocLIJbMxQ_-zezajrclqidPSKTigQELlG6e6zoBHyy6YGF45ZQ=s120-c-rp-mo-br100",
    rating: 5,
  },
  {
    text: "Very good and professional service. The senior stylist gave me an amazing haircut and hair colour streaks. I'll definitely visit again.",
    name: "Dharvi Dobariya",
    role: "Hair Colour & Cut · Surat",
    avatar: "https://lh3.googleusercontent.com/a-/ALV-UjUzResOCcsqSoz_9nJlPwJo0xLc8XqaBBvD-50U6i-5XiGeahRbyQ=s120-c-rp-mo-br100",
    rating: 5,
  },
  {
    text: "Had a wonderful experience! The staff was friendly and made me feel comfortable. Extremely satisfied with the hair spa and conditioning.",
    name: "Jalpa Chetan",
    role: "Hair Spa & Care · Surat",
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocKFQoosQv3m8kbKzR06M_FOiW9T8MSNJXQQFkM_H26d081eCQ=s120-c-rp-mo-br100",
    rating: 5,
  },
  {
    text: "Excellent service, friendly staff, and a very clean and relaxing atmosphere. I'm extremely happy with the results every single visit.",
    name: "Prushti Bhalani",
    role: "Regular Client · Surat",
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocLXP5G2hRrcgPF3Lt54fU-9cOX3z6X7_pWtzKIjVBMGdSS8NQ=s120-c-rp-mo-br100",
    rating: 5,
  },
  {
    text: "I truly appreciate the care and professionalism. My wife always feels comfortable and valued here. Seeing her return confident means a lot.",
    name: "Raahulkumar Savani",
    role: "Local Guide · Surat",
    avatar: "https://lh3.googleusercontent.com/a-/ALV-UjUlFzbfpCxffgpjwGL3QEwBhVZr_ZGwDB5q4TW3YhVPx2JzCo8Oeg=s120-c-rp-mo-ba12-br100",
    rating: 5,
  },
  {
    text: "The makeup is fabulous & flawless. Such an amazing experience with haircut, hair spa and makeup. Must visit studio in Surat!",
    name: "Niral Gabani",
    role: "Makeup & Hair · Surat",
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocIJOE4TlfWWF--c9uclLYW3Dt-U0NtORrVUuohOjaGpmtej-FM=s120-c-rp-mo-br100",
    rating: 5,
  },
  {
    text: "Amazing beauty parlour with skilled staff and great customer service. 100% genuine products and transparent care.",
    name: "Vraj Savani",
    role: "Regular Client · Surat",
    avatar: "https://lh3.googleusercontent.com/a-/ALV-UjXaeK8vhZJOteLQa_HwQB21cCnn4cFA_jvWxoaGUCJ9qWkRrYhu=s120-c-rp-mo-br100",
    rating: 5,
  },
  {
    text: "Had a really nice experience here! I got my makeup done for a special occasion, and I absolutely loved how it turned out. Definitely recommend!",
    name: "Patel Radhi",
    role: "Special Occasion Makeup",
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocJvQ1NIm-6hijsJYXNN3VE6ULW8nvLkkt3dJbUll2iVmFS9Zg=s120-c-rp-mo-br100",
    rating: 5,
  },
  {
    text: "I visited Shree Beauty Studio and had a fantastic experience. The staff was friendly, hygienic, and used high quality branded products. Highly recommend!",
    name: "Yugma Mangukiya",
    role: "Bridal Services · Surat",
    avatar: "https://lh3.googleusercontent.com/a-/ALV-UjWUbrafNXdLtla2jm3KFn21cxGSBhC1RefqOUCLcX3yvXN-KwEn=s120-c-rp-mo-br100",
    rating: 5,
  },
  {
    text: "Even though I moved to USA recently I still get my haircut and makeup here during my yearly visit to India. Natural look & THE BEST!",
    name: "Harsha Kothiya",
    role: "Long-time Client · USA",
    avatar: "https://lh3.googleusercontent.com/a-/ALV-UjVwCA4so6iQ5bQZtnuByyzgALvK9ZSPtexfeplBU9GmGQ-e_Kbvxg=s120-c-rp-mo-br100",
    rating: 5,
  },
  {
    text: "Best place for makeup and beauty services in Surat. 5/5 quality, top hygiene, and skilled stylists.",
    name: "Dipak Chavada",
    role: "Local Guide · Surat",
    avatar: "https://lh3.googleusercontent.com/a-/ALV-UjXGxEGnPftOQxiRER49daXV2E6pmj932NYKJJsOw65BacoDBVV9Qw=s120-c-rp-mo-ba12-br100",
    rating: 5,
  },
  {
    text: "You made me feel like the most beautiful version of myself on my wedding day. Absolutely magical bridal look!",
    name: "Mansi Boda",
    role: "Bride · Bridal Makeup",
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocIyuorrSEom969RIcSM25TEQJb-LvQUZJ5xg_roVilggzrBuQ=s120-c-rp-mo-br100",
    rating: 5,
  },
  {
    text: "Loved the service! The staff was very polite and professional. Highly recommend this salon for all hair & skin services.",
    name: "Varsha Bhalani",
    role: "Regular Client · Surat",
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocI6cBMqgLwqUGWAa4hNa-MLh_FVKiTe8e2fDtb1PdbYdGUzmg=s120-c-rp-mo-br100",
    rating: 5,
  },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queryPlaceId = searchParams.get('place_id');
    const queryApiKey = searchParams.get('api_key');
    const minRating = Number(searchParams.get('min_rating') || '5');

    let placeId = queryPlaceId || process.env.GOOGLE_PLACE_ID;
    let apiKey = queryApiKey || process.env.GOOGLE_PLACES_API_KEY;

    // If not in env / params, attempt to fetch from Supabase salon settings
    if (!apiKey || !placeId) {
      try {
        const { data: dbRow } = await supabase
          .from('salon_state')
          .select('data')
          .limit(1)
          .single();

        if (dbRow?.data) {
          const salonData = dbRow.data as SalonData;
          if (!placeId && salonData.settings?.googlePlaceId) {
            placeId = salonData.settings.googlePlaceId;
          }
          if (!apiKey && salonData.settings?.googlePlacesApiKey) {
            apiKey = salonData.settings.googlePlacesApiKey;
          }
        }
      } catch (e) {
        // Fall back gracefully
      }
    }

    let liveReviews: GoogleReviewItem[] = [];
    let rating = 4.9;
    let totalReviews = 210;
    let source: 'google_places_api' | 'curated_fallback' = 'curated_fallback';

    // If API Key and Place ID are provided, fetch directly from Google Places API
    if (apiKey && placeId) {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
          placeId
        )}&fields=name,rating,reviews,user_ratings_total,url&reviews_sort=newest&key=${encodeURIComponent(
          apiKey
        )}`;

        const res = await fetch(url, { next: { revalidate: 86400 } }); // Cache 24 hours
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'OK' && data.result) {
            source = 'google_places_api';
            if (typeof data.result.rating === 'number') {
              rating = data.result.rating;
            }
            if (typeof data.result.user_ratings_total === 'number') {
              totalReviews = data.result.user_ratings_total;
            }

            const rawReviews = (data.result.reviews || []) as Array<{
              author_name?: string;
              author_url?: string;
              profile_photo_url?: string;
              rating?: number;
              relative_time_description?: string;
              text?: string;
              time?: number;
            }>;

            liveReviews = rawReviews
              .filter(
                (r) =>
                  (r.rating || 0) >= minRating &&
                  (r.text || '').trim().length > 10
              )
              .map((r) => ({
                text: (r.text || '').trim(),
                name: r.author_name || 'Surat Client',
                role: `Google Verified Review · ${r.relative_time_description || 'Recent'}`,
                avatar:
                  r.profile_photo_url ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    r.author_name || 'SC'
                  )}&background=05424A&color=EABA38&bold=true`,
                rating: r.rating || 5,
                time: r.time,
                relativeTime: r.relative_time_description,
                authorUrl: r.author_url,
              }));
          }
        }
      } catch (err) {
        console.warn('Google Places API fetch error:', err);
      }
    }

    // Combine live reviews with curated fallback reviews to ensure a full two-row marquee
    const combinedReviews = [...liveReviews, ...FALLBACK_REVIEWS];
    // Deduplicate by name + first 20 chars of text
    const seen = new Set<string>();
    const uniqueReviews = combinedReviews.filter((item) => {
      const key = `${item.name.toLowerCase()}_${item.text.slice(0, 20).toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Split evenly for Row 1 and Row 2
    const midpoint = Math.ceil(uniqueReviews.length / 2);
    const row1 = uniqueReviews.slice(0, midpoint);
    const row2 = uniqueReviews.slice(midpoint);

    return NextResponse.json(
      {
        success: true,
        source,
        rating,
        totalReviews,
        liveCount: liveReviews.length,
        totalCount: uniqueReviews.length,
        row1,
        row2,
        reviews: uniqueReviews,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to fetch Google reviews',
        row1: FALLBACK_REVIEWS.slice(0, 8),
        row2: FALLBACK_REVIEWS.slice(8),
      },
      { status: 500 }
    );
  }
}
