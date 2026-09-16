'use client';

import React, { useEffect, useState } from 'react';
import CustomerNavbar from '@/components/customer/CustomerNavbar';
import CustomerFooter from '@/components/customer/CustomerFooter';
import { useSalonStore } from '@/lib/store';

const WHATSAPP_SVG = () => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const BANNER_MESSAGES = [
  '✨ Book early — bridal & festive slots are filling fast this season!',
  '💛 Free hair consultation with every Keratin or Nanoplastia treatment.',
  '🌟 Open 7 days · 10 AM – 7 PM · Katargam, Surat · Call +91 97732 40010',
];

export default function PublicLayoutClient({ children }: { children: React.ReactNode }) {
  const { data, updateData } = useSalonStore();
  const whatsapp = data?.settings?.whatsapp || '919773240010';
  const [bannerVisible, setBannerVisible] = useState(true);
  const [bannerIdx, setBannerIdx] = useState(0);
  const [waHover, setWaHover] = useState(false);

  useEffect(() => {
    fetch('/api/public-data')
      .then((res) => res.json())
      .then((res) => {
        if (res.success && (res.services || res.settings || res.bridalPackages)) {
          updateData((prev) => ({
            ...prev,
            settings: { ...prev.settings, ...(res.settings || {}) },
            services: res.services && res.services.length > 0 ? res.services : prev.services,
            bridalPackages:
              res.bridalPackages && res.bridalPackages.length > 0
                ? res.bridalPackages
                : prev.bridalPackages,
          }));
        }
      })
      .catch((err) => console.warn('Public data sync notice:', err));
  }, [updateData]);

  // Auto-rotate banner messages every 5s
  useEffect(() => {
    const t = setInterval(() => setBannerIdx((i) => (i + 1) % BANNER_MESSAGES.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      {/* ─── Announcement Banner ─── */}
      {bannerVisible && (
        <div className="announcement-banner">
          <span className="banner-text">{BANNER_MESSAGES[bannerIdx]}</span>
          <button
            type="button"
            className="dismiss-btn"
            onClick={() => setBannerVisible(false)}
            aria-label="Dismiss announcement"
          >
            ✕
          </button>
        </div>
      )}

      <CustomerNavbar />
      <main style={{ flex: 1 }}>{children}</main>
      <CustomerFooter />

      {/* ─── Premium Expanding WhatsApp Float Button ─── */}
      <a
        href={`https://wa.me/${whatsapp}?text=Hi%20Shree%20Beauty%20Studio!%20I%27d%20like%20to%20book%20an%20appointment.`}
        target="_blank"
        rel="noopener noreferrer"
        className="cust-whatsapp-float"
        aria-label="Chat with Shree Beauty Studio on WhatsApp"
        onMouseEnter={() => setWaHover(true)}
        onMouseLeave={() => setWaHover(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: waHover ? 10 : 0,
          borderRadius: 99,
          padding: waHover ? '13px 20px 13px 14px' : '13px 14px',
          color: '#ffffff',
          textDecoration: 'none',
          maxWidth: waHover ? 210 : 50,
          overflow: 'hidden',
          transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <WHATSAPP_SVG />
          <span
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: '#ffffff',
              border: '1.5px solid rgba(37,211,102,0.9)',
              boxShadow: '0 0 8px rgba(34,197,94,0.9)',
              animation: 'glow-pulse 2s infinite ease-in-out',
            }}
          />
        </span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            opacity: waHover ? 1 : 0,
            width: waHover ? 'auto' : 0,
            transition: 'opacity 0.25s ease 0.05s',
          }}
        >
          Book via WhatsApp
        </span>
      </a>
    </div>
  );
}
