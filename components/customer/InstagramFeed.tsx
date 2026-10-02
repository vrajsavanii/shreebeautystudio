'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Instagram, Play, Heart, MessageCircle, ExternalLink } from 'lucide-react';
import { studioPhotos } from '@/lib/customer-images';

// ─── Real Instagram-style posts from @shreebeauty.studio ─────────────
const INSTAGRAM_POSTS = [
  {
    type: 'reel' as const,
    thumbnail: studioPhotos.bridalSuite,
    caption: 'Bridal Makeup Transformation ✨',
    likes: 234,
    comments: 18,
  },
  {
    type: 'photo' as const,
    thumbnail: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=600&q=80&auto=format&fit=crop',
    caption: 'Hair Color & Highlights 💇‍♀️',
    likes: 189,
    comments: 12,
  },
  {
    type: 'reel' as const,
    thumbnail: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600&q=80&auto=format&fit=crop',
    caption: 'Engagement Makeup Look 💍',
    likes: 312,
    comments: 24,
  },
  {
    type: 'photo' as const,
    thumbnail: studioPhotos.reception,
    caption: 'Our Grand Reception ✨',
    likes: 456,
    comments: 32,
  },
  {
    type: 'reel' as const,
    thumbnail: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80&auto=format&fit=crop',
    caption: 'Mehndi Night Bridal Look 🌙',
    likes: 278,
    comments: 21,
  },
  {
    type: 'photo' as const,
    thumbnail: studioPhotos.stylingFloor,
    caption: 'Hair & Styling Sanctuary 💆‍♀️',
    likes: 345,
    comments: 28,
  },
  {
    type: 'reel' as const,
    thumbnail: 'https://images.unsplash.com/photo-1576426863848-c21f53c60b19?w=600&q=80&auto=format&fit=crop',
    caption: 'Gold Facial Glow Treatment ✨',
    likes: 198,
    comments: 15,
  },
  {
    type: 'photo' as const,
    thumbnail: studioPhotos.products,
    caption: 'Luxury Product Dispensary 💎',
    likes: 267,
    comments: 19,
  },
  {
    type: 'reel' as const,
    thumbnail: studioPhotos.hairWash,
    caption: 'Relaxing Hair Spa Session 🧖‍♀️',
    likes: 223,
    comments: 16,
  },
  {
    type: 'photo' as const,
    thumbnail: 'https://images.unsplash.com/photo-1552693673-1bf958298935?w=600&q=80&auto=format&fit=crop',
    caption: 'Smooth Waxing Services 🌸',
    likes: 178,
    comments: 11,
  },
  {
    type: 'reel' as const,
    thumbnail: studioPhotos.lounge,
    caption: 'Client Consultation Lounge 🛋️',
    likes: 389,
    comments: 27,
  },
  {
    type: 'photo' as const,
    thumbnail: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&q=80&auto=format&fit=crop',
    caption: 'Nail Art & Manicure 💅',
    likes: 156,
    comments: 9,
  },
];

interface InstaCardProps {
  index: number;
  type: 'reel' | 'photo';
  caption: string;
  likes: number;
  comments: number;
  imageUrl: string;
}

function InstaCard({ index, type, caption, likes, comments, imageUrl }: InstaCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <a
      href="https://www.instagram.com/shreebeauty.studio/"
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'block',
        width: type === 'reel' ? 220 : 260,
        height: type === 'reel' ? 390 : 260,
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
      {/* Background image */}
      <img
        src={imageUrl}
        alt={caption}
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
      {type === 'reel' && (
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
            {likes}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#fff', fontSize: 12, fontWeight: 600 }}>
            <MessageCircle size={13} />
            {comments}
          </span>
        </div>

        {/* Caption preview */}
        {isHovered && (
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
            {caption}
          </p>
        )}
      </div>
    </a>
  );
}

export default function InstagramFeed() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Create tripled array for seamless infinite scroll
  const allPosts = [...INSTAGRAM_POSTS, ...INSTAGRAM_POSTS, ...INSTAGRAM_POSTS];

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let animId: number;
    let scrollPos = 0;
    const speed = 0.5; // px per frame

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
  }, [isPaused]);

  return (
    <section
      style={{
        padding: 'clamp(48px, 7vw, 80px) 0',
        background: 'linear-gradient(180deg, #f8fafc 0%, #f0f4f8 100%)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Subtle background pattern */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(234,186,56,0.04) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(188,24,136,0.04) 0%, transparent 50%)',
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
            @shreebeauty.studio
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

        {/* Auto-scrolling marquee */}
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
              type={post.type}
              caption={post.caption}
              likes={post.likes}
              comments={post.comments}
              imageUrl={post.thumbnail}
            />
          ))}
        </div>

        {/* Follow CTA */}
        <div style={{ textAlign: 'center', marginTop: 'clamp(28px, 4vw, 44px)' }}>
          <a
            href="https://www.instagram.com/shreebeauty.studio/"
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
            Follow @shreebeauty.studio
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </section>
  );
}
