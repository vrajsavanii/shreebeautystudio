'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Calendar, Users, Receipt, Package,
  ShoppingBag, Building2, Heart, UserCog, Bell, BarChart3, Settings, Sparkles, MessageCircle, ExternalLink, BookOpen
} from 'lucide-react';
import { useSalonStore } from '@/lib/store';
import { staggerContainer, fadeSlideUp } from '@/variants';
import { SHREE_LOGO_BASE64 } from '@/lib/logo-base64';


const NAV = [
  { href: '/admin',              label: 'Dashboard',          icon: LayoutDashboard, role: 'all' },
  { href: '/admin/appointments',  label: 'Appointments',       icon: Calendar,        role: 'all' },
  { href: '/admin/bridal',        label: 'Bridal Bookings',    icon: Heart,           role: 'all' },
  { href: '/admin/customers',     label: 'Customers',          icon: Users,           role: 'all' },
  { href: '/admin/billing',       label: 'Billing (POS)',      icon: Receipt,         role: 'all' },
  { href: '/admin/whatsapp',      label: 'WhatsApp (ઓટો સેન્ડ)', icon: MessageCircle,   role: 'all' },
  { href: '/admin/finance',       label: 'Finance & Rojmel',   icon: BookOpen,        role: 'admin' },
  { href: '/admin/services',      label: 'Services & Menu',    icon: Sparkles,        role: 'admin' },
  { href: '/admin/inventory',     label: 'Inventory',          icon: Package,         role: 'all' },
  { href: '/admin/purchases',     label: 'Product Purchase',   icon: ShoppingBag,     role: 'all' },
  { href: '/admin/suppliers',     label: 'Suppliers',          icon: Building2,       role: 'admin' },
  { href: '/admin/staff',         label: 'Staff & Users',      icon: UserCog,         role: 'admin' },
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
      {/* Direct Brand Logo Banner - Seamless Borderless Big Size */}
      <div
        style={{
          padding: '12px 14px 6px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <img
          src={SHREE_LOGO_BASE64}
          alt={salonName}
          style={{
            width: '100%',
            maxWidth: '190px',
            height: 'auto',
            display: 'block',
            objectFit: 'contain',
            border: 'none',
            outline: 'none',
            filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.25))',
          }}
        />
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
                <Icon size={15.5} className="icon" />
                {label}
              </Link>
            </motion.div>
          );
        })}

        {/* Public Website Preview Link */}
        <motion.div variants={fadeSlideUp} style={{ marginTop: 4, paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <Link
            href="/"
            target="_blank"
            className="sidebar-link"
            style={{ color: '#EABA38', fontWeight: 600 }}
          >
            <ExternalLink size={15} className="icon" color="#EABA38" />
            Public Website ↗
          </Link>
        </motion.div>
      </motion.div>
    </nav>
  );
}
