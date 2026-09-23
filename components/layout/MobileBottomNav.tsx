'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Receipt,
  Heart,
  MoreHorizontal,
  X,
  Users,
  Package,
  ShoppingBag,
  Building2,
  UserCog,
  Bell,
  BarChart3,
  Settings,
  MessageCircle,
  Wallet,
  ExternalLink,
  UserPlus,
  Zap,
  Plus,
  Sparkles,
} from 'lucide-react';

// ── 5 Designated Colorful Bottom Navigation Tabs ─────────────────────
const BOTTOM_NAV_TABS = [
  {
    id: 'home',
    href: '/admin',
    label: 'Home',
    gujarati: 'હોમ',
    icon: LayoutDashboard,
    color: '#05424A', // Luxury Deep Teal
    activeBg: 'rgba(5, 66, 74, 0.12)',
    activeBorder: 'rgba(5, 66, 74, 0.28)',
    glow: 'rgba(5, 66, 74, 0.40)',
    exact: true,
  },
  {
    id: 'appointments',
    href: '/admin/appointments',
    label: 'Appts',
    gujarati: 'એપોઇન્ટ',
    icon: Calendar,
    color: '#0284c7', // Ocean Sky Blue
    activeBg: 'rgba(2, 132, 199, 0.12)',
    activeBorder: 'rgba(2, 132, 199, 0.28)',
    glow: 'rgba(2, 132, 199, 0.40)',
    exact: false,
  },
  {
    id: 'bridal',
    href: '/admin/bridal',
    label: 'Bridal',
    gujarati: 'બ્રાઇડલ',
    icon: Heart,
    color: '#e11d48', // Romantic Rose / Crimson Pink
    activeBg: 'rgba(225, 29, 72, 0.12)',
    activeBorder: 'rgba(225, 29, 72, 0.28)',
    glow: 'rgba(225, 29, 72, 0.40)',
    exact: false,
    badge: '★',
  },
  {
    id: 'billing',
    href: '/admin/billing',
    label: 'Billing',
    gujarati: 'બિલિંગ',
    icon: Receipt,
    color: '#059669', // Emerald Cash Green
    activeBg: 'rgba(5, 150, 105, 0.12)',
    activeBorder: 'rgba(5, 150, 105, 0.28)',
    glow: 'rgba(5, 150, 105, 0.40)',
    exact: false,
  },
  {
    id: 'more',
    isMore: true,
    label: 'More',
    gujarati: 'વધુ',
    icon: MoreHorizontal,
    color: '#7c3aed', // Royal Purple / Indigo
    activeBg: 'rgba(124, 58, 237, 0.12)',
    activeBorder: 'rgba(124, 58, 237, 0.28)',
    glow: 'rgba(124, 58, 237, 0.40)',
  },
];

// ── Fast Quick Entry Actions inside More Drawer ───────────────────────
const QUICK_ENTRY_ACTIONS = [
  {
    href: '/admin/billing',
    title: 'New Bill (POS)',
    gujarati: 'નવું બિલિંગ (POS)',
    desc: 'Instant counter billing & thermal print',
    icon: Receipt,
    color: '#059669',
    bg: '#ecfdf5',
    badge: 'Fast POS',
  },
  {
    href: '/admin/appointments?new=1',
    title: 'New Appointment',
    gujarati: 'નવી એપોઇન્ટમેન્ટ',
    desc: 'Book client slot & assign beautician',
    icon: Calendar,
    color: '#0284c7',
    bg: '#f0f9ff',
    badge: 'Instant',
  },
  {
    href: '/admin/bridal?new=1',
    title: 'Bridal Booking',
    gujarati: 'બ્રાઇડલ / સાઇડર બુકિંગ',
    desc: 'Multi-event packages & advance setup',
    icon: Heart,
    color: '#e11d48',
    bg: '#fff1f2',
    badge: 'Luxury',
  },
  {
    href: '/admin/customers?new=1',
    title: 'Add New Customer',
    gujarati: 'નવો ગ્રાહક ઉમેરો',
    desc: 'Save client name, mobile & birthday',
    icon: UserPlus,
    color: '#7c3aed',
    bg: '#f5f3ff',
  },
  {
    href: '/admin/finance?new=expense',
    title: 'Rojmel / Cash Entry',
    gujarati: 'રોજમેળ / ખર્ચ એન્ટ્રી',
    desc: 'Daily studio cash flow & expense khata',
    icon: Wallet,
    color: '#d97706',
    bg: '#fffbeb',
  },
  {
    href: '/admin/purchases',
    title: 'Product Purchase',
    gujarati: 'માલ ખરીદી / સ્ટોક',
    desc: 'Vendor inward bill & inventory stock',
    icon: ShoppingBag,
    color: '#0d9488',
    bg: '#f0fdfa',
  },
  {
    href: '/admin/whatsapp',
    title: 'WhatsApp Hub',
    gujarati: 'વોટ્સએપ મેસેજિંગ',
    desc: 'Direct WhatsApp 1-click auto sender & promos',
    icon: MessageCircle,
    color: '#25D366',
    bg: '#f0fdf4',
  },
];

// ── All Studio Modules inside More Drawer ─────────────────────────────
const MORE_NAV = [
  { href: '/admin/finance',     label: 'Finance & Rojmel', gujarati: 'રોજમેળ / ખર્ચ',   icon: Wallet,        color: '#d97706', bg: '#fffbeb' },
  { href: '/admin/customers',   label: 'Customers',        gujarati: 'ગ્રાહક યાદી',    icon: Users,         color: '#0284c7', bg: '#f0f9ff' },
  { href: '/admin/whatsapp',    label: 'WhatsApp',         gujarati: 'મેસેજિંગ હબ',    icon: MessageCircle, color: '#16a34a', bg: '#f0fdf4' },
  { href: '/admin/inventory',   label: 'Inventory',        gujarati: 'પ્રોડક્ટ સ્ટોક',  icon: Package,       color: '#0d9488', bg: '#f0fdfa' },
  { href: '/admin/purchases',   label: 'Purchases',        gujarati: 'માલ ખરીદી બિલ',  icon: ShoppingBag,   color: '#ca8a04', bg: '#fefce8' },
  { href: '/admin/suppliers',   label: 'Suppliers',        gujarati: 'વેપારી / પાર્ટી', icon: Building2,     color: '#4f46e5', bg: '#eef2ff' },
  { href: '/admin/staff',       label: 'Staff',            gujarati: 'સ્ટાફ / કમિશન',   icon: UserCog,       color: '#9333ea', bg: '#faf5ff' },
  { href: '/admin/reminders',   label: 'Reminders',        gujarati: 'રિમાઇન્ડર્સ',    icon: Bell,          color: '#ea580c', bg: '#fff7ed' },
  { href: '/admin/reports',     label: 'Reports',          gujarati: 'રિપોર્ટ એનાલિટિક્સ', icon: BarChart3, color: '#059669', bg: '#ecfdf5' },
  { href: '/admin/settings',    label: 'Settings',         gujarati: 'સેટિંગ્સ',       icon: Settings,      color: '#475569', bg: '#f8fafc' },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [activeTabSection, setActiveTabSection] = useState<'quick' | 'modules'>('quick');

  useEffect(() => {
    const handleOpenMore = () => setMoreOpen(true);
    const handleToggleMore = () => setMoreOpen((prev) => !prev);
    const handleOpenQuick = () => {
      setActiveTabSection('quick');
      setMoreOpen(true);
    };

    window.addEventListener('open-mobile-more', handleOpenMore);
    window.addEventListener('toggle-mobile-more', handleToggleMore);
    window.addEventListener('open-quick-entry', handleOpenQuick);
    return () => {
      window.removeEventListener('open-mobile-more', handleOpenMore);
      window.removeEventListener('toggle-mobile-more', handleToggleMore);
      window.removeEventListener('open-quick-entry', handleOpenQuick);
    };
  }, []);

  return (
    <>
      {/* ── 1. MORE MANAGEMENT & QUICK ENTRY DRAWER (MODAL) ── */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(3, 43, 48, 0.65)',
                zIndex: 110,
                backdropFilter: 'blur(4px)',
              }}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                background: '#ffffff',
                borderRadius: '24px 24px 0 0',
                padding: '16px 16px env(safe-area-inset-bottom, 24px)',
                zIndex: 115,
                boxShadow: '0 -10px 40px rgba(0,0,0,.25)',
                maxHeight: '85vh',
                overflowY: 'auto',
              }}
            >
              {/* Drawer Grabber */}
              <div
                style={{
                  width: 44,
                  height: 4.5,
                  background: '#cbd5e1',
                  borderRadius: 99,
                  margin: '0 auto 12px',
                }}
              />

              {/* Drawer Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 14,
                  paddingBottom: 10,
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 3px 10px rgba(124, 58, 237, 0.3)',
                    }}
                  >
                    <Sparkles size={19} color="#ffffff" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#05424A' }}>
                      Studio Hub · વધુ મોડ્યુલ્સ & એન્ટ્રી
                    </h3>
                    <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>
                      Quick Actions & Full Salon Management
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setMoreOpen(false)}
                  style={{
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '50%',
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  aria-label="Close Drawer"
                >
                  <X size={18} color="#64748b" />
                </button>
              </div>

              {/* Sub Navigation Toggle Tabs */}
              <div
                style={{
                  display: 'flex',
                  background: '#f1f5f9',
                  padding: 4,
                  borderRadius: 14,
                  marginBottom: 16,
                  gap: 4,
                }}
              >
                <button
                  onClick={() => setActiveTabSection('quick')}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: 'none',
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer',
                    background: activeTabSection === 'quick' ? '#ffffff' : 'transparent',
                    color: activeTabSection === 'quick' ? '#05424A' : '#64748b',
                    boxShadow: activeTabSection === 'quick' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Zap size={15} color={activeTabSection === 'quick' ? '#EABA38' : '#94a3b8'} />
                  <span>⚡ ઝડપી નવી એન્ટ્રી (Quick Entry)</span>
                </button>
                <button
                  onClick={() => setActiveTabSection('modules')}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: 'none',
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer',
                    background: activeTabSection === 'modules' ? '#ffffff' : 'transparent',
                    color: activeTabSection === 'modules' ? '#7c3aed' : '#64748b',
                    boxShadow: activeTabSection === 'modules' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <MoreHorizontal size={15} color={activeTabSection === 'modules' ? '#7c3aed' : '#94a3b8'} />
                  <span>📂 તમામ મોડ્યુલ (All Modules)</span>
                </button>
              </div>

              {/* TAB 1: QUICK ENTRY FAST ACTIONS */}
              {activeTabSection === 'quick' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {QUICK_ENTRY_ACTIONS.map((action) => {
                    const Icon = action.icon;
                    return (
                      <Link
                        key={action.href}
                        href={action.href}
                        onClick={() => setMoreOpen(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 14px',
                          borderRadius: 14,
                          background: action.bg,
                          border: `1.5px solid ${action.color}30`,
                          textDecoration: 'none',
                          transition: 'transform 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 12,
                              background: '#ffffff',
                              boxShadow: `0 2px 8px ${action.color}25`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <Icon size={20} color={action.color} />
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                              {action.title}{' '}
                              <span style={{ fontSize: 12, fontWeight: 600, color: action.color }}>
                                ({action.gujarati})
                              </span>
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                              {action.desc}
                            </div>
                          </div>
                        </div>

                        {action.badge && (
                          <span
                            style={{
                              background: action.color,
                              color: '#ffffff',
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: 99,
                              flexShrink: 0,
                            }}
                          >
                            {action.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* TAB 2: ALL MANAGEMENT MODULES */}
              {activeTabSection === 'modules' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  {MORE_NAV.map(({ href, label, gujarati, icon: Icon, color, bg }) => {
                    const isActive = pathname.startsWith(href);
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setMoreOpen(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '12px 10px',
                          borderRadius: 14,
                          textDecoration: 'none',
                          background: isActive ? '#edf7f9' : bg || '#f8fafc',
                          border: isActive ? `1.5px solid ${color}` : `1px solid ${color}20`,
                          boxShadow: isActive ? `0 2px 8px ${color}20` : 'none',
                        }}
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: `0 2px 6px ${color}20`,
                            flexShrink: 0,
                          }}
                        >
                          <Icon size={19} color={color} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: '#0f172a',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {label}
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              color: color,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {gujarati}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Customer Public Website Link */}
              <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                <Link
                  href="/"
                  target="_blank"
                  onClick={() => setMoreOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '11px 16px',
                    background: 'linear-gradient(135deg, #fefce8 0%, #fffbeb 100%)',
                    border: '1px solid #fef08a',
                    borderRadius: 12,
                    textDecoration: 'none',
                    color: '#854d0e',
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  <ExternalLink size={15} />
                  <span>Open Customer Public Website ↗</span>
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── 2. VIBRANT COLORFUL 5-TAB MOBILE BOTTOM NAVIGATION BAR ── */}
      <nav
        className="mobile-bottom-nav no-print"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 64,
          padding: '4px 6px calc(env(safe-area-inset-bottom, 0px) + 4px)',
          background: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderTop: '1px solid rgba(226, 232, 240, 0.9)',
          boxShadow: '0 -4px 25px rgba(15, 23, 42, 0.08)',
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
        }}
      >
        {BOTTOM_NAV_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.isMore
            ? moreOpen
            : tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href!);

          // Tab content with colorful active pill & indicator
          const content = (
            <motion.div
              whileTap={{ scale: 0.90 }}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px 8px',
                borderRadius: 14,
                gap: 3,
                width: '100%',
                background: isActive ? tab.activeBg : 'transparent',
                border: isActive ? `1px solid ${tab.activeBorder}` : '1px solid transparent',
                transition: 'background 0.2s ease, border 0.2s ease',
              }}
            >
              {/* Top Accent Indicator Glow Bar for Active Tab */}
              {isActive && (
                <motion.div
                  layoutId="activeBottomTabDot"
                  style={{
                    position: 'absolute',
                    top: -4,
                    width: 20,
                    height: 3,
                    borderRadius: 99,
                    background: tab.color,
                    boxShadow: `0 2px 8px ${tab.glow}`,
                  }}
                />
              )}

              {/* Icon Container with Badge */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon
                  size={20}
                  color={isActive ? tab.color : '#64748b'}
                  strokeWidth={isActive ? 2.5 : 2}
                  style={{
                    transform: isActive ? 'scale(1.08)' : 'scale(1)',
                    transition: 'transform 0.15s ease, color 0.15s ease',
                    filter: isActive ? `drop-shadow(0 2px 6px ${tab.glow})` : 'none',
                  }}
                />
                {tab.badge && !isActive && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -3,
                      right: -6,
                      background: tab.color,
                      color: '#ffffff',
                      fontSize: 8,
                      fontWeight: 800,
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>

              {/* Tab Title Label */}
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: isActive ? 800 : 600,
                  color: isActive ? tab.color : '#64748b',
                  letterSpacing: '-0.01em',
                  lineHeight: 1,
                  transition: 'color 0.15s ease',
                }}
              >
                {tab.label}
              </span>
            </motion.div>
          );

          if (tab.isMore) {
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMoreOpen(true)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'none',
                  border: 'none',
                  padding: '2px 3px',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  outline: 'none',
                }}
                aria-label="Open More Menu and Quick Actions"
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={tab.id}
              href={tab.href!}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2px 3px',
                textDecoration: 'none',
                outline: 'none',
              }}
            >
              {content}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
