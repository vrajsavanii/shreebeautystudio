'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Instagram, Play, Heart, MessageCircle, ExternalLink, Sparkles } from 'lucide-react';
import { studioPhotos } from '@/lib/customer-images';
import { useSalonStore } from '@/lib/store';

// ─── Default Curated Posts (Showcases Studio & Bridal Transformations) ──
const DEFAULT_POSTS = [
  {
    type: 'reel' as const,
    thumbnail: studioPhotos.bridalSuite,
    caption: 'Bridal Makeup Transformation ✨',
    likes: 234,
    comments: 18,
    permalink: 'https://www.instagram.com/shreebeauty.studio/',
  },
  {
    type: 'photo' as const,
    thumbnail: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=600&q=80&auto=format&fit=crop',
    caption: 'Hair Color & Highlights 💇‍♀️',
    likes: 189,
    comments: 12,
    permalink: 'https://www.instagram.com/shreebeauty.studio/',
  },
  {
    type: 'reel' as const,
    thumbnail: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600&q=80&auto=format&fit=crop',
    caption: 'Engagement Makeup Look 💍',
    likes: 312,
    comments: 24,
    permalink: 'https://www.instagram.com/shreebeauty.studio/',
  },
  {
    type: 'photo' as const,
    thumbnail: studioPhotos.reception,
    caption: 'Our Grand Reception ✨',
    likes: 456,
    comments: 32,
    permalink: 'https://www.instagram.com/shreebeauty.studio/',
  },
  {
    type: 'reel' as const,
    thumbnail: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80&auto=format&fit=crop',
    caption: 'Mehndi Night Bridal Look 🌙',
    likes: 278,
    comments: 21,
    permalink: 'https://www.instagram.com/shreebeauty.studio/',
  },
  {
    type: 'photo' as const,
    thumbnail: studioPhotos.stylingFloor,
    caption: 'Hair & Styling Sanctuary 💆‍♀️',
    likes: 345,
    comments: 28,
    permalink: 'https://www.instagram.com/shreebeauty.studio/',
  },
  {
    type: 'reel' as const,
    thumbnail: 'https://images.unsplash.com/photo-1576426863848-c21f53c60b19?w=600&q=80&auto=format&fit=crop',
    caption: 'Gold Facial Glow Treatment ✨',
    likes: 198,
    comments: 15,
    permalink: 'https://www.instagram.com/shreebeauty.studio/',
  },
  {
    type: 'photo' as const,
    thumbnail: studioPhotos.products,
    caption: 'Luxury Product Dispensary 💎',
    likes: 267,
    comments: 19,
    permalink: 'https://www.instagram.com/shreebeauty.studio/',
  },
  {
    type: 'reel' as const,
    thumbnail: studioPhotos.hairWash,
    caption: 'Relaxing Hair Spa Session 🧖‍♀️',
    likes: 223,
    comments: 16,
    permalink: 'https://www.instagram.com/shreebeauty.studio/',
  },
  {
    type: 'photo' as const,
    thumbnail: 'https://images.unsplash.com/photo-1552693673-1bf958298935?w=600&q=80&auto=format&fit=crop',
    caption: 'Smooth Waxing Services 🌸',
    likes: 178,
    comments: 11,
    permalink: 'https://www.instagram.com/shreebeauty.studio/',
  },
  {
    type: 'reel' as const,
    thumbnail: studioPhotos.lounge,
    caption: 'Client Consultation Lounge 🛋️',
    likes: 389,
    comments: 27,
    permalink: 'https://www.instagram.com/shreebeauty.studio/',
  },
  {
    type: 'photo' as const,
    thumbnail: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&q=80&auto=format&fit=crop',
    caption: 'Nail Art & Manicure 💅',
    likes: 156,
    comments: 9,
    permalink: 'https://www.instagram.com/shreebeauty.studio/',
  },
];

interface FeedPostItem {
  type: 'reel' | 'photo';
  thumbnail: string;
  caption: string;
  likes: number;
  comments: number;
  permalink: string;
}

interface InstaCardProps {
  index: number;
  item: FeedPostItem;
  defaultProfileUrl: string;
}

function InstaCard({ item, defaultProfileUrl }: InstaCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const targetUrl = item.permalink || defaultProfileUrl;

  return (
    <a
      href={targetUrl}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'block',
        width: item.type === 'reel' ? 220 : 260,
        height: item.type === 'reel' ? 390 : 260,
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
        flexShrink: 0,
        cursor: 'pointer',
        boxShadow: isHovered
          ? '0 20px 40px rgba(0,0,0,0.3), 0 0 0 2px #EABA38'
          : '0 8px 24px rgba(0,0,0,0.15)',
        transition: 'all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        transform: isHovered ? 'scale(1.04) translateY(-6px)' : 'scale(1)',
        textDecoration: 'none',
      }}
    >
      {/* Background image / video thumbnail */}
      <img
        src={item.thumbnail}
        alt={item.caption || 'Shree Beauty Studio Instagram Post'}
        loading="lazy"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          transition: 'transform 0.5s ease',
          transform: isHovered ? 'scale(1.08)' : 'scale(1)',
        }}
      />

      {/* Reel play indicator */}
      {item.type === 'reel' && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            padding: '4px 10px',
            borderRadius: 99,
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          <Play size={11} fill="#fff" />
          Reel
        </div>
      )}

      {/* Instagram icon watermark */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          width: 28,
          height: 28,
          borderRadius: 8,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Instagram size={14} color="#fff" />
      </div>

      {/* Hover overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: isHovered
            ? 'linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.85) 100%)'
            : 'linear-gradient(180deg, transparent 55%, rgba(0,0,0,0.55) 100%)',
          transition: 'all 0.35s ease',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: 16,
        }}
      >
        {/* Engagement stats */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            opacity: isHovered ? 1 : 0.85,
            transition: 'opacity 0.3s ease',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#fff', fontSize: 12, fontWeight: 600 }}>
            <Heart size={13} fill="#ff4757" color="#ff4757" />
            {item.likes}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#fff', fontSize: 12, fontWeight: 600 }}>
            <MessageCircle size={13} />
            {item.comments}
          </span>
        </div>

        {/* Caption preview */}
        {isHovered && item.caption && (
          <p
            style={{
              color: '#e2e8f0',
              fontSize: 11.5,
              lineHeight: 1.4,
              margin: '6px 0 0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.caption}
          </p>
        )}
      </div>
    </a>
  );
}

export default function InstagramFeed() {
  const { data } = useSalonStore();
  const settings = data?.settings;

  const instagramHandle = settings?.instagramHandle || '@shreebeauty.studio';
  const instagramUrl = settings?.instagramUrl || 'https://www.instagram.com/shreebeauty.studio/';
  const accountId = settings?.instagramAccountId || '17841408494357129';
  const widgetType = settings?.instagramWidgetType || 'auto';
  const accessToken = settings?.instagramAccessToken?.trim() || settings?.whatsappAccessToken?.trim() || '';
  const widgetId = settings?.instagramWidgetId?.trim() || '';
  const embedCode = settings?.instagramEmbedCode?.trim() || '';

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [livePosts, setLivePosts] = useState<FeedPostItem[] | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  // ─── Fetch live feed via /api/instagram/feed or Behold ID ──────────
  useEffect(() => {
    let isMounted = true;

    const fetchLiveFeed = async () => {
      // 1. Fetch from our secure internal Meta Graph API endpoint
      try {
        const res = await fetch('/api/instagram/feed');
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.posts) && data.posts.length > 0) {
            if (isMounted) {
              setLivePosts(data.posts);
              setIsLiveConnected(true);
              return;
            }
          }
        }
      } catch (e) {
        console.warn('Local Instagram feed endpoint error:', e);
      }

      // 2. Behold.so Live JSON Feed fallback
      if (widgetId && (widgetType === 'behold' || widgetType === 'auto')) {
        try {
          const res = await fetch(`https://feeds.behold.so/${widgetId}`);
          if (res.ok) {
            const items = await res.json();
            if (Array.isArray(items) && items.length > 0 && isMounted) {
              const formatted: FeedPostItem[] = items.map((p: any) => ({
                type: (p.mediaType === 'VIDEO' || p.mediaType === 'REEL' || (p.permalink && p.permalink.includes('/reel/'))) ? 'reel' : 'photo',
                thumbnail: p.sizes?.medium?.mediaUrl || p.mediaUrl || p.thumbnailUrl || p.media_url || studioPhotos.bridalSuite,
                caption: p.caption || 'Shree Beauty Studio Live Instagram Update ✨',
                likes: p.likeCount || Math.floor(Math.random() * 150 + 150),
                comments: p.commentsCount || Math.floor(Math.random() * 15 + 10),
                permalink: p.permalink || instagramUrl,
              }));
              setLivePosts(formatted);
              setIsLiveConnected(true);
              return;
            }
          }
        } catch (e) {
          console.warn('Live Instagram feed fetch error (falling back to curated posts):', e);
        }
      }
    };

    fetchLiveFeed();
    return () => {
      isMounted = false;
    };
  }, [widgetId, widgetType, instagramUrl]);



  // ─── Load Elfsight Platform Script if Elfsight widget is used ────────
  useEffect(() => {
    if (widgetType === 'elfsight' && widgetId) {
      const scriptId = 'elfsight-platform-script';
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://static.elfsight.com/platform/platform.js';
        script.async = true;
        document.body.appendChild(script);
      }
    }
  }, [widgetType, widgetId]);

  const activePosts = livePosts && livePosts.length > 0 ? livePosts : DEFAULT_POSTS;
  // Seamless loop array
  const allPosts = [...activePosts, ...activePosts, ...activePosts];

  // Auto-scrolling animation
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let animId: number;
    let scrollPos = 0;
    const speed = 0.55; // Smooth scroll speed

    const animate = () => {
      if (!isPaused && el) {
        scrollPos += speed;
        const singleSetWidth = el.scrollWidth / 3;
        if (scrollPos >= singleSetWidth) {
          scrollPos -= singleSetWidth;
        }
        el.scrollLeft = scrollPos;
      }
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [isPaused, activePosts]);

  return (
    <section
      style={{
        padding: 'clamp(48px, 7vw, 80px) 0',
        background: 'linear-gradient(180deg, #f8fafc 0%, #f0f4f8 100%)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Subtle background glow pattern */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(234,186,56,0.05) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(188,24,136,0.05) 0%, transparent 50%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 2 }}>
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto', padding: '0 20px', marginBottom: 'clamp(32px, 5vw, 48px)' }}>
          {/* Instagram badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              padding: '6px 18px',
              borderRadius: 99,
              marginBottom: 20,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              boxShadow: '0 4px 16px rgba(220, 39, 67, 0.3)',
            }}
          >
            <Instagram size={14} />
            {instagramHandle}
            {isLiveConnected && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.25)', padding: '2px 8px', borderRadius: 12, fontSize: 10 }}>
                <Sparkles size={10} /> Live Synced
              </span>
            )}
          </div>

          <h2
            style={{
              fontSize: 'clamp(26px, 4vw, 40px)',
              fontWeight: 800,
              color: '#0f172a',
              lineHeight: 1.2,
              margin: '0 0 14px',
              letterSpacing: '-0.02em',
            }}
          >
            Follow Our{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #f09433, #dc2743, #bc1888)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Instagram
            </span>{' '}
            Journey
          </h2>
          <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.6, margin: 0 }}>
            Behind-the-scenes bridal transformations, beauty tips, trending hairstyles & more — all live from our Katargam studio.
          </p>
        </div>

        {/* ─── Render based on widget configuration ─── */}
        {widgetType === 'elfsight' && widgetId ? (
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>
            <div className={`elfsight-app-${widgetId}`} data-elfsight-app-lazy />
          </div>
        ) : widgetType === 'custom' && embedCode ? (
          <div
            style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}
            dangerouslySetInnerHTML={{ __html: embedCode }}
          />
        ) : (
          /* Auto-scrolling marquee (Native or Live Behold API) */
          <div
            ref={scrollRef}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            style={{
              display: 'flex',
              gap: 16,
              overflow: 'hidden',
              paddingBottom: 8,
              cursor: 'grab',
            }}
          >
            {allPosts.map((post, i) => (
              <InstaCard
                key={`insta-${i}`}
                index={i}
                item={post}
                defaultProfileUrl={instagramUrl}
              />
            ))}
          </div>
        )}

        {/* Follow CTA */}
        <div style={{ textAlign: 'center', marginTop: 'clamp(28px, 4vw, 44px)' }}>
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              background: 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 700,
              padding: '14px 32px',
              borderRadius: 99,
              textDecoration: 'none',
              boxShadow: '0 8px 24px rgba(220, 39, 67, 0.35)',
              transition: 'all 0.3s ease',
              letterSpacing: '0.02em',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px) scale(1.03)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 32px rgba(220, 39, 67, 0.45)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = '';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(220, 39, 67, 0.35)';
            }}
          >
            <Instagram size={18} />
            Follow {instagramHandle}
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </section>
  );
}
