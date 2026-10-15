'use client';

import React from 'react';
import Link from 'next/link';
import {
  Cookie,
  ShieldCheck,
  SlidersHorizontal,
  Lock,
  Globe,
  Settings,
  HelpCircle,
  ExternalLink,
  Phone,
  MapPin,
  Clock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface CookieItem {
  name: string;
  category: 'Essential' | 'Functional' | 'Analytics' | 'Third-Party';
  provider: string;
  purpose: string;
  duration: string;
}

const COOKIE_INVENTORY: CookieItem[] = [
  {
    name: 'shree_cookie_consent_v1',
    category: 'Essential',
    provider: 'Shree Beauty Studio (First-Party)',
    purpose: 'Stores your cookie banner consent choices and categories allowed.',
    duration: '1 Year',
  },
  {
    name: 'sb-*-auth-token',
    category: 'Essential',
    provider: 'Supabase / Shree Beauty Studio',
    purpose: 'Maintains authenticated customer session state for booking and appointment lookup.',
    duration: 'Session / 30 Days',
  },
  {
    name: '__cf_bm / _cfuvid',
    category: 'Essential',
    provider: 'Cloudflare / Vercel Edge',
    purpose: 'Provides edge bot mitigation, DDoS security, and rate limiting against malicious traffic.',
    duration: '30 Minutes',
  },
  {
    name: 'shree_salon_store',
    category: 'Functional',
    provider: 'Shree Beauty Studio (First-Party)',
    purpose: 'Caches salon catalog, service pricing, and business hours for lightning-fast offline browsing.',
    duration: 'Persistent (Local Storage)',
  },
  {
    name: 'shree_app_engagement_*',
    category: 'Functional',
    provider: 'Shree Beauty Studio (First-Party)',
    purpose: 'Remembers daily beauty tip dismissals and push notification permissions preference.',
    duration: '30 Days',
  },
  {
    name: '_vercel_jwt / _vercel_live',
    category: 'Analytics',
    provider: 'Vercel Analytics',
    purpose: 'Measures page load speeds, Core Web Vitals (LCP, CLS, INP), and server response times.',
    duration: 'Session',
  },
  {
    name: '_ga / _gid',
    category: 'Analytics',
    provider: 'Google Analytics (if enabled)',
    purpose: 'Aggregated, anonymized statistics on which bridal and hair treatment guides receive the most readership.',
    duration: '1 Day to 2 Years',
  },
  {
    name: 'maps_st / NID',
    category: 'Third-Party',
    provider: 'Google Maps Embed',
    purpose: 'Renders the interactive Google Map showing our salon location in Radhika Society, Katargam.',
    duration: '6 Months',
  },
  {
    name: 'ig_did / rur',
    category: 'Third-Party',
    provider: 'Instagram / Meta',
    purpose: 'Powers the verified @shreebeauty.studio real-time bridal and hair makeover visual showcase.',
    duration: 'Session / 90 Days',
  },
];

export default function CookiesPolicyClient() {
  const openCookiePreferences = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('open-cookie-settings'));
    }
  };

  return (
    <div style={{ backgroundColor: '#011215', color: '#ffffff', minHeight: '100vh', paddingBottom: 80 }}>
      {/* ─── Hero Header ─── */}
      <section
        style={{
          position: 'relative',
          padding: 'clamp(56px, 8vw, 96px) 20px 48px',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(5, 66, 74, 0.7) 0%, #021a1d 55%, #011215 100%)',
          borderBottom: '1px solid rgba(234, 186, 56, 0.2)',
          textAlign: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Subtle decorative glow */}
        <div
          style={{
            position: 'absolute',
            top: -120,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 600,
            height: 300,
            background: 'radial-gradient(circle, rgba(234, 186, 56, 0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ maxWidth: 860, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          {/* Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 999,
              background: 'rgba(234, 186, 56, 0.1)',
              border: '1px solid rgba(234, 186, 56, 0.3)',
              color: '#f5d87a',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 20,
            }}
          >
            <Cookie size={14} color="#EABA38" />
            <span>Transparency & Privacy Policy</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(32px, 5vw, 48px)',
              fontWeight: 900,
              lineHeight: 1.15,
              margin: '0 0 16px',
              background: 'linear-gradient(135deg, #ffffff 30%, #f5d87a 80%, #EABA38 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.02em',
            }}
          >
            Cookie Policy
          </h1>

          <p
            style={{
              fontSize: 'clamp(15px, 2vw, 17px)',
              lineHeight: 1.7,
              color: '#cbd5e1',
              maxWidth: 680,
              margin: '0 auto 24px',
            }}
          >
            How Shree Beauty Studio utilizes cookies and privacy-first storage technologies to deliver secure salon
            booking, rapid page loading, and an exceptional digital experience.
          </p>

          {/* Quick Details Badges */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 12,
              fontSize: 12,
              color: '#94a3b8',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Clock size={13} color="#EABA38" /> Last Updated: October 2026
            </span>
            <span>•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={13} color="#80EEEE" /> India DPDP Act 2023 Compliant
            </span>
            <span>•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={13} color="#EABA38" /> 100% Zero Invasive Ad Trackers
            </span>
          </div>

          {/* Instant Interactive Preference Trigger */}
          <div style={{ marginTop: 28 }}>
            <button
              type="button"
              onClick={openCookiePreferences}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'linear-gradient(135deg, #EABA38 0%, #D4AF37 100%)',
                color: '#011215',
                border: 'none',
                borderRadius: 12,
                padding: '12px 24px',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(234, 186, 56, 0.3)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <SlidersHorizontal size={16} />
              <span>Customize My Cookie Preferences</span>
            </button>
          </div>
        </div>
      </section>

      {/* ─── Main Content Container ─── */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 20px 0' }}>
        {/* Table of Contents Quick Nav */}
        <div
          style={{
            padding: '20px 24px',
            borderRadius: 16,
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(234, 186, 56, 0.2)',
            marginBottom: 48,
          }}
        >
          <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#f5d87a' }}>
            Quick Navigation
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 10,
              fontSize: 13,
            }}
          >
            {[
              { href: '#what-are-cookies', label: '1. What Are Cookies?' },
              { href: '#how-we-use', label: '2. How We Use Cookies' },
              { href: '#cookie-categories', label: '3. Cookie Categories' },
              { href: '#cookie-inventory', label: '4. Complete Cookie Inventory' },
              { href: '#manage-cookies', label: '5. How to Manage in Browsers' },
              { href: '#contact-dpo', label: '6. Privacy Officer & Contact' },
            ].map((item, idx) => (
              <a
                key={idx}
                href={item.href}
                style={{
                  color: '#cbd5e1',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#EABA38')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#cbd5e1')}
              >
                <ArrowRight size={12} color="#EABA38" />
                <span>{item.label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* ─── Section 1: What Are Cookies? ─── */}
        <section id="what-are-cookies" style={{ marginBottom: 48, scrollMarginTop: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(234, 186, 56, 0.15)',
                color: '#EABA38',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Cookie size={18} />
            </div>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#ffffff' }}>
              1. What Are Cookies and Local Storage?
            </h2>
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: '#cbd5e1', margin: '0 0 16px' }}>
            Cookies are small text files placed on your computer, smartphone, or tablet when you visit a website. They
            are widely used to allow web applications to function properly, remember user selections across pages, and
            provide diagnostic performance metrics to website operators.
          </p>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: '#cbd5e1', margin: 0 }}>
            In addition to HTTP cookies, <strong>Shree Beauty Studio</strong> utilizes modern Web Storage APIs (such as{' '}
            <code style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: 4, color: '#f5d87a' }}>
              localStorage
            </code>{' '}
            and{' '}
            <code style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: 4, color: '#f5d87a' }}>
              sessionStorage
            </code>
            ). These modern storage mechanisms remain safely inside your device browser and allow you to view our service
            menu and bridal hair price lists instantly, even when your cellular network in Surat is weak or offline.
          </p>
        </section>

        {/* ─── Section 2: How We Use Cookies ─── */}
        <section id="how-we-use" style={{ marginBottom: 48, scrollMarginTop: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(5, 66, 74, 0.4)',
                border: '1px solid rgba(234, 186, 56, 0.3)',
                color: '#EABA38',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck size={18} />
            </div>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#ffffff' }}>
              2. How Shree Beauty Studio Uses Cookies
            </h2>
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: '#cbd5e1', margin: '0 0 16px' }}>
            We treat your privacy with the same uncompromising care that we dedicate to our luxury beauty treatments. We
            use cookies strictly for legitimate, user-beneficial purposes:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            {[
              {
                title: 'Seamless Salon Appointments',
                desc: 'Retaining selected beauty packages, bridal makeover dates, and contact information during the booking process.',
              },
              {
                title: 'Lightning-Fast Offline Speed',
                desc: 'Caching service price lists and treatment guides locally so returning Katargam clients do not waste mobile cellular data.',
              },
              {
                title: 'Account & Verification Security',
                desc: 'Protecting your customer portal, appointment invoice lookups, and OTP login sessions against unauthorized hijacking.',
              },
              {
                title: 'Interactive Studio Map & Socials',
                desc: 'Allowing you to navigate driving directions via Google Maps and inspect verified bridal transformations via Instagram.',
              },
            ].map((card, i) => (
              <div
                key={i}
                style={{
                  padding: '18px 20px',
                  borderRadius: 14,
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <h4 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: '#f5d87a' }}>
                  {card.title}
                </h4>
                <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>{card.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Section 3: Categories of Cookies ─── */}
        <section id="cookie-categories" style={{ marginBottom: 48, scrollMarginTop: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(234, 186, 56, 0.15)',
                color: '#EABA38',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SlidersHorizontal size={18} />
            </div>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#ffffff' }}>
              3. Categories of Cookies We Use
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Category A */}
            <div
              style={{
                padding: '24px',
                borderRadius: 16,
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(128, 238, 238, 0.25)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Lock size={18} color="#80EEEE" />
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#ffffff' }}>
                    A. Strictly Necessary / Essential Cookies
                  </h3>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#80EEEE',
                    background: 'rgba(128, 238, 238, 0.1)',
                    padding: '3px 10px',
                    borderRadius: 99,
                    border: '1px solid rgba(128, 238, 238, 0.3)',
                  }}
                >
                  Always Active · Cannot be disabled
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 14, color: '#cbd5e1', lineHeight: 1.7 }}>
                These cookies are indispensable for our website to operate securely. They enable core functions such as
                CSRF security protection, user authentication on appointment view pages, and network routing on Vercel
                Edge. Without these, our appointment booking system cannot function.
              </p>
            </div>

            {/* Category B */}
            <div
              style={{
                padding: '24px',
                borderRadius: 16,
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(234, 186, 56, 0.2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Settings size={18} color="#EABA38" />
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#ffffff' }}>
                    B. Functional & Preference Cookies
                  </h3>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#f5d87a',
                    background: 'rgba(234, 186, 56, 0.1)',
                    padding: '3px 10px',
                    borderRadius: 99,
                    border: '1px solid rgba(234, 186, 56, 0.3)',
                  }}
                >
                  Configurable in Preferences
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 14, color: '#cbd5e1', lineHeight: 1.7 }}>
                These cookies remember choices you make (such as acknowledging promotional announcement banners, saving
                offline service catalogs, or tailoring your salon navigation). They enhance your convenience by
                preventing duplicate popups.
              </p>
            </div>

            {/* Category C */}
            <div
              style={{
                padding: '24px',
                borderRadius: 16,
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Globe size={18} color="#94a3b8" />
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#ffffff' }}>
                    C. Analytics & Performance Cookies
                  </h3>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#cbd5e1',
                    background: 'rgba(255, 255, 255, 0.06)',
                    padding: '3px 10px',
                    borderRadius: 99,
                  }}
                >
                  Optional · Anonymized
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 14, color: '#cbd5e1', lineHeight: 1.7 }}>
                These cookies collect strictly aggregated, anonymized data about how visitors interact with our 300+
                expert beauty articles and service menus. They help us identify which hair treatments (e.g., Nanoplastia,
                Hair Botox) brides in Surat are researching most, allowing us to publish more useful bridal guidance.
              </p>
            </div>

            {/* Category D */}
            <div
              style={{
                padding: '24px',
                borderRadius: 16,
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={18} color="#f5d87a" />
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#ffffff' }}>
                    D. Third-Party Integrations & Social Embeds
                  </h3>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#cbd5e1',
                    background: 'rgba(255, 255, 255, 0.06)',
                    padding: '3px 10px',
                    borderRadius: 99,
                  }}
                >
                  Third-Party Provider Managed
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 14, color: '#cbd5e1', lineHeight: 1.7 }}>
                When you interact with embedded third-party features on our site—such as Google Maps for directions to
                Radhika Society, Katargam, or our verified Instagram video feed—those providers may place their own cookies
                in your browser according to their respective privacy statements.
              </p>
            </div>
          </div>
        </section>

        {/* ─── Section 4: Detailed Cookie Inventory Table ─── */}
        <section id="cookie-inventory" style={{ marginBottom: 48, scrollMarginTop: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(234, 186, 56, 0.15)',
                color: '#EABA38',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Cookie size={18} />
            </div>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#ffffff' }}>
              4. Complete Cookie & Local Storage Inventory
            </h2>
          </div>
          <p style={{ fontSize: 14, color: '#94a3b8', margin: '0 0 20px' }}>
            Below is an itemized breakdown of the key cookies, local storage records, and session tokens utilized across
            the Shree Beauty Studio web platform:
          </p>

          <div
            style={{
              overflowX: 'auto',
              borderRadius: 16,
              border: '1px solid rgba(234, 186, 56, 0.25)',
              background: 'rgba(2, 26, 29, 0.6)',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.3)',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: 13,
                minWidth: 700,
              }}
            >
              <thead>
                <tr style={{ background: 'rgba(5, 66, 74, 0.8)', borderBottom: '1px solid rgba(234, 186, 56, 0.3)' }}>
                  <th style={{ padding: '14px 16px', color: '#f5d87a', fontWeight: 800 }}>Cookie / Key</th>
                  <th style={{ padding: '14px 16px', color: '#f5d87a', fontWeight: 800 }}>Category</th>
                  <th style={{ padding: '14px 16px', color: '#f5d87a', fontWeight: 800 }}>Provider</th>
                  <th style={{ padding: '14px 16px', color: '#f5d87a', fontWeight: 800 }}>Purpose</th>
                  <th style={{ padding: '14px 16px', color: '#f5d87a', fontWeight: 800 }}>Duration</th>
                </tr>
              </thead>
              <tbody>
                {COOKIE_INVENTORY.map((c, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                      background: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)',
                    }}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#ffffff', fontFamily: 'monospace' }}>
                      {c.name}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 6,
                          background:
                            c.category === 'Essential'
                              ? 'rgba(128, 238, 238, 0.15)'
                              : c.category === 'Functional'
                              ? 'rgba(234, 186, 56, 0.15)'
                              : 'rgba(255, 255, 255, 0.08)',
                          color:
                            c.category === 'Essential'
                              ? '#80EEEE'
                              : c.category === 'Functional'
                              ? '#f5d87a'
                              : '#cbd5e1',
                        }}
                      >
                        {c.category}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>{c.provider}</td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8', lineHeight: 1.5 }}>{c.purpose}</td>
                    <td style={{ padding: '12px 16px', color: '#f5d87a', whiteSpace: 'nowrap' }}>{c.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ─── Section 5: How to Manage in Browsers ─── */}
        <section id="manage-cookies" style={{ marginBottom: 48, scrollMarginTop: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(234, 186, 56, 0.15)',
                color: '#EABA38',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Settings size={18} />
            </div>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#ffffff' }}>
              5. How to Manage Cookies in Your Browser
            </h2>
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: '#cbd5e1', margin: '0 0 20px' }}>
            You have complete sovereignty over cookies. You can adjust your consent on our website at any moment, or
            delete and block cookies directly within your internet browser settings:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            {[
              {
                browser: 'Google Chrome',
                steps: 'Settings → Privacy and security → Third-party cookies → Block third-party cookies or Clear data.',
              },
              {
                browser: 'Apple Safari (iPhone / Mac)',
                steps: 'Settings → Safari → Advanced → Block All Cookies, or Privacy → Manage Website Data.',
              },
              {
                browser: 'Mozilla Firefox',
                steps: 'Settings → Privacy & Security → Enhanced Tracking Protection → Strict, or Clear Cookies and Site Data.',
              },
              {
                browser: 'Microsoft Edge',
                steps: 'Settings → Cookies and site permissions → Manage and delete cookies and site data.',
              },
            ].map((b, i) => (
              <div
                key={i}
                style={{
                  padding: '16px 18px',
                  borderRadius: 12,
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <h4 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: '#ffffff' }}>
                  {b.browser}
                </h4>
                <p style={{ margin: 0, fontSize: 12.5, color: '#94a3b8', lineHeight: 1.6 }}>{b.steps}</p>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 20,
              padding: '16px 20px',
              borderRadius: 12,
              background: 'rgba(234, 186, 56, 0.08)',
              border: '1px solid rgba(234, 186, 56, 0.25)',
              fontSize: 13,
              color: '#f5d87a',
              lineHeight: 1.6,
            }}
          >
            <strong>Please Note:</strong> Disabling all cookies in your browser will prevent you from completing online
            bridal package reservations and logging in to your personal appointment history on our website.
          </div>
        </section>

        {/* ─── Section 6: Contact & Privacy Officer ─── */}
        <section id="contact-dpo" style={{ marginBottom: 48, scrollMarginTop: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(5, 66, 74, 0.4)',
                border: '1px solid rgba(234, 186, 56, 0.3)',
                color: '#EABA38',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <HelpCircle size={18} />
            </div>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#ffffff' }}>
              6. Privacy Officer & Contact Details
            </h2>
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: '#cbd5e1', margin: '0 0 20px' }}>
            If you have any questions or concerns regarding our Cookie Policy, your personal data, or our compliance with
            the Indian Digital Personal Data Protection Act, please contact our team:
          </p>

          <div
            style={{
              padding: '24px',
              borderRadius: 16,
              background: 'radial-gradient(ellipse at 50% 0%, rgba(5, 66, 74, 0.5) 0%, rgba(2, 26, 29, 0.8) 100%)',
              border: '1px solid rgba(234, 186, 56, 0.3)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 20,
            }}
          >
            <div>
              <h4 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800, color: '#f5d87a' }}>
                Shree Beauty Studio & Bridal Salon
              </h4>
              <p style={{ margin: '0 0 4px', fontSize: 13, color: '#cbd5e1' }}>
                Attn: Data Protection & Client Grievance Cell
              </p>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 12, fontSize: 13, color: '#94a3b8' }}>
                <MapPin size={16} color="#EABA38" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004, India</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>
              <a
                href="tel:+919824183769"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  color: '#ffffff',
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                <Phone size={16} color="#EABA38" />
                <span>+91 98241 83769</span>
              </a>

              <a
                href="https://wa.me/919824183769?text=Hi%20Shree%20Beauty%20Studio,%20I%20have%20a%20question%20about%20your%20Cookie%20Policy."
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  color: '#25D366',
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                <span>💬 Chat with us on WhatsApp</span>
                <ExternalLink size={13} />
              </a>

              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                🕒 Open 7 Days: 10:00 AM – 7:00 PM IST
              </div>
            </div>
          </div>
        </section>

        {/* ─── Back to Services CTA ─── */}
        <div
          style={{
            textAlign: 'center',
            paddingTop: 32,
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <p style={{ fontSize: 14, color: '#94a3b8', margin: '0 0 16px' }}>
            Ready to experience Katargam&apos;s premier ladies-only beauty treatments?
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Link
              href="/services"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'linear-gradient(135deg, #EABA38 0%, #D4AF37 100%)',
                color: '#011215',
                padding: '10px 20px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <span>Explore Salon Services</span>
              <ArrowRight size={14} />
            </Link>
            <Link
              href="/bridal"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(255, 255, 255, 0.06)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                padding: '10px 20px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <span>View Bridal Packages</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
