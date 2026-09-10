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
  ChevronDown,
  ChevronUp,
  Landmark,
  Phone,
  User,
  ArrowRightLeft,
  Building2,
  Sparkles,
  Clock,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';
import { useSalonStore } from '@/lib/store';
import { scheduleSave } from '@/lib/sync';
import { uid, todayISO, money, fmtDate } from '@/lib/utils';
import { Expense, BankAccount, AccountTransfer, PaymentVoucher, Invoice } from '@/types/salon';
import Modal from '@/components/ui/Modal';
import InvoiceReceiptModal from '@/components/billing/InvoiceReceiptModal';
import { useToast } from '@/components/ui/Toast';
import { staggerContainer, fadeSlideUp } from '@/variants';
import { useForm } from 'react-hook-form';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import Link from 'next/link';

type RojmelTab = 'dashboard' | 'payment-in' | 'all' | 'today' | 'categories' | 'daybook' | 'banks';

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
  const [paymentInSearch, setPaymentInSearch] = useState('');
  const [paymentInModeFilter, setPaymentInModeFilter] = useState('All');
  const [paymentInTypeFilter, setPaymentInTypeFilter] = useState('All');
  const [deleteVoucherId, setDeleteVoucherId] = useState<string | null>(null);
  const [selectPendingModalOpen, setSelectPendingModalOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bankExpanded, setBankExpanded] = useState(false);
  const [toCollectExpanded, setToCollectExpanded] = useState(false);
  const [toCollectTab, setToCollectTab] = useState<'all' | 'invoice' | 'bridal' | 'appointment'>('all');
  const [toCollectSearch, setToCollectSearch] = useState('');
  const [toPayExpanded, setToPayExpanded] = useState(false);

  // Bank Account Modal State
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [editBankId, setEditBankId] = useState<string | null>(null);
  const [bankForm, setBankForm] = useState<Partial<BankAccount>>({ name: '', accountNo: '', ifsc: '', branch: '', upiId: '', openingBalance: 0 });
  const [deleteBankId, setDeleteBankId] = useState<string | null>(null);

  // Transfer Modal State
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferForm, setTransferForm] = useState<{ from: string; to: string; amount: number | ''; date: string; notes: string }>({ from: 'cash', to: '', amount: '', date: todayISO(), notes: '' });
  const [deleteTransferId, setDeleteTransferId] = useState<string | null>(null);

  // Day Book Selected Date
  const [daybookDate, setDaybookDate] = useState(todayISO());

  // Payment In (Customer, Bridal & Appointment Collections) Modal State
  const [paymentInModalOpen, setPaymentInModalOpen] = useState(false);
  const [paymentInItem, setPaymentInItem] = useState<{
    id: string;
    type: 'Invoice' | 'Bridal' | 'Appointment';
    no: string;
    name: string;
    mobile: string;
    date: string;
    total: number;
    paid: number;
    balance: number;
  } | null>(null);
  const [paymentInAmount, setPaymentInAmount] = useState<number | ''>('');
  const [paymentInMode, setPaymentInMode] = useState<string>('Cash');
  const [paymentInDate, setPaymentInDate] = useState<string>(todayISO());
  const [paymentInNotes, setPaymentInNotes] = useState<string>('');

  // Payment In Unified Edit & Delete State
  const [editPaymentEntry, setEditPaymentEntry] = useState<any>(null);
  const [editEntryAmount, setEditEntryAmount] = useState<number | ''>('');
  const [editEntryMode, setEditEntryMode] = useState<string>('Cash');
  const [editEntryDate, setEditEntryDate] = useState<string>(todayISO());
  const [editEntryNotes, setEditEntryNotes] = useState<string>('');
  const [editEntryPartyName, setEditEntryPartyName] = useState<string>('');
  const [editEntryPartyMobile, setEditEntryPartyMobile] = useState<string>('');
  const [deletePaymentEntry, setDeletePaymentEntry] = useState<any>(null);
  const [receiptModalInv, setReceiptModalInv] = useState<Invoice | null>(null);

  // Payment Out (Supplier Payments) Modal State
  const [paymentOutModalOpen, setPaymentOutModalOpen] = useState(false);
  const [paymentOutItem, setPaymentOutItem] = useState<{
    id: string;
    no: string;
    supplier: string;
    date: string;
    total: number;
    paid: number;
    balance: number;
  } | null>(null);
  const [paymentOutAmount, setPaymentOutAmount] = useState<number | ''>('');
  const [paymentOutMode, setPaymentOutMode] = useState<string>('Cash');
  const [paymentOutDate, setPaymentOutDate] = useState<string>(todayISO());
  const [paymentOutNotes, setPaymentOutNotes] = useState<string>('');

  const today = todayISO();
  const expenses = data?.expenses || [];
  const invoices = data?.invoices || [];
  const purchases = data?.purchases || [];
  const vouchers = data?.vouchers || [];
  const bridals = data?.bridal || [];
  const appointments = data?.appointments || [];
  const bankAccounts = data?.bankAccounts || [];
  const accountTransfers = data?.accountTransfers || [];

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

    // Set of bridal booking IDs already converted to invoices
    const billedBridalIds = new Set(invoices.map((i) => i.bridalBookingId).filter(Boolean));

    // ---- 1. INVOICES / BILLS BALANCE (બિલ બન્યા પછીના બાકી) ----
    const invoicesPendingTotal = invoices.reduce((s, i) => {
      const paidAmt = Number(i.paid || 0) + Number(i.advance || 0);
      const bal = Math.max(Number(i.balance || 0), Number(i.total || 0) - paidAmt);
      return s + Math.max(0, bal);
    }, 0);

    // ---- 2. BRIDAL BOOKINGS BALANCE (બ્રાઇડલ બુકિંગના બાકી) ----
    const bridalPendingTotal = bridals
      .filter((b) => b.status !== 'Cancelled' && !billedBridalIds.has(b.id))
      .reduce((s, b) => {
        const bal = Math.max(Number(b.balance || 0), Number(b.package || 0) - Number(b.advance || 0));
        return s + Math.max(0, bal);
      }, 0);

    // ---- 3. APPOINTMENTS BALANCE / ADVANCE (અપોઇન્ટમેન્ટ બુકિંગના બાકી) ----
    const appointmentPendingTotal = appointments
      .filter((a) => a.status !== 'Cancelled' && !a.invoiceId && a.workStatus !== 'Billed')
      .reduce((s, a) => {
        const price = Number(a.price || 0);
        const adv = Number(a.advance || 0);
        const bal = Math.max(0, price - adv);
        return s + bal;
      }, 0);

    // ---- TOTAL TO COLLECT (Pending from Invoices + Bridal + Appointments) ----
    const toCollect = invoicesPendingTotal + bridalPendingTotal + appointmentPendingTotal;

    // ---- TO PAY (Pending to Suppliers / Purchases) ----
    const toPay = purchases.reduce((s, p) => {
      const bal = Math.max(Number(p.balance || 0), Number(p.total || 0) - Number(p.paid || 0));
      return s + Math.max(0, bal);
    }, 0);

    // Helper to check if invoice actually has non-zero split payment amounts
    const hasSplitAmounts = (i: (typeof invoices)[0]) => {
      if (!i.splitPayment) return false;
      return (
        Number(i.splitPayment.cash || 0) > 0 ||
        Number(i.splitPayment.upi || 0) > 0 ||
        Number(i.splitPayment.card || 0) > 0 ||
        Number(i.splitPayment.wallet || 0) > 0
      );
    };

    // Mapped Payment-In vouchers per invoice to prevent double-counting
    const invoiceVouchersTotal: Record<string, number> = {};
    vouchers
      .filter((v) => v.type === 'Payment-In')
      .forEach((v) => {
        if (v.partyId) {
          invoiceVouchersTotal[v.partyId] = (invoiceVouchersTotal[v.partyId] || 0) + Number(v.amount || 0);
        }
      });

    // Helper to determine the advance payment mode for an invoice
    const getInvoiceAdvanceMode = (i: (typeof invoices)[0]) => {
      if (i.advanceMode) return i.advanceMode;
      if (i.appointmentId) {
        const appt = appointments.find((a) => a.id === i.appointmentId);
        if (appt?.advanceMode) return appt.advanceMode;
      }
      if (i.bridalBookingId) {
        const b = bridals.find((x) => x.id === i.bridalBookingId);
        if ((b as any)?.advanceAccount || b?.advanceMode) return (b as any)?.advanceAccount || b?.advanceMode;
      }
      return 'Cash'; // default advance mode in salon
    };

    // ---- CASH IN HAND ----
    const cashInAll = invoices.reduce((s, i) => {
      let cashTotal = 0;

      // 1. Advance portion (if advance was received in Cash)
      const advMode = getInvoiceAdvanceMode(i);
      if (Number(i.advance || 0) > 0 && (advMode === 'Cash' || !advMode)) {
        cashTotal += Number(i.advance || 0);
      }

      // 2. Direct bill payment portion (paid during invoicing)
      if (hasSplitAmounts(i)) {
        cashTotal += Number(i.splitPayment?.cash || 0);
      } else if (i.mode === 'Cash') {
        const vPaid = invoiceVouchersTotal[i.id] || 0;
        const directPaid = Math.max(0, Number(i.paid || 0) - vPaid);
        cashTotal += directPaid;
      }

      return s + cashTotal;
    }, 0);
    const cashInVouchers = vouchers
      .filter((v) => v.type === 'Payment-In' && v.mode === 'Cash')
      .reduce((s, v) => s + Number(v.amount || 0), 0);
    const apptCashAdv = appointments
      .filter((a) => !a.invoiceId && a.workStatus !== 'Billed' && Number(a.advance || 0) > 0 && (a.advanceMode === 'Cash' || !a.advanceMode))
      .reduce((s, a) => s + Number(a.advance || 0), 0);
    const bridalCashAdv = bridals
      .filter((b) => Number(b.advance || 0) > 0 && (b.advanceMode === 'Cash' || !b.advanceMode))
      .reduce((s, b) => s + Number(b.advance || 0), 0);

    // Cash Transfers In (e.g. Bank to Cash withdrawal)
    const cashTransfersIn = accountTransfers
      .filter((t) => t.to?.toLowerCase() === 'cash' || t.toName?.toLowerCase() === 'cash')
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    const cashOutExpenses = expenses
      .filter((e) => e.mode === 'Cash')
      .reduce((s, e) => s + Number(e.amount || 0), 0);
    const cashOutPurchases = purchases
      .filter((p) => p.mode === 'Cash')
      .reduce((s, p) => s + Number(p.paid || 0), 0);
    const cashOutVouchers = vouchers
      .filter((v) => v.type === 'Payment-Out' && v.mode === 'Cash')
      .reduce((s, v) => s + Number(v.amount || 0), 0);

    // Cash Transfers Out (e.g. Cash to Bank deposit)
    const cashTransfersOut = accountTransfers
      .filter((t) => t.from?.toLowerCase() === 'cash' || t.fromName?.toLowerCase() === 'cash')
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    const cashInHand =
      cashInAll +
      cashInVouchers +
      apptCashAdv +
      bridalCashAdv +
      cashTransfersIn -
      cashOutExpenses -
      cashOutPurchases -
      cashOutVouchers -
      cashTransfersOut;

    // ---- BANK BALANCE (All non-cash transactions) ----
    const isBankMode = (mode: string) => mode !== 'Cash' && mode !== 'Split Payment';

    // Build per-mode totals in a single pass for accuracy
    const bankIn: Record<string, number> = {};
    const bankOut: Record<string, number> = {};

    // 0. Bank Opening Balances
    bankAccounts.forEach((b) => {
      const openBal = Number(b.openingBalance || 0);
      if (openBal > 0) {
        bankIn[b.name] = (bankIn[b.name] || 0) + openBal;
      }
    });

    // 1. Invoice IN: handle non-cash advances, split payments, and non-cash direct bill payments
    invoices.forEach((i) => {
      // A. Advance received via Bank / UPI
      const advMode = getInvoiceAdvanceMode(i);
      if (Number(i.advance || 0) > 0 && isBankMode(advMode)) {
        bankIn[advMode] = (bankIn[advMode] || 0) + Number(i.advance || 0);
      }

      // B. Direct bill payment made during invoicing
      if (hasSplitAmounts(i)) {
        if (Number(i.splitPayment?.upi || 0) > 0) {
          const upiMode =
            i.splitPayment?.upiMode ||
            (i.mode.includes('UPI') || i.mode.includes('GPay') || i.mode.includes('PhonePe')
              ? i.mode
              : 'GPay UPI');
          bankIn[upiMode] = (bankIn[upiMode] || 0) + Number(i.splitPayment?.upi || 0);
        }
        if (Number(i.splitPayment?.card || 0) > 0) {
          bankIn['Card'] = (bankIn['Card'] || 0) + Number(i.splitPayment?.card || 0);
        }
        if (Number(i.splitPayment?.wallet || 0) > 0) {
          bankIn['Wallet'] = (bankIn['Wallet'] || 0) + Number(i.splitPayment?.wallet || 0);
        }
      } else if (isBankMode(i.mode)) {
        const vPaid = invoiceVouchersTotal[i.id] || 0;
        const directPaid = Math.max(0, Number(i.paid || 0) - vPaid);
        bankIn[i.mode] = (bankIn[i.mode] || 0) + directPaid;
      }
    });

    // 2. Voucher IN (non-cash)
    vouchers.filter((v) => v.type === 'Payment-In' && isBankMode(v.mode)).forEach((v) => {
      bankIn[v.mode] = (bankIn[v.mode] || 0) + Number(v.amount || 0);
    });

    // 3. Appointment Advances IN (non-cash)
    appointments
      .filter((a) => !a.invoiceId && a.workStatus !== 'Billed' && Number(a.advance || 0) > 0 && isBankMode(a.advanceMode || ''))
      .forEach((a) => {
        const mode = a.advanceMode || 'GPay UPI';
        bankIn[mode] = (bankIn[mode] || 0) + Number(a.advance || 0);
      });

    // 4. Bridal Advances IN (non-cash)
    bridals
      .filter((b) => Number(b.advance || 0) > 0 && isBankMode(b.advanceMode || ''))
      .forEach((b) => {
        const mode = b.advanceMode || 'GPay UPI';
        bankIn[mode] = (bankIn[mode] || 0) + Number(b.advance || 0);
      });

    // 5. Expense OUT (non-cash)
    expenses.filter((e) => isBankMode(e.mode)).forEach((e) => {
      bankOut[e.mode] = (bankOut[e.mode] || 0) + Number(e.amount || 0);
    });

    // 6. Purchase OUT (non-cash)
    purchases.filter((p) => isBankMode(p.mode)).forEach((p) => {
      bankOut[p.mode] = (bankOut[p.mode] || 0) + Number(p.paid || 0);
    });

    // 7. Voucher OUT (non-cash)
    vouchers.filter((v) => v.type === 'Payment-Out' && isBankMode(v.mode)).forEach((v) => {
      bankOut[v.mode] = (bankOut[v.mode] || 0) + Number(v.amount || 0);
    });

    // 8. Account Transfers (Cash ↔ Bank / Bank ↔ Bank)
    accountTransfers.forEach((t) => {
      const amt = Number(t.amount || 0);
      if (amt <= 0) return;
      // Transfer TO a bank account
      if (t.to?.toLowerCase() !== 'cash' && t.toName?.toLowerCase() !== 'cash') {
        const toKey = t.toName || t.to;
        bankIn[toKey] = (bankIn[toKey] || 0) + amt;
      }
      // Transfer FROM a bank account
      if (t.from?.toLowerCase() !== 'cash' && t.fromName?.toLowerCase() !== 'cash') {
        const fromKey = t.fromName || t.from;
        bankOut[fromKey] = (bankOut[fromKey] || 0) + amt;
      }
    });

    // Total bank balance
    const totalBankIn = Object.values(bankIn).reduce((s, v) => s + v, 0);
    const totalBankOut = Object.values(bankOut).reduce((s, v) => s + v, 0);
    const bankBalance = totalBankIn - totalBankOut;

    // Per-mode breakdown (include all configured bank accounts)
    const allBankModes = new Set([
      ...Object.keys(bankIn),
      ...Object.keys(bankOut),
      ...bankAccounts.map((b) => b.name),
    ]);
    const bankModeBreakdown = Array.from(allBankModes)
      .map((mode) => {
        const inflow = bankIn[mode] || 0;
        const outflow = bankOut[mode] || 0;
        return { mode, inflow, outflow, balance: inflow - outflow };
      })
      .sort((a, b) => b.balance - a.balance);

    // ---- PROFIT/LOSS (Month) ----
    const monthProfit = monthSale - monthPurchase - monthExpenses;

    // ---- 7-Day Sales Trend ----
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const dayTotal = invoices
        .filter((inv) => inv.date === dateStr)
        .reduce((s, inv) => s + Number(inv.total || 0), 0);
      const dayApptAdv = appointments
        .filter((a) => a.date === dateStr && !a.invoiceId && a.workStatus !== 'Billed' && Number(a.advance || 0) > 0)
        .reduce((s, a) => s + Number(a.advance || 0), 0);
      const dayBridalAdv = bridals
        .filter((b) => (b.date === dateStr || b.weddingDate === dateStr) && !billedBridalIds.has(b.id) && Number(b.advance || 0) > 0)
        .reduce((s, b) => s + Number(b.advance || 0), 0);
      const dayExp = expenses
        .filter((e) => e.date === dateStr)
        .reduce((s, e) => s + Number(e.amount || 0), 0);
      return { date: format(d, 'EEE'), dateStr, sale: dayTotal + dayApptAdv + dayBridalAdv, expense: dayExp };
    });
    const maxBar = Math.max(...last7Days.map((d) => Math.max(d.sale, d.expense)), 1);

    // ---- RECENT TRANSACTIONS (last 12 mixed) ----
    const allTxns = [
      ...invoices.map((i) => ({
        id: i.id,
        date: i.date,
        type: 'Sale' as const,
        label: `${i.no} — ${i.customer}`,
        amount: Number(i.total || 0),
        mode: i.mode,
      })),
      ...appointments
        .filter((a) => !a.invoiceId && a.workStatus !== 'Billed' && Number(a.advance || 0) > 0)
        .map((a) => ({
          id: `appt-adv-${a.id}`,
          date: a.date,
          type: 'Sale' as const,
          label: `📅 Appt Advance — ${a.customer || 'Customer'}`,
          amount: Number(a.advance || 0),
          mode: a.advanceMode || 'Cash',
        })),
      ...bridals
        .filter((b) => !billedBridalIds.has(b.id) && Number(b.advance || 0) > 0)
        .map((b) => ({
          id: `bridal-adv-${b.id}`,
          date: b.date || b.weddingDate || today,
          type: 'Sale' as const,
          label: `👑 Bridal Advance — ${b.name || 'Bride'}`,
          amount: Number(b.advance || 0),
          mode: b.advanceMode || 'Cash',
        })),
      ...purchases.map((p) => ({
        id: p.id,
        date: p.date,
        type: 'Purchase' as const,
        label: `${p.no || 'PO'} — ${p.supplier || 'Supplier'}`,
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
    const todayVouchersIn = vouchers
      .filter((v) => v.date === today && v.type === 'Payment-In')
      .reduce((s, v) => s + Number(v.amount || 0), 0);
    const todayApptAdv = appointments
      .filter((a) => a.date === today && !a.invoiceId && a.workStatus !== 'Billed' && Number(a.advance || 0) > 0)
      .reduce((s, a) => s + Number(a.advance || 0), 0);
    const todayBridalAdv = bridals
      .filter((b) => (b.date === today || b.weddingDate === today) && !billedBridalIds.has(b.id) && Number(b.advance || 0) > 0)
      .reduce((s, b) => s + Number(b.advance || 0), 0);

    const todayCollection =
      invoices
        .filter((i) => i.date === today)
        .reduce((s, i) => {
          const vPaid = invoiceVouchersTotal[i.id] || 0;
          const directPaid = Math.max(0, Number(i.paid || 0) - vPaid);
          return s + directPaid + Number(i.advance || 0);
        }, 0) +
      todayVouchersIn +
      todayApptAdv +
      todayBridalAdv;

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
      invoicesPendingTotal,
      bridalPendingTotal,
      appointmentPendingTotal,
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
  }, [invoices, purchases, expenses, vouchers, bridals, appointments, bankAccounts, accountTransfers, today]);

  // Pending Collections List (Customer Bills, Bridal Bookings & Appointments with pending balance)
  const pendingCollections = useMemo(() => {
    const list: Array<{
      id: string;
      type: 'Invoice' | 'Bridal' | 'Appointment';
      no: string;
      name: string;
      mobile: string;
      date: string;
      time?: string;
      staff?: string;
      total: number;
      paid: number;
      balance: number;
      notes?: string;
    }> = [];

    const billedBridalIds = new Set(invoices.map((i) => i.bridalBookingId).filter(Boolean));

    // 1. INVOICES / BILLS (બિલ બન્યા પછીના બાકી)
    invoices.forEach((inv) => {
      const paidAmt = Number(inv.paid || 0) + Number(inv.advance || 0);
      const bal = Math.max(Number(inv.balance || 0), Number(inv.total || 0) - paidAmt);
      if (bal > 0) {
        list.push({
          id: inv.id,
          type: 'Invoice',
          no: inv.no || 'INV',
          name: inv.customer || 'Walk-in Customer',
          mobile: inv.mobile || '-',
          date: inv.date,
          total: Number(inv.total || 0),
          paid: paidAmt,
          balance: bal,
          notes: inv.notes || '',
        });
      }
    });

    // 2. BRIDAL BOOKINGS (બ્રાઇડલ બુકિંગના બાકી)
    bridals.forEach((b) => {
      if (b.status !== 'Cancelled' && !billedBridalIds.has(b.id)) {
        const bal = Math.max(Number(b.balance || 0), Number(b.package || 0) - Number(b.advance || 0));
        if (bal > 0) {
          list.push({
            id: b.id,
            type: 'Bridal',
            no: b.packageName || 'Bridal Booking',
            name: b.name || 'Bride',
            mobile: b.mobile || '-',
            date: b.date || b.weddingDate || '-',
            total: Number(b.package || 0),
            paid: Number(b.advance || 0),
            balance: bal,
            notes: b.notes || (b.venue ? `Venue: ${b.venue}` : ''),
          });
        }
      }
    });

    // 3. APPOINTMENTS (અપોઇન્ટમેન્ટ બુકિંગ / એડવાન્સ બાકી)
    appointments.forEach((a) => {
      if (a.status !== 'Cancelled' && !a.invoiceId && a.workStatus !== 'Billed') {
        const price = Number(a.price || 0);
        const adv = Number(a.advance || 0);
        const bal = Math.max(0, price - adv);
        if (price > 0 && bal > 0) {
          list.push({
            id: a.id,
            type: 'Appointment',
            no: a.service || 'Appointment Service',
            name: a.customer || 'Customer',
            mobile: a.mobile || '-',
            date: a.date,
            time: a.time || '',
            staff: a.staff || '',
            total: price,
            paid: adv,
            balance: bal,
            notes: a.notes || (a.time ? `Time: ${a.time}` : ''),
          });
        }
      }
    });

    return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [invoices, bridals, appointments]);

  // Breakdown statistics for To Collect sub-tabs
  const collectionCounts = useMemo(() => {
    const invList = pendingCollections.filter((i) => i.type === 'Invoice');
    const bridalList = pendingCollections.filter((i) => i.type === 'Bridal');
    const apptList = pendingCollections.filter((i) => i.type === 'Appointment');

    const invTotal = invList.reduce((s, i) => s + i.balance, 0);
    const bridalTotal = bridalList.reduce((s, i) => s + i.balance, 0);
    const apptTotal = apptList.reduce((s, i) => s + i.balance, 0);
    const allTotal = invTotal + bridalTotal + apptTotal;

    return {
      allCount: pendingCollections.length,
      allTotal,
      invCount: invList.length,
      invTotal,
      bridalCount: bridalList.length,
      bridalTotal,
      apptCount: apptList.length,
      apptTotal,
    };
  }, [pendingCollections]);

  // Filtered collections for search & tabs
  const filteredCollections = useMemo(() => {
    let result = pendingCollections;
    if (toCollectTab === 'invoice') {
      result = result.filter((item) => item.type === 'Invoice');
    } else if (toCollectTab === 'bridal') {
      result = result.filter((item) => item.type === 'Bridal');
    } else if (toCollectTab === 'appointment') {
      result = result.filter((item) => item.type === 'Appointment');
    }

    if (toCollectSearch.trim()) {
      const q = toCollectSearch.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.mobile.toLowerCase().includes(q) ||
          item.no.toLowerCase().includes(q) ||
          (item.staff && item.staff.toLowerCase().includes(q)) ||
          (item.notes && item.notes.toLowerCase().includes(q))
      );
    }

    return result;
  }, [pendingCollections, toCollectTab, toCollectSearch]);

  const getWhatsAppReminderUrl = (item: (typeof pendingCollections)[0]) => {
    if (!item.mobile || item.mobile === '-') return '';
    const cleanMobile = item.mobile.replace(/\D/g, '');
    const phone = cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile;

    let msg = '';
    if (item.type === 'Invoice') {
      msg = `નમસ્તે ${item.name},\nશ્રી બ્યુટી સ્ટુડિયો તરફથી આપનું બિલ #${item.no} (તારીખ: ${fmtDate(item.date)}) નું કુલ ₹${item.total} માંથી ₹${item.balance} નું પેમેન્ટ બાકી છે.\nકૃપા કરીને આ રકમ જમા કરાવવા વિનંતી છે.\nઆભાર! 🙏\nશ્રી બ્યુટી સ્ટુડિયો`;
    } else if (item.type === 'Bridal') {
      msg = `નમસ્તે ${item.name},\nશ્રી બ્યુટી સ્ટુડિયો તરફથી આપના બ્રાઇડલ પેકેજ (${item.no}) નું કુલ ₹${item.total} માંથી બાકી પેમેન્ટ ₹${item.balance} જમા કરાવવા વિનંતી છે.\nઆભાર! 🙏\nશ્રી બ્યુટી સ્ટુડિયો`;
    } else {
      msg = `નમસ્તે ${item.name},\nશ્રી બ્યુટી સ્ટુડિયો તરફથી આપની અપોઇન્ટમેન્ટ (${item.no} - ${fmtDate(item.date)}) નું બાકી પેમેન્ટ/એડવાન્સ ₹${item.balance} જમા કરાવવા વિનંતી છે.\nઆભાર! 🙏\nશ્રી બ્યુટી સ્ટુડિયો`;
    }
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  // Pending Supplier Payments List
  const pendingPayments = useMemo(() => {
    return purchases
      .map((p) => {
        const bal = Math.max(Number(p.balance || 0), Number(p.total || 0) - Number(p.paid || 0));
        return {
          id: p.id,
          no: p.no || 'PUR',
          supplier: p.supplier || 'Supplier',
          date: p.date,
          total: Number(p.total || 0),
          paid: Number(p.paid || 0),
          balance: bal,
        };
      })
      .filter((p) => p.balance > 0)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [purchases]);

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

  // Payment-In Unified Records (All historic sales invoices, advances, and payment vouchers)
  const allPaymentInEntries = useMemo(() => {
    const list: {
      id: string;
      source: 'voucher' | 'invoice-payment' | 'invoice-advance' | 'bridal-advance' | 'appointment-advance';
      typeLabel: string;
      badgeBg: string;
      badgeColor: string;
      badgeBorder: string;
      docNo: string;
      date: string;
      partyName: string;
      partyMobile: string;
      amount: number;
      mode: string;
      notes: string;
      voucherId?: string;
      invoiceId?: string;
      bridalId?: string;
      apptId?: string;
      splitType?: 'cash' | 'upi' | 'card';
    }[] = [];

    // 1. Dedicated Payment-In Vouchers
    vouchers
      .filter((v) => v.type === 'Payment-In')
      .forEach((v) => {
        list.push({
          id: `vch-${v.id}`,
          source: 'voucher',
          typeLabel: '📥 Payment Voucher',
          badgeBg: '#dcfce7',
          badgeColor: '#15803d',
          badgeBorder: '#bbf7d0',
          docNo: v.voucherNo,
          date: v.date,
          partyName: v.partyName || 'Customer',
          partyMobile: v.partyMobile || '-',
          amount: Number(v.amount || 0),
          mode: v.mode || 'Cash',
          notes: v.notes || (v.linkedDocNo ? `Payment against ${v.linkedDocNo}` : 'Payment In'),
          voucherId: v.id,
        });
      });

    // Mapped vouchers per invoice to avoid double-counting direct bill paid amount
    const invoiceVouchersTotal: Record<string, number> = {};
    vouchers
      .filter((v) => v.type === 'Payment-In')
      .forEach((v) => {
        if (v.partyId) {
          invoiceVouchersTotal[v.partyId] = (invoiceVouchersTotal[v.partyId] || 0) + Number(v.amount || 0);
        }
      });

    // 2. Direct Sales Invoices / Bills (Past & Existing)
    invoices.forEach((inv) => {
      // A. Advance received on Invoice
      if (Number(inv.advance || 0) > 0) {
        list.push({
          id: `inv-adv-${inv.id}`,
          source: 'invoice-advance',
          typeLabel: '🔖 Bill Advance',
          badgeBg: '#fef3c7',
          badgeColor: '#92400e',
          badgeBorder: '#fde68a',
          docNo: inv.no || 'INV',
          date: inv.date,
          partyName: inv.customer || 'Walk-in Customer',
          partyMobile: inv.mobile || '-',
          amount: Number(inv.advance || 0),
          mode: inv.advanceMode || 'Cash',
          notes: `Advance payment for Bill #${inv.no || ''}`,
          invoiceId: inv.id,
        });
      }

      // B. Direct Payment at Billing Time
      const vPaid = invoiceVouchersTotal[inv.id] || 0;
      const directPaid = Math.max(0, Number(inv.paid || 0) - vPaid);

      if (directPaid > 0) {
        if (inv.splitPayment && (Number(inv.splitPayment.cash || 0) > 0 || Number(inv.splitPayment.upi || 0) > 0 || Number(inv.splitPayment.card || 0) > 0)) {
          if (Number(inv.splitPayment.cash || 0) > 0) {
            list.push({
              id: `inv-split-cash-${inv.id}`,
              source: 'invoice-payment',
              typeLabel: '📄 Bill Payment',
              badgeBg: '#e0f2fe',
              badgeColor: '#0369a1',
              badgeBorder: '#bae6fd',
              docNo: inv.no || 'INV',
              date: inv.date,
              partyName: inv.customer || 'Walk-in Customer',
              partyMobile: inv.mobile || '-',
              amount: Number(inv.splitPayment.cash || 0),
              mode: 'Cash',
              splitType: 'cash',
              notes: `Split payment (Cash) for Bill #${inv.no || ''}`,
              invoiceId: inv.id,
            });
          }
          if (Number(inv.splitPayment.upi || 0) > 0) {
            list.push({
              id: `inv-split-upi-${inv.id}`,
              source: 'invoice-payment',
              typeLabel: '📄 Bill Payment',
              badgeBg: '#e0f2fe',
              badgeColor: '#0369a1',
              badgeBorder: '#bae6fd',
              docNo: inv.no || 'INV',
              date: inv.date,
              partyName: inv.customer || 'Walk-in Customer',
              partyMobile: inv.mobile || '-',
              amount: Number(inv.splitPayment.upi || 0),
              mode: inv.splitPayment.upiMode || 'GPay UPI',
              splitType: 'upi',
              notes: `Split payment (UPI) for Bill #${inv.no || ''}`,
              invoiceId: inv.id,
            });
          }
          if (Number(inv.splitPayment.card || 0) > 0) {
            list.push({
              id: `inv-split-card-${inv.id}`,
              source: 'invoice-payment',
              typeLabel: '📄 Bill Payment',
              badgeBg: '#e0f2fe',
              badgeColor: '#0369a1',
              badgeBorder: '#bae6fd',
              docNo: inv.no || 'INV',
              date: inv.date,
              partyName: inv.customer || 'Walk-in Customer',
              partyMobile: inv.mobile || '-',
              amount: Number(inv.splitPayment.card || 0),
              mode: 'Card',
              splitType: 'card',
              notes: `Split payment (Card) for Bill #${inv.no || ''}`,
              invoiceId: inv.id,
            });
          }
        } else {
          list.push({
            id: `inv-paid-${inv.id}`,
            source: 'invoice-payment',
            typeLabel: '📄 Bill Payment',
            badgeBg: '#e0f2fe',
            badgeColor: '#0369a1',
            badgeBorder: '#bae6fd',
            docNo: inv.no || 'INV',
            date: inv.date,
            partyName: inv.customer || 'Walk-in Customer',
            partyMobile: inv.mobile || '-',
            amount: directPaid,
            mode: inv.mode || 'Cash',
            notes: inv.notes ? `Bill #${inv.no || ''} - ${inv.notes}` : `Direct payment for Bill #${inv.no || ''}`,
            invoiceId: inv.id,
          });
        }
      }
    });

    // 3. Bridal Booking Advances (not already billed in an invoice)
    const billedBridalIds = new Set(invoices.map((i) => i.bridalBookingId).filter(Boolean));
    bridals.forEach((b) => {
      if (!billedBridalIds.has(b.id) && Number(b.advance || 0) > 0) {
        list.push({
          id: `bridal-adv-${b.id}`,
          source: 'bridal-advance',
          typeLabel: '👑 Bridal Advance',
          badgeBg: '#fce7f3',
          badgeColor: '#be185d',
          badgeBorder: '#fbcfe8',
          docNo: b.packageName || 'Bridal Booking',
          date: b.date || b.weddingDate || today,
          partyName: b.name || 'Bride',
          partyMobile: b.mobile || '-',
          amount: Number(b.advance || 0),
          mode: (b as any).advanceAccount || b.advanceMode || 'Cash',
          notes: `Advance for Bridal Booking (${b.packageName || 'Package'})`,
          bridalId: b.id,
        });
      }
    });

    // 4. Appointment Advances (not already billed in an invoice)
    appointments.forEach((a) => {
      if (!a.invoiceId && a.workStatus !== 'Billed' && Number(a.advance || 0) > 0) {
        list.push({
          id: `appt-adv-${a.id}`,
          source: 'appointment-advance',
          typeLabel: '📅 Appt Advance',
          badgeBg: '#ede9fe',
          badgeColor: '#6b21a8',
          badgeBorder: '#ddd6fe',
          docNo: 'APPT',
          date: a.date,
          partyName: a.customer || 'Client',
          partyMobile: a.mobile || '-',
          amount: Number(a.advance || 0),
          mode: a.advanceMode || 'Cash',
          notes: `Advance for appointment (${a.service || 'Service'})`,
          apptId: a.id,
        });
      }
    });

    return list.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.docNo || '').localeCompare(a.docNo || ''));
  }, [vouchers, invoices, bridals, appointments, today]);

  const paymentInStats = useMemo(() => {
    const monthStart = today.slice(0, 7) + '-01';
    const totalIn = allPaymentInEntries.reduce((s, v) => s + Number(v.amount || 0), 0);
    const todayIn = allPaymentInEntries
      .filter((v) => v.date === today)
      .reduce((s, v) => s + Number(v.amount || 0), 0);
    const monthIn = allPaymentInEntries
      .filter((v) => v.date >= monthStart)
      .reduce((s, v) => s + Number(v.amount || 0), 0);
    const todayCount = allPaymentInEntries.filter((v) => v.date === today).length;
    return { totalIn, todayIn, monthIn, totalCount: allPaymentInEntries.length, todayCount };
  }, [allPaymentInEntries, today]);

  const filteredPaymentInList = useMemo(() => {
    const q = (paymentInSearch || '').toLowerCase().trim();
    return allPaymentInEntries
      .filter((v) => {
        const matchesSearch =
          !q ||
          (v.partyName && v.partyName.toLowerCase().includes(q)) ||
          (v.partyMobile && v.partyMobile.toLowerCase().includes(q)) ||
          (v.docNo && v.docNo.toLowerCase().includes(q)) ||
          (v.typeLabel && v.typeLabel.toLowerCase().includes(q)) ||
          (v.notes && v.notes.toLowerCase().includes(q)) ||
          (v.mode && v.mode.toLowerCase().includes(q));

        const matchesMode =
          paymentInModeFilter === 'All' || v.mode?.toLowerCase() === paymentInModeFilter.toLowerCase();

        const matchesType =
          paymentInTypeFilter === 'All' || v.source === paymentInTypeFilter;

        return matchesSearch && matchesMode && matchesType;
      });
  }, [allPaymentInEntries, paymentInSearch, paymentInModeFilter, paymentInTypeFilter]);

  // Day Book Calculation for selected Date
  const daybook = useMemo(() => {
    const d = daybookDate;

    // Helper for daybook advance mode
    const getInvoiceAdvanceMode = (i: (typeof invoices)[0]) => {
      if (i.advanceMode) return i.advanceMode;
      if (i.appointmentId) {
        const appt = appointments.find((a) => a.id === i.appointmentId);
        if (appt?.advanceMode) return appt.advanceMode;
      }
      if (i.bridalBookingId) {
        const b = bridals.find((x) => x.id === i.bridalBookingId);
        if ((b as any)?.advanceAccount || b?.advanceMode) return (b as any)?.advanceAccount || b?.advanceMode;
      }
      return 'Cash';
    };

    const isBankMode = (mode: string) => mode !== 'Cash' && mode !== 'Split Payment';
    const dayInvoices = invoices.filter((i) => i.date === d);

    const posCashIn = dayInvoices.reduce((s, i) => {
      let cash = 0;
      const advMode = getInvoiceAdvanceMode(i);
      if (Number(i.advance || 0) > 0 && (advMode === 'Cash' || !advMode)) {
        cash += Number(i.advance || 0);
      }
      if (i.splitPayment?.cash) {
        cash += Number(i.splitPayment.cash);
      } else if (i.mode === 'Cash') {
        cash += Number(i.paid || 0);
      }
      return s + cash;
    }, 0);

    const posUpiIn = dayInvoices.reduce((s, i) => {
      let upi = 0;
      const advMode = getInvoiceAdvanceMode(i);
      if (Number(i.advance || 0) > 0 && isBankMode(advMode) && (advMode.includes('UPI') || advMode.includes('GPay') || advMode.includes('PhonePe'))) {
        upi += Number(i.advance || 0);
      }
      if (i.splitPayment?.upi) {
        upi += Number(i.splitPayment.upi);
      } else if (i.mode.includes('UPI') || i.mode.includes('GPay') || i.mode.includes('PhonePe')) {
        upi += Number(i.paid || 0);
      }
      return s + upi;
    }, 0);

    const dayPaymentInVouchers = vouchers.filter((v) => v.date === d && v.type === 'Payment-In');
    const voucherCashIn = dayPaymentInVouchers
      .filter((v) => v.mode === 'Cash')
      .reduce((s, v) => s + Number(v.amount || 0), 0);

    const apptCashIn = appointments
      .filter((a) => a.date === d && !a.invoiceId && a.workStatus !== 'Billed' && Number(a.advance || 0) > 0 && (a.advanceMode === 'Cash' || !a.advanceMode))
      .reduce((s, a) => s + Number(a.advance || 0), 0);

    const bridalCashIn = bridals
      .filter((b) => (b.date === d || b.weddingDate === d) && Number(b.advance || 0) > 0 && (b.advanceMode === 'Cash' || !b.advanceMode))
      .reduce((s, b) => s + Number(b.advance || 0), 0);

    // Daily Cash Transfers In / Out
    const dayCashTransfersIn = accountTransfers
      .filter((t) => t.date === d && (t.to?.toLowerCase() === 'cash' || t.toName?.toLowerCase() === 'cash'))
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    const dayCashTransfersOut = accountTransfers
      .filter((t) => t.date === d && (t.from?.toLowerCase() === 'cash' || t.fromName?.toLowerCase() === 'cash'))
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    const totalCashIn = posCashIn + voucherCashIn + apptCashIn + bridalCashIn + dayCashTransfersIn;

    const apptAllIn = appointments
      .filter((a) => a.date === d && Number(a.advance || 0) > 0)
      .reduce((s, a) => s + Number(a.advance || 0), 0);

    const bridalAllIn = bridals
      .filter((b) => (b.date === d || b.weddingDate === d) && Number(b.advance || 0) > 0)
      .reduce((s, b) => s + Number(b.advance || 0), 0);

    const totalAllIn =
      dayInvoices.reduce((s, i) => s + Number(i.paid || 0) + Number(i.advance || 0), 0) +
      dayPaymentInVouchers.reduce((s, v) => s + Number(v.amount || 0), 0) +
      apptAllIn +
      bridalAllIn +
      dayCashTransfersIn;

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

    const totalCashOut = expenseCashOut + purchaseCashOut + voucherCashOut + dayCashTransfersOut;
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
      dayCashTransfersIn,
      dayCashTransfersOut,
    };
  }, [daybookDate, invoices, expenses, purchases, vouchers, bridals, appointments, accountTransfers]);

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

  // --- Bank Account Handlers ---
  const openNewBank = () => {
    setEditBankId(null);
    setBankForm({
      name: '',
      accountNo: '',
      ifsc: '',
      branch: '',
      upiId: '',
      openingBalance: 0,
    });
    setBankModalOpen(true);
  };

  const openEditBank = (b: BankAccount) => {
    setEditBankId(b.id);
    setBankForm({
      name: b.name,
      accountNo: b.accountNo || '',
      ifsc: b.ifsc || '',
      branch: b.branch || '',
      upiId: b.upiId || '',
      openingBalance: b.openingBalance || 0,
    });
    setBankModalOpen(true);
  };

  const handleSaveBank = () => {
    if (!bankForm.name?.trim()) {
      toast('Please enter bank account name (e.g. HDFC Bank, SBI)', 'error');
      return;
    }
    const nameTrim = bankForm.name.trim();
    const openBal = Number(bankForm.openingBalance || 0);

    if (editBankId) {
      updateData((d) => ({
        ...d,
        bankAccounts: (d.bankAccounts || []).map((b) =>
          b.id === editBankId
            ? {
                ...b,
                name: nameTrim,
                accountNo: bankForm.accountNo?.trim() || '',
                ifsc: bankForm.ifsc?.trim() || '',
                branch: bankForm.branch?.trim() || '',
                upiId: bankForm.upiId?.trim() || '',
                openingBalance: openBal,
              }
            : b
        ),
      }));
      scheduleSave();
      toast(`Bank account "${nameTrim}" updated!`);
      setBankModalOpen(false);
      setEditBankId(null);
      return;
    }

    const newBank: BankAccount = {
      id: uid(),
      name: nameTrim,
      accountNo: bankForm.accountNo?.trim() || '',
      ifsc: bankForm.ifsc?.trim() || '',
      branch: bankForm.branch?.trim() || '',
      upiId: bankForm.upiId?.trim() || '',
      openingBalance: openBal,
      isActive: true,
    };

    updateData((d) => ({
      ...d,
      bankAccounts: [...(d.bankAccounts || []), newBank],
    }));
    scheduleSave();
    toast(`✅ Bank account "${nameTrim}" added successfully!`);
    setBankModalOpen(false);
  };

  const handleDeleteBank = (id: string) => {
    updateData((d) => ({
      ...d,
      bankAccounts: (d.bankAccounts || []).filter((b) => b.id !== id),
    }));
    scheduleSave();
    toast('Bank account deleted.');
    setDeleteBankId(null);
  };

  // --- Fund Transfer Handlers ---
  const availableTransferAccounts = useMemo(() => {
    const list = ['Cash'];
    if (bankAccounts.length > 0) {
      bankAccounts.forEach((b) => {
        if (!list.includes(b.name)) list.push(b.name);
      });
    } else {
      const defaults = ['GPay UPI', 'PhonePe UPI', 'HDFC Bank', 'Bank Account'];
      defaults.forEach((m) => {
        if (!list.includes(m)) list.push(m);
      });
    }
    return list;
  }, [bankAccounts]);

  const openNewTransfer = (presetFrom?: string, presetTo?: string) => {
    const firstBank = bankAccounts[0]?.name || 'GPay UPI';
    const fromAcc = presetFrom || 'Cash';
    const toAcc = presetTo || (fromAcc === 'Cash' ? firstBank : 'Cash');
    setTransferForm({
      from: fromAcc,
      to: toAcc,
      amount: '',
      date: todayISO(),
      notes: '',
    });
    setTransferModalOpen(true);
  };

  const handleSaveTransfer = () => {
    const amt = Number(transferForm.amount || 0);
    if (amt <= 0) {
      toast('Please enter a valid transfer amount.', 'error');
      return;
    }
    if (!transferForm.from || !transferForm.to) {
      toast('Please select both From and To accounts.', 'error');
      return;
    }
    if (transferForm.from.trim().toLowerCase() === transferForm.to.trim().toLowerCase()) {
      toast('From and To accounts cannot be the same.', 'error');
      return;
    }

    const transferSeq = data?.transferSeq || 1001;
    const trfNo = `TRF-${transferSeq}`;

    const newTransfer: AccountTransfer = {
      id: uid(),
      transferNo: trfNo,
      date: transferForm.date || todayISO(),
      from: transferForm.from.trim(),
      fromName: transferForm.from.trim(),
      to: transferForm.to.trim(),
      toName: transferForm.to.trim(),
      amount: amt,
      notes: transferForm.notes?.trim() || '',
    };

    updateData((d) => ({
      ...d,
      accountTransfers: [newTransfer, ...(d.accountTransfers || [])],
      transferSeq: transferSeq + 1,
    }));

    scheduleSave();
    toast(`✅ Transfer ${trfNo} of ₹${amt} completed (${transferForm.from} ➔ ${transferForm.to})!`);
    setTransferModalOpen(false);
  };

  const handleDeleteTransfer = (id: string) => {
    updateData((d) => ({
      ...d,
      accountTransfers: (d.accountTransfers || []).filter((t) => t.id !== id),
    }));
    scheduleSave();
    toast('Transfer record deleted.');
    setDeleteTransferId(null);
  };

  const handleDeleteVoucher = (id: string) => {
    const v = vouchers.find((x) => x.id === id);
    if (!v) return;

    updateData((d) => {
      const updatedVouchers = (d.vouchers || []).filter((x) => x.id !== id);
      let updatedInvoices = [...(d.invoices || [])];
      let updatedBridals = [...(d.bridal || [])];
      let updatedPurchases = [...(d.purchases || [])];

      if (v.type === 'Payment-In') {
        // Roll back invoice payment
        updatedInvoices = updatedInvoices.map((inv) => {
          if (inv.id === v.partyId || (v.linkedDocNo && inv.no === v.linkedDocNo)) {
            const newPaid = Math.max(0, Number(inv.paid || 0) - Number(v.amount || 0));
            const totalPaid = newPaid + Number(inv.advance || 0);
            const newBal = Math.max(0, Number(inv.total || 0) - totalPaid);
            return { ...inv, paid: newPaid, balance: newBal };
          }
          return inv;
        });

        // Roll back bridal advance
        updatedBridals = updatedBridals.map((b) => {
          if (b.id === v.partyId || (v.linkedDocNo && (b.packageName === v.linkedDocNo || b.id === v.linkedDocNo))) {
            const newAdv = Math.max(0, Number(b.advance || 0) - Number(v.amount || 0));
            const newBal = Math.max(0, Number(b.package || 0) - newAdv);
            return { ...b, advance: newAdv, balance: newBal };
          }
          return b;
        });

        // Roll back appointment advance
        let updatedAppointments = [...(d.appointments || [])].map((a) => {
          if (a.id === v.partyId || (v.linkedDocNo && a.service === v.linkedDocNo)) {
            const newAdv = Math.max(0, Number(a.advance || 0) - Number(v.amount || 0));
            return { ...a, advance: newAdv };
          }
          return a;
        });

        return {
          ...d,
          vouchers: updatedVouchers,
          invoices: updatedInvoices,
          bridal: updatedBridals,
          appointments: updatedAppointments,
          purchases: updatedPurchases,
        };
      } else if (v.type === 'Payment-Out') {
        // Roll back purchase payment
        updatedPurchases = updatedPurchases.map((p) => {
          if (p.id === v.partyId || (v.linkedDocNo && p.no === v.linkedDocNo)) {
            const newPaid = Math.max(0, Number(p.paid || 0) - Number(v.amount || 0));
            const newBal = Math.max(0, Number(p.total || 0) - newPaid);
            return { ...p, paid: newPaid, balance: newBal };
          }
          return p;
        });
      }

      return {
        ...d,
        vouchers: updatedVouchers,
        invoices: updatedInvoices,
        bridal: updatedBridals,
        purchases: updatedPurchases,
      };
    });

    scheduleSave();
    toast(`✅ Payment વાઉચર (${v.voucherNo}) ડિલીટ થયું અને બાકી હિસાબ રીસ્ટોર થયો!`);
    setDeleteVoucherId(null);
  };

  const getBankStats = (bankName: string) => {
    const match = vyaparStats.bankModeBreakdown.find(
      (m) => m.mode.toLowerCase() === bankName.toLowerCase()
    );
    return {
      inflow: match?.inflow || 0,
      outflow: match?.outflow || 0,
      balance: match?.balance || 0,
    };
  };

  const paymentModes = useMemo(() => {
    const defaults = ['Cash', 'GPay UPI', 'PhonePe UPI', 'Card'];
    const settingsModes = data?.settings?.payments || [];
    const bankNames = (data?.bankAccounts || []).map((b) => b.name);
    return Array.from(new Set([...defaults, ...settingsModes, ...bankNames])).filter(Boolean);
  }, [data?.settings?.payments, data?.bankAccounts]);

  const openPaymentIn = (item: typeof paymentInItem) => {
    if (!item) return;
    setPaymentInItem(item);
    setPaymentInAmount(item.balance);
    setPaymentInMode('Cash');
    setPaymentInDate(todayISO());
    setPaymentInNotes(
      `Payment received for ${
        item.type === 'Bridal'
          ? 'Bridal Package ' + item.no
          : item.type === 'Appointment'
          ? 'Appointment (' + item.no + ')'
          : 'Invoice ' + item.no
      }`
    );
    setPaymentInModalOpen(true);
  };

  const openPaymentOut = (item: typeof paymentOutItem) => {
    if (!item) return;
    setPaymentOutItem(item);
    setPaymentOutAmount(item.balance);
    setPaymentOutMode('Cash');
    setPaymentOutDate(todayISO());
    setPaymentOutNotes(`Payment made against Purchase ${item.no}`);
    setPaymentOutModalOpen(true);
  };

  const handleSavePaymentIn = () => {
    if (!paymentInItem) return;
    const amt = Number(paymentInAmount);
    if (!amt || amt <= 0) {
      toast('કૃપા કરીને માન્ય રકમ દાખલ કરો (Please enter a valid amount)', 'error');
      return;
    }

    updateData((d) => {
      const vouchersList = [...(d.vouchers || [])];
      const nextSeq = (d.voucherSeq || 1000) + 1;
      const voucherNo = `VCH-${nextSeq}`;

      const newVoucher: PaymentVoucher = {
        id: uid(),
        voucherNo,
        type: 'Payment-In',
        partyType: 'Customer',
        partyId: paymentInItem.id,
        partyName: paymentInItem.name,
        partyMobile: paymentInItem.mobile !== '-' ? paymentInItem.mobile : '',
        date: paymentInDate,
        amount: amt,
        mode: paymentInMode,
        linkedDocNo: paymentInItem.no,
        notes: paymentInNotes || `Payment In for ${paymentInItem.name} (${paymentInItem.no})`,
      };
      vouchersList.unshift(newVoucher);

      let updatedInvoices = [...(d.invoices || [])];
      let updatedBridals = [...(d.bridal || [])];
      let updatedAppointments = [...(d.appointments || [])];

      if (paymentInItem.type === 'Invoice') {
        updatedInvoices = updatedInvoices.map((inv) => {
          if (inv.id === paymentInItem.id) {
            const newPaid = Number(inv.paid || 0) + amt;
            const totalPaid = newPaid + Number(inv.advance || 0);
            const newBal = Math.max(0, Number(inv.total || 0) - totalPaid);
            return {
              ...inv,
              paid: newPaid,
              balance: newBal,
            };
          }
          return inv;
        });
      } else if (paymentInItem.type === 'Bridal') {
        updatedBridals = updatedBridals.map((b) => {
          if (b.id === paymentInItem.id) {
            const newAdv = Number(b.advance || 0) + amt;
            const newBal = Math.max(0, Number(b.package || 0) - newAdv);
            return {
              ...b,
              advance: newAdv,
              balance: newBal,
            };
          }
          return b;
        });

        // Also update any invoice created for this bridal booking
        updatedInvoices = updatedInvoices.map((inv) => {
          if (inv.bridalBookingId === paymentInItem.id) {
            const newPaid = Number(inv.paid || 0) + amt;
            const totalPaid = newPaid + Number(inv.advance || 0);
            const newBal = Math.max(0, Number(inv.total || 0) - totalPaid);
            return {
              ...inv,
              paid: newPaid,
              balance: newBal,
            };
          }
          return inv;
        });
      } else if (paymentInItem.type === 'Appointment') {
        updatedAppointments = updatedAppointments.map((a) => {
          if (a.id === paymentInItem.id) {
            const newAdv = Number(a.advance || 0) + amt;
            return {
              ...a,
              advance: newAdv,
              advanceMode: paymentInMode,
            };
          }
          return a;
        });
      }

      return {
        ...d,
        vouchers: vouchersList,
        voucherSeq: nextSeq,
        invoices: updatedInvoices,
        bridal: updatedBridals,
        appointments: updatedAppointments,
      };
    });

    scheduleSave();
    toast(`✅ ${money(amt)} નું Payment In સફળતાપૂર્વક જમા થઈ ગયું! (${paymentInItem.name})`);
    setPaymentInModalOpen(false);
    setPaymentInItem(null);
  };

  const handleSavePaymentOut = () => {
    if (!paymentOutItem) return;
    const amt = Number(paymentOutAmount);
    if (!amt || amt <= 0) {
      toast('કૃપા કરીને માન્ય રકમ દાખલ કરો (Please enter a valid amount)', 'error');
      return;
    }

    updateData((d) => {
      const vouchersList = [...(d.vouchers || [])];
      const nextSeq = (d.voucherSeq || 1000) + 1;
      const voucherNo = `VCH-${nextSeq}`;

      const newVoucher: PaymentVoucher = {
        id: uid(),
        voucherNo,
        type: 'Payment-Out',
        partyType: 'Supplier',
        partyId: paymentOutItem.id,
        partyName: paymentOutItem.supplier,
        date: paymentOutDate,
        amount: amt,
        mode: paymentOutMode,
        linkedDocNo: paymentOutItem.no,
        notes: paymentOutNotes || `Payment Out for ${paymentOutItem.supplier} (${paymentOutItem.no})`,
      };
      vouchersList.unshift(newVoucher);

      const updatedPurchases = (d.purchases || []).map((p) => {
        if (p.id === paymentOutItem.id) {
          const newPaid = Number(p.paid || 0) + amt;
          const newBal = Math.max(0, Number(p.total || 0) - newPaid);
          return {
            ...p,
            paid: newPaid,
            balance: newBal,
          };
        }
        return p;
      });

      return {
        ...d,
        vouchers: vouchersList,
        voucherSeq: nextSeq,
        purchases: updatedPurchases,
      };
    });

    scheduleSave();
    toast(`✅ ${money(amt)} નું Payment Out સફળતાપૂર્વક ચૂકવાઈ ગયું! (${paymentOutItem.supplier})`);
    setPaymentOutModalOpen(false);
    setPaymentOutItem(null);
  };

  // Open Edit Payment In Modal
  const handleOpenEditPaymentEntry = (entry: (typeof allPaymentInEntries)[0]) => {
    setEditPaymentEntry(entry);
    setEditEntryAmount(entry.amount);
    setEditEntryMode(entry.mode || 'Cash');
    setEditEntryDate(entry.date || todayISO());
    setEditEntryNotes(entry.notes || '');
    setEditEntryPartyName(entry.partyName || '');
    setEditEntryPartyMobile(entry.partyMobile === '-' ? '' : (entry.partyMobile || ''));
  };

  // Save Edit Payment In Entry
  const handleSaveEditPaymentEntry = () => {
    if (!editPaymentEntry) return;
    const newAmt = Number(editEntryAmount);
    if (isNaN(newAmt) || newAmt < 0) {
      toast('કૃપા કરીને માન્ય રકમ દાખલ કરો (Please enter a valid amount)', 'error');
      return;
    }

    const oldAmt = Number(editPaymentEntry.amount || 0);
    const diff = newAmt - oldAmt;

    updateData((d) => {
      let updatedVouchers = [...(d.vouchers || [])];
      let updatedInvoices = [...(d.invoices || [])];
      let updatedBridals = [...(d.bridal || [])];
      let updatedAppointments = [...(d.appointments || [])];

      if (editPaymentEntry.source === 'voucher') {
        updatedVouchers = updatedVouchers.map((v) => {
          if (v.id === editPaymentEntry.voucherId) {
            return {
              ...v,
              amount: newAmt,
              mode: editEntryMode,
              date: editEntryDate,
              notes: editEntryNotes,
              partyName: editEntryPartyName || v.partyName,
              partyMobile: editEntryPartyMobile !== undefined ? editEntryPartyMobile : v.partyMobile,
            };
          }
          return v;
        });

        // Also adjust linked invoice / bridal / appt balance by diff
        const v = vouchers.find((x) => x.id === editPaymentEntry.voucherId);
        if (v && v.partyId) {
          // Check if invoice
          updatedInvoices = updatedInvoices.map((inv) => {
            if (inv.id === v.partyId || (v.linkedDocNo && inv.no === v.linkedDocNo)) {
              const updatedPaid = Math.max(0, Number(inv.paid || 0) + diff);
              const totalPaid = updatedPaid + Number(inv.advance || 0);
              const updatedBal = Math.max(0, Number(inv.total || 0) - totalPaid);
              return { ...inv, paid: updatedPaid, balance: updatedBal };
            }
            return inv;
          });

          // Check if bridal
          updatedBridals = updatedBridals.map((b) => {
            if (b.id === v.partyId || (v.linkedDocNo && (b.packageName === v.linkedDocNo || b.id === v.linkedDocNo))) {
              const updatedAdv = Math.max(0, Number(b.advance || 0) + diff);
              const updatedBal = Math.max(0, Number(b.package || 0) - updatedAdv);
              return { ...b, advance: updatedAdv, balance: updatedBal };
            }
            return b;
          });

          // Check if appointment
          updatedAppointments = updatedAppointments.map((a) => {
            if (a.id === v.partyId || (v.linkedDocNo && a.service === v.linkedDocNo)) {
              const updatedAdv = Math.max(0, Number(a.advance || 0) + diff);
              return { ...a, advance: updatedAdv };
            }
            return a;
          });
        }
      } else if (editPaymentEntry.source === 'invoice-advance') {
        updatedInvoices = updatedInvoices.map((inv) => {
          if (inv.id === editPaymentEntry.invoiceId) {
            const totalPaid = Number(inv.paid || 0) + newAmt;
            const updatedBal = Math.max(0, Number(inv.total || 0) - totalPaid);
            return {
              ...inv,
              advance: newAmt,
              advanceMode: editEntryMode,
              balance: updatedBal,
              customer: editEntryPartyName || inv.customer,
              mobile: editEntryPartyMobile || inv.mobile,
            };
          }
          return inv;
        });

        // If bridal booking attached to invoice
        const inv = invoices.find((i) => i.id === editPaymentEntry.invoiceId);
        if (inv?.bridalBookingId) {
          updatedBridals = updatedBridals.map((b) => {
            if (b.id === inv.bridalBookingId) {
              const updatedBal = Math.max(0, Number(b.package || 0) - newAmt);
              return { ...b, advance: newAmt, advanceMode: editEntryMode, balance: updatedBal };
            }
            return b;
          });
        }
      } else if (editPaymentEntry.source === 'invoice-payment') {
        updatedInvoices = updatedInvoices.map((inv) => {
          if (inv.id === editPaymentEntry.invoiceId) {
            if (editPaymentEntry.splitType) {
              const split = { ...(inv.splitPayment || { cash: 0, upi: 0, card: 0, upiMode: 'GPay UPI' }) };
              if (editPaymentEntry.splitType === 'cash') split.cash = newAmt;
              if (editPaymentEntry.splitType === 'upi') {
                split.upi = newAmt;
                split.upiMode = editEntryMode;
              }
              if (editPaymentEntry.splitType === 'card') split.card = newAmt;

              const totalPaidFromSplit = Number(split.cash || 0) + Number(split.upi || 0) + Number(split.card || 0);
              const totalPaid = totalPaidFromSplit + Number(inv.advance || 0);
              const updatedBal = Math.max(0, Number(inv.total || 0) - totalPaid);
              return {
                ...inv,
                splitPayment: split,
                paid: totalPaidFromSplit,
                balance: updatedBal,
                customer: editEntryPartyName || inv.customer,
                mobile: editEntryPartyMobile || inv.mobile,
              };
            } else {
              const totalPaid = newAmt + Number(inv.advance || 0);
              const updatedBal = Math.max(0, Number(inv.total || 0) - totalPaid);
              return {
                ...inv,
                paid: newAmt,
                mode: editEntryMode,
                date: editEntryDate,
                notes: editEntryNotes,
                balance: updatedBal,
                customer: editEntryPartyName || inv.customer,
                mobile: editEntryPartyMobile || inv.mobile,
              };
            }
          }
          return inv;
        });
      } else if (editPaymentEntry.source === 'bridal-advance') {
        updatedBridals = updatedBridals.map((b) => {
          if (b.id === editPaymentEntry.bridalId) {
            const updatedBal = Math.max(0, Number(b.package || 0) - newAmt);
            return {
              ...b,
              advance: newAmt,
              advanceMode: editEntryMode,
              advanceAccount: editEntryMode,
              balance: updatedBal,
              name: editEntryPartyName || b.name,
              mobile: editEntryPartyMobile || b.mobile,
            };
          }
          return b;
        });
      } else if (editPaymentEntry.source === 'appointment-advance') {
        updatedAppointments = updatedAppointments.map((a) => {
          if (a.id === editPaymentEntry.apptId) {
            return {
              ...a,
              advance: newAmt,
              advanceMode: editEntryMode,
              customer: editEntryPartyName || a.customer,
              mobile: editEntryPartyMobile || a.mobile,
            };
          }
          return a;
        });
      }

      return {
        ...d,
        vouchers: updatedVouchers,
        invoices: updatedInvoices,
        bridal: updatedBridals,
        appointments: updatedAppointments,
      };
    });

    scheduleSave();
    toast(`✅ Payment In એન્ટ્રી (${editPaymentEntry.docNo}) અપડેટ થઈ ગઈ!`);
    setEditPaymentEntry(null);
  };

  // Confirm Delete Payment In Entry
  const handleConfirmDeletePaymentEntry = () => {
    if (!deletePaymentEntry) return;

    updateData((d) => {
      let updatedVouchers = [...(d.vouchers || [])];
      let updatedInvoices = [...(d.invoices || [])];
      let updatedBridals = [...(d.bridal || [])];
      let updatedAppointments = [...(d.appointments || [])];

      if (deletePaymentEntry.source === 'voucher') {
        const v = updatedVouchers.find((x) => x.id === deletePaymentEntry.voucherId);
        updatedVouchers = updatedVouchers.filter((x) => x.id !== deletePaymentEntry.voucherId);

        if (v && v.partyId) {
          const vAmt = Number(v.amount || 0);
          updatedInvoices = updatedInvoices.map((inv) => {
            if (inv.id === v.partyId || (v.linkedDocNo && inv.no === v.linkedDocNo)) {
              const updatedPaid = Math.max(0, Number(inv.paid || 0) - vAmt);
              const totalPaid = updatedPaid + Number(inv.advance || 0);
              const updatedBal = Math.max(0, Number(inv.total || 0) - totalPaid);
              return { ...inv, paid: updatedPaid, balance: updatedBal };
            }
            return inv;
          });

          updatedBridals = updatedBridals.map((b) => {
            if (b.id === v.partyId || (v.linkedDocNo && (b.packageName === v.linkedDocNo || b.id === v.linkedDocNo))) {
              const updatedAdv = Math.max(0, Number(b.advance || 0) - vAmt);
              const updatedBal = Math.max(0, Number(b.package || 0) - updatedAdv);
              return { ...b, advance: updatedAdv, balance: updatedBal };
            }
            return b;
          });

          updatedAppointments = updatedAppointments.map((a) => {
            if (a.id === v.partyId || (v.linkedDocNo && a.service === v.linkedDocNo)) {
              const updatedAdv = Math.max(0, Number(a.advance || 0) - vAmt);
              return { ...a, advance: updatedAdv };
            }
            return a;
          });
        }
      } else if (deletePaymentEntry.source === 'invoice-advance') {
        updatedInvoices = updatedInvoices.map((inv) => {
          if (inv.id === deletePaymentEntry.invoiceId) {
            const updatedBal = Math.max(0, Number(inv.total || 0) - Number(inv.paid || 0));
            return {
              ...inv,
              advance: 0,
              advanceMode: undefined,
              balance: updatedBal,
            };
          }
          return inv;
        });

        const inv = invoices.find((i) => i.id === deletePaymentEntry.invoiceId);
        if (inv?.bridalBookingId) {
          updatedBridals = updatedBridals.map((b) => {
            if (b.id === inv.bridalBookingId) {
              return { ...b, advance: 0, balance: Number(b.package || 0) };
            }
            return b;
          });
        }
      } else if (deletePaymentEntry.source === 'invoice-payment') {
        updatedInvoices = updatedInvoices.map((inv) => {
          if (inv.id === deletePaymentEntry.invoiceId) {
            if (deletePaymentEntry.splitType) {
              const split = { ...(inv.splitPayment || { cash: 0, upi: 0, card: 0 }) };
              if (deletePaymentEntry.splitType === 'cash') split.cash = 0;
              if (deletePaymentEntry.splitType === 'upi') split.upi = 0;
              if (deletePaymentEntry.splitType === 'card') split.card = 0;

              const totalPaidFromSplit = Number(split.cash || 0) + Number(split.upi || 0) + Number(split.card || 0);
              const totalPaid = totalPaidFromSplit + Number(inv.advance || 0);
              const updatedBal = Math.max(0, Number(inv.total || 0) - totalPaid);
              return {
                ...inv,
                splitPayment: split,
                paid: totalPaidFromSplit,
                balance: updatedBal,
              };
            } else {
              const updatedBal = Math.max(0, Number(inv.total || 0) - Number(inv.advance || 0));
              return {
                ...inv,
                paid: 0,
                balance: updatedBal,
              };
            }
          }
          return inv;
        });
      } else if (deletePaymentEntry.source === 'bridal-advance') {
        updatedBridals = updatedBridals.map((b) => {
          if (b.id === deletePaymentEntry.bridalId) {
            return {
              ...b,
              advance: 0,
              balance: Number(b.package || 0),
            };
          }
          return b;
        });
      } else if (deletePaymentEntry.source === 'appointment-advance') {
        updatedAppointments = updatedAppointments.map((a) => {
          if (a.id === deletePaymentEntry.apptId) {
            return {
              ...a,
              advance: 0,
            };
          }
          return a;
        });
      }

      return {
        ...d,
        vouchers: updatedVouchers,
        invoices: updatedInvoices,
        bridal: updatedBridals,
        appointments: updatedAppointments,
      };
    });

    scheduleSave();
    toast(`✅ Payment In એન્ટ્રી (${deletePaymentEntry.docNo}) ડિલીટ થઈ ગઈ અને બાકી હિસાબ રીસ્ટોર થયો!`);
    setDeletePaymentEntry(null);
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
          className={`tab-btn ${activeTab === 'payment-in' ? 'active' : ''}`}
          onClick={() => setActiveTab('payment-in')}
        >
          <ArrowDownLeft size={14} />
          <span>📥 Payment In</span>
          <span className="tab-badge" style={{ background: '#dcfce7', color: '#15803d', fontWeight: 800 }}>
            {allPaymentInEntries.length}
          </span>
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

        <button
          type="button"
          className={`tab-btn ${activeTab === 'banks' ? 'active' : ''}`}
          onClick={() => setActiveTab('banks')}
        >
          <Landmark size={14} />
          <span>🏦 Banks & Transfers</span>
          <span className="tab-badge">{bankAccounts.length}</span>
        </button>
      </div>

      {/* Tab Panels */}
      <AnimatePresence mode="wait">
        {/* ======== VYAPAR-STYLE DASHBOARD TAB ======== */}
        {activeTab === 'dashboard' && (
          <motion.div key="vyapar-dash" variants={fadeSlideUp} initial="hidden" animate="visible" exit="exit">

            {/* ---- ROW 1: KPI Cards (To Collect: Bills, Bridal, Appointments + To Pay: Suppliers) ---- */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
              marginTop: 16,
            }}>

              {/* 1. To Collect: Bills / Invoices */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                  borderRadius: 14,
                  padding: '18px 16px',
                  color: '#fff',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 4px 18px rgba(37,99,235,0.25)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  border: toCollectExpanded && toCollectTab === 'invoice' ? '2px solid #fff' : '2px solid transparent',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
                onClick={() => {
                  if (toCollectExpanded && toCollectTab === 'invoice') {
                    setToCollectExpanded(false);
                  } else {
                    setToCollectExpanded(true);
                    setToCollectTab('invoice');
                  }
                }}
              >
                <div style={{ position: 'absolute', top: -8, right: -8, opacity: 0.12, fontSize: 75 }}>📄</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Receipt size={16} />
                    <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.95 }}>
                      Bills (બિલ બાકી)
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.22)', padding: '2px 8px', borderRadius: 20 }}>
                    <span>{collectionCounts.invCount} bills</span>
                    {toCollectExpanded && toCollectTab === 'invoice' ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </div>
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1.1 }}>{money(collectionCounts.invTotal)}</div>
                <div style={{ fontSize: 11, marginTop: 8, opacity: 0.9, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>બિલ બન્યા પછીના બાકી</span>
                  <span style={{ fontWeight: 800, textDecoration: 'underline' }}>
                    {toCollectExpanded && toCollectTab === 'invoice' ? 'Close ▲' : 'Details ▼'}
                  </span>
                </div>
              </div>

              {/* 2. To Collect: Bridal Bookings */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #be185d 0%, #ec4899 100%)',
                  borderRadius: 14,
                  padding: '18px 16px',
                  color: '#fff',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 4px 18px rgba(190,24,93,0.25)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  border: toCollectExpanded && toCollectTab === 'bridal' ? '2px solid #fff' : '2px solid transparent',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
                onClick={() => {
                  if (toCollectExpanded && toCollectTab === 'bridal') {
                    setToCollectExpanded(false);
                  } else {
                    setToCollectExpanded(true);
                    setToCollectTab('bridal');
                  }
                }}
              >
                <div style={{ position: 'absolute', top: -8, right: -8, opacity: 0.12, fontSize: 75 }}>👑</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={16} />
                    <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.95 }}>
                      Bridal (બ્રાઇડલ બાકી)
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.22)', padding: '2px 8px', borderRadius: 20 }}>
                    <span>{collectionCounts.bridalCount} brides</span>
                    {toCollectExpanded && toCollectTab === 'bridal' ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </div>
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1.1 }}>{money(collectionCounts.bridalTotal)}</div>
                <div style={{ fontSize: 11, marginTop: 8, opacity: 0.9, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>બ્રાઇડલ બુકિંગના બાકી</span>
                  <span style={{ fontWeight: 800, textDecoration: 'underline' }}>
                    {toCollectExpanded && toCollectTab === 'bridal' ? 'Close ▲' : 'Details ▼'}
                  </span>
                </div>
              </div>

              {/* 3. To Collect: Appointment Bookings */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #0d9488 0%, #06b6d4 100%)',
                  borderRadius: 14,
                  padding: '18px 16px',
                  color: '#fff',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 4px 18px rgba(13,148,136,0.25)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  border: toCollectExpanded && toCollectTab === 'appointment' ? '2px solid #fff' : '2px solid transparent',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
                onClick={() => {
                  if (toCollectExpanded && toCollectTab === 'appointment') {
                    setToCollectExpanded(false);
                  } else {
                    setToCollectExpanded(true);
                    setToCollectTab('appointment');
                  }
                }}
              >
                <div style={{ position: 'absolute', top: -8, right: -8, opacity: 0.12, fontSize: 75 }}>📅</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={16} />
                    <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.95 }}>
                      Appt (અપોઇન્ટમેન્ટ બાકી)
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.22)', padding: '2px 8px', borderRadius: 20 }}>
                    <span>{collectionCounts.apptCount} appts</span>
                    {toCollectExpanded && toCollectTab === 'appointment' ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </div>
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1.1 }}>{money(collectionCounts.apptTotal)}</div>
                <div style={{ fontSize: 11, marginTop: 8, opacity: 0.9, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>અપોઇન્ટમેન્ટ / એડવાન્સ બાકી</span>
                  <span style={{ fontWeight: 800, textDecoration: 'underline' }}>
                    {toCollectExpanded && toCollectTab === 'appointment' ? 'Close ▲' : 'Details ▼'}
                  </span>
                </div>
              </div>

              {/* 4. To Pay: Suppliers */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
                  borderRadius: 14,
                  padding: '18px 16px',
                  color: '#fff',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 4px 18px rgba(124,58,237,0.25)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  border: toPayExpanded ? '2px solid #fff' : '2px solid transparent',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
                onClick={() => setToPayExpanded(!toPayExpanded)}
              >
                <div style={{ position: 'absolute', top: -8, right: -8, opacity: 0.12, fontSize: 75 }}>📤</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ArrowUpRight size={16} />
                    <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.95 }}>
                      To Pay (આપવાના)
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.22)', padding: '2px 8px', borderRadius: 20 }}>
                    <span>{pendingPayments.length} suppliers</span>
                    {toPayExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </div>
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1.1 }}>{money(vyaparStats.toPay)}</div>
                <div style={{ fontSize: 11, marginTop: 8, opacity: 0.9, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>સપ્લાયર્સને ચૂકવવાના બાકી</span>
                  <span style={{ fontWeight: 800, textDecoration: 'underline' }}>
                    {toPayExpanded ? 'Close ▲' : 'Details ▼'}
                  </span>
                </div>
              </div>
            </div>

            {/* ---- EXPANDED DETAILS: TO COLLECT ---- */}
            <AnimatePresence>
              {toCollectExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 14 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.25 }}
                  className="card"
                  style={{
                    padding: 18,
                    borderLeft: `4px solid ${
                      toCollectTab === 'bridal'
                        ? '#be185d'
                        : toCollectTab === 'appointment'
                        ? '#0d9488'
                        : '#2563eb'
                    }`,
                    overflow: 'hidden',
                  }}
                >
                  {/* Header with Title and Total */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>
                          {toCollectTab === 'invoice' && '📄 Bills Balance Details (બિલ બન્યા પછીના બાકી)'}
                          {toCollectTab === 'bridal' && '👑 Bridal Bookings Pending Details (બ્રાઇડલ બુકિંગના બાકી)'}
                          {toCollectTab === 'appointment' && '📅 Appointments Advance / Booking Balance (અપોઇન્ટમેન્ટ બાકી)'}
                          {toCollectTab === 'all' && '📥 All Receivables (તમામ બાકી લેવાના નાણાં)'}
                        </span>
                        <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 12, background: 'var(--bg-subtle, #f1f5f9)', color: 'var(--text)', fontWeight: 700 }}>
                          {filteredCollections.length} Parties
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                        નીચે ગ્રાહકોના બાકી નાણાંની વિગત છે • નાણાં જમા કરવા <b>"📥 Payment In"</b> અથવા WhatsApp રિમાઇન્ડર મોકલો
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        fontSize: 13,
                        fontWeight: 900,
                        color: toCollectTab === 'bridal' ? '#be185d' : toCollectTab === 'appointment' ? '#0d9488' : '#2563eb',
                        background: toCollectTab === 'bridal' ? '#fce7f3' : toCollectTab === 'appointment' ? '#ccfbf1' : '#dbeafe',
                        padding: '5px 14px',
                        borderRadius: 20,
                      }}>
                        Total: {toCollectTab === 'invoice' ? money(collectionCounts.invTotal) : toCollectTab === 'bridal' ? money(collectionCounts.bridalTotal) : toCollectTab === 'appointment' ? money(collectionCounts.apptTotal) : money(collectionCounts.allTotal)}
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={() => setToCollectExpanded(false)}
                        style={{ padding: '4px 8px', fontSize: 12 }}
                      >
                        ✕ Close
                      </button>
                    </div>
                  </div>

                  {/* Category Filter Tabs & Search Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{
                          padding: '5px 12px',
                          fontSize: 12,
                          fontWeight: 700,
                          borderRadius: 20,
                          background: toCollectTab === 'all' ? '#2563eb' : 'var(--bg-subtle, #f1f5f9)',
                          color: toCollectTab === 'all' ? '#fff' : 'var(--text)',
                          border: toCollectTab === 'all' ? '1px solid #2563eb' : '1px solid var(--border)',
                        }}
                        onClick={() => setToCollectTab('all')}
                      >
                        🔲 All ({collectionCounts.allCount})
                      </button>

                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{
                          padding: '5px 12px',
                          fontSize: 12,
                          fontWeight: 700,
                          borderRadius: 20,
                          background: toCollectTab === 'invoice' ? '#1d4ed8' : 'var(--bg-subtle, #f1f5f9)',
                          color: toCollectTab === 'invoice' ? '#fff' : '#1d4ed8',
                          border: toCollectTab === 'invoice' ? '1px solid #1d4ed8' : '1px solid #bfdbfe',
                        }}
                        onClick={() => setToCollectTab('invoice')}
                      >
                        📄 Bills ({collectionCounts.invCount}) • {money(collectionCounts.invTotal)}
                      </button>

                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{
                          padding: '5px 12px',
                          fontSize: 12,
                          fontWeight: 700,
                          borderRadius: 20,
                          background: toCollectTab === 'bridal' ? '#be185d' : 'var(--bg-subtle, #f1f5f9)',
                          color: toCollectTab === 'bridal' ? '#fff' : '#be185d',
                          border: toCollectTab === 'bridal' ? '1px solid #be185d' : '1px solid #fbcfe8',
                        }}
                        onClick={() => setToCollectTab('bridal')}
                      >
                        👑 Bridal ({collectionCounts.bridalCount}) • {money(collectionCounts.bridalTotal)}
                      </button>

                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{
                          padding: '5px 12px',
                          fontSize: 12,
                          fontWeight: 700,
                          borderRadius: 20,
                          background: toCollectTab === 'appointment' ? '#0d9488' : 'var(--bg-subtle, #f1f5f9)',
                          color: toCollectTab === 'appointment' ? '#fff' : '#0d9488',
                          border: toCollectTab === 'appointment' ? '1px solid #0d9488' : '1px solid #99f6e4',
                        }}
                        onClick={() => setToCollectTab('appointment')}
                      >
                        📅 Appt ({collectionCounts.apptCount}) • {money(collectionCounts.apptTotal)}
                      </button>
                    </div>

                    <div className="search-wrap" style={{ minWidth: 200, maxWidth: 280 }}>
                      <Search size={14} className="search-icon" />
                      <input
                        type="search"
                        className="input"
                        style={{ padding: '5px 10px 5px 30px', fontSize: 12 }}
                        placeholder="Search Customer, Mobile…"
                        value={toCollectSearch}
                        onChange={(e) => setToCollectSearch(e.target.value)}
                      />
                    </div>
                  </div>

                  {filteredCollections.length === 0 ? (
                    <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '24px 0' }}>
                      ✅ આ કેટેગરીમાં કોઈ પેન્ડિંગ બેલેન્સ નથી! 🎉
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left', color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            <th style={{ padding: '10px 12px' }}>Customer / Party</th>
                            <th style={{ padding: '10px 12px' }}>Type & Details</th>
                            <th style={{ padding: '10px 12px' }}>Date</th>
                            <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total Amount</th>
                            <th style={{ padding: '10px 12px', textAlign: 'right' }}>Advance / Paid</th>
                            <th style={{ padding: '10px 12px', textAlign: 'right' }}>Pending Balance (લેવાના)</th>
                            <th style={{ padding: '10px 12px', textAlign: 'center' }}>Action (ક્રિયા)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCollections.map((item) => (
                            <tr key={`${item.type}-${item.id}`} style={{ borderBottom: '1px dashed var(--border)', transition: 'background 0.15s' }}>
                              <td style={{ padding: '12px 12px', fontWeight: 700 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <User size={14} style={{ color: item.type === 'Bridal' ? '#be185d' : item.type === 'Appointment' ? '#0d9488' : '#2563eb' }} />
                                  <span>{item.name}</span>
                                </div>
                                {item.mobile && item.mobile !== '-' && (
                                  <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                    <Phone size={11} />
                                    <span>{item.mobile}</span>
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: '12px 12px' }}>
                                <span style={{
                                  padding: '3px 10px',
                                  borderRadius: 8,
                                  fontSize: 11.5,
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  background: item.type === 'Bridal' ? '#fce7f3' : item.type === 'Appointment' ? '#ccfbf1' : '#e0f2fe',
                                  color: item.type === 'Bridal' ? '#be185d' : item.type === 'Appointment' ? '#0f766e' : '#0369a1',
                                }}>
                                  {item.type === 'Bridal' ? '👑 Bridal' : item.type === 'Appointment' ? '📅 Appt' : '📄 Bill'}: {item.no}
                                </span>
                                {item.staff && (
                                  <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>Staff: {item.staff}</div>
                                )}
                              </td>
                              <td style={{ padding: '12px 12px', color: 'var(--muted)', fontSize: 12 }}>
                                <div>{fmtDate(item.date)}</div>
                                {item.time && <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{item.time}</div>}
                              </td>
                              <td style={{ padding: '12px 12px', textAlign: 'right', fontWeight: 600 }}>{money(item.total)}</td>
                              <td style={{ padding: '12px 12px', textAlign: 'right', color: '#059669', fontWeight: 700 }}>{money(item.paid)}</td>
                              <td style={{ padding: '12px 12px', textAlign: 'right', fontWeight: 900, color: '#dc2626', fontSize: 14 }}>{money(item.balance)}</td>
                              <td style={{ padding: '12px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-primary"
                                    style={{
                                      padding: '5px 12px',
                                      fontSize: 12,
                                      fontWeight: 700,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 5,
                                      background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                                      borderColor: '#059669',
                                      boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)',
                                    }}
                                    onClick={() => openPaymentIn(item)}
                                  >
                                    <ArrowDownLeft size={13} /> 📥 Payment In
                                  </button>

                                  {getWhatsAppReminderUrl(item) && (
                                    <a
                                      href={getWhatsAppReminderUrl(item)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="btn btn-sm"
                                      style={{
                                        padding: '5px 9px',
                                        fontSize: 11.5,
                                        fontWeight: 700,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        background: '#25D366',
                                        color: '#fff',
                                        borderRadius: 6,
                                        textDecoration: 'none',
                                      }}
                                      title="Send WhatsApp Reminder"
                                    >
                                      <MessageCircle size={13} /> WA
                                    </a>
                                  )}

                                  {item.type === 'Appointment' && (
                                    <Link
                                      href={`/admin/billing?appointmentId=${item.id}`}
                                      className="btn btn-sm"
                                      style={{
                                        padding: '5px 9px',
                                        fontSize: 11.5,
                                        fontWeight: 700,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        background: '#0284c7',
                                        color: '#fff',
                                        borderRadius: 6,
                                        textDecoration: 'none',
                                      }}
                                      title="Create Bill"
                                    >
                                      <Receipt size={13} /> Bill
                                    </Link>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ---- EXPANDED DETAILS: TO PAY ---- */}
            <AnimatePresence>
              {toPayExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 14 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.25 }}
                  className="card"
                  style={{ padding: 18, borderLeft: '4px solid #7c3aed', overflow: 'hidden' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>📤 Supplier Pending Payments Details ({pendingPayments.length})</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                        નીચે વેપારીઓ/સપ્લાયરોને ચૂકવવાના બાકી નાણાંની યાદી છે
                      </div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 900, color: '#7c3aed', background: '#f3e8ff', padding: '4px 12px', borderRadius: 20 }}>
                      Total Payable: {money(vyaparStats.toPay)}
                    </div>
                  </div>

                  {pendingPayments.length === 0 ? (
                    <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '20px 0' }}>
                      ✅ કોઈ ચૂકવણી બાકી નથી! બધા સપ્લાયરનું ચૂકવણું થઈ ગયું છે. 🎉
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left', color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            <th style={{ padding: '10px 12px' }}>Supplier / Party</th>
                            <th style={{ padding: '10px 12px' }}>Purchase Bill #</th>
                            <th style={{ padding: '10px 12px' }}>Date</th>
                            <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total Bill</th>
                            <th style={{ padding: '10px 12px', textAlign: 'right' }}>Paid Amount</th>
                            <th style={{ padding: '10px 12px', textAlign: 'right' }}>Pending Payable (આપવાના)</th>
                            <th style={{ padding: '10px 12px', textAlign: 'center' }}>Action (ક્રિયા)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingPayments.map((item) => (
                            <tr key={item.id} style={{ borderBottom: '1px dashed var(--border)' }}>
                              <td style={{ padding: '12px 12px', fontWeight: 700 }}>{item.supplier}</td>
                              <td style={{ padding: '12px 12px' }}>
                                <span style={{
                                  padding: '3px 10px',
                                  borderRadius: 8,
                                  fontSize: 11.5,
                                  fontWeight: 700,
                                  background: '#f3e8ff',
                                  color: '#6b21a8',
                                }}>
                                  🛒 Purchase: {item.no}
                                </span>
                              </td>
                              <td style={{ padding: '12px 12px', color: 'var(--muted)', fontSize: 12 }}>{fmtDate(item.date)}</td>
                              <td style={{ padding: '12px 12px', textAlign: 'right', fontWeight: 600 }}>{money(item.total)}</td>
                              <td style={{ padding: '12px 12px', textAlign: 'right', color: '#059669', fontWeight: 700 }}>{money(item.paid)}</td>
                              <td style={{ padding: '12px 12px', textAlign: 'right', fontWeight: 900, color: '#dc2626', fontSize: 14 }}>{money(item.balance)}</td>
                              <td style={{ padding: '12px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                <button
                                  type="button"
                                  className="btn btn-sm"
                                  style={{
                                    padding: '5px 12px',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    background: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)',
                                    color: '#fff',
                                    border: 'none',
                                    boxShadow: '0 2px 6px rgba(147, 51, 234, 0.25)',
                                  }}
                                  onClick={() => openPaymentOut(item)}
                                >
                                  <ArrowUpRight size={13} /> 📤 Payment Out
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

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
                <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>UPI + Card + Bank (Cash સિવાય)</span>
                  <span style={{ fontWeight: 700, color: '#2563eb' }}>{bankExpanded ? 'Close ▲' : 'Breakdown ▼'}</span>
                </div>

                {/* Quick Action buttons */}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }} onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    style={{ fontSize: 11.5, padding: '4px 10px', height: 30, flex: 1, gap: 4 }}
                    onClick={() => openNewTransfer()}
                  >
                    <ArrowRightLeft size={13} /> 💸 Transfer Funds
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    style={{ fontSize: 11.5, padding: '4px 10px', height: 30, flex: 1, gap: 4 }}
                    onClick={() => setActiveTab('banks')}
                  >
                    <Building2 size={13} /> 🏦 Manage Banks
                  </button>
                </div>

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

        {/* ======== PAYMENT IN (ALL CUSTOMER COLLECTIONS) TAB ======== */}
        {activeTab === 'payment-in' && (
          <motion.div key="payment-in-list" variants={fadeSlideUp} initial="hidden" animate="visible" exit="exit">
            {/* Main Toolbar */}
            <div className="toolbar" style={{ justifyContent: 'space-between', marginTop: 16, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', gap: 10, flex: 1, minWidth: 320, flexWrap: 'wrap', alignItems: 'center' }}>
                <div className="search-wrap" style={{ flex: 1, minWidth: 220, maxWidth: 360 }}>
                  <Search size={15} className="search-icon" />
                  <input
                    type="search"
                    className="input"
                    placeholder="Search Customer, Mobile, Bill #…"
                    value={paymentInSearch}
                    onChange={(e) => setPaymentInSearch(e.target.value)}
                  />
                </div>

                <select
                  className="input"
                  style={{ width: 'auto', minWidth: 185, padding: '7px 12px', fontSize: 13, color: 'var(--text)' }}
                  value={paymentInTypeFilter}
                  onChange={(e) => setPaymentInTypeFilter(e.target.value)}
                >
                  <option value="All">All Types (તમામ એન્ટ્રીઓ)</option>
                  <option value="invoice-payment">📄 Sales Bills (બિલ ચુકવણી)</option>
                  <option value="voucher">📥 Payment Vouchers (વાઉચર્સ)</option>
                  <option value="invoice-advance">🔖 Bill Advances (એડવાન્સ)</option>
                  <option value="bridal-advance">👑 Bridal Advances (બ્રાઇડલ)</option>
                  <option value="appointment-advance">📅 Appt Advances (એપોઇન્ટમેન્ટ)</option>
                </select>

                <select
                  className="input"
                  style={{ width: 'auto', minWidth: 150, padding: '7px 12px', fontSize: 13, color: 'var(--text)' }}
                  value={paymentInModeFilter}
                  onChange={(e) => setPaymentInModeFilter(e.target.value)}
                >
                  <option value="All">All Modes (તમામ મોડ)</option>
                  {paymentModes.map((m) => (
                    <option key={m} value={m}>
                      {m === 'Cash' ? '💵 Cash' : m.includes('UPI') || m.includes('GPay') || m.includes('PhonePe') ? `📱 ${m}` : m === 'Card' ? `💳 Card` : `🏦 ${m}`}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <motion.button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setSelectPendingModalOpen(true)}
                  whileTap={{ scale: 0.97 }}
                  style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', borderColor: '#059669', gap: 6 }}
                >
                  <Plus size={15} /> + Record Payment In (નાણાં જમા કરો)
                </motion.button>
              </div>
            </div>

            {/* Table or Empty State */}
            <div className="card" style={{ marginTop: 12 }}>
              {filteredPaymentInList.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 20px' }}>
                  <div style={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    background: '#dcfce7',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 14px',
                  }}>
                    <ArrowDownLeft size={30} />
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 800 }}>
                    {paymentInSearch || paymentInModeFilter !== 'All' || paymentInTypeFilter !== 'All'
                      ? 'No matching Payment In entries found'
                      : 'હજી સુધી કોઈ Payment In એન્ટ્રી નોંધાયેલ નથી'}
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 450, margin: '6px auto 16px' }}>
                    ગ્રાહક પાસેથી બિલ, એડવાન્સ અથવા વાઉચર દ્વારા જમા થયેલા તમામ નાણાં અહીં જોવા મળશે.
                  </p>
                  {pendingCollections.length > 0 && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => setSelectPendingModalOpen(true)}
                      style={{ gap: 6, background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', borderColor: '#059669' }}
                    >
                      <Plus size={14} /> Collect from Pending ({pendingCollections.length} Parties)
                    </button>
                  )}
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Type & Doc / Voucher #</th>
                        <th>Date (તારીખ)</th>
                        <th>Customer / Party (ગ્રાહક)</th>
                        <th>Payment Mode</th>
                        <th style={{ textAlign: 'right' }}>Amount Received (જમા)</th>
                        <th>Notes / Purpose</th>
                        <th style={{ textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <motion.tbody variants={staggerContainer} initial="hidden" animate="visible">
                      {filteredPaymentInList.map((v) => {
                        const isCash = v.mode?.toLowerCase() === 'cash';
                        const isUpi = v.mode?.toLowerCase().includes('upi') || v.mode?.toLowerCase().includes('gpay') || v.mode?.toLowerCase().includes('phonepe');
                        const isCard = v.mode?.toLowerCase() === 'card';

                        return (
                          <motion.tr key={v.id} variants={fadeSlideUp}>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                                <span style={{
                                  fontSize: 10.5,
                                  fontWeight: 800,
                                  padding: '2px 8px',
                                  borderRadius: 6,
                                  background: v.badgeBg,
                                  color: v.badgeColor,
                                  border: `1px solid ${v.badgeBorder}`,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}>
                                  {v.typeLabel}
                                </span>
                                <span style={{
                                  fontWeight: 800,
                                  fontSize: 12.5,
                                  fontFamily: 'monospace',
                                  color: 'var(--text)',
                                }}>
                                  {v.docNo}
                                </span>
                              </div>
                            </td>

                            <td style={{ color: 'var(--muted)', fontSize: 12 }}>
                              {fmtDate(v.date)}
                            </td>

                            <td>
                              <div style={{ fontWeight: 700, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <User size={14} style={{ color: '#2563eb' }} />
                                <span>{v.partyName}</span>
                              </div>
                              {v.partyMobile && v.partyMobile !== '-' && (
                                <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                  <Phone size={11} />
                                  <span>{v.partyMobile}</span>
                                </div>
                              )}
                            </td>

                            <td>
                              <span style={{
                                padding: '3px 10px',
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                background: isCash ? '#fef3c7' : isUpi ? '#dbeafe' : isCard ? '#ede9fe' : '#f1f5f9',
                                color: isCash ? '#92400e' : isUpi ? '#1e40af' : isCard ? '#6b21a8' : '#334155',
                              }}>
                                {isCash ? '💵 Cash' : isUpi ? `📱 ${v.mode}` : isCard ? `💳 Card` : `🏦 ${v.mode}`}
                              </span>
                            </td>

                            <td style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 900, color: '#059669', fontSize: 14.5 }}>
                                +{money(v.amount)}
                              </div>
                            </td>

                            <td style={{ color: 'var(--muted)', fontSize: 12, maxWidth: 240 }}>
                              {v.notes || '—'}
                            </td>

                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
                                {/* Edit Button */}
                                <button
                                  type="button"
                                  className="btn-icon"
                                  onClick={() => handleOpenEditPaymentEntry(v)}
                                  title="Edit Payment In Entry (રકમ / મોડ / તારીખ સુધારો)"
                                  style={{
                                    color: '#2563eb',
                                    background: '#eff6ff',
                                    border: '1px solid #bfdbfe',
                                    width: 30,
                                    height: 30,
                                    borderRadius: 6,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <Pencil size={13} />
                                </button>

                                {/* View Bill / Receipt Button if invoiceId exists */}
                                {v.invoiceId && (
                                  <button
                                    type="button"
                                    className="btn-icon"
                                    onClick={() => {
                                      const inv = invoices.find((i) => i.id === v.invoiceId);
                                      if (inv) setReceiptModalInv(inv);
                                    }}
                                    title="View Bill Receipt (બિલ રસીદ જુઓ / પ્રિન્ટ કરો)"
                                    style={{
                                      color: '#059669',
                                      background: '#ecfdf5',
                                      border: '1px solid #a7f3d0',
                                      width: 30,
                                      height: 30,
                                      borderRadius: 6,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <Receipt size={13} />
                                  </button>
                                )}

                                {/* Delete Button */}
                                <button
                                  type="button"
                                  className="btn-icon danger"
                                  onClick={() => setDeletePaymentEntry(v)}
                                  title="Delete Payment In (ડિલીટ કરો & બેલેન્સ રીવર્ટ કરો)"
                                  style={{
                                    color: '#dc2626',
                                    background: '#fef2f2',
                                    border: '1px solid #fecaca',
                                    width: 30,
                                    height: 30,
                                    borderRadius: 6,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </motion.tbody>
                  </table>
                </div>
              )}
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
        {/* Tab 5: Bank Accounts & Fund Transfers */}
        {activeTab === 'banks' && (
          <motion.div key="banks" variants={fadeSlideUp} initial="hidden" animate="visible" exit="exit">
            {/* Header Action Bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 16,
              marginBottom: 16,
              flexWrap: 'wrap',
              gap: 12,
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>🏦 Bank Accounts & Fund Transfers</span>
                  <span style={{ fontSize: 12, fontWeight: 700, background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: 20 }}>
                    {bankAccounts.length} Accounts
                  </span>
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--muted)' }}>
                  Manage salon bank accounts, view live balances, and transfer funds between Cash & Banks.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ gap: 6, fontWeight: 800 }}
                  onClick={() => openNewTransfer()}
                >
                  <ArrowRightLeft size={16} />
                  <span>💸 Transfer Money (Cash ↔ Bank)</span>
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ gap: 6, fontWeight: 700 }}
                  onClick={openNewBank}
                >
                  <Plus size={16} />
                  <span>➕ Add Bank Account</span>
                </button>
              </div>
            </div>

            {/* Top Summary KPI Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 14,
              marginBottom: 20,
            }}>
              {/* Total Bank Balance */}
              <div style={{
                background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                borderRadius: 14,
                padding: '18px 20px',
                color: '#fff',
                boxShadow: '0 4px 20px rgba(37,99,235,0.25)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>
                    Total Bank & UPI Balance
                  </span>
                  <Landmark size={18} style={{ opacity: 0.8 }} />
                </div>
                <div style={{ fontSize: 26, fontWeight: 900 }}>{money(vyaparStats.bankBalance)}</div>
                <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>All non-cash bank & UPI funds</div>
              </div>

              {/* Cash in Hand */}
              <div style={{
                background: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)',
                borderRadius: 14,
                padding: '18px 20px',
                color: '#fff',
                boxShadow: '0 4px 20px rgba(16,185,129,0.25)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>
                    Cash in Hand (રોકડ)
                  </span>
                  <Banknote size={18} style={{ opacity: 0.8 }} />
                </div>
                <div style={{ fontSize: 26, fontWeight: 900 }}>{money(vyaparStats.cashInHand)}</div>
                <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>Physical cash in salon drawer</div>
              </div>

              {/* Registered Accounts */}
              <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #7c3aed' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                    Active Bank Accounts
                  </span>
                  <Building2 size={18} style={{ color: '#7c3aed' }} />
                </div>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#7c3aed' }}>{bankAccounts.length}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Configured bank accounts</div>
              </div>

              {/* Total Transfers */}
              <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #f59e0b' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                    Transfers Done
                  </span>
                  <ArrowRightLeft size={18} style={{ color: '#f59e0b' }} />
                </div>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#d97706' }}>{accountTransfers.length}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Cash ↔ Bank transaction logs</div>
              </div>
            </div>

            {/* SECTION 1: BANK ACCOUNTS GRID */}
            <div className="card" style={{ padding: 22, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>
                    🏦 Salon Bank Accounts List
                  </h4>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
                    All accounts where online payments, UPI, and cheques are deposited.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={openNewBank}
                  style={{ gap: 4, fontSize: 12 }}
                >
                  <Plus size={14} /> Add Bank Account
                </button>
              </div>

              {bankAccounts.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  background: '#f8fafc',
                  borderRadius: 14,
                  border: '1.5px dashed var(--border)',
                }}>
                  <div style={{ fontSize: 42, marginBottom: 10 }}>🏦</div>
                  <h4 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800 }}>No Bank Accounts Added Yet</h4>
                  <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--muted)', maxWidth: 460, marginInline: 'auto' }}>
                    Add your salon bank accounts (like HDFC Bank, SBI Current, ICICI) to accurately track bank balances and make Cash ↔ Bank transfers.
                  </p>
                  <button type="button" className="btn btn-primary" onClick={openNewBank} style={{ gap: 6 }}>
                    <Plus size={16} /> Add Your First Bank Account
                  </button>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: 16,
                }}>
                  {bankAccounts.map((b) => {
                    const stats = getBankStats(b.name);
                    const isPositive = stats.balance >= 0;
                    return (
                      <div
                        key={b.id}
                        style={{
                          background: '#ffffff',
                          border: '1.5px solid var(--border)',
                          borderRadius: 14,
                          padding: '18px 20px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {/* Card Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 42,
                              height: 42,
                              borderRadius: 12,
                              background: '#eff6ff',
                              color: '#2563eb',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 900,
                              fontSize: 18,
                            }}>
                              <Building2 size={22} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>{b.name}</div>
                              {b.bankName && b.bankName !== b.name && (
                                <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{b.bankName}</div>
                              )}
                            </div>
                          </div>
                          <span style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 20,
                            background: '#dcfce7',
                            color: '#15803d',
                          }}>
                            Active
                          </span>
                        </div>

                        {/* Account Details */}
                        <div style={{
                          background: '#f8fafc',
                          borderRadius: 10,
                          padding: '10px 12px',
                          fontSize: 12,
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '6px 12px',
                        }}>
                          {b.accountNo && (
                            <div>
                              <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600 }}>A/C NUMBER</div>
                              <div style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                                •••• {b.accountNo.slice(-4) || b.accountNo}
                              </div>
                            </div>
                          )}
                          {b.ifsc && (
                            <div>
                              <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600 }}>IFSC CODE</div>
                              <div style={{ fontWeight: 700, fontFamily: 'monospace' }}>{b.ifsc}</div>
                            </div>
                          )}
                          {b.branch && (
                            <div>
                              <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600 }}>BRANCH</div>
                              <div style={{ fontWeight: 600 }}>{b.branch}</div>
                            </div>
                          )}
                          {b.upiId && (
                            <div>
                              <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600 }}>UPI ID</div>
                              <div style={{ fontWeight: 700, color: '#2563eb' }}>{b.upiId}</div>
                            </div>
                          )}
                          {Number(b.openingBalance || 0) > 0 && (
                            <div style={{ gridColumn: '1 / -1' }}>
                              <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600 }}>OPENING BALANCE</div>
                              <div style={{ fontWeight: 700 }}>{money(b.openingBalance || 0)}</div>
                            </div>
                          )}
                        </div>

                        {/* Flow stats */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, padding: '0 4px' }}>
                          <span style={{ color: 'var(--muted)' }}>
                            ↓ Total In: <b style={{ color: '#059669' }}>{money(stats.inflow)}</b>
                          </span>
                          <span style={{ color: 'var(--muted)' }}>
                            ↑ Total Out: <b style={{ color: '#dc2626' }}>{money(stats.outflow)}</b>
                          </span>
                        </div>

                        {/* Current Balance Bar */}
                        <div style={{
                          background: isPositive ? '#f0fdf4' : '#fef2f2',
                          border: `1px solid ${isPositive ? '#bbf7d0' : '#fecaca'}`,
                          borderRadius: 10,
                          padding: '10px 14px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}>
                          <div>
                            <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                              Current Live Balance
                            </div>
                            <div style={{
                              fontSize: 20,
                              fontWeight: 900,
                              color: isPositive ? '#15803d' : '#b91c1c',
                            }}>
                              {money(stats.balance)}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              style={{ fontSize: 11, padding: '4px 8px', height: 28 }}
                              onClick={() => openNewTransfer('Cash', b.name)}
                              title="Deposit Cash into this Bank"
                            >
                              <ArrowDownLeft size={13} /> Deposit
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              style={{ fontSize: 11, padding: '4px 8px', height: 28 }}
                              onClick={() => openNewTransfer(b.name, 'Cash')}
                              title="Withdraw Cash from this Bank"
                            >
                              <ArrowUpRight size={13} /> Withdraw
                            </button>
                          </div>
                        </div>

                        {/* Actions Footer */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          gap: 6,
                          borderTop: '1px solid var(--border)',
                          paddingTop: 10,
                        }}>
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => openEditBank(b)}
                            title="Edit Bank Account Details"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn-icon danger"
                            onClick={() => setDeleteBankId(b.id)}
                            title="Delete Bank Account"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SECTION 2: FUND TRANSFERS HISTORY (CASH ↔ BANK) */}
            <div className="card" style={{ padding: 22 }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
                flexWrap: 'wrap',
                gap: 10,
              }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>
                    💸 Cash ↔ Bank Fund Transfers History ({accountTransfers.length})
                  </h4>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
                    Log of all money moved between Cash Drawer and Bank Accounts.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => openNewTransfer()}
                  style={{ gap: 6, fontSize: 12 }}
                >
                  <ArrowRightLeft size={14} /> New Transfer
                </button>
              </div>

              {accountTransfers.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '30px 20px',
                  background: '#f8fafc',
                  borderRadius: 12,
                  border: '1px dashed var(--border)',
                  color: 'var(--muted)',
                  fontSize: 13,
                }}>
                  💸 No fund transfers recorded yet. Use <b>"New Transfer"</b> to deposit Cash in Bank or withdraw Bank funds to Cash.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{
                        borderBottom: '2px solid var(--border)',
                        textAlign: 'left',
                        color: 'var(--muted)',
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}>
                        <th style={{ padding: '10px 12px' }}>Transfer #</th>
                        <th style={{ padding: '10px 12px' }}>Date</th>
                        <th style={{ padding: '10px 12px' }}>From (ક્યાંથી)</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center' }}>➔</th>
                        <th style={{ padding: '10px 12px' }}>To (ક્યાં)</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Amount (₹)</th>
                        <th style={{ padding: '10px 12px' }}>Notes / Purpose</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accountTransfers.map((t) => {
                        const isFromCash = t.from.toLowerCase() === 'cash';
                        const isToCash = t.to.toLowerCase() === 'cash';
                        return (
                          <tr key={t.id} style={{ borderBottom: '1px dashed var(--border)' }}>
                            <td style={{ padding: '12px 12px', fontWeight: 800 }}>
                              <span style={{
                                background: '#f1f5f9',
                                padding: '3px 8px',
                                borderRadius: 6,
                                fontSize: 11.5,
                                fontFamily: 'monospace',
                              }}>
                                {t.transferNo}
                              </span>
                            </td>
                            <td style={{ padding: '12px 12px', color: 'var(--muted)', fontSize: 12 }}>
                              {fmtDate(t.date)}
                            </td>
                            <td style={{ padding: '12px 12px' }}>
                              <span style={{
                                padding: '3px 10px',
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 700,
                                background: isFromCash ? '#fee2e2' : '#e0f2fe',
                                color: isFromCash ? '#991b1b' : '#0369a1',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}>
                                {isFromCash ? '💵 Cash Drawer' : `🏦 ${t.fromName || t.from}`}
                              </span>
                            </td>
                            <td style={{ padding: '12px 12px', textAlign: 'center', color: 'var(--muted)', fontWeight: 800 }}>
                              ➔
                            </td>
                            <td style={{ padding: '12px 12px' }}>
                              <span style={{
                                padding: '3px 10px',
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 700,
                                background: isToCash ? '#dcfce7' : '#e0e7ff',
                                color: isToCash ? '#166534' : '#3730a3',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}>
                                {isToCash ? '💵 Cash Drawer' : `🏦 ${t.toName || t.to}`}
                              </span>
                            </td>
                            <td style={{ padding: '12px 12px', textAlign: 'right', fontWeight: 900, fontSize: 14, color: 'var(--text)' }}>
                              {money(t.amount)}
                            </td>
                            <td style={{ padding: '12px 12px', color: 'var(--muted)', fontSize: 12 }}>
                              {t.notes || '—'}
                            </td>
                            <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                              <button
                                type="button"
                                className="btn-icon danger"
                                onClick={() => setDeleteTransferId(t.id)}
                                title="Delete Transfer Record"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
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

          <div className="form-group">
            <label className="label">Paid To / Recipient</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Building Landlord, Milkman, Tea Stall"
              {...register('paidTo')}
            />
          </div>

          <div className="form-group">
            <label className="label">Notes / Description</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Electricity bill / Laundry"
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

      {/* Add / Edit Bank Account Modal */}
      <Modal
        isOpen={bankModalOpen}
        onClose={() => {
          setBankModalOpen(false);
          setEditBankId(null);
        }}
        title={editBankId ? `✎ Edit Bank Account` : `🏦 Add New Bank Account`}
        footer={
          <>
            <button
              className="btn btn-ghost"
              onClick={() => {
                setBankModalOpen(false);
                setEditBankId(null);
              }}
            >
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSaveBank}>
              {editBankId ? 'Update Bank Account' : 'Save Bank Account'}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="label">Account / Bank Name *</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. HDFC Current Account, SBI Savings, Kotak Bank"
              value={bankForm.name || ''}
              onChange={(e) => setBankForm({ ...bankForm, name: e.target.value })}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="label">Account Number</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. 50200012345678"
              value={bankForm.accountNo || ''}
              onChange={(e) => setBankForm({ ...bankForm, accountNo: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="label">IFSC Code</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. HDFC0001234"
              value={bankForm.ifsc || ''}
              onChange={(e) => setBankForm({ ...bankForm, ifsc: e.target.value.toUpperCase() })}
            />
          </div>

          <div className="form-group">
            <label className="label">Branch Name / City</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Palanpur Branch, Surat"
              value={bankForm.branch || ''}
              onChange={(e) => setBankForm({ ...bankForm, branch: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="label">UPI ID / QR Account</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. shreebeauty@okhdfcbank"
              value={bankForm.upiId || ''}
              onChange={(e) => setBankForm({ ...bankForm, upiId: e.target.value })}
            />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="label">Opening Balance (₹)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="input"
              placeholder="₹ Existing bank balance to start with (e.g. 15000)"
              value={bankForm.openingBalance ?? 0}
              onChange={(e) => setBankForm({ ...bankForm, openingBalance: Number(e.target.value) || 0 })}
            />
            <span style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, display: 'block' }}>
              💡 Enter starting balance of this bank account before transactions.
            </span>
          </div>
        </div>
      </Modal>

      {/* Delete Bank Account Modal */}
      {deleteBankId && (
        <Modal
          isOpen={!!deleteBankId}
          onClose={() => setDeleteBankId(null)}
          title="Delete Bank Account?"
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setDeleteBankId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDeleteBank(deleteBankId)}>Delete Bank</button>
            </>
          }
        >
          <p>
            Are you sure you want to delete <b>{bankAccounts.find((b) => b.id === deleteBankId)?.name}</b>?
          </p>
        </Modal>
      )}

      {/* Fund Transfer Modal (Cash ↔ Bank / Bank ↔ Bank) */}
      <Modal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        title="💸 Transfer Funds (Cash ↔ Bank / Bank ↔ Bank)"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setTransferModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSaveTransfer} style={{ gap: 6 }}>
              <CheckCircle2 size={16} /> Complete Transfer
            </button>
          </>
        }
      >
        <div className="form-grid">
          {/* Quick Direction Presets */}
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="label">Quick Transfer Presets</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
              <button
                type="button"
                className="btn btn-sm"
                style={{
                  background: transferForm.from === 'Cash' && transferForm.to !== 'Cash' ? '#dbeafe' : '#f8fafc',
                  borderColor: transferForm.from === 'Cash' && transferForm.to !== 'Cash' ? '#2563eb' : 'var(--border)',
                  color: transferForm.from === 'Cash' && transferForm.to !== 'Cash' ? '#1d4ed8' : 'var(--text)',
                  fontWeight: 700,
                  fontSize: 11.5,
                  padding: '8px 10px',
                }}
                onClick={() => {
                  const firstBank = bankAccounts[0]?.name || 'GPay UPI';
                  setTransferForm({ ...transferForm, from: 'Cash', to: firstBank });
                }}
              >
                💵 Cash ➔ 🏦 Bank<br /><span style={{ fontSize: 10, fontWeight: 500, opacity: 0.8 }}>(Cash Deposit)</span>
              </button>

              <button
                type="button"
                className="btn btn-sm"
                style={{
                  background: transferForm.from !== 'Cash' && transferForm.to === 'Cash' ? '#dcfce7' : '#f8fafc',
                  borderColor: transferForm.from !== 'Cash' && transferForm.to === 'Cash' ? '#16a34a' : 'var(--border)',
                  color: transferForm.from !== 'Cash' && transferForm.to === 'Cash' ? '#15803d' : 'var(--text)',
                  fontWeight: 700,
                  fontSize: 11.5,
                  padding: '8px 10px',
                }}
                onClick={() => {
                  const firstBank = bankAccounts[0]?.name || 'GPay UPI';
                  setTransferForm({ ...transferForm, from: firstBank, to: 'Cash' });
                }}
              >
                🏦 Bank ➔ 💵 Cash<br /><span style={{ fontSize: 10, fontWeight: 500, opacity: 0.8 }}>(Cash Withdrawal)</span>
              </button>

              {bankAccounts.length >= 2 && (
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{
                    background: transferForm.from !== 'Cash' && transferForm.to !== 'Cash' ? '#f3e8ff' : '#f8fafc',
                    borderColor: transferForm.from !== 'Cash' && transferForm.to !== 'Cash' ? '#9333ea' : 'var(--border)',
                    color: transferForm.from !== 'Cash' && transferForm.to !== 'Cash' ? '#7e22ce' : 'var(--text)',
                    fontWeight: 700,
                    fontSize: 11.5,
                    padding: '8px 10px',
                  }}
                  onClick={() => {
                    setTransferForm({ ...transferForm, from: bankAccounts[0]?.name || '', to: bankAccounts[1]?.name || '' });
                  }}
                >
                  🏦 Bank ➔ 🏦 Bank<br /><span style={{ fontSize: 10, fontWeight: 500, opacity: 0.8 }}>(Inter-Bank)</span>
                </button>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="label">From Account (ક્યાંથી) *</label>
            <select
              className="input"
              value={transferForm.from}
              onChange={(e) => {
                const newFrom = e.target.value;
                const newTo = transferForm.to === newFrom ? (newFrom === 'Cash' ? (bankAccounts[0]?.name || 'Bank') : 'Cash') : transferForm.to;
                setTransferForm({ ...transferForm, from: newFrom, to: newTo });
              }}
            >
              {availableTransferAccounts.map((acc) => (
                <option key={acc} value={acc}>
                  {acc === 'Cash' ? '💵 Cash Drawer' : `🏦 ${acc}`}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="label">To Account (ક્યાં) *</label>
            <select
              className="input"
              value={transferForm.to}
              onChange={(e) => setTransferForm({ ...transferForm, to: e.target.value })}
            >
              <option value="" disabled>Select destination</option>
              {availableTransferAccounts
                .filter((acc) => acc !== transferForm.from)
                .map((acc) => (
                  <option key={acc} value={acc}>
                    {acc === 'Cash' ? '💵 Cash Drawer' : `🏦 ${acc}`}
                  </option>
                ))}
            </select>
          </div>

          <div className="form-group">
            <label className="label">Transfer Amount (₹) *</label>
            <input
              type="number"
              min={1}
              step="0.01"
              className="input"
              placeholder="₹ Amount to transfer"
              value={transferForm.amount}
              onChange={(e) => setTransferForm({ ...transferForm, amount: Number(e.target.value) || '' })}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="label">Transfer Date *</label>
            <input
              type="date"
              className="input"
              value={transferForm.date}
              onChange={(e) => setTransferForm({ ...transferForm, date: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="label">Notes / Purpose</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Daily cash deposit / ATM withdrawal"
              value={transferForm.notes}
              onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
            />
          </div>
        </div>
      </Modal>

      {/* Delete Transfer Modal */}
      {deleteTransferId && (
        <Modal
          isOpen={!!deleteTransferId}
          onClose={() => setDeleteTransferId(null)}
          title="Delete Transfer Record?"
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setDeleteTransferId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDeleteTransfer(deleteTransferId)}>Delete Transfer</button>
            </>
          }
        >
          <p>Are you sure you want to delete this fund transfer record?</p>
        </Modal>
      )}

      {/* Payment In (Customer Collection) Modal */}
      <Modal
        isOpen={paymentInModalOpen}
        onClose={() => {
          setPaymentInModalOpen(false);
          setPaymentInItem(null);
        }}
        title="📥 Payment In (ગ્રાહક નાણાં જમા કરો)"
        footer={
          <>
            <button
              className="btn btn-ghost"
              onClick={() => {
                setPaymentInModalOpen(false);
                setPaymentInItem(null);
              }}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', borderColor: '#059669' }}
              onClick={handleSavePaymentIn}
            >
              <CheckCircle2 size={15} /> Confirm Payment In (જમા કરો)
            </button>
          </>
        }
      >
        {paymentInItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Customer Summary Compact Strip */}
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 8,
              padding: '8px 12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13.5, fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <User size={15} /> {paymentInItem.name}
                </span>
                {paymentInItem.mobile && paymentInItem.mobile !== '-' && (
                  <span style={{ fontSize: 11.5, color: '#15803d', fontWeight: 600 }}>
                    📞 {paymentInItem.mobile}
                  </span>
                )}
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 800,
                  background: paymentInItem.type === 'Bridal' ? '#fce7f3' : paymentInItem.type === 'Appointment' ? '#ccfbf1' : '#e0f2fe',
                  color: paymentInItem.type === 'Bridal' ? '#be185d' : paymentInItem.type === 'Appointment' ? '#0f766e' : '#0369a1',
                }}>
                  {paymentInItem.type === 'Bridal' ? '👑 Bridal' : paymentInItem.type === 'Appointment' ? '📅 Appt' : '📄 Bill'}: {paymentInItem.no}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                <span>Total: <b>{money(paymentInItem.total)}</b></span>
                <span style={{ color: '#059669' }}>Paid: <b>{money(paymentInItem.paid)}</b></span>
                <span style={{ color: '#dc2626', fontWeight: 900, background: '#fee2e2', padding: '2px 8px', borderRadius: 6 }}>
                  Pending: {money(paymentInItem.balance)}
                </span>
              </div>
            </div>

            {/* Form Fields - 2x2 Grid */}
            <div className="form-grid" style={{ gap: 10 }}>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <label className="label" style={{ margin: 0, fontSize: 12 }}>Receiving Amount (₹) *</label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      style={{
                        padding: '1px 6px',
                        fontSize: 10.5,
                        fontWeight: 700,
                        background: '#dcfce7',
                        color: '#15803d',
                        border: '1px solid #86efac',
                        borderRadius: 4,
                        cursor: 'pointer',
                      }}
                      onClick={() => setPaymentInAmount(paymentInItem.balance)}
                    >
                      Full
                    </button>
                    {paymentInItem.balance > 100 && (
                      <button
                        type="button"
                        style={{
                          padding: '1px 6px',
                          fontSize: 10.5,
                          fontWeight: 700,
                          background: '#f1f5f9',
                          color: '#475569',
                          border: '1px solid var(--border)',
                          borderRadius: 4,
                          cursor: 'pointer',
                        }}
                        onClick={() => setPaymentInAmount(Math.round(paymentInItem.balance / 2))}
                      >
                        50%
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="number"
                  min={1}
                  max={paymentInItem.balance}
                  step="any"
                  className="input"
                  style={{ fontSize: 14, fontWeight: 800, color: '#059669', height: 36 }}
                  placeholder="₹ Amount"
                  value={paymentInAmount}
                  onChange={(e) => setPaymentInAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="label" style={{ marginBottom: 2, fontSize: 12 }}>Payment Mode *</label>
                <select
                  className="input"
                  style={{ height: 36 }}
                  value={paymentInMode}
                  onChange={(e) => setPaymentInMode(e.target.value)}
                >
                  {paymentModes.map((m) => (
                    <option key={m} value={m}>
                      {m === 'Cash' ? '💵 Cash' : m.includes('UPI') || m.includes('GPay') || m.includes('PhonePe') ? `📱 ${m}` : m === 'Card' ? `💳 Card` : `🏦 ${m}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="label" style={{ marginBottom: 2, fontSize: 12 }}>Payment Date *</label>
                <input
                  type="date"
                  className="input"
                  style={{ height: 36 }}
                  value={paymentInDate}
                  onChange={(e) => setPaymentInDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="label" style={{ marginBottom: 2, fontSize: 12 }}>Notes / Reference</label>
                <input
                  type="text"
                  className="input"
                  style={{ height: 36 }}
                  placeholder="e.g. Cleared balance / UPI Ref"
                  value={paymentInNotes}
                  onChange={(e) => setPaymentInNotes(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Payment Out (Supplier Payment) Modal */}
      <Modal
        isOpen={paymentOutModalOpen}
        onClose={() => {
          setPaymentOutModalOpen(false);
          setPaymentOutItem(null);
        }}
        title="📤 Payment Out (સપ્લાયરને ચૂકવણી કરો)"
        footer={
          <>
            <button
              className="btn btn-ghost"
              onClick={() => {
                setPaymentOutModalOpen(false);
                setPaymentOutItem(null);
              }}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)', borderColor: '#7c3aed' }}
              onClick={handleSavePaymentOut}
            >
              <CheckCircle2 size={15} /> Confirm Payment Out (ચૂકવો)
            </button>
          </>
        }
      >
        {paymentOutItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Supplier Summary Compact Strip */}
            <div style={{
              background: '#f5f3ff',
              border: '1px solid #ddd6fe',
              borderRadius: 8,
              padding: '8px 12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13.5, fontWeight: 800, color: '#6b21a8', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Building2 size={15} /> {paymentOutItem.supplier}
                </span>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 800,
                  background: '#ede9fe',
                  color: '#6b21a8',
                }}>
                  🛒 Purchase: {paymentOutItem.no}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                <span>Total: <b>{money(paymentOutItem.total)}</b></span>
                <span style={{ color: '#059669' }}>Paid: <b>{money(paymentOutItem.paid)}</b></span>
                <span style={{ color: '#dc2626', fontWeight: 900, background: '#fee2e2', padding: '2px 8px', borderRadius: 6 }}>
                  Payable: {money(paymentOutItem.balance)}
                </span>
              </div>
            </div>

            {/* Form Fields - 2x2 Grid */}
            <div className="form-grid" style={{ gap: 10 }}>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <label className="label" style={{ margin: 0, fontSize: 12 }}>Paying Amount (₹) *</label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      style={{
                        padding: '1px 6px',
                        fontSize: 10.5,
                        fontWeight: 700,
                        background: '#ede9fe',
                        color: '#6b21a8',
                        border: '1px solid #c4b5fd',
                        borderRadius: 4,
                        cursor: 'pointer',
                      }}
                      onClick={() => setPaymentOutAmount(paymentOutItem.balance)}
                    >
                      Full
                    </button>
                    {paymentOutItem.balance > 100 && (
                      <button
                        type="button"
                        style={{
                          padding: '1px 6px',
                          fontSize: 10.5,
                          fontWeight: 700,
                          background: '#f1f5f9',
                          color: '#475569',
                          border: '1px solid var(--border)',
                          borderRadius: 4,
                          cursor: 'pointer',
                        }}
                        onClick={() => setPaymentOutAmount(Math.round(paymentOutItem.balance / 2))}
                      >
                        50%
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="number"
                  min={1}
                  max={paymentOutItem.balance}
                  step="any"
                  className="input"
                  style={{ fontSize: 14, fontWeight: 800, color: '#7c3aed', height: 36 }}
                  placeholder="₹ Amount"
                  value={paymentOutAmount}
                  onChange={(e) => setPaymentOutAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="label" style={{ marginBottom: 2, fontSize: 12 }}>Payment Mode *</label>
                <select
                  className="input"
                  style={{ height: 36 }}
                  value={paymentOutMode}
                  onChange={(e) => setPaymentOutMode(e.target.value)}
                >
                  {paymentModes.map((m) => (
                    <option key={m} value={m}>
                      {m === 'Cash' ? '💵 Cash' : m.includes('UPI') || m.includes('GPay') || m.includes('PhonePe') ? `📱 ${m}` : m === 'Card' ? `💳 Card` : `🏦 ${m}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="label" style={{ marginBottom: 2, fontSize: 12 }}>Payment Date *</label>
                <input
                  type="date"
                  className="input"
                  style={{ height: 36 }}
                  value={paymentOutDate}
                  onChange={(e) => setPaymentOutDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="label" style={{ marginBottom: 2, fontSize: 12 }}>Notes / Reference</label>
                <input
                  type="text"
                  className="input"
                  style={{ height: 36 }}
                  placeholder="e.g. Paid via NEFT / Cheque"
                  value={paymentOutNotes}
                  onChange={(e) => setPaymentOutNotes(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Payment In Voucher Confirmation Modal */}
      {deleteVoucherId && (
        <Modal
          isOpen={!!deleteVoucherId}
          onClose={() => setDeleteVoucherId(null)}
          title="🗑️ Delete Payment In Voucher?"
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setDeleteVoucherId(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={() => handleDeleteVoucher(deleteVoucherId)}>
                Delete & Revert Balance
              </button>
            </>
          }
        >
          <p style={{ margin: 0, fontSize: 14 }}>
            Are you sure you want to delete Payment In Voucher <b>{vouchers.find((v) => v.id === deleteVoucherId)?.voucherNo}</b> ({money(vouchers.find((v) => v.id === deleteVoucherId)?.amount || 0)}) of <b>{vouchers.find((v) => v.id === deleteVoucherId)?.partyName}</b>?
          </p>
          <div style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            color: '#92400e',
            borderRadius: 8,
            padding: '10px 12px',
            fontSize: 12,
            marginTop: 12,
          }}>
            ⚠️ <b>Note:</b> આ વાઉચર ડિલીટ કરવાથી ગ્રાહકનું બિલ / બ્રાઇડલ બેલેન્સ ફરીથી બાકી (Pending) થઈ જશે.
          </div>
        </Modal>
      )}

      {/* Select Pending Customer for Payment In Modal */}
      {selectPendingModalOpen && (
        <Modal
          isOpen={selectPendingModalOpen}
          onClose={() => setSelectPendingModalOpen(false)}
          title="📥 Record Payment In — Select Pending Customer / Booking"
          footer={
            <button className="btn btn-ghost" onClick={() => setSelectPendingModalOpen(false)}>
              Close
            </button>
          }
        >
          {pendingCollections.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 10px' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
              <h4 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 800 }}>કોઈ ગ્રાહકનું પેન્ડિંગ બેલેન્સ નથી!</h4>
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--muted)' }}>
                તમામ ગ્રાહક બિલો, બ્રાઇડલ બુકિંગ અને અપોઇન્ટમેન્ટના નાણાં સંપૂર્ણ ચૂકવાઈ ગયા છે.
              </p>
            </div>
          ) : (
            <div style={{ maxHeight: '65vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Category Pills inside Modal */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{
                      padding: '4px 10px',
                      fontSize: 11.5,
                      fontWeight: 700,
                      borderRadius: 16,
                      background: toCollectTab === 'all' ? '#2563eb' : 'var(--bg-subtle, #f1f5f9)',
                      color: toCollectTab === 'all' ? '#fff' : 'var(--text)',
                      border: toCollectTab === 'all' ? '1px solid #2563eb' : '1px solid var(--border)',
                    }}
                    onClick={() => setToCollectTab('all')}
                  >
                    All ({collectionCounts.allCount})
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{
                      padding: '4px 10px',
                      fontSize: 11.5,
                      fontWeight: 700,
                      borderRadius: 16,
                      background: toCollectTab === 'invoice' ? '#1d4ed8' : 'var(--bg-subtle, #f1f5f9)',
                      color: toCollectTab === 'invoice' ? '#fff' : '#1d4ed8',
                      border: toCollectTab === 'invoice' ? '1px solid #1d4ed8' : '1px solid #bfdbfe',
                    }}
                    onClick={() => setToCollectTab('invoice')}
                  >
                    📄 Bills ({collectionCounts.invCount})
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{
                      padding: '4px 10px',
                      fontSize: 11.5,
                      fontWeight: 700,
                      borderRadius: 16,
                      background: toCollectTab === 'bridal' ? '#be185d' : 'var(--bg-subtle, #f1f5f9)',
                      color: toCollectTab === 'bridal' ? '#fff' : '#be185d',
                      border: toCollectTab === 'bridal' ? '1px solid #be185d' : '1px solid #fbcfe8',
                    }}
                    onClick={() => setToCollectTab('bridal')}
                  >
                    👑 Bridal ({collectionCounts.bridalCount})
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{
                      padding: '4px 10px',
                      fontSize: 11.5,
                      fontWeight: 700,
                      borderRadius: 16,
                      background: toCollectTab === 'appointment' ? '#0d9488' : 'var(--bg-subtle, #f1f5f9)',
                      color: toCollectTab === 'appointment' ? '#fff' : '#0d9488',
                      border: toCollectTab === 'appointment' ? '1px solid #0d9488' : '1px solid #99f6e4',
                    }}
                    onClick={() => setToCollectTab('appointment')}
                  >
                    📅 Appt ({collectionCounts.apptCount})
                  </button>
                </div>

                <div className="search-wrap" style={{ flex: 1, minWidth: 160, maxWidth: 220 }}>
                  <Search size={13} className="search-icon" />
                  <input
                    type="search"
                    className="input"
                    style={{ padding: '4px 8px 4px 28px', fontSize: 11.5 }}
                    placeholder="Search name, phone…"
                    value={toCollectSearch}
                    onChange={(e) => setToCollectSearch(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                જે ગ્રાહક પાસેથી નાણાં જમા લેવાના હોય તે ગ્રાહક સામે <b>"📥 Collect"</b> બટન પર ક્લિક કરો:
              </div>

              {filteredCollections.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13.5 }}>
                      <User size={14} style={{ color: item.type === 'Bridal' ? '#be185d' : item.type === 'Appointment' ? '#0d9488' : '#2563eb' }} />
                      <span>{item.name}</span>
                      <span style={{
                        fontSize: 10.5,
                        padding: '1px 6px',
                        borderRadius: 4,
                        fontWeight: 800,
                        background: item.type === 'Bridal' ? '#fce7f3' : item.type === 'Appointment' ? '#ccfbf1' : '#e0f2fe',
                        color: item.type === 'Bridal' ? '#be185d' : item.type === 'Appointment' ? '#0f766e' : '#0369a1',
                      }}>
                        {item.type === 'Bridal' ? '👑 Bridal' : item.type === 'Appointment' ? '📅 Appt' : `📄 ${item.no}`}
                      </span>
                    </div>
                    {item.mobile && item.mobile !== '-' && (
                      <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
                        📞 {item.mobile} • {fmtDate(item.date)} {item.time ? `• ${item.time}` : ''}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600 }}>PENDING</div>
                      <div style={{ fontSize: 14, fontWeight: 900, color: '#dc2626' }}>
                        {money(item.balance)}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      style={{
                        padding: '6px 14px',
                        fontSize: 12,
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                        borderColor: '#059669',
                      }}
                      onClick={() => {
                        setSelectPendingModalOpen(false);
                        openPaymentIn(item);
                      }}
                    >
                      <ArrowDownLeft size={13} /> Collect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* Edit Payment In Entry Modal */}
      {editPaymentEntry && (
        <Modal
          isOpen={!!editPaymentEntry}
          onClose={() => setEditPaymentEntry(null)}
          title={`✏️ Edit Payment In (${editPaymentEntry.docNo})`}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setEditPaymentEntry(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveEditPaymentEntry}
                style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', borderColor: '#059669' }}
              >
                Save Changes (સુધારો સાચવો)
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 8,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <span style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: editPaymentEntry.badgeBg,
                  color: editPaymentEntry.badgeColor,
                  border: `1px solid ${editPaymentEntry.badgeBorder}`,
                }}>
                  {editPaymentEntry.typeLabel}
                </span>
                <div style={{ fontWeight: 800, fontSize: 14, marginTop: 4 }}>
                  {editPaymentEntry.docNo}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Current Amount</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#059669' }}>
                  {money(editPaymentEntry.amount)}
                </div>
              </div>
            </div>

            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <div className="form-group">
                <label className="label" style={{ marginBottom: 4, fontSize: 12.5 }}>Amount Received (જમા રકમ ₹) *</label>
                <input
                  type="number"
                  className="input"
                  min="0"
                  step="any"
                  value={editEntryAmount}
                  onChange={(e) => setEditEntryAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0.00"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="label" style={{ marginBottom: 4, fontSize: 12.5 }}>Payment Mode (ચુકવણી પદ્ધતિ) *</label>
                <select
                  className="input"
                  value={editEntryMode}
                  onChange={(e) => setEditEntryMode(e.target.value)}
                >
                  {paymentModes.map((m) => (
                    <option key={m} value={m}>
                      {m === 'Cash' ? '💵 Cash' : m.includes('UPI') || m.includes('GPay') || m.includes('PhonePe') ? `📱 ${m}` : m === 'Card' ? `💳 Card` : `🏦 ${m}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="label" style={{ marginBottom: 4, fontSize: 12.5 }}>Payment Date (તારીખ) *</label>
                <input
                  type="date"
                  className="input"
                  value={editEntryDate}
                  onChange={(e) => setEditEntryDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="label" style={{ marginBottom: 4, fontSize: 12.5 }}>Customer Name (ગ્રાહકનું નામ)</label>
                <input
                  type="text"
                  className="input"
                  value={editEntryPartyName}
                  onChange={(e) => setEditEntryPartyName(e.target.value)}
                  placeholder="Customer Name"
                />
              </div>

              <div className="form-group">
                <label className="label" style={{ marginBottom: 4, fontSize: 12.5 }}>Customer Mobile (મોબાઈલ નંબર)</label>
                <input
                  type="tel"
                  className="input"
                  value={editEntryPartyMobile}
                  onChange={(e) => setEditEntryPartyMobile(e.target.value)}
                  placeholder="9876543210"
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="label" style={{ marginBottom: 4, fontSize: 12.5 }}>Notes / Remarks (નોંધ)</label>
                <input
                  type="text"
                  className="input"
                  value={editEntryNotes}
                  onChange={(e) => setEditEntryNotes(e.target.value)}
                  placeholder="e.g. Paid via GPay / Advance for facial"
                />
              </div>
            </div>

            <div style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#1e40af',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 11.5,
            }}>
              ℹ️ રકમ અથવા મોડ બદલવાથી કેશ ઇન હેન્ડ, બેંક બેલેન્સ અને ગ્રાહકનું બાકી લેણું આપોઆપ અપડેટ થશે.
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Payment In Entry Confirmation Modal */}
      {deletePaymentEntry && (
        <Modal
          isOpen={!!deletePaymentEntry}
          onClose={() => setDeletePaymentEntry(null)}
          title="🗑️ Delete Payment In Entry?"
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setDeletePaymentEntry(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleConfirmDeletePaymentEntry}>
                Delete & Revert Balance
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 14 }}>
              શું તમે ખરેખર <b>{deletePaymentEntry.partyName}</b> નું <b>{deletePaymentEntry.docNo}</b> ({deletePaymentEntry.typeLabel}) નું <b>{money(deletePaymentEntry.amount)}</b> ({deletePaymentEntry.mode}) નું Payment In ડિલીટ કરવા માંગો છો?
            </p>

            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              borderRadius: 8,
              padding: '10px 12px',
              fontSize: 12,
            }}>
              ⚠️ <b>ચેતવણી:</b> આ પેમેન્ટ એન્ટ્રી ડિલીટ કરવાથી ગ્રાહકના ખાતામાં તેટલી રકમ ફરીથી બાકી (Pending Balance) થઈ જશે અને કેશ/બેંકમાંથી રકમ બાદ થશે.
            </div>
          </div>
        </Modal>
      )}

      {/* Invoice Receipt Modal */}
      {receiptModalInv && (
        <InvoiceReceiptModal
          isOpen={!!receiptModalInv}
          onClose={() => setReceiptModalInv(null)}
          invoice={receiptModalInv}
          salonData={data}
        />
      )}
    </div>
  );
}
