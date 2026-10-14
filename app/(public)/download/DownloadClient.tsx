'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Download,
  Smartphone,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Share2,
  Calendar,
  Lock,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { GooglePlayIcon, AppleIcon, AndroidIcon } from '@/components/customer/AppShowcaseSection';

export default function DownloadClient() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: 'Is it completely safe to install this APK on my Android phone?',
      a: 'Yes, 100%. The APK is directly compiled from our official Shree Beauty Studio codebase without third-party advertisements or trackers. It is strictly secured, respects your privacy, and requires minimal permissions (such as camera for profile photos).',
    },
    {
      q: 'Why does Android show "File might be harmful" when downloading?',
      a: 'This is a standard security warning Android displays whenever you download any application (.apk file) directly from a website rather than Google Play. You can safely tap "Download anyway".',
    },
    {
      q: 'When will the app be officially available on Google Play Store & Apple App Store?',
      a: 'Both apps are in submission and review stages with Google Play and Apple App Store. In the meantime, Android users can download the APK directly, and iPhone users can bookmark the site to their Home Screen via Safari for an instant app experience.',
    },
    {
      q: 'How do I update the application when a new version is released?',
      a: 'Whenever a newer version is released, you can simply visit this page (shreebeauty.studio/download) and download the latest APK. Installing it will update the existing app while keeping all your booking history and preferences intact.',
    },
  ];

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* ─── HERO HEADER ─── */}
      <section
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(5, 66, 74, 0.95) 0%, #032B30 60%, #011518 100%)',
          color: '#ffffff',
          padding: 'clamp(60px, 8vw, 100px) 20px clamp(48px, 6vw, 80px)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          borderBottom: '1px solid rgba(234, 186, 56, 0.3)',
        }}
      >
        <div style={{ maxWidth: 860, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          {/* Eyebrow */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 16px',
              borderRadius: 999,
              background: 'rgba(234, 186, 56, 0.15)',
              border: '1px solid rgba(234, 186, 56, 0.35)',
              color: '#f5d87a',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: 20,
            }}
          >
            <Smartphone size={15} color="#EABA38" />
            <span>Official Mobile Applications · v1.2</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(30px, 4.5vw, 52px)',
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              margin: '0 0 20px',
              color: '#ffffff',
            }}
          >
            Download Shree Beauty Studio{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #ffffff 15%, #f5d87a 65%, #EABA38 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              For Your Phone
            </span>
          </h1>

          <p
            style={{
              fontSize: 'clamp(15px, 1.4vw, 18px)',
              lineHeight: 1.65,
              color: '#cbd5e1',
              margin: '0 auto 32px',
              maxWidth: 680,
            }}
          >
            Experience lightning-fast appointment booking, live salon notifications, and bridal consultations.
            Available now for Android, and launching soon on the Apple App Store.
          </p>

          {/* Quick Stats Badges */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 20,
              flexWrap: 'wrap',
              fontSize: 13,
              color: 'rgba(255, 255, 255, 0.85)',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={16} color="#80EEEE" /> 100% Virus-Free &amp; Verified
            </span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={16} color="#EABA38" /> Android 8.0 to Android 15
            </span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={16} color="#4ade80" /> v1.2 Latest Release
            </span>
          </div>
        </div>
      </section>

      {/* ─── APK DOWNLOAD CARDS SECTION ─── */}
      <section style={{ maxWidth: 1160, margin: '-40px auto 60px', padding: '0 20px', position: 'relative', zIndex: 10 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 28,
          }}
        >
          {/* ─── CARD 1: Customer Booking App ─── */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: 24,
              border: '2px solid rgba(234, 186, 56, 0.4)',
              padding: '36px 30px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Top Recommended Tag */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                background: 'linear-gradient(135deg, #EABA38 0%, #D4AF37 100%)',
                color: '#011215',
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '6px 18px',
                borderBottomLeftRadius: 16,
              }}
            >
              For Salon Customers
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, #032B30 0%, #05424A 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 6px 18px rgba(5, 66, 74, 0.25)',
                  flexShrink: 0,
                }}
              >
                <Smartphone size={32} color="#EABA38" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#032B30' }}>
                  Shree Beauty Studio
                </h2>
                <span style={{ fontSize: 13, color: '#64748b' }}>Customer Booking &amp; Salon App</span>
              </div>
            </div>

            <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6, margin: '0 0 20px' }}>
              The complete client companion. Browse full treatment menus, pricing, bridal packages, check live
              stylist availability, and track your beauty bookings in Katargam, Surat.
            </p>

            {/* App Specs */}
            <div
              style={{
                background: '#f8fafc',
                borderRadius: 14,
                padding: '14px 16px',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 10,
                textAlign: 'center',
                marginBottom: 24,
                border: '1px solid #e2e8f0',
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Version</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#032B30' }}>v1.2</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Size</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#032B30' }}>20.2 MB</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>OS</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#032B30' }}>Android 8.0+</div>
              </div>
            </div>

            {/* Feature List */}
            <ul style={{ margin: '0 0 28px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                '1-Tap fast slot reservation without waiting in queues',
                'Transparent pricing for 100+ hair, skin & bridal treatments',
                'Real-time appointment push reminders & notifications',
                '100% Ladies-only private sanctuary guarantee',
              ].map((feat, idx) => (
                <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#334155' }}>
                  <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0 }} />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>

            {/* Download Button */}
            <div style={{ marginTop: 'auto' }}>
              <a
                href="/downloads/Shree-Beauty-Studio.apk"
                download="Shree-Beauty-Studio.apk"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  background: 'linear-gradient(135deg, #05424A 0%, #032B30 100%)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: 15,
                  padding: '16px 24px',
                  borderRadius: 14,
                  textDecoration: 'none',
                  boxShadow: '0 8px 24px rgba(5, 66, 74, 0.35)',
                  transition: 'all 0.2s ease',
                  border: '1px solid rgba(234, 186, 56, 0.3)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 30px rgba(5, 66, 74, 0.5)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(5, 66, 74, 0.35)';
                }}
              >
                <Download size={20} color="#EABA38" />
                <span>Download Customer App (APK)</span>
              </a>
              <p style={{ textAlign: 'center', fontSize: 11.5, color: '#94a3b8', margin: '8px 0 0' }}>
                Direct APK download · Package: com.shreebeautystudio.app
              </p>
            </div>
          </div>

          {/* ─── CARD 2: Salon Staff & Admin Portal ─── */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: 24,
              border: '1.5px solid #e2e8f0',
              padding: '36px 30px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.06)',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Staff Tag */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                background: '#e0f2fe',
                color: '#0369a1',
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '6px 18px',
                borderBottomLeftRadius: 16,
              }}
            >
              For Salon Staff &amp; Admin
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, #0e7490 0%, #0369a1 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 6px 18px rgba(14, 116, 144, 0.25)',
                  flexShrink: 0,
                }}
              >
                <ShieldCheck size={32} color="#ffffff" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#032B30' }}>
                  Shree Studio Admin
                </h2>
                <span style={{ fontSize: 13, color: '#64748b' }}>Operations &amp; Appointments Portal</span>
              </div>
            </div>

            <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6, margin: '0 0 20px' }}>
              Standalone portal for salon receptionists, stylists, and management. Manages customer queues,
              appointment bookings, billing, client consultation logs, and daily salon analytics.
            </p>

            {/* App Specs */}
            <div
              style={{
                background: '#f8fafc',
                borderRadius: 14,
                padding: '14px 16px',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 10,
                textAlign: 'center',
                marginBottom: 24,
                border: '1px solid #e2e8f0',
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Version</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#032B30' }}>v1.2</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Size</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#032B30' }}>20.2 MB</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>OS</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#032B30' }}>Android 8.0+</div>
              </div>
            </div>

            {/* Feature List */}
            <ul style={{ margin: '0 0 28px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                'Full dashboard pointing directly to /admin operations',
                'Live queue tracking & instant appointment status switcher',
                'Customer treatment history & service preference notes',
                'Can be installed side-by-side with Customer App',
              ].map((feat, idx) => (
                <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#334155' }}>
                  <CheckCircle2 size={16} color="#0284c7" style={{ flexShrink: 0 }} />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>

            {/* Download Button */}
            <div style={{ marginTop: 'auto' }}>
              <a
                href="/downloads/Shree-Admin-Portal.apk"
                download="Shree-Admin-Portal.apk"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  background: 'linear-gradient(135deg, #0e7490 0%, #0369a1 100%)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: 15,
                  padding: '16px 24px',
                  borderRadius: 14,
                  textDecoration: 'none',
                  boxShadow: '0 8px 24px rgba(14, 116, 144, 0.3)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 30px rgba(14, 116, 144, 0.45)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(14, 116, 144, 0.3)';
                }}
              >
                <Download size={20} color="#ffffff" />
                <span>Download Admin Portal (APK)</span>
              </a>
              <p style={{ textAlign: 'center', fontSize: 11.5, color: '#94a3b8', margin: '8px 0 0' }}>
                Direct APK download · Package: com.shreebeautystudio.admin
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── APP STORE & PLAY STORE OFFICIAL STATUS ─── */}
      <section style={{ maxWidth: 1160, margin: '0 auto 60px', padding: '0 20px' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #011518 0%, #032B30 100%)',
            borderRadius: 24,
            padding: ' clamp(32px, 4vw, 44px)',
            color: '#ffffff',
            border: '1px solid rgba(234, 186, 56, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#EABA38',
                }}
              >
                Store Availability
              </span>
              <h3 style={{ margin: '4px 0 8px', fontSize: 24, fontWeight: 800 }}>
                Google Play Store &amp; Apple App Store
              </h3>
              <p style={{ margin: 0, fontSize: 14.5, color: '#cbd5e1', maxWidth: 640 }}>
                We are currently rolling out to both official app stores. You can download the direct APK for Android right now, or use our mobile web app on iPhone.
              </p>
            </div>

            {/* Store Buttons Row */}
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {/* Google Play */}
              <a
                href="/downloads/Shree-Beauty-Studio.apk"
                download="Shree-Beauty-Studio.apk"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 12,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1.5px solid rgba(234, 186, 56, 0.4)',
                  padding: '10px 18px',
                  borderRadius: 14,
                  color: '#ffffff',
                  textDecoration: 'none',
                }}
              >
                <GooglePlayIcon size={26} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 9.5, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    GET IT ON
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: '#ffffff' }}>Google Play</span>
                </div>
              </a>

              {/* Apple App Store (Coming Soon) */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 12,
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1.5px solid rgba(255, 255, 255, 0.15)',
                  padding: '10px 18px',
                  borderRadius: 14,
                  color: '#ffffff',
                  position: 'relative',
                }}
              >
                <AppleIcon size={26} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 9.5, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Download on the
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: '#ffffff' }}>App Store</span>
                </div>
                <span
                  style={{
                    position: 'absolute',
                    top: -10,
                    right: 8,
                    background: 'linear-gradient(135deg, #EABA38 0%, #D4AF37 100%)',
                    color: '#011215',
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    padding: '2px 8px',
                    borderRadius: 999,
                  }}
                >
                  Coming Soon
                </span>
              </div>
            </div>
          </div>

          {/* iPhone Safari Home Screen Card */}
          <div
            style={{
              background: 'rgba(234, 186, 56, 0.08)',
              border: '1px solid rgba(234, 186, 56, 0.25)',
              borderRadius: 16,
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 14,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(234, 186, 56, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: '#EABA38',
              }}
            >
              <Share2 size={18} />
            </div>
            <div>
              <strong style={{ fontSize: 14, color: '#f5d87a', display: 'block', marginBottom: 4 }}>
                For iPhone &amp; iPad Users:
              </strong>
              <p style={{ margin: 0, fontSize: 13.5, color: '#cbd5e1', lineHeight: 1.55 }}>
                While our official Apple App Store app finishes review, you can get a full native app experience right
                now: Open <strong>shreebeauty.studio</strong> in Safari, tap the <strong>Share</strong> icon, and select{' '}
                <strong>&ldquo;Add to Home Screen&rdquo;</strong>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3-STEP ANDROID INSTALLATION GUIDE ─── */}
      <section style={{ maxWidth: 1160, margin: '0 auto 60px', padding: '0 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#05424A',
            }}
          >
            Quick Setup
          </span>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: '#032B30', margin: '6px 0 10px' }}>
            How to Install the APK on Android in 3 Steps
          </h2>
          <p style={{ fontSize: 15, color: '#64748b', margin: 0 }}>
            Installing an APK takes less than 60 seconds on any Android phone.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 24,
          }}
        >
          {[
            {
              step: '01',
              title: 'Download the APK',
              desc: 'Tap the Download button above. If your browser asks "File might be harmful", tap "Download anyway".',
            },
            {
              step: '02',
              title: 'Enable Unknown Apps',
              desc: 'Open the downloaded APK from notifications or your Downloads folder. If prompted, toggle "Allow from this source".',
            },
            {
              step: '03',
              title: 'Tap Install & Open',
              desc: 'Tap "Install". In a few seconds, Shree Beauty Studio will appear on your home screen ready for instant booking!',
            },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                background: '#ffffff',
                borderRadius: 20,
                padding: '30px 24px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                position: 'relative',
              }}
            >
              <div
                style={{
                  fontSize: 36,
                  fontWeight: 900,
                  color: '#e2e8f0',
                  lineHeight: 1,
                  marginBottom: 16,
                  fontFamily: 'monospace',
                }}
              >
                {item.step}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#032B30', margin: '0 0 8px' }}>
                {item.title}
              </h3>
              <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, margin: 0 }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FREQUENTLY ASKED QUESTIONS ─── */}
      <section style={{ maxWidth: 880, margin: '0 auto 80px', padding: '0 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#032B30', margin: '0 0 8px' }}>
            Frequently Asked Questions
          </h2>
          <p style={{ fontSize: 14.5, color: '#64748b', margin: 0 }}>
            Everything you need to know about the Shree Beauty Studio mobile app.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                style={{
                  background: '#ffffff',
                  borderRadius: 16,
                  border: isOpen ? '1.5px solid #05424A' : '1px solid #e2e8f0',
                  overflow: 'hidden',
                  transition: 'border-color 0.2s ease',
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  style={{
                    width: '100%',
                    padding: '18px 22px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    gap: 14,
                  }}
                >
                  <span style={{ fontSize: 15.5, fontWeight: 700, color: '#032B30' }}>{faq.q}</span>
                  {isOpen ? <ChevronUp size={20} color="#05424A" /> : <ChevronDown size={20} color="#94a3b8" />}
                </button>
                {isOpen && (
                  <div style={{ padding: '0 22px 20px', fontSize: 14.5, color: '#475569', lineHeight: 1.65 }}>
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
