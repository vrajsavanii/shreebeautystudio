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
  Pencil,
  ArrowDownLeft,
  ArrowUpRight,
  IndianRupee,
  BarChart3,
  ShoppingBag,
  CreditCard,
  Banknote,
  BadgeIndianRupee,
  CircleDollarSign,
  Activity,
  Eye,
  ChevronDown,
  Landmark,
} from 'lucide-react';
import { useSalonStore } from '@/lib/store';
import { scheduleSave } from '@/lib/sync';
import { uid, todayISO, money, fmtDate } from '@/lib/utils';
import { Expense } from '@/types/salon';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { staggerContainer, fadeSlideUp } from '@/variants';
import { useForm } from 'react-hook-form';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import Link from 'next/link';

type RojmelTab = 'dashboard' | 'all' | 'today' | 'categories' | 'daybook';

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

  const [activeTab, setActiveTab] = useState<RojmelTab>('dashboard');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bankExpanded, setBankExpanded] = useState(false);

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

  // ========== VYAPAR-STYLE DASHBOARD KPI CALCULATIONS ==========
  const vyaparStats = useMemo(() => {
    const monthStart = today.slice(0, 7) + '-01';

    // ---- TOTAL SALE (All-time) ----
    const totalSale = invoices.reduce((s, i) => s + Number(i.total || 0), 0);
    const monthSale = invoices
      .filter((i) => i.date >= monthStart)
      .reduce((s, i) => s + Number(i.total || 0), 0);
    const todaySale = invoices
      .filter((i) => i.date === today)
      .reduce((s, i) => s + Number(i.total || 0), 0);

    // ---- TOTAL PURCHASE (All-time) ----
    const totalPurchase = purchases.reduce((s, p) => s + Number(p.total || 0), 0);
    const monthPurchase = purchases
      .filter((p) => p.date >= monthStart)
      .reduce((s, p) => s + Number(p.total || 0), 0);

    // ---- TOTAL EXPENSES (All-time) ----
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const monthExpenses = expenses
      .filter((e) => e.date >= monthStart)
      .reduce((s, e) => s + Number(e.amount || 0), 0);
    const todayExpenses = expenses
      .filter((e) => e.date === today)
      .reduce((s, e) => s + Number(e.amount || 0), 0);

    // ---- TO COLLECT (Pending from Customers) ----
    const toCollect =
      invoices.reduce((s, i) => s + Number(i.balance || 0), 0) +
      bridals.reduce((s, b) => s + Number(b.balance || 0), 0);

    // ---- TO PAY (Pending to Suppliers) ----
    const toPay = purchases.reduce((s, p) => s + Number(p.balance || 0), 0);

    // ---- CASH IN HAND ----
    const cashInAll = invoices
      .filter((i) => i.mode === 'Cash' || i.splitPayment?.cash)
      .reduce((s, i) => {
        if (i.splitPayment?.cash) return s + Number(i.splitPayment.cash);
        return s + Number(i.paid || 0) + Number(i.advance || 0);
      }, 0);
    const cashInVouchers = vouchers
      .filter((v) => v.type === 'Payment-In' && v.mode === 'Cash')
      .reduce((s, v) => s + Number(v.amount || 0), 0);
    const cashOutExpenses = expenses
      .filter((e) => e.mode === 'Cash')
      .reduce((s, e) => s + Number(e.amount || 0), 0);
    const cashOutPurchases = purchases
      .filter((p) => p.mode === 'Cash')
      .reduce((s, p) => s + Number(p.paid || 0), 0);
    const cashOutVouchers = vouchers
      .filter((v) => v.type === 'Payment-Out' && v.mode === 'Cash')
      .reduce((s, v) => s + Number(v.amount || 0), 0);
    const cashInHand =
      cashInAll + cashInVouchers - cashOutExpenses - cashOutPurchases - cashOutVouchers;

    // ---- BANK BALANCE (All non-cash transactions) ----
    const isBankMode = (mode: string) => mode !== 'Cash';

    // Bank IN: non-cash sales
    const bankInSales = invoices.reduce((s, i) => {
      if (i.splitPayment?.upi) s += Number(i.splitPayment.upi);
      else if (i.splitPayment?.card) s += Number(i.splitPayment.card);
      else if (isBankMode(i.mode)) s += Number(i.paid || 0) + Number(i.advance || 0);
      return s;
    }, 0);
    const bankInVouchers = vouchers
      .filter((v) => v.type === 'Payment-In' && isBankMode(v.mode))
      .reduce((s, v) => s + Number(v.amount || 0), 0);

    // Bank OUT: non-cash expenses + purchases + vouchers
    const bankOutExpenses = expenses
      .filter((e) => isBankMode(e.mode))
      .reduce((s, e) => s + Number(e.amount || 0), 0);
    const bankOutPurchases = purchases
      .filter((p) => isBankMode(p.mode))
      .reduce((s, p) => s + Number(p.paid || 0), 0);
    const bankOutVouchers = vouchers
      .filter((v) => v.type === 'Payment-Out' && isBankMode(v.mode))
      .reduce((s, v) => s + Number(v.amount || 0), 0);

    const bankBalance = bankInSales + bankInVouchers - bankOutExpenses - bankOutPurchases - bankOutVouchers;

    // Per-mode breakdown for bank details
    const allModes = new Set<string>();
    invoices.forEach((i) => { if (isBankMode(i.mode)) allModes.add(i.mode); });
    expenses.forEach((e) => { if (isBankMode(e.mode)) allModes.add(e.mode); });
    purchases.forEach((p) => { if (isBankMode(p.mode)) allModes.add(p.mode); });
    vouchers.forEach((v) => { if (isBankMode(v.mode)) allModes.add(v.mode); });

    const bankModeBreakdown = Array.from(allModes).map((mode) => {
      const modeIn = invoices.reduce((s, i) => {
        if (i.mode === mode) return s + Number(i.paid || 0) + Number(i.advance || 0);
        return s;
      }, 0) + vouchers
        .filter((v) => v.type === 'Payment-In' && v.mode === mode)
        .reduce((s, v) => s + Number(v.amount || 0), 0);

      const modeOut = expenses
        .filter((e) => e.mode === mode)
        .reduce((s, e) => s + Number(e.amount || 0), 0)
        + purchases.filter((p) => p.mode === mode).reduce((s, p) => s + Number(p.paid || 0), 0)
        + vouchers.filter((v) => v.type === 'Payment-Out' && v.mode === mode).reduce((s, v) => s + Number(v.amount || 0), 0);

      return { mode, inflow: modeIn, outflow: modeOut, balance: modeIn - modeOut };
    }).sort((a, b) => b.balance - a.balance);

    // ---- PROFIT/LOSS (Month) ----
    const monthProfit = monthSale - monthPurchase - monthExpenses;

    // ---- 7-Day Sales Trend ----
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const dayTotal = invoices
        .filter((inv) => inv.date === dateStr)
        .reduce((s, inv) => s + Number(inv.total || 0), 0);
      const dayExp = expenses
        .filter((e) => e.date === dateStr)
        .reduce((s, e) => s + Number(e.amount || 0), 0);
      return { date: format(d, 'EEE'), dateStr, sale: dayTotal, expense: dayExp };
    });
    const maxBar = Math.max(...last7Days.map((d) => Math.max(d.sale, d.expense)), 1);

    // ---- RECENT TRANSACTIONS (last 10 mixed) ----
    const allTxns = [
      ...invoices.map((i) => ({
        id: i.id,
        date: i.date,
        type: 'Sale' as const,
        label: `${i.no} — ${i.customer}`,
        amount: Number(i.total || 0),
        mode: i.mode,
      })),
      ...purchases.map((p) => ({
        id: p.id,
        date: p.date,
        type: 'Purchase' as const,
        label: `${(p as any).purchaseNo || 'PO'} — ${p.supplier || 'Supplier'}`,
        amount: Number(p.total || 0),
        mode: p.mode,
      })),
      ...expenses.map((e) => ({
        id: e.id,
        date: e.date,
        type: 'Expense' as const,
        label: `${e.expenseNo} — ${e.category}`,
        amount: Number(e.amount || 0),
        mode: e.mode,
      })),
    ]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 12);

    // ---- TODAY'S COLLECTION ----
    const todayCollection = invoices
      .filter((i) => i.date === today)
      .reduce((s, i) => s + Number(i.paid || 0) + Number(i.advance || 0), 0);

    // ---- TOTAL INVOICES COUNT ----
    const totalInvoices = invoices.length;
    const monthInvoices = invoices.filter((i) => i.date >= monthStart).length;

    return {
      totalSale,
      monthSale,
      todaySale,
      totalPurchase,
      monthPurchase,
      totalExpenses,
      monthExpenses,
      todayExpenses,
      toCollect,
      toPay,
      cashInHand,
      monthProfit,
      bankBalance,
      bankModeBreakdown,
      last7Days,
      maxBar,
      allTxns,
      todayCollection,
      totalInvoices,
      monthInvoices,
      expenseCount: expenses.length,
    };
  }, [invoices, purchases, expenses, vouchers, bridals, today]);

  // Old KPI Metrics (for expense tabs)
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
      {/* Sub Tabs */}
      <div className="tabs" style={{ marginBottom: 0 }}>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <BarChart3 size={14} />
          <span>📊 Vyapar Dashboard</span>
        </button>

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
          <span>📖 Daily Rojmel</span>
        </button>
      </div>

      {/* Tab Panels */}
      <AnimatePresence mode="wait">
        {/* ======== VYAPAR-STYLE DASHBOARD TAB ======== */}
        {activeTab === 'dashboard' && (
          <motion.div key="vyapar-dash" variants={fadeSlideUp} initial="hidden" animate="visible" exit="exit">

            {/* ---- ROW 1: Big 5 KPI Cards (Vyapar style) ---- */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 14,
              marginTop: 16,
            }}>
              {/* Total Sale */}
              <div style={{
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                borderRadius: 14,
                padding: '20px 18px',
                color: '#fff',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(5,150,105,0.25)',
              }}>
                <div style={{ position: 'absolute', top: -8, right: -8, opacity: 0.12, fontSize: 80 }}>💰</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <TrendingUp size={18} />
                  <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>Total Sale</span>
                </div>
                <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1.1 }}>{money(vyaparStats.totalSale)}</div>
                <div style={{ fontSize: 11, marginTop: 8, opacity: 0.85, display: 'flex', justifyContent: 'space-between' }}>
                  <span>This Month: {money(vyaparStats.monthSale)}</span>
                  <span>{vyaparStats.totalInvoices} bills</span>
                </div>
              </div>

              {/* Total Purchase */}
              <div style={{
                background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
                borderRadius: 14,
                padding: '20px 18px',
                color: '#fff',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(220,38,38,0.25)',
              }}>
                <div style={{ position: 'absolute', top: -8, right: -8, opacity: 0.12, fontSize: 80 }}>🛒</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <ShoppingBag size={18} />
                  <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>Total Purchase</span>
                </div>
                <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1.1 }}>{money(vyaparStats.totalPurchase)}</div>
                <div style={{ fontSize: 11, marginTop: 8, opacity: 0.85 }}>
                  This Month: {money(vyaparStats.monthPurchase)}
                </div>
              </div>

              {/* Total Expenses */}
              <div style={{
                background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
                borderRadius: 14,
                padding: '20px 18px',
                color: '#fff',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(217,119,6,0.25)',
              }}>
                <div style={{ position: 'absolute', top: -8, right: -8, opacity: 0.12, fontSize: 80 }}>💸</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Wallet size={18} />
                  <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>Salon Expenses</span>
                </div>
                <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1.1 }}>{money(vyaparStats.totalExpenses)}</div>
                <div style={{ fontSize: 11, marginTop: 8, opacity: 0.85, display: 'flex', justifyContent: 'space-between' }}>
                  <span>This Month: {money(vyaparStats.monthExpenses)}</span>
                  <span>{vyaparStats.expenseCount} vouchers</span>
                </div>
              </div>

              {/* To Collect */}
              <div style={{
                background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                borderRadius: 14,
                padding: '20px 18px',
                color: '#fff',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(37,99,235,0.25)',
              }}>
                <div style={{ position: 'absolute', top: -8, right: -8, opacity: 0.12, fontSize: 80 }}>📥</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <ArrowDownLeft size={18} />
                  <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>To Collect (લેવાના)</span>
                </div>
                <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1.1 }}>{money(vyaparStats.toCollect)}</div>
                <div style={{ fontSize: 11, marginTop: 8, opacity: 0.85 }}>
                  Pending from Customers + Bridal
                </div>
              </div>

              {/* To Pay */}
              <div style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
                borderRadius: 14,
                padding: '20px 18px',
                color: '#fff',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(124,58,237,0.25)',
              }}>
                <div style={{ position: 'absolute', top: -8, right: -8, opacity: 0.12, fontSize: 80 }}>📤</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <ArrowUpRight size={18} />
                  <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>To Pay (આપવાના)</span>
                </div>
                <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1.1 }}>{money(vyaparStats.toPay)}</div>
                <div style={{ fontSize: 11, marginTop: 8, opacity: 0.85 }}>
                  Pending to Suppliers
                </div>
              </div>
            </div>

            {/* ---- ROW 2: Cash in Hand + Month Profit/Loss + Today Summary ---- */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 14,
              marginTop: 14,
            }}>
              {/* Cash in Hand */}
              <div className="card" style={{
                padding: '18px 20px',
                borderLeft: `4px solid ${vyaparStats.cashInHand >= 0 ? '#059669' : '#dc2626'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: vyaparStats.cashInHand >= 0 ? '#dcfce7' : '#fee2e2',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: vyaparStats.cashInHand >= 0 ? '#059669' : '#dc2626',
                  }}>
                    <Banknote size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Cash in Hand (રોકડ)</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: vyaparStats.cashInHand >= 0 ? '#059669' : '#dc2626' }}>
                      {money(vyaparStats.cashInHand)}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>All-time Cash Received − Cash Paid</div>
              </div>

              {/* Bank Balance */}
              <div className="card" style={{
                padding: '18px 20px',
                borderLeft: `4px solid ${vyaparStats.bankBalance >= 0 ? '#2563eb' : '#dc2626'}`,
                cursor: 'pointer',
                transition: 'box-shadow 0.2s',
              }}
                onClick={() => setBankExpanded(!bankExpanded)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: '#dbeafe',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#2563eb',
                  }}>
                    <Landmark size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Bank Balance (બેંક બેલેન્સ)</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: vyaparStats.bankBalance >= 0 ? '#2563eb' : '#dc2626' }}>
                      {money(vyaparStats.bankBalance)}
                    </div>
                  </div>
                  <ChevronDown size={18} style={{
                    color: 'var(--muted)',
                    transition: 'transform 0.3s',
                    transform: bankExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>UPI + Card + Bank (Cash સિવાય) — click to expand</div>

                {/* Expandable Bank Mode Breakdown */}
                {bankExpanded && (
                  <div style={{
                    marginTop: 14,
                    borderTop: '1px solid var(--border)',
                    paddingTop: 12,
                  }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)', marginBottom: 10 }}>
                      🏦 Mode-wise Breakdown
                    </div>
                    {vyaparStats.bankModeBreakdown.length === 0 ? (
                      <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: 10 }}>
                        No non-cash transactions yet
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {vyaparStats.bankModeBreakdown.map((mb) => (
                          <div key={mb.mode} style={{
                            background: '#f8fafc',
                            border: '1px solid var(--border)',
                            borderRadius: 10,
                            padding: '10px 14px',
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>
                                {mb.mode === 'GPay UPI' ? '📱 ' : mb.mode === 'PhonePe UPI' ? '📲 ' : mb.mode === 'Card' ? '💳 ' : '🏦 '}
                                {mb.mode}
                              </span>
                              <span style={{
                                fontSize: 14, fontWeight: 900,
                                color: mb.balance >= 0 ? '#2563eb' : '#dc2626',
                              }}>
                                {money(mb.balance)}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--muted)' }}>
                              <span>↓ In: <span style={{ color: '#059669', fontWeight: 700 }}>{money(mb.inflow)}</span></span>
                              <span>↑ Out: <span style={{ color: '#dc2626', fontWeight: 700 }}>{money(mb.outflow)}</span></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Today's Collection */}
              <div className="card" style={{
                padding: '18px 20px',
                borderLeft: '4px solid var(--teal)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: 'rgba(5,66,74,.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--teal)',
                  }}>
                    <IndianRupee size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Today Collection (આજનું)</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--teal)' }}>
                      {money(vyaparStats.todayCollection)}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Sale: {money(vyaparStats.todaySale)}</span>
                  <span>Expense: {money(vyaparStats.todayExpenses)}</span>
                </div>
              </div>
            </div>


            {/* ---- ROW 4: 7-Day Bar Chart + Recent Transactions ---- */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 14,
              marginTop: 14,
            }}>
              {/* 7-Day Sale vs Expense Bar Chart */}
              <div className="card" style={{ padding: '18px 20px' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
                  📈 Last 7 Days — Sale vs Expense
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 16 }}>
                  Daily comparison of revenue earned vs expenses spent
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 11 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: '#059669' }} />
                    <span style={{ fontWeight: 600 }}>Sale (વેચાણ)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: '#ef4444' }} />
                    <span style={{ fontWeight: 600 }}>Expense (ખર્ચ)</span>
                  </div>
                </div>

                {/* Bars */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 130 }}>
                  {vyaparStats.last7Days.map((d) => {
                    const salePct = vyaparStats.maxBar > 0 ? (d.sale / vyaparStats.maxBar) : 0;
                    const expPct = vyaparStats.maxBar > 0 ? (d.expense / vyaparStats.maxBar) : 0;
                    const isToday = d.dateStr === today;
                    return (
                      <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                        <div style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 600 }}>
                          {d.sale > 0 ? `₹${Math.round(d.sale / 1000)}k` : ''}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, width: '100%', justifyContent: 'center' }}>
                          {/* Sale bar */}
                          <div style={{
                            width: '40%',
                            borderRadius: '3px 3px 0 0',
                            background: isToday ? '#059669' : '#86efac',
                            height: `${Math.max(salePct * 90, d.sale > 0 ? 6 : 2)}px`,
                            transition: 'height 0.5s',
                          }} />
                          {/* Expense bar */}
                          <div style={{
                            width: '40%',
                            borderRadius: '3px 3px 0 0',
                            background: isToday ? '#ef4444' : '#fca5a5',
                            height: `${Math.max(expPct * 90, d.expense > 0 ? 6 : 2)}px`,
                            transition: 'height 0.5s',
                          }} />
                        </div>
                        <div style={{
                          fontSize: 10,
                          fontWeight: isToday ? 800 : 500,
                          color: isToday ? 'var(--teal)' : 'var(--muted)',
                          borderTop: '1px solid var(--border)',
                          paddingTop: 3,
                          width: '100%',
                          textAlign: 'center',
                        }}>{d.date}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="card" style={{ padding: '18px 20px', maxHeight: 360, overflow: 'auto' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
                  🔄 Recent Transactions (તાજેતરના વ્યવહારો)
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 14 }}>
                  Latest sales, purchases & expenses
                </div>

                {vyaparStats.allTxns.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 32, color: 'var(--muted)', fontSize: 13 }}>
                    No transactions yet
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {vyaparStats.allTxns.map((txn) => (
                      <div key={txn.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '9px 0',
                        borderBottom: '1px solid #f1f5f9',
                      }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14,
                          background:
                            txn.type === 'Sale' ? '#dcfce7' :
                            txn.type === 'Purchase' ? '#fee2e2' : '#fef3c7',
                        }}>
                          {txn.type === 'Sale' ? '🧾' : txn.type === 'Purchase' ? '🛒' : '💸'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 12, fontWeight: 700, color: 'var(--text)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>{txn.label}</div>
                          <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                            {fmtDate(txn.date)} · {txn.mode}
                          </div>
                        </div>
                        <div style={{
                          fontSize: 13, fontWeight: 800,
                          color:
                            txn.type === 'Sale' ? '#059669' :
                            txn.type === 'Purchase' ? '#dc2626' : '#d97706',
                        }}>
                          {txn.type === 'Sale' ? '+' : '−'}{money(txn.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ---- ROW 5: Month P&L Breakdown Card ---- */}
            <div className="card" style={{ padding: '20px', marginTop: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Receipt size={16} style={{ color: 'var(--teal)' }} />
                Monthly Profit & Loss Summary (મહિનાનો હિસાબ)
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr auto 1fr auto 1fr',
                alignItems: 'center',
                gap: 0,
              }}>
                {/* Sale */}
                <div style={{ textAlign: 'center', padding: '12px 8px' }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>Sale (વેચાણ)</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#059669' }}>{money(vyaparStats.monthSale)}</div>
                  <div style={{ fontSize: 10, color: '#059669', marginTop: 4 }}>{vyaparStats.monthInvoices} bills</div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 300, color: 'var(--muted)', padding: '0 4px' }}>−</div>

                {/* Purchase */}
                <div style={{ textAlign: 'center', padding: '12px 8px' }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>Purchase (ખરીદી)</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#dc2626' }}>{money(vyaparStats.monthPurchase)}</div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 300, color: 'var(--muted)', padding: '0 4px' }}>−</div>

                {/* Expense */}
                <div style={{ textAlign: 'center', padding: '12px 8px' }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>Expense (ખર્ચ)</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#d97706' }}>{money(vyaparStats.monthExpenses)}</div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 300, color: 'var(--muted)', padding: '0 4px' }}>=</div>

                {/* Net Profit */}
                <div style={{
                  textAlign: 'center',
                  padding: '14px 12px',
                  borderRadius: 12,
                  background: vyaparStats.monthProfit >= 0
                    ? 'linear-gradient(135deg, #dcfce7, #bbf7d0)'
                    : 'linear-gradient(135deg, #fee2e2, #fecaca)',
                }}>
                  <div style={{
                    fontSize: 10.5, fontWeight: 700,
                    color: vyaparStats.monthProfit >= 0 ? '#166534' : '#991b1b',
                    textTransform: 'uppercase', marginBottom: 6,
                  }}>
                    {vyaparStats.monthProfit >= 0 ? 'Net Profit (નફો)' : 'Net Loss (ખોટ)'}
                  </div>
                  <div style={{
                    fontSize: 22, fontWeight: 900,
                    color: vyaparStats.monthProfit >= 0 ? '#059669' : '#dc2626',
                  }}>
                    {money(Math.abs(vyaparStats.monthProfit))}
                  </div>
                </div>
              </div>
            </div>

          </motion.div>
        )}

        {/* ======== EXPENSES TABS (all / today) ======== */}
        {(activeTab === 'all' || activeTab === 'today') && (
          <motion.div key="expenses-list" variants={fadeSlideUp} initial="hidden" animate="visible" exit="exit">
            {/* Top Metrics Cards */}
            <motion.div
              className="stats-grid"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              style={{ marginTop: 16 }}
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
            <div className="card" style={{ padding: 24, marginTop: 16 }}>
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
            <div className="card" style={{ padding: 24, marginTop: 16 }}>
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
