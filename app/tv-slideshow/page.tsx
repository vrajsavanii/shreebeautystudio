'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Star,
  Instagram,
  Wifi,
  WifiOff,
  Clock,
  MapPin,
  Settings,
  X,
  Volume2,
  VolumeX,
  Sliders
} from 'lucide-react';
import { useSalonStore } from '@/lib/store';
import { TvSlideItem, TvSlideshowSettings } from '@/types/salon';
import {
  DEFAULT_TV_SLIDES,
  DEFAULT_TV_SLIDESHOW_SETTINGS,
  loadAllSlidesFromLocalDb,
  syncTvSlidesWithCloud,
  isNetworkOnline
} from '@/lib/tv-slideshow-storage';

export default function TvSlideshowFullscreenPage() {
  const { data } = useSalonStore();
  const settings = data?.settings;
  const cloudSlides = data?.tvSlides && data.tvSlides.length > 0 ? data.tvSlides : DEFAULT_TV_SLIDES;
  const tvSettings: TvSlideshowSettings = data?.tvSlideshowSettings || DEFAULT_TV_SLIDESHOW_SETTINGS;

  const [slides, setSlides] = useState<TvSlideItem[]>(cloudSlides);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [slideDuration, setSlideDuration] = useState<number>(tvSettings.slideDurationSeconds || 7);
  const [transitionEffect, setTransitionEffect] = useState<'kenburns' | 'fade' | 'zoom' | 'slide'>(
    tvSettings.transitionEffect || 'kenburns'
  );
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);

  // Active slides only
  const activeSlides = slides.filter((s) => s.active !== false);
  const currentSlide = activeSlides[currentIndex] || activeSlides[0] || DEFAULT_TV_SLIDES[0];

  // 1. Initialize slides from local drive / cloud & sync
  useEffect(() => {
    let isMounted = true;

    const initSlides = async () => {
      setIsOnline(isNetworkOnline());
      try {
        const { synced, isOffline } = await syncTvSlidesWithCloud(cloudSlides);
        if (isMounted) {
          if (synced && synced.length > 0) setSlides(synced);
          setIsOnline(!isOffline);
        }
      } catch {
        const local = await loadAllSlidesFromLocalDb();
        if (isMounted && local.length > 0) setSlides(local);
      }
    };

    initSlides();

    // Listen to network online / offline events
    const handleOnline = () => {
      setIsOnline(true);
      syncTvSlidesWithCloud(cloudSlides).then(({ synced }) => {
        if (synced && synced.length > 0) setSlides(synced);
      });
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      isMounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [cloudSlides]);

  // 2. Real-time Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setCurrentDate(
        now.toLocaleDateString('en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 3. Slideshow Rotation Timer
  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % (activeSlides.length || 1));
  }, [activeSlides.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + activeSlides.length) % (activeSlides.length || 1));
  }, [activeSlides.length]);

  useEffect(() => {
    if (!isPlaying || activeSlides.length <= 1) return;
    const timer = setInterval(nextSlide, slideDuration * 1000);
    return () => clearInterval(timer);
  }, [isPlaying, slideDuration, nextSlide, activeSlides.length]);

  // 4. Auto-hide mouse & controls after 3.5s of no movement
  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      if (!showSettingsModal) setShowControls(false);
    }, 3500);
  };

  // 5. Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // 6. Keyboard Shortcuts: Space (Play/Pause), Left/Right (Nav), F (Fullscreen)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key === 'ArrowRight') {
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        prevSlide();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#021517',
        color: '#ffffff',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        userSelect: 'none',
        cursor: showControls ? 'default' : 'none',
      }}
    >
      {/* ── 4K TV Slideshow Screen (2160×1440 / Fullscreen Canvas) ── */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <AnimatePresence mode="wait">
          {currentSlide && (
            <motion.div
              key={currentSlide.id + currentIndex}
              initial={{
                opacity: 0,
                scale: transitionEffect === 'zoom' ? 1.08 : 1,
              }}
              animate={{
                opacity: 1,
                scale: transitionEffect === 'kenburns' ? [1, 1.06] : 1,
                x: transitionEffect === 'slide' ? [40, 0] : 0,
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: transitionEffect === 'fade' ? 1.2 : 1.6,
                ease: 'easeInOut',
              }}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Blurred Studio Backdrop */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: `url(${currentSlide.url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'blur(45px) brightness(0.28) saturate(1.4)',
                  transform: 'scale(1.2)',
                  pointerEvents: 'none',
                }}
              />

              {/* Dark Radial Vignette */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'radial-gradient(circle at center, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 100%)',
                  pointerEvents: 'none',
                }}
              />

              {/* Main Crisp 4K / 2160×1440 Picture */}
              <img
                src={currentSlide.url}
                alt={currentSlide.title || 'Salon Slide'}
                style={{
                  maxWidth: '92vw',
                  maxHeight: '84vh',
                  objectFit: 'contain',
                  borderRadius: 14,
                  boxShadow: '0 25px 70px rgba(0, 0, 0, 0.85), 0 0 0 3px rgba(234, 186, 56, 0.4)',
                  zIndex: 2,
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Top TV Header (Studio Logo, Time, Date & Network Status) ── */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '24px 36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(180deg, rgba(2, 21, 23, 0.88) 0%, rgba(2, 21, 23, 0) 100%)',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        {/* Studio Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #05424a, #eaba38)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 18px rgba(234, 186, 56, 0.4)',
              border: '2px solid rgba(234, 186, 56, 0.8)',
            }}
          >
            <Sparkles size={26} color="#ffffff" />
          </div>
          <div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                letterSpacing: '0.04em',
                color: '#eaba38',
                textShadow: '0 2px 10px rgba(0,0,0,0.8)',
              }}
            >
              SHREE BEAUTY STUDIO
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.02em', fontWeight: 600 }}>
              Bridal Makeover Sanctuary • Katargam, Surat
            </div>
          </div>
        </div>

        {/* Digital Clock & Offline Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* Network / Local Drive Cache Status */}
          <div
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              background: isOnline ? 'rgba(34, 197, 94, 0.18)' : 'rgba(234, 179, 8, 0.22)',
              border: `1.5px solid ${isOnline ? 'rgba(34, 197, 94, 0.5)' : 'rgba(234, 179, 8, 0.5)'}`,
              color: isOnline ? '#4ade80' : '#fef08a',
              fontSize: 12,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              backdropFilter: 'blur(8px)',
            }}
          >
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{isOnline ? '● 4K Ultra-HD Live Sync' : '🟡 Local Drive Cache (100% Offline)'}</span>
          </div>

          {/* Clock */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#ffffff', letterSpacing: '0.03em', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
              {currentTime}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>
              {currentDate}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Luxury TV Info Banner ── */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '24px 36px',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          background: 'linear-gradient(0deg, rgba(2, 21, 23, 0.95) 0%, rgba(2, 21, 23, 0) 100%)',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        {/* Slide Title & Category */}
        <div style={{ maxWidth: '60%' }}>
          {currentSlide.category && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                textTransform: 'uppercase',
                background: 'rgba(234, 186, 56, 0.2)',
                color: '#eaba38',
                border: '1px solid rgba(234, 186, 56, 0.45)',
                padding: '4px 12px',
                borderRadius: 999,
                display: 'inline-block',
                marginBottom: 8,
                letterSpacing: '0.06em',
              }}
            >
              ✨ {currentSlide.category}
            </span>
          )}
          <h2
            style={{
              fontSize: 28,
              fontWeight: 900,
              margin: '0 0 4px',
              color: '#ffffff',
              textShadow: '0 2px 12px rgba(0,0,0,0.9)',
              letterSpacing: '-0.01em',
            }}
          >
            {currentSlide.title || 'Shree Beauty Studio'}
          </h2>
          {currentSlide.caption && (
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', margin: 0, textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}>
              {currentSlide.caption}
            </p>
          )}
        </div>

        {/* Google 5-Star Rating & Social Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Google Review Badge */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              borderRadius: 12,
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', gap: 2 }}>
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={15} fill="#eab308" color="#eab308" />
              ))}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, color: '#ffffff' }}>5.0 ★ Google Rating</div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.75)' }}>210+ Verified Reviews</div>
            </div>
          </div>

          {/* Instagram Handle */}
          <div
            style={{
              background: 'linear-gradient(45deg, rgba(240, 148, 51, 0.2), rgba(220, 39, 67, 0.2))',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(220, 39, 67, 0.4)',
              borderRadius: 12,
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Instagram size={18} color="#f43f5e" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#ffffff' }}>@shreebeauty.studio</div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.75)' }}>Follow for Bridal Looks</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Slide Progress Bar ── */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 4,
          background: 'rgba(255,255,255,0.15)',
          zIndex: 20,
        }}
      >
        <motion.div
          key={currentIndex + (isPlaying ? 'playing' : 'paused')}
          initial={{ width: '0%' }}
          animate={{ width: isPlaying ? '100%' : '0%' }}
          transition={{ duration: slideDuration, ease: 'linear' }}
          style={{ height: '100%', background: 'linear-gradient(90deg, #eaba38, #f43f5e)' }}
        />
      </div>

      {/* ── Floating Controls Bar (Appears on Mouse Movement) ── */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'absolute',
              bottom: 80,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(2, 21, 23, 0.9)',
              backdropFilter: 'blur(16px)',
              border: '1.5px solid rgba(234, 186, 56, 0.4)',
              borderRadius: 999,
              padding: '8px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
              zIndex: 30,
            }}
          >
            <button
              type="button"
              onClick={prevSlide}
              className="btn btn-ghost btn-sm"
              style={{ color: '#fff', padding: '6px 10px', borderRadius: '50%' }}
              title="Previous Slide (Left Arrow)"
            >
              <ChevronLeft size={20} />
            </button>

            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="btn btn-sm"
              style={{
                background: 'linear-gradient(45deg, #05424a, #eaba38)',
                color: '#fff',
                fontWeight: 800,
                border: 'none',
                padding: '6px 14px',
                borderRadius: 999,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
              title="Play / Pause (Spacebar)"
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>

            <button
              type="button"
              onClick={nextSlide}
              className="btn btn-ghost btn-sm"
              style={{ color: '#fff', padding: '6px 10px', borderRadius: '50%' }}
              title="Next Slide (Right Arrow)"
            >
              <ChevronRight size={20} />
            </button>

            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.2)' }} />

            <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
              {currentIndex + 1} / {activeSlides.length}
            </span>

            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.2)' }} />

            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="btn btn-ghost btn-sm"
              style={{ color: '#eaba38', padding: '6px 10px' }}
              title="Slideshow Speed & Effect Settings"
            >
              <Sliders size={18} />
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="btn btn-ghost btn-sm"
              style={{ color: '#fff', padding: '6px 10px' }}
              title="Toggle Fullscreen (F)"
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>

            <Link
              href="/admin/instagram"
              className="btn btn-ghost btn-xs"
              style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 700 }}
            >
              Exit to Admin ↗
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Settings Modal ── */}
      <AnimatePresence>
        {showSettingsModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50,
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card"
              style={{
                width: '90%',
                maxWidth: 440,
                borderRadius: 20,
                padding: 24,
                background: '#042226',
                border: '1.5px solid rgba(234, 186, 56, 0.5)',
                color: '#ffffff',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sliders size={20} color="#eaba38" />
                  <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: '#eaba38' }}>
                    TV Slideshow Display Settings
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Duration */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>
                    ⏱️ Seconds Per Slide: ({slideDuration}s)
                  </label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[3, 5, 7, 10, 15].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setSlideDuration(sec)}
                        className={`btn btn-xs ${slideDuration === sec ? 'btn-primary' : 'btn-secondary'}`}
                        style={{
                          flex: 1,
                          fontWeight: 700,
                          background: slideDuration === sec ? '#eaba38' : undefined,
                          color: slideDuration === sec ? '#000' : undefined,
                        }}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>

                {/* Transition Effect */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>
                    🎬 Transition Effect:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {[
                      { id: 'kenburns', label: 'Ken Burns Pan & Zoom' },
                      { id: 'fade', label: 'Smooth Cross-Fade' },
                      { id: 'zoom', label: 'Cinematic Zoom-In' },
                      { id: 'slide', label: 'Horizontal Slide' },
                    ].map((eff) => (
                      <button
                        key={eff.id}
                        type="button"
                        onClick={() => setTransitionEffect(eff.id as any)}
                        className={`btn btn-xs ${transitionEffect === eff.id ? 'btn-primary' : 'btn-secondary'}`}
                        style={{
                          fontWeight: 700,
                          fontSize: 11,
                          background: transitionEffect === eff.id ? '#eaba38' : undefined,
                          color: transitionEffect === eff.id ? '#000' : undefined,
                        }}
                      >
                        {eff.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="btn btn-primary"
                  style={{
                    background: 'linear-gradient(45deg, #05424a, #eaba38)',
                    border: 'none',
                    fontWeight: 800,
                    color: '#fff',
                    marginTop: 8,
                  }}
                >
                  Save &amp; Continue Playing
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
