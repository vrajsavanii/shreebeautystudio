'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Instagram, Play, Heart, MessageCircle, ExternalLink,
  Sparkles, X, Film, Image as ImageIcon, Volume2, ChevronRight
} from 'lucide-react';
import { studioPhotos } from '@/lib/customer-images';
import { useSalonStore } from '@/lib/store';

// ─── Default Fallback Curated Items ──────────────────────────────────
const DEFAULT_PHOTOS = [
  {
    id: 'p1',
    type: 'photo' as const,
    thumbnail: studioPhotos.reception,
    caption: 'Our Grand Reception ✨ Welcome to luxury salon experience in Katargam',
    likes: 456,
    comments: 32,
    permalink: 'https://www.instagram.com/shreebeauty.studio/',
  },
  {
    id: 'p2',
    type: 'photo' as const,
    thumbnail: studioPhotos.stylingFloor,
    caption: 'Hair & Styling Sanctuary 💆‍♀️ Arched LED styling stations & plush chairs',
    likes: 345,
    comments: 28,
    permalink: 'https://www.instagram.com/shreebeauty.studio/',
  },
  {
    id: 'p3',
    type: 'photo' as const,
    thumbnail: studioPhotos.bridalSuite,
    caption: 'Private Couture Bridal Suite 👰 VIP makeover vanity for wedding prep',
    likes: 389,
    comments: 31,
    permalink: 'https://www.instagram.com/shreebeauty.studio/',
  },
  {
    id: 'p4',
    type: 'photo' as const,
    thumbnail: studioPhotos.products,
    caption: '100% Genuine Luxury Formulations 💎 L’Oréal & Selective Professional',
    likes: 267,
    comments: 19,
    permalink: 'https://www.instagram.com/shreebeauty.studio/',
  },
  {
    id: 'p5',
    type: 'photo' as const,
    thumbnail: studioPhotos.hairWash,
    caption: 'Ergonomic Hair Spa Backwash 🧖‍♀️ Relaxing scalp therapies & wash stations',
    likes: 223,
    comments: 16,
    permalink: 'https://www.instagram.com/shreebeauty.studio/',
  },
  {
    id: 'p6',
    type: 'photo' as const,
    thumbnail: studioPhotos.lounge,
    caption: 'Client Consultation Lounge 🛋️ 25+ years industry achievement showcase',
    likes: 312,
    comments: 24,
    permalink: 'https://www.instagram.com/shreebeauty.studio/',
  },
];

const DEFAULT_REELS = [
  {
    id: 'r1',
    shortcode: '',
    type: 'reel' as const,
    thumbnail: studioPhotos.bridalSuite,
    embedUrl: null,
    caption: 'Elegance Redefined Bridal Transformation ✨ Full HD makeover',
    likes: 338,
    comments: 12,
    permalink: 'https://www.instagram.com/shreebeauty.studio/',
  },
  {
    id: 'r2',
    shortcode: '',
    type: 'reel' as const,
    thumbnail: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600&q=80&auto=format&fit=crop',
    embedUrl: null,
    caption: 'Royal Sangeet & Engagement Glam 💍 Soft radiance look',
    likes: 245,
    comments: 8,
    permalink: 'https://www.instagram.com/shreebeauty.studio/',
  },
  {
    id: 'r3',
    shortcode: '',
    type: 'reel' as const,
    thumbnail: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80&auto=format&fit=crop',
    embedUrl: null,
    caption: 'Mehndi Night Glow & Hair Styling 🌙 Timeless charm',
    likes: 198,
    comments: 14,
    permalink: 'https://www.instagram.com/shreebeauty.studio/',
  },
];

interface FeedPostItem {
  id: string;
  shortcode?: string;
  type: 'reel' | 'photo';
  thumbnail: string;
  mediaUrl?: string;
  embedUrl?: string | null;
  caption: string;
  likes: number;
  comments: number;
  permalink: string;
}

// ─── Uniform Square Photo Card (Photos Only) ─────────────────────────
function PhotoCard({ item, defaultUrl }: { item: FeedPostItem; defaultUrl: string }) {
  const [isHovered, setIsHovered] = useState(false);
  const targetUrl = item.permalink || defaultUrl;

  return (
    <a
      href={targetUrl}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'block',
        width: 270,
        height: 270,
        borderRadius: 18,
        overflow: 'hidden',
        position: 'relative',
        flexShrink: 0,
        cursor: 'pointer',
        boxShadow: isHovered
          ? '0 20px 35px rgba(0,0,0,0.25), 0 0 0 2px #EABA38'
          : '0 8px 20px rgba(0,0,0,0.1)',
        transition: 'all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        transform: isHovered ? 'scale(1.04) translateY(-5px)' : 'scale(1)',
        textDecoration: 'none',
        background: '#0f172a',
      }}
    >
      <img
        src={item.thumbnail}
        alt={item.caption || 'Shree Beauty Studio Photo'}
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

      {/* Instagram watermark */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          width: 30,
          height: 30,
          borderRadius: 8,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Instagram size={15} color="#fff" />
      </div>

      {/* Hover overlay with engagement */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: isHovered
            ? 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.88) 100%)'
            : 'linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.55) 100%)',
          transition: 'all 0.35s ease',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#fff', fontSize: 13, fontWeight: 700 }}>
            <Heart size={14} fill="#ff4757" color="#ff4757" />
            {item.likes}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#fff', fontSize: 13, fontWeight: 700 }}>
            <MessageCircle size={14} />
            {item.comments}
          </span>
        </div>

        {isHovered && item.caption && (
          <p
            style={{
              color: '#f1f5f9',
              fontSize: 12,
              lineHeight: 1.4,
              margin: '8px 0 0',
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

// ─── Playable Vertical Reel Card (9:16) ──────────────────────────────
function ReelCard({
  item,
  onPlay,
}: {
  item: FeedPostItem;
  onPlay: (reel: FeedPostItem) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={() => onPlay(item)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: 230,
        height: 400,
        borderRadius: 20,
        overflow: 'hidden',
        position: 'relative',
        flexShrink: 0,
        cursor: 'pointer',
        boxShadow: isHovered
          ? '0 24px 45px rgba(220,39,67,0.35), 0 0 0 3px #EABA38'
          : '0 10px 28px rgba(0,0,0,0.18)',
        transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        transform: isHovered ? 'scale(1.05) translateY(-8px)' : 'scale(1)',
        background: '#0a0f1d',
      }}
    >
      <img
        src={item.thumbnail}
        alt={item.caption || 'Shree Beauty Studio Reel'}
        loading="lazy"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          transition: 'transform 0.5s ease',
          transform: isHovered ? 'scale(1.1)' : 'scale(1)',
        }}
      />

      {/* Reel Badge */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          left: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'linear-gradient(135deg, #f09433, #dc2743, #bc1888)',
          padding: '5px 12px',
          borderRadius: 99,
          color: '#fff',
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '0.04em',
          boxShadow: '0 4px 14px rgba(220,39,67,0.4)',
        }}
      >
        <Film size={12} />
        REEL
      </div>

      {/* Center Animated Play Button on Hover */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: isHovered
            ? 'translate(-50%, -50%) scale(1.15)'
            : 'translate(-50%, -50%) scale(0.9)',
          opacity: isHovered ? 1 : 0.85,
          transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
          width: 58,
          height: 58,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(234,186,56,0.95), rgba(220,39,67,0.95))',
          boxShadow: '0 0 30px rgba(234,186,56,0.6), 0 8px 24px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <Play size={24} fill="#ffffff" color="#ffffff" style={{ marginLeft: 3 }} />
      </div>

      {/* Bottom Info Overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.9) 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#fff', fontSize: 13, fontWeight: 700 }}>
              <Heart size={14} fill="#ff4757" color="#ff4757" />
              {item.likes}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#fff', fontSize: 13, fontWeight: 700 }}>
              <MessageCircle size={14} />
              {item.comments}
            </span>
          </div>

          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#EABA38',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            Play <ChevronRight size={12} />
          </span>
        </div>

        {item.caption && (
          <p
            style={{
              color: '#e2e8f0',
              fontSize: 11.5,
              lineHeight: 1.35,
              margin: 0,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {item.caption}
          </p>
        )}
      </div>
    </div>
  );
}

export default function InstagramFeed() {
  const { data } = useSalonStore();
  const settings = data?.settings;

  const instagramHandle = settings?.instagramHandle || '@shreebeauty.studio';
  const instagramUrl = settings?.instagramUrl || 'https://www.instagram.com/shreebeauty.studio/';

  const [activeTab, setActiveTab] = useState<'reels' | 'photos' | 'all'>('reels');
  const [livePhotos, setLivePhotos] = useState<FeedPostItem[]>(DEFAULT_PHOTOS);
  const [liveReels, setLiveReels] = useState<FeedPostItem[]>(DEFAULT_REELS);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [selectedReel, setSelectedReel] = useState<FeedPostItem | null>(null);

  // Separate scroll refs for independent smooth scrolling
  const photoScrollRef = useRef<HTMLDivElement>(null);
  const reelScrollRef = useRef<HTMLDivElement>(null);
  const [isPhotoPaused, setIsPhotoPaused] = useState(false);
  const [isReelPaused, setIsReelPaused] = useState(false);

  // ─── Fetch live feed from Meta Graph API endpoint ───────────────────
  useEffect(() => {
    let isMounted = true;

    const fetchLiveFeed = async () => {
      try {
        const res = await fetch('/api/instagram/feed');
        if (res.ok) {
          const json = await res.json();
          if (json.success && isMounted) {
            if (Array.isArray(json.photos) && json.photos.length > 0) {
              setLivePhotos(json.photos);
            }
            if (Array.isArray(json.reels) && json.reels.length > 0) {
              setLiveReels(json.reels);
            }
            setIsLiveConnected(true);
          }
        }
      } catch (e) {
        console.warn('Instagram feed fetch error:', e);
      }
    };

    fetchLiveFeed();
    return () => {
      isMounted = false;
    };
  }, []);

  // ─── Auto-scroll for Photo Marquee ──────────────────────────────────
  const allPhotos = [...livePhotos, ...livePhotos, ...livePhotos];
  useEffect(() => {
    const el = photoScrollRef.current;
    if (!el) return;

    let animId: number;
    let scrollPos = 0;
    const speed = 0.55;

    const animate = () => {
      if (!isPhotoPaused && el) {
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
  }, [isPhotoPaused, livePhotos]);

  // ─── Close modal on Escape key ──────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedReel(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <section
      style={{
        padding: 'clamp(56px, 8vw, 96px) 0',
        background: 'linear-gradient(180deg, #f8fafc 0%, #edf2f7 50%, #f1f5f9 100%)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Background glow ambiance */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(circle at 15% 30%, rgba(234,186,56,0.06) 0%, transparent 60%), radial-gradient(circle at 85% 70%, rgba(220,39,67,0.06) 0%, transparent 60%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 2 }}>
        {/* Section Header */}
        <div
          style={{
            textAlign: 'center',
            maxWidth: 720,
            margin: '0 auto',
            padding: '0 20px',
            marginBottom: 'clamp(28px, 4vw, 40px)',
          }}
        >
          {/* Instagram Account Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
              color: '#fff',
              fontSize: 12.5,
              fontWeight: 700,
              padding: '7px 20px',
              borderRadius: 99,
              marginBottom: 18,
              letterSpacing: '0.03em',
              boxShadow: '0 6px 20px rgba(220, 39, 67, 0.35)',
            }}
          >
            <Instagram size={15} />
            {instagramHandle}
            {isLiveConnected && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'rgba(255,255,255,0.25)',
                  padding: '2px 9px',
                  borderRadius: 12,
                  fontSize: 10.5,
                }}
              >
                <Sparkles size={10} /> Live Synced
              </span>
            )}
          </div>

          <h2
            style={{
              fontSize: 'clamp(28px, 4.5vw, 44px)',
              fontWeight: 800,
              color: '#0f172a',
              lineHeight: 1.2,
              margin: '0 0 14px',
              letterSpacing: '-0.025em',
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

          <p style={{ fontSize: 15.5, color: '#64748b', lineHeight: 1.6, margin: 0 }}>
            Behind-the-scenes bridal transformations, beauty tips, trending hairstyles & reels — all live from our Katargam studio.
          </p>

          {/* Tab Switcher: Reels vs Photos */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: '#ffffff',
              padding: 5,
              borderRadius: 99,
              marginTop: 24,
              boxShadow: '0 4px 18px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)',
              gap: 4,
            }}
          >
            <button
              onClick={() => setActiveTab('reels')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 20px',
                borderRadius: 99,
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 700,
                transition: 'all 0.25s ease',
                background:
                  activeTab === 'reels'
                    ? 'linear-gradient(135deg, #05424A, #022B30)'
                    : 'transparent',
                color: activeTab === 'reels' ? '#ffffff' : '#64748b',
                boxShadow: activeTab === 'reels' ? '0 4px 12px rgba(5,66,74,0.3)' : 'none',
              }}
            >
              <Film size={15} color={activeTab === 'reels' ? '#EABA38' : '#64748b'} />
              🎬 Trending Reels ({liveReels.length})
            </button>

            <button
              onClick={() => setActiveTab('photos')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 20px',
                borderRadius: 99,
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 700,
                transition: 'all 0.25s ease',
                background:
                  activeTab === 'photos'
                    ? 'linear-gradient(135deg, #05424A, #022B30)'
                    : 'transparent',
                color: activeTab === 'photos' ? '#ffffff' : '#64748b',
                boxShadow: activeTab === 'photos' ? '0 4px 12px rgba(5,66,74,0.3)' : 'none',
              }}
            >
              <ImageIcon size={15} color={activeTab === 'photos' ? '#EABA38' : '#64748b'} />
              📸 Photo Gallery ({livePhotos.length})
            </button>

            <button
              onClick={() => setActiveTab('all')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 18px',
                borderRadius: 99,
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 700,
                transition: 'all 0.25s ease',
                background:
                  activeTab === 'all'
                    ? 'linear-gradient(135deg, #05424A, #022B30)'
                    : 'transparent',
                color: activeTab === 'all' ? '#ffffff' : '#64748b',
                boxShadow: activeTab === 'all' ? '0 4px 12px rgba(5,66,74,0.3)' : 'none',
              }}
            >
              ✨ Show All
            </button>
          </div>
        </div>

        {/* ─── 1. REELS SHOWCASE (Dedicated Space for Playable Reels) ── */}
        {(activeTab === 'reels' || activeTab === 'all') && (
          <div style={{ marginBottom: activeTab === 'all' ? 48 : 0 }}>
            {activeTab === 'all' && (
              <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Film size={20} color="#EABA38" />
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    🎬 Trending Reels & Makeover Videos
                  </h3>
                </div>
                <span style={{ fontSize: 12.5, color: '#64748b' }}>Click any reel to play</span>
              </div>
            )}

            <div
              ref={reelScrollRef}
              onMouseEnter={() => setIsReelPaused(true)}
              onMouseLeave={() => setIsReelPaused(false)}
              style={{
                display: 'flex',
                gap: 18,
                overflowX: 'auto',
                padding: '12px 24px 24px',
                scrollSnapType: 'x mandatory',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
              }}
            >
              {liveReels.map((reel) => (
                <div key={`reel-${reel.id}`} style={{ scrollSnapAlign: 'start' }}>
                  <ReelCard item={reel} onPlay={(r) => setSelectedReel(r)} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── 2. PHOTO GALLERY (Only Posts / Uniform Square Side-Show) ── */}
        {(activeTab === 'photos' || activeTab === 'all') && (
          <div>
            {activeTab === 'all' && (
              <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ImageIcon size={20} color="#EABA38" />
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    📸 Studio & Bridal Photo Showcase
                  </h3>
                </div>
                <span style={{ fontSize: 12.5, color: '#64748b' }}>Auto-scrolling showcase</span>
              </div>
            )}

            {/* Smooth Marquee (Only Square Photos) */}
            <div
              ref={photoScrollRef}
              onMouseEnter={() => setIsPhotoPaused(true)}
              onMouseLeave={() => setIsPhotoPaused(false)}
              style={{
                display: 'flex',
                gap: 16,
                overflow: 'hidden',
                padding: '8px 0 16px',
                cursor: 'grab',
              }}
            >
              {allPhotos.map((photo, i) => (
                <PhotoCard
                  key={`photo-${photo.id}-${i}`}
                  item={photo}
                  defaultUrl={instagramUrl}
                />
              ))}
            </div>
          </div>
        )}

        {/* Follow CTA Button */}
        <div style={{ textAlign: 'center', marginTop: 'clamp(32px, 4vw, 48px)' }}>
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
              fontSize: 14.5,
              fontWeight: 700,
              padding: '14px 34px',
              borderRadius: 99,
              textDecoration: 'none',
              boxShadow: '0 8px 26px rgba(220, 39, 67, 0.35)',
              transition: 'all 0.3s ease',
              letterSpacing: '0.02em',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px) scale(1.03)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 32px rgba(220, 39, 67, 0.45)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = '';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 26px rgba(220, 39, 67, 0.35)';
            }}
          >
            <Instagram size={18} />
            Follow {instagramHandle} on Instagram
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {/* ─── 3. REEL PLAYER MODAL (Interactive Playback) ─────────────── */}
      {selectedReel && (
        <div
          onClick={() => setSelectedReel(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            animation: 'fadeIn 0.25s ease',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#0d1322',
              borderRadius: 24,
              overflow: 'hidden',
              width: '100%',
              maxWidth: 420,
              boxShadow: '0 30px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1)',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Instagram size={16} color="#EABA38" />
                <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>
                  {instagramHandle} Reel
                </span>
              </div>

              <button
                onClick={() => setSelectedReel(null)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
              >
                <X size={16} />
              </button>
            </div>

            {/* Video Player / Embed Frame */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: 520,
                background: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {selectedReel.shortcode ? (
                <iframe
                  src={`https://www.instagram.com/reel/${selectedReel.shortcode}/embed/`}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                  }}
                  scrolling="no"
                  allowTransparency={true}
                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                />
              ) : (
                <img
                  src={selectedReel.thumbnail}
                  alt={selectedReel.caption}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              )}
            </div>

            {/* Modal Footer / Caption & Actions */}
            <div style={{ padding: '16px 18px', background: '#0d1322' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#fff', fontSize: 13, fontWeight: 700 }}>
                    <Heart size={15} fill="#ff4757" color="#ff4757" />
                    {selectedReel.likes} likes
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#94a3b8', fontSize: 13 }}>
                    <MessageCircle size={15} />
                    {selectedReel.comments}
                  </span>
                </div>

                <a
                  href={selectedReel.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'linear-gradient(135deg, #f09433, #dc2743)',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '6px 14px',
                    borderRadius: 99,
                    textDecoration: 'none',
                  }}
                >
                  Watch on Instagram <ExternalLink size={12} />
                </a>
              </div>

              {selectedReel.caption && (
                <p
                  style={{
                    color: '#94a3b8',
                    fontSize: 12,
                    lineHeight: 1.5,
                    margin: 0,
                    maxHeight: 60,
                    overflowY: 'auto',
                  }}
                >
                  {selectedReel.caption}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
