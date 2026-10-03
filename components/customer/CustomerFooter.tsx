'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Phone,
  MessageCircle,
  Heart,
  ChevronUp,
  Instagram,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

import { useSalonStore } from '@/lib/store';
import { SHREE_LOGO_BASE64 } from '@/lib/logo-base64';

export default function CustomerFooter() {
  const currentYear = new Date().getFullYear();
  const { data } = useSalonStore();
  const settings = data?.settings;
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 500);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const salonName = settings?.salon || 'Shree Beauty Studio';
  const instagramHandle = settings?.instagramHandle || '@shreebeauty.studio';
  const instagramUrl = settings?.instagramUrl || `https://www.instagram.com/${instagramHandle.replace('@', '')}/`;

  return (
    <footer
      className="cust-footer"
      style={{
        position: 'relative',
        zIndex: 10,
        isolation: 'isolate',
        backgroundColor: '#011215',
        background: 'radial-gradient(ellipse at 50% 0%, rgba(5, 66, 74, 0.6) 0%, #021a1d 45%, #011215 100%)',
        color: '#ffffff',
        padding: '48px 20px 24px',
        overflow: 'hidden',
        boxShadow: '0 -16px 40px rgba(0, 0, 0, 0.25)',
      }}
    >
      {/* Top Gold Glowing Trim */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: 'linear-gradient(90deg, transparent 0%, rgba(234, 186, 56, 0.2) 20%, #EABA38 50%, rgba(234, 186, 56, 0.2) 80%, transparent 100%)',
          boxShadow: '0 0 16px rgba(234, 186, 56, 0.4)',
        }}
      />

      <div style={{ maxWidth: 1160, margin: '0 auto', position: 'relative', zIndex: 2 }}>
        {/* Main Footer Grid: 3 balanced luxury columns spanning full width */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'clamp(28px, 4vw, 48px)',
            marginBottom: 32,
          }}
        >
          {/* Col 1: Brand & Heritage */}
          <div>
            <div style={{ marginBottom: 12 }}>
              <img
                src={settings?.logoUrl || SHREE_LOGO_BASE64}
                alt={salonName}
                style={{
                  width: '100%',
                  maxWidth: 220,
                  height: 'auto',
                  display: 'block',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.4))',
                }}
              />
            </div>

            <h3
              style={{
                fontSize: 19,
                fontWeight: 800,
                letterSpacing: '0.04em',
                margin: '0 0 10px',
                textTransform: 'uppercase',
                background: 'linear-gradient(135deg, #ffffff 20%, #f5d87a 65%, #EABA38 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {salonName}
            </h3>

            <p style={{ fontSize: 13.5, color: '#94a3b8', lineHeight: 1.7, margin: '0 0 16px', maxWidth: 360 }}>
              Katargam&apos;s premier boutique beauty parlour and couture bridal studio. Dedicated exclusively to ladies with over 25+ years of beauty mastery in Surat.
            </p>

            {/* Quick Trust Badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 11px',
                  borderRadius: 999,
                  background: 'rgba(234, 186, 56, 0.1)',
                  border: '1px solid rgba(234, 186, 56, 0.25)',
                  color: '#f5d87a',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <Sparkles size={12} color="#EABA38" /> 25+ Years Heritage
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 11px',
                  borderRadius: 999,
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#cbd5e1',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <ShieldCheck size={12} color="#80EEEE" /> Ladies Exclusive
              </span>
            </div>
          </div>

          {/* Col 2: Studio Navigation */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <div style={{ width: 4, height: 16, backgroundColor: '#EABA38', borderRadius: 2 }} />
              <h4
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#f5d87a',
                  margin: 0,
                }}
              >
                Explore Studio
              </h4>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {[
                { href: '/', label: 'Home' },
                { href: '/services', label: 'Services & Pricing Menu' },
                { href: '/bridal', label: 'Couture Bridal Packages' },
                { href: '/about', label: 'About Us & Contact' },
                { href: '/faq', label: 'Frequently Asked Questions' },
                { href: '/blog', label: 'Beauty & Care Blog (50+ Guides)' },
              ].map((link, idx) => (
                <Link
                  key={idx}
                  href={link.href}
                  style={{
                    color: '#cbd5e1',
                    fontSize: 14,
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.color = '#f5d87a';
                    el.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.color = '#cbd5e1';
                    el.style.transform = 'translateX(0)';
                  }}
                >
                  <span>{link.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Col 3: Direct Connect & Appointments */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <div style={{ width: 4, height: 16, backgroundColor: '#80EEEE', borderRadius: 2 }} />
              <h4
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#80EEEE',
                  margin: 0,
                }}
              >
                Connect &amp; Book
              </h4>
            </div>

            <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, margin: '0 0 16px' }}>
              Have questions or want to reserve your beauty session? Reach out directly via WhatsApp or call us.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
              <a
                href="https://wa.me/919824183769?text=Hi%20Shree%20!%0AWhatsApp%20Message"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'linear-gradient(135deg, #25D366 0%, #1ea952 100%)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: 13,
                  padding: '10px 18px',
                  borderRadius: 99,
                  textDecoration: 'none',
                  boxShadow: '0 4px 16px rgba(37,211,102,0.35)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  transition: 'all 0.2s ease',
                  width: 'fit-content',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 22px rgba(37,211,102,0.5)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(37,211,102,0.35)';
                }}
              >
                <MessageCircle size={15} />
                <span>WhatsApp: +91 98241 83769</span>
              </a>

              <a
                href="tel:+919824183769"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: 13,
                  padding: '10px 18px',
                  borderRadius: 99,
                  textDecoration: 'none',
                  border: '1px solid rgba(255,255,255,0.18)',
                  transition: 'all 0.2s ease',
                  width: 'fit-content',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.16)';
                  (e.currentTarget as HTMLElement).style.borderColor = '#EABA38';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.08)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.18)';
                }}
              >
                <Phone size={14} />
                <span>Call Studio: +91 98241 83769</span>
              </a>

              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Shree Beauty Studio on Instagram"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 9,
                  fontSize: 12.5,
                  color: '#cbd5e1',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                  padding: '6px 16px 6px 8px',
                  borderRadius: 99,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  marginTop: 2,
                  width: 'fit-content',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = '#EABA38';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(234, 186, 56, 0.4)';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(234, 186, 56, 0.08)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = '#cbd5e1';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Instagram size={13} color="#fff" />
                </div>
                <span>{instagramHandle}</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            paddingTop: 26,
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            fontSize: 13,
            color: '#64748b',
          }}
        >
          <p style={{ margin: 0 }}>
            &copy; {currentYear} {salonName}. All rights reserved. Dedicated to Ladies Beauty Mastery in Surat.
          </p>
        </div>
      </div>

      {/* Back to Top Floating Button */}
      {showTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Back to top"
          style={{
            position: 'fixed',
            bottom: 90,
            right: 28,
            zIndex: 998,
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #05424A 0%, #07505a 100%)',
            color: '#EABA38',
            border: '1px solid rgba(234,186,56,0.35)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(5,66,74,0.4)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 28px rgba(234,186,56,0.35)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(5,66,74,0.4)';
          }}
        >
          <ChevronUp size={20} />
        </button>
      )}
    </footer>
  );
}
