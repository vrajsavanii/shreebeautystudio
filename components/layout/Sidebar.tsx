'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Calendar, Users, Receipt, Package,
  ShoppingBag, Building2, Heart, UserCog, Bell, BarChart3, Settings, Sparkles, Wallet, MessageCircle, LogOut, ShieldCheck, UserCheck
} from 'lucide-react';
import CloudStatusBadge from '@/components/cloud/CloudStatusBadge';
import { useSalonStore } from '@/lib/store';
import { staggerContainer, fadeSlideUp } from '@/variants';
import { SHREE_ONLY_LOGO_BASE64 } from '@/lib/logo-base64';

const NAV = [
  { href: '/',             label: 'Dashboard',          icon: LayoutDashboard, role: 'all' },
  { href: '/appointments', label: 'Appointments',       icon: Calendar,        role: 'all' },
  { href: '/customers',    label: 'Customers',          icon: Users,           role: 'all' },
  { href: '/services',     label: 'Services & Menu',    icon: Sparkles,        role: 'admin' },
  { href: '/billing',      label: 'Billing (POS)',      icon: Receipt,         role: 'all' },
  { href: '/inventory',    label: 'Inventory',          icon: Package,         role: 'all' },
  { href: '/purchases',    label: 'Product Purchase',   icon: ShoppingBag,     role: 'all' },
  { href: '/suppliers',    label: 'Suppliers',          icon: Building2,       role: 'admin' },
  { href: '/expenses',     label: 'Expenses & Daybook', icon: Wallet,          role: 'admin' },
  { href: '/bridal',       label: 'Bridal Bookings',    icon: Heart,           role: 'all' },
  { href: '/staff',        label: 'Staff & Users',      icon: UserCog,         role: 'admin' },
  { href: '/whatsapp',     label: 'WhatsApp Meta Hub',  icon: MessageCircle,   role: 'admin' },
  { href: '/reminders',    label: 'Reminders',          icon: Bell,            role: 'admin' },
  { href: '/reports',      label: 'Reports & GST',      icon: BarChart3,       role: 'admin' },
  { href: '/settings',     label: 'Settings',           icon: Settings,        role: 'admin' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data, currentUser, logoutUser } = useSalonStore();
  const salonName = data?.settings?.salon || 'Shree Beauty Studio';

  const isSalesperson = currentUser?.role === 'Salesperson';
  const visibleNav = NAV.filter((item) => {
    if (isSalesperson) {
      return item.role === 'all';
    }
    return true;
  });

  const handleLogout = () => {
    logoutUser();
    router.push('/login');
  };

  return (
    <nav className="sidebar no-print">
      {/* Logo */}
      <div className="sidebar-logo">
        <img
          src={SHREE_ONLY_LOGO_BASE64}
          alt={salonName}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            objectFit: 'cover',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            border: '2px solid rgba(234,186,56,.4)',
          }}
        />
        <div>
          <div className="sidebar-logo-title">{salonName}</div>
          <div className="sidebar-logo-sub">
            {isSalesperson ? 'Salesperson Mode' : 'Management System'}
          </div>
        </div>
      </div>

      {/* Current User Badge */}
      <div
        style={{
          margin: '0 12px 12px',
          padding: '8px 12px',
          borderRadius: 8,
          background: isSalesperson ? 'rgba(22, 163, 74, 0.15)' : 'rgba(234, 186, 56, 0.15)',
          border: isSalesperson ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(234, 186, 56, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#fff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {isSalesperson ? (
            <UserCheck size={16} color="#4ade80" />
          ) : (
            <ShieldCheck size={16} color="#fde047" />
          )}
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentUser?.name || 'Studio Owner'}
            </div>
            <div style={{ fontSize: 10, opacity: 0.8, color: isSalesperson ? '#4ade80' : '#fde047' }}>
              {isSalesperson ? '👤 Salesperson' : '👑 Admin / Owner'}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          title="Sign Out Account"
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.7)',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <LogOut size={14} />
        </button>
      </div>

      {/* Nav Items */}
      <motion.div
        className="sidebar-nav"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {visibleNav.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <motion.div key={href} variants={fadeSlideUp}>
              <Link
                href={href}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={17} className="icon" />
                {label}
              </Link>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Cloud Status */}
      <div style={{ padding: '12px 14px 16px', borderTop: '1px solid rgba(255,255,255,.08)' }}>
        <CloudStatusBadge />
      </div>
    </nav>
  );
}

