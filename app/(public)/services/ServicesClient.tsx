'use client';

import React, { useState, useMemo, Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, Clock, Sparkles, Filter, Calendar, ArrowRight } from 'lucide-react';
import { getCategoryIcon, getServiceImage, getUniqueServiceImageMap } from '@/lib/customer-images';
import { getServicePricingBasis } from '@/lib/utils';
import { useSalonStore } from '@/lib/store';
import { Service } from '@/types/salon';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

function ServicesView() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') || 'all';

  const { data } = useSalonStore();
  const services: Service[] = data?.services || [];

  // NOTE: PublicLayoutClient already fetches /api/public-data and hydrates
  // the store on every public page — no need to fetch again here.


  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'price-low' | 'price-high' | 'duration'>('default');
  const [showStickyBar, setShowStickyBar] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowStickyBar(window.scrollY > 320);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Guaranteed 100% Unique non-repeating image map for all rendered services
  const serviceImageMap = useMemo(() => {
    return getUniqueServiceImageMap(services);
  }, [services]);

  const categories = useMemo(() => {
    return Array.from(new Set(services.map((s: Service) => s.category || 'Special Treatments')));
  }, [services]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = services.filter((s: Service) => {
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.category && s.category.toLowerCase().includes(q)) ||
        (s.description && s.description.toLowerCase().includes(q));
      const matchCategory = activeCategory === 'all' || (s.category || 'Special Treatments') === activeCategory;
      return matchSearch && matchCategory;
    });

    if (sortBy === 'price-low') list.sort((a: Service, b: Service) => a.price - b.price);
    else if (sortBy === 'price-high') list.sort((a: Service, b: Service) => b.price - a.price);
    else if (sortBy === 'duration') list.sort((a: Service, b: Service) => a.duration - b.duration);

    return list;
  }, [services, search, activeCategory, sortBy]);

  // Salon background images for page ambiance
  const salonBgImages = [
    '/studio-bg/salon-bg-1.webp',
    '/studio-bg/salon-bg-2.webp',
    '/studio-bg/salon-bg-3.webp',
    '/studio-bg/salon-bg-4.webp',
    '/studio-bg/salon-bg-5.webp',
  ];
  const [bgIndex, setBgIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % salonBgImages.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [salonBgImages.length]);

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {/* Full-page salon background */}
      {salonBgImages.map((src, i) => (
        <div
          key={src}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 0,
            backgroundImage: `url(${src})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
            opacity: bgIndex === i ? 1 : 0,
            transition: 'opacity 2s ease-in-out',
            willChange: 'opacity',
          }}
        />
      ))}
      {/* Overlay for readability */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(245,248,250,0.92) 30%, rgba(240,245,247,0.95) 70%, rgba(255,255,255,0.97) 100%)',
          backdropFilter: 'blur(2px)',
          pointerEvents: 'none',
        }}
      />

      {/* ─── Hero Banner with Salon Interior ─── */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          margin: '0 auto',
          maxWidth: 1320,
          padding: '12px 20px 0',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{
            position: 'relative',
            borderRadius: 24,
            overflow: 'hidden',
            height: 'clamp(160px, 24vw, 240px)',
            boxShadow: '0 12px 48px rgba(5,66,74,0.2), 0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          {/* Carousel of salon backgrounds */}
          {salonBgImages.map((src, i) => (
            <div
              key={`hero-${src}`}
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url(${src})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center 40%',
                opacity: bgIndex === i ? 1 : 0,
                transition: 'opacity 2s ease-in-out',
              }}
            />
          ))}
          {/* Gradient Overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, rgba(3,43,48,0.78) 0%, rgba(5,66,74,0.55) 50%, rgba(3,43,48,0.72) 100%)',
            }}
          />
          {/* Hero Content */}
          <div
            style={{
              position: 'relative',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              padding: '24px 32px',
              textAlign: 'center',
              zIndex: 1,
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(234,186,56,0.2)',
                border: '1px solid rgba(234,186,56,0.5)',
                borderRadius: 99,
                padding: '5px 16px',
                fontSize: 12,
                fontWeight: 700,
                color: '#EABA38',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                marginBottom: 14,
              }}
            >
              <Sparkles size={13} /> Our Salon Interior
            </span>
            <h2
              className="display-font"
              style={{
                fontSize: 'clamp(22px, 4.5vw, 38px)',
                fontWeight: 800,
                color: '#ffffff',
                margin: '0 0 8px',
                textShadow: '0 2px 12px rgba(0,0,0,0.3)',
              }}
            >
              Welcome to Shree Beauty Studio
            </h2>
            <p
              style={{
                fontSize: 'clamp(13px, 2vw, 15px)',
                color: 'rgba(255,255,255,0.85)',
                maxWidth: 520,
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              Experience luxury treatments in our beautifully designed salon — crafted for your comfort
            </p>
            {/* Navigation dots */}
            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              {salonBgImages.map((_, i) => (
                <button
                  key={`dot-${i}`}
                  type="button"
                  onClick={() => setBgIndex(i)}
                  style={{
                    width: bgIndex === i ? 24 : 8,
                    height: 8,
                    borderRadius: 99,
                    border: 'none',
                    background: bgIndex === i ? '#EABA38' : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    padding: 0,
                  }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>

    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 20px 48px', position: 'relative', zIndex: 2 }}>
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{ textAlign: 'center', marginBottom: 20 }}
      >
        <span className="cust-section-badge">
          <Sparkles size={13} style={{ display: 'inline' }} /> Complete Service Menu
        </span>
        <h1 className="display-font" style={{ fontSize: 'clamp(28px, 5vw, 46px)', fontWeight: 700, color: '#0f172a', margin: '8px 0 12px', fontStyle: 'italic' }}>
          <span style={{ display: 'block', fontSize: '0.55em', fontWeight: 800, color: '#05424A', letterSpacing: '0.02em', fontStyle: 'normal', fontFamily: 'Plus Jakarta Sans, sans-serif', textTransform: 'uppercase', marginBottom: 4 }}>Shree Beauty Studio</span>
          Salon Services &amp; Starting Rates
        </h1>
        <p style={{ fontSize: 15, color: '#64748b', maxWidth: 640, margin: '0 auto 12px', lineHeight: 1.65 }}>
          Explore our complete collection of {services.length} signature salon therapies. All prices listed are starting rates — final quotation is customized according to your exact requirements.
        </p>

        {/* Informative Pricing Policy Banner (Hair Length & Skin Type Guide) */}
        <div
          style={{
            maxWidth: 820,
            margin: '0 auto',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(234,186,56,0.12) 100%)',
            backdropFilter: 'blur(12px)',
            border: '1.5px solid rgba(234,186,56,0.35)',
            borderRadius: 16,
            padding: '14px 18px',
            textAlign: 'left',
            boxShadow: '0 4px 16px rgba(5,66,74,0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#05424a', fontWeight: 800, fontSize: 13.5 }}>
            <Sparkles size={16} color="#d97706" />
            <span>How Our Pricing Works (Transparent Pricing Policy):</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, fontSize: 12.5, color: '#334155', lineHeight: 1.5 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: '#ffffff', padding: '10px 14px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: 18 }}>💇‍♀️</span>
              <div>
                <strong style={{ color: '#05424a', display: 'block' }}>Hair Services (According to Hair Length):</strong>
                Prices start from base rate and vary according to your <b>Hair Length &amp; Density</b> (Short / Shoulder / Waist).
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: '#ffffff', padding: '10px 14px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: 18 }}>✨</span>
              <div>
                <strong style={{ color: '#05424a', display: 'block' }}>Skin Services (According to Skin Type):</strong>
                Prices start from base rate and vary according to your <b>Skin Type &amp; Analysis</b> (Glow / Anti-Acne / D-Tan).
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Filter Bar */}
      <div
        style={{
          background: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(16px)',
          borderRadius: 20,
          border: '1px solid rgba(5,66,74,0.12)',
          padding: '12px 16px',
          marginBottom: 20,
          boxShadow: '0 8px 32px rgba(5,66,74,0.08), 0 1px 4px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {/* Search & Sort Controls */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ position: 'relative', flex: '1 1 280px' }}>
            <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search services by name (e.g. Keratin, Facial, Waxing)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px 10px 40px',
                borderRadius: 12,
                border: '1px solid #cbd5e1',
                fontSize: 14,
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={16} color="#64748b" />
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{
                padding: '9px 14px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                fontWeight: 600,
                color: '#334155',
                background: '#ffffff',
              }}
            >
              <option value="default">Default Order</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="duration">Duration: Shortest</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingBottom: 4 }}>
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            style={{
              padding: '7px 16px',
              borderRadius: 99,
              fontSize: 13,
              fontWeight: activeCategory === 'all' ? 700 : 500,
              background: activeCategory === 'all' ? '#05424A' : '#f1f5f9',
              color: activeCategory === 'all' ? '#ffffff' : '#475569',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            All Services ({services.length})
          </button>
          {categories.map((cat: string) => {
            const count = services.filter((s: Service) => (s.category || 'Special Treatments') === cat).length;
            const icon = getCategoryIcon(cat);
            const isAct = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '7px 16px',
                  borderRadius: 99,
                  fontSize: 13,
                  fontWeight: isAct ? 700 : 500,
                  background: isAct ? '#05424A' : '#f1f5f9',
                  color: isAct ? '#ffffff' : '#475569',
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{icon}</span>
                <span>{cat}</span>
                <span style={{ opacity: 0.7, fontSize: 11 }}>({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Services Grid */}
      {filtered.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            borderRadius: 20,
            padding: '48px 20px',
            textAlign: 'center',
            border: '1px dashed #cbd5e1',
          }}
        >
          <Sparkles size={36} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: '#334155' }}>
            No services found
          </h3>
          <p style={{ margin: 0, fontSize: 14, color: '#64748b' }}>
            Try searching for a different service name or clear the filter.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 20,
            maxWidth: 1240,
            margin: '0 auto',
          }}
        >
          {filtered.map((s: Service) => {
            const img = serviceImageMap.get(s.id) || getServiceImage(s.name, s.category);
            const pricingBasis = getServicePricingBasis(s.category, s.name, s.pricingType);
            return (
              <motion.div
                key={s.id}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                whileHover={{ y: -6, boxShadow: '0 20px 48px rgba(5,66,74,0.18)' }}
                transition={{ duration: 0.25 }}
                style={{
                  background: 'rgba(255,255,255,0.92)',
                  backdropFilter: 'blur(12px)',
                  borderRadius: 22,
                  border: '1px solid rgba(234, 186, 56, 0.25)',
                  overflow: 'hidden',
                  boxShadow: '0 4px 24px rgba(5,66,74,0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  flex: '0 1 360px',
                  maxWidth: 380,
                  minWidth: 290,
                  width: '100%',
                }}
              >
                {/* 1. Full-Width Prominent Service Image Banner */}
                <div style={{ position: 'relative', height: 200, width: '100%', overflow: 'hidden', background: '#f1f5f9' }}>
                  <img
                    src={img}
                    alt={s.name}
                    loading="lazy"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                      transition: 'transform 0.5s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.06)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  />
                  {/* Subtle Bottom Gradient */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 60%)',
                      pointerEvents: 'none',
                    }}
                  />

                  {/* Category Pill Top-Left */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 12,
                      left: 12,
                      background: 'rgba(5, 66, 74, 0.88)',
                      backdropFilter: 'blur(8px)',
                      color: '#ffffff',
                      padding: '4px 12px',
                      borderRadius: 99,
                      fontSize: 11,
                      fontWeight: 700,
                      border: '1px solid rgba(255,255,255,0.25)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <span>{getCategoryIcon(s.category || '')}</span>
                    <span>{s.category || 'Special Treatment'}</span>
                  </div>

                  {/* Duration Pill Top-Right */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      background: 'rgba(255, 255, 255, 0.94)',
                      backdropFilter: 'blur(8px)',
                      color: '#05424A',
                      padding: '4px 11px',
                      borderRadius: 99,
                      fontSize: 11,
                      fontWeight: 800,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Clock size={12} color="#05424A" />
                    <span>{s.duration || 30} mins</span>
                  </div>
                </div>

                {/* 2. Service Information Body */}
                <div style={{ padding: '18px 20px 14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 17,
                        fontWeight: 800,
                        color: '#0f172a',
                        lineHeight: 1.35,
                      }}
                    >
                      {s.name}
                    </h3>
                  </div>

                  {/* Pricing Basis Tag (Hair Length / Skin Type) */}
                  <div style={{ marginBottom: 10 }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 9px',
                        borderRadius: 8,
                        background:
                          pricingBasis.isFixed
                            ? '#f0fdfa'
                            : pricingBasis.type === 'hair'
                            ? '#ecfeff'
                            : pricingBasis.type === 'skin'
                            ? '#fefce8'
                            : '#f1f5f9',
                        color:
                          pricingBasis.isFixed
                            ? '#0f766e'
                            : pricingBasis.type === 'hair'
                            ? '#0e7490'
                            : pricingBasis.type === 'skin'
                            ? '#a16207'
                            : '#475569',
                        border:
                          pricingBasis.isFixed
                            ? '1px solid #99f6e4'
                            : pricingBasis.type === 'hair'
                            ? '1px solid #cffafe'
                            : pricingBasis.type === 'skin'
                            ? '1px solid #fef08a'
                            : '1px solid #e2e8f0',
                      }}
                    >
                      {pricingBasis.badge}
                    </span>
                  </div>

                  <p
                    style={{
                      margin: '0 0 14px',
                      fontSize: 13,
                      color: '#64748b',
                      lineHeight: 1.5,
                      flex: 1,
                    }}
                  >
                    {s.description || 'Professional salon therapy tailored with authentic luxury formulations at Shree Beauty Studio.'}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#05424a', fontWeight: 600 }}>
                    <Sparkles size={12} color="#b45309" />
                    <span>{pricingBasis.label}</span>
                  </div>
                </div>

                {/* 3. Price & Action Footer */}
                <div
                  style={{
                    padding: '14px 20px',
                    background: 'linear-gradient(180deg, #fafaf9 0%, #f4f7f6 100%)',
                    borderTop: '1px solid rgba(234, 186, 56, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <span style={{ fontSize: 10, color: '#05424A', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', display: 'block' }}>
                      {pricingBasis.isFixed ? 'Fixed Price' : 'Starts From'}
                    </span>
                    <span style={{ fontSize: 20, fontWeight: 900, color: '#05424A' }}>
                      ₹{s.price.toLocaleString('en-IN')}{' '}
                      {!pricingBasis.isFixed && (
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>onwards</span>
                      )}
                    </span>
                  </div>

                  <Link
                    href={`/book?service=${encodeURIComponent(s.name)}`}
                    className="btn-glow"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'linear-gradient(135deg, #05424A 0%, #032b30 100%)',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: 13,
                      padding: '10px 18px',
                      borderRadius: 99,
                      textDecoration: 'none',
                      boxShadow: '0 4px 12px rgba(5,66,74,0.25)',
                    }}
                  >
                    <span>Book Slot</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ─── Sticky Bottom Book Bar ─── */}
      {showStickyBar && (
        <div className="sticky-book-bar">
          <p>
            <strong>{filtered.length}</strong> services available
            {activeCategory !== 'all' && <> in <strong>{activeCategory}</strong></>}
            {search && <> matching &ldquo;<strong>{search}</strong>&rdquo;</>}
          </p>
          <Link href="/book" className="cust-btn-primary" style={{ fontSize: 13, padding: '10px 22px' }}>
            <Calendar size={14} />
            <span>Book Appointment</span>
          </Link>
        </div>
      )}
    </div>
    </div>
  );
}

export default function ServicesPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading Services...</div>}>
      <ServicesView />
    </Suspense>
  );
}
