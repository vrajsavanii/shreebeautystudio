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
          background: 'linear-gradient(135deg, #05424A 0%, #032b30 100%)',
          color: '#ffffff',
          padding: '64px 20px 54px',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(234, 186, 56, 0.15)',
              border: '1px solid rgba(234, 186, 56, 0.3)',
              padding: '6px 16px',
              borderRadius: 99,
              color: '#fef08a',
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            <HelpCircle size={15} />
            <span>Help Center &amp; Frequently Asked Questions</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(2rem, 4vw, 2.75rem)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              marginBottom: 14,
              lineHeight: 1.2,
            }}
          >
            How Can We Help You?
          </h1>

          <p
            style={{
              fontSize: 'clamp(0.95rem, 1.8vw, 1.1rem)',
              color: 'rgba(255, 255, 255, 0.85)',
              maxWidth: 620,
              margin: '0 auto 28px',
              lineHeight: 1.6,
            }}
          >
            Find clear answers regarding our salon appointments, bridal makeup packages, hair Botox &amp; keratin, skincare facials, and studio policies in Katargam, Surat.
          </p>

          {/* Search bar */}
          <div
            style={{
              maxWidth: 540,
              margin: '0 auto',
              position: 'relative',
            }}
          >
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#64748b',
              }}
            />
            <input
              type="text"
              placeholder="Search questions (e.g. bridal booking, Botox, timings)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 18px 14px 44px',
                borderRadius: 14,
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: '#ffffff',
                color: '#0f172a',
                fontSize: 15,
                outline: 'none',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              }}
            />
          </div>
        </div>
      </section>

      {/* ─── MAIN CONTENT ────────────────────────────────────────── */}
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '40px 20px 0' }}>
        {/* Category Pills */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            justifyContent: 'center',
            marginBottom: 32,
          }}
        >
          {categories.map((cat) => {
            const active = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                style={{
                  padding: '9px 18px',
                  borderRadius: 99,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: active ? '1px solid #05424A' : '1px solid #e2e8f0',
                  background: active ? '#05424A' : '#ffffff',
                  color: active ? '#ffffff' : '#475569',
                  boxShadow: active
                    ? '0 4px 12px rgba(5,66,74,0.2)'
                    : '0 1px 3px rgba(0,0,0,0.05)',
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
            marginBottom: 16,
            fontWeight: 500,
          }}
        >
          Showing {filteredFaqs.length} {filteredFaqs.length === 1 ? 'question' : 'questions'}
        </div>

        {/* Accordion List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filteredFaqs.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                background: '#ffffff',
                borderRadius: 16,
                border: '1px solid #e2e8f0',
              }}
            >
              <HelpCircle size={40} style={{ color: '#94a3b8', margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                No questions found
              </h3>
              <p style={{ color: '#64748b', fontSize: 14, maxWidth: 360, margin: '0 auto 18px' }}>
                We couldn&apos;t find any questions matching &ldquo;{search}&rdquo;. Feel free to message us on WhatsApp!
              </p>
              <a
                href="https://wa.me/919824183769?text=Hi%20Shree%20Beauty%20Studio!%20I%20have%20a%20question."
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#25D366',
                  color: '#ffffff',
                  padding: '10px 20px',
                  borderRadius: 10,
                  fontWeight: 600,
                  textDecoration: 'none',
                  fontSize: 14,
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
                    borderRadius: 14,
                    border: isOpen ? '1px solid #05424A' : '1px solid #e2e8f0',
                    overflow: 'hidden',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                    boxShadow: isOpen
                      ? '0 6px 20px rgba(5,66,74,0.08)'
                      : '0 2px 4px rgba(0,0,0,0.02)',
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
                      padding: '18px 20px',
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
                      size={18}
                      style={{
                        color: isOpen ? '#05424A' : '#94a3b8',
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.25s ease',
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
                        transition={{ duration: 0.22, ease: 'easeInOut' }}
                      >
                        <div
                          style={{
                            padding: '0 20px 20px 20px',
                            color: '#475569',
                            fontSize: 15,
                            lineHeight: 1.7,
                            borderTop: '1px solid #f1f5f9',
                            paddingTop: 14,
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
            marginTop: 48,
            background: 'linear-gradient(135deg, #05424A 0%, #032b30 100%)',
            borderRadius: 20,
            padding: '36px 28px',
            color: '#ffffff',
            textAlign: 'center',
            boxShadow: '0 12px 32px rgba(5,66,74,0.2)',
          }}
        >
          <Sparkles size={28} style={{ color: '#fef08a', margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
            Still have questions about your appointment?
          </h2>
          <p
            style={{
              color: 'rgba(255,255,255,0.85)',
              fontSize: 14,
              maxWidth: 480,
              margin: '0 auto 24px',
              lineHeight: 1.6,
            }}
          >
            Our beauty consultants are just a WhatsApp message or phone call away. We look forward to welcoming you to Shree Beauty Studio!
          </p>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 12,
            }}
          >
            <a
              href="https://wa.me/919824183769?text=Hi%20Shree%20Beauty%20Studio!%20I%20have%20a%20question%20about%20your%20services."
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#25D366',
                color: '#053320',
                padding: '12px 24px',
                borderRadius: 12,
                fontWeight: 700,
                textDecoration: 'none',
                fontSize: 14,
              }}
            >
              <MessageCircle size={16} />
              <span>Chat on WhatsApp</span>
            </a>
            <Link
              href="/book"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: '#ffffff',
                padding: '12px 24px',
                borderRadius: 12,
                fontWeight: 600,
                textDecoration: 'none',
                fontSize: 14,
              }}
            >
              <Calendar size={16} />
              <span>Book Appointment Online</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
