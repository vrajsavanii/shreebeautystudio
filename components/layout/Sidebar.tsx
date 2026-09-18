'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Calendar, Users, Receipt, Package,
  ShoppingBag, Building2, Heart, UserCog, Bell, BarChart3, Settings, Sparkles, MessageCircle, ExternalLink, BookOpen
} from 'lucide-react';
import CloudStatusBadge from '@/components/cloud/CloudStatusBadge';
import { useSalonStore } from '@/lib/store';
import { staggerContainer, fadeSlideUp } from '@/variants';
import { SHREE_LOGO_BASE64 } from '@/lib/logo-base64';

const NAV = [
  { href: '/admin',              label: 'Dashboard',          icon: LayoutDashboard, role: 'all' },
  { href: '/admin/appointments',  label: 'Appointments',       icon: Calendar,        role: 'all' },
  { href: '/admin/bridal',        label: 'Bridal Bookings',    icon: Heart,           role: 'all' },
  { href: '/admin/customers',     label: 'Customers',          icon: Users,           role: 'all' },
  { href: '/admin/services',      label: 'Services & Menu',    icon: Sparkles,        role: 'admin' },
  { href: '/admin/billing',       label: 'Billing (POS)',      icon: Receipt,         role: 'all' },
  { href: '/admin/finance',       label: 'Finance & Rojmel',   icon: BookOpen,        role: 'admin' },
  { href: '/admin/inventory',     label: 'Inventory',          icon: Package,         role: 'all' },
  { href: '/admin/purchases',     label: 'Product Purchase',   icon: ShoppingBag,     role: 'all' },
  { href: '/admin/suppliers',     label: 'Suppliers',          icon: Building2,       role: 'admin' },
  { href: '/admin/staff',         label: 'Staff & Users',      icon: UserCog,         role: 'admin' },
  { href: '/admin/whatsapp',      label: 'WhatsApp Meta Hub',  icon: MessageCircle,   role: 'admin' },
  { href: '/admin/reminders',     label: 'Reminders',          icon: Bell,            role: 'admin' },
  { href: '/admin/reports',       label: 'Reports & GST',      icon: BarChart3,       role: 'admin' },
  { href: '/admin/settings',      label: 'Settings',           icon: Settings,        role: 'admin' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data, currentUser } = useSalonStore();
  const salonName = data?.settings?.salon || 'Shree Beauty Studio';

  const isSalesperson = currentUser?.role === 'Salesperson';
  const visibleNav = NAV.filter((item) => {
    if (isSalesperson) {
      return item.role === 'all';
    }
    return true;
  });

  return (
    <nav className="sidebar no-print">
      {/* Direct Brand Logo Banner */}
      <div
        style={{
          padding: '16px 14px 12px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: 12,
        }}
      >
        <div
          style={{
            width: '100%',
            borderRadius: 12,
            overflow: 'hidden',
            background: '#05424A',
            border: '1px solid rgba(234, 186, 56, 0.35)',
            boxShadow: '0 4px 18px rgba(0, 0, 0, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
        >
          <img
            src={SHREE_LOGO_BASE64}
            alt={salonName}
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
              objectFit: 'contain',
            }}
          />
        </div>
      </div>

      {/* Nav Items */}
      <motion.div
        className="sidebar-nav"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {visibleNav.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
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

        {/* Public Website Preview Link */}
        <motion.div variants={fadeSlideUp} style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <Link
            href="/"
            target="_blank"
            className="sidebar-link"
            style={{ color: '#EABA38', fontWeight: 600 }}
          >
            <ExternalLink size={16} className="icon" color="#EABA38" />
            Public Website ↗
          </Link>
        </motion.div>
      </motion.div>

      {/* Cloud Status */}
      <div style={{ padding: '12px 14px 16px', borderTop: '1px solid rgba(255,255,255,.08)' }}>
        <CloudStatusBadge />
      </div>
    </nav>
  );
}
