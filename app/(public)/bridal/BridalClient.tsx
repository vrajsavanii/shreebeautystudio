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
  const whatsapp = data?.settings?.whatsapp || '919773240010';

  React.useEffect(() => {
    fetch('/api/public-data')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.bridalPackages) {
          useSalonStore.getState().setData({
            services: json.services,
            bridalPackages: json.bridalPackages,
            settings: json.settings,
          });
        }
      })
      .catch(() => {});
  }, []);

  const bridal = packages.filter((p) => (p.type || '').toLowerCase().includes('bridal'));
  const siders = packages.filter((p) => (p.type || '').toLowerCase().includes('sider'));
  const makeup = packages.filter((p) => (p.type || '').toLowerCase().includes('makeup'));

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* ─── HERO ────────────────────────────────────────── */}
      <section
        style={{
          position: 'relative',
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundImage: `url(${customerImages.bridal})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: '#ffffff',
          padding: '60px 20px',
          overflow: 'hidden',
        }}
      >
        {/* Floating orbs */}
        <div className="floating-orb floating-orb-gold" style={{ width: 500, height: 500, top: '-20%', right: '-10%' }} />
        <div className="floating-orb floating-orb-white" style={{ width: 300, height: 300, bottom: '10%', left: '-5%' }} />

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(3, 43, 48, 0.95) 0%, rgba(5, 66, 74, 0.88) 50%, rgba(10, 14, 17, 0.92) 100%)',
          }}
        />
        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: 760, margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(234, 186, 56, 0.18)',
              border: '1px solid rgba(234, 186, 56, 0.45)',
              padding: '6px 18px',
              borderRadius: 99,
              color: '#fef08a',
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 20,
              backdropFilter: 'blur(8px)',
            }}
          >
            <Sparkles size={14} />
            <span>Couture Bridal Lounge · Katargam, Surat</span>
          </motion.div>

          <motion.h1
            className="display-font"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            style={{ fontSize: 'clamp(32px, 5vw, 54px)', fontWeight: 700, margin: '0 0 16px', fontStyle: 'italic' }}
          >
            <span className="gradient-text">Bridal &amp; Siders</span> Makeover Packages
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{ fontSize: 16, color: 'rgba(255,255,255,0.88)', lineHeight: 1.65, margin: '0 auto 32px', maxWidth: 580 }}
          >
            Transform into the bride of your dreams with bespoke luxury cosmetics, certified hair stylists,
            and flawless draping that stays radiant all day.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}
          >
            <Link href="/book" className="cust-btn-primary btn-glow">
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
          </motion.div>
        </div>
      </section>

      {/* ─── BRIDAL PACKAGES ─────────────────────────────── */}
      <section style={{ maxWidth: 1280, margin: '60px auto 0', padding: '0 20px' }}>
        <div className="cust-section-header">
          <span className="cust-section-badge">Bridal Packages</span>
          <h2 className="display-font" style={{ fontStyle: 'italic' }}>For The Bride (Full Multi-Session Couture)</h2>
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
              whileHover={{ y: -8, boxShadow: '0 24px 45px rgba(5,66,74,0.15)' }}
              transition={{ duration: 0.25 }}
              style={{
                background: '#ffffff',
                borderRadius: 24,
                border: '1.5px solid rgba(234, 186, 56, 0.35)',
                padding: 28,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span
                  style={{
                    background: 'rgba(234, 186, 56, 0.15)',
                    color: '#b45309',
                    fontSize: 12,
                    fontWeight: 800,
                    padding: '5px 14px',
                    borderRadius: 99,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    border: '1px solid rgba(234, 186, 56, 0.3)',
                  }}
                >
                  ✨ {pkg.sessions} Sessions Included
                </span>
                <Heart size={18} color="#EABA38" fill="#EABA38" />
              </div>

              <h3 className="display-font" style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700, color: '#05424A' }}>
                {pkg.name}
              </h3>

              <div style={{ fontSize: 28, fontWeight: 800, color: '#05424A', margin: '10px 0 16px' }}>
                <span className="gold-text-shimmer">₹{pkg.price.toLocaleString('en-IN')}</span>{' '}
                <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>/ {pkg.sessions} sessions</span>
              </div>

              <div style={{ flex: 1, marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.04em' }}>
                  Package Inclusions:
                </div>
                <p style={{ margin: 0, fontSize: 13.5, color: '#475569', lineHeight: 1.65 }}>
                  {pkg.includes}
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <Link
                  href={`/book?bridal=${encodeURIComponent(pkg.name)}`}
                  className="btn-glow"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    background: 'linear-gradient(135deg, #05424A 0%, #032B30 100%)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: 14,
                    padding: '12px 18px',
                    borderRadius: 14,
                    textDecoration: 'none',
                    textAlign: 'center',
                    boxShadow: '0 4px 14px rgba(5,66,74,0.25)',
                  }}
                >
                  <Calendar size={15} />
                  <span>Book Consultation</span>
                </Link>
                <a
                  href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hi Shree Beauty Studio, I'm interested in the Bridal Package: ${pkg.name}. Can we discuss availability?`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '12px 16px',
                    borderRadius: 14,
                    background: '#25D366',
                    color: '#ffffff',
                    textDecoration: 'none',
                    boxShadow: '0 4px 14px rgba(37,211,102,0.25)',
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
            gap: 22,
          }}
        >
          {siders.map((pkg) => (
            <motion.div
              key={pkg.id}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              whileHover={{ y: -6, boxShadow: '0 16px 32px rgba(5,66,74,0.1)' }}
              transition={{ duration: 0.2 }}
              style={{
                background: '#ffffff',
                borderRadius: 20,
                border: '1.5px solid rgba(234, 186, 56, 0.25)',
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span
                  style={{
                    background: 'rgba(234,186,56,0.15)',
                    color: '#b45309',
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '4px 12px',
                    borderRadius: 99,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    border: '1px solid rgba(234,186,56,0.3)',
                  }}
                >
                  Siders Single Session
                </span>
              </div>

              <h3 style={{ margin: '0 0 6px', fontSize: 19, fontWeight: 800, color: '#0f172a' }}>
                {pkg.name}
              </h3>

              <div style={{ fontSize: 24, fontWeight: 800, color: '#05424A', margin: '8px 0 12px' }}>
                ₹{pkg.price.toLocaleString('en-IN')}{' '}
                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>/ person</span>
              </div>

              <p style={{ margin: '0 0 18px', fontSize: 13, color: '#64748b', flex: 1, lineHeight: 1.55 }}>
                {pkg.includes}
              </p>

              <Link
                href={`/book?bridal=${encodeURIComponent(pkg.name)}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  background: 'linear-gradient(135deg, rgba(5,66,74,0.08) 0%, rgba(234,186,56,0.12) 100%)',
                  color: '#05424A',
                  fontWeight: 700,
                  fontSize: 13,
                  padding: '11px 16px',
                  borderRadius: 12,
                  textDecoration: 'none',
                  textAlign: 'center',
                  border: '1px solid rgba(5,66,74,0.15)',
                  transition: 'all 0.2s ease',
                }}
              >
                <Calendar size={14} />
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
