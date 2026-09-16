'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle,
  Search,
  ChevronDown,
  Calendar,
  Phone,
  MessageCircle,
  Sparkles,
  Heart,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { FAQ_DATA, FAQCategory } from './faq-data';

export default function FAQClient() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    '0': true, // Keep first open by default
  });

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const categories: { key: string; label: string }[] = [
    { key: 'all', label: 'All Questions' },
    { key: 'general', label: 'General & Studio' },
    { key: 'booking', label: 'Booking & Policies' },
    { key: 'bridal', label: 'Bridal & Makeup' },
    { key: 'hair', label: 'Hair Treatments' },
    { key: 'skin', label: 'Skin & Facials' },
  ];

  const filteredFaqs = useMemo(() => {
    const q = search.toLowerCase().trim();
    return FAQ_DATA.filter((item, index) => {
      const matchCat = activeCategory === 'all' || item.category === activeCategory;
      const matchSearch =
        !q ||
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [search, activeCategory]);

  return (
    <div style={{ background: '#f8fafc', minHeight: '85vh', paddingBottom: 80 }}>
      {/* ─── HERO HEADER ────────────────────────────────────────── */}
      <section
        style={{
          background: 'radial-gradient(ellipse at top, #064d57 0%, #03252a 70%, #011619 100%)',
          color: '#ffffff',
          padding: '90px 20px 65px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          className="floating-orb"
          style={{
            top: '-15%',
            left: '10%',
            width: 360,
            height: 360,
            background: 'radial-gradient(circle, rgba(234, 186, 56, 0.16) 0%, transparent 70%)',
          }}
        />
        <div
          className="floating-orb floating-orb-2"
          style={{
            bottom: '-25%',
            right: '10%',
            width: 420,
            height: 420,
            background: 'radial-gradient(circle, rgba(5, 66, 74, 0.5) 0%, transparent 70%)',
          }}
        />

        <div style={{ maxWidth: 840, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(234, 186, 56, 0.12)',
              border: '1px solid rgba(234, 186, 56, 0.35)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              padding: '8px 20px',
              borderRadius: 99,
              color: '#fef08a',
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 20,
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            }}
          >
            <HelpCircle size={15} style={{ color: '#eaba38' }} />
            <span>Help Center &amp; Frequently Asked Questions</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="display-font"
            style={{
              fontSize: 'clamp(2.4rem, 4.5vw, 3.4rem)',
              fontWeight: 700,
              letterSpacing: '-0.01em',
              marginBottom: 16,
              lineHeight: 1.15,
            }}
          >
            How Can We <span className="gold-text-shimmer">Help You</span>?
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            style={{
              fontSize: 'clamp(0.98rem, 1.8vw, 1.15rem)',
              color: 'rgba(255, 255, 255, 0.88)',
              maxWidth: 640,
              margin: '0 auto 32px',
              lineHeight: 1.65,
            }}
          >
            Find clear answers regarding our salon appointments, bespoke bridal makeup packages, hair Botox &amp; keratin, clinical skincare facials, and studio etiquette in Katargam, Surat.
          </motion.p>

          {/* Search bar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{
              maxWidth: 580,
              margin: '0 auto',
              position: 'relative',
            }}
          >
            <Search
              size={19}
              style={{
                position: 'absolute',
                left: 18,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
              }}
            />
            <input
              type="text"
              placeholder="Search questions (e.g. bridal booking, Botox, timings)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '16px 20px 16px 48px',
                borderRadius: 16,
                border: '1.5px solid rgba(234, 186, 56, 0.3)',
                background: '#ffffff',
                color: '#0f172a',
                fontSize: 15,
                outline: 'none',
                boxShadow: '0 12px 36px rgba(0,0,0,0.25)',
              }}
            />
          </motion.div>
        </div>
      </section>

      {/* ─── MAIN CONTENT ────────────────────────────────────────── */}
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '40px 20px 0' }}>
        {/* Category Pills */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            justifyContent: 'center',
            marginBottom: 36,
          }}
        >
          {categories.map((cat) => {
            const active = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                style={{
                  padding: '10px 22px',
                  borderRadius: 99,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  border: active ? '1.5px solid #eaba38' : '1px solid #e2e8f0',
                  background: active ? 'linear-gradient(135deg, #05424A 0%, #032b30 100%)' : '#ffffff',
                  color: active ? '#ffffff' : '#475569',
                  boxShadow: active
                    ? '0 6px 18px rgba(5,66,74,0.28), 0 0 12px rgba(234,186,56,0.3)'
                    : '0 2px 6px rgba(0,0,0,0.03)',
                  transform: active ? 'scale(1.03)' : 'scale(1)',
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Results Counter */}
        <div
          style={{
            fontSize: 13,
            color: '#64748b',
            marginBottom: 20,
            fontWeight: 600,
            letterSpacing: '0.02em',
          }}
        >
          Showing {filteredFaqs.length} {filteredFaqs.length === 1 ? 'question' : 'questions'}
        </div>

        {/* Accordion List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredFaqs.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                background: '#ffffff',
                borderRadius: 20,
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
              }}
            >
              <HelpCircle size={44} style={{ color: '#94a3b8', margin: '0 auto 14px' }} />
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
                No questions found
              </h3>
              <p style={{ color: '#64748b', fontSize: 14, maxWidth: 380, margin: '0 auto 20px' }}>
                We couldn&apos;t find any questions matching &ldquo;{search}&rdquo;. Feel free to message our beauty team directly on WhatsApp!
              </p>
              <a
                href="https://wa.me/919773240010?text=Hi%20Shree%20Beauty%20Studio!%20I%20have%20a%20question."
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#25D366',
                  color: '#ffffff',
                  padding: '12px 24px',
                  borderRadius: 12,
                  fontWeight: 700,
                  textDecoration: 'none',
                  fontSize: 14,
                  boxShadow: '0 6px 20px rgba(37,211,102,0.3)',
                }}
              >
                <MessageCircle size={16} />
                <span>Ask on WhatsApp</span>
              </a>
            </div>
          ) : (
            filteredFaqs.map((faq, idx) => {
              const isOpen = !!openItems[idx.toString()];
              return (
                <div
                  key={idx}
                  style={{
                    background: '#ffffff',
                    borderRadius: 16,
                    border: isOpen ? '1px solid rgba(234, 186, 56, 0.4)' : '1px solid #e2e8f0',
                    borderLeft: isOpen ? '5px solid #eaba38' : '5px solid transparent',
                    overflow: 'hidden',
                    transition: 'all 0.25s ease',
                    boxShadow: isOpen
                      ? '0 10px 30px rgba(5,66,74,0.1), 0 0 0 1px rgba(234,186,56,0.1)'
                      : '0 2px 8px rgba(0,0,0,0.02)',
                  }}
                >
                  <button
                    onClick={() => toggleItem(idx.toString())}
                    aria-expanded={isOpen}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '20px 24px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      gap: 16,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: isOpen ? '#05424A' : '#1e293b',
                        lineHeight: 1.4,
                      }}
                    >
                      {faq.question}
                    </span>
                    <ChevronDown
                      size={20}
                      style={{
                        color: isOpen ? '#eaba38' : '#94a3b8',
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        flexShrink: 0,
                      }}
                    />
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                      >
                        <div
                          style={{
                            padding: '0 24px 24px 24px',
                            color: '#475569',
                            fontSize: 15,
                            lineHeight: 1.75,
                            borderTop: '1px solid #f8fafc',
                            paddingTop: 16,
                          }}
                        >
                          <p style={{ margin: 0 }}>{faq.answer}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>

        {/* ─── CONTACT CTA CARD ──────────────────────────────────── */}
        <div
          style={{
            marginTop: 60,
            background: 'radial-gradient(ellipse at top left, #064d57 0%, #03252a 60%, #011619 100%)',
            borderRadius: 24,
            padding: '44px 32px',
            color: '#ffffff',
            textAlign: 'center',
            boxShadow: '0 20px 50px rgba(5,66,74,0.3)',
            border: '1px solid rgba(234, 186, 56, 0.25)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: '50%',
              background: 'rgba(234, 186, 56, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              border: '1px solid rgba(234, 186, 56, 0.3)',
            }}
          >
            <Sparkles size={24} style={{ color: '#eaba38' }} />
          </div>
          <h2 className="display-font" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 700, marginBottom: 10 }}>
            Still have questions about your <span className="gold-text-shimmer">appointment</span>?
          </h2>
          <p
            style={{
              color: 'rgba(255,255,255,0.85)',
              fontSize: 14.5,
              maxWidth: 520,
              margin: '0 auto 28px',
              lineHeight: 1.65,
            }}
          >
            Our master beauticians and consultants are just a WhatsApp message or phone call away. We look forward to welcoming you to Shree Beauty Studio!
          </p>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 14,
            }}
          >
            <a
              href="https://wa.me/919773240010?text=Hi%20Shree%20Beauty%20Studio!%20I%20have%20a%20question%20about%20your%20services."
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#25D366',
                color: '#ffffff',
                padding: '14px 26px',
                borderRadius: 14,
                fontWeight: 700,
                textDecoration: 'none',
                fontSize: 14,
                boxShadow: '0 8px 24px rgba(37, 211, 102, 0.35)',
              }}
            >
              <MessageCircle size={17} />
              <span>Chat on WhatsApp</span>
            </a>
            <Link
              href="/book"
              className="btn-gold"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'linear-gradient(135deg, #eaba38 0%, #f59e0b 100%)',
                color: '#053320',
                padding: '14px 26px',
                borderRadius: 14,
                fontWeight: 800,
                textDecoration: 'none',
                fontSize: 14,
                boxShadow: '0 8px 24px rgba(234, 186, 56, 0.35)',
              }}
            >
              <Calendar size={17} />
              <span>Book Appointment Online</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
