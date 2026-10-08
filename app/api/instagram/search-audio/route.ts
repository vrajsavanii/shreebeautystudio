import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export interface SongSearchResult {
  id: string;
  title: string;
  artist: string;
  album: string;
  artwork: string;
  previewUrl: string;
  durationSec: number;
  category?: string;
  trendingRank?: number;
  badge?: string;
  isTrending?: boolean;
}

// In-memory cache for fast repeat requests
const SEARCH_CACHE = new Map<string, { timestamp: number; songs: SongSearchResult[] }>();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes cache

interface CuratedTrack {
  q: string;
  badge: string;
  category: 'bridal' | 'romantic' | 'festive' | 'all';
}

const CURATED_TRENDING_TRACKS: CuratedTrack[] = [
  // Top 15 All-Time Viral Instagram Reels Tracks (Strictly Ranked #1 to #15)
  { q: 'Kudmayi Pritam', badge: '🔥 #1 Trending Reel', category: 'bridal' },
  { q: 'Din Shagna Da Phillauri', badge: '👑 #2 Bridal Anthem', category: 'bridal' },
  { q: 'Ve Kamleya Rocky Aur Rani', badge: '🔥 #3 Viral Reel', category: 'romantic' },
  { q: 'Aaj Sajeya Goldie Sohel', badge: '✨ #4 Dulhan Entry', category: 'bridal' },
  { q: 'O Maahi Dunki Arijit', badge: '🔥 #5 Viral Romance', category: 'romantic' },
  { q: 'Rangtaali Aishwarya Majmudar', badge: '🪔 #6 Gujarati Garba', category: 'festive' },
  { q: 'Chand Ne Kaho Chaal Jeevie Laiye', badge: '💫 #7 Gujarati Trend', category: 'festive' },
  { q: 'Kesariya Pritam Arijit Singh Brahmastra', badge: '🌟 #8 Mega Hit', category: 'romantic' },
  { q: 'Dholida Gangubai Kathiawadi', badge: '💃 #9 Dance Reel', category: 'festive' },
  { q: 'Madhanya Rahul Vaidya', badge: '👑 #10 Bridal Emotion', category: 'bridal' },
  { q: 'Ranjha Shershaah', badge: '❤️ #11 Wedding Viral', category: 'bridal' },
  { q: 'Tere Hawaale Laal Singh Chaddha', badge: '✨ #12 Aesthetic Reel', category: 'romantic' },
  { q: 'Apna Bana Le Bhediya', badge: '💖 #13 Reel Hit', category: 'romantic' },
  { q: 'Laadki Sachin Jigar Coke Studio', badge: '👰 #14 Emotional Entry', category: 'bridal' },
  { q: 'Chogada Loveyatri Darshan Raval', badge: '🪔 #15 Garba Beats', category: 'festive' },
];

const CATEGORY_CURATED_LIST: Record<string, CuratedTrack[]> = {
  all: CURATED_TRENDING_TRACKS,
  bridal: [
    { q: 'Din Shagna Da Phillauri', badge: '👑 #1 Bridal Anthem', category: 'bridal' },
    { q: 'Kudmayi Pritam', badge: '🔥 #2 Viral Dulhan Entry', category: 'bridal' },
    { q: 'Aaj Sajeya Goldie Sohel', badge: '✨ #3 Bridal Walk', category: 'bridal' },
    { q: 'Madhanya Rahul Vaidya', badge: '👑 #4 Bidaai & Bridal', category: 'bridal' },
    { q: 'Laadki Sachin Jigar Coke Studio', badge: '👰 #5 Emotional Bridal', category: 'bridal' },
    { q: 'Ranjha Shershaah', badge: '❤️ #6 Wedding Vows', category: 'bridal' },
    { q: 'Kabira Jubin Nautiyal', badge: '✨ #7 Royal Bridal Walk', category: 'bridal' },
    { q: 'Gud Naal Ishq Mitha Ek Ladki Ko Dekha Toh', badge: '💃 #8 Mehndi Dulhan', category: 'bridal' },
  ],
  romantic: [
    { q: 'Ve Kamleya Rocky Aur Rani', badge: '🔥 #1 Romantic Reel', category: 'romantic' },
    { q: 'O Maahi Dunki Arijit', badge: '🔥 #2 Viral Romance', category: 'romantic' },
    { q: 'Kesariya Pritam Arijit Singh Brahmastra', badge: '🌟 #3 Love Anthem', category: 'romantic' },
    { q: 'Tere Hawaale Laal Singh Chaddha', badge: '✨ #4 Romantic Trend', category: 'romantic' },
    { q: 'Apna Bana Le Bhediya', badge: '💖 #5 Soulful Reel', category: 'romantic' },
    { q: 'Raataan Lambiyan Shershaah', badge: '❤️ #6 Couple Goals', category: 'romantic' },
    { q: 'Pehle Bhi Main Animal Vishal Mishra', badge: '🔥 #7 Trending Audio', category: 'romantic' },
    { q: 'Tum Se Teri Baaton Mein Aisa Uljha Jiya Sachin-Jigar', badge: '✨ #8 Hit Reel', category: 'romantic' },
  ],
  festive: [
    { q: 'Rangtaali Aishwarya Majmudar', badge: '🪔 #1 Garba Reel', category: 'festive' },
    { q: 'Chand Ne Kaho Chaal Jeevie Laiye', badge: '💫 #2 Gujarati Viral', category: 'festive' },
    { q: 'Dholida Gangubai Kathiawadi', badge: '💃 #3 High Energy Garba', category: 'festive' },
    { q: 'Chogada Loveyatri Darshan Raval', badge: '🪔 #4 Garba Beat', category: 'festive' },
    { q: 'Kamariya Mitron Darshan Raval', badge: '✨ #5 Navratri & Party', category: 'festive' },
    { q: 'Nagada Sang Dhol Shreya Ghoshal', badge: '🪔 #6 Royal Garba', category: 'festive' },
    { q: 'Pa Pa Pagali Chaal Jeevie Laiye', badge: '💖 #7 Gujarati Emotion', category: 'festive' },
    { q: 'Mor Bani Thanghat Kare Goliyon Ki Raasleela', badge: '🪔 #8 Traditional Beats', category: 'festive' },
  ],
};

async function fetchRankedCuratedTracks(curatedList: CuratedTrack[]): Promise<SongSearchResult[]> {
  const seenIds = new Set<string>();

  // Parallel fetch while strictly retaining original array index ordering
  const fetchPromises = curatedList.map(async (item, index) => {
    try {
      const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(item.q)}&media=music&entity=song&country=IN&limit=2`;
      const res = await fetch(itunesUrl, { next: { revalidate: 3600 } });
      if (res.ok) {
        const data = await res.json();
        for (const track of data.results || []) {
          if (track.previewUrl) {
            return {
              id: `itunes_${track.trackId}`,
              title: track.trackName || 'Trending Song',
              artist: track.artistName || 'Various Artists',
              album: track.collectionName || 'Single',
              artwork: (track.artworkUrl100 || track.artworkUrl60 || '').replace('100x100bb', '250x250bb'),
              previewUrl: track.previewUrl,
              durationSec: Math.min(Math.round((track.trackTimeMillis || 30000) / 1000), 30),
              category: item.category,
              trendingRank: index + 1,
              badge: item.badge,
              isTrending: true,
            };
          }
        }
      }
    } catch {}
    return null;
  });

  const rawResults = await Promise.all(fetchPromises);
  const orderedSongs: SongSearchResult[] = [];

  for (let i = 0; i < rawResults.length; i++) {
    const song = rawResults[i];
    if (song && !seenIds.has(song.id)) {
      seenIds.add(song.id);
      // Re-assign accurate 1-indexed rank among unique resolved items
      song.trendingRank = orderedSongs.length + 1;
      orderedSongs.push(song);
    }
  }

  return orderedSongs;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('q') || '').trim();
    const category = (searchParams.get('category') || 'all').trim().toLowerCase();

    const cacheKey = `${query.toLowerCase()}_${category}`;
    const cached = SEARCH_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS && cached.songs.length > 0) {
      return NextResponse.json({ success: true, songs: cached.songs, count: cached.songs.length, cached: true });
    }

    let songs: SongSearchResult[] = [];

    // If query is empty or 'trending', return strictly ranked top viral list
    if (!query || query.toLowerCase() === 'trending') {
      const curatedList = CATEGORY_CURATED_LIST[category] || CATEGORY_CURATED_LIST.all;
      songs = await fetchRankedCuratedTracks(curatedList);
    } else {
      // User typed a custom search query
      const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&country=IN&limit=25`;
      const res = await fetch(itunesUrl, { next: { revalidate: 3600 } });

      if (res.ok) {
        const data = await res.json();
        const seenIds = new Set<string>();

        songs = (data.results || [])
          .filter((item: any) => item.previewUrl && (item.trackName || item.collectionName))
          .map((item: any, idx: number) => {
            if (seenIds.has(String(item.trackId))) return null;
            seenIds.add(String(item.trackId));
            return {
              id: `itunes_${item.trackId}`,
              title: item.trackName || 'Unknown Title',
              artist: item.artistName || 'Various Artists',
              album: item.collectionName || 'Single',
              artwork: (item.artworkUrl100 || item.artworkUrl60 || '').replace('100x100bb', '250x250bb'),
              previewUrl: item.previewUrl,
              durationSec: Math.min(Math.round((item.trackTimeMillis || 30000) / 1000), 30),
              trendingRank: idx + 1,
              badge: idx < 3 ? `🔥 Match #${idx + 1}` : undefined,
              isTrending: false,
            };
          })
          .filter(Boolean) as SongSearchResult[];
      }

      // If user search returned few results, fallback to ranked trending
      if (songs.length === 0) {
        songs = await fetchRankedCuratedTracks(CURATED_TRENDING_TRACKS);
      }
    }

    if (songs.length > 0) {
      SEARCH_CACHE.set(cacheKey, { timestamp: Date.now(), songs });
    }

    return NextResponse.json({
      success: true,
      songs,
      count: songs.length,
      query,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      songs: [],
      error: err.message,
    });
  }
}
