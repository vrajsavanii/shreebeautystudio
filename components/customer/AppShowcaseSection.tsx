'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Download,
  Smartphone,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Bell,
  Calendar,
  X,
  Share2,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import { trackApkDownload } from '@/lib/apk-tracker';

/* ─── Google Play SVG Icon (Official Multi-Color) ─── */
export function GooglePlayIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M47.7 27.5C41.7 33.8 38 43.1 38 54.8v402.4c0 11.7 3.7 21 9.7 27.3l1.4 1.4L275 259.9V252L49.1 26.1l-1.4 1.4z"
        fill="#00E676"
      />
      <path
        d="M352.5 337.4l-77.5-77.5V252l77.5-77.5 1.7 1 91.9 52.2c26.2 14.9 26.2 39.2 0 54.1l-91.9 52.2-1.7 1.4z"
        fill="#FFD54F"
      />
      <path
        d="M354.2 336.4L275 257.2 47.7 484.5c8.6 9.1 22.7 10.2 38.6 1.2l267.9-149.3z"
        fill="#FF5252"
      />
      <path
        d="M354.2 175.6L86.3 26.3C70.4 17.3 56.3 18.4 47.7 27.5L275 254.8l79.2-79.2z"
        fill="#00B0FF"
      />
    </svg>
  );
}

/* ─── Apple App Store SVG Icon ─── */
export function AppleIcon({ size = 26, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 170 170" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.58-7.7-11.64-13.98-5.77-8.89-10.4-19.12-13.88-30.7-3.48-11.58-5.22-22.61-5.22-33.09 0-16.03 4.1-29.35 12.31-39.95 8.21-10.6 18.52-16.04 30.93-16.32 4.9 0 10.4 1.25 16.5 3.75 6.1 2.5 10.15 3.82 12.16 3.96 1.74-.22 5.86-1.57 12.37-4.05 6.51-2.48 11.96-3.6 16.35-3.37 11.85.65 21.64 4.8 29.37 12.45-10.45 6.32-15.57 15.13-15.37 26.43.22 8.71 3.53 16.08 9.94 22.12 6.41 6.04 14.15 9.47 23.23 10.29-2.4 7.4-5.4 15.1-9 23.1zm-32.9-122.95c0 7.39-2.6 14.28-7.8 20.67-6.2 7.4-13.79 11.83-22.77 13.3-1.09-8.05 1.54-15.65 7.89-22.8 6.35-7.15 13.92-11.38 22.68-12.69z" />
    </svg>
  );
}

/* ─── Android Robot SVG Icon ─── */
export function AndroidIcon({ size = 24, color = '#3DDC84' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9996.4482.9996.9993.0001.5511-.4486.9997-.9996.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9997.4482.9997.9993 0 .5511-.4486.9997-.9997.9997m11.4045-6.02l1.997-3.4585a.416.416 0 0 0-.1521-.5676.416.416 0 0 0-.5676.1521l-2.0223 3.503C15.5842 8.358 13.8447 8 12 8s-3.5842.358-5.1365.9504L4.8412 5.4474a.416.416 0 0 0-.5676-.1521.416.416 0 0 0-.1521.5676l1.997 3.4585C2.6889 11.1867.3432 14.6589 0 18.8242h24c-.3432-4.1653-2.6889-7.6375-6.1185-9.5028" />
    </svg>
  );
}

interface AppShowcaseProps {
  id?: string;
  showAdminLink?: boolean;
}

export default function AppShowcaseSection({ id = 'mobile-app', showAdminLink = true }: AppShowcaseProps) {
  const [showIosModal, setShowIosModal] = useState(false);

  return (
    <section
      id={id}
      className="cust-app-showcase"
      style={{
        position: 'relative',
        isolation: 'isolate',
        backgroundColor: '#011518',
        background: 'radial-gradient(ellipse at 50% 20%, rgba(5, 66, 74, 0.7) 0%, #021a1d 50%, #011215 100%)',
        color: '#ffffff',
        padding: 'clamp(56px, 7vw, 96px) 20px',
        overflow: 'hidden',
        borderTop: '1px solid rgba(234, 186, 56, 0.25)',
        borderBottom: '1px solid rgba(234, 186, 56, 0.2)',
      }}
    >
      {/* Decorative Golden Ambient Glows */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: -120,
          right: '15%',
          width: 480,
          height: 480,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(234, 186, 56, 0.12) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: -100,
          left: '10%',
          width: 420,
          height: 420,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(128, 238, 238, 0.08) 0%, transparent 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 2 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 'clamp(36px, 5vw, 64px)',
            alignItems: 'center',
          }}
        >
          {/* ─── LEFT: Content & Badges ─── */}
          <div>
            {/* Pill Eyebrow */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                borderRadius: 999,
                background: 'rgba(234, 186, 56, 0.12)',
                border: '1px solid rgba(234, 186, 56, 0.35)',
                color: '#f5d87a',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.04em',
                marginBottom: 18,
                textTransform: 'uppercase',
              }}
            >
              <Smartphone size={15} color="#EABA38" />
              <span>Official Mobile Application</span>
            </div>

            <h2
              style={{
                fontSize: 'clamp(28px, 3.8vw, 44px)',
                fontWeight: 800,
                lineHeight: 1.18,
                letterSpacing: '-0.02em',
                margin: '0 0 16px',
                color: '#ffffff',
              }}
            >
              Experience Shree Beauty Studio{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #ffffff 15%, #f5d87a 60%, #EABA38 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                On Your Phone
              </span>
            </h2>

            <p
              style={{
                fontSize: 'clamp(14.5px, 1.2vw, 16.5px)',
                lineHeight: 1.65,
                color: '#cbd5e1',
                margin: '0 0 28px',
                maxWidth: 540,
              }}
            >
              Reserve high-demand bridal and salon appointments in seconds, get real-time schedule notifications,
              and unlock app-exclusive salon privilege offers — directly on Android, and coming soon to iOS.
            </p>

            {/* Feature Highlights Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 14,
                marginBottom: 36,
              }}
            >
              {[
                {
                  icon: Calendar,
                  title: 'Instant 1-Tap Booking',
                  desc: 'Pick your treatment, stylist & preferred time slot effortlessly.',
                },
                {
                  icon: Bell,
                  title: 'Live Appointment Status',
                  desc: 'Never miss a slot with real-time status and timely reminders.',
                },
                {
                  icon: Sparkles,
                  title: 'App-Exclusive Perks',
                  desc: 'Unlock seasonal bridal discounts and loyalty reward points.',
                },
                {
                  icon: ShieldCheck,
                  title: '100% Ladies Sanctuary',
                  desc: 'Confidential client history & private session tracking.',
                },
              ].map((feat, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    background: 'rgba(255, 255, 255, 0.04)',
                    padding: '12px 14px',
                    borderRadius: 14,
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 9,
                      background: 'rgba(234, 186, 56, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    <feat.icon size={16} color="#EABA38" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#f8fafc' }}>
                      {feat.title}
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8', lineHeight: 1.45 }}>
                      {feat.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* ─── APP STORE BUTTONS ─── */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 14,
                alignItems: 'center',
                marginBottom: 20,
              }}
            >
              {/* GOOGLE PLAY / ANDROID APK BUTTON */}
              <a
                href="/downloads/Shree-Beauty-Studio.apk"
                download="Shree-Beauty-Studio.apk"
                onClick={() => trackApkDownload('customer')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 14,
                  background: 'linear-gradient(135deg, #022227 0%, #04383f 100%)',
                  color: '#ffffff',
                  padding: '12px 22px',
                  borderRadius: 14,
                  textDecoration: 'none',
                  border: '1.5px solid rgba(234, 186, 56, 0.5)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  minWidth: 205,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
                  (e.currentTarget as HTMLElement).style.borderColor = '#EABA38';
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    '0 12px 28px rgba(234, 186, 56, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.25)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(234, 186, 56, 0.5)';
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    '0 8px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15)';
                }}
              >
                <GooglePlayIcon size={30} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: '#94a3b8',
                      lineHeight: 1.1,
                    }}
                  >
                    GET IT ON
                  </span>
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      letterSpacing: '-0.01em',
                      color: '#ffffff',
                      lineHeight: 1.2,
                    }}
                  >
                    Google Play
                  </span>
                </div>
              </a>

              {/* APPLE APP STORE (COMING SOON) BUTTON */}
              <button
                type="button"
                onClick={() => setShowIosModal(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 14,
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#ffffff',
                  padding: '12px 22px',
                  borderRadius: 14,
                  border: '1.5px solid rgba(255, 255, 255, 0.18)',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'visible',
                  transition: 'all 0.25s ease',
                  minWidth: 205,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.09)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(234, 186, 56, 0.5)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.05)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255, 255, 255, 0.18)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                }}
                title="Apple App Store version is coming soon! Click for details."
              >
                <AppleIcon size={30} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: '#94a3b8',
                      lineHeight: 1.1,
                    }}
                  >
                    Download on the
                  </span>
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      letterSpacing: '-0.01em',
                      color: '#ffffff',
                      lineHeight: 1.2,
                    }}
                  >
                    App Store
                  </span>
                </div>

                {/* Floating "Coming Soon" Pill */}
                <span
                  style={{
                    position: 'absolute',
                    top: -11,
                    right: 12,
                    background: 'linear-gradient(135deg, #EABA38 0%, #c7951a 100%)',
                    color: '#011215',
                    fontSize: 9.5,
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    padding: '3px 8px',
                    borderRadius: 999,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
                    border: '1px solid #ffe58f',
                  }}
                >
                  Coming Soon
                </span>
              </button>
            </div>

            {/* Direct APK Download Info & Specs */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 16,
                fontSize: 12.5,
                color: '#94a3b8',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <AndroidIcon size={16} /> Latest Android APK v1.2 (20.2 MB)
              </span>
              <span>•</span>
              <span>Android 8.0 &amp; Above</span>
              <span>•</span>
              <Link
                href="/download"
                style={{
                  color: '#f5d87a',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                Install Guide &amp; Details <ChevronRight size={13} />
              </Link>
            </div>

            {/* Salon Staff & Admin Portal Link */}
            {showAdminLink && (
              <div
                style={{
                  marginTop: 22,
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px dashed rgba(255, 255, 255, 0.14)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 12.5,
                  color: '#94a3b8',
                }}
              >
                <ShieldCheck size={16} color="#80EEEE" />
                <span>Salon Staff &amp; Stylists:</span>
                <a
                  href="/downloads/Shree-Admin-Portal.apk"
                  download="Shree-Admin-Portal.apk"
                  style={{
                    color: '#80EEEE',
                    fontWeight: 700,
                    textDecoration: 'underline',
                    textUnderlineOffset: 3,
                  }}
                >
                  Download Admin Portal APK (v1.2) →
                </a>
              </div>
            )}
          </div>

          {/* ─── RIGHT: Realistic Smartphone Mockup ─── */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              position: 'relative',
            }}
          >
            {/* Phone Outer Shell */}
            <div
              style={{
                width: '100%',
                maxWidth: 320,
                borderRadius: 44,
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                padding: 12,
                boxShadow:
                  '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.15), 0 0 40px rgba(5, 66, 74, 0.4)',
                position: 'relative',
              }}
            >
              {/* Dynamic Island / Notch */}
              <div
                style={{
                  position: 'absolute',
                  top: 20,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 96,
                  height: 20,
                  background: '#020617',
                  borderRadius: 12,
                  zIndex: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#0f172a' }} />
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#1e293b' }} />
              </div>

              {/* Phone Screen Glass */}
              <div
                style={{
                  borderRadius: 34,
                  overflow: 'hidden',
                  background: '#011215',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  minHeight: 520,
                }}
              >
                {/* Simulated App Header */}
                <div
                  style={{
                    background: 'linear-gradient(180deg, #032B30 0%, #011518 100%)',
                    padding: '36px 16px 14px',
                    borderBottom: '1px solid rgba(234, 186, 56, 0.2)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: '#EABA38',
                        }}
                      >
                        SHREE BEAUTY STUDIO
                      </span>
                      <h4 style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 800, color: '#ffffff' }}>
                        Welcome, Gorgeous ✨
                      </h4>
                    </div>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #EABA38 0%, #997010 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#011215',
                        fontWeight: 800,
                        fontSize: 12,
                      }}
                    >
                      P
                    </div>
                  </div>
                </div>

                {/* Simulated App Body */}
                <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Active Booking Banner */}
                  <div
                    style={{
                      background: 'linear-gradient(135deg, rgba(5, 66, 74, 0.8) 0%, rgba(2, 26, 29, 0.95) 100%)',
                      border: '1px solid rgba(234, 186, 56, 0.3)',
                      borderRadius: 14,
                      padding: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#80EEEE', textTransform: 'uppercase' }}>
                        Upcoming Appointment
                      </span>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          background: 'rgba(34, 197, 94, 0.2)',
                          color: '#4ade80',
                          padding: '2px 6px',
                          borderRadius: 4,
                        }}
                      >
                        Confirmed
                      </span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>
                      Couture Bridal Glow Facial
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, display: 'flex', gap: 8 }}>
                      <span>Today · 4:30 PM</span>
                      <span>•</span>
                      <span>Katargam Sanctuary</span>
                    </div>
                  </div>

                  {/* Quick Action Tiles */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div
                      style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: 12,
                        padding: '10px 8px',
                        textAlign: 'center',
                      }}
                    >
                      <Sparkles size={18} color="#EABA38" style={{ margin: '0 auto 4px' }} />
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#ffffff' }}>Book Service</div>
                      <div style={{ fontSize: 9.5, color: '#94a3b8' }}>100+ Treatments</div>
                    </div>
                    <div
                      style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: 12,
                        padding: '10px 8px',
                        textAlign: 'center',
                      }}
                    >
                      <Clock size={18} color="#80EEEE" style={{ margin: '0 auto 4px' }} />
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#ffffff' }}>Live Queue</div>
                      <div style={{ fontSize: 9.5, color: '#94a3b8' }}>0 min wait</div>
                    </div>
                  </div>

                  {/* Bridal Showcase Mini Card */}
                  <div
                    style={{
                      background: 'rgba(234, 186, 56, 0.06)',
                      border: '1px solid rgba(234, 186, 56, 0.2)',
                      borderRadius: 12,
                      padding: 10,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        background: 'linear-gradient(135deg, #EABA38 0%, #997010 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#011215',
                        fontWeight: 800,
                        fontSize: 16,
                        flexShrink: 0,
                      }}
                    >
                      👑
                    </div>
                    <div>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: '#f5d87a' }}>
                        Gujarati Bridal Packages
                      </div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>
                        5,000+ Brides Celebrated
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action in Mockup */}
                  <a
                    href="/downloads/Shree-Beauty-Studio.apk"
                    download="Shree-Beauty-Studio.apk"
                    onClick={() => trackApkDownload('customer')}
                    style={{
                      marginTop: 'auto',
                      background: 'linear-gradient(135deg, #EABA38 0%, #D4AF37 100%)',
                      color: '#011215',
                      fontWeight: 800,
                      fontSize: 12,
                      padding: '10px',
                      borderRadius: 10,
                      textAlign: 'center',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <Download size={14} />
                    <span>Download App (v1.2 APK)</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Floating Rating Badge */}
            <div
              style={{
                position: 'absolute',
                top: 30,
                left: -24,
                background: 'rgba(3, 43, 48, 0.95)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(234, 186, 56, 0.4)',
                borderRadius: 14,
                padding: '8px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)',
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: 'rgba(234, 186, 56, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#EABA38',
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                ★
              </div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: '#ffffff' }}>4.9 Google Rating</div>
                <div style={{ fontSize: 10, color: '#cbd5e1' }}>Surat&apos;s Top Salon</div>
              </div>
            </div>

            {/* Floating 100% Ladies Badge */}
            <div
              style={{
                position: 'absolute',
                bottom: 40,
                right: -20,
                background: 'rgba(3, 43, 48, 0.95)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(128, 238, 238, 0.35)',
                borderRadius: 14,
                padding: '8px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)',
              }}
            >
              <ShieldCheck size={20} color="#80EEEE" />
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: '#80EEEE' }}>100% Ladies Only</div>
                <div style={{ fontSize: 10, color: '#cbd5e1' }}>Private Sanctuary</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── iOS APP STORE "COMING SOON" MODAL / POPUP ─── */}
      {showIosModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setShowIosModal(false)}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #032B30 0%, #011518 100%)',
              border: '1.5px solid rgba(234, 186, 56, 0.4)',
              borderRadius: 24,
              maxWidth: 460,
              width: '100%',
              padding: '28px 24px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
              position: 'relative',
              color: '#ffffff',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowIosModal(false)}
              aria-label="Close dialog"
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                borderRadius: '50%',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#cbd5e1',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>

            {/* Apple Icon & Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AppleIcon size={28} />
              </div>
              <div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#EABA38',
                    display: 'block',
                  }}
                >
                  Apple App Store
                </span>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#ffffff' }}>
                  iOS App Coming Soon!
                </h3>
              </div>
            </div>

            <p style={{ fontSize: 14, lineHeight: 1.6, color: '#cbd5e1', margin: '0 0 20px' }}>
              We are currently finalizing the official iOS application for iPhone &amp; iPad with the Apple App Store review team. It will be available for download very soon!
            </p>

            {/* Temporary iOS PWA Alternative Tip */}
            <div
              style={{
                background: 'rgba(234, 186, 56, 0.08)',
                border: '1px solid rgba(234, 186, 56, 0.25)',
                borderRadius: 14,
                padding: 14,
                marginBottom: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f5d87a', fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                <Share2 size={16} />
                <span>iPhone User Tip: Add to Home Screen</span>
              </div>
              <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.6 }}>
                <li>Open <strong>shreebeauty.studio</strong> in Safari on your iPhone.</li>
                <li>Tap the <strong>Share</strong> button at the bottom of Safari.</li>
                <li>Scroll down and tap <strong>&ldquo;Add to Home Screen&rdquo;</strong>.</li>
                <li>You now have the full instant salon app on your iPhone!</li>
              </ol>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <Link
                href="/book"
                onClick={() => setShowIosModal(false)}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #EABA38 0%, #D4AF37 100%)',
                  color: '#011215',
                  fontWeight: 700,
                  fontSize: 13.5,
                  padding: '12px',
                  borderRadius: 10,
                  textAlign: 'center',
                  textDecoration: 'none',
                }}
              >
                Book Online via Web
              </Link>
              <button
                type="button"
                onClick={() => setShowIosModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: 13.5,
                  padding: '12px 18px',
                  borderRadius: 10,
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  cursor: 'pointer',
                }}
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
