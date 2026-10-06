'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Instagram, Heart, MessageCircle, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
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

// ─── High-Impact Responsive Photo Card (Single on Mobile, Multi on Desktop) ──
function PhotoCard({ item, defaultUrl }: { item: PhotoPostItem; defaultUrl: string }) {
  const [isHovered, setIsHovered] = useState(false);
  const targetUrl = item.permalink || defaultUrl;

  return (
    <a
      href={targetUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="insta-photo-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'block',
        borderRadius: 22,
        overflow: 'hidden',
        position: 'relative',
        flexShrink: 0,
        cursor: 'pointer',
        boxShadow: isHovered
          ? '0 24px 48px rgba(0,0,0,0.3), 0 0 0 3px #EABA38'
          : '0 10px 28px rgba(0,0,0,0.12)',
        transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        transform: isHovered ? 'scale(1.03) translateY(-4px)' : 'scale(1)',
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

      {/* Overlay with likes & comments */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: isHovered
            ? 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.92) 100%)'
            : 'linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.7) 100%)',
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

        {item.caption && (
          <p
            style={{
              color: '#f8fafc',
              fontSize: 13,
              lineHeight: 1.45,
              margin: '8px 0 0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textShadow: '0 2px 4px rgba(0,0,0,0.6)',
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // ─── Fetch live photo posts from Meta Graph API endpoint ─────────────
  useEffect(() => {
    let isMounted = true;

    const fetchLiveFeed = async () => {
      try {
        const res = await fetch('/api/instagram/feed');
        if (res.ok) {
          const json = await res.json();
          if (json.success && isMounted) {
            const photoList = (json.photos && json.photos.length > 0)
              ? json.photos
              : (json.posts || []);

            if (photoList.length > 0) {
              setLivePhotos(photoList);
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

  // ─── Automatic Slideshow Sliding Loop (Every 2 Seconds) ───────────────
  useEffect(() => {
    if (isPaused || livePhotos.length === 0) return;

    const interval = setInterval(() => {
      const el = scrollRef.current;
      if (!el) return;

      const cardWidth = el.querySelector('.insta-photo-card')?.clientWidth || 360;
      const gap = 20;
      const scrollStep = cardWidth + gap;
      const maxScroll = el.scrollWidth - el.clientWidth;

      if (el.scrollLeft >= maxScroll - 10) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
        setActiveIndex(0);
      } else {
        el.scrollBy({ left: scrollStep, behavior: 'smooth' });
        setActiveIndex((prev) => (prev + 1) % livePhotos.length);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isPaused, livePhotos.length]);

  const handleManualScroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector('.insta-photo-card')?.clientWidth || 360;
    const gap = 20;
    const scrollStep = cardWidth + gap;
    const maxScroll = el.scrollWidth - el.clientWidth;

    if (direction === 'left') {
      if (el.scrollLeft <= 10) {
        el.scrollTo({ left: maxScroll, behavior: 'smooth' });
        setActiveIndex(livePhotos.length - 1);
      } else {
        el.scrollBy({ left: -scrollStep, behavior: 'smooth' });
        setActiveIndex((prev) => Math.max(0, prev - 1));
      }
    } else {
      if (el.scrollLeft >= maxScroll - 10) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
        setActiveIndex(0);
      } else {
        el.scrollBy({ left: scrollStep, behavior: 'smooth' });
        setActiveIndex((prev) => (prev + 1) % livePhotos.length);
      }
    }
  };

  return (
    <section
      style={{
        padding: 'clamp(28px, 3.5vw, 42px) 0 16px 0',
        background: 'linear-gradient(180deg, #f8fafc 0%, #edf2f7 50%, #f1f5f9 100%)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Scoped CSS for slideshow presentation */}
      <style dangerouslySetInnerHTML={{ __html: `
        .insta-marquee-container {
          display: flex;
          overflow-x: auto;
          scroll-behavior: smooth;
          padding: 14px 20px 24px;
          gap: 20px;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }
        .insta-marquee-container::-webkit-scrollbar {
          display: none;
        }
        @media (max-width: 640px) {
          .insta-photo-card {
            width: calc(100vw - 48px) !important;
            max-width: 360px !important;
            height: calc(100vw - 48px) !important;
            max-height: 360px !important;
            scroll-snap-align: center !important;
          }
          .insta-desktop-arrow {
            display: none !important;
          }
        }
        @media (min-width: 641px) {
          .insta-photo-card {
            width: 360px !important;
            height: 360px !important;
          }
        }
      `}} />

      {/* Background glow ambiance */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(circle at 15% 30%, rgba(234,186,56,0.07) 0%, transparent 60%), radial-gradient(circle at 85% 70%, rgba(220,39,67,0.07) 0%, transparent 60%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 2 }}>
        {/* Section Header */}
        <div
          style={{
            textAlign: 'center',
            maxWidth: 760,
            margin: '0 auto',
            padding: '0 20px',
            marginBottom: 'clamp(20px, 3vw, 32px)',
          }}
        >
          {/* Live Slideshow Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#ffffff', padding: '6px 14px', borderRadius: 99, border: '1px solid rgba(220,39,67,0.2)', boxShadow: '0 2px 8px rgba(220,39,67,0.08)', marginBottom: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2743', display: 'inline-block', boxShadow: '0 0 8px #dc2743' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#dc2743', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Live Instagram Slideshow
            </span>
          </div>

          <h2
            style={{
              fontSize: 'clamp(28px, 4.2vw, 42px)',
              fontWeight: 800,
              color: '#0f172a',
              lineHeight: 1.2,
              margin: '0 0 12px',
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

          <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.6, margin: 0 }}>
            Behind-the-scenes bridal transformations, beauty tips, trending hairstyles & more — all live from our Katargam studio.
          </p>
        </div>

        {/* ─── Slideshow Carousel Wrapper with Floating Arrows ──── */}
        <div style={{ position: 'relative', maxWidth: 1440, margin: '0 auto' }}>
          {/* Floating Left Arrow (Desktop) */}
          <button
            onClick={() => handleManualScroll('left')}
            aria-label="Previous slide"
            className="insta-desktop-arrow"
            style={{
              position: 'absolute',
              left: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              width: 46,
              height: 46,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(5,66,74,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#05424a',
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
              transition: 'all 0.25s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
              e.currentTarget.style.background = '#05424a';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
              e.currentTarget.style.color = '#05424a';
            }}
          >
            <ChevronLeft size={24} />
          </button>

          {/* Floating Right Arrow (Desktop) */}
          <button
            onClick={() => handleManualScroll('right')}
            aria-label="Next slide"
            className="insta-desktop-arrow"
            style={{
              position: 'absolute',
              right: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              width: 46,
              height: 46,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(5,66,74,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#05424a',
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
              transition: 'all 0.25s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
              e.currentTarget.style.background = '#05424a';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
              e.currentTarget.style.color = '#05424a';
            }}
          >
            <ChevronRight size={24} />
          </button>

          {/* ─── Scroll Track ──── */}
          <div
            ref={scrollRef}
            className="insta-marquee-container"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => {
              setTimeout(() => setIsPaused(false), 2000);
            }}
          >
            {livePhotos.map((photo, i) => (
              <PhotoCard
                key={`photo-${photo.id}-${i}`}
                item={photo}
                defaultUrl={instagramUrl}
              />
            ))}
          </div>
        </div>

        {/* Slideshow Controls Bar (Pause/Play + Slide Count) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 14,
            marginTop: 8,
          }}
        >
          <button
            onClick={() => handleManualScroll('left')}
            aria-label="Previous photo"
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#ffffff',
              border: '1px solid rgba(0,0,0,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0f172a',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            <ChevronLeft size={16} />
          </button>

          <button
            onClick={() => setIsPaused((prev) => !prev)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: isPaused ? '#fef3c7' : '#f1f5f9',
              color: isPaused ? '#92400e' : '#475569',
              border: '1px solid rgba(0,0,0,0.08)',
              padding: '6px 14px',
              borderRadius: 99,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <span>{isPaused ? '▶ Play Slideshow' : '⏸ Pause'}</span>
          </button>

          <button
            onClick={() => handleManualScroll('right')}
            aria-label="Next photo"
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#ffffff',
              border: '1px solid rgba(0,0,0,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0f172a',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Follow CTA Button */}
        <div style={{ textAlign: 'center', marginTop: 'clamp(14px, 2.5vw, 22px)' }}>
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
              padding: '13px 32px',
              borderRadius: 99,
              textDecoration: 'none',
              boxShadow: '0 8px 24px rgba(220, 39, 67, 0.3)',
              transition: 'all 0.3s ease',
              letterSpacing: '0.02em',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px) scale(1.03)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 32px rgba(220, 39, 67, 0.45)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = '';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(220, 39, 67, 0.3)';
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
