'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  Users,
  Calendar,
  Package,
  IndianRupee,
  Star,
  Award,
  PieChart as PieIcon,
  LineChart as LineIcon,
  CheckCircle,
  FileSpreadsheet,
  Coins,
  Scale,
  Sparkles,
  Printer,
} from 'lucide-react';
import { useSalonStore } from '@/lib/store';
import { money, fmtDate, todayISO } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { staggerContainer, fadeSlideUp } from '@/variants';
import { format, parseISO, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';

const COLORS = ['#05424A', '#EABA38', '#23a36d', '#3b6ff5', '#e69a22', '#ff4a3d', '#8b2563'];

type ReportTab = 'overview' | 'daily' | 'pnl' | 'gstr' | 'services' | 'inventory' | 'kpi';

export default function ReportsPage() {
  const { data } = useSalonStore();
  const today = new Date();
  const [from, setFrom] = useState(format(startOfMonth(today), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(endOfMonth(today), 'yyyy-MM-dd'));
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');

  const stats = useMemo(() => {
    const invoices = data?.invoices || [];
    const appointments = data?.appointments || [];
    const bridal = data?.bridal || [];
    const inventory = data?.inventory || [];
    const purchases = data?.purchases || [];
    const expenses = data?.expenses || [];

    const rangeInvoices = invoices.filter((i) => i.date >= from && i.date <= to);
    const rangeAppts = appointments.filter((a) => a.date >= from && a.date <= to);
    const rangePurchases = purchases.filter((p) => p.date >= from && p.date <= to);
    const rangeExpenses = expenses.filter((e) => e.date >= from && e.date <= to);

    const totalRevenue = rangeInvoices.reduce((s, i) => s + Number(i.total || 0), 0);
    const totalCollection = rangeInvoices.reduce((s, i) => s + Number(i.paid || 0) + Number(i.advance || 0), 0);
    const totalPending = rangeInvoices.reduce((s, i) => s + Number(i.balance || 0), 0);
    const totalDiscount = rangeInvoices.reduce((s, i) => s + Number(i.discount || 0), 0);

    // Product vs Service Revenue
    let productRevenue = 0;
    let serviceRevenue = 0;
    rangeInvoices.forEach((inv) => {
      (inv.lines || []).forEach((l) => {
        const lineTotal = Number(l.qty || 1) * Number(l.price || 0);
        if (l.type === 'P') productRevenue += lineTotal;
        else serviceRevenue += lineTotal;
      });
    });

    // Cost of Goods Sold (Purchases in period)
    const totalPurchasesCost = rangePurchases.reduce((s, p) => s + Number(p.subtotal || p.total || 0), 0);
    const totalOperatingExpenses = rangeExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);

    const grossProfit = totalRevenue - totalPurchasesCost;
    const netProfit = grossProfit - totalOperatingExpenses;

    // GSTR-1 Output GST & GSTR-2 Input Tax Credit (ITC)
    let totalOutputGst = 0;
    rangeInvoices.forEach((inv) => {
      // Estimated GST on 18% standard rate
      totalOutputGst += Number(inv.total || 0) * (18 / 118);
    });
    const taxableSales = totalRevenue - totalOutputGst;
    const cgstOutput = totalOutputGst / 2;
    const sgstOutput = totalOutputGst / 2;

    const totalInputGst = rangePurchases.reduce((s, p) => s + Number(p.gst || 0), 0);
    const taxablePurchases = rangePurchases.reduce((s, p) => s + Number(p.subtotal || 0), 0);
    const cgstInput = totalInputGst / 2;
    const sgstInput = totalInputGst / 2;

    const netGstPayable = Math.max(0, totalOutputGst - totalInputGst);

    // New customers
    const customerFirstVisit: Record<string, string> = {};
    invoices.forEach((i) => {
      if (!customerFirstVisit[i.mobile] || i.date < customerFirstVisit[i.mobile]) {
        customerFirstVisit[i.mobile] = i.date;
      }
    });
    const newCustomers = Object.values(customerFirstVisit).filter((d) => d >= from && d <= to).length;

    // Top service
    const serviceCounts: Record<string, { qty: number; revenue: number }> = {};
    rangeInvoices.forEach((inv) => {
      (inv.lines || []).forEach((l) => {
        if (l.type === 'S') {
          if (!serviceCounts[l.name]) serviceCounts[l.name] = { qty: 0, revenue: 0 };
          serviceCounts[l.name].qty += Number(l.qty || 1);
          serviceCounts[l.name].revenue += Number(l.qty || 1) * Number(l.price || 0);
        }
      });
    });
    const topServiceEntry = Object.entries(serviceCounts).sort((a, b) => b[1].qty - a[1].qty)[0];
    const topService = topServiceEntry ? topServiceEntry[0] : '—';

    // Top staff
    const staffCounts: Record<string, number> = {};
    rangeAppts.forEach((a) => {
      if (a.staff) staffCounts[a.staff] = (staffCounts[a.staff] || 0) + 1;
    });
    const topStaff = Object.entries(staffCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

    // Bridal revenue
    const bridalRevenue = bridal.reduce((s, b) => s + Number(b.package || 0), 0);

    // Inventory value
    const inventoryValue = inventory.reduce((s, i) => s + Number(i.stock || 0) * Number(i.buy || 0), 0);
    const inventoryRetail = inventory.reduce((s, i) => s + Number(i.stock || 0) * Number(i.sell || 0), 0);

    // Daily revenue chart
    let days: Date[] = [];
    try {
      days = eachDayOfInterval({ start: parseISO(from), end: parseISO(to) });
    } catch {
      days = [];
    }
    const dailyRevenue = days.map((d) => {
      const dateStr = format(d, 'yyyy-MM-dd');
      const dayTotal = rangeInvoices
        .filter((i) => i.date === dateStr)
        .reduce((s, i) => s + Number(i.total || 0), 0);
      return { date: format(d, 'dd MMM'), total: dayTotal };
    });

    const serviceData = Object.entries(serviceCounts).map(([name, d]) => ({
      name,
      value: d.qty,
      revenue: d.revenue,
    }));

    // === KPI Analytics ===
    // Average Ticket Size
    const avgTicketSize = rangeInvoices.length > 0 ? totalRevenue / rangeInvoices.length : 0;

    // Retail Attach Rate — invoices with at least 1 product line
    const invoicesWithProduct = rangeInvoices.filter((inv) => (inv.lines || []).some((l) => l.type === 'P')).length;
    const retailAttachRate = rangeInvoices.length > 0 ? (invoicesWithProduct / rangeInvoices.length) * 100 : 0;

    // Client Retention Rate (returned within 90 days)
    const allMobiles = Array.from(new Set(invoices.map((i) => i.mobile).filter(Boolean)));
    const retentionCutoff = new Date();
    retentionCutoff.setDate(retentionCutoff.getDate() - 90);
    const retentionCutoffStr = format(retentionCutoff, 'yyyy-MM-dd');
    const returningClients = allMobiles.filter((mob) => {
      const visits = invoices.filter((i) => i.mobile === mob).sort((a, b) => a.date.localeCompare(b.date));
      if (visits.length < 2) return false;
      const lastTwo = visits.slice(-2);
      return lastTwo[1].date >= retentionCutoffStr;
    });
    const clientRetentionRate = allMobiles.length > 0 ? (returningClients.length / allMobiles.length) * 100 : 0;

    // Top 10 Services by revenue
    const top10Services = Object.entries(serviceCounts)
      .map(([name, d]) => ({ name, qty: d.qty, revenue: d.revenue }))
      .sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    // Top 10 Customers by spend in period
    const customerSpend: Record<string, { name: string; mobile: string; spend: number; visits: number }> = {};
    rangeInvoices.forEach((inv) => {
      if (!customerSpend[inv.mobile || inv.customer]) {
        customerSpend[inv.mobile || inv.customer] = { name: inv.customer, mobile: inv.mobile, spend: 0, visits: 0 };
      }
      customerSpend[inv.mobile || inv.customer].spend += Number(inv.total || 0);
      customerSpend[inv.mobile || inv.customer].visits++;
    });
    const top10Customers = Object.values(customerSpend).sort((a, b) => b.spend - a.spend).slice(0, 10);

    // Staff performance from invoices (service lines with staff field)
    const staffRevMap: Record<string, { revenue: number; services: number }> = {};
    rangeInvoices.forEach((inv) => {
      (inv.lines || []).forEach((l) => {
        if (l.staff) {
          if (!staffRevMap[l.staff]) staffRevMap[l.staff] = { revenue: 0, services: 0 };
          staffRevMap[l.staff].revenue += Number(l.qty || 1) * Number(l.price || 0);
          staffRevMap[l.staff].services++;
        }
      });
    });
    const staffLeaderboard = Object.entries(staffRevMap)
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      totalRevenue,
      totalCollection,
      totalPending,
      totalDiscount,
      productRevenue,
      serviceRevenue,
      totalPurchasesCost,
      totalOperatingExpenses,
      grossProfit,
      netProfit,
      taxableSales,
      totalOutputGst,
      cgstOutput,
      sgstOutput,
      taxablePurchases,
      totalInputGst,
      cgstInput,
      sgstInput,
      netGstPayable,
      appointments: rangeAppts.length,
      newCustomers,
      topService,
      topStaff,
      bridalRevenue,
      inventoryValue,
      inventoryRetail,
      dailyRevenue,
      serviceData,
      // KPIs
      avgTicketSize,
      retailAttachRate,
      clientRetentionRate,
      top10Services,
      top10Customers,
      staffLeaderboard,
    };
  }, [data, from, to]);

  const cards = [
    { label: 'Total Sales Revenue', value: stats.totalRevenue, icon: <IndianRupee size={18} />, isMoney: true, color: '#05424A', bg: '#edf7f9' },
    { label: 'Net Salon Profit', value: stats.netProfit, icon: <TrendingUp size={18} />, isMoney: true, color: stats.netProfit >= 0 ? '#16a34a' : '#dc2626', bg: '#f0fdf4' },
    { label: 'Total Collected (Paid)', value: stats.totalCollection, icon: <CheckCircle size={18} />, isMoney: true, color: '#16a34a', bg: '#f0fdf4' },
    { label: 'Pending Client Dues', value: stats.totalPending, icon: <BarChart3 size={18} />, isMoney: true, color: '#ea580c', bg: '#fff7ed' },
    { label: 'Product Purchases Cost', value: stats.totalPurchasesCost, icon: <Package size={18} />, isMoney: true, color: '#2563eb', bg: '#eff6ff' },
    { label: 'Operating Expenses', value: stats.totalOperatingExpenses, icon: <Coins size={18} />, isMoney: true, color: '#dc2626', bg: '#fef2f2' },
    { label: 'Appointments Booked', value: stats.appointments, icon: <Calendar size={18} />, color: '#2563eb', bg: '#eff6ff' },
    { label: 'New Client Registrations', value: stats.newCustomers, icon: <Users size={18} />, color: '#9333ea', bg: '#faf5ff' },
    { label: 'Top Service Booked', value: stats.topService, icon: <Award size={18} />, color: '#05424A', bg: '#edf7f9' },
    { label: 'Top Staff Performer', value: stats.topStaff, icon: <Award size={18} />, color: '#c49821', bg: '#fdf2cc' },
  ];

  const tabs: { id: ReportTab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Financial Overview', icon: BarChart3 },
    { id: 'kpi', label: '📊 KPI Analytics', icon: Sparkles },
    { id: 'pnl', label: 'Profit & Loss (P&L)', icon: Scale },
    { id: 'gstr', label: 'GSTR-1 & GSTR-2 ITC', icon: FileSpreadsheet },
    { id: 'daily', label: 'Daily Revenue Trends', icon: LineIcon },
    { id: 'services', label: 'Service Sales Breakdown', icon: PieIcon },
    { id: 'inventory', label: 'Inventory Valuation', icon: Package },
  ];

  return (
    <div>
      {/* Date Range Filter */}
      <div className="toolbar" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label className="label" style={{ margin: 0, whiteSpace: 'nowrap', fontSize: 12 }}>From:</label>
            <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} style={{ width: 145, padding: '7px 10px' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label className="label" style={{ margin: 0, whiteSpace: 'nowrap', fontSize: 12 }}>To:</label>
            <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} style={{ width: 145, padding: '7px 10px' }} />
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>
          <Printer size={14} /> Print Report
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sub Tab Panels */}
      <AnimatePresence mode="wait">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div key="overview" variants={fadeSlideUp} initial="hidden" animate="visible" exit="exit">
            {/* KPI Cards Grid */}
            <motion.div
              className="stats-grid"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {cards.map((card) => (
                <motion.div
                  key={card.label}
                  className="stat-card"
                  variants={fadeSlideUp}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: 8,
                    background: card.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: card.color, marginBottom: 4,
                  }}>
                    {card.icon}
                  </div>
                  <div className="stat-card-label">{card.label}</div>
                  <div className="stat-card-value" style={{ fontSize: 20, color: card.color }}>
                    {card.isMoney ? money(Number(card.value)) : card.value}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}

        {/* KPI Analytics Tab */}
        {activeTab === 'kpi' && (
          <motion.div key="kpi" variants={fadeSlideUp} initial="hidden" animate="visible" exit="exit">
            {/* KPI Cards */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 16 }}>
              {[
                { label: 'Avg Ticket Size', value: money(stats.avgTicketSize), color: '#05424A', bg: '#edf7f9', icon: '🎫', sub: `${stats.appointments > 0 ? stats.appointments : (data?.invoices?.length || 0)} invoices` },
                { label: 'Client Retention Rate', value: `${stats.clientRetentionRate.toFixed(1)}%`, color: '#9333ea', bg: '#faf5ff', icon: '🔄', sub: '90-day return rate' },
                { label: 'Retail Attach Rate', value: `${stats.retailAttachRate.toFixed(1)}%`, color: '#2563eb', bg: '#eff6ff', icon: '📦', sub: 'Invoices with products' },
                { label: 'Service Revenue', value: money(stats.serviceRevenue), color: 'var(--teal)', bg: 'var(--teal-subtle)', icon: '💄', sub: 'This period' },
                { label: 'Product Revenue', value: money(stats.productRevenue), color: '#3b6ff5', bg: '#eff6ff', icon: '📦', sub: 'This period' },
                { label: 'New Clients', value: String(stats.newCustomers), color: '#16a34a', bg: '#f0fdf4', icon: '👤', sub: 'First-time visitors' },
              ].map((k) => (
                <motion.div key={k.label} className="stat-card" variants={fadeSlideUp}>
                  <div style={{ width: 38, height: 38, borderRadius: 8, background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 4 }}>{k.icon}</div>
                  <div className="stat-card-label">{k.label}</div>
                  <div className="stat-card-value" style={{ fontSize: 20, color: k.color }}>{k.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{k.sub}</div>
                </motion.div>
              ))}
            </div>

            {/* Top Services + Top Customers side by side */}
            <div className="dash-grid">
              <div className="card">
                <div className="section-header" style={{ padding: '14px 18px' }}><h2>🏆 Top 10 Services</h2></div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>#</th><th>Service</th><th>Count</th><th>Revenue</th></tr></thead>
                    <tbody>
                      {stats.top10Services.map((s, i) => (
                        <tr key={s.name}>
                          <td style={{ fontWeight: 800, color: i < 3 ? '#c49821' : 'var(--muted)' }}>{i + 1}</td>
                          <td style={{ fontWeight: 600 }}>{s.name}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--teal)' }}>{s.qty}</td>
                          <td style={{ color: 'var(--green)', fontWeight: 700 }}>{money(s.revenue)}</td>
                        </tr>
                      ))}
                      {stats.top10Services.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: 16 }}>No data in this period</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="card">
                <div className="section-header" style={{ padding: '14px 18px' }}><h2>👑 Top 10 Clients</h2></div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>#</th><th>Client</th><th>Visits</th><th>Spend</th></tr></thead>
                    <tbody>
                      {stats.top10Customers.map((c, i) => (
                        <tr key={c.mobile || c.name}>
                          <td style={{ fontWeight: 800, color: i < 3 ? '#c49821' : 'var(--muted)' }}>{i + 1}</td>
                          <td>
                            <div style={{ fontWeight: 700 }}>{c.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.mobile}</div>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--teal)' }}>{c.visits}</td>
                          <td style={{ color: 'var(--green)', fontWeight: 700 }}>{money(c.spend)}</td>
                        </tr>
                      ))}
                      {stats.top10Customers.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: 16 }}>No data in this period</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Staff Leaderboard */}
            {stats.staffLeaderboard.length > 0 && (
              <div className="card" style={{ marginTop: 0 }}>
                <div className="section-header" style={{ padding: '14px 18px' }}><h2>🏅 Staff Leaderboard (Service Lines)</h2></div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>#</th><th>Staff</th><th>Services</th><th>Revenue Generated</th></tr></thead>
                    <tbody>
                      {stats.staffLeaderboard.map((s, i) => (
                        <tr key={s.name}>
                          <td style={{ fontWeight: 800, color: i < 3 ? '#c49821' : 'var(--muted)' }}>{i + 1}</td>
                          <td style={{ fontWeight: 700 }}>{s.name}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--teal)' }}>{s.services}</td>
                          <td style={{ color: 'var(--green)', fontWeight: 700 }}>{money(s.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Profit & Loss (P&L) Statement Tab */}
        {activeTab === 'pnl' && (
          <motion.div key="pnl" variants={fadeSlideUp} initial="hidden" animate="visible" exit="exit">
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>⚖️ Profit & Loss Statement (Income & Expense)</h3>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
                    Financial statement for period {fmtDate(from)} to {fmtDate(to)}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>Net Salon Profit</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: stats.netProfit >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {money(stats.netProfit)}
                  </div>
                </div>
              </div>

              <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left' }}>Income & Revenue Streams</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '10px 14px' }}>💄 Salon Service Revenue</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>{money(stats.serviceRevenue)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '10px 14px' }}>📦 Cosmetic Retail Product Sales</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>{money(stats.productRevenue)}</td>
                    </tr>
                    <tr style={{ background: '#f0fdf4', fontWeight: 800 }}>
                      <td style={{ padding: '10px 14px', color: '#166534' }}>Total Gross Revenue (A)</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: '#15803d' }}>{money(stats.totalRevenue)}</td>
                    </tr>

                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left', paddingTop: 18 }}>Cost of Goods Sold (COGS)</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right', paddingTop: 18 }}>Amount (₹)</th>
                    </tr>
                    <tr>
                      <td style={{ padding: '10px 14px' }}>🛒 Vendor Product Purchases & Stock Refills</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: 'var(--red)' }}>−{money(stats.totalPurchasesCost)}</td>
                    </tr>
                    <tr style={{ background: '#fffbeb', fontWeight: 700 }}>
                      <td style={{ padding: '10px 14px' }}>Gross Salon Margin (A − B)</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>{money(stats.grossProfit)}</td>
                    </tr>

                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left', paddingTop: 18 }}>Operating Expenses</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right', paddingTop: 18 }}>Amount (₹)</th>
                    </tr>
                    <tr>
                      <td style={{ padding: '10px 14px' }}>🏢 Salon Operations (Rent, Utilities, Staff Tea, Laundry, Housekeeping)</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: 'var(--red)' }}>−{money(stats.totalOperatingExpenses)}</td>
                    </tr>
                    <tr style={{ background: stats.netProfit >= 0 ? '#dcfce7' : '#fee2e2', fontWeight: 900, fontSize: 15 }}>
                      <td style={{ padding: '14px', color: stats.netProfit >= 0 ? '#15803d' : '#b91c1c' }}>
                        🎉 NET SALON PROFIT / (LOSS)
                      </td>
                      <td style={{ padding: '14px', textAlign: 'right', color: stats.netProfit >= 0 ? '#15803d' : '#b91c1c' }}>
                        {money(stats.netProfit)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* GSTR-1 & GSTR-2 ITC Tab */}
        {activeTab === 'gstr' && (
          <motion.div key="gstr" variants={fadeSlideUp} initial="hidden" animate="visible" exit="exit">
            <div className="card" style={{ padding: 24 }}>
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>📋 GSTR Tax Summary & Input Tax Credit (ITC)</h3>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
                  Vyapar-compliant Goods & Services Tax liability breakdown for GST filing.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 22 }}>
                {/* GSTR-1 Output */}
                <div style={{ border: '1px solid #bfdbfe', borderRadius: 10, padding: 16, background: '#eff6ff' }}>
                  <h4 style={{ margin: '0 0 10px', color: '#1d4ed8' }}>GSTR-1: Outward Supplies (Sales)</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
                    <span>Taxable Turnover:</span>
                    <b>{money(stats.taxableSales)}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
                    <span>Central GST (CGST @ 9%):</span>
                    <b>{money(stats.cgstOutput)}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
                    <span>State GST (SGST @ 9%):</span>
                    <b>{money(stats.sgstOutput)}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', borderTop: '1px solid #bfdbfe', fontWeight: 800, color: '#1e40af' }}>
                    <span>Total Output GST Liability:</span>
                    <span>{money(stats.totalOutputGst)}</span>
                  </div>
                </div>

                {/* GSTR-2 Input */}
                <div style={{ border: '1px solid #bbf7d0', borderRadius: 10, padding: 16, background: '#f0fdf4' }}>
                  <h4 style={{ margin: '0 0 10px', color: '#15803d' }}>GSTR-2: Inward Supplies (Purchases ITC)</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
                    <span>Taxable Purchases:</span>
                    <b>{money(stats.taxablePurchases)}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
                    <span>Input CGST Credit:</span>
                    <b>{money(stats.cgstInput)}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
                    <span>Input SGST Credit:</span>
                    <b>{money(stats.sgstInput)}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', borderTop: '1px solid #bbf7d0', fontWeight: 800, color: '#166534' }}>
                    <span>Total Eligible Input Credit (ITC):</span>
                    <span>{money(stats.totalInputGst)}</span>
                  </div>
                </div>
              </div>

              {/* Net GST Payable Box */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1.5px solid var(--border)',
                  borderRadius: 12,
                  padding: 16,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>
                    Net GST Payable in Cash = (Output GST − Input Tax Credit)
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {money(stats.totalOutputGst)} − {money(stats.totalInputGst)}
                  </div>
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: stats.netGstPayable > 0 ? 'var(--teal)' : 'var(--green)' }}>
                  {money(stats.netGstPayable)}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Daily Revenue Trends Tab */}
        {activeTab === 'daily' && (
          <motion.div key="daily" variants={fadeSlideUp} initial="hidden" animate="visible" exit="exit">
            <div className="card" style={{ padding: 24 }}>
              <div className="card-head" style={{ padding: '0 0 16px', marginBottom: 18 }}>
                <h2>📈 Daily Revenue Timeline ({from} to {to})</h2>
              </div>
              {stats.dailyRevenue.filter((d) => d.total > 0).length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 0' }}>
                  <BarChart3 size={40} />
                  <h3>No revenue data in selected date range</h3>
                  <p>Invoices created within this date interval will populate this bar chart.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={stats.dailyRevenue}>
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']}
                      contentStyle={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="total" fill="#05424A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>
        )}

        {/* Service Breakdown Tab */}
        {activeTab === 'services' && (
          <motion.div key="services" variants={fadeSlideUp} initial="hidden" animate="visible" exit="exit">
            <div className="card" style={{ padding: 24 }}>
              <div className="card-head" style={{ padding: '0 0 16px', marginBottom: 18 }}>
                <h2>💄 Top Services by Booking Volume</h2>
              </div>
              {stats.serviceData.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 0' }}>
                  <PieIcon size={40} />
                  <h3>No service booking data in selected range</h3>
                  <p>Completed service invoices will populate this breakdown.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, alignItems: 'center' }}>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={stats.serviceData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={95}
                        innerRadius={45}
                        paddingAngle={3}
                      >
                        {stats.serviceData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any, name: any) => [`${v} appointments`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {stats.serviceData.map((s, idx) => (
                      <div key={s.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[idx % COLORS.length] }} />
                          <span style={{ fontWeight: 600 }}>{s.name}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                          <span style={{ color: 'var(--muted)' }}>{s.value} bookings</span>
                          <span style={{ fontWeight: 700, color: 'var(--teal)' }}>{money(s.revenue)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Inventory Valuation Tab */}
        {activeTab === 'inventory' && (
          <motion.div key="inventory" variants={fadeSlideUp} initial="hidden" animate="visible" exit="exit">
            <div className="card" style={{ padding: 24 }}>
              <div className="card-head" style={{ padding: '0 0 16px', marginBottom: 18 }}>
                <h2>📦 Live Product Inventory Valuation</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                <div style={{ background: '#f8fafc', padding: 18, borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Cost Valuation (Buy Price)</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--teal)', marginTop: 4 }}>{money(stats.inventoryValue)}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Actual money tied up in products</div>
                </div>
                <div style={{ background: '#f8fafc', padding: 18, borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Retail Valuation (Sell Price)</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#16a34a', marginTop: 4 }}>{money(stats.inventoryRetail)}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Potential revenue if 100% sold</div>
                </div>
                <div style={{ background: '#f8fafc', padding: 18, borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Projected Gross Inventory Profit</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#e69a22', marginTop: 4 }}>
                    {money(stats.inventoryRetail - stats.inventoryValue)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Retail Value − Cost Value</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
