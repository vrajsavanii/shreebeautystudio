'use client';

import Link from 'next/link';
import { MapPin, Clock, Phone, MessageCircle, Heart, Lock, ShieldCheck } from 'lucide-react';
import { SHREE_ONLY_LOGO_BASE64 } from '@/lib/logo-base64';
import { useSalonStore } from '@/lib/store';

export default function CustomerFooter() {
  const currentYear = new Date().getFullYear();
  const { data } = useSalonStore();
  const settings = data?.settings;

  const salonName = settings?.salon || 'Shree Beauty Studio';
  const address = settings?.address || '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004';
  const whatsapp = settings?.whatsapp || '919824183769';
  const openTime = settings?.open || '10:00';
  const closeTime = settings?.close || '19:00';

  return (
    <footer
      className="cust-footer"
      style={{
        background: '#021e22',
        color: '#ffffff',
        borderTop: '1px solid rgba(234, 186, 56, 0.2)',
        padding: '56px 20px 24px',
      }}
    >
      <div
        className="cust-footer-inner"
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 40,
          paddingBottom: 40,
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* Column 1: Brand */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <img
              src={SHREE_ONLY_LOGO_BASE64}
              alt={salonName}
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1.5px solid #EABA38',
              }}
            />
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#ffffff' }}>{salonName}</h3>
              <p style={{ margin: 0, fontSize: 12, color: '#EABA38', fontWeight: 600 }}>
                Premium Beauty &amp; Wellness
              </p>
            </div>
          </div>
          <p style={{ fontSize: 13.5, color: '#94a3b8', lineHeight: 1.6, margin: '0 0 16px' }}>
            Your destination for luxury bridal makeovers, rejuvenating skin therapies, hair aesthetics, and
            wellness treatments in Katargam, Surat.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <a
              href={`https://wa.me/${whatsapp}?text=Hi%20Shree%20Beauty%20Studio!`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#25D366',
                color: '#053320',
                fontWeight: 700,
                fontSize: 12.5,
                padding: '7px 14px',
                borderRadius: 99,
                textDecoration: 'none',
              }}
            >
              <MessageCircle size={14} />
              WhatsApp Us
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
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: '#cbd5e1' }}>
              <MapPin size={16} color="#EABA38" style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{address}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#cbd5e1' }}>
              <Clock size={16} color="#EABA38" style={{ flexShrink: 0 }} />
              <span>{openTime} – {closeTime} · Open All 7 Days</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#cbd5e1' }}>
              <Phone size={16} color="#EABA38" style={{ flexShrink: 0 }} />
              <a href="tel:+919824183769" style={{ color: '#ffffff', textDecoration: 'none', fontWeight: 600 }}>
                +91 98241 83769
              </a>
            </div>
          </div>
        </div>
      </div>

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
