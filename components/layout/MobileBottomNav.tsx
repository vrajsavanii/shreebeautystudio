'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
  LayoutDashboard, Calendar, Receipt, Heart, MoreHorizontal,
  X, Users, Package, ShoppingBag, Building2, UserCog, Bell, BarChart3, Settings, Sparkles, MessageCircle, Wallet, ExternalLink
} from 'lucide-react';

const MAIN_NAV = [
  { href: '/admin',             label: 'Home',        icon: LayoutDashboard },
  { href: '/admin/appointments', label: 'Appts',       icon: Calendar },
  { href: '/admin/billing',      label: 'Billing',     icon: Receipt },
  { href: '/admin/bridal',       label: 'Bridal',      icon: Heart },
  { href: '/more',               label: 'More',        icon: MoreHorizontal, isMore: true },
];

const MORE_NAV = [
  { href: '/admin/expenses',    label: 'Expenses & Rojmel', icon: Wallet },
  { href: '/admin/customers',   label: 'Customers',        icon: Users },
  { href: '/admin/services',    label: 'Services',         icon: Sparkles },
  { href: '/admin/whatsapp',    label: 'WhatsApp',         icon: MessageCircle },
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
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      {/* More drawer */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
              style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)',
                zIndex: 98, backdropFilter: 'blur(2px)',
              }}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              style={{
                position: 'fixed', bottom: 64, left: 0, right: 0,
                background: '#fff', borderRadius: '20px 20px 0 0',
                padding: '20px 16px 24px', zIndex: 99,
                boxShadow: '0 -8px 30px rgba(0,0,0,.15)',
                maxHeight: '75vh', overflowY: 'auto',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontWeight: 700, fontSize: 16, color: '#05424A' }}>Admin Management</span>
                <button
                  onClick={() => setMoreOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                >
                  <X size={20} color="#64748b" />
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
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', padding: '12px 6px', borderRadius: 12,
                        textDecoration: 'none', gap: 6,
                        background: isActive ? '#edf7f9' : '#f8fafc',
                        border: isActive ? '1.5px solid #05424A' : '1px solid #e2e8f0',
                      }}
                    >
                      <Icon size={20} color={isActive ? '#05424A' : '#64748b'} />
                      <span style={{ fontSize: 11, fontWeight: isActive ? 700 : 500, color: isActive ? '#05424A' : '#334155', textAlign: 'center', lineHeight: 1.2 }}>
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
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '10px 16px', background: '#fefce8', border: '1px solid #fef08a',
                    borderRadius: 12, textDecoration: 'none', color: '#854d0e', fontWeight: 700, fontSize: 13,
                  }}
                >
                  <ExternalLink size={15} />
                  <span>Open Public Website ↗</span>
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bar */}
      <nav className="mobile-bottom-nav no-print">
        {MAIN_NAV.map(({ href, label, icon: Icon, isMore }) => {
          const isActive = !isMore && (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));

          if (isMore) {
            return (
              <button
                key={href}
                type="button"
                onClick={() => setMoreOpen((o) => !o)}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px 0',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  gap: 3,
                  position: 'relative',
                }}
              >
                <Icon size={20} color={moreOpen ? '#05424A' : '#94a3b8'} />
                <span style={{ fontSize: 10, fontWeight: moreOpen ? 700 : 500, color: moreOpen ? '#05424A' : '#94a3b8' }}>
                  {label}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px 0',
                textDecoration: 'none',
                gap: 3,
                position: 'relative',
              }}
            >
              <Icon size={20} color={isActive ? '#05424A' : '#94a3b8'} />
              <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500, color: isActive ? '#05424A' : '#94a3b8' }}>
                {label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="mobile-indicator"
                  style={{
                    position: 'absolute',
                    top: 0,
                    width: 28,
                    height: 2,
                    background: '#05424A',
                    borderRadius: 99,
                  }}
                />
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
