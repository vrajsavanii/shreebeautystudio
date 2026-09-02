'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar, TrendingUp, AlertTriangle, Users, Package,
  Clock, ChevronRight, Star, Wallet, BarChart2, Zap, Award, ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';
import { useSalonStore } from '@/lib/store';
import { todayISO, money, fmtDate } from '@/lib/utils';
import { getAllUpcomingReminders } from '@/lib/reminders';
import StatCard from '@/components/ui/StatCard';
import Badge from '@/components/ui/Badge';
import { staggerContainer, fadeSlideUp } from '@/variants';
import { format, parseISO, subDays } from 'date-fns';

import TodayWishesBanner from '@/components/wishes/TodayWishesBanner';

export default function DashboardPage() {
  const { data } = useSalonStore();
  const today = todayISO();

  const stats = useMemo(() => {
    const appts = data?.appointments || [];
    const invs = data?.invoices || [];
    const bridals = data?.bridal || [];
    const custs = data?.customers || [];
    const invt = data?.inventory || [];

    const todayAppts = appts.filter(
      (a) => a.date === today && a.status !== 'Cancelled'
    );
    const todayInvoices = invs.filter((i) => i.date === today);
    const todayCollection = todayInvoices.reduce(
      (s, i) => s + Number(i.paid) + Number(i.advance), 0
    );
    const pendingAmount =
      invs.reduce((s, i) => s + Number(i.balance), 0) +
      bridals.reduce((s, b) => s + Number(b.balance), 0);
    const lowStock = invt.filter((i) => i.stock <= i.low).length;

    // 7-day revenue sparkline
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const dayTotal = invs.filter((inv) => inv.date === dateStr).reduce((s, inv) => s + Number(inv.total || 0), 0);
      return { date: format(d, 'EEE'), total: dayTotal };
    });
    const maxDayTotal = Math.max(...last7Days.map((d) => d.total), 1);

    // Month revenue
    const monthFrom = format(new Date(), 'yyyy-MM') + '-01';
    const monthRevenue = invs.filter((i) => i.date >= monthFrom).reduce((s, i) => s + Number(i.total || 0), 0);

    // Avg Ticket
    const avgTicket = invs.length > 0 ? invs.reduce((s, i) => s + Number(i.total || 0), 0) / invs.length : 0;

    // Expiring products (within 30 days)
    const expiringSoon = invt.filter((item) => {
      if (!item.expiry) return false;
      const diffDays = Math.ceil((new Date(item.expiry).getTime() - Date.now()) / (1000 * 3600 * 24));
      return diffDays >= 0 && diffDays <= 30;
    });

    // Staff occupancy today (have appointments)
    const staffToday = new Set(todayAppts.map((a) => a.staff).filter(Boolean));
    const allStaff = data?.staff || [];
    const staffOccupancy = allStaff.map((s) => ({
      ...s,
      busy: staffToday.has(s.name),
      todayAppts: todayAppts.filter((a) => a.staff === s.name).length,
    }));

    // Top 3 services this month
    const svcMap: Record<string, number> = {};
    invs.filter((i) => i.date >= monthFrom).forEach((inv) => {
      (inv.lines || []).filter((l) => l.type === 'S').forEach((l) => {
        svcMap[l.name] = (svcMap[l.name] || 0) + Number(l.qty || 1);
      });
    });
    const top3Services = Object.entries(svcMap).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, count]) => ({ name, count }));

    return {
      todayAppts: todayAppts.length,
      todayCollection,
      pendingAmount,
      totalCustomers: custs.length,
      lowStock,
      todayApptList: todayAppts.slice(0, 6),
      last7Days,
      maxDayTotal,
      monthRevenue,
      avgTicket,
      expiringSoon: expiringSoon.slice(0, 5),
      staffOccupancy,
      top3Services,
    };
  }, [data, today]);

  const reminders = useMemo(() => getAllUpcomingReminders(data || {}, 14).slice(0, 5), [data]);

  const recentInvoices = useMemo(
    () => [...(data?.invoices || [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
    [data?.invoices]
  );

  const lowStockItems = useMemo(
    () => (data?.inventory || []).filter((i) => i.stock <= i.low).slice(0, 5),
    [data?.inventory]
  );

  return (
    <div>
      {/* Today's Customer Celebrations & Wishes Banner */}
      <TodayWishesBanner />

      {/* Stats Grid */}
      <motion.div className="stats-grid" variants={staggerContainer} initial="hidden" animate="visible">
        <StatCard label="Today's Appointments" value={stats.todayAppts} icon={<Calendar size={20} />} iconBg="rgba(5,66,74,.1)" iconColor="#05424A" sub="non-cancelled" />
        <StatCard label="Today's Collection" value={stats.todayCollection} isMoney icon={<TrendingUp size={20} />} iconBg="rgba(35,163,109,.12)" iconColor="#23a36d" sub="paid + advance" />
        <StatCard label="Pending Amount" value={stats.pendingAmount} isMoney icon={<Clock size={20} />} iconBg="rgba(230,154,34,.12)" iconColor="#e69a22" sub="all invoices + bridal" />
        <StatCard label="Total Customers" value={stats.totalCustomers} icon={<Users size={20} />} iconBg="rgba(59,111,245,.1)" iconColor="#3b6ff5" sub="registered" />
        <StatCard label="Low Stock Items" value={stats.lowStock} icon={<Package size={20} />} iconBg="rgba(255,74,61,.1)" iconColor="#ff4a3d" alert sub="needs restocking" />
      </motion.div>

      {/* KPI Bar */}
      <motion.div variants={fadeSlideUp} initial="hidden" animate="visible" style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 0,
      }}>
        {[
          { label: 'Month Revenue', value: money(stats.monthRevenue), icon: <BarChart2 size={15} />, color: '#05424A' },
          { label: 'Avg Ticket Size', value: money(stats.avgTicket), icon: <Award size={15} />, color: '#c49821' },
          { label: 'Top Service', value: stats.top3Services[0]?.name || '—', icon: <Zap size={15} />, color: '#9333ea' },
          { label: '2nd Top Service', value: stats.top3Services[1]?.name || '—', icon: <Zap size={15} />, color: '#3b6ff5' },
          { label: '3rd Top Service', value: stats.top3Services[2]?.name || '—', icon: <Zap size={15} />, color: '#e69a22' },
        ].map((k) => (
          <div key={k.label} className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 0 }}>
            <div style={{ color: k.color }}>{k.icon}</div>
            <div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k.label}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: k.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>{k.value}</div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Row 1: 7-day sparkline + Staff Occupancy */}
      <div className="dash-grid">
        {/* 7-day Revenue Sparkline */}
        <motion.div className="card" variants={fadeSlideUp} initial="hidden" animate="visible">
          <div className="section-header" style={{ padding: '16px 20px' }}>
            <h2>Revenue (Last 7 Days)</h2>
            <Link href="/reports" style={{ fontSize: 13, color: 'var(--teal)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3, textDecoration: 'none' }}>
              Full Report <ChevronRight size={14} />
            </Link>
          </div>
          <div style={{ padding: '0 20px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Bar Chart */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80 }}>
              {stats.last7Days.map((d) => {
                const pct = stats.maxDayTotal > 0 ? (d.total / stats.maxDayTotal) : 0;
                const isToday = d.date === format(new Date(), 'EEE');
                return (
                  <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ fontSize: 9.5, color: 'var(--muted)', fontWeight: 600 }}>{d.total > 0 ? `₹${Math.round(d.total / 1000)}k` : ''}</div>
                    <div style={{
                      width: '100%', borderRadius: '4px 4px 0 0',
                      background: isToday ? 'var(--teal)' : 'var(--teal-subtle)',
                      border: isToday ? '2px solid var(--teal)' : 'none',
                      height: `${Math.max(pct * 60, d.total > 0 ? 8 : 2)}px`,
                      transition: 'height 0.5s',
                    }} />
                    <div style={{ fontSize: 10, fontWeight: isToday ? 800 : 500, color: isToday ? 'var(--teal)' : 'var(--muted)' }}>{d.date}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Staff Occupancy */}
        <motion.div className="card" variants={fadeSlideUp} initial="hidden" animate="visible">
          <div className="section-header" style={{ padding: '16px 20px' }}>
            <h2>Staff Today</h2>
            <Link href="/staff" style={{ fontSize: 13, color: 'var(--teal)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3, textDecoration: 'none' }}>
              Manage <ChevronRight size={14} />
            </Link>
          </div>
          <div style={{ padding: '0 20px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {stats.staffOccupancy.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 0' }}><Users size={32} /><h3>No staff added</h3></div>
            ) : (
              stats.staffOccupancy.map((s) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: s.busy ? 'var(--teal)' : 'var(--border)',
                    color: s.busy ? '#fff' : 'var(--muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: 14,
                  }}>
                    {s.name[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.role}</div>
                  </div>
                  <div style={{
                    fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
                    background: s.busy ? '#dcfce7' : '#f3f4f6',
                    color: s.busy ? '#15803d' : 'var(--muted)',
                  }}>
                    {s.busy ? `🟢 ${s.todayAppts} appt${s.todayAppts > 1 ? 's' : ''}` : '⚪ Free'}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Row 2: Today's Appointments + Upcoming Reminders */}
      <div className="dash-grid" style={{ marginTop: 0 }}>
        {/* Today's Appointments */}
        <motion.div className="card" variants={fadeSlideUp} initial="hidden" animate="visible">
          <div className="section-header" style={{ padding: '16px 20px' }}>
            <h2>Today's Appointments</h2>
            <Link href="/appointments" style={{ fontSize: 13, color: 'var(--teal)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3, textDecoration: 'none' }}>
              View all <ChevronRight size={14} />
            </Link>
          </div>
          {stats.todayApptList.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 20px' }}>
              <Calendar size={36} />
              <h3>No appointments today</h3>
              <p>Book a new appointment to get started</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Customer</th>
                    <th>Service</th>
                    <th>Staff</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <motion.tbody variants={staggerContainer} initial="hidden" animate="visible">
                  {stats.todayApptList.map((a) => (
                    <motion.tr key={a.id} variants={fadeSlideUp}>
                      <td style={{ fontWeight: 600, color: 'var(--teal)', whiteSpace: 'nowrap' }}>{a.time}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{a.customer}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{a.mobile}</div>
                      </td>
                      <td>{a.service}</td>
                      <td>{a.staff}</td>
                      <td><Badge status={a.status} /></td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Upcoming Reminders */}
        <motion.div className="card" variants={fadeSlideUp} initial="hidden" animate="visible" style={{ transitionDelay: '0.1s' }}>
          <div className="section-header" style={{ padding: '16px 20px' }}>
            <h2>Upcoming Reminders</h2>
            <Link href="/reminders" style={{ fontSize: 13, color: 'var(--teal)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3, textDecoration: 'none' }}>
              View all <ChevronRight size={14} />
            </Link>
          </div>
          <div style={{ padding: '0 20px 16px' }}>
            {reminders.length === 0 ? (
              <div className="empty-state" style={{ padding: '28px 0' }}>
                <Calendar size={32} />
                <h3>No upcoming reminders</h3>
              </div>
            ) : (
              reminders.map((r) => {
                let d: Date;
                try { d = parseISO(r.date); } catch { d = new Date(); }
                return (
                  <div key={r.date + r.title} className="reminder-item">
                    <div className="reminder-date-box">
                      <div className="reminder-date-day">{format(d, 'd')}</div>
                      <div className="reminder-date-month">{format(d, 'MMM')}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{r.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{r.text}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>

      {/* Row 3: Recent Invoices + Low Stock & Expiring Products */}
      <div className="dash-grid" style={{ marginTop: 0 }}>
        {/* Recent Invoices */}
        <motion.div className="card" variants={fadeSlideUp} initial="hidden" animate="visible">
          <div className="section-header" style={{ padding: '16px 20px' }}>
            <h2>Recent Invoices</h2>
            <Link href="/billing" style={{ fontSize: 13, color: 'var(--teal)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3, textDecoration: 'none' }}>
              View all <ChevronRight size={14} />
            </Link>
          </div>
          {recentInvoices.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 20px' }}>
              <TrendingUp size={36} />
              <h3>No invoices yet</h3>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Invoice</th><th>Customer</th><th>Total</th><th>Paid</th><th>Balance</th></tr>
                </thead>
                <motion.tbody variants={staggerContainer} initial="hidden" animate="visible">
                  {recentInvoices.map((inv) => (
                    <motion.tr key={inv.id} variants={fadeSlideUp}>
                      <td style={{ fontWeight: 600, color: 'var(--teal)' }}>{inv.no}</td>
                      <td>{inv.customer}</td>
                      <td>{money(inv.total)}</td>
                      <td style={{ color: 'var(--green)' }}>{money(Number(inv.paid) + Number(inv.advance))}</td>
                      <td>
                        {Number(inv.balance) > 0
                          ? <span style={{ color: 'var(--red)', fontWeight: 600 }}>{money(inv.balance)}</span>
                          : <Badge status="paid">Paid</Badge>}
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Low Stock + Expiring Products */}
        <motion.div className="card" variants={fadeSlideUp} initial="hidden" animate="visible">
          <div className="section-header" style={{ padding: '16px 20px' }}>
            <h2>Inventory Alerts</h2>
            <Link href="/inventory" style={{ fontSize: 13, color: 'var(--teal)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3, textDecoration: 'none' }}>
              View all <ChevronRight size={14} />
            </Link>
          </div>
          <div style={{ padding: '0 20px 16px' }}>
            {lowStockItems.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--red)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <AlertTriangle size={12} /> LOW STOCK
                </div>
                {lowStockItems.map((item) => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{item.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>Threshold: {item.low} units</div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: item.stock === 0 ? 'var(--red)' : '#e69a22' }}>
                      {item.stock}<span style={{ fontSize: 10, fontWeight: 500, marginLeft: 3 }}>left</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {stats.expiringSoon.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#e69a22', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <ShieldAlert size={12} /> EXPIRING SOON (&lt;30 days)
                </div>
                {stats.expiringSoon.map((item) => {
                  const diffDays = Math.ceil((new Date(item.expiry!).getTime() - Date.now()) / (1000 * 3600 * 24));
                  return (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>Exp: {fmtDate(item.expiry!)}</div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 12, color: diffDays <= 7 ? 'var(--red)' : '#e69a22', background: diffDays <= 7 ? '#fee2e2' : '#fef9c3', padding: '3px 8px', borderRadius: 6 }}>
                        {diffDays}d left
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {lowStockItems.length === 0 && stats.expiringSoon.length === 0 && (
              <div className="empty-state" style={{ padding: '28px 0' }}>
                <Package size={32} />
                <h3>All inventory is healthy</h3>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
