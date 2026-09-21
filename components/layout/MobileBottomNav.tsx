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
  Plus,
  X,
  Users,
  Package,
  ShoppingBag,
  Building2,
  UserCog,
  Bell,
  BarChart3,
  Settings,
  Sparkles,
  MessageCircle,
  Wallet,
  ExternalLink,
  UserPlus,
  Zap,
} from 'lucide-react';

const QUICK_ENTRY_ACTIONS = [
  {
    href: '/admin/billing',
    title: 'New Bill (POS)',
    gujarati: 'નવું બિલિંગ (POS)',
    desc: 'Instant counter billing & thermal print',
    icon: Receipt,
    color: '#05424A',
    bg: '#edf7f9',
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
    title: 'WhatsApp (ઓટો સેન્ડ)',
    gujarati: 'વોટ્સએપ ઍપ ઓટો સેન્ડ',
    desc: 'Direct WhatsApp 1-click auto sender',
    icon: MessageCircle,
    color: '#25D366',
    bg: '#f0fdf4',
  },
];

const MORE_NAV = [
  { href: '/admin/finance',     label: 'Finance & Rojmel', icon: Wallet },
  { href: '/admin/customers',   label: 'Customers',        icon: Users },
  { href: '/admin/whatsapp',    label: 'WhatsApp (ઓટો)',   icon: MessageCircle },
  { href: '/admin/inventory',   label: 'Inventory',        icon: Package },
  { href: '/admin/purchases',   label: 'Purchases',        icon: ShoppingBag },
  { href: '/admin/suppliers',   label: 'Suppliers',        icon: Building2 },
  { href: '/admin/staff',       label: 'Staff',            icon: UserCog },
  { href: '/admin/reminders',   label: 'Reminders',        icon: Bell },
  { href: '/admin/reports',     label: 'Reports',          icon: BarChart3 },
  { href: '/admin/settings',    label: 'Settings',         icon: Settings },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [quickEntryOpen, setQuickEntryOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    const handleOpenMore = () => setMoreOpen(true);
    const handleToggleMore = () => setMoreOpen((prev) => !prev);
    const handleOpenQuick = () => setQuickEntryOpen(true);

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
      {/* ── 1. FAST SPEED ENTRY MODAL (SLIDE UP) ── */}
      <AnimatePresence>
        {quickEntryOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setQuickEntryOpen(false)}
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
                padding: '20px 16px env(safe-area-inset-bottom, 24px)',
                zIndex: 115,
                boxShadow: '0 -10px 40px rgba(0,0,0,.25)',
                maxHeight: '82vh',
                overflowY: 'auto',
              }}
            >
              {/* Drawer Grabber */}
              <div
                style={{
                  width: 40,
                  height: 4,
                  background: '#cbd5e1',
                  borderRadius: 99,
                  margin: '0 auto 16px',
                }}
              />

              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16,
                  paddingBottom: 12,
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: 'linear-gradient(135deg, #EABA38 0%, #D4AF37 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Zap size={18} color="#032B30" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#05424A' }}>
                      Quick Entry · ઝડપી નવી એન્ટ્રી
                    </h3>
                    <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>
                      Select an action to open entry form instantly
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setQuickEntryOpen(false)}
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
                >
                  <X size={18} color="#64748b" />
                </button>
              </div>

              {/* Action List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {QUICK_ENTRY_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link
                      key={action.href}
                      href={action.href}
                      onClick={() => setQuickEntryOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        borderRadius: 14,
                        background: action.bg,
                        border: `1px solid ${action.color}25`,
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
                            boxShadow: `0 2px 8px ${action.color}20`,
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
                            padding: '3px 7px',
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
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── 2. MORE ADMIN MANAGEMENT DRAWER ── */}
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
                background: 'rgba(0,0,0,.45)',
                zIndex: 110,
                backdropFilter: 'blur(3px)',
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
                background: '#fff',
                borderRadius: '24px 24px 0 0',
                padding: '20px 16px env(safe-area-inset-bottom, 24px)',
                zIndex: 115,
                boxShadow: '0 -10px 35px rgba(0,0,0,.2)',
                maxHeight: '78vh',
                overflowY: 'auto',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 4,
                  background: '#cbd5e1',
                  borderRadius: 99,
                  margin: '0 auto 16px',
                }}
              />

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16,
                  paddingBottom: 10,
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <div>
                  <span style={{ fontWeight: 800, fontSize: 16, color: '#05424A' }}>
                    All Studio Modules
                  </span>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Full Management Console</div>
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
                >
                  <X size={18} color="#64748b" />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {MORE_NAV.map(({ href, label, icon: Icon }) => {
                  const isActive = pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMoreOpen(false)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '12px 6px',
                        borderRadius: 14,
                        textDecoration: 'none',
                        gap: 6,
                        background: isActive ? '#edf7f9' : '#f8fafc',
                        border: isActive ? '1.5px solid #05424A' : '1px solid #e2e8f0',
                      }}
                    >
                      <Icon size={20} color={isActive ? '#05424A' : '#64748b'} />
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: isActive ? 700 : 600,
                          color: isActive ? '#05424A' : '#334155',
                          textAlign: 'center',
                          lineHeight: 1.2,
                        }}
                      >
                        {label}
                      </span>
                    </Link>
                  );
                })}
              </div>

              {/* Public Site Link */}
              <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
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
                    background: '#fefce8',
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

      {/* ── 3. MAIN MOBILE BOTTOM NAVIGATION BAR ── */}
      <nav
        className="mobile-bottom-nav no-print"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          height: 62,
          padding: '0 8px',
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.08)',
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
        }}
      >
        {/* Tab 1: Dashboard Home */}
        <Link
          href="/admin"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px 0',
            textDecoration: 'none',
            gap: 2,
            position: 'relative',
          }}
        >
          <LayoutDashboard size={19} color={pathname === '/admin' ? '#05424A' : '#94a3b8'} />
          <span
            style={{
              fontSize: 10,
              fontWeight: pathname === '/admin' ? 800 : 500,
              color: pathname === '/admin' ? '#05424A' : '#94a3b8',
            }}
          >
            Home
          </span>
          {pathname === '/admin' && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                width: 24,
                height: 2.5,
                background: '#05424A',
                borderRadius: 99,
              }}
            />
          )}
        </Link>

        {/* Tab 2: Appointments */}
        <Link
          href="/admin/appointments"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px 0',
            textDecoration: 'none',
            gap: 2,
            position: 'relative',
          }}
        >
          <Calendar size={19} color={pathname.startsWith('/admin/appointments') ? '#0284c7' : '#94a3b8'} />
          <span
            style={{
              fontSize: 10,
              fontWeight: pathname.startsWith('/admin/appointments') ? 800 : 500,
              color: pathname.startsWith('/admin/appointments') ? '#0284c7' : '#94a3b8',
            }}
          >
            Appts
          </span>
          {pathname.startsWith('/admin/appointments') && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                width: 24,
                height: 2.5,
                background: '#0284c7',
                borderRadius: 99,
              }}
            />
          )}
        </Link>

        {/* Tab 3: CENTER GLOWING QUICK ENTRY BUTTON (+ SPEED DIAL) */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
          }}
        >
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setQuickEntryOpen(true)}
            style={{
              position: 'relative',
              top: -14,
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #05424A 0%, #032B30 100%)',
              border: '3px solid #ffffff',
              boxShadow: '0 4px 16px rgba(5, 66, 74, 0.4), 0 0 0 2px #EABA38',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            title="Quick Fast Entry"
          >
            <Plus size={24} color="#EABA38" strokeWidth={3} />
          </motion.button>
        </div>

        {/* Tab 4: Billing POS */}
        <Link
          href="/admin/billing"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px 0',
            textDecoration: 'none',
            gap: 2,
            position: 'relative',
          }}
        >
          <Receipt size={19} color={pathname.startsWith('/admin/billing') ? '#05424A' : '#94a3b8'} />
          <span
            style={{
              fontSize: 10,
              fontWeight: pathname.startsWith('/admin/billing') ? 800 : 500,
              color: pathname.startsWith('/admin/billing') ? '#05424A' : '#94a3b8',
            }}
          >
            Billing
          </span>
          {pathname.startsWith('/admin/billing') && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                width: 24,
                height: 2.5,
                background: '#05424A',
                borderRadius: 99,
              }}
            />
          )}
        </Link>

        {/* Tab 5: More Drawer */}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px 0',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            gap: 2,
            position: 'relative',
          }}
        >
          <MoreHorizontal size={19} color={moreOpen ? '#05424A' : '#94a3b8'} />
          <span
            style={{
              fontSize: 10,
              fontWeight: moreOpen ? 800 : 500,
              color: moreOpen ? '#05424A' : '#94a3b8',
            }}
          >
            More
          </span>
        </button>
      </nav>
    </>
  );
}
