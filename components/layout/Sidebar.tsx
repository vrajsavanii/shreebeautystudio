'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Calendar, Users, Receipt, Package,
  ShoppingBag, Building2, Heart, UserCog, Bell, BarChart3, Settings, Sparkles, Wallet, MessageCircle
} from 'lucide-react';
import CloudStatusBadge from '@/components/cloud/CloudStatusBadge';
import { useSalonStore } from '@/lib/store';
import { staggerContainer, fadeSlideUp } from '@/variants';

const NAV = [
  { href: '/',             label: 'Dashboard',          icon: LayoutDashboard },
  { href: '/appointments', label: 'Appointments',       icon: Calendar },
  { href: '/customers',    label: 'Customers',          icon: Users },
  { href: '/services',     label: 'Services & Menu',    icon: Sparkles },
  { href: '/billing',      label: 'Billing (POS)',      icon: Receipt },
  { href: '/inventory',    label: 'Inventory',          icon: Package },
  { href: '/purchases',    label: 'Product Purchase',   icon: ShoppingBag },
  { href: '/suppliers',    label: 'Suppliers',          icon: Building2 },
  { href: '/expenses',     label: 'Expenses & Daybook', icon: Wallet },
  { href: '/bridal',       label: 'Bridal Bookings',    icon: Heart },
  { href: '/staff',        label: 'Staff',              icon: UserCog },
  { href: '/whatsapp',     label: 'WhatsApp Meta Hub',  icon: MessageCircle },
  { href: '/reminders',    label: 'Reminders',          icon: Bell },
  { href: '/reports',      label: 'Reports & GST',      icon: BarChart3 },
  { href: '/settings',     label: 'Settings',           icon: Settings },
];

import { SHREE_ONLY_LOGO_BASE64 } from '@/lib/logo-base64';

export default function Sidebar() {
  const pathname = usePathname();
  const { data } = useSalonStore();
  const salonName = data?.settings?.salon || 'Shree Beauty Studio';

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
          <div className="sidebar-logo-sub">Management System</div>
        </div>
      </div>

      {/* Nav Items */}
      <motion.div
        className="sidebar-nav"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {NAV.map(({ href, label, icon: Icon }) => {
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
