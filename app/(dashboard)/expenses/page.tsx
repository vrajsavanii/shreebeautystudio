'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  Plus,
  Search,
  Calendar,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Receipt,
  BookOpen,
  PieChart as PieIcon,
  Trash2,
  CheckCircle2,
  Sparkles,
  Pencil,
} from 'lucide-react';
import { useSalonStore } from '@/lib/store';
import { scheduleSave } from '@/lib/sync';
import { uid, todayISO, money, fmtDate } from '@/lib/utils';
import { Expense } from '@/types/salon';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { staggerContainer, fadeSlideUp } from '@/variants';
import { useForm } from 'react-hook-form';

type ExpenseTab = 'all' | 'today' | 'categories' | 'daybook';

const EXPENSE_CATEGORIES = [
  'Rent',
  'Electricity & Utilities',
  'Staff Tea & Refreshments',
  'Laundry & Towels',
  'Housekeeping & Cleaning',
  'Marketing & Ads',
  'Salon Maintenance',
  'Staff Bonus / Incentives',
  'Other Expense',
] as const;

export default function ExpensesPage() {
  const { data, updateData } = useSalonStore();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<ExpenseTab>('all');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Day Book Selected Date
  const [daybookDate, setDaybookDate] = useState(todayISO());

  const today = todayISO();
  const expenses = data?.expenses || [];
  const invoices = data?.invoices || [];
  const purchases = data?.purchases || [];
  const vouchers = data?.vouchers || [];
  const bridals = data?.bridal || [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Expense>({
    defaultValues: {
      id: '',
      expenseNo: '',
      date: today,
      category: 'Staff Tea & Refreshments',
      amount: 0,
      mode: 'Cash',
      paidTo: '',
      notes: '',
    },
  });

  // KPI Metrics
  const stats = useMemo(() => {
    const totalExp = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const todayExp = expenses
      .filter((e) => e.date === today)
      .reduce((s, e) => s + Number(e.amount || 0), 0);
    const monthExp = expenses
      .filter((e) => e.date.startsWith(today.slice(0, 7)))
      .reduce((s, e) => s + Number(e.amount || 0), 0);

    return { totalExp, todayExp, monthExp, count: expenses.length };
  }, [expenses, today]);

  // Category Breakdown
  const categoryStats = useMemo(() => {
    const map: Record<string, number> = {};
    EXPENSE_CATEGORIES.forEach((c) => (map[c] = 0));
    expenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + Number(e.amount || 0);
    });
    return Object.entries(map)
      .map(([cat, total]) => ({ cat, total }))
      .sort((a, b) => b.total - a.total);
  }, [expenses]);

  // Filtered Expenses
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return expenses
      .filter((e) => {
        const matchesSearch =
          !q ||
          e.category.toLowerCase().includes(q) ||
          (e.paidTo && e.paidTo.toLowerCase().includes(q)) ||
          (e.notes && e.notes.toLowerCase().includes(q)) ||
          e.expenseNo.toLowerCase().includes(q);

        if (!matchesSearch) return false;

        if (activeTab === 'today') return e.date === today;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [expenses, search, activeTab, today]);

  // Day Book Calculation for selected Date
  const daybook = useMemo(() => {
    const d = daybookDate;

    // Cash IN
    const dayInvoices = invoices.filter((i) => i.date === d);
    const posCashIn = dayInvoices.reduce((s, i) => {
      if (i.splitPayment?.cash) return s + Number(i.splitPayment.cash);
      if (i.mode === 'Cash') return s + Number(i.paid || 0) + Number(i.advance || 0);
      return s;
    }, 0);

    const posUpiIn = dayInvoices.reduce((s, i) => {
      if (i.splitPayment?.upi) return s + Number(i.splitPayment.upi);
      if (i.mode.includes('UPI') || i.mode.includes('GPay') || i.mode.includes('PhonePe'))
        return s + Number(i.paid || 0) + Number(i.advance || 0);
      return s;
    }, 0);

    const dayPaymentInVouchers = vouchers.filter((v) => v.date === d && v.type === 'Payment-In');
    const voucherCashIn = dayPaymentInVouchers
      .filter((v) => v.mode === 'Cash')
      .reduce((s, v) => s + Number(v.amount || 0), 0);

    const bridalAdvanceIn = bridals
      .filter((b) => b.date === d && b.advanceMode === 'Cash')
      .reduce((s, b) => s + Number(b.advance || 0), 0);

    const totalCashIn = posCashIn + voucherCashIn + bridalAdvanceIn;
    const totalAllIn =
      dayInvoices.reduce((s, i) => s + Number(i.paid || 0) + Number(i.advance || 0), 0) +
      dayPaymentInVouchers.reduce((s, v) => s + Number(v.amount || 0), 0);

    // Cash OUT
    const dayExpenses = expenses.filter((e) => e.date === d);
    const expenseCashOut = dayExpenses
      .filter((e) => e.mode === 'Cash')
      .reduce((s, e) => s + Number(e.amount || 0), 0);

    const dayPurchases = purchases.filter((p) => p.date === d);
    const purchaseCashOut = dayPurchases
      .filter((p) => p.mode === 'Cash')
      .reduce((s, p) => s + Number(p.paid || 0), 0);

    const dayPaymentOutVouchers = vouchers.filter((v) => v.date === d && v.type === 'Payment-Out');
    const voucherCashOut = dayPaymentOutVouchers
      .filter((v) => v.mode === 'Cash')
      .reduce((s, v) => s + Number(v.amount || 0), 0);

    const totalCashOut = expenseCashOut + purchaseCashOut + voucherCashOut;
    const netCashInHand = totalCashIn - totalCashOut;

    return {
      posCashIn,
      posUpiIn,
      totalCashIn,
      totalAllIn,
      expenseCashOut,
      purchaseCashOut,
      voucherCashOut,
      totalCashOut,
      netCashInHand,
      dayInvoices,
      dayExpenses,
      dayPurchases,
      dayPaymentInVouchers,
      dayPaymentOutVouchers,
    };
  }, [daybookDate, invoices, expenses, purchases, vouchers, bridals]);

  const openNew = () => {
    setEditId(null);
    reset({
      id: '',
      expenseNo: '',
      date: today,
      category: 'Staff Tea & Refreshments',
      amount: '' as any,
      mode: 'Cash',
      paidTo: '',
      notes: '',
    });
    setModalOpen(true);
  };

  const openEdit = (e: Expense) => {
    setEditId(e.id);
    reset(e);
    setModalOpen(true);
  };

  const onSubmit = (form: Expense) => {
    const numAmt = Number(form.amount || 0);
    if (numAmt <= 0) {
      toast('Please enter a valid expense amount.', 'error');
      return;
    }

    if (editId) {
      updateData((d) => ({
        ...d,
        expenses: (d.expenses || []).map((e) =>
          e.id === editId
            ? {
                ...e,
                date: form.date,
                category: form.category,
                amount: numAmt,
                mode: form.mode,
                paidTo: form.paidTo?.trim(),
                notes: form.notes?.trim(),
              }
            : e
        ),
      }));
      scheduleSave();
      toast(`Expense updated successfully!`);
      setEditId(null);
      setModalOpen(false);
      return;
    }

    const expenseSeq = data?.expenseSeq || 1001;
    const expNo = `EXP-${expenseSeq}`;

    const newExpense: Expense = {
      ...form,
      id: uid(),
      expenseNo: expNo,
      amount: numAmt,
      paidTo: form.paidTo?.trim(),
      notes: form.notes?.trim(),
    };

    updateData((d) => ({
      ...d,
      expenses: [newExpense, ...(d.expenses || [])],
      expenseSeq: expenseSeq + 1,
    }));

    scheduleSave();
    toast(`✅ Expense ${expNo} of ₹${numAmt} recorded!`);
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    updateData((d) => ({
      ...d,
      expenses: (d.expenses || []).filter((e) => e.id !== id),
    }));
    scheduleSave();
    toast('Expense removed.');
    setDeleteId(null);
  };

  return (
    <div>
      {/* Top Metrics Cards */}
      <motion.div
        className="stats-grid"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="stat-card" variants={fadeSlideUp}>
          <div className="stat-card-icon" style={{ background: 'rgba(217,48,37,.1)', color: '#d93025' }}>
            <Wallet size={20} />
          </div>
          <div className="stat-card-label">Today's Salon Expenses</div>
          <div className="stat-card-value" style={{ color: 'var(--red)' }}>
            {money(stats.todayExp)}
          </div>
          <div className="stat-card-sub">Recorded on {fmtDate(today)}</div>
        </motion.div>

        <motion.div className="stat-card" variants={fadeSlideUp}>
          <div className="stat-card-icon" style={{ background: 'rgba(230,154,34,.12)', color: '#e69a22' }}>
            <Calendar size={20} />
          </div>
          <div className="stat-card-label">This Month's Expenses</div>
          <div className="stat-card-value">{money(stats.monthExp)}</div>
          <div className="stat-card-sub">Salon Operations & Utilities</div>
        </motion.div>

        <motion.div className="stat-card" variants={fadeSlideUp}>
          <div className="stat-card-icon" style={{ background: 'rgba(5,66,74,.1)', color: '#05424A' }}>
            <Receipt size={20} />
          </div>
          <div className="stat-card-label">Total Recorded Expenses</div>
          <div className="stat-card-value">{money(stats.totalExp)}</div>
          <div className="stat-card-sub">{stats.count} Expense Vouchers</div>
        </motion.div>

        <motion.div className="stat-card" variants={fadeSlideUp}>
          <div className="stat-card-icon" style={{ background: 'rgba(35,163,109,.12)', color: '#23a36d' }}>
            <BookOpen size={20} />
          </div>
          <div className="stat-card-label">Today's Net Cash in Hand</div>
          <div
            className="stat-card-value"
            style={{ color: daybook.netCashInHand >= 0 ? 'var(--green)' : 'var(--red)' }}
          >
            {money(daybook.netCashInHand)}
          </div>
          <div className="stat-card-sub">Cash In − Cash Out</div>
        </motion.div>
      </motion.div>

      {/* Main Toolbar */}
      <div className="toolbar" style={{ justifyContent: 'space-between', marginTop: 16 }}>
        <div className="search-wrap" style={{ flex: 1, maxWidth: 360 }}>
          <Search size={15} className="search-icon" />
          <input
            type="search"
            className="input"
            placeholder="Search category, paid to, notes, voucher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <motion.button className="btn btn-primary" onClick={openNew} whileTap={{ scale: 0.97 }}>
          <Plus size={15} /> Record New Expense
        </motion.button>
      </div>

      {/* Sub Tabs */}
      <div className="tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <Wallet size={14} />
          <span>All Expenses</span>
          <span className="tab-badge">{expenses.length}</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'today' ? 'active' : ''}`}
          onClick={() => setActiveTab('today')}
        >
          <Calendar size={14} />
          <span>Today's Expenses</span>
          <span className="tab-badge">{expenses.filter((e) => e.date === today).length}</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          <PieIcon size={14} />
          <span>Category Breakdown</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'daybook' ? 'active' : ''}`}
          onClick={() => setActiveTab('daybook')}
        >
          <BookOpen size={14} />
          <span>📖 Daily Rojmel (Cashbook)</span>
        </button>
      </div>

      {/* Tab Panels */}
      <AnimatePresence mode="wait">
        {/* Tab 1 & 2: Expenses Table */}
        {(activeTab === 'all' || activeTab === 'today') && (
          <motion.div key="expenses-list" variants={fadeSlideUp} initial="hidden" animate="visible" exit="exit">
            <div className="card">
              {filtered.length === 0 ? (
                <div className="empty-state">
                  <Wallet size={48} />
                  <h3>{search ? 'No matching expenses found' : 'No expenses recorded yet'}</h3>
                  <p>Track rent, tea/coffee, electricity bills, laundry, and daily salon costs.</p>
                  {!search && (
                    <button className="btn btn-primary btn-sm" onClick={openNew} style={{ marginTop: 8 }}>
                      <Plus size={14} /> Record First Expense
                    </button>
                  )}
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Voucher & Date</th>
                        <th>Category & Paid To</th>
                        <th>Amount & Mode</th>
                        <th>Notes / Description</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <motion.tbody variants={staggerContainer} initial="hidden" animate="visible">
                      {filtered.map((e) => (
                        <motion.tr key={e.id} variants={fadeSlideUp}>
                          <td>
                            <div style={{ fontWeight: 700, color: 'var(--teal)', fontSize: 13 }}>
                              {e.expenseNo}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                              {fmtDate(e.date)}
                            </div>
                          </td>
                          <td>
                            <span className="badge badge-teal" style={{ fontSize: 11 }}>
                              {e.category}
                            </span>
                            {e.paidTo && (
                              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                                Paid to: {e.paidTo}
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ fontWeight: 800, color: 'var(--red)', fontSize: 13.5 }}>
                              {money(e.amount)}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                              via {e.mode}
                            </div>
                          </td>
                          <td style={{ color: 'var(--muted)', fontSize: 12, maxWidth: 200 }}>
                            {e.notes || '—'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                              <button
                                className="btn-icon edit"
                                onClick={() => openEdit(e)}
                                title="Edit Expense"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                className="btn-icon danger"
                                onClick={() => setDeleteId(e.id)}
                                title="Delete Expense"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </motion.tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Tab 3: Category Breakdown */}
        {activeTab === 'categories' && (
          <motion.div key="categories" variants={fadeSlideUp} initial="hidden" animate="visible" exit="exit">
            <div className="card" style={{ padding: 24 }}>
              <div style={{ marginBottom: 18 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>📊 Expense Category Analysis</h3>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
                  Total expenditure grouped by operational category.
                </p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 14,
                }}
              >
                {categoryStats.map((c) => {
                  const pct = stats.totalExp > 0 ? ((c.total / stats.totalExp) * 100).toFixed(1) : '0';
                  return (
                    <div
                      key={c.cat}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        padding: '16px 18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text)' }}>{c.cat}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, background: '#e2e8f0', padding: '2px 7px', borderRadius: 99 }}>
                          {pct}%
                        </span>
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: c.total > 0 ? 'var(--red)' : 'var(--muted)' }}>
                        {money(c.total)}
                      </div>
                      <div style={{ height: 6, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: 'var(--teal)',
                            borderRadius: 99,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab 4: Daily Day Book */}
        {activeTab === 'daybook' && (
          <motion.div key="daybook" variants={fadeSlideUp} initial="hidden" animate="visible" exit="exit">
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>📖 Daily Rojmel (Cashbook / Day Book)</h3>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
                    Comprehensive Rojmel audit of Cash In vs Cash Out for selected day.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 700 }}>Select Date:</label>
                  <input
                    type="date"
                    className="input"
                    value={daybookDate}
                    onChange={(e) => setDaybookDate(e.target.value)}
                    style={{ width: 150, padding: '6px 10px' }}
                  />
                </div>
              </div>

              {/* Day Book 3-Column Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 22 }}>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', marginBottom: 4 }}>
                    Total Cash Inflow (₹)
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#15803d' }}>
                    {money(daybook.totalCashIn)}
                  </div>
                  <div style={{ fontSize: 11, color: '#166534', marginTop: 4 }}>
                    POS Cash ({money(daybook.posCashIn)}) + Vouchers ({money(daybook.totalCashIn - daybook.posCashIn)})
                  </div>
                </div>

                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#991b1b', marginBottom: 4 }}>
                    Total Cash Outflow (₹)
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#b91c1c' }}>
                    {money(daybook.totalCashOut)}
                  </div>
                  <div style={{ fontSize: 11, color: '#991b1b', marginTop: 4 }}>
                    Expenses ({money(daybook.expenseCashOut)}) + Purchases ({money(daybook.purchaseCashOut)}) + Vendor Pay ({money(daybook.voucherCashOut)})
                  </div>
                </div>

                <div style={{ background: '#f8fafc', border: '1.5px solid var(--border)', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                    Net Cash Balance in Drawer (₹)
                  </div>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 800,
                      color: daybook.netCashInHand >= 0 ? 'var(--green)' : 'var(--red)',
                    }}
                  >
                    {money(daybook.netCashInHand)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                    For {fmtDate(daybookDate)}
                  </div>
                </div>
              </div>

              {/* Day Book Invoices and Expenses Timeline */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                {/* Cash In Table */}
                <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: 14, color: 'var(--green)' }}>
                    🟢 Cash Inflows ({daybook.dayInvoices.length} Bills)
                  </h4>
                  {daybook.dayInvoices.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--muted)', padding: 12, textAlign: 'center' }}>
                      No bills generated on this date.
                    </div>
                  ) : (
                    <div style={{ fontSize: 12 }}>
                      {daybook.dayInvoices.map((inv) => (
                        <div
                          key={inv.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '6px 0',
                            borderBottom: '1px solid #f1f5f9',
                          }}
                        >
                          <span>
                            <b>{inv.no}</b> ({inv.customer})
                          </span>
                          <span style={{ fontWeight: 700, color: 'var(--green)' }}>
                            {money(inv.paid)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cash Out Table */}
                <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: 14, color: 'var(--red)' }}>
                    🔴 Cash Outflows ({daybook.dayExpenses.length} Expenses)
                  </h4>
                  {daybook.dayExpenses.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--muted)', padding: 12, textAlign: 'center' }}>
                      No expenses recorded on this date.
                    </div>
                  ) : (
                    <div style={{ fontSize: 12 }}>
                      {daybook.dayExpenses.map((exp) => (
                        <div
                          key={exp.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '6px 0',
                            borderBottom: '1px solid #f1f5f9',
                          }}
                        >
                          <span>
                            <b>{exp.category}</b> {exp.paidTo ? `(${exp.paidTo})` : ''}
                          </span>
                          <span style={{ fontWeight: 700, color: 'var(--red)' }}>
                            −{money(exp.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Record Expense Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditId(null);
        }}
        title={
          editId
            ? `✎ Edit Expense — ${data?.expenses?.find((e) => e.id === editId)?.expenseNo || ''}`
            : '💸 Record Salon Expense'
        }
        footer={
          <>
            <button
              className="btn btn-ghost"
              onClick={() => {
                setModalOpen(false);
                setEditId(null);
              }}
            >
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSubmit(onSubmit)}>
              {editId ? 'Update Expense' : 'Save Expense'}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-group">
            <label className="label">Expense Date *</label>
            <input type="date" className="input" {...register('date', { required: true })} />
          </div>

          <div className="form-group">
            <label className="label">Expense Category *</label>
            <select className="input" {...register('category')}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="label">Amount Paid (₹) *</label>
            <input
              type="number"
              min={1}
              step="0.01"
              className={`input ${errors.amount ? 'error' : ''}`}
              placeholder="₹ Expense amount (e.g. 450)"
              {...register('amount', { required: 'Amount is required' })}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="label">Payment Mode</label>
            <select className="input" {...register('mode')}>
              {(data?.settings?.payments || ['Cash', 'GPay UPI', 'PhonePe UPI', 'Card', 'Bank']).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="label">Paid To / Recipient</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Building Landlord, Milkman, Tea Stall, Housekeeper"
              {...register('paidTo')}
            />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="label">Notes / Description</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Electricity bill for July / Fresh towels laundry"
              {...register('notes')}
            />
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <Modal
          isOpen={!!deleteId}
          onClose={() => setDeleteId(null)}
          title="Delete Expense Record?"
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteId)}>Delete</button>
            </>
          }
        >
          <p>Are you sure you want to delete this expense record?</p>
        </Modal>
      )}
    </div>
  );
}
