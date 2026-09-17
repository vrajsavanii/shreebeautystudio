'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Calendar, Users, Receipt, Package,
  ShoppingBag, Building2, Heart, UserCog, Bell, BarChart3, Settings, Sparkles, Wallet, MessageCircle, LogOut, ShieldCheck, UserCheck, ExternalLink, BookOpen
} from 'lucide-react';
import CloudStatusBadge from '@/components/cloud/CloudStatusBadge';
import { useSalonStore } from '@/lib/store';
import { clearAdminSession } from '@/lib/admin-auth';
import { staggerContainer, fadeSlideUp } from '@/variants';
import { SHREE_ONLY_LOGO_BASE64 } from '@/lib/logo-base64';

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
    clearAdminSession();
    logoutUser();
    router.push('/');
  };

  return (
    <nav className="sidebar no-print">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-img-wrap sidebar-avatar-glow">
          <img
            src={SHREE_ONLY_LOGO_BASE64}
            alt={salonName}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        </div>
        <div>
          <div className="sidebar-logo-title">{salonName}</div>
          <div className="sidebar-logo-sub">
            {isSalesperson ? 'Salesperson Mode' : 'Management Console'}
          </div>
        </div>
      </div>

      {/* Current User Badge */}
      <div
        style={{
          margin: '0 12px 12px',
          padding: '10px 12px',
          borderRadius: 12,
          background: isSalesperson ? 'rgba(22, 163, 74, 0.12)' : 'linear-gradient(135deg, rgba(234,186,56,0.18) 0%, rgba(234,186,56,0.08) 100%)',
          border: isSalesperson ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(234, 186, 56, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#fff',
          backdropFilter: 'blur(8px)',
          boxShadow: isSalesperson ? 'none' : '0 2px 12px rgba(234,186,56,0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {isSalesperson ? (
            <UserCheck size={16} color="#4ade80" />
          ) : (
            <ShieldCheck size={16} color="#fde047" />
          )}
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '0.01em' }}>
              {currentUser?.name || 'Studio Owner'}
            </div>
            <div style={{ fontSize: 10, opacity: 0.85, color: isSalesperson ? '#4ade80' : '#fde047', marginTop: 1 }}>
              {isSalesperson ? '👤 Salesperson' : '👑 Admin / Owner'}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          title="Sign Out / Lock Admin"
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 6,
            color: 'rgba(255,255,255,0.7)',
            cursor: 'pointer',
            padding: '4px 6px',
            display: 'flex',
            alignItems: 'center',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(220,38,38,0.25)'; (e.currentTarget as HTMLButtonElement).style.color = '#f87171'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.7)'; }}
        >
          <LogOut size={13} />
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
