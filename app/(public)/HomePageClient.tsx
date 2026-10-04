'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, MapPin, Phone, Star, ChevronRight, ChevronLeft, Award,
  ShieldCheck, Sparkles, MessageCircle, Gem, ArrowRight,
  CheckCircle2, Camera, Eye, Crown, Users
} from 'lucide-react';
import {
  studioPhotos, STUDIO_GALLERY, StudioGalleryItem, customerImages,
  getCategoryIcon, getCategoryImage, getServiceImage
} from '@/lib/customer-images';
import { useSalonStore, DEFAULT_DATA } from '@/lib/store';
import { getServicePricingBasis } from '@/lib/utils';
import StudioMap3D from '@/components/customer/StudioMap3D';
import InstagramFeed from '@/components/customer/InstagramFeed';

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

// Curated 100% Unique Real Google Reviews from Shree Beauty Studio (Surat)
const GOOGLE_REVIEWS_ROW1 = [
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
];

const GOOGLE_REVIEWS_ROW2 = [
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
  {
    text: "Amazing service and results. Years of experience truly show in their work. Super clean, sweet, and caring stylists.",
    name: "Krupali Pavasia",
    role: "Regular Client · Surat",
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocIVao1NL3VuOgOx-xQlY1md8ANeCvJSmZGMpCZDrSnewy2FjQ=s120-c-rp-mo-br100",
    rating: 5,
  },
  {
    text: "Fabulous service, great results, very friendly staff, will definitely be coming again for hair and skin treatments.",
    name: "Shraddha Bhikadiya",
    role: "Regular Client · Surat",
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocLz74xeHef_agT472bWmvBHu7cnP4GFpQTzBwIFZwtDLaEJhA=s120-c-rp-mo-br100",
    rating: 5,
  },
  {
    text: "This place is very good and services are top-notch. Staff is friendly, knowledgeable, and kind to every client.",
    name: "Geeta Patel",
    role: "Regular Client · Surat",
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocJ5CSlmoCskerSlsgLMNxLun50RhXAeUPdxDbY9uBi55NNiFQ=s120-c-rp-mo-br100",
    rating: 5,
  },
];

// Category Descriptions & Taglines
const CATEGORY_META: Record<string, { tagline: string; description: string }> = {
  'Hair Care & Styling': {
    tagline: 'Couture Styling & Repair',
    description: 'Precision haircuts, restorative hair spas, Keratin smoothing, and Nanoplastia treatments tailored for Surat weather.',
  },
  'Skin Care & Facials': {
    tagline: 'Dermatological Radiance',
    description: 'Herbal cleanups, Hydra Facials, Gold & Diamond glow therapies that reverse humidity dullness and sun tan.',
  },
  'Waxing & Threading': {
    tagline: 'Gentle & Painless Grooming',
    description: 'Ultra-gentle Italian Rica peel-off wax, natural honey wax, and painless threading by senior estheticians.',
  },
  'Hands, Feet & Nails': {
    tagline: 'Luxury Podiatry & Nail Art',
    description: 'Relaxing foot spas, French manicures, and lasting builder gel nail extensions with custom artistic finishes.',
  },
};

export default function PublicHomePage() {
  const { data } = useSalonStore();
  const settings = data?.settings;
  const services = (data?.services && data.services.length > 0) ? data.services : DEFAULT_DATA.services;

  // Real Studio Ambiance Showcase State & Automatic Slideshow
  const [activeAmbianceId, setActiveAmbianceId] = useState<string>('reception');
  const [isAmbiancePaused, setIsAmbiancePaused] = useState<boolean>(false);

  // Live Auto-Imported Google Reviews State
  const [reviewsRow1, setReviewsRow1] = useState(GOOGLE_REVIEWS_ROW1);
  const [reviewsRow2, setReviewsRow2] = useState(GOOGLE_REVIEWS_ROW2);
  const [googleRating, setGoogleRating] = useState<number>(4.9);
  const [googleReviewCount, setGoogleReviewCount] = useState<number>(210);

  useEffect(() => {
    let isMounted = true;
    const fetchLiveReviews = async () => {
      try {
        const res = await fetch('/api/google-reviews');
        if (res.ok) {
          const json = await res.json();
          if (json.success && isMounted) {
            if (json.row1 && json.row1.length > 0) setReviewsRow1(json.row1);
            if (json.row2 && json.row2.length > 0) setReviewsRow2(json.row2);
            if (json.rating) setGoogleRating(json.rating);
            if (json.totalReviews) setGoogleReviewCount(json.totalReviews);
          }
        }
      } catch (e) {
        console.warn('Live Google Reviews fetch error:', e);
      }
    };
    fetchLiveReviews();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isAmbiancePaused) return;
    const interval = setInterval(() => {
      setActiveAmbianceId((currentId) => {
        const currentIndex = STUDIO_GALLERY.findIndex((item) => item.id === currentId);
        const nextIndex = (currentIndex + 1) % STUDIO_GALLERY.length;
        return STUDIO_GALLERY[nextIndex].id;
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [isAmbiancePaused]);

  const handlePrevAmbiance = () => {
    setActiveAmbianceId((currentId) => {
      const currentIndex = STUDIO_GALLERY.findIndex((item) => item.id === currentId);
      const prevIndex = (currentIndex - 1 + STUDIO_GALLERY.length) % STUDIO_GALLERY.length;
      return STUDIO_GALLERY[prevIndex].id;
    });
  };

  const handleNextAmbiance = () => {
    setActiveAmbianceId((currentId) => {
      const currentIndex = STUDIO_GALLERY.findIndex((item) => item.id === currentId);
      const nextIndex = (currentIndex + 1) % STUDIO_GALLERY.length;
      return STUDIO_GALLERY[nextIndex].id;
    });
  };

  const salonName = settings?.salon || 'Shree Beauty Studio';
  const address = settings?.address || '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004';
  const whatsapp = settings?.whatsapp || '919824183769';
  const openTime = settings?.open || '10:00';
  const closeTime = settings?.close || '19:00';
  const openDays = settings?.openDays || 'Open All 7 Days';
  const googleMapsUrl = settings?.googleMapsUrl || 'https://maps.app.goo.gl/cwP9HTnqTFzVPYDW8';

  // Group services by category
  const categories = Array.from(new Set(services.map((s) => s.category || 'Special Treatments'))).slice(0, 6);

  const activeAmbiance = STUDIO_GALLERY.find((item) => item.id === activeAmbianceId) || STUDIO_GALLERY[0];

  return (
    <div style={{ backgroundColor: '#FAF9F6', color: '#0F172A', minHeight: '100vh' }}>
      {/* ─── 1. HERO SECTION (Asymmetric Split Editorial Luxury) ────────── */}
      <section
        className="cust-hero-v3"
        style={{
          backgroundImage: `radial-gradient(circle at 10% 20%, rgba(5,66,74,0.95) 0%, rgba(3,43,48,0.98) 70%, rgba(2,30,34,1) 100%)`,
        }}
      >
        {/* Floating Ambient Glow Orbs (Teal & Gold only) */}
        <div className="floating-orb floating-orb-gold" style={{ width: 550, height: 550, top: '-20%', left: '-10%', opacity: 0.35 }} />
        <div className="floating-orb floating-orb-teal" style={{ width: 600, height: 600, bottom: '-25%', right: '-10%', opacity: 0.4 }} />

        <div className="cust-hero-split">
          {/* Left Column: Editorial Headline & Actions */}
          <motion.div initial="hidden" animate="visible" variants={stagger} className="cust-hero-text-col">
            <motion.h1
              className="display-font"
              variants={fadeUp}
              style={{
                fontSize: 'clamp(32px, 4.4vw, 56px)',
                fontWeight: 700,
                lineHeight: 1.14,
                color: '#FFFFFF',
                margin: '0 0 16px',
                letterSpacing: '-0.02em',
              }}
            >
              Best Ladies Beauty Salon &amp;{' '}
              <br />
              <span style={{ color: '#D4AF37' }}>Bridal Studio in Katargam, Surat</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              style={{
                fontSize: 'clamp(14.5px, 1.5vw, 16.5px)',
                lineHeight: 1.65,
                color: 'rgba(255, 255, 255, 0.88)',
                maxWidth: 560,
                margin: '0 0 20px',
              }}
            >
              Step into Surat&apos;s premier beauty studio and ladies salon sanctuary. Renowned across Katargam
              for bespoke bridal makeovers, restorative hair treatments, and clinical skin care therapies crafted
              exclusively with 100% genuine sealed international luxury formulations.
            </motion.p>

            <motion.div
              variants={fadeUp}
              className="cust-hero-btn-row"
              style={{ marginBottom: 20 }}
            >
              <Link href="/book" className="cust-btn-primary btn-glow">
                <Calendar size={16} />
                <span>Book Appointment</span>
              </Link>

              <Link href="/services" className="cust-btn-secondary">
                <span>View Menu &amp; Prices</span>
                <ArrowRight size={15} />
              </Link>

              <a
                href={`https://wa.me/${whatsapp}?text=Hi%20Shree%20!%0AWhatsApp%20Message`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'linear-gradient(135deg, #25D366 0%, #1EAA52 100%)',
                  color: '#053320',
                  fontWeight: 700,
                  fontSize: 14,
                  padding: '11px 20px',
                  borderRadius: 99,
                  textDecoration: 'none',
                  boxShadow: '0 6px 20px rgba(37, 211, 102, 0.35)',
                }}
              >
                <MessageCircle size={16} />
                <span>WhatsApp</span>
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── 2. STATS & HERITAGE STRIP ───────────────────────────── */}
      <div className="cust-stats-strip">
        <div className="cust-stat-item">
          <div>
            <div className="cust-stat-number">5,000+</div>
            <div className="cust-stat-label">Happy Brides &amp; Clients</div>
          </div>
        </div>
        <div className="cust-stat-item">
          <div>
            <div className="cust-stat-number">25+</div>
            <div className="cust-stat-label">Years of Aesthetic Mastery</div>
          </div>
        </div>
        <div className="cust-stat-item">
          <div>
            <div className="cust-stat-number">4.9★</div>
            <div className="cust-stat-label">Google Maps Rating</div>
          </div>
        </div>
        <div className="cust-stat-item">
          <div>
            <div className="cust-stat-number">100%</div>
            <div className="cust-stat-label">Authentic Luxury Formulations</div>
          </div>
        </div>
      </div>

      {/* ─── 3. NEW: VIRTUAL STUDIO AMBIANCE TOUR (Actual Place Photos) ── */}
      <section
        className="cust-studio-section"
        id="studio-tour"
        onMouseEnter={() => setIsAmbiancePaused(true)}
        onMouseLeave={() => setIsAmbiancePaused(false)}
      >
        <div className="cust-studio-header">
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(5, 66, 74, 0.08)',
              color: '#05424A',
              border: '1px solid rgba(5, 66, 74, 0.2)',
              borderRadius: 99,
              padding: '6px 18px',
              fontSize: 12.5,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: 14,
            }}
          >
            <Camera size={13} color="#05424A" /> Inside Our Salon Sanctuary
          </span>
          <h2
            className="display-font"
            style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, color: '#032B30', margin: '0 0 14px' }}
          >
            Step Inside Our Katargam Sanctuary
          </h2>
          <p style={{ fontSize: 16, color: '#475569', lineHeight: 1.6, maxWidth: 640, margin: '0 auto' }}>
            Designed for unhurried comfort, aesthetic luxury, and absolute hygiene. Browse our actual salon
            spaces before you arrive.
          </p>
        </div>

        {/* Space Selector Tabs */}
        <div className="cust-studio-tabs-row">
          {STUDIO_GALLERY.map((item) => {
            const isActive = item.id === activeAmbianceId;
            return (
              <button
                key={item.id}
                type="button"
                className={`cust-studio-tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => setActiveAmbianceId(item.id)}
              >
                <span>{item.tag}</span>
              </button>
            );
          })}
        </div>

        {/* Main Display Grid */}
        <div className="cust-studio-display-grid">
          {/* Main Visual: All images mounted, pure CSS opacity crossfade — 0 blink, 0 lag */}
          <div className="cust-studio-main-card">
            {STUDIO_GALLERY.map((item) => {
              const isActive = item.id === activeAmbianceId;
              return (
                <img
                  key={item.id}
                  src={item.image}
                  alt={item.title}
                  className="cust-studio-main-img"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: isActive ? 1 : 0,
                    transform: isActive ? 'scale(1)' : 'scale(1.04)',
                    transition: 'opacity 0.6s ease-in-out, transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    pointerEvents: 'none',
                  }}
                />
              );
            })}

            {/* Slide Index Indicators */}
            <div
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                zIndex: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(3, 43, 48, 0.8)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                padding: '4px 10px',
                borderRadius: 99,
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              {STUDIO_GALLERY.map((item) => {
                const isCurrent = item.id === activeAmbianceId;
                return (
                  <div
                    key={item.id}
                    onClick={() => setActiveAmbianceId(item.id)}
                    style={{
                      width: isCurrent ? 20 : 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: isCurrent ? '#D4AF37' : 'rgba(255, 255, 255, 0.4)',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                    }}
                    title={item.tag}
                  />
                );
              })}
            </div>

            {/* Navigation Arrows */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrevAmbiance();
              }}
              aria-label="Previous space"
              style={{
                position: 'absolute',
                top: '50%',
                left: 14,
                transform: 'translateY(-50%)',
                zIndex: 4,
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: 'rgba(3, 43, 48, 0.75)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.background = 'rgba(212, 175, 55, 0.95)';
                el.style.color = '#032B30';
                el.style.transform = 'translateY(-50%) scale(1.08)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.background = 'rgba(3, 43, 48, 0.75)';
                el.style.color = '#FFFFFF';
                el.style.transform = 'translateY(-50%) scale(1)';
              }}
            >
              <ChevronLeft size={20} />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNextAmbiance();
              }}
              aria-label="Next space"
              style={{
                position: 'absolute',
                top: '50%',
                right: 14,
                transform: 'translateY(-50%)',
                zIndex: 4,
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: 'rgba(3, 43, 48, 0.75)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.background = 'rgba(212, 175, 55, 0.95)';
                el.style.color = '#032B30';
                el.style.transform = 'translateY(-50%) scale(1.08)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.background = 'rgba(3, 43, 48, 0.75)';
                el.style.color = '#FFFFFF';
                el.style.transform = 'translateY(-50%) scale(1)';
              }}
            >
              <ChevronRight size={20} />
            </button>

            <div className="cust-studio-overlay" style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
              <span
                style={{
                  background: 'rgba(212, 175, 55, 0.9)',
                  color: '#032B30',
                  padding: '4px 12px',
                  borderRadius: 99,
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  display: 'inline-block',
                  alignSelf: 'flex-start',
                  marginBottom: 8,
                }}
              >
                {activeAmbiance.subtitle}
              </span>
              <h3 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700, color: '#FFFFFF', transition: 'all 0.3s ease' }}>
                {activeAmbiance.title}
              </h3>
              <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.9)', lineHeight: 1.5, maxWidth: 540, transition: 'all 0.3s ease' }}>
                {activeAmbiance.description}
              </p>
            </div>
          </div>

          {/* Details & Architecture Card */}
          <div className="cust-studio-detail-card">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Crown size={18} color="#D4AF37" />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#05424A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Signature Studio Standard
                </span>
              </div>
              <h4 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 700, color: '#032B30' }}>
                {activeAmbiance.title}
              </h4>
              <p style={{ margin: '0 0 20px', fontSize: 14, color: '#475569', lineHeight: 1.65 }}>
                {activeAmbiance.description}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid #E2E8F0', paddingTop: 18 }}>
                {(activeAmbiance.highlights || [
                  '100% Ladies-only sanctuary with private, welcoming hospitality',
                  'Hospital-grade sanitization between every client visit',
                  'Dedicated parking opposite Cancer Hospital, Katargam',
                ]).map((highlight, hIdx) => (
                  <div key={hIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: '#334155', lineHeight: 1.45 }}>
                    <CheckCircle2 size={16} color="#05424A" style={{ marginTop: 2, flexShrink: 0 }} />
                    <span>{highlight}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #E2E8F0' }}>
              <Link
                href="/book"
                className="cust-btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Calendar size={15} />
                <span>Reserve An Appointment</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4. SIGNATURE SERVICES BENTO GRID (Clean, No Red) ────────── */}
      <section className="cust-section" id="services">
        <div className="cust-section-header">
          <span className="cust-section-badge">
            <Sparkles size={12} style={{ display: 'inline' }} /> Signature Menu
          </span>
          <h2 className="display-font" style={{ fontStyle: 'italic', color: '#032B30' }}>
            Luxury Beauty &amp; Starting Rates
          </h2>
          <p style={{ color: '#475569' }}>
            From clinical skin restoration to couture hair smoothing — hair service prices are according to hair length &amp; density, and skin services according to skin type &amp; condition.
          </p>
        </div>

        <motion.div
          className="cust-bento-grid-v2"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {categories.map((cat) => {
            const catServices = services.filter((s) => (s.category || 'Special Treatments') === cat);
            const icon = getCategoryIcon(cat);
            const img = getCategoryImage(cat);
            const minPrice = catServices.reduce((min, s) => (s.price < min ? s.price : min), catServices[0]?.price || 299);
            const meta = CATEGORY_META[cat] || {
              tagline: 'Signature Treatment',
              description: 'Professional salon therapies tailored to your unique hair and skin profile in Surat.',
            };

            return (
              <motion.div
                key={cat}
                className="cust-bento-card-v2"
                variants={fadeUp}
              >
                {/* 1. Media Area */}
                <div className="card-media-box">
                  <img src={img} alt={cat} loading="lazy" decoding="async" width={380} height={180} />
                  <div className="card-media-overlay" />
                  <div className="card-cat-badge">
                    <span>{icon}</span>
                    <span>{cat}</span>
                  </div>
                  <div className="card-price-badge">
                    Starts ₹{minPrice.toLocaleString('en-IN')}
                  </div>
                </div>

                {/* 2. Content Area */}
                <div className="card-content-box">
                  <div className="card-header-meta">
                    <div className="card-tagline">{meta.tagline}</div>
                    <h3 className="card-title">{cat}</h3>
                    <p className="card-description">{meta.description}</p>
                  </div>

                  {/* 3. Top Popular Treatments List */}
                  <div className="card-service-items">
                    {catServices.slice(0, 3).map((s) => {
                      const sImg = getServiceImage(s.name, s.category);
                      const pricingBasis = getServicePricingBasis(s.category, s.name, s.pricingType);
                      return (
                        <div key={s.id || s.name} className="card-service-row" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(5,66,74,0.12)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                            <img src={sImg} alt={s.name} width={36} height={36} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" decoding="async" />
                          </div>
                          <div className="service-name" style={{ flex: 1, minWidth: 0 }}>
                            <span title={s.name} style={{ fontWeight: 600, fontSize: 13.5, color: '#1e293b' }}>{s.name}</span>
                            <span style={{ display: 'block', fontSize: 10.5, color: '#64748b', fontWeight: 600 }}>
                              {pricingBasis.shortBadge}
                            </span>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <span className="service-price" style={{ color: '#05424A', fontWeight: 800, fontSize: 13.5, display: 'block' }}>
                              ₹{s.price.toLocaleString('en-IN')}
                              {!pricingBasis.isFixed && (
                                <span style={{ fontSize: 10.5, color: '#64748b', fontWeight: 700, marginLeft: 2 }}>+</span>
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 4. Action Bar */}
                  <div className="card-action-bar">
                    <Link
                      href={`/services?category=${encodeURIComponent(cat)}`}
                      className="view-all-link"
                    >
                      <span>{catServices.length > 3 ? `+${catServices.length - 3} More` : 'View Menu'}</span>
                      <ArrowRight size={13} />
                    </Link>

                    <Link
                      href={`/book?service=${encodeURIComponent(catServices[0]?.name || cat)}`}
                      className="book-service-btn btn-glow"
                    >
                      <Calendar size={13} />
                      <span>Book Now</span>
                    </Link>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link href="/services" className="cust-btn-primary">
            <span>View Complete Price &amp; Service List</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ─── 5. WHY SURAT CHOOSES US (Clean Gold/Teal/Green - ZERO Red) ── */}
      <section className="cust-section">
        <div className="cust-section-header">
          <span className="cust-section-badge">The Shree Difference</span>
          <h2 className="display-font" style={{ fontStyle: 'italic', color: '#032B30' }}>
            Why Choose Shree Beauty Studio
          </h2>
          <p style={{ color: '#475569' }}>
            Uncompromising standards of quality, certified hygiene, and customized beauty therapies.
          </p>
        </div>

        <motion.div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 16,
            maxWidth: 1240,
            margin: '0 auto',
          }}
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
        >
          {[
            {
              icon: <Award size={24} />,
              bg: 'rgba(5,66,74,0.08)',
              color: '#05424A',
              title: 'Certified Master Artists',
              text: 'Our team undergoes continuous masterclass training in modern bridal and hair aesthetics techniques with 25+ years experience.',
            },
            {
              icon: <Gem size={24} />,
              bg: 'rgba(212,175,55,0.15)',
              color: '#C59A27',
              title: '100% Genuine Luxury Brands',
              text: "Exclusively authentic formulations from L'Oréal Serie Expert, Absolut Repair Molecular, Selective, and Huda Beauty.",
            },
            {
              icon: <ShieldCheck size={24} />,
              bg: 'rgba(22,163,74,0.08)',
              color: '#16a34a',
              title: 'Medical-Grade Hygiene',
              text: 'Disinfected instruments, disposable towels, sanitized stations, and pristine salon private rooms.',
            },
            {
              icon: <Sparkles size={24} />,
              bg: 'rgba(5,66,74,0.08)',
              color: '#05424A',
              title: 'Bespoke Diagnostic Consultation',
              text: 'Every session begins with an in-depth skin and hair analysis to select the exact treatment regimen for Surat humidity.',
            },
          ].map((item, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              whileHover={{ y: -6, boxShadow: '0 20px 48px rgba(5,66,74,0.10)' }}
              style={{
                padding: 20,
                borderRadius: 20,
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                transition: 'all 0.2s ease',
                flex: '0 1 270px',
                maxWidth: 300,
                minWidth: 250,
                width: '100%',
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: item.bg,
                  color: item.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 14,
                  boxShadow: `0 4px 12px ${item.bg}`,
                }}
              >
                {item.icon}
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: '#032B30' }}>
                {item.title}
              </h3>
              <p style={{ margin: 0, fontSize: 13.5, color: '#64748b', lineHeight: 1.65 }}>
                {item.text}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ─── 7. 📸 LIVE INSTAGRAM FEED (@shreebeauty.studio) ──────── */}
      <InstagramFeed />

      {/* ─── 8. ⭐ GOOGLE REVIEWS CAROUSEL (4.9★ on Google Maps) ──── */}
      <section className="cust-section-alt" style={{ overflow: 'hidden', paddingTop: 0, paddingBottom: 'clamp(20px, 3vw, 32px)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div className="cust-section-header" style={{ marginBottom: 14, marginTop: 0 }}>
            <span className="cust-section-badge" style={{ marginBottom: 6 }}>
              <Star size={12} fill="#D4AF37" color="#D4AF37" style={{ display: 'inline' }} /> Google Reviews
            </span>
            <h2 style={{ color: '#032B30', margin: '0 0 6px' }}>Loved by Hundreds of Surat Brides &amp; Clients</h2>
            <p style={{ color: '#64748B' }}>
              Real reviews from our clients on Google Maps. {googleRating.toFixed(1)}★ average from {googleReviewCount}+ happy clients in Katargam, Surat.
            </p>
          </div>
        </div>

        {/* Marquee Row 1 */}
        <div style={{ position: 'relative', overflow: 'hidden', marginBottom: 12 }} className="reviews-carousel-track-outer">
          <div className="reviews-marquee reviews-marquee-fwd">
            {[...reviewsRow1, ...reviewsRow1].map((t, idx) => (
              <div key={`r1-${idx}`} className="reviews-card">
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 6 }}>
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} size={11.5} fill="#D4AF37" color="#D4AF37" />
                    ))}
                    <span style={{ fontSize: 9.5, color: '#94a3b8', marginLeft: 4, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Google</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 12.5, color: '#334155', lineHeight: 1.5, fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    &ldquo;{t.text}&rdquo;
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8, marginTop: 6, borderTop: '1px solid #f1f5f9' }}>
                  <img
                    src={t.avatar}
                    alt={t.name}
                    width={32}
                    height={32}
                    style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1.5px solid rgba(212,175,55,0.5)', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}
                    referrerPolicy="no-referrer"
                  />
                  <div style={{ minWidth: 0, overflow: 'hidden' }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: '#032B30', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
                    <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Marquee Row 2 */}
        <div style={{ position: 'relative', overflow: 'hidden' }} className="reviews-carousel-track-outer">
          <div className="reviews-marquee reviews-marquee-rev">
            {[...reviewsRow2, ...reviewsRow2].map((t, idx) => (
              <div key={`r2-${idx}`} className="reviews-card">
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 6 }}>
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} size={11.5} fill="#D4AF37" color="#D4AF37" />
                    ))}
                    <span style={{ fontSize: 9.5, color: '#94a3b8', marginLeft: 4, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Google</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 12.5, color: '#334155', lineHeight: 1.5, fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    &ldquo;{t.text}&rdquo;
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8, marginTop: 6, borderTop: '1px solid #f1f5f9' }}>
                  <img
                    src={t.avatar}
                    alt={t.name}
                    width={32}
                    height={32}
                    style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1.5px solid rgba(212,175,55,0.5)', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}
                    referrerPolicy="no-referrer"
                  />
                  <div style={{ minWidth: 0, overflow: 'hidden' }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: '#032B30', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
                    <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Google Map Verification Badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
          <motion.a
            href="https://www.google.com/maps/place/Shree+beauty+studio/@21.2369639,72.8160001,283m/data=!3m1!1e3!4m8!3m7!1s0x3be04f0b9062c70f:0xa017a32a652d8ad2!8m2!3d21.2369033!4d72.8158985!9m1!1b1!16s%2Fg%2F11kqdqq61p?entry=ttu"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.03, y: -2 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              background: '#FFFFFF',
              border: '1px solid rgba(212,175,55,0.4)',
              borderRadius: 99,
              padding: '12px 24px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              textDecoration: 'none',
              color: '#032B30',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            <img src="https://www.gstatic.com/images/branding/googleg/1x/googleg_standard_color_28dp.png" alt="Google" width={20} height={20} />
            <span>{googleRating.toFixed(1)}★ on Google Maps · {googleReviewCount}+ Verified Reviews</span>
            <ChevronRight size={14} color="#94a3b8" />
          </motion.a>
        </div>
      </section>

      {/* ─── 9. PREMIUM CTA BAND ──────────────────────────────────── */}
      <section
        style={{
          position: 'relative',
          background: 'linear-gradient(135deg, #021e22 0%, #05424A 40%, #07505a 70%, #032b30 100%)',
          padding: 'clamp(36px, 5vw, 60px) 20px',
          overflow: 'hidden',
          textAlign: 'center',
        }}
      >
        <div className="floating-orb floating-orb-gold" style={{ width: 600, height: 600, top: '-40%', left: '-15%', opacity: 0.5 }} />
        <div className="floating-orb floating-orb-teal" style={{ width: 400, height: 400, bottom: '-30%', right: '-10%', opacity: 0.4 }} />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 780, margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(212,175,55,0.18)',
                border: '1px solid rgba(212,175,55,0.45)',
                padding: '5px 16px',
                borderRadius: 99,
                color: '#F7E7A6',
                fontSize: 12.5,
                fontWeight: 700,
                marginBottom: 12,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              <Sparkles size={13} color="#D4AF37" />
              Book Your Glow-Up Today
            </span>

            <h2
              className="display-font"
              style={{
                fontSize: 'clamp(30px, 5vw, 52px)',
                fontWeight: 700,
                color: '#ffffff',
                margin: '0 0 10px',
                lineHeight: 1.15,
                fontStyle: 'italic',
              }}
            >
              Ready to Feel{' '}
              <span style={{ color: '#D4AF37' }}>Absolutely Radiant?</span>
            </h2>

            <p
              style={{
                fontSize: 'clamp(15px, 2vw, 17px)',
                color: 'rgba(255,255,255,0.85)',
                lineHeight: 1.65,
                maxWidth: 620,
                margin: '0 auto 20px',
              }}
            >
              From everyday hair rejuvenation to once-in-a-lifetime bridal transformations — our team at
              Shree Beauty Studio is ready to make you look and feel extraordinary.
            </p>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 14,
                flexWrap: 'wrap',
              }}
            >
              <Link href="/book" className="cust-btn-primary btn-glow">
                <Calendar size={16} />
                <span>Book Your Appointment</span>
              </Link>
              <a
                href={`https://wa.me/${whatsapp}?text=Hi%20Shree%20!%0AWhatsApp%20Message`}
                target="_blank"
                rel="noopener noreferrer"
                className="cust-btn-secondary"
              >
                <MessageCircle size={16} />
                <span>WhatsApp: +91 98241 83769</span>
              </a>
            </div>

            {/* Trust Points */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 24,
                marginTop: 20,
                flexWrap: 'wrap',
                fontSize: 13,
                color: 'rgba(255,255,255,0.7)',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={14} color="#D4AF37" />
                No advance payment required
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={14} color="#D4AF37" />
                Free diagnosis consultation
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Gem size={14} color="#D4AF37" />
                100% genuine luxury products
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── 9. LOCATION & STUDIO VISIT (With 3D Map) ─────────────── */}
      <section className="cust-section" id="location">
        <div className="cust-section-header">
          <span className="cust-section-badge">Studio Location</span>
          <h2 style={{ color: '#032B30' }}>Visit Our Katargam Sanctuary</h2>
          <p style={{ color: '#475569' }}>
            Conveniently located opposite Cancer Hospital in Katargam, Surat with dedicated customer parking.
          </p>
        </div>

        <div
          style={{
            background: '#ffffff',
            borderRadius: 24,
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          }}
        >
          {/* Info Side */}
          <div style={{ padding: 'clamp(20px, 3.5vw, 32px)', display: 'flex', flexDirection: 'column', gap: 16, justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: 'rgba(5,66,74,0.08)',
                  color: '#05424A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <MapPin size={20} />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: 13, color: '#032B30', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                  Studio Address
                </strong>
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ margin: 0, fontSize: 14, color: '#475569', lineHeight: 1.5, textDecoration: 'none', display: 'block' }}
                  title="Open in Google Maps"
                >
                  <span>{address}</span>
                  <span style={{ display: 'block', color: '#05424A', fontWeight: 700, fontSize: 12, marginTop: 2 }}>
                    📍 View on Google Maps ↗
                  </span>
                </a>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: 'rgba(212,175,55,0.15)',
                  color: '#C59A27',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Clock size={20} />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: 13, color: '#032B30', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                  Operating Hours
                </strong>
                <p style={{ margin: 0, fontSize: 14, color: '#475569' }}>
                  {openTime} – {closeTime} · {openDays}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: 'rgba(37,211,102,0.12)',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Phone size={20} />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: 13, color: '#032B30', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                  Direct Inquiries &amp; WhatsApp
                </strong>
                <p style={{ margin: 0, fontSize: 14 }}>
                  <a href="tel:+919824183769" style={{ color: '#05424A', fontWeight: 700, textDecoration: 'none' }}>
                    +91 98241 83769
                  </a>
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', paddingTop: 8 }}>
              <Link href="/book" className="cust-btn-primary">
                <Calendar size={16} />
                <span>Book Your Slot</span>
              </Link>
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#f1f5f9',
                  color: '#032B30',
                  fontSize: 14,
                  fontWeight: 600,
                  padding: '12px 20px',
                  borderRadius: 99,
                  textDecoration: 'none',
                }}
              >
                <span>Get Directions</span>
                <ChevronRight size={15} />
              </a>
            </div>
          </div>

          {/* Realistic 3D Satellite Interactive Map */}
          <StudioMap3D height={360} showCardOverlay={true} />
        </div>
      </section>
    </div>
  );
}
