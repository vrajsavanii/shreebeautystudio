'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
  LayoutDashboard, Calendar, Receipt, Heart, MoreHorizontal,
  X, Users, Package, ShoppingBag, Building2, UserCog, Bell, BarChart3, Settings, Sparkles, MessageCircle,
} from 'lucide-react';

const MAIN_NAV = [
  { href: '/',             label: 'Home',        icon: LayoutDashboard },
  { href: '/appointments', label: 'Appts',       icon: Calendar },
  { href: '/billing',      label: 'Billing',     icon: Receipt },
  { href: '/bridal',       label: 'Bridal',      icon: Heart },
  { href: '/more',         label: 'More',        icon: MoreHorizontal, isMore: true },
];

const MORE_NAV = [
  { href: '/services',    label: 'Services',   icon: Sparkles },
  { href: '/customers',   label: 'Customers',  icon: Users },
  { href: '/whatsapp',    label: 'WhatsApp',   icon: MessageCircle },
  { href: '/inventory',   label: 'Inventory',  icon: Package },
  { href: '/purchases',   label: 'Purchases',  icon: ShoppingBag },
  { href: '/suppliers',   label: 'Suppliers',  icon: Building2 },
  { href: '/staff',       label: 'Staff',      icon: UserCog },
  { href: '/reminders',   label: 'Reminders',  icon: Bell },
  { href: '/reports',     label: 'Reports',    icon: BarChart3 },
  { href: '/settings',    label: 'Settings',   icon: Settings },
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
                zIndex: 99, padding: '16px 16px 8px',
                boxShadow: '0 -8px 40px rgba(0,0,0,.15)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>More Modules</span>
                <button
                  onClick={() => setMoreOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7880' }}
                >
                  <X size={18} />
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {MORE_NAV.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMoreOpen(false)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      gap: 6, padding: '12px 4px', borderRadius: 12,
                      background: pathname.startsWith(href) ? 'rgba(5,66,74,.06)' : '#f5f7f8',
                      color: pathname.startsWith(href) ? '#05424A' : '#6b7880',
                      textDecoration: 'none', fontSize: 11, fontWeight: 600, textAlign: 'center'
                    }}
                  >
                    <Icon size={18} />
                    {label}
                  </Link>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom nav bar */}
      <nav className="mobile-bottom-nav no-print">
        {MAIN_NAV.map(({ href, label, icon: Icon, isMore }) => {
          const isActive = isMore ? moreOpen : (href === '/' ? pathname === '/' : pathname.startsWith(href));
          return (
            <motion.button
              key={href}
              onClick={() => {
                if (isMore) { setMoreOpen(!moreOpen); return; }
                setMoreOpen(false);
                window.location.href = href;
              }}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 3, padding: '10px 4px',
                background: 'none', border: 'none', cursor: 'pointer',
                color: isActive ? '#05424A' : '#6b7880',
                fontFamily: 'inherit', fontSize: 10, fontWeight: isActive ? 700 : 500,
              }}
              whileTap={{ scale: 0.9 }}
            >
              <motion.span
                animate={isActive ? { y: -2 } : { y: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              </motion.span>
              {label}
            </motion.button>
          );
        })}
      </nav>
    </>
  );
}
