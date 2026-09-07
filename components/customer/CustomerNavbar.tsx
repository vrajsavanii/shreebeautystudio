'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Calendar, Sparkles } from 'lucide-react';
import { SHREE_ONLY_LOGO_BASE64 } from '@/lib/logo-base64';
import { useSalonStore } from '@/lib/store';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/services', label: 'Services' },
  { href: '/bridal', label: 'Bridal & Siders' },
  { href: '/my-appointments', label: 'My Appointments' },
];

export default function CustomerNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { data } = useSalonStore();
  const salonName = data?.settings?.salon || 'Shree Beauty Studio';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const navStyle = {
    background: scrolled
      ? 'rgba(3, 43, 48, 0.96)'
      : 'rgba(3, 43, 48, 0.88)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderBottom: '1px solid rgba(234, 186, 56, 0.22)',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.25)',
  };

  return (
    <>
      <nav
        className="cust-navbar"
        style={{
          ...navStyle,
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          transition: 'all 0.3s cubic-bezier(0.25,0.46,0.45,0.94)',
        }}
      >
        <div
          className="cust-navbar-inner"
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          {/* Logo & Branding */}
          <Link
            href="/"
            className="cust-navbar-logo"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              textDecoration: 'none',
              minWidth: 0,
            }}
          >
            <img
              src={SHREE_ONLY_LOGO_BASE64}
              alt={salonName}
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1.5px solid #EABA38',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                flexShrink: 0,
              }}
            />
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <span
                className="cust-navbar-brand"
                style={{
                  color: '#ffffff',
                  fontSize: 'clamp(14px, 3.5vw, 17px)',
                  fontWeight: 800,
                  letterSpacing: '-0.2px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'block',
                }}
              >
                {salonName}
              </span>
              <span
                className="cust-navbar-tagline"
                style={{
                  color: '#EABA38',
                  fontSize: 11,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'block',
                }}
              >
                Katargam, Surat
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div
            className="cust-navbar-links"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 28,
            }}
          >
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    color: isActive ? '#EABA38' : 'rgba(255, 255, 255, 0.88)',
                    textDecoration: 'none',
                    fontSize: 13.5,
                    fontWeight: isActive ? 700 : 500,
                    transition: 'color 0.15s ease',
                    position: 'relative',
                  }}
                >
                  {link.label}
                  {isActive && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: -4,
                        left: 0,
                        right: 0,
                        height: 2,
                        background: '#EABA38',
                        borderRadius: 2,
                      }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Actions: Book Button & Mobile Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <Link
              href="/book"
              className="cust-btn-gold"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'linear-gradient(135deg, #EABA38 0%, #D4AF37 100%)',
                color: '#032B30',
                fontWeight: 700,
                fontSize: 13,
                padding: '8px 18px',
                borderRadius: 99,
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(234, 186, 56, 0.3)',
                transition: 'transform 0.15s ease',
              }}
            >
              <Calendar size={14} />
              <span>Book Appointment</span>
            </Link>

            <button
              type="button"
              className="cust-navbar-toggle"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle navigation menu"
              style={{
                background: 'none',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                padding: 6,
                display: 'none', // Overridden in media query
              }}
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {menuOpen && (
          <div
            className="cust-mobile-menu"
            style={{
              background: 'rgba(3, 43, 48, 0.98)',
              borderBottom: '1px solid rgba(234, 186, 56, 0.25)',
              padding: '16px 20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    color: isActive ? '#EABA38' : 'rgba(255, 255, 255, 0.9)',
                    textDecoration: 'none',
                    fontSize: 15,
                    fontWeight: isActive ? 700 : 500,
                    padding: '8px 0',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link
              href="/book"
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                background: 'linear-gradient(135deg, #EABA38 0%, #D4AF37 100%)',
                color: '#032B30',
                fontWeight: 700,
                fontSize: 14,
                padding: '12px 20px',
                borderRadius: 12,
                textDecoration: 'none',
                marginTop: 6,
              }}
            >
              <Calendar size={16} />
              Book Appointment Now
            </Link>
          </div>
        )}
      </nav>
      {/* Spacer so page content starts below fixed navbar */}
      <div style={{ height: 68 }} />
    </>
  );
}
