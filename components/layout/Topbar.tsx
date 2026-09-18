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
  '/admin/finance':      { title: 'Finance & Rojmel Hub', subtitle: 'Vyapar ledger, party khata, cashbook & daily rojmel' },
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
        onClick={() => {
          if (onMenuClick) {
            onMenuClick();
          } else if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('open-mobile-more'));
          }
        }}
        style={{ display: 'none' }}
        id="mobile-menu-btn"
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      {/* Left: Page Title */}
      <div
        className="topbar-title-wrap"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minWidth: 'fit-content',
          flexShrink: 0,
        }}
      >
        <h1 className="topbar-title" style={{ fontSize: 17, fontWeight: 800, margin: 0, lineHeight: 1, whiteSpace: 'nowrap' }}>
          {pageInfo.title}
        </h1>
      </div>

      {/* Center / Right: Clean Right-Side Toolbar */}
      <div
        className="topbar-right"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexWrap: 'nowrap',
          minWidth: 0,
          justifyContent: 'flex-end',
          flex: 1,
        }}
      >
        {/* Live Date & Time Pill */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            padding: '0 8px',
            height: 28,
            borderRadius: 99,
            fontSize: 11,
            color: '#475569',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
          className="topbar-datetime"
        >
          <CalendarIcon size={12} color="var(--gold-dark)" />
          <span style={{ fontWeight: 600 }}>{todayFormatted}</span>
          {timeStr && (
            <>
              <span style={{ color: '#cbd5e1' }}>·</span>
              <Clock size={11.5} color="var(--teal)" />
              <span>{timeStr}</span>
            </>
          )}
        </div>

        {/* Today's Bookings Indicator */}
        {todayAppts > 0 && (
          <Link
            href="/admin/appointments"
            className="topbar-badge"
            style={{
              textDecoration: 'none',
              height: 28,
              padding: '0 8px',
              fontSize: 11,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              flexShrink: 0,
              borderRadius: 99,
              background: '#e0f2fe',
              color: '#0369a1',
              border: '1px solid #bae6fd',
            }}
            title={`${todayAppts} appointment(s) scheduled for today`}
          >
            <Sparkles size={11} color="#0284c7" />
            <span className="topbar-badge-label">{todayAppts} Today</span>
            <span className="topbar-badge-short">{todayAppts}</span>
          </Link>
        )}

        {/* Low Stock Warning Indicator */}
        {lowStockCount > 0 && (
          <Link
            href="/admin/inventory"
            className="topbar-badge"
            style={{
              textDecoration: 'none',
              height: 28,
              padding: '0 8px',
              fontSize: 11,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              flexShrink: 0,
              borderRadius: 99,
              background: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fecaca',
            }}
            title={`${lowStockCount} item(s) below re-order level`}
          >
            <AlertTriangle size={11} color="#ef4444" />
            <span className="topbar-badge-label">{lowStockCount} Low</span>
            <span className="topbar-badge-short">{lowStockCount}</span>
          </Link>
        )}

        {/* Quick Action Shortcuts (Uniform 28px height) */}
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }} className="topbar-actions">
          {!isSalesperson && pathname !== '/admin/whatsapp' && (
            <Link
              href="/admin/whatsapp"
              className="topbar-btn"
              style={{
                fontSize: 11.5,
                height: 28,
                padding: '0 9px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: '#25D366',
                color: '#ffffff',
                fontWeight: 700,
                border: 'none',
                borderRadius: 6,
                boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                flexShrink: 0,
              }}
              title="Open WhatsApp Web & Client Messenger"
            >
              <MessageCircle size={13} /> <span className="topbar-action-label">WhatsApp</span>
            </Link>
          )}
          {pathname !== '/admin/billing' && (
            <Link
              href="/admin/billing"
              className="topbar-btn"
              style={{
                fontSize: 11.5,
                height: 28,
                padding: '0 9px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                borderRadius: 6,
                background: '#05424A',
                color: '#ffffff',
                fontWeight: 700,
                flexShrink: 0,
              }}
              title="New POS Bill"
            >
              <Zap size={12} /> <span className="topbar-action-label">POS Bill</span>
            </Link>
          )}
          {pathname !== '/admin/appointments' && (
            <Link
              href="/admin/appointments"
              className="topbar-btn"
              style={{
                fontSize: 11.5,
                height: 28,
                padding: '0 9px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                borderRadius: 6,
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                color: '#334155',
                fontWeight: 600,
                flexShrink: 0,
              }}
              title="Book Appointment"
            >
              <Plus size={12} /> <span className="topbar-action-label">Book</span>
            </Link>
          )}
          <Link
            href="/"
            target="_blank"
            className="topbar-btn"
            style={{
              fontSize: 11.5,
              height: 28,
              padding: '0 9px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              color: '#05424A',
              fontWeight: 600,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              flexShrink: 0,
            }}
            title="Open Public Customer Website"
          >
            <ExternalLink size={12} /> <span className="topbar-action-label">Site</span>
          </Link>
        </div>

        {/* Active User Pill (28px height) */}
        <div
          className="topbar-user-pill"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            height: 28,
            gap: 5,
            background: isSalesperson ? '#f0fdf4' : '#fefce8',
            border: isSalesperson ? '1px solid #bbf7d0' : '1px solid #fef08a',
            padding: '0 8px',
            borderRadius: 99,
            fontSize: 11.5,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {isSalesperson ? <UserCheck size={13} color="#16a34a" /> : <ShieldCheck size={13} color="#ca8a04" />}
          <span className="topbar-user-name" style={{ fontWeight: 700, color: isSalesperson ? '#15803d' : '#854d0e' }}>
            {(() => {
              const raw = currentUser?.name || 'Owner';
              const clean = raw.replace(/\s*\([^)]*\)/g, '').trim();
              if (clean.toLowerCase() === 'studio owner' || clean.toLowerCase() === 'studio owner (admin)') return 'Owner';
              return clean.split(' ')[0] || 'Owner';
            })()}
          </span>
          <span style={{ fontSize: 9.5, padding: '1px 5px', borderRadius: 99, background: isSalesperson ? '#dcfce7' : '#fef9c3', color: isSalesperson ? '#166534' : '#713f12', fontWeight: 800 }}>
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
              padding: '0 0 0 2px',
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
        .topbar-badge-short { display: none; }
        @media (max-width: 1350px) {
          .topbar-action-label { display: none !important; }
        }
        @media (max-width: 1150px) {
          .topbar-datetime { display: none !important; }
        }
        @media (max-width: 992px) {
          .topbar-actions { display: none !important; }
        }
        @media (max-width: 767px) {
          #mobile-menu-btn { display: flex !important; margin-right: 2px; }
          .topbar-subtitle { display: none !important; }
          .topbar-user-name { display: none !important; }
          .topbar-badge-label { display: none !important; }
          .topbar-badge-short { display: inline !important; }
        }
        @media (max-width: 480px) {
          .topbar-title {
            font-size: 14.5px !important;
            max-width: 120px !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
          }
          .topbar-badge {
            padding: 3px 6px !important;
          }
        }
      `}</style>
    </header>
  );
}
