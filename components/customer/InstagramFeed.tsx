'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Instagram, Heart, MessageCircle, ExternalLink, Sparkles } from 'lucide-react';
import { studioPhotos } from '@/lib/customer-images';
import { useSalonStore } from '@/lib/store';

// ─── Default Fallback Curated Photos ─────────────────────────────────
const DEFAULT_PHOTOS = [
  {
    id: 'p1',
    thumbnail: studioPhotos.reception,
    caption: 'Our Grand Reception ✨ Welcome to luxury salon experience in Katargam',
    likes: 456,
    comments: 32,
    permalink: 'https://www.instagram.com/shreebeauty.studio/',
  },
  {
    id: 'p2',
    thumbnail: studioPhotos.stylingFloor,
    caption: 'Hair & Styling Sanctuary 💆‍♀️ Arched LED styling stations & plush chairs',
    likes: 345,
    comments: 28,
    permalink: 'https://www.instagram.com/shreebeauty.studio/',
  },
  {
    id: 'p3',
    thumbnail: studioPhotos.bridalSuite,
    caption: 'Private Couture Bridal Suite 👰 VIP makeover vanity for wedding prep',
    likes: 389,
    comments: 31,
    permalink: 'https://www.instagram.com/shreebeauty.studio/',
  },
  {
    id: 'p4',
    thumbnail: studioPhotos.products,
    caption: '100% Genuine Luxury Formulations 💎 L’Oréal & Selective Professional',
    likes: 267,
    comments: 19,
    permalink: 'https://www.instagram.com/shreebeauty.studio/',
  },
  {
    id: 'p5',
    thumbnail: studioPhotos.hairWash,
    caption: 'Ergonomic Hair Spa Backwash 🧖‍♀️ Relaxing scalp therapies & wash stations',
    likes: 223,
    comments: 16,
    permalink: 'https://www.instagram.com/shreebeauty.studio/',
  },
  {
    id: 'p6',
    thumbnail: studioPhotos.lounge,
    caption: 'Client Consultation Lounge 🛋️ 25+ years industry achievement showcase',
    likes: 312,
    comments: 24,
    permalink: 'https://www.instagram.com/shreebeauty.studio/',
  },
];

interface PhotoPostItem {
  id: string;
  thumbnail: string;
  caption: string;
  likes: number;
  comments: number;
  permalink: string;
}

// ─── Large High-Impact Photo Card (360×360px) ────────────────────────
function PhotoCard({ item, defaultUrl }: { item: PhotoPostItem; defaultUrl: string }) {
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
        width: 'clamp(300px, 24vw, 380px)',
        height: 'clamp(300px, 24vw, 380px)',
        borderRadius: 22,
        overflow: 'hidden',
        position: 'relative',
        flexShrink: 0,
        cursor: 'pointer',
        boxShadow: isHovered
          ? '0 24px 48px rgba(0,0,0,0.3), 0 0 0 3px #EABA38'
          : '0 10px 28px rgba(0,0,0,0.12)',
        transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        transform: isHovered ? 'scale(1.04) translateY(-6px)' : 'scale(1)',
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
          transition: 'transform 0.55s ease',
          transform: isHovered ? 'scale(1.08)' : 'scale(1)',
        }}
      />

      {/* Instagram watermark */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          left: 14,
          width: 34,
          height: 34,
          borderRadius: 10,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
      >
        <Instagram size={17} color="#fff" />
      </div>

      {/* Hover overlay with engagement */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: isHovered
            ? 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.9) 100%)'
            : 'linear-gradient(180deg, transparent 55%, rgba(0,0,0,0.6) 100%)',
          transition: 'all 0.35s ease',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fff', fontSize: 14, fontWeight: 750 }}>
            <Heart size={16} fill="#ff4757" color="#ff4757" />
            {item.likes}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fff', fontSize: 14, fontWeight: 750 }}>
            <MessageCircle size={16} />
            {item.comments}
          </span>
        </div>

        {isHovered && item.caption && (
          <p
            style={{
              color: '#f8fafc',
              fontSize: 13,
              lineHeight: 1.45,
              margin: '10px 0 0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textShadow: '0 2px 4px rgba(0,0,0,0.5)',
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

  const [livePhotos, setLivePhotos] = useState<PhotoPostItem[]>(DEFAULT_PHOTOS);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  // ─── Fetch live photo posts from Meta Graph API endpoint ─────────────
  useEffect(() => {
    let isMounted = true;

    const fetchLiveFeed = async () => {
      try {
        const res = await fetch('/api/instagram/feed');
        if (res.ok) {
          const json = await res.json();
          if (json.success && isMounted) {
            // Use photos specifically, or all posts if no photos
            const photoList = (json.photos && json.photos.length > 0)
              ? json.photos
              : (json.posts || []);

            if (photoList.length > 0) {
              setLivePhotos(photoList);
              setIsLiveConnected(true);
            }
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

  // Tripled array for seamless infinite loop
  const allPhotos = [...livePhotos, ...livePhotos, ...livePhotos];

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
  }, [isPaused, livePhotos]);

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
            marginBottom: 'clamp(32px, 5vw, 48px)',
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
            Behind-the-scenes bridal transformations, beauty tips, trending hairstyles & more — all live from our Katargam studio.
          </p>
        </div>

        {/* ─── Seamless Infinite Marquee (Only Square Photo Posts) ──── */}
        <div
          ref={scrollRef}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          style={{
            display: 'flex',
            gap: 20,
            overflow: 'hidden',
            padding: '12px 0 24px',
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
    </section>
  );
}
