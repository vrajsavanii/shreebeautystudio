'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Menu,
  Calendar as CalendarIcon,
  Clock,
  Zap,
  Plus,
  AlertTriangle,
  Sparkles,
  MessageCircle,
  ShieldCheck,
  UserCheck,
  LogOut,
  ExternalLink,
} from 'lucide-react';
import CloudStatusBadge from '@/components/cloud/CloudStatusBadge';
import { format } from 'date-fns';
import { useSalonStore } from '@/lib/store';
import { todayISO } from '@/lib/utils';
import { clearAdminSession } from '@/lib/admin-auth';

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/admin':             { title: 'Dashboard Overview', subtitle: 'Real-time studio KPIs & analytics' },
  '/admin/appointments': { title: 'Appointments & Flow', subtitle: 'Daily bookings & beautician tracking' },
  '/admin/customers':    { title: 'Customer Directory', subtitle: 'Client records, birthdays & spend history' },
  '/admin/services':     { title: 'Services & Rate Card', subtitle: 'Salon menu, treatment rates & duration' },
  '/admin/billing':      { title: 'Billing POS Checkout', subtitle: 'Invoices, barcode billing & receipts' },
  '/admin/inventory':    { title: 'Inventory & Products', subtitle: 'Retail stock, audit logs & batch expiry' },
  '/admin/purchases':    { title: 'Product Purchases', subtitle: 'Vendor invoices & inward stock orders' },
  '/admin/suppliers':    { title: 'Supplier Management', subtitle: 'Vendor ledgers, GSTIN & payments' },
  '/admin/expenses':     { title: 'Expenses & Rojmel', subtitle: 'Daily studio cash flow, rojmel ledger & bank transfers' },
  '/admin/bridal':       { title: 'Bridal & Event Studio', subtitle: '13 Luxury packages, siders & multi-events' },
  '/admin/staff':        { title: 'Staff & Team Management', subtitle: 'Beauticians, roles, commissions & user accounts' },
  '/admin/whatsapp':     { title: 'WhatsApp Meta Hub', subtitle: 'Chat with customers, send invoices & automated promos' },
  '/admin/reminders':    { title: 'Smart Reminders', subtitle: 'Birthdays, anniversaries & follow-ups' },
  '/admin/reports':      { title: 'Financial & Reports', subtitle: 'Sales analysis, GST summary & profit' },
  '/admin/settings':     { title: 'Studio Settings', subtitle: 'Salon profile, printer & payments setup' },
};

interface TopbarProps {
  onMenuClick?: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data, currentUser, logoutUser } = useSalonStore();
  const today = todayISO();
  const isSalesperson = currentUser?.role === 'Salesperson';

  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => setTimeStr(format(new Date(), 'hh:mm a'));
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  const pageInfo = PAGE_TITLES[pathname] ?? {
    title: 'Management Console',
    subtitle: 'Salon & Studio Management',
  };

  const todayFormatted = format(new Date(), 'EEE, d MMM yyyy');

  // Quick stats
  const todayAppts = (data?.appointments || []).filter((a) => a.date === today && a.status !== 'Cancelled').length;
  const lowStockCount = (data?.inventory || []).filter((i) => i.stock <= i.low).length;

  const handleLogout = () => {
    clearAdminSession();
    logoutUser();
    router.push('/');
  };

  return (
    <header className="topbar no-print">
      {/* Mobile: hamburger */}
      <button
        className="btn-icon"
        onClick={onMenuClick}
        style={{ display: 'none' }}
        id="mobile-menu-btn"
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      {/* Left: Page Title & Breadcrumb Subtitle */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, flexShrink: 1 }}>
        <h1 className="topbar-title" style={{ fontSize: 17, margin: 0, lineHeight: 1.2 }}>
          {pageInfo.title}
        </h1>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}>
          <span style={{ fontWeight: 600, color: 'var(--teal)' }}>
            {data?.settings?.salon || 'Shree Beauty Studio'}
          </span>
          <span>•</span>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {pageInfo.subtitle}
          </span>
        </div>
      </div>

      {/* Center / Right: Live Date & Time + Alert Pills + Quick Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'nowrap' }}>
        {/* Live Date & Time Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#f8fafc',
            border: '1px solid var(--border)',
            padding: '5px 11px',
            borderRadius: 99,
            fontSize: 11.5,
            color: 'var(--text-light)',
          }}
          className="topbar-datetime"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <CalendarIcon size={12} color="var(--gold-dark)" />
            <span style={{ fontWeight: 600 }}>{todayFormatted}</span>
          </div>
          {timeStr && (
            <>
              <span style={{ color: 'var(--border)' }}>|</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={12} color="var(--teal)" />
                <span>{timeStr}</span>
              </div>
            </>
          )}
        </div>

        {/* Today's Bookings Indicator */}
        {todayAppts > 0 && (
          <Link
            href="/admin/appointments"
            className="badge badge-teal"
            style={{
              textDecoration: 'none',
              padding: '4px 9px',
              fontSize: 11,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
            title={`${todayAppts} appointment(s) scheduled for today`}
          >
            <Sparkles size={11} color="var(--teal)" />
            <span>{todayAppts} Today</span>
          </Link>
        )}

        {/* Low Stock Warning Indicator */}
        {lowStockCount > 0 && (
          <Link
            href="/admin/inventory"
            className="badge badge-red"
            style={{
              textDecoration: 'none',
              padding: '4px 9px',
              fontSize: 11,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
            title={`${lowStockCount} item(s) below re-order level`}
          >
            <AlertTriangle size={11} color="var(--red)" />
            <span>{lowStockCount} Low</span>
          </Link>
        )}

        {/* Quick Action Shortcuts */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} className="topbar-actions">
          {!isSalesperson && (
            <Link
              href="/admin/whatsapp"
              className="btn btn-sm"
              style={{
                fontSize: 11.5,
                padding: '5.5px 11px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: '#25D366',
                color: '#053320',
                fontWeight: 700,
                border: 'none',
              }}
              title="Open WhatsApp Web & Client Messenger"
            >
              <MessageCircle size={13} /> WhatsApp
            </Link>
          )}
          <Link
            href="/admin/billing"
            className="btn btn-primary btn-sm"
            style={{
              fontSize: 11.5,
              padding: '5.5px 11px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Zap size={12} /> POS Bill
          </Link>
          <Link
            href="/admin/appointments"
            className="btn btn-ghost btn-sm"
            style={{
              fontSize: 11.5,
              padding: '5.5px 10px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Plus size={12} /> Book
          </Link>
          <Link
            href="/"
            target="_blank"
            className="btn btn-ghost btn-sm"
            style={{
              fontSize: 11.5,
              padding: '5.5px 10px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              color: '#05424A',
              fontWeight: 600,
            }}
            title="Open Public Customer Website"
          >
            <ExternalLink size={12} /> Public Site
          </Link>
        </div>

        {/* Active User Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: isSalesperson ? '#f0fdf4' : '#fefce8',
            border: isSalesperson ? '1px solid #bbf7d0' : '1px solid #fef08a',
            padding: '4px 10px',
            borderRadius: 99,
            fontSize: 11.5,
          }}
        >
          {isSalesperson ? <UserCheck size={13} color="#16a34a" /> : <ShieldCheck size={13} color="#ca8a04" />}
          <span style={{ fontWeight: 700, color: isSalesperson ? '#15803d' : '#854d0e' }}>
            {currentUser?.name || 'Owner'}
          </span>
          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 99, background: isSalesperson ? '#dcfce7' : '#fef9c3', color: isSalesperson ? '#166534' : '#713f12', fontWeight: 800 }}>
            {isSalesperson ? 'Sales' : 'Admin'}
          </span>
          <button
            type="button"
            onClick={handleLogout}
            title="Sign Out / Lock Admin"
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '0 0 0 4px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <LogOut size={12} />
          </button>
        </div>

        {/* Cloud Sync Status */}
        <CloudStatusBadge />
      </div>

      <style>{`
        @media (max-width: 992px) {
          .topbar-datetime { display: none !important; }
        }
        @media (max-width: 767px) {
          #mobile-menu-btn { display: flex !important; }
          .topbar-actions { display: none !important; }
        }
      `}</style>
    </header>
  );
}
