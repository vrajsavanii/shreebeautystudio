'use client';

import React, { useState, useMemo, Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, Clock, Sparkles, Filter, Calendar, ArrowRight } from 'lucide-react';
import { getCategoryIcon, getServiceImage, getUniqueServiceImageMap } from '@/lib/customer-images';
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

  React.useEffect(() => {
    fetch('/api/public-data')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.services) {
          useSalonStore.getState().setData({
            services: json.services,
            bridalPackages: json.bridalPackages,
            settings: json.settings,
          });
        }
      })
      .catch(() => {});
  }, []);

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

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 20px 80px' }}>
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{ textAlign: 'center', marginBottom: 40 }}
      >
        <span className="cust-section-badge">
          <Sparkles size={13} style={{ display: 'inline' }} /> Complete Service Menu
        </span>
        <h1 className="display-font" style={{ fontSize: 'clamp(28px, 5vw, 46px)', fontWeight: 700, color: '#0f172a', margin: '8px 0 12px', fontStyle: 'italic' }}>
          <span style={{ display: 'block', fontSize: '0.55em', fontWeight: 800, color: '#05424A', letterSpacing: '0.02em', fontStyle: 'normal', fontFamily: 'Plus Jakarta Sans, sans-serif', textTransform: 'uppercase', marginBottom: 4 }}>Shree Beauty Studio</span>
          Salon Services &amp; Transparent Pricing
        </h1>
        <p style={{ fontSize: 15, color: '#64748b', maxWidth: 600, margin: '0 auto', lineHeight: 1.65 }}>
          Explore our complete collection of {services.length} signature therapies with upfront pricing and duration.
        </p>
      </motion.div>

      {/* Filter Bar */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 20,
          border: '1px solid rgba(5,66,74,0.1)',
          padding: '18px 20px',
          marginBottom: 32,
          boxShadow: '0 4px 24px rgba(5,66,74,0.05), 0 1px 4px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
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
            return (
              <motion.div
                key={s.id}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                whileHover={{ y: -6, boxShadow: '0 18px 36px rgba(5,66,74,0.1)' }}
                transition={{ duration: 0.2 }}
                style={{
                  background: '#ffffff',
                  borderRadius: 20,
                  border: '1px solid rgba(234, 186, 56, 0.2)',
                  overflow: 'hidden',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  flex: '0 1 360px',
                  maxWidth: 380,
                  minWidth: 290,
                  width: '100%',
                }}
              >
                <div style={{ display: 'flex', gap: 16, padding: 18, flex: 1 }}>
                  <div style={{ width: 84, height: 84, borderRadius: 16, overflow: 'hidden', flexShrink: 0, border: '1px solid #f1f5f9' }}>
                    <img
                      src={img}
                      alt={s.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.4s ease',
                      }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: '#b45309',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        display: 'inline-block',
                        marginBottom: 2,
                      }}
                    >
                      {s.category || 'Special Treatment'}
                    </span>
                    <h3
                      style={{
                        margin: '2px 0 6px',
                        fontSize: 16,
                        fontWeight: 700,
                        color: '#0f172a',
                        lineHeight: 1.35,
                      }}
                    >
                      {s.name}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#64748b' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={13} style={{ color: '#05424A' }} /> {s.duration || 30} mins
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    padding: '14px 18px',
                    background: 'linear-gradient(180deg, #fafaf9 0%, #f4f7f6 100%)',
                    borderTop: '1px solid rgba(234, 186, 56, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', display: 'block' }}>
                      Price
                    </span>
                    <span style={{ fontSize: 20, fontWeight: 800, color: '#05424A' }}>
                      ₹{s.price.toLocaleString('en-IN')}
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
                      fontSize: 12.5,
                      padding: '9px 18px',
                      borderRadius: 99,
                      textDecoration: 'none',
                      boxShadow: '0 4px 12px rgba(5,66,74,0.25)',
                    }}
                  >
                    <span>Book Now</span>
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
  );
}

export default function ServicesPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading Services...</div>}>
      <ServicesView />
    </Suspense>
  );
}
