'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Cookie, ShieldCheck, Check, Settings, X } from 'lucide-react';

export interface CookiePreferences {
  necessary: boolean; // Always true
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

const STORAGE_KEY = 'shree_cookie_consent_v1';

export default function CookieConsentBanner() {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [analyticsAllowed, setAnalyticsAllowed] = useState(true);
  const [marketingAllowed, setMarketingAllowed] = useState(true);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        // Show after a brief delay so page loads gracefully
        const timer = setTimeout(() => setIsVisible(true), 1200);
        return () => clearTimeout(timer);
      } else {
        const parsed = JSON.parse(stored) as CookiePreferences;
        setAnalyticsAllowed(parsed.analytics ?? true);
        setMarketingAllowed(parsed.marketing ?? true);
      }
    } catch {
      setIsVisible(true);
    }
  }, []);

  // Listen for custom trigger to reopen cookie settings anywhere (e.g. footer link or policy page)
  useEffect(() => {
    const handleOpenSettings = () => {
      setShowPreferences(true);
      setIsVisible(true);
    };

    window.addEventListener('open-cookie-settings', handleOpenSettings);
    return () => window.removeEventListener('open-cookie-settings', handleOpenSettings);
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (e) {
      console.warn('Failed to save cookie consent:', e);
    }
    setIsVisible(false);
    setShowPreferences(false);
  };

  const handleAcceptAll = () => {
    savePreferences({
      necessary: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString(),
    });
  };

  const handleEssentialOnly = () => {
    savePreferences({
      necessary: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
    });
  };

  const handleSaveCustom = () => {
    savePreferences({
      necessary: true,
      analytics: analyticsAllowed,
      marketing: marketingAllowed,
      timestamp: new Date().toISOString(),
    });
  };

  if (!mounted || !isVisible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie Consent Banner"
      style={{
        position: 'fixed',
        bottom: 20,
        left: 20,
        right: 20,
        maxWidth: 520,
        margin: '0 auto 0 0',
        zIndex: 9999,
        background: 'radial-gradient(ellipse at 50% 0%, rgba(5, 66, 74, 0.95) 0%, rgba(2, 26, 29, 0.98) 100%)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(234, 186, 56, 0.35)',
        boxShadow: '0 20px 48px -10px rgba(0, 0, 0, 0.6), 0 0 24px rgba(234, 186, 56, 0.15)',
        borderRadius: 20,
        padding: '20px 22px',
        color: '#ffffff',
        animation: 'cookieSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}
    >
      <style>{`
        @keyframes cookieSlideUp {
          from {
            opacity: 0;
            transform: translateY(24px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>

      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(234, 186, 56, 0.25) 0%, rgba(5, 66, 74, 0.6) 100%)',
              border: '1px solid rgba(234, 186, 56, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#EABA38',
              flexShrink: 0,
            }}
          >
            <Cookie size={19} />
          </div>
          <div>
            <h4
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: '0.02em',
                background: 'linear-gradient(135deg, #ffffff 40%, #f5d87a 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Your Privacy & Cookie Choices
            </h4>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>Shree Beauty Studio · Katargam, Surat</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleEssentialOnly}
          aria-label="Dismiss and use essential only"
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 6,
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
        >
          <X size={16} />
        </button>
      </div>

      {/* Description */}
      {!showPreferences ? (
        <>
          <p style={{ margin: '0 0 16px', fontSize: 13, lineHeight: 1.6, color: '#cbd5e1' }}>
            We use cookies to enhance your salon booking experience, remember preferences, and analyze our website
            traffic. You can accept all cookies or tailor your choices below.
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleAcceptAll}
                style={{
                  background: 'linear-gradient(135deg, #EABA38 0%, #D4AF37 100%)',
                  color: '#011215',
                  border: 'none',
                  borderRadius: 10,
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 4px 12px rgba(234, 186, 56, 0.3)',
                  transition: 'transform 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <Check size={14} strokeWidth={3} /> Accept All
              </button>

              <button
                type="button"
                onClick={handleEssentialOnly}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#e2e8f0',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: 10,
                  padding: '8px 14px',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.14)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                }}
              >
                Essential Only
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                type="button"
                onClick={() => setShowPreferences(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#f5d87a',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                }}
              >
                <Settings size={12} /> Customize
              </button>

              <Link
                href="/cookies-policy"
                style={{
                  color: '#94a3b8',
                  fontSize: 11.5,
                  textDecoration: 'none',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
              >
                Cookie Policy →
              </Link>
            </div>
          </div>
        </>
      ) : (
        /* Detailed Custom Preferences View */
        <div style={{ marginTop: 8 }}>
          <p style={{ margin: '0 0 14px', fontSize: 12.5, color: '#94a3b8', lineHeight: 1.5 }}>
            Choose which category of cookies you allow. Essential cookies are required to process online bookings and
            security.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {/* Category 1: Essential */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShieldCheck size={14} color="#80EEEE" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>Strictly Necessary</span>
                </div>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>Session security, booking carts & CSRF tokens</span>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#80EEEE',
                  background: 'rgba(128, 238, 238, 0.1)',
                  padding: '2px 8px',
                  borderRadius: 6,
                }}
              >
                Always Active
              </span>
            </div>

            {/* Category 2: Analytics & Performance */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                cursor: 'pointer',
              }}
            >
              <div>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff', display: 'block' }}>
                  Analytics & Performance
                </span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>Page load metrics & anonymous visitor counts</span>
              </div>
              <input
                type="checkbox"
                checked={analyticsAllowed}
                onChange={(e) => setAnalyticsAllowed(e.target.checked)}
                style={{
                  accentColor: '#EABA38',
                  width: 17,
                  height: 17,
                  cursor: 'pointer',
                }}
              />
            </label>

            {/* Category 3: Marketing & Social Embeds */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                cursor: 'pointer',
              }}
            >
              <div>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff', display: 'block' }}>
                  Marketing & Social Media
                </span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>Instagram feeds & Google Maps interactions</span>
              </div>
              <input
                type="checkbox"
                checked={marketingAllowed}
                onChange={(e) => setMarketingAllowed(e.target.checked)}
                style={{
                  accentColor: '#EABA38',
                  width: 17,
                  height: 17,
                  cursor: 'pointer',
                }}
              />
            </label>
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <button
              type="button"
              onClick={() => setShowPreferences(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                fontSize: 12,
                cursor: 'pointer',
                padding: '4px 0',
              }}
            >
              ← Back
            </button>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={handleAcceptAll}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#cbd5e1',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: 10,
                  padding: '7px 13px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Accept All
              </button>
              <button
                type="button"
                onClick={handleSaveCustom}
                style={{
                  background: 'linear-gradient(135deg, #EABA38 0%, #D4AF37 100%)',
                  color: '#011215',
                  border: 'none',
                  borderRadius: 10,
                  padding: '7px 16px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Save My Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
