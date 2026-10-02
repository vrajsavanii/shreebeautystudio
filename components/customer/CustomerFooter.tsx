'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Phone, MessageCircle, Heart, Lock, ChevronUp, Instagram, MapPin } from 'lucide-react';

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
        background: 'linear-gradient(180deg, #021e22 0%, #011619 100%)',
        color: '#ffffff',
        borderTop: '2px solid transparent',
        backgroundImage: 'linear-gradient(180deg, #021e22 0%, #011619 100%)',
        backgroundClip: 'padding-box',
        position: 'relative',
        padding: '56px 24px 28px',
      }}
    >
      {/* Gold top accent line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent 0%, #EABA38 30%, #f5d87a 50%, #EABA38 70%, transparent 100%)' }} />
      
      <div
        className="cust-footer-inner"
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 'clamp(36px, 6vw, 64px)',
          marginBottom: 44,
        }}
      >
        {/* Left Column: Brand & Bio */}
        <div style={{ flex: '1 1 380px', maxWidth: 500 }}>
          <div style={{ marginBottom: 18 }}>
            <img
              src={settings?.logoUrl || SHREE_LOGO_BASE64}
              alt={salonName}
              style={{
                width: '100%',
                maxWidth: 240,
                height: 'auto',
                display: 'block',
                objectFit: 'contain',
                filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))',
              }}
            />
          </div>
          <h3
            style={{
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: '0.04em',
              margin: '0 0 12px',
              textTransform: 'uppercase',
              background: 'linear-gradient(135deg, #EABA38 0%, #f5d87a 50%, #D49B1F 100%)',
              backgroundSize: '200% 200%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {salonName}
          </h3>
          <p style={{ fontSize: 13.5, color: '#94a3b8', lineHeight: 1.65, margin: '0 0 20px' }}>
            Katargam&apos;s premier boutique beauty parlour and couture bridal studio. Dedicated exclusively to ladies for over 25+ years.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            <a
              href="https://wa.me/919824183769?text=Hi%20Shree%20!%0AWhatsApp%20Message"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                background: 'linear-gradient(135deg, #25D366 0%, #1fbe5a 100%)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 12.5,
                padding: '8px 16px',
                borderRadius: 99,
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(37,211,102,0.35)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              <MessageCircle size={14} />
              WhatsApp: +91 98241 83769
            </a>
            <a
              href="tel:+919824183769"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: 12,
                padding: '8px 15px',
                borderRadius: 99,
                textDecoration: 'none',
                border: '1px solid rgba(255,255,255,0.18)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              <Phone size={13} />
              Call Studio
            </a>
          </div>
          <div>
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Shree Beauty Studio on Instagram"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12.5,
                color: '#cbd5e1',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
                padding: '5px 12px 5px 7px',
                borderRadius: 99,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#EABA38'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#cbd5e1'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
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
              {instagramHandle}
            </a>
          </div>
        </div>

        {/* Single Navigation Column: Explore Studio */}
        <div style={{ flex: '0 1 auto', minWidth: 220 }}>
          <h4
            style={{
              fontSize: 13.5,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#EABA38',
              marginBottom: 16,
            }}
          >
            Explore Studio
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            <Link
              href="/"
              style={{ color: '#cbd5e1', fontSize: 13.5, textDecoration: 'none', transition: 'all 0.15s ease' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#EABA38'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#cbd5e1'; }}
            >
              Home
            </Link>
            <Link
              href="/services"
              style={{ color: '#cbd5e1', fontSize: 13.5, textDecoration: 'none', transition: 'all 0.15s ease' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#EABA38'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#cbd5e1'; }}
            >
              Services &amp; Pricing Menu
            </Link>
            <Link
              href="/bridal"
              style={{ color: '#cbd5e1', fontSize: 13.5, textDecoration: 'none', transition: 'all 0.15s ease' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#EABA38'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#cbd5e1'; }}
            >
              Couture Bridal Packages
            </Link>
            <Link
              href="/blog"
              style={{ color: '#cbd5e1', fontSize: 13.5, textDecoration: 'none', transition: 'all 0.15s ease' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#EABA38'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#cbd5e1'; }}
            >
              Beauty &amp; Care Blog
            </Link>
            <Link
              href="/about"
              style={{ color: '#cbd5e1', fontSize: 13.5, textDecoration: 'none', transition: 'all 0.15s ease' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#EABA38'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#cbd5e1'; }}
            >
              About Us &amp; Heritage
            </Link>
            <Link
              href="/ContactUs"
              style={{ color: '#cbd5e1', fontSize: 13.5, textDecoration: 'none', transition: 'all 0.15s ease' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#EABA38'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#cbd5e1'; }}
            >
              Contact Us
            </Link>
            <a
              href="https://maps.app.goo.gl/cwP9HTnqTFzVPYDW8"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#cbd5e1', fontSize: 13.5, textDecoration: 'none', transition: 'all 0.15s ease', display: 'flex', alignItems: 'center', gap: 5 }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#EABA38'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#cbd5e1'; }}
            >
              Katargam, Surat 📍
            </a>
          </div>
        </div>
      </div>

      {/* Back to Top */}
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
            width: 42,
            height: 42,
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
            (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 28px rgba(234,186,56,0.3)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(5,66,74,0.4)';
          }}
        >
          <ChevronUp size={20} />
        </button>
      )}

      {/* Bottom Bar */}
      <div
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          paddingTop: 24,
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          fontSize: 12.5,
          color: '#64748b',
        }}
      >
        <p style={{ margin: 0 }}>
          &copy; {currentYear} {salonName}. All rights reserved. Made with <Heart size={12} color="#EABA38" fill="#EABA38" style={{ display: 'inline', verticalAlign: 'middle' }} /> in Surat.
        </p>

        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link
            href="/admin"
            style={{
              color: '#475569',
              textDecoration: 'none',
              fontSize: 11.5,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#EABA38'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#475569'; }}
          >
            <Lock size={12} /> Staff &amp; Admin Portal &rarr;
          </Link>
        </div>
      </div>
    </footer>
  );
}
