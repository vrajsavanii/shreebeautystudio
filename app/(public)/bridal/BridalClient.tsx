'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparkles, Calendar, MessageCircle, Heart, Check, Download } from 'lucide-react';
import { customerImages } from '@/lib/customer-images';
import { useSalonStore, DEFAULT_BRIDAL_PACKAGES } from '@/lib/store';

const fadeUp = {
  hidden: { opacity: 0, y: 25 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

export default function PublicBridalPage() {
  const { data } = useSalonStore();
  const packages = data?.bridalPackages || DEFAULT_BRIDAL_PACKAGES;
  const whatsapp = data?.settings?.whatsapp || '919824183769';

  const bridal = packages.filter((p) => (p.type || '').toLowerCase().includes('bridal'));
  const siders = packages.filter((p) => (p.type || '').toLowerCase().includes('sider'));
  const makeup = packages.filter((p) => (p.type || '').toLowerCase().includes('makeup'));

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* ─── HERO ──────────────────────────────────────────────── */}
      <section
        style={{
          position: 'relative',
          minHeight: '55vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundImage: `url(${customerImages.bridal})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: '#ffffff',
          padding: '60px 20px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(3, 43, 48, 0.94) 0%, rgba(5, 66, 74, 0.88) 50%, rgba(10, 14, 17, 0.92) 100%)',
          }}
        />
        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: 760, margin: '0 auto' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(234, 186, 56, 0.2)',
              border: '1px solid rgba(234, 186, 56, 0.4)',
              padding: '6px 16px',
              borderRadius: 99,
              color: '#fef08a',
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            <Sparkles size={14} />
            <span>Couture Bridal Lounge · Katargam, Surat</span>
          </div>

          <h1 style={{ fontSize: 'clamp(32px, 5vw, 50px)', fontWeight: 800, margin: '0 0 16px', letterSpacing: '-0.5px' }}>
            Bridal &amp; Siders Makeover Packages
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.88)', lineHeight: 1.6, margin: '0 auto 28px' }}>
            Transform into the bride of your dreams with bespoke luxury cosmetics, certified hair stylists,
            and flawless draping that stays radiant all day.
          </p>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/book" className="cust-btn-primary">
              <Calendar size={15} />
              <span>Book Bridal Consultation</span>
            </Link>
            <a
              href="/shree-bridal-rate-card.pdf"
              download="Shree-Beauty-Studio-Bridal-Rate-Card.pdf"
              className="cust-btn-secondary"
            >
              <Download size={15} />
              <span>Download Official PDF Rate Card</span>
            </a>
          </div>
        </div>
      </section>

      {/* ─── BRIDAL PACKAGES ──────────────────────────────────── */}
      <section style={{ maxWidth: 1280, margin: '60px auto 0', padding: '0 20px' }}>
        <div className="cust-section-header">
          <span className="cust-section-badge">Bridal Packages</span>
          <h2>For The Bride (Full Multi-Session Couture)</h2>
          <p>
            Includes full HD/Airbrush makeup, signature hairstyling, premium jewelry set matching, colored lenses,
            hair extensions, false eyelashes, fresh hair decor &amp; designer saree/lehenga draping.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 24,
          }}
        >
          {bridal.map((pkg) => (
            <motion.div
              key={pkg.id}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              style={{
                background: '#ffffff',
                borderRadius: 22,
                border: '1.5px solid #e2e8f0',
                padding: 26,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span
                  style={{
                    background: 'rgba(5,66,74,0.08)',
                    color: '#05424A',
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '4px 12px',
                    borderRadius: 99,
                    textTransform: 'uppercase',
                  }}
                >
                  {pkg.sessions} Sessions Included
                </span>
                <Heart size={16} color="#EABA38" fill="#EABA38" />
              </div>

              <h3 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: '#0f172a' }}>
                {pkg.name}
              </h3>

              <div style={{ fontSize: 26, fontWeight: 800, color: '#05424A', margin: '10px 0 16px' }}>
                ₹{pkg.price.toLocaleString('en-IN')}{' '}
                <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>/ {pkg.sessions} sessions</span>
              </div>

              <div style={{ flex: 1, marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>
                  Package Inclusions:
                </div>
                <p style={{ margin: 0, fontSize: 13.5, color: '#475569', lineHeight: 1.6 }}>
                  {pkg.includes}
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <Link
                  href={`/book?bridal=${encodeURIComponent(pkg.name)}`}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    background: 'linear-gradient(135deg, #05424A 0%, #032B30 100%)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: 13.5,
                    padding: '11px 16px',
                    borderRadius: 12,
                    textDecoration: 'none',
                    textAlign: 'center',
                  }}
                >
                  <Calendar size={14} />
                  <span>Book Now</span>
                </Link>
                <a
                  href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hi Shree Beauty Studio, I'm interested in the Bridal Package: ${pkg.name}. Can we discuss availability?`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '11px 14px',
                    borderRadius: 12,
                    background: '#25D366',
                    color: '#053320',
                    textDecoration: 'none',
                  }}
                  title="Inquire on WhatsApp"
                >
                  <MessageCircle size={18} />
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── SIDERS PACKAGES ─────────────────────────────────── */}
      <section style={{ maxWidth: 1280, margin: '80px auto 0', padding: '0 20px' }}>
        <div className="cust-section-header">
          <span className="cust-section-badge">Siders &amp; Family</span>
          <h2>For Bridesmaids &amp; Family (Siders Packages)</h2>
          <p>
            Complete makeup, trendy hairstyles, and elegant saree/dupatta draping for sisters, mothers, and friends.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20,
          }}
        >
          {siders.map((pkg) => (
            <motion.div
              key={pkg.id}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              style={{
                background: '#ffffff',
                borderRadius: 20,
                border: '1px solid #e2e8f0',
                padding: 22,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span
                  style={{
                    background: 'rgba(234,186,56,0.15)',
                    color: '#c49821',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 99,
                    textTransform: 'uppercase',
                  }}
                >
                  Siders Single Session
                </span>
              </div>

              <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                {pkg.name}
              </h3>

              <div style={{ fontSize: 22, fontWeight: 800, color: '#05424A', margin: '8px 0 12px' }}>
                ₹{pkg.price.toLocaleString('en-IN')}{' '}
                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>/ person</span>
              </div>

              <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b', flex: 1, lineHeight: 1.5 }}>
                {pkg.includes}
              </p>

              <Link
                href={`/book?bridal=${encodeURIComponent(pkg.name)}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  background: '#f1f5f9',
                  color: '#05424A',
                  fontWeight: 700,
                  fontSize: 13,
                  padding: '9px 14px',
                  borderRadius: 10,
                  textDecoration: 'none',
                  textAlign: 'center',
                }}
              >
                <Calendar size={13} />
                <span>Book This Sider Look</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── MAKEUP PACKAGES (CUSTOM SESSIONS) ───────────────── */}
      {makeup.length > 0 && (
        <section style={{ maxWidth: 1280, margin: '80px auto 0', padding: '0 20px' }}>
          <div className="cust-section-header">
            <span className="cust-section-badge" style={{ background: '#fdf4ff', color: '#c026d3', border: '1px solid #f0abfc' }}>
              Makeup &amp; Occasions
            </span>
            <h2>Custom Makeup Packages (1 to Multi-Session)</h2>
            <p>
              Tailored occasion, engagement, reception, and party HD makeup with flexible session options.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 20,
            }}
          >
            {makeup.map((pkg) => (
              <motion.div
                key={pkg.id}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                style={{
                  background: '#ffffff',
                  borderRadius: 20,
                  border: '1px solid #f0abfc',
                  padding: 22,
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 4px 14px rgba(192,38,211,0.06)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span
                    style={{
                      background: '#fdf4ff',
                      color: '#c026d3',
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '3px 10px',
                      borderRadius: 99,
                      textTransform: 'uppercase',
                    }}
                  >
                    {pkg.sessions || 1} {(pkg.sessions || 1) === 1 ? 'Session' : 'Sessions'}
                  </span>
                </div>

                <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                  {pkg.name}
                </h3>

                <div style={{ fontSize: 22, fontWeight: 800, color: '#05424A', margin: '8px 0 12px' }}>
                  ₹{pkg.price.toLocaleString('en-IN')}{' '}
                  <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>/ package</span>
                </div>

                <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b', flex: 1, lineHeight: 1.5 }}>
                  {pkg.includes}
                </p>

                <div style={{ display: 'flex', gap: 10 }}>
                  <Link
                    href={`/book?bridal=${encodeURIComponent(pkg.name)}`}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      background: 'linear-gradient(135deg, #05424A 0%, #032B30 100%)',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: 13,
                      padding: '10px 14px',
                      borderRadius: 10,
                      textDecoration: 'none',
                      textAlign: 'center',
                    }}
                  >
                    <Calendar size={13} />
                    <span>Book Makeup</span>
                  </Link>
                  <a
                    href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hi Shree Beauty Studio, I'm interested in the Makeup Package: ${pkg.name} (${pkg.sessions} sessions). Can we discuss availability?`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '10px 14px',
                      borderRadius: 10,
                      background: '#25D366',
                      color: '#053320',
                      textDecoration: 'none',
                    }}
                    title="Inquire on WhatsApp"
                  >
                    <MessageCircle size={16} />
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
