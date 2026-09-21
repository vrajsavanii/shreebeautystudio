'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MapPin, Clock, Phone, MessageCircle, Heart, Lock, ChevronUp, Instagram } from 'lucide-react';

import { useSalonStore } from '@/lib/store';

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
  const address = settings?.address || '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004';
  const whatsapp = settings?.whatsapp || '919773240010';
  const openTime = settings?.open || '10:00';
  const closeTime = settings?.close || '19:00';
  const instagramHandle = settings?.instagramHandle || '@shreebeauty.studio';
  const instagramUrl = settings?.instagramUrl || `https://www.instagram.com/${instagramHandle.replace('@', '')}/`;
  const googleMapsUrl = settings?.googleMapsUrl || 'https://maps.app.goo.gl/cwP9HTnqTFzVPYDW8';

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
        padding: '56px 20px 24px',
      }}
    >
      {/* Gold top accent line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent 0%, #EABA38 30%, #f5d87a 50%, #EABA38 70%, transparent 100%)' }} />
      <div
        className="cust-footer-inner"
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 40,
          marginBottom: 40,
        }}
      >
        {/* Column 1: Brand & Bio */}
        <div>
          <h3
            style={{
              fontSize: 20,
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
          <p style={{ fontSize: 13.5, color: '#94a3b8', lineHeight: 1.7, margin: '0 0 20px' }}>
            Katargam's premier boutique beauty parlour and couture bridal studio. Dedicated exclusively to ladies for over 10+ years.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            <a
              href={`https://wa.me/${whatsapp}?text=Hi%20Shree%20Beauty%20Studio!%20I%20would%20like%20to%20book%20an%20appointment.`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'linear-gradient(135deg, #25D366 0%, #1fbe5a 100%)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 12.5,
                padding: '8px 16px',
                borderRadius: 99,
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(37,211,102,0.3)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              <MessageCircle size={14} />
              WhatsApp Us
            </a>
            <a
              href="tel:+919773240010"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: 12.5,
                padding: '7px 14px',
                borderRadius: 99,
                textDecoration: 'none',
              }}
            >
              <Phone size={14} />
              Call Studio
            </a>
          </div>
          {/* Social Media */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Shree Beauty Studio on Instagram"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                color: '#ffffff',
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(220, 39, 67, 0.35)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px) scale(1.1)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = ''; }}
            >
              <Instagram size={16} />
            </a>
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 13, color: '#cbd5e1', textDecoration: 'none', fontWeight: 600 }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#EABA38'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#cbd5e1'; }}
            >
              {instagramHandle}
            </a>
          </div>
        </div>

        {/* Column 2: Quick Links */}
        <div>
          <h4
            style={{
              fontSize: 14,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#EABA38',
              marginBottom: 16,
            }}
          >
            Quick Links
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link href="/" style={{ color: '#cbd5e1', fontSize: 13.5, textDecoration: 'none' }}>
              Home
            </Link>
            <Link href="/services" style={{ color: '#cbd5e1', fontSize: 13.5, textDecoration: 'none' }}>
              Services &amp; Pricing Menu
            </Link>
            <Link href="/bridal" style={{ color: '#cbd5e1', fontSize: 13.5, textDecoration: 'none' }}>
              Bridal &amp; Siders Packages
            </Link>
            <Link href="/about" style={{ color: '#cbd5e1', fontSize: 13.5, textDecoration: 'none' }}>
              About Us &amp; Heritage
            </Link>
            <Link href="/blog" style={{ color: '#cbd5e1', fontSize: 13.5, textDecoration: 'none' }}>
              Beauty &amp; Bridal Blog (50+ Guides)
            </Link>
            <Link href="/faq" style={{ color: '#cbd5e1', fontSize: 13.5, textDecoration: 'none' }}>
              Help &amp; FAQs
            </Link>
            <Link href="/book" style={{ color: '#cbd5e1', fontSize: 13.5, textDecoration: 'none' }}>
              Book Online Appointment
            </Link>
            <Link href="/my-appointments" style={{ color: '#cbd5e1', fontSize: 13.5, textDecoration: 'none' }}>
              Track My Appointments
            </Link>
          </div>
        </div>

        {/* Column 3: Studio Location & Hours */}
        <div>
          <h4
            style={{
              fontSize: 14,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#EABA38',
              marginBottom: 16,
            }}
          >
            Studio Visit &amp; Hours
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: '#cbd5e1', textDecoration: 'none' }}
              title="Open in Google Maps"
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#ffffff'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#cbd5e1'; }}
            >
              <MapPin size={16} color="#EABA38" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <span>{address}</span>
                <span style={{ display: 'block', fontSize: 11.5, color: '#EABA38', fontWeight: 700, marginTop: 2 }}>
                  📍 View on Google Maps ↗
                </span>
              </div>
            </a>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#cbd5e1' }}>
              <Clock size={16} color="#EABA38" style={{ flexShrink: 0 }} />
              <span>{openTime} – {closeTime} · Open All 7 Days</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#cbd5e1' }}>
              <Phone size={16} color="#EABA38" style={{ flexShrink: 0 }} />
              <a href="tel:+919773240010" style={{ color: '#ffffff', textDecoration: 'none', fontWeight: 600 }}>
                +91 97732 40010
              </a>
            </div>
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
            transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
            animation: 'slide-in-up 0.3s ease',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px) scale(1.08)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = ''; }}
        >
          <ChevronUp size={18} />
        </button>
      )}

      {/* Bottom Bar: Copyright & Discreet Staff Portal Link */}
      <div
        style={{
          maxWidth: 1280,
          margin: '20px auto 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          fontSize: 12,
          color: '#64748b',
        }}
      >
        <p style={{ margin: 0 }}>
          © {currentYear} {salonName}. All rights reserved. Made with{' '}
          <Heart size={12} style={{ display: 'inline', color: '#ef4444', fill: '#ef4444' }} /> in Surat.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link
            href="/admin"
            style={{
              color: '#94a3b8',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 11.5,
              transition: 'color 0.15s ease',
            }}
          >
            <Lock size={12} />
            Staff &amp; Admin Portal →
          </Link>
        </div>
      </div>
    </footer>
  );
}
