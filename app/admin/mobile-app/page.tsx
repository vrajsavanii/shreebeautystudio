'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Smartphone,
  Download,
  Users,
  TrendingUp,
  RefreshCw,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  Share2,
  Sparkles,
  Layers,
  Activity,
  Flame,
  ArrowUpRight,
  Filter,
  Check,
  Copy,
  Calendar,
  AlertCircle,
  HelpCircle,
  Send,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useToast } from '@/components/ui/Toast';
import { staggerContainer, fadeSlideUp } from '@/variants';
import { trackApkDownload } from '@/lib/apk-tracker';

const COLORS = ['#EABA38', '#05424A', '#22c55e', '#38bdf8', '#a855f7', '#f43f5e'];

export default function MobileAppAnalyticsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'devices' | 'qr'>('overview');
  const [filterType, setFilterType] = useState<'all' | 'customer' | 'admin'>('all');
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchAnalytics = async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/analytics/apk', { cache: 'no-store' });
      const json = await res.json();
      if (json.success && json.data) {
        setStats(json.data);
      }
    } catch (e: any) {
      console.warn('Failed to load APK analytics:', e);
      toast('Failed to load live APK analytics', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSimulateTestPing = async () => {
    try {
      await fetch('/api/analytics/apk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'open',
          payload: {
            installationId: 'test_device_' + Math.random().toString(36).substring(2, 6),
            appType: 'customer',
            deviceModel: 'Samsung Galaxy (Test)',
            osVersion: 'Android 14',
            screenResolution: '1080x2400',
          },
        }),
      });
      toast('⚡ Test telemetry ping sent! Refreshing analytics...', 'success');
      fetchAnalytics();
    } catch {
      toast('Failed to send test ping', 'error');
    }
  };

  const copyDownloadLink = () => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/download`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      toast('📋 Download link copied to clipboard!', 'success');
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Filtered recent activity table
  const recentEvents = useMemo(() => {
    if (!stats) return [];
    const downloads = (stats.recentDownloads || []).map((d: any) => ({
      ...d,
      eventType: 'APK Download',
      iconType: 'download',
    }));
    const sessions = (stats.recentSessions || []).map((s: any) => ({
      ...s,
      eventType: s.event === 'install' ? 'First App Install' : 'App Active Open',
      iconType: s.event === 'install' ? 'install' : 'open',
    }));

    let combined = [...downloads, ...sessions].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    if (filterType !== 'all') {
      combined = combined.filter((c) => c.appType === filterType);
    }

    return combined.slice(0, 30);
  }, [stats, filterType]);

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1240, margin: '0 auto' }}>
      {/* ─── Top Header Bar ─── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #05424A 0%, #032B30 100%)',
                color: '#EABA38',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(5, 66, 74, 0.25)',
              }}
            >
              <Smartphone size={20} />
            </div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a' }}>
              Mobile App & APK Analytics
            </h1>
            <span
              style={{
                background: '#e0f2fe',
                color: '#0369a1',
                padding: '2px 8px',
                borderRadius: 99,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}
            >
              LIVE TELEMETRY
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
            Real-time tracking for Android APK downloads, app installs, daily active sessions & phone devices ·{' '}
            <strong style={{ color: '#05424A' }}>Google Play Store Not Required</strong>
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={fetchAnalytics}
            disabled={refreshing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              padding: '8px 14px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            onClick={handleSimulateTestPing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(234, 186, 56, 0.15)',
              border: '1px solid rgba(234, 186, 56, 0.4)',
              padding: '8px 14px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              color: '#92400e',
              cursor: 'pointer',
            }}
          >
            <Activity size={14} color="#d97706" />
            <span>Test Ping</span>
          </button>

          <Link
            href="/download"
            target="_blank"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'linear-gradient(135deg, #05424A 0%, #032B30 100%)',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 2px 8px rgba(5,66,74,0.25)',
            }}
          >
            <ExternalLink size={14} color="#EABA38" />
            <span>Public Download Page</span>
          </Link>
        </div>
      </div>

      {/* ─── 4 Primary KPI Metric Cards ─── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
          marginBottom: 28,
        }}
      >
        {/* Card 1: Total Downloads */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 16,
            padding: '20px 22px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px -2px rgba(0,0,0,0.04)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Total APK Downloads
              </span>
              <h3 style={{ margin: '6px 0 0', fontSize: 32, fontWeight: 900, color: '#0f172a' }}>
                {stats?.totalDownloads ?? 0}
              </h3>
            </div>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: 'rgba(234, 186, 56, 0.15)',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Download size={20} />
            </div>
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 12, fontSize: 12, color: '#475569' }}>
            <span>
              Customer: <strong>{stats?.totalCustomerDownloads ?? 0}</strong>
            </span>
            <span>•</span>
            <span>
              Admin: <strong>{stats?.totalAdminDownloads ?? 0}</strong>
            </span>
          </div>
        </div>

        {/* Card 2: Total Installs & Devices */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 16,
            padding: '20px 22px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px -2px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Active Installed Phones
              </span>
              <h3 style={{ margin: '6px 0 0', fontSize: 32, fontWeight: 900, color: '#05424A' }}>
                {stats?.totalInstalls ?? 0}
              </h3>
            </div>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: 'rgba(5, 66, 74, 0.1)',
                color: '#05424A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Smartphone size={20} />
            </div>
          </div>
          <div style={{ marginTop: 14, fontSize: 12, color: '#22c55e', fontWeight: 600 }}>
            <span>✓ Verified Unique Installation IDs</span>
          </div>
        </div>

        {/* Card 3: In-App Active Sessions Today */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 16,
            padding: '20px 22px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px -2px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Active Users Today (DAU)
              </span>
              <h3 style={{ margin: '6px 0 0', fontSize: 32, fontWeight: 900, color: '#0f172a' }}>
                {stats?.activeUsersToday ?? 0}
              </h3>
            </div>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: '#ecfdf5',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={20} />
            </div>
          </div>
          <div style={{ marginTop: 14, fontSize: 12, color: '#64748b' }}>
            <span>
              This Week: <strong>{stats?.activeUsersWeek ?? 0}</strong> users · Total Opens: <strong>{stats?.totalSessions ?? 0}</strong>
            </span>
          </div>
        </div>

        {/* Card 4: In-App Bookings */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 16,
            padding: '20px 22px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px -2px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Bookings via Mobile App
              </span>
              <h3 style={{ margin: '6px 0 0', fontSize: 32, fontWeight: 900, color: '#d97706' }}>
                {stats?.totalAppBookings ?? 0}
              </h3>
            </div>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: '#fffbeb',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={20} />
            </div>
          </div>
          <div style={{ marginTop: 14, fontSize: 12, color: '#64748b' }}>
            <span>
              Revenue: <strong>₹{stats?.totalAppRevenue ? Number(stats.totalAppRevenue).toLocaleString('en-IN') : '0'}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* ─── Navigation Tabs ─── */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          borderBottom: '1px solid #e2e8f0',
          marginBottom: 24,
          overflowX: 'auto',
          paddingBottom: 2,
        }}
      >
        {[
          { id: 'overview', label: '14-Day Growth Trends', icon: TrendingUp },
          { id: 'activity', label: 'Real-Time Activity Feed', icon: Activity },
          { id: 'devices', label: 'Device & Android Versions', icon: Smartphone },
          { id: 'qr', label: 'Share & QR Codes', icon: QrCode },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                border: 'none',
                background: 'none',
                borderBottom: isActive ? '3px solid #05424A' : '3px solid transparent',
                color: isActive ? '#05424A' : '#64748b',
                fontWeight: isActive ? 800 : 600,
                fontSize: 14,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={16} color={isActive ? '#05424A' : '#94a3b8'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── TAB 1: 14-DAY GROWTH TRENDS ─── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
          <div
            style={{
              background: '#ffffff',
              borderRadius: 18,
              padding: '24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 16px -2px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                Daily Downloads & In-App Opens (Last 14 Days)
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
                Compares how many clients downloaded the APK vs how many launched and used the app.
              </p>
            </div>

            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.dailyTrends || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#011215',
                      border: '1px solid #EABA38',
                      borderRadius: 10,
                      color: '#ffffff',
                      fontSize: 12,
                    }}
                  />
                  <Legend />
                  <Bar dataKey="customerDownloads" name="Customer APK Downloads" fill="#EABA38" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="adminDownloads" name="Admin APK Downloads" fill="#0369a1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="appOpens" name="In-App Active Opens" fill="#05424A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: REAL-TIME ACTIVITY FEED ─── */}
      {activeTab === 'activity' && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: 18,
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px -2px rgba(0,0,0,0.04)',
          }}
        >
          {/* Filter Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 18,
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                Live Mobile Activity Stream
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
                Showing the last 30 telemetry events recorded directly from customer and admin devices.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 6, background: '#f1f5f9', padding: 4, borderRadius: 10 }}>
              {(['all', 'customer', 'admin'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFilterType(t)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: 'none',
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'capitalize',
                    background: filterType === t ? '#ffffff' : 'transparent',
                    color: filterType === t ? '#05424A' : '#64748b',
                    boxShadow: filterType === t ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  {t} App
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '12px 14px' }}>Time</th>
                  <th style={{ padding: '12px 14px' }}>Event</th>
                  <th style={{ padding: '12px 14px' }}>App Target</th>
                  <th style={{ padding: '12px 14px' }}>Device Model</th>
                  <th style={{ padding: '12px 14px' }}>OS / Version</th>
                  <th style={{ padding: '12px 14px' }}>Locality / IP</th>
                </tr>
              </thead>
              <tbody>
                {recentEvents.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '32px 14px', textAlign: 'center', color: '#94a3b8' }}>
                      No mobile events recorded yet. Click &quot;Test Ping&quot; or download the APK to see telemetry appear live!
                    </td>
                  </tr>
                ) : (
                  recentEvents.map((ev, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {new Date(ev.timestamp).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          day: '2-digit',
                          month: 'short',
                        })}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: 11.5,
                            fontWeight: 700,
                            background:
                              ev.eventType === 'APK Download'
                                ? 'rgba(234, 186, 56, 0.15)'
                                : ev.eventType === 'First App Install'
                                ? '#ecfdf5'
                                : '#e0f2fe',
                            color:
                              ev.eventType === 'APK Download'
                                ? '#b45309'
                                : ev.eventType === 'First App Install'
                                ? '#15803d'
                                : '#0369a1',
                          }}
                        >
                          {ev.eventType}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, textTransform: 'capitalize' }}>
                        {ev.appType} App
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: '#1e293b' }}>
                        {ev.deviceModel || 'Android Device'}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#64748b' }}>
                        {ev.osVersion || ev.os || 'Android'}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#64748b' }}>
                        {ev.city || 'Surat, Gujarat'} <span style={{ fontSize: 11, color: '#94a3b8' }}>({ev.ip})</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 3: DEVICES & ANDROID VERSIONS ─── */}
      {activeTab === 'devices' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
          {/* Top Phone Brands */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: 18,
              padding: '24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 16px -2px rgba(0,0,0,0.04)',
            }}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
              Top Phone Brands Detected
            </h3>
            {stats?.topDevices && stats.topDevices.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {stats.topDevices.map((item: any, idx: number) => {
                  const max = stats.topDevices[0]?.count || 1;
                  const pct = Math.round((item.count / max) * 100);
                  return (
                    <div key={idx}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, color: '#334155' }}>{item.name}</span>
                        <span style={{ color: '#64748b', fontWeight: 700 }}>{item.count} sessions</span>
                      </div>
                      <div style={{ height: 8, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: COLORS[idx % COLORS.length],
                            borderRadius: 99,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>
                No device sessions logged yet. Opens from installed phones will appear here.
              </p>
            )}
          </div>

          {/* Android Versions */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: 18,
              padding: '24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 16px -2px rgba(0,0,0,0.04)',
            }}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
              Android OS Breakdown
            </h3>
            {stats?.topOS && stats.topOS.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {stats.topOS.map((item: any, idx: number) => {
                  const max = stats.topOS[0]?.count || 1;
                  const pct = Math.round((item.count / max) * 100);
                  return (
                    <div key={idx}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, color: '#334155' }}>{item.name}</span>
                        <span style={{ color: '#64748b', fontWeight: 700 }}>{item.count} sessions</span>
                      </div>
                      <div style={{ height: 8, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: '#05424A',
                            borderRadius: 99,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>
                Android OS versions will automatically populate as customers use the APK.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 4: SHARE & QR CODES ─── */}
      {activeTab === 'qr' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
          {/* Customer App Download Card */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: 18,
              padding: '24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 16px -2px rgba(0,0,0,0.04)',
              textAlign: 'center',
            }}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
              Customer Mobile App (APK)
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>
              Let clients scan this QR code directly at your salon reception desk in Katargam.
            </p>

            <div
              style={{
                display: 'inline-block',
                padding: 12,
                borderRadius: 14,
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                marginBottom: 16,
              }}
            >
              {/* Dynamic QR code via Google Chart API */}
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=https://shreebeauty.studio/downloads/Shree-Beauty-Studio.apk"
                alt="Scan Customer APK"
                style={{ width: 180, height: 180, display: 'block' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
              <a
                href="/downloads/Shree-Beauty-Studio.apk"
                download="Shree-Beauty-Studio.apk"
                onClick={() => trackApkDownload('customer')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'linear-gradient(135deg, #05424A 0%, #032B30 100%)',
                  color: '#ffffff',
                  padding: '10px 18px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                <Download size={15} color="#EABA38" />
                <span>Download Customer APK</span>
              </a>
            </div>
          </div>

          {/* Admin Portal APK Card */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: 18,
              padding: '24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 16px -2px rgba(0,0,0,0.04)',
              textAlign: 'center',
            }}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
              Staff & Admin Portal App (APK)
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>
              For salon managers and billing operators to run the POS and appointment manager on Android tablets.
            </p>

            <div
              style={{
                display: 'inline-block',
                padding: 12,
                borderRadius: 14,
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                marginBottom: 16,
              }}
            >
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=https://shreebeauty.studio/downloads/Shree-Admin-Portal.apk"
                alt="Scan Admin APK"
                style={{ width: 180, height: 180, display: 'block' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
              <a
                href="/downloads/Shree-Admin-Portal.apk"
                download="Shree-Admin-Portal.apk"
                onClick={() => trackApkDownload('admin')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#ffffff',
                  padding: '10px 18px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                <Download size={15} color="#ffffff" />
                <span>Download Admin APK</span>
              </a>
            </div>
          </div>

          {/* Share on WhatsApp */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: 18,
              padding: '24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 16px -2px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
              1-Click Share Download Link
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
              Send the direct download link to clients on WhatsApp so they can install the app on their phone in 30 seconds.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                onClick={copyDownloadLink}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                {copiedLink ? <Check size={16} color="#16a34a" /> : <Copy size={16} />}
                <span>{copiedLink ? 'Link Copied!' : 'Copy Download Webpage Link'}</span>
              </button>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  '✨ Download the official Shree Beauty Studio Android App for quick bridal & salon appointments, exclusive packages, and booking reminders: https://shreebeauty.studio/download'
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  borderRadius: 10,
                  border: 'none',
                  background: '#25D366',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#ffffff',
                  textDecoration: 'none',
                }}
              >
                <Send size={15} />
                <span>Share App Link via WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
