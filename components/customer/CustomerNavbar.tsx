'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Calendar, User, ChevronDown, LogOut, MapPin, Lock, Sparkles, CheckCircle2, Phone } from 'lucide-react';

import { useSalonStore } from '@/lib/store';
import { SHREE_LOGO_BASE64 } from '@/lib/logo-base64';
import { useCustomerAuth } from '@/lib/customer-context';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/services', label: 'Services' },
  { href: '/blog', label: 'Blog' },
  { href: '/about', label: 'About' },
  { href: '/faq', label: 'FAQ' },
  { href: '/my-appointments', label: 'My Appointments' },
];

export default function CustomerNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { data } = useSalonStore();
  const { customer, authenticated, logout } = useCustomerAuth();
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

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setProfileDropdownOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  const navStyle = scrolled ? {
    background: 'rgba(3, 43, 48, 0.97)',
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
    borderBottom: '1px solid rgba(234, 186, 56, 0.28)',
    boxShadow: '0 4px 32px rgba(0, 0, 0, 0.3), 0 1px 0 rgba(234,186,56,0.08) inset',
  } : {
    background: 'rgba(3, 43, 48, 0.85)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderBottom: '1px solid rgba(234, 186, 56, 0.15)',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.18)',
  };

  const getInitials = (name?: string) => {
    if (!name) return 'C';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
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
          <Link
            href="/"
            className="cust-navbar-logo"
            style={{
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
              minWidth: 0,
            }}
          >
            <img
              src={SHREE_LOGO_BASE64}
              alt={salonName}
              style={{
                height: '46px',
                width: 'auto',
                maxWidth: '280px',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </Link>

          {/* Desktop Navigation Links */}
          <div
            className="cust-navbar-links"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 26,
            }}
          >
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    color: isActive ? '#EABA38' : 'rgba(255, 255, 255, 0.85)',
                    textDecoration: 'none',
                    fontSize: 13.5,
                    fontWeight: isActive ? 700 : 500,
                    transition: 'color 0.15s ease',
                    position: 'relative',
                    paddingBottom: 2,
                    letterSpacing: '0.01em',
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
                        background: 'linear-gradient(90deg, #EABA38 0%, #f5d87a 100%)',
                        borderRadius: 2,
                        boxShadow: '0 1px 4px rgba(234,186,56,0.4)',
                      }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Actions: Customer Profile / Login & Book Button & Mobile Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {authenticated && customer ? (
              /* Logged In Customer Profile Dropdown */
              <div ref={dropdownRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'rgba(234, 186, 56, 0.12)',
                    border: '1px solid rgba(234, 186, 56, 0.4)',
                    padding: '5px 12px 5px 6px',
                    borderRadius: 99,
                    color: '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  aria-expanded={profileDropdownOpen}
                  aria-haspopup="true"
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #EABA38 0%, #D4AF37 100%)',
                      color: '#032B30',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 13,
                      overflow: 'hidden',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                    }}
                  >
                    {customer.profileImage ? (
                      <img
                        src={customer.profileImage}
                        alt={customer.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      getInitials(customer.name)
                    )}
                  </div>
                  <span
                    className="cust-nav-profile-name"
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#ffffff',
                      maxWidth: 110,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {customer.name?.split(' ')[0] || 'Account'}
                  </span>
                  <ChevronDown
                    size={14}
                    style={{
                      color: '#EABA38',
                      transform: profileDropdownOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </button>

                {profileDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      width: 250,
                      background: '#ffffff',
                      borderRadius: 16,
                      boxShadow: '0 16px 40px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                      padding: '12px 8px',
                      zIndex: 1100,
                      animation: 'fadeIn 0.15s ease-out',
                    }}
                  >
                    <div
                      style={{
                        padding: '8px 12px 12px',
                        borderBottom: '1px solid #f1f5f9',
                        marginBottom: 6,
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                        {customer.name}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: '#64748b',
                          marginTop: 2,
                          wordBreak: 'break-all',
                        }}
                      >
                        {customer.phone ? `+91 ${customer.phone}` : customer.email}
                      </div>
                      {typeof customer.loyaltyPoints === 'number' && (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            marginTop: 6,
                            padding: '2px 8px',
                            background: '#fef3c7',
                            color: '#92400e',
                            borderRadius: 99,
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          <Sparkles size={11} color="#d97706" />
                          <span>{customer.loyaltyPoints} Rewards Points</span>
                        </div>
                      )}
                    </div>

                    <Link
                      href="/profile"
                      onClick={() => setProfileDropdownOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '9px 12px',
                        color: '#334155',
                        textDecoration: 'none',
                        fontSize: 13,
                        fontWeight: 600,
                        borderRadius: 8,
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <User size={15} color="#05424A" />
                      <span>My Profile</span>
                    </Link>

                    <Link
                      href="/profile?tab=appointments"
                      onClick={() => setProfileDropdownOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '9px 12px',
                        color: '#334155',
                        textDecoration: 'none',
                        fontSize: 13,
                        fontWeight: 600,
                        borderRadius: 8,
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <Calendar size={15} color="#05424A" />
                      <span>My Bookings</span>
                    </Link>

                    <Link
                      href="/profile?tab=addresses"
                      onClick={() => setProfileDropdownOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '9px 12px',
                        color: '#334155',
                        textDecoration: 'none',
                        fontSize: 13,
                        fontWeight: 600,
                        borderRadius: 8,
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <MapPin size={15} color="#05424A" />
                      <span>Saved Addresses</span>
                    </Link>

                    <Link
                      href="/profile?tab=security"
                      onClick={() => setProfileDropdownOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '9px 12px',
                        color: '#334155',
                        textDecoration: 'none',
                        fontSize: 13,
                        fontWeight: 600,
                        borderRadius: 8,
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <Lock size={15} color="#05424A" />
                      <span>Change Password</span>
                    </Link>

                    <div style={{ height: 1, background: '#f1f5f9', margin: '6px 0' }} />

                    <button
                      type="button"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        logout();
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '9px 12px',
                        color: '#dc2626',
                        background: 'transparent',
                        border: 'none',
                        fontSize: 13,
                        fontWeight: 600,
                        borderRadius: 8,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#fef2f2')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <LogOut size={15} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Logged Out: Sign In / Register Button */
              <Link
                href="/login"
                className="cust-btn-login"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(234, 186, 56, 0.35)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: 13,
                  padding: '7px 14px',
                  borderRadius: 99,
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                <User size={14} style={{ color: '#EABA38' }} />
                <span>Login / Sign Up</span>
              </Link>
            )}

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
              <span className="cust-btn-text-full">Book Appointment</span>
              <span className="cust-btn-text-short">Book</span>
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
                display: 'none', // Overridden in CSS media queries
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
              gap: 12,
            }}
          >
            {/* Authenticated user banner in mobile menu */}
            {authenticated && customer ? (
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(234, 186, 56, 0.3)',
                  borderRadius: 14,
                  padding: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #EABA38 0%, #D4AF37 100%)',
                      color: '#032B30',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 14,
                    }}
                  >
                    {getInitials(customer.name)}
                  </div>
                  <div>
                    <div style={{ color: '#ffffff', fontWeight: 700, fontSize: 14 }}>
                      {customer.name}
                    </div>
                    <div style={{ color: '#EABA38', fontSize: 12 }}>
                      {customer.phone ? `+91 ${customer.phone}` : customer.email}
                    </div>
                  </div>
                </div>
                <Link
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  style={{
                    background: 'rgba(234, 186, 56, 0.2)',
                    color: '#EABA38',
                    padding: '6px 12px',
                    borderRadius: 99,
                    fontSize: 12,
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  Profile
                </Link>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(234, 186, 56, 0.4)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: 14,
                  padding: '10px 16px',
                  borderRadius: 12,
                  textDecoration: 'none',
                  marginBottom: 6,
                }}
              >
                <User size={16} color="#EABA38" />
                Customer Login / Sign Up
              </Link>
            )}

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

            {authenticated && (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'none',
                  border: 'none',
                  color: '#f87171',
                  fontSize: 14,
                  fontWeight: 600,
                  padding: '8px 0',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <LogOut size={16} />
                Sign Out
              </button>
            )}

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

            {/* Quick Studio Call Contacts */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                marginTop: 12,
                paddingTop: 12,
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: 12.5,
                color: '#EABA38',
              }}
            >
              <Phone size={13} style={{ flexShrink: 0 }} />
              <a href="tel:+919773240010" style={{ color: '#ffffff', textDecoration: 'none', fontWeight: 600 }}>
                +91 97732 40010
              </a>
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
              <a href="tel:+919824183769" style={{ color: '#ffffff', textDecoration: 'none', fontWeight: 600 }}>
                +91 98241 83769
              </a>
            </div>
          </div>
        )}
      </nav>
      {/* Spacer so page content starts below fixed navbar */}
      <div style={{ height: 68 }} />
    </>
  );
}
