'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Plus,
  Search,
  Calendar,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Receipt,
  ShoppingBag,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Landmark,
  Building2,
  Package,
  FileText,
  User,
  Users,
  PieChart as PieIcon,
  BarChart3,
  RefreshCw,
  Printer,
  MessageCircle,
  Eye,
  Trash2,
  Phone,
  Filter,
  CheckCircle2,
  Clock,
  ChevronRight,
  X,
  CreditCard,
  Banknote,
  Send,
  Download,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useSalonStore } from '@/lib/store';
import { scheduleSave } from '@/lib/sync';
import { uid, todayISO, money, fmtDate } from '@/lib/utils';
import {
  Invoice,
  InvoiceLine,
  Purchase,
  Expense,
  PaymentVoucher,
  Customer,
  Supplier,
  InventoryItem,
  BankAccount,
  SalonData,
} from '@/types/salon';
import Modal from '@/components/ui/Modal';
import InvoiceReceiptModal from '@/components/billing/InvoiceReceiptModal';
import { useToast } from '@/components/ui/Toast';
import { format, isToday, isThisMonth, parseISO } from 'date-fns';

type TabType =
  | 'transactions'
  | 'advances'
  | 'parties'
  | 'invoices'
  | 'purchases'
  | 'rojmel'
  | 'reports';

type TxTypeFilter =
  | 'All'
  | 'Sale'
  | 'Purchase'
  | 'Payment In'
  | 'Payment Out'
  | 'Expense';

type TimeFilter = 'all' | 'today' | 'month';

interface UnifiedTransaction {
  id: string;
  date: string;
  type: 'Sale' | 'Purchase' | 'Payment In' | 'Payment Out' | 'Expense';
  billNo: string;
  partyName: string;
  partyMobile?: string;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  paymentMode: string;
  status: 'Paid' | 'Partial' | 'Unpaid' | 'Completed';
  category?: string;
  notes?: string;
  rawItem: any;
}

const EXPENSE_CATEGORIES = [
  'Staff Tea & Refreshments',
  'Electricity & Utilities',
  'Rent',
  'Laundry & Towels',
  'Housekeeping & Cleaning',
  'Marketing & Ads',
  'Salon Maintenance',
  'Staff Bonus / Incentives',
  'Other Expense',
] as const;

export default function FinanceAccountingPage() {
  const { data, updateData } = useSalonStore();
  const { toast } = useToast();

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<TabType>('transactions');

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TxTypeFilter>('All');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [customerKhataFilter, setCustomerKhataFilter] = useState<'due' | 'all'>('due');
  const [supplierKhataFilter, setSupplierKhataFilter] = useState<'due' | 'all'>('due');
  const [advanceFilter, setAdvanceFilter] = useState<'all' | 'active' | 'converted'>('active');

  // Modals
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [paymentInModalOpen, setPaymentInModalOpen] = useState(false);
  const [paymentOutModalOpen, setPaymentOutModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [partyModalOpen, setPartyModalOpen] = useState(false);
  const [bankModalOpen, setBankModalOpen] = useState(false);

  // Receipt Modal
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);

  // Daily Cashbook Date
  const [rojmelDate, setRojmelDate] = useState(todayISO());

  // Auto-open requested modal if ?new=... is in URL
  const searchParams = useSearchParams();
  useEffect(() => {
    const action = searchParams?.get('new');
    if (action === 'expense' || action === '1') {
      setExpenseModalOpen(true);
      setActiveTab('rojmel');
    } else if (action === 'sale') {
      setSaleModalOpen(true);
    } else if (action === 'in' || action === 'paymentin') {
      setPaymentInModalOpen(true);
    } else if (action === 'out' || action === 'paymentout') {
      setPaymentOutModalOpen(true);
    } else if (action === 'purchase') {
      setPurchaseModalOpen(true);
    }
  }, [searchParams]);

  // ── Form States ─────────────────────────────────────────────────────────────

  // Quick Sale Form
  const [saleForm, setSaleForm] = useState({
    customer: '',
    mobile: '',
    serviceName: '',
    total: '',
    paid: '',
    mode: 'Cash',
    notes: '',
  });

  // Quick Purchase Form
  const [purchaseForm, setPurchaseForm] = useState({
    supplierId: '',
    supplierName: '',
    supplierInvoice: '',
    productName: '',
    qty: '1',
    rate: '',
    paid: '',
    mode: 'Cash',
    notes: '',
  });

  // Payment In Form
  const [paymentInForm, setPaymentInForm] = useState({
    partyType: 'Customer' as 'Customer' | 'Supplier',
    partyId: '',
    partyName: '',
    partyMobile: '',
    amount: '',
    mode: 'Cash',
    referenceNo: '',
    notes: '',
  });

  // Payment Out Form
  const [paymentOutForm, setPaymentOutForm] = useState({
    partyType: 'Supplier' as 'Customer' | 'Supplier',
    partyId: '',
    partyName: '',
    partyMobile: '',
    amount: '',
    mode: 'Cash',
    referenceNo: '',
    notes: '',
  });

  // Expense Form
  const [expenseForm, setExpenseForm] = useState({
    category: 'Staff Tea & Refreshments',
    amount: '',
    paidTo: '',
    mode: 'Cash',
    notes: '',
  });

  // Party Form
  const [partyForm, setPartyForm] = useState({
    type: 'Customer' as 'Customer' | 'Supplier',
    name: '',
    mobile: '',
    openingBalance: '',
    openingType: 'To Receive' as 'To Receive' | 'To Pay',
    address: '',
    gstin: '',
  });

  // Bank Form
  const [bankForm, setBankForm] = useState({
    name: '',
    accountNo: '',
    ifsc: '',
    branch: '',
    upiId: '',
    openingBalance: '',
  });

  // ── Unified Transactions Compiler ──────────────────────────────────────────
  const unifiedTransactions = useMemo<UnifiedTransaction[]>(() => {
    const list: UnifiedTransaction[] = [];

    // 1. Invoices (Sales)
    (data.invoices || []).forEach((inv) => {
      const total = Number(inv.total || 0);
      const paid = Number(inv.paid || 0) + Number(inv.advance || 0);
      const balance = Math.max(0, total - paid);
      let status: 'Paid' | 'Partial' | 'Unpaid' = 'Unpaid';
      if (balance <= 0) status = 'Paid';
      else if (paid > 0) status = 'Partial';

      list.push({
        id: `sale-${inv.id}`,
        date: inv.date || todayISO(),
        type: 'Sale',
        billNo: inv.no,
        partyName: inv.customer || 'Walk-in Client',
        partyMobile: inv.mobile || '',
        totalAmount: total,
        paidAmount: paid,
        balanceDue: balance,
        paymentMode: inv.mode || 'Cash',
        status,
        notes: (inv.lines || []).map((i: InvoiceLine) => i.name).join(', '),
        rawItem: inv,
      });
    });

    // 2. Purchases
    (data.purchases || []).forEach((pur) => {
      const total = Number(pur.total || 0);
      const paid = Number(pur.paid || 0);
      const balance = Math.max(0, total - paid);
      let status: 'Paid' | 'Partial' | 'Unpaid' = 'Unpaid';
      if (balance <= 0) status = 'Paid';
      else if (paid > 0) status = 'Partial';

      list.push({
        id: `pur-${pur.id}`,
        date: pur.date || todayISO(),
        type: 'Purchase',
        billNo: pur.no || pur.supplierInvoice || 'PO-NEW',
        partyName: pur.supplier || 'Vendor',
        totalAmount: total,
        paidAmount: paid,
        balanceDue: balance,
        paymentMode: pur.mode || 'Cash',
        status,
        notes: (pur.lines || []).map((l) => l.name).join(', '),
        rawItem: pur,
      });
    });

    // 3. Payment Vouchers
    (data.vouchers || []).forEach((v: PaymentVoucher) => {
      list.push({
        id: `voucher-${v.id}`,
        date: v.date || todayISO(),
        type: v.type === 'Payment-In' ? 'Payment In' : 'Payment Out',
        billNo: v.voucherNo,
        partyName: v.partyName,
        partyMobile: v.partyMobile,
        totalAmount: Number(v.amount || 0),
        paidAmount: Number(v.amount || 0),
        balanceDue: 0,
        paymentMode: v.mode || 'Cash',
        status: 'Completed',
        notes: v.notes || v.referenceNo || '',
        rawItem: v,
      });
    });

    // 4. Expenses
    (data.expenses || []).forEach((exp) => {
      list.push({
        id: `exp-${exp.id}`,
        date: exp.date || todayISO(),
        type: 'Expense',
        billNo: exp.expenseNo || 'EXP',
        partyName: exp.paidTo || exp.category,
        totalAmount: Number(exp.amount || 0),
        paidAmount: Number(exp.amount || 0),
        balanceDue: 0,
        paymentMode: exp.mode || 'Cash',
        status: 'Completed',
        category: exp.category,
        notes: exp.notes || '',
        rawItem: exp,
      });
    });

    // Sort newest date first
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data.invoices, data.purchases, data.vouchers, data.expenses]);

  // ── KPI Metrics Calculations ───────────────────────────────────────────────
  const metrics = useMemo(() => {
    let receivables = 0;
    const dueCustomers = new Set<string>();

    (data.invoices || []).forEach((inv) => {
      const bal = Number(inv.balance || 0);
      if (bal > 0) {
        receivables += bal;
        if (inv.customer) dueCustomers.add(inv.customer);
      }
    });

    (data.customers || []).forEach((c) => {
      if (c.openingBalance && c.openingBalanceType === 'To Receive') {
        receivables += Number(c.openingBalance);
        dueCustomers.add(c.name);
      }
    });

    let payables = 0;
    const dueSuppliers = new Set<string>();

    (data.purchases || []).forEach((pur) => {
      const bal = Number(pur.balance || 0);
      if (bal > 0) {
        payables += bal;
        if (pur.supplier) dueSuppliers.add(pur.supplier);
      }
    });

    (data.suppliers || []).forEach((s) => {
      if (s.opening && (s.openingBalanceType === 'To Pay' || !s.openingBalanceType)) {
        payables += Number(s.opening);
        dueSuppliers.add(s.name);
      }
    });

    // Cash In Hand Calculation
    let cashIn = 0;
    let cashOut = 0;
    let bankUpiBalance = 0;

    // Sales
    (data.invoices || []).forEach((inv) => {
      const paid = Number(inv.paid || 0) + Number(inv.advance || 0);
      const mode = (inv.mode || 'Cash').toLowerCase();
      if (mode.includes('cash')) {
        cashIn += paid;
      } else {
        bankUpiBalance += paid;
      }
    });

    // Payment Vouchers
    (data.vouchers || []).forEach((v: PaymentVoucher) => {
      const amt = Number(v.amount || 0);
      const mode = (v.mode || 'Cash').toLowerCase();
      if (v.type === 'Payment-In') {
        if (mode.includes('cash')) cashIn += amt;
        else bankUpiBalance += amt;
      } else {
        if (mode.includes('cash')) cashOut += amt;
        else bankUpiBalance -= amt;
      }
    });

    // Purchases
    (data.purchases || []).forEach((p) => {
      const paid = Number(p.paid || 0);
      const mode = (p.mode || 'Cash').toLowerCase();
      if (mode.includes('cash')) cashOut += paid;
      else bankUpiBalance -= paid;
    });

    // Expenses
    (data.expenses || []).forEach((e) => {
      const amt = Number(e.amount || 0);
      const mode = (e.mode || 'Cash').toLowerCase();
      if (mode.includes('cash')) cashOut += amt;
      else bankUpiBalance -= amt;
    });

    // Advance Payments tracking (Appointments & Bridal)
    let activeAdvances = 0;
    let totalAdvancesCollected = 0;
    let activeAdvanceCount = 0;
    const advanceItems: {
      id: string;
      bookingType: 'Appointment' | 'Bridal';
      customer: string;
      mobile: string;
      service: string;
      date: string;
      advance: number;
      totalPrice: number;
      balance: number;
      mode: string;
      isConverted: boolean;
      invoiceId?: string;
      status: string;
      raw: any;
    }[] = [];

    (data.appointments || []).forEach((a) => {
      const adv = Number(a.advance || 0);
      if (adv > 0 && a.status !== 'Cancelled') {
        totalAdvancesCollected += adv;
        const isConverted = !!a.invoiceId || a.workStatus === 'Billed' || a.status === 'Completed';
        if (!isConverted) {
          activeAdvances += adv;
          activeAdvanceCount++;
        }
        advanceItems.push({
          id: `appt-adv-${a.id}`,
          bookingType: 'Appointment',
          customer: a.customer || 'Customer',
          mobile: a.mobile || '',
          service: a.service || 'Service',
          date: a.date || todayISO(),
          advance: adv,
          totalPrice: Number(a.price || 0),
          balance: Math.max(0, Number(a.price || 0) - adv),
          mode: a.advanceMode || 'Cash',
          isConverted,
          invoiceId: a.invoiceId,
          status: isConverted ? 'Converted to Sale' : (a.workStatus || a.status || 'Active'),
          raw: a,
        });

        // Add to cash in hand / bank if not yet part of an invoice
        if (!isConverted) {
          const mode = (a.advanceMode || 'Cash').toLowerCase();
          if (mode.includes('cash')) {
            cashIn += adv;
          } else {
            bankUpiBalance += adv;
          }
        }
      }
    });

    (data.bridal || []).forEach((b) => {
      const adv = Number(b.advance || 0);
      if (adv > 0 && b.status !== 'Cancelled') {
        totalAdvancesCollected += adv;
        const isConverted = !!(b.invoiceId || b.isCompleted);
        if (!isConverted) {
          activeAdvances += adv;
          activeAdvanceCount++;
        }
        advanceItems.push({
          id: `bridal-adv-${b.id}`,
          bookingType: 'Bridal',
          customer: b.name || 'Bride',
          mobile: b.mobile || '',
          service: `${b.packageType || 'Bridal'} — ${b.packageName || 'Package'}`,
          date: b.weddingDate || todayISO(),
          advance: adv,
          totalPrice: Number(b.package || 0),
          balance: Math.max(0, Number(b.package || 0) - adv),
          mode: b.advanceAccount || 'Cash',
          isConverted,
          invoiceId: b.invoiceId,
          status: isConverted ? 'Converted to Sale' : 'Active',
          raw: b,
        });

        // Add to cash in hand / bank if not yet part of an invoice
        if (!isConverted) {
          const mode = (b.advanceAccount || 'Cash').toLowerCase();
          if (mode.includes('cash')) {
            cashIn += adv;
          } else {
            bankUpiBalance += adv;
          }
        }
      }
    });

    const cashInHand = Math.max(0, cashIn - cashOut);

    // Sales Today & This Month
    const today = todayISO();
    let todaySales = 0;
    let thisMonthSales = 0;

    (data.invoices || []).forEach((inv) => {
      const total = Number(inv.total || 0);
      if (inv.date === today) {
        todaySales += total;
      }
      try {
        if (isThisMonth(parseISO(inv.date))) {
          thisMonthSales += total;
        }
      } catch {}
    });

    // Stock Valuation
    let stockValuation = 0;
    (data.inventory || []).forEach((p: InventoryItem) => {
      const qty = Number(p.stock || 0);
      const cost = Number(p.buy || p.sell || 0);
      stockValuation += qty * cost;
    });

    return {
      receivables,
      dueCustomerCount: dueCustomers.size,
      payables,
      dueSupplierCount: dueSuppliers.size,
      activeAdvances,
      activeAdvanceCount,
      totalAdvancesCollected,
      advanceItems,
      cashInHand,
      bankUpiBalance: Math.max(0, bankUpiBalance),
      todaySales,
      thisMonthSales,
      stockValuation,
    };
  }, [
    data.invoices,
    data.customers,
    data.purchases,
    data.suppliers,
    data.vouchers,
    data.expenses,
    data.inventory,
    data.appointments,
    data.bridal,
  ]);

  // ── Filtered Advances Memo ──────────────────────────────────────────────────
  const filteredAdvances = useMemo(() => {
    return (metrics.advanceItems || []).filter((item) => {
      if (advanceFilter === 'active' && item.isConverted) return false;
      if (advanceFilter === 'converted' && !item.isConverted) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const mName = item.customer.toLowerCase().includes(q);
        const mMob = item.mobile.includes(q);
        const mSvc = item.service.toLowerCase().includes(q);
        if (!mName && !mMob && !mSvc) return false;
      }
      return true;
    });
  }, [metrics.advanceItems, advanceFilter, search]);

  // ── Parties List with Balance Calculation & Filter ─────────────────────────
  const customerListWithBalance = useMemo(() => {
    const list = (data.customers || []).map((c) => {
      let balance = 0;
      (data.invoices || []).forEach((inv) => {
        if (inv.customer === c.name || (c.mobile && inv.mobile === c.mobile)) {
          balance += Number(inv.balance || 0);
        }
      });
      if (c.openingBalance && c.openingBalanceType === 'To Receive') {
        balance += Number(c.openingBalance);
      }
      return { ...c, balance };
    });

    // Sort highest balance first
    list.sort((a, b) => b.balance - a.balance);

    if (customerKhataFilter === 'due') {
      return list.filter((c) => c.balance > 0);
    }
    return list;
  }, [data.customers, data.invoices, customerKhataFilter]);

  const supplierListWithBalance = useMemo(() => {
    const list = (data.suppliers || []).map((s) => {
      let balance = 0;
      (data.purchases || []).forEach((p) => {
        if (p.supplier === s.name || p.supplierId === s.id) {
          balance += Number(p.balance || 0);
        }
      });
      if (s.opening && (s.openingBalanceType === 'To Pay' || !s.openingBalanceType)) {
        balance += Number(s.opening);
      }
      return { ...s, balance };
    });

    // Sort highest balance first
    list.sort((a, b) => b.balance - a.balance);

    if (supplierKhataFilter === 'due') {
      return list.filter((s) => s.balance > 0);
    }
    return list;
  }, [data.suppliers, data.purchases, supplierKhataFilter]);

  // ── Filtered Transactions ──────────────────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    return unifiedTransactions.filter((tx) => {
      // Type Filter
      if (typeFilter !== 'All' && tx.type !== typeFilter) return false;

      // Time Filter
      if (timeFilter === 'today') {
        if (tx.date !== todayISO()) return false;
      } else if (timeFilter === 'month') {
        try {
          if (!isThisMonth(parseISO(tx.date))) return false;
        } catch {
          return false;
        }
      }

      // Search Query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchBill = tx.billNo.toLowerCase().includes(q);
        const matchParty = tx.partyName.toLowerCase().includes(q);
        const matchNotes = (tx.notes || '').toLowerCase().includes(q);
        const matchMobile = (tx.partyMobile || '').includes(q);
        if (!matchBill && !matchParty && !matchNotes && !matchMobile) return false;
      }

      return true;
    });
  }, [unifiedTransactions, typeFilter, timeFilter, search]);

  // ── Rojmel (Daily Cashbook) Calculations ───────────────────────────────────
  const rojmelData = useMemo(() => {
    const d = rojmelDate;
    const cashInList: { title: string; subtitle: string; amount: number }[] = [];
    const cashOutList: { title: string; subtitle: string; amount: number }[] = [];

    // Cash Sales
    (data.invoices || []).forEach((inv) => {
      if (inv.date === d && (inv.mode || 'Cash').toLowerCase().includes('cash')) {
        const paid = Number(inv.paid || 0) + Number(inv.advance || 0);
        if (paid > 0) {
          cashInList.push({
            title: `Bill #${inv.no} — ${inv.customer || 'Customer'}`,
            subtitle: (inv.lines || []).map((i: InvoiceLine) => i.name).join(', ') || 'Salon Services',
            amount: paid,
          });
        }
      }
    });

    // Payment-In (Cash)
    (data.vouchers || []).forEach((v: PaymentVoucher) => {
      if (v.date === d && v.type === 'Payment-In' && (v.mode || 'Cash').toLowerCase().includes('cash')) {
        cashInList.push({
          title: `Payment Received — ${v.partyName}`,
          subtitle: v.notes || v.referenceNo || 'Customer settlement',
          amount: Number(v.amount || 0),
        });
      }
    });

    // Purchases (Cash)
    (data.purchases || []).forEach((p) => {
      if (p.date === d && (p.mode || 'Cash').toLowerCase().includes('cash')) {
        const paid = Number(p.paid || 0);
        if (paid > 0) {
          cashOutList.push({
            title: `Purchase #${p.no} — ${p.supplier}`,
            subtitle: (p.lines || []).map((l) => l.name).join(', ') || 'Stock inventory',
            amount: paid,
          });
        }
      }
    });

    // Expenses (Cash)
    (data.expenses || []).forEach((e) => {
      if (e.date === d && (e.mode || 'Cash').toLowerCase().includes('cash')) {
        cashOutList.push({
          title: `${e.category} ${e.paidTo ? `(${e.paidTo})` : ''}`,
          subtitle: e.notes || 'Operating Expense',
          amount: Number(e.amount || 0),
        });
      }
    });

    // Payment-Out (Cash)
    (data.vouchers || []).forEach((v: PaymentVoucher) => {
      if (v.date === d && v.type === 'Payment-Out' && (v.mode || 'Cash').toLowerCase().includes('cash')) {
        cashOutList.push({
          title: `Payment Made — ${v.partyName}`,
          subtitle: v.notes || v.referenceNo || 'Vendor payment',
          amount: Number(v.amount || 0),
        });
      }
    });

    const totalIn = cashInList.reduce((acc, i) => acc + i.amount, 0);
    const totalOut = cashOutList.reduce((acc, i) => acc + i.amount, 0);
    const netDayChange = totalIn - totalOut;

    return {
      cashInList,
      cashOutList,
      totalIn,
      totalOut,
      netDayChange,
    };
  }, [rojmelDate, data.invoices, data.vouchers, data.purchases, data.expenses]);

  // ── Action Handlers ─────────────────────────────────────────────────────────

  const handleCreateSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleForm.total || Number(saleForm.total) <= 0) {
      toast('Please enter a valid total sale amount', 'error');
      return;
    }

    const totalAmt = Number(saleForm.total);
    const paidAmt = saleForm.paid === '' ? totalAmt : Number(saleForm.paid);
    const balanceAmt = Math.max(0, totalAmt - paidAmt);
    const invNo = `INV-${format(new Date(), 'yyyyMM')}-${String((data.invoices || []).length + 1).padStart(3, '0')}`;

    const newInvoice: Invoice = {
      id: uid(),
      no: invNo,
      date: todayISO(),
      customer: saleForm.customer || 'Walk-in Client',
      mobile: saleForm.mobile || '',
      lines: [
        {
          type: 'S',
          name: saleForm.serviceName || 'General Salon Service',
          qty: 1,
          price: totalAmt,
        },
      ],
      subtotal: totalAmt,
      discount: 0,
      total: totalAmt,
      advance: 0,
      paid: paidAmt,
      balance: balanceAmt,
      mode: saleForm.mode,
      notes: saleForm.notes,
    };

    updateData((prev: SalonData) => ({
      ...prev,
      invoices: [newInvoice, ...(prev.invoices || [])],
      invoiceSeq: (prev.invoiceSeq || 1000) + 1,
    }));
    scheduleSave();

    toast(`✅ Sale recorded successfully! Invoice #${invNo}`);
    setSaleModalOpen(false);
    setSaleForm({
      customer: '',
      mobile: '',
      serviceName: '',
      total: '',
      paid: '',
      mode: 'Cash',
      notes: '',
    });
  };

  const handleCreatePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseForm.rate || Number(purchaseForm.rate) <= 0) {
      toast('Please enter purchase rate/amount', 'error');
      return;
    }

    const qty = Number(purchaseForm.qty || 1);
    const rate = Number(purchaseForm.rate);
    const total = qty * rate;
    const paid = purchaseForm.paid === '' ? total : Number(purchaseForm.paid);
    const balance = Math.max(0, total - paid);
    const purNo = `PO-${String((data.purchases || []).length + 1).padStart(4, '0')}`;

    const newPur: Purchase = {
      id: uid(),
      no: purNo,
      date: todayISO(),
      supplierId: purchaseForm.supplierId || uid(),
      supplier: purchaseForm.supplierName || 'Vendor',
      supplierInvoice: purchaseForm.supplierInvoice,
      lines: [
        {
          name: purchaseForm.productName || 'Salon Product / Material',
          qty,
          rate,
        },
      ],
      subtotal: total,
      gst: 0,
      discount: 0,
      total,
      paid,
      balance,
      mode: purchaseForm.mode,
      notes: purchaseForm.notes,
    };

    updateData((prev: SalonData) => ({
      ...prev,
      purchases: [newPur, ...(prev.purchases || [])],
      purchaseSeq: (prev.purchaseSeq || 1000) + 1,
    }));
    scheduleSave();

    toast(`✅ Purchase recorded! #${purNo}`);
    setPurchaseModalOpen(false);
    setPurchaseForm({
      supplierId: '',
      supplierName: '',
      supplierInvoice: '',
      productName: '',
      qty: '1',
      rate: '',
      paid: '',
      mode: 'Cash',
      notes: '',
    });
  };

  const handleCreatePaymentIn = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(paymentInForm.amount);
    if (!amt || amt <= 0) {
      toast('Please enter a valid received amount', 'error');
      return;
    }

    const voucherNo = `RCV-${String((data.vouchers || []).length + 1).padStart(4, '0')}`;

    const newVoucher: PaymentVoucher = {
      id: uid(),
      voucherNo,
      type: 'Payment-In',
      partyType: paymentInForm.partyType,
      partyId: paymentInForm.partyId || uid(),
      partyName: paymentInForm.partyName || 'Customer',
      partyMobile: paymentInForm.partyMobile,
      date: todayISO(),
      amount: amt,
      mode: paymentInForm.mode,
      referenceNo: paymentInForm.referenceNo,
      notes: paymentInForm.notes,
    };

    updateData((prev: SalonData) => ({
      ...prev,
      vouchers: [newVoucher, ...(prev.vouchers || [])],
      voucherSeq: (prev.voucherSeq || 1000) + 1,
    }));
    scheduleSave();

    toast(`✅ Payment received recorded! Voucher #${voucherNo}`);
    setPaymentInModalOpen(false);
    setPaymentInForm({
      partyType: 'Customer',
      partyId: '',
      partyName: '',
      partyMobile: '',
      amount: '',
      mode: 'Cash',
      referenceNo: '',
      notes: '',
    });
  };

  const handleCreatePaymentOut = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(paymentOutForm.amount);
    if (!amt || amt <= 0) {
      toast('Please enter a valid payment amount', 'error');
      return;
    }

    const voucherNo = `PAY-${String((data.vouchers || []).length + 1).padStart(4, '0')}`;

    const newVoucher: PaymentVoucher = {
      id: uid(),
      voucherNo,
      type: 'Payment-Out',
      partyType: paymentOutForm.partyType,
      partyId: paymentOutForm.partyId || uid(),
      partyName: paymentOutForm.partyName || 'Supplier / Vendor',
      partyMobile: paymentOutForm.partyMobile,
      date: todayISO(),
      amount: amt,
      mode: paymentOutForm.mode,
      referenceNo: paymentOutForm.referenceNo,
      notes: paymentOutForm.notes,
    };

    updateData((prev: SalonData) => ({
      ...prev,
      vouchers: [newVoucher, ...(prev.vouchers || [])],
      voucherSeq: (prev.voucherSeq || 1000) + 1,
    }));
    scheduleSave();

    toast(`✅ Payment Made recorded! Voucher #${voucherNo}`);
    setPaymentOutModalOpen(false);
    setPaymentOutForm({
      partyType: 'Supplier',
      partyId: '',
      partyName: '',
      partyMobile: '',
      amount: '',
      mode: 'Cash',
      referenceNo: '',
      notes: '',
    });
  };

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(expenseForm.amount);
    if (!amt || amt <= 0) {
      toast('Please enter a valid expense amount', 'error');
      return;
    }

    const expNo = `EXP-${String((data.expenses || []).length + 1).padStart(4, '0')}`;

    const newExp: Expense = {
      id: uid(),
      expenseNo: expNo,
      date: todayISO(),
      category: expenseForm.category as any,
      amount: amt,
      mode: expenseForm.mode,
      paidTo: expenseForm.paidTo,
      notes: expenseForm.notes,
    };

    updateData((prev: SalonData) => ({
      ...prev,
      expenses: [newExp, ...(prev.expenses || [])],
      expenseSeq: (prev.expenseSeq || 1000) + 1,
    }));
    scheduleSave();

    toast(`✅ Expense recorded! #${expNo}`);
    setExpenseModalOpen(false);
    setExpenseForm({
      category: 'Staff Tea & Refreshments',
      amount: '',
      paidTo: '',
      mode: 'Cash',
      notes: '',
    });
  };

  const handleCreateParty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyForm.name.trim()) {
      toast('Please enter party name', 'error');
      return;
    }

    if (partyForm.type === 'Customer') {
      const newCust: Customer = {
        id: uid(),
        name: partyForm.name.trim(),
        mobile: partyForm.mobile.trim(),
        address: partyForm.address,
        gstin: partyForm.gstin,
        openingBalance: Number(partyForm.openingBalance || 0),
        openingBalanceType: partyForm.openingType,
      };
      updateData((prev: SalonData) => ({
        ...prev,
        customers: [newCust, ...(prev.customers || [])],
      }));
    } else {
      const newSupp: Supplier = {
        id: uid(),
        name: partyForm.name.trim(),
        mobile: partyForm.mobile.trim(),
        address: partyForm.address,
        gstin: partyForm.gstin,
        opening: Number(partyForm.openingBalance || 0),
        openingBalanceType: partyForm.openingType === 'To Receive' ? 'To Receive' : 'To Pay',
      };
      updateData((prev: SalonData) => ({
        ...prev,
        suppliers: [newSupp, ...(prev.suppliers || [])],
      }));
    }
    scheduleSave();

    toast(`✅ Party "${partyForm.name}" created successfully!`);
    setPartyModalOpen(false);
    setPartyForm({
      type: 'Customer',
      name: '',
      mobile: '',
      openingBalance: '',
      openingType: 'To Receive',
      address: '',
      gstin: '',
    });
  };

  const handleCreateBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankForm.name.trim()) {
      toast('Please enter bank / account name', 'error');
      return;
    }
    const newBank: BankAccount = {
      id: uid(),
      name: bankForm.name.trim(),
      bankName: bankForm.name.trim(),
      accountNo: bankForm.accountNo.trim(),
      ifsc: bankForm.ifsc.trim().toUpperCase(),
      branch: bankForm.branch.trim(),
      upiId: bankForm.upiId.trim(),
      openingBalance: Number(bankForm.openingBalance || 0),
      isActive: true,
    };
    updateData((prev: SalonData) => ({
      ...prev,
      bankAccounts: [newBank, ...(prev.bankAccounts || [])],
    }));
    scheduleSave();
    toast(`✅ Bank Account "${bankForm.name}" added successfully!`);
    setBankModalOpen(false);
    setBankForm({
      name: '',
      accountNo: '',
      ifsc: '',
      branch: '',
      upiId: '',
      openingBalance: '',
    });
  };

  const handleDeleteBank = (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete bank account "${name}"?`)) return;
    updateData((prev: SalonData) => ({
      ...prev,
      bankAccounts: (prev.bankAccounts || []).filter((b: BankAccount) => b.id !== id),
    }));
    scheduleSave();
    toast(`Deleted bank account "${name}"`);
  };

  const handleDeleteTx = (tx: UnifiedTransaction) => {
    if (!window.confirm(`Are you sure you want to delete ${tx.type} #${tx.billNo}?`)) return;

    if (tx.type === 'Sale') {
      updateData((prev: SalonData) => ({
        ...prev,
        invoices: (prev.invoices || []).filter((i) => i.id !== tx.rawItem.id),
      }));
    } else if (tx.type === 'Purchase') {
      updateData((prev: SalonData) => ({
        ...prev,
        purchases: (prev.purchases || []).filter((p) => p.id !== tx.rawItem.id),
      }));
    } else if (tx.type === 'Payment In' || tx.type === 'Payment Out') {
      updateData((prev: SalonData) => ({
        ...prev,
        vouchers: (prev.vouchers || []).filter((v: PaymentVoucher) => v.id !== tx.rawItem.id),
      }));
    } else if (tx.type === 'Expense') {
      updateData((prev: SalonData) => ({
        ...prev,
        expenses: (prev.expenses || []).filter((e) => e.id !== tx.rawItem.id),
      }));
    }
    scheduleSave();
    toast(`Deleted ${tx.type} #${tx.billNo}`);
  };

  const handleSendWhatsAppReminder = (name: string, mobile: string, balance: number) => {
    const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
    if (!cleanMobile) {
      toast('No mobile number available for this party', 'error');
      return;
    }
    const salonName = data.settings?.salon || 'Shree Beauty Studio';
    const text = `✨ *${salonName.toUpperCase()} — Balance Reminder* ✨\n\nDear ${name},\nThis is a gentle reminder regarding your outstanding balance of *${money(balance)}* with ${salonName}.\n\nKindly clear the payment at your earliest convenience. Thank you! 🙏\n📞 ${data.settings?.whatsapp || '9773240010'}`;
    window.open(`https://wa.me/91${cleanMobile}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1600, margin: '0 auto', color: '#1e293b' }}>
      {/* ─── 7 QUICK ACTION BUTTONS (SINGLE HORIZONTAL ROW) ─── */}
      <div
        className="no-scrollbar"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          gap: 10,
          marginBottom: 20,
        }}
      >
        <button
          onClick={() => setSaleModalOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '10px 10px',
            borderRadius: 10,
            background: '#059669',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: 12.5,
            border: 'none',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(5, 150, 105, 0.2)',
            transition: 'transform 0.15s ease',
          }}
          onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          <Plus size={14} /> + Sale
        </button>

        <button
          onClick={() => setPurchaseModalOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '10px 10px',
            borderRadius: 10,
            background: '#2563eb',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: 12.5,
            border: 'none',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
            transition: 'transform 0.15s ease',
          }}
          onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          <Plus size={14} /> + Purchase
        </button>

        <button
          onClick={() => setPaymentInModalOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '10px 10px',
            borderRadius: 10,
            background: '#0d9488',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: 12.5,
            border: 'none',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(13, 148, 136, 0.2)',
            transition: 'transform 0.15s ease',
          }}
          onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          <ArrowDownLeft size={14} /> + Payment In
        </button>

        <button
          onClick={() => setPaymentOutModalOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '10px 10px',
            borderRadius: 10,
            background: '#d97706',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: 12.5,
            border: 'none',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(217, 119, 6, 0.2)',
            transition: 'transform 0.15s ease',
          }}
          onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          <ArrowUpRight size={14} /> + Payment Out
        </button>

        <button
          onClick={() => setExpenseModalOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '10px 10px',
            borderRadius: 10,
            background: '#e11d48',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: 12.5,
            border: 'none',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(225, 29, 72, 0.2)',
            transition: 'transform 0.15s ease',
          }}
          onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          <Plus size={14} /> + Expense
        </button>

        <button
          onClick={() => setPartyModalOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '10px 10px',
            borderRadius: 10,
            background: '#ffffff',
            color: '#7c3aed',
            fontWeight: 700,
            fontSize: 12.5,
            border: '1.5px solid #ddd6fe',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(124, 58, 237, 0.08)',
            transition: 'transform 0.15s ease',
          }}
          onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          <Users size={14} /> + Party
        </button>

        <button
          onClick={() => setBankModalOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '10px 10px',
            borderRadius: 10,
            background: '#ffffff',
            color: '#0284c7',
            fontWeight: 700,
            fontSize: 12.5,
            border: '1.5px solid #bae6fd',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(2, 132, 199, 0.08)',
            transition: 'transform 0.15s ease',
          }}
          onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          <Landmark size={14} /> + Bank
        </button>
      </div>

      {/* ─── 7 COLORFUL KPI METRIC CARDS (COMPACT SINGLE ROW FIT) ─── */}
      <div
        className="finance-kpis-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          gap: 8,
          marginBottom: 20,
        }}
      >
        {/* 1. YOU'LL GET (RECEIVABLES) */}
        <div
          onClick={() => setActiveTab('parties')}
          title="Click to view Customers & Receivables"
          style={{
            background: '#f0fdf4',
            border: activeTab === 'parties' ? '2px solid #16a34a' : '1.5px solid #bbf7d0',
            borderRadius: 12,
            padding: '10px 8px',
            position: 'relative',
            boxShadow: activeTab === 'parties' ? '0 4px 12px rgba(34, 197, 94, 0.18)' : '0 2px 6px rgba(34, 197, 94, 0.05)',
            minWidth: 0,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            <span style={{ fontSize: 9.5, fontWeight: 800, color: '#166534', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              YOU&apos;LL GET
            </span>
            <div
              style={{
                width: 20,
                height: 20,
                minWidth: 20,
                borderRadius: '50%',
                background: '#dcfce7',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowDownLeft size={11} />
            </div>
          </div>
          <div style={{ fontSize: 'clamp(15px, 1.2vw, 18px)', fontWeight: 900, color: '#14532d', margin: '4px 0 1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {money(metrics.receivables)}
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#15803d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {metrics.dueCustomerCount} Customers Due
          </div>
        </div>

        {/* 2. YOU'LL PAY (PAYABLES) */}
        <div
          onClick={() => setActiveTab('purchases')}
          title="Click to view Purchases & Payables"
          style={{
            background: '#fff1f2',
            border: activeTab === 'purchases' ? '2px solid #e11d48' : '1.5px solid #fecdd3',
            borderRadius: 12,
            padding: '10px 8px',
            position: 'relative',
            boxShadow: activeTab === 'purchases' ? '0 4px 12px rgba(244, 63, 94, 0.18)' : '0 2px 6px rgba(244, 63, 94, 0.05)',
            minWidth: 0,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            <span style={{ fontSize: 9.5, fontWeight: 800, color: '#9f1239', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              YOU&apos;LL PAY
            </span>
            <div
              style={{
                width: 20,
                height: 20,
                minWidth: 20,
                borderRadius: '50%',
                background: '#ffe4e6',
                color: '#e11d48',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowUpRight size={11} />
            </div>
          </div>
          <div style={{ fontSize: 'clamp(15px, 1.2vw, 18px)', fontWeight: 900, color: '#881337', margin: '4px 0 1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {money(metrics.payables)}
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#be123c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {metrics.dueSupplierCount} Suppliers Due
          </div>
        </div>

        {/* 3. ADVANCE RECEIVED */}
        <div
          onClick={() => setActiveTab('advances')}
          title="Click to view Advance Bookings & Deposits"
          style={{
            background: 'linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%)',
            border: activeTab === 'advances' ? '2px solid #d97706' : '1.5px solid #fde68a',
            borderRadius: 12,
            padding: '10px 8px',
            position: 'relative',
            boxShadow: activeTab === 'advances' ? '0 4px 12px rgba(217, 119, 6, 0.25)' : '0 2px 6px rgba(217, 119, 6, 0.08)',
            minWidth: 0,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            <span style={{ fontSize: 9.5, fontWeight: 800, color: '#92400e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              ADVANCE REC.
            </span>
            <div
              style={{
                width: 20,
                height: 20,
                minWidth: 20,
                borderRadius: '50%',
                background: '#fef3c7',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={11} />
            </div>
          </div>
          <div style={{ fontSize: 'clamp(15px, 1.2vw, 18px)', fontWeight: 900, color: '#78350f', margin: '4px 0 1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {money(metrics.activeAdvances)}
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#b45309', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {metrics.activeAdvanceCount} Active Bookings
          </div>
        </div>

        {/* 4. CASH IN HAND */}
        <div
          onClick={() => setActiveTab('rojmel')}
          title="Click to view Daily Rojmel & Cash Book"
          style={{
            background: '#f0f9ff',
            border: activeTab === 'rojmel' ? '2px solid #0284c7' : '1.5px solid #bae6fd',
            borderRadius: 12,
            padding: '10px 8px',
            position: 'relative',
            boxShadow: activeTab === 'rojmel' ? '0 4px 12px rgba(14, 165, 233, 0.18)' : '0 2px 6px rgba(14, 165, 233, 0.05)',
            minWidth: 0,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            <span style={{ fontSize: 9.5, fontWeight: 800, color: '#075985', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              CASH IN HAND
            </span>
            <div
              style={{
                width: 20,
                height: 20,
                minWidth: 20,
                borderRadius: '50%',
                background: '#e0f2fe',
                color: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Wallet size={11} />
            </div>
          </div>
          <div style={{ fontSize: 'clamp(15px, 1.2vw, 18px)', fontWeight: 900, color: '#0c4a6e', margin: '4px 0 1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {money(metrics.cashInHand)}
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#0369a1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Counter &amp; Drawer
          </div>
        </div>

        {/* 5. BANK & UPI BALANCE */}
        <div
          onClick={() => {
            setActiveTab('transactions');
            setTypeFilter('All');
            setTimeFilter('all');
            setSearch('');
          }}
          title="Click to view Bank, UPI & Online transactions"
          style={{
            background: '#f0fdfa',
            border: activeTab === 'transactions' && typeFilter === 'All' ? '2px solid #0d9488' : '1.5px solid #99f6e4',
            borderRadius: 12,
            padding: '10px 8px',
            position: 'relative',
            boxShadow: activeTab === 'transactions' && typeFilter === 'All' ? '0 4px 12px rgba(20, 184, 166, 0.18)' : '0 2px 6px rgba(20, 184, 166, 0.05)',
            minWidth: 0,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            <span style={{ fontSize: 9.5, fontWeight: 800, color: '#115e59', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              BANK &amp; UPI
            </span>
            <div
              style={{
                width: 20,
                height: 20,
                minWidth: 20,
                borderRadius: '50%',
                background: '#ccfbf1',
                color: '#0d9488',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Landmark size={11} />
            </div>
          </div>
          <div style={{ fontSize: 'clamp(15px, 1.2vw, 18px)', fontWeight: 900, color: '#134e4a', margin: '4px 0 1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {money(metrics.bankUpiBalance)}
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#0f766e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Online &amp; Account
          </div>
        </div>

        {/* 6. TODAY'S SALE */}
        <div
          onClick={() => {
            setActiveTab('transactions');
            setTypeFilter('Sale');
            setTimeFilter('today');
          }}
          title="Click to view Today's Sales"
          style={{
            background: '#faf5ff',
            border: activeTab === 'transactions' && typeFilter === 'Sale' && timeFilter === 'today' ? '2px solid #9333ea' : '1.5px solid #e9d5ff',
            borderRadius: 12,
            padding: '10px 8px',
            position: 'relative',
            boxShadow: activeTab === 'transactions' && typeFilter === 'Sale' && timeFilter === 'today' ? '0 4px 12px rgba(168, 85, 247, 0.18)' : '0 2px 6px rgba(168, 85, 247, 0.05)',
            minWidth: 0,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            <span style={{ fontSize: 9.5, fontWeight: 800, color: '#6b21a8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              TODAY&apos;S SALE
            </span>
            <div
              style={{
                width: 20,
                height: 20,
                minWidth: 20,
                borderRadius: '50%',
                background: '#f3e8ff',
                color: '#9333ea',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrendingUp size={11} />
            </div>
          </div>
          <div style={{ fontSize: 'clamp(15px, 1.2vw, 18px)', fontWeight: 900, color: '#581c87', margin: '4px 0 1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {money(metrics.todaySales)}
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#7e22ce', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Month: {money(metrics.thisMonthSales)}
          </div>
        </div>

        {/* 7. STOCK VALUE */}
        <div
          onClick={() => setActiveTab('reports')}
          title="Click to view Stock & Valuation Reports"
          style={{
            background: '#fffbeb',
            border: activeTab === 'reports' ? '2px solid #d97706' : '1.5px solid #fde68a',
            borderRadius: 12,
            padding: '10px 8px',
            position: 'relative',
            boxShadow: activeTab === 'reports' ? '0 4px 12px rgba(245, 158, 11, 0.18)' : '0 2px 6px rgba(245, 158, 11, 0.05)',
            minWidth: 0,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            <span style={{ fontSize: 9.5, fontWeight: 800, color: '#92400e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              STOCK VALUE
            </span>
            <div
              style={{
                width: 20,
                height: 20,
                minWidth: 20,
                borderRadius: '50%',
                background: '#fef3c7',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Package size={11} />
            </div>
          </div>
          <div style={{ fontSize: 'clamp(15px, 1.2vw, 18px)', fontWeight: 900, color: '#78350f', margin: '4px 0 1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {money(metrics.stockValuation)}
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#b45309', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Warehouse Stock
          </div>
        </div>
      </div>

      {/* ─── NAVIGATION TABS (NO SCROLL SINGLE ROW) ─── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          gap: 6,
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: 10,
          marginBottom: 20,
          overflow: 'visible',
        }}
      >
        <button
          onClick={() => setActiveTab('transactions')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            padding: '7px 4px',
            borderRadius: 9,
            fontSize: 'clamp(11px, 0.9vw, 12.5px)',
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            background: activeTab === 'transactions' ? '#0f172a' : 'transparent',
            color: activeTab === 'transactions' ? '#ffffff' : '#64748b',
            boxShadow: activeTab === 'transactions' ? '0 3px 10px rgba(15, 23, 42, 0.15)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <Receipt size={14} /> <span>Txns ({unifiedTransactions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('advances')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            padding: '7px 4px',
            borderRadius: 9,
            fontSize: 'clamp(11px, 0.9vw, 12.5px)',
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            background: activeTab === 'advances' ? '#d97706' : 'transparent',
            color: activeTab === 'advances' ? '#ffffff' : '#b45309',
            boxShadow: activeTab === 'advances' ? '0 3px 10px rgba(217, 119, 6, 0.25)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <Sparkles size={14} /> <span>Advances ({metrics.activeAdvanceCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('parties')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            padding: '7px 4px',
            borderRadius: 9,
            fontSize: 'clamp(11px, 0.9vw, 12.5px)',
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            background: activeTab === 'parties' ? '#0f172a' : 'transparent',
            color: activeTab === 'parties' ? '#ffffff' : '#64748b',
            boxShadow: activeTab === 'parties' ? '0 3px 10px rgba(15, 23, 42, 0.15)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <Users size={14} /> <span>Khata ({(data.customers || []).length + (data.suppliers || []).length})</span>
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            padding: '7px 4px',
            borderRadius: 9,
            fontSize: 'clamp(11px, 0.9vw, 12.5px)',
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            background: activeTab === 'invoices' ? '#0f172a' : 'transparent',
            color: activeTab === 'invoices' ? '#ffffff' : '#64748b',
            boxShadow: activeTab === 'invoices' ? '0 3px 10px rgba(15, 23, 42, 0.15)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <FileText size={14} /> <span>Invoices ({(data.invoices || []).length})</span>
        </button>

        <button
          onClick={() => setActiveTab('purchases')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            padding: '7px 4px',
            borderRadius: 9,
            fontSize: 'clamp(11px, 0.9vw, 12.5px)',
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            background: activeTab === 'purchases' ? '#0f172a' : 'transparent',
            color: activeTab === 'purchases' ? '#ffffff' : '#64748b',
            boxShadow: activeTab === 'purchases' ? '0 3px 10px rgba(15, 23, 42, 0.15)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <ShoppingBag size={14} /> <span>Purchases ({(data.purchases || []).length})</span>
        </button>

        <button
          onClick={() => setActiveTab('rojmel')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            padding: '7px 4px',
            borderRadius: 9,
            fontSize: 'clamp(11px, 0.9vw, 12.5px)',
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            background: activeTab === 'rojmel' ? '#0f172a' : 'transparent',
            color: activeTab === 'rojmel' ? '#ffffff' : '#64748b',
            boxShadow: activeTab === 'rojmel' ? '0 3px 10px rgba(15, 23, 42, 0.15)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <BookOpen size={14} /> <span>Rojmel</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            padding: '7px 4px',
            borderRadius: 9,
            fontSize: 'clamp(11px, 0.9vw, 12.5px)',
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            background: activeTab === 'reports' ? '#0f172a' : 'transparent',
            color: activeTab === 'reports' ? '#ffffff' : '#64748b',
            boxShadow: activeTab === 'reports' ? '0 3px 10px rgba(15, 23, 42, 0.15)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <BarChart3 size={14} /> <span>Reports</span>
        </button>
      </div>

      {/* ─── TAB CONTENT 1: ALL TRANSACTIONS ─── */}
      {activeTab === 'transactions' && (
        <div style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {/* Filters Bar (Single Line) */}
          <div
            className="no-scrollbar"
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              flexWrap: 'nowrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              background: '#f8fafc',
              overflowX: 'auto',
            }}
          >
            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: 260, flex: '1 1 280px' }}>
              <Search
                size={16}
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
              />
              <input
                type="text"
                placeholder="Search Bill No, Party, Notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  background: '#ffffff',
                  outline: 'none',
                }}
              />
            </div>

            {/* Filters Group (Type & Time Dropdowns) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              {/* Type Filter Dropdown */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as TxTypeFilter)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 10,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#1e293b',
                  outline: 'none',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                <option value="All">All Types</option>
                <option value="Sale">Sale (વેચાણ)</option>
                <option value="Purchase">Purchase (ખરીદી)</option>
                <option value="Payment In">Payment In (આવક)</option>
                <option value="Payment Out">Payment Out (ચુકવણી)</option>
                <option value="Expense">Expense (ખર્ચ)</option>
              </select>

              {/* Time Filter Dropdown */}
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 10,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#1e293b',
                  outline: 'none',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="month">This Month</option>
              </select>
            </div>
          </div>

          {/* Transactions Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px' }}>DATE</th>
                  <th style={{ padding: '12px 16px' }}>TYPE</th>
                  <th style={{ padding: '12px 16px' }}>BILL NO</th>
                  <th style={{ padding: '12px 16px' }}>PARTY NAME</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>TOTAL AMOUNT</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>PAID AMOUNT</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>BALANCE DUE</th>
                  <th style={{ padding: '12px 16px' }}>MODE</th>
                  <th style={{ padding: '12px 16px' }}>STATUS</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '54px 20px', color: '#94a3b8' }}>
                      <FileText size={40} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#64748b' }}>No Transactions Found</div>
                      <div style={{ fontSize: 13, marginTop: 4 }}>Click the buttons above to record a new Sale, Purchase, or Payment.</div>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => {
                    const typeColors: Record<string, { bg: string; text: string; border: string }> = {
                      Sale: { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
                      Purchase: { bg: '#dbeafe', text: '#1d4ed8', border: '#bfdbfe' },
                      'Payment In': { bg: '#ccfbf1', text: '#0f766e', border: '#99f6e4' },
                      'Payment Out': { bg: '#ffedd5', text: '#c2410c', border: '#fed7aa' },
                      Expense: { bg: '#ffe4e6', text: '#be123c', border: '#fecdd3' },
                    };
                    const badge = typeColors[tx.type] || { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' };

                    return (
                      <tr key={tx.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', color: '#64748b', fontWeight: 600 }}>
                          {fmtDate(tx.date)}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 800,
                              background: badge.bg,
                              color: badge.text,
                              border: `1px solid ${badge.border}`,
                            }}
                          >
                            {tx.type}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>
                          {tx.billNo}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 700, color: '#1e293b' }}>{tx.partyName}</div>
                          {tx.notes && <div style={{ fontSize: 11.5, color: '#94a3b8' }}>{tx.notes}</div>}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                          {money(tx.totalAmount)}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#15803d' }}>
                          {money(tx.paidAmount)}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: tx.balanceDue > 0 ? '#dc2626' : '#94a3b8' }}>
                          {tx.balanceDue > 0 ? money(tx.balanceDue) : '₹0'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#475569', background: '#f8fafc', padding: '3px 7px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                            {tx.paymentMode}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              fontSize: 11.5,
                              fontWeight: 700,
                              color:
                                tx.status === 'Paid' || tx.status === 'Completed'
                                  ? '#15803d'
                                  : tx.status === 'Partial'
                                  ? '#d97706'
                                  : '#dc2626',
                            }}
                          >
                            ● {tx.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            {tx.type === 'Sale' && (
                              <button
                                onClick={() => setViewInvoice(tx.rawItem)}
                                title="View & Print Invoice Receipt"
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: 6,
                                  background: '#f1f5f9',
                                  border: '1px solid #cbd5e1',
                                  color: '#334155',
                                  cursor: 'pointer',
                                }}
                              >
                                <Eye size={13} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteTx(tx)}
                              title="Delete Transaction"
                              style={{
                                padding: '5px 8px',
                                borderRadius: 6,
                                background: '#fee2e2',
                                border: '1px solid #fecaca',
                                color: '#dc2626',
                                cursor: 'pointer',
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB CONTENT 1.5: ADVANCE BOOKINGS & DEPOSITS ─── */}
      {activeTab === 'advances' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Summary KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div
              style={{
                background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                border: '1.5px solid #fde68a',
                borderRadius: 14,
                padding: '14px 18px',
                boxShadow: '0 2px 10px rgba(217, 119, 6, 0.08)',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Active Unadjusted Advances (અનામત એડવાન્સ)
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#78350f', margin: '6px 0 2px' }}>
                {money(metrics.activeAdvances)}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#b45309' }}>
                {metrics.activeAdvanceCount} Bookings pending service / billing
              </div>
            </div>

            <div
              style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                border: '1.5px solid #bbf7d0',
                borderRadius: 14,
                padding: '14px 18px',
                boxShadow: '0 2px 10px rgba(22, 163, 74, 0.08)',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Converted to Completed Sales (વેચાણમાં જમા)
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#14532d', margin: '6px 0 2px' }}>
                {money(metrics.totalAdvancesCollected - metrics.activeAdvances)}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#15803d' }}>
                {metrics.advanceItems.filter((i) => i.isConverted).length} Bookings fulfilled &amp; billed
              </div>
            </div>

            <div
              style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                border: '1.5px solid #e2e8f0',
                borderRadius: 14,
                padding: '14px 18px',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Lifetime Advance Received (કુલ એડવાન્સ)
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: '6px 0 2px' }}>
                {money(metrics.totalAdvancesCollected)}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>
                {metrics.advanceItems.length} Total advance records
              </div>
            </div>
          </div>

          {/* Advances Table Card */}
          <div style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {/* Filters Bar */}
            <div
              className="no-scrollbar"
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                flexWrap: 'nowrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                background: '#f8fafc',
                overflowX: 'auto',
              }}
            >
              {/* Search */}
              <div style={{ position: 'relative', minWidth: 260, flex: '1 1 280px' }}>
                <Search
                  size={16}
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
                />
                <input
                  type="text"
                  placeholder="Search customer, mobile, service, package..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    background: '#ffffff',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Status Filter Buttons */}
              <div style={{ display: 'flex', background: '#e2e8f0', padding: 2, borderRadius: 8, flexShrink: 0 }}>
                <button
                  onClick={() => setAdvanceFilter('active')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: advanceFilter === 'active' ? '#d97706' : 'transparent',
                    color: advanceFilter === 'active' ? '#ffffff' : '#475569',
                    transition: 'all 0.15s ease',
                  }}
                >
                  ⏳ Active Advances ({metrics.activeAdvanceCount})
                </button>
                <button
                  onClick={() => setAdvanceFilter('converted')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: advanceFilter === 'converted' ? '#16a34a' : 'transparent',
                    color: advanceFilter === 'converted' ? '#ffffff' : '#475569',
                    transition: 'all 0.15s ease',
                  }}
                >
                  ✅ Converted to Sale ({metrics.advanceItems.filter((i) => i.isConverted).length})
                </button>
                <button
                  onClick={() => setAdvanceFilter('all')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: advanceFilter === 'all' ? '#0f172a' : 'transparent',
                    color: advanceFilter === 'all' ? '#ffffff' : '#475569',
                    transition: 'all 0.15s ease',
                  }}
                >
                  All ({metrics.advanceItems.length})
                </button>
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 16px' }}>DATE</th>
                    <th style={{ padding: '12px 16px' }}>TYPE</th>
                    <th style={{ padding: '12px 16px' }}>CUSTOMER / CONTACT</th>
                    <th style={{ padding: '12px 16px' }}>SERVICE / PACKAGE</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>ADVANCE PAID</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>TOTAL DEAL</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>BALANCE DUE</th>
                    <th style={{ padding: '12px 16px' }}>STATUS</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdvances.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '36px 16px', color: '#94a3b8' }}>
                        No advance records found matching your filter
                      </td>
                    </tr>
                  ) : (
                    filteredAdvances.map((item) => {
                      return (
                        <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.1s ease' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>
                            {fmtDate(item.date)}
                          </td>
                          <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 700,
                                background: item.bookingType === 'Bridal' ? '#ffe4e6' : '#e0f2fe',
                                color: item.bookingType === 'Bridal' ? '#e11d48' : '#0284c7',
                              }}
                            >
                              {item.bookingType === 'Bridal' ? '👰 Bridal Booking' : '💅 Appointment'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.customer}</div>
                            {item.mobile && (
                              <div style={{ fontSize: 11, color: '#64748b' }}>📞 {item.mobile}</div>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#334155', fontWeight: 600, maxWidth: 220 }}>
                            {item.service}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: '#b45309' }}>
                              {money(item.advance)}
                            </div>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: '1px 5px',
                                borderRadius: 4,
                                background: '#fef3c7',
                                color: '#92400e',
                              }}
                            >
                              {item.mode}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#1e293b' }}>
                            {money(item.totalPrice)}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: item.balance > 0 ? '#dc2626' : '#16a34a' }}>
                            {money(item.balance)}
                          </td>
                          <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                            {item.isConverted ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '3px 8px',
                                  borderRadius: 99,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  background: '#dcfce7',
                                  color: '#15803d',
                                }}
                              >
                                ● Converted to Sale {item.invoiceId ? `(#${item.invoiceId})` : ''}
                              </span>
                            ) : (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '3px 8px',
                                  borderRadius: 99,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  background: '#fef3c7',
                                  color: '#b45309',
                                }}
                              >
                                ● Active Advance ({item.status})
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                              {!item.isConverted && (
                                <button
                                  onClick={() => {
                                    if (item.bookingType === 'Appointment') {
                                      window.location.href = `/admin/billing?convertApptId=${item.raw.id}`;
                                    } else {
                                      window.location.href = `/admin/bridal`;
                                    }
                                  }}
                                  title="Complete & Convert Advance to Final Bill"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    padding: '5px 9px',
                                    borderRadius: 6,
                                    background: '#059669',
                                    color: '#ffffff',
                                    fontWeight: 700,
                                    fontSize: 11,
                                    border: 'none',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <Receipt size={12} /> Complete &amp; Bill
                                </button>
                              )}

                              {item.mobile && (
                                <button
                                  onClick={() => {
                                    const cleanMobile = item.mobile.replace(/\D/g, '').slice(-10);
                                    const salon = data.settings?.salon || 'Shree Beauty Studio';
                                    const text = `✨ *${salon.toUpperCase()} — Advance Booking Receipt* ✨\n\nNamaste *${item.customer}*,\nThank you for booking with us! We have received your advance payment of *${money(item.advance)}* for *${item.service}* (${fmtDate(item.date)}).\n\nTotal: ${money(item.totalPrice)}\nAdvance Paid: ${money(item.advance)}\nRemaining Balance: ${money(item.balance)}\n\nSee you soon! 🌸\n📞 ${data.settings?.whatsapp || '9773240010'}`;
                                    window.open(`https://wa.me/91${cleanMobile}?text=${encodeURIComponent(text)}`, '_blank');
                                  }}
                                  title="Send WhatsApp Advance Receipt"
                                  style={{
                                    padding: '5px 8px',
                                    borderRadius: 6,
                                    background: '#dcfce7',
                                    border: '1px solid #bbf7d0',
                                    color: '#15803d',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <MessageCircle size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB CONTENT 2: PARTIES / KHATA BOOK ─── */}
      {activeTab === 'parties' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          {/* Customers Khata */}
          <div style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={18} color="#059669" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                  Customers Khata ({customerKhataFilter === 'due' ? `${metrics.dueCustomerCount} Due` : (data.customers || []).length})
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', background: '#f1f5f9', padding: 2, borderRadius: 8 }}>
                  <button
                    onClick={() => setCustomerKhataFilter('due')}
                    style={{
                      padding: '4px 9px',
                      borderRadius: 6,
                      fontSize: 11.5,
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      background: customerKhataFilter === 'due' ? '#059669' : 'transparent',
                      color: customerKhataFilter === 'due' ? '#ffffff' : '#64748b',
                    }}
                  >
                    Only Due ({metrics.dueCustomerCount})
                  </button>
                  <button
                    onClick={() => setCustomerKhataFilter('all')}
                    style={{
                      padding: '4px 9px',
                      borderRadius: 6,
                      fontSize: 11.5,
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      background: customerKhataFilter === 'all' ? '#059669' : 'transparent',
                      color: customerKhataFilter === 'all' ? '#ffffff' : '#64748b',
                    }}
                  >
                    All ({(data.customers || []).length})
                  </button>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>
                  Receivables: {money(metrics.receivables)}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {customerListWithBalance.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: '#166534', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0' }}>
                  <CheckCircle2 size={24} color="#16a34a" style={{ margin: '0 auto 6px' }} />
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>All Customer Accounts Clear!</div>
                  <div style={{ fontSize: 12, color: '#15803d', marginTop: 2 }}>No pending receivables.</div>
                </div>
              ) : (
                customerListWithBalance.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      border: '1.5px solid',
                      borderColor: c.balance > 0 ? '#fecaca' : '#e2e8f0',
                      background: c.balance > 0 ? '#fff5f5' : '#f8fafc',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 14 }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>📞 {c.mobile || 'No mobile'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 900, fontSize: 14, color: c.balance > 0 ? '#dc2626' : '#16a34a' }}>
                        {c.balance > 0 ? `To Receive: ${money(c.balance)}` : 'Clear (₹0)'}
                      </div>
                      {c.balance > 0 && c.mobile && (
                        <button
                          onClick={() => handleSendWhatsAppReminder(c.name, c.mobile, c.balance)}
                          style={{
                            marginTop: 4,
                            padding: '5px 9px',
                            borderRadius: 6,
                            background: '#25D366',
                            color: '#ffffff',
                            fontSize: 11,
                            fontWeight: 700,
                            border: 'none',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <MessageCircle size={12} /> Send WhatsApp Alert
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Suppliers Khata */}
          <div style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building2 size={18} color="#2563eb" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                  Suppliers &amp; Vendors ({supplierKhataFilter === 'due' ? `${metrics.dueSupplierCount} Due` : (data.suppliers || []).length})
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', background: '#f1f5f9', padding: 2, borderRadius: 8 }}>
                  <button
                    onClick={() => setSupplierKhataFilter('due')}
                    style={{
                      padding: '4px 9px',
                      borderRadius: 6,
                      fontSize: 11.5,
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      background: supplierKhataFilter === 'due' ? '#2563eb' : 'transparent',
                      color: supplierKhataFilter === 'due' ? '#ffffff' : '#64748b',
                    }}
                  >
                    Only Due ({metrics.dueSupplierCount})
                  </button>
                  <button
                    onClick={() => setSupplierKhataFilter('all')}
                    style={{
                      padding: '4px 9px',
                      borderRadius: 6,
                      fontSize: 11.5,
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      background: supplierKhataFilter === 'all' ? '#2563eb' : 'transparent',
                      color: supplierKhataFilter === 'all' ? '#ffffff' : '#64748b',
                    }}
                  >
                    All ({(data.suppliers || []).length})
                  </button>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#dc2626' }}>
                  Payables: {money(metrics.payables)}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {supplierListWithBalance.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: '#1e40af', background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe' }}>
                  <CheckCircle2 size={24} color="#2563eb" style={{ margin: '0 auto 6px' }} />
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>All Supplier Accounts Clear!</div>
                  <div style={{ fontSize: 12, color: '#1d4ed8', marginTop: 2 }}>No pending payables / dues.</div>
                </div>
              ) : (
                supplierListWithBalance.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      border: '1.5px solid',
                      borderColor: s.balance > 0 ? '#fed7aa' : '#e2e8f0',
                      background: s.balance > 0 ? '#fff7ed' : '#f8fafc',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 14 }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>📞 {s.mobile || s.contact || 'No phone'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 900, fontSize: 14, color: s.balance > 0 ? '#dc2626' : '#16a34a' }}>
                        {s.balance > 0 ? `To Pay: ${money(s.balance)}` : 'Clear (₹0)'}
                      </div>
                      <button
                        onClick={() => {
                          setPaymentOutForm({
                            partyType: 'Supplier',
                            partyId: s.id,
                            partyName: s.name,
                            partyMobile: s.mobile || '',
                            amount: s.balance > 0 ? String(s.balance) : '',
                            mode: 'Cash',
                            referenceNo: '',
                            notes: `Payment for ${s.name}`,
                          });
                          setPaymentOutModalOpen(true);
                        }}
                        style={{
                          marginTop: 4,
                          padding: '5px 9px',
                          borderRadius: 6,
                          background: '#d97706',
                          color: '#ffffff',
                          fontSize: 11,
                          fontWeight: 700,
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        + Pay Supplier
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB CONTENT 3: SALES INVOICES ─── */}
      {activeTab === 'invoices' && (
        <div style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
              Sales Invoices ({(data.invoices || []).length})
            </h3>
            <button
              onClick={() => setSaleModalOpen(true)}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                background: '#059669',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 13,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              + New Sale Invoice
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#475569', textAlign: 'left', fontWeight: 700 }}>
                  <th style={{ padding: '10px 14px' }}>Invoice No</th>
                  <th style={{ padding: '10px 14px' }}>Date</th>
                  <th style={{ padding: '10px 14px' }}>Customer</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Total</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Paid</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Balance</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {(data.invoices || []).map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>{inv.no}</td>
                    <td style={{ padding: '10px 14px', color: '#64748b' }}>{fmtDate(inv.date)}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{inv.customer}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800 }}>{money(inv.total)}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: '#16a34a', fontWeight: 700 }}>
                      {money((inv.paid || 0) + (inv.advance || 0))}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: (inv.balance || 0) > 0 ? '#dc2626' : '#94a3b8', fontWeight: 700 }}>
                      {money(inv.balance || 0)}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <button
                        onClick={() => setViewInvoice(inv)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 6,
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          fontSize: 12,
                          fontWeight: 700,
                          color: '#334155',
                          cursor: 'pointer',
                        }}
                      >
                        Receipt &amp; WhatsApp
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB CONTENT 4: PURCHASES ─── */}
      {activeTab === 'purchases' && (
        <div style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
              Purchases &amp; Vendor Bills ({(data.purchases || []).length})
            </h3>
            <button
              onClick={() => setPurchaseModalOpen(true)}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                background: '#2563eb',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 13,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              + New Purchase Bill
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#475569', textAlign: 'left', fontWeight: 700 }}>
                  <th style={{ padding: '10px 14px' }}>Purchase No</th>
                  <th style={{ padding: '10px 14px' }}>Date</th>
                  <th style={{ padding: '10px 14px' }}>Supplier</th>
                  <th style={{ padding: '10px 14px' }}>Supplier Bill #</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Total</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Paid</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {(data.purchases || []).map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>{p.no}</td>
                    <td style={{ padding: '10px 14px', color: '#64748b' }}>{fmtDate(p.date)}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{p.supplier}</td>
                    <td style={{ padding: '10px 14px', color: '#64748b' }}>{p.supplierInvoice || '—'}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800 }}>{money(p.total)}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: '#16a34a', fontWeight: 700 }}>
                      {money(p.paid)}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: (p.balance || 0) > 0 ? '#dc2626' : '#94a3b8', fontWeight: 700 }}>
                      {money(p.balance || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB CONTENT 5: DAILY CASH BOOK (ROJMEL / રોજમેળ) ─── */}
      {activeTab === 'rojmel' && (
        <div style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 24 }}>
          {/* Rojmel Header & Date Selector */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 16,
              marginBottom: 24,
              paddingBottom: 16,
              borderBottom: '1px solid #e2e8f0',
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
                Daily Cash Book (Rojmel / રોજમેળ)
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
                Daily Cash Inflows (Jama / જમા) &amp; Outflows (Udhar / ઉધાર) Drawer Tally.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="date"
                value={rojmelDate}
                onChange={(e) => setRojmelDate(e.target.value)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 10,
                  border: '1.5px solid #cbd5e1',
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#0f172a',
                }}
              />
              <button
                onClick={() => window.print()}
                style={{
                  padding: '8px 16px',
                  borderRadius: 10,
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Printer size={15} /> Print Rojmel
              </button>
            </div>
          </div>

          {/* Rojmel Two-Column (Jama vs Udhar) Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            {/* JAMA (CASH INFLOW) */}
            <div style={{ background: '#f0fdf4', borderRadius: 14, border: '1.5px solid #bbf7d0', padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#166534' }}>
                  📥 JAMA / CASH IN (જમા)
                </span>
                <span style={{ fontSize: 16, fontWeight: 900, color: '#14532d' }}>
                  {money(rojmelData.totalIn)}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
                {rojmelData.cashInList.length === 0 ? (
                  <div style={{ fontSize: 13, color: '#86efac', textAlign: 'center', padding: '24px 0' }}>
                    No cash received on this date.
                  </div>
                ) : (
                  rojmelData.cashInList.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 12px',
                        background: '#ffffff',
                        borderRadius: 8,
                        border: '1px solid #dcfce7',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{item.title}</div>
                        <div style={{ fontSize: 11.5, color: '#64748b' }}>{item.subtitle}</div>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 13.5, color: '#16a34a' }}>
                        +{money(item.amount)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* UDHAR (CASH OUTFLOW) */}
            <div style={{ background: '#fff1f2', borderRadius: 14, border: '1.5px solid #fecdd3', padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#9f1239' }}>
                  📤 UDHAR / CASH OUT (ઉધાર)
                </span>
                <span style={{ fontSize: 16, fontWeight: 900, color: '#881337' }}>
                  {money(rojmelData.totalOut)}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
                {rojmelData.cashOutList.length === 0 ? (
                  <div style={{ fontSize: 13, color: '#fda4af', textAlign: 'center', padding: '24px 0' }}>
                    No cash paid out on this date.
                  </div>
                ) : (
                  rojmelData.cashOutList.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 12px',
                        background: '#ffffff',
                        borderRadius: 8,
                        border: '1px solid #fee2e2',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{item.title}</div>
                        <div style={{ fontSize: 11.5, color: '#64748b' }}>{item.subtitle}</div>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 13.5, color: '#dc2626' }}>
                        -{money(item.amount)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Daily Net Summary */}
          <div
            style={{
              marginTop: 20,
              padding: '16px 20px',
              borderRadius: 12,
              background: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div>
              <strong style={{ fontSize: 14, color: '#0f172a' }}>Daily Net Cash Movement:</strong>
              <div style={{ fontSize: 12, color: '#64748b' }}>Date: {fmtDate(rojmelDate)}</div>
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: rojmelData.netDayChange >= 0 ? '#15803d' : '#dc2626',
              }}
            >
              {rojmelData.netDayChange >= 0 ? `+${money(rojmelData.netDayChange)}` : money(rojmelData.netDayChange)}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB CONTENT 6: FINANCIAL REPORTS (P&L) ─── */}
      {activeTab === 'reports' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {/* P&L Statement */}
          <div style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 24 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
              Profit &amp; Loss Overview (P&amp;L)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#475569', fontWeight: 600 }}>Total Revenue / Sales:</span>
                <span style={{ fontWeight: 800, color: '#16a34a' }}>
                  {money((data.invoices || []).reduce((acc, i) => acc + Number(i.total || 0), 0))}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#475569', fontWeight: 600 }}>Total Purchases (COGS):</span>
                <span style={{ fontWeight: 800, color: '#dc2626' }}>
                  -{money((data.purchases || []).reduce((acc, p) => acc + Number(p.total || 0), 0))}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#475569', fontWeight: 600 }}>Operating Expenses:</span>
                <span style={{ fontWeight: 800, color: '#dc2626' }}>
                  -{money((data.expenses || []).reduce((acc, e) => acc + Number(e.amount || 0), 0))}
                </span>
              </div>

              {(() => {
                const rev = (data.invoices || []).reduce((acc, i) => acc + Number(i.total || 0), 0);
                const cogs = (data.purchases || []).reduce((acc, p) => acc + Number(p.total || 0), 0);
                const exp = (data.expenses || []).reduce((acc, e) => acc + Number(e.amount || 0), 0);
                const net = rev - cogs - exp;

                return (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '16px 14px',
                      borderRadius: 10,
                      background: net >= 0 ? '#f0fdf4' : '#fff1f2',
                      border: `1.5px solid ${net >= 0 ? '#bbf7d0' : '#fecdd3'}`,
                      marginTop: 10,
                    }}
                  >
                    <span style={{ fontWeight: 800, color: net >= 0 ? '#166534' : '#9f1239' }}>
                      Net Salon Profit:
                    </span>
                    <span style={{ fontWeight: 900, fontSize: 18, color: net >= 0 ? '#15803d' : '#be123c' }}>
                      {money(net)}
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Expense Category Breakdown */}
          <div style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 24 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
              Expense Breakdown by Category
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {EXPENSE_CATEGORIES.map((cat) => {
                const total = (data.expenses || [])
                  .filter((e) => e.category === cat)
                  .reduce((acc, e) => acc + Number(e.amount || 0), 0);

                if (total <= 0) return null;

                return (
                  <div
                    key={cat}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 8,
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontWeight: 600, color: '#334155' }}>{cat}</span>
                    <span style={{ fontWeight: 800, color: '#dc2626' }}>{money(total)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 1: QUICK SALE ─── */}
      <Modal isOpen={saleModalOpen} onClose={() => setSaleModalOpen(false)} title="Record New Sale (Vyapar Pro)">
        <form onSubmit={handleCreateSale} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Customer Name</label>
            <input
              type="text"
              placeholder="e.g. Pooja Patel"
              value={saleForm.customer}
              onChange={(e) => setSaleForm({ ...saleForm, customer: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Customer Mobile</label>
            <input
              type="tel"
              placeholder="10-digit number"
              value={saleForm.mobile}
              onChange={(e) => setSaleForm({ ...saleForm, mobile: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Service / Package Name</label>
            <input
              type="text"
              placeholder="e.g. Bridal HD Makeup + Hair Spa"
              value={saleForm.serviceName}
              onChange={(e) => setSaleForm({ ...saleForm, serviceName: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Total Amount (₹) *</label>
              <input
                type="number"
                placeholder="₹ Amount"
                required
                value={saleForm.total}
                onChange={(e) => setSaleForm({ ...saleForm, total: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Paid Amount (₹)</label>
              <input
                type="number"
                placeholder="Leave blank if fully paid"
                value={saleForm.paid}
                onChange={(e) => setSaleForm({ ...saleForm, paid: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Payment Mode</label>
            <select
              value={saleForm.mode}
              onChange={(e) => setSaleForm({ ...saleForm, mode: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}
            >
              <option value="Cash">Cash (Counter Drawer)</option>
              <option value="UPI / GPay">UPI (GPay / PhonePe / Paytm)</option>
              <option value="Card">Card POS</option>
              <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
            </select>
          </div>
          <button
            type="submit"
            style={{
              padding: '12px',
              borderRadius: 8,
              background: '#059669',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: 14,
              border: 'none',
              cursor: 'pointer',
              marginTop: 6,
            }}
          >
            Save Sale Invoice
          </button>
        </form>
      </Modal>

      {/* ─── MODAL 2: QUICK PURCHASE ─── */}
      <Modal isOpen={purchaseModalOpen} onClose={() => setPurchaseModalOpen(false)} title="Record Purchase (Vendor Bill)">
        <form onSubmit={handleCreatePurchase} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Supplier Name</label>
            <input
              type="text"
              placeholder="e.g. L'Oreal Professional / Matrix Distributor"
              value={purchaseForm.supplierName}
              onChange={(e) => setPurchaseForm({ ...purchaseForm, supplierName: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Supplier Bill / Invoice #</label>
            <input
              type="text"
              placeholder="e.g. GST-9982"
              value={purchaseForm.supplierInvoice}
              onChange={(e) => setPurchaseForm({ ...purchaseForm, supplierInvoice: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Product / Item Name</label>
            <input
              type="text"
              placeholder="e.g. Hair Serum Box (10 pcs)"
              value={purchaseForm.productName}
              onChange={(e) => setPurchaseForm({ ...purchaseForm, productName: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Total Amount (₹) *</label>
              <input
                type="number"
                placeholder="₹ Total"
                required
                value={purchaseForm.rate}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, rate: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Paid Amount (₹)</label>
              <input
                type="number"
                placeholder="Leave blank if fully paid"
                value={purchaseForm.paid}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, paid: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Payment Mode</label>
            <select
              value={purchaseForm.mode}
              onChange={(e) => setPurchaseForm({ ...purchaseForm, mode: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}
            >
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer (HDFC / ICICI)</option>
              <option value="UPI">UPI</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>
          <button
            type="submit"
            style={{
              padding: '12px',
              borderRadius: 8,
              background: '#2563eb',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: 14,
              border: 'none',
              cursor: 'pointer',
              marginTop: 6,
            }}
          >
            Save Purchase Bill
          </button>
        </form>
      </Modal>

      {/* ─── MODAL 3: PAYMENT IN ─── */}
      <Modal isOpen={paymentInModalOpen} onClose={() => setPaymentInModalOpen(false)} title="Record Payment Received (Payment-In)">
        <form onSubmit={handleCreatePaymentIn} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Customer / Party Name *</label>
            <input
              type="text"
              placeholder="e.g. Ananya Sharma"
              required
              value={paymentInForm.partyName}
              onChange={(e) => setPaymentInForm({ ...paymentInForm, partyName: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Amount Received (₹) *</label>
            <input
              type="number"
              placeholder="₹ Amount"
              required
              value={paymentInForm.amount}
              onChange={(e) => setPaymentInForm({ ...paymentInForm, amount: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Received Via</label>
            <select
              value={paymentInForm.mode}
              onChange={(e) => setPaymentInForm({ ...paymentInForm, mode: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}
            >
              <option value="Cash">Cash (Counter Drawer)</option>
              <option value="UPI / GPay">UPI (GPay / PhonePe / Paytm)</option>
              <option value="Bank Transfer">Bank Transfer (HDFC / ICICI)</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Notes / Reference</label>
            <input
              type="text"
              placeholder="e.g. Bridal advance / settlement"
              value={paymentInForm.notes}
              onChange={(e) => setPaymentInForm({ ...paymentInForm, notes: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '12px',
              borderRadius: 8,
              background: '#0d9488',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: 14,
              border: 'none',
              cursor: 'pointer',
              marginTop: 6,
            }}
          >
            Save Payment In
          </button>
        </form>
      </Modal>

      {/* ─── MODAL 4: PAYMENT OUT ─── */}
      <Modal isOpen={paymentOutModalOpen} onClose={() => setPaymentOutModalOpen(false)} title="Record Payment Made (Payment-Out)">
        <form onSubmit={handleCreatePaymentOut} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Supplier / Vendor Name *</label>
            <input
              type="text"
              placeholder="e.g. Beauty Wholesale Agency"
              required
              value={paymentOutForm.partyName}
              onChange={(e) => setPaymentOutForm({ ...paymentOutForm, partyName: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Amount Paid (₹) *</label>
            <input
              type="number"
              placeholder="₹ Amount"
              required
              value={paymentOutForm.amount}
              onChange={(e) => setPaymentOutForm({ ...paymentOutForm, amount: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Paid Via</label>
            <select
              value={paymentOutForm.mode}
              onChange={(e) => setPaymentOutForm({ ...paymentOutForm, mode: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}
            >
              <option value="Cash">Cash (Counter Drawer)</option>
              <option value="UPI / GPay">UPI (GPay / PhonePe / Paytm)</option>
              <option value="Bank Transfer">Bank Transfer (HDFC / ICICI)</option>
            </select>
          </div>
          <button
            type="submit"
            style={{
              padding: '12px',
              borderRadius: 8,
              background: '#d97706',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: 14,
              border: 'none',
              cursor: 'pointer',
              marginTop: 6,
            }}
          >
            Save Payment Out
          </button>
        </form>
      </Modal>

      {/* ─── MODAL 5: EXPENSE ─── */}
      <Modal isOpen={expenseModalOpen} onClose={() => setExpenseModalOpen(false)} title="Record Operating Expense">
        <form onSubmit={handleCreateExpense} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Category *</label>
            <select
              value={expenseForm.category}
              onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Amount (₹) *</label>
            <input
              type="number"
              placeholder="₹ Amount"
              required
              value={expenseForm.amount}
              onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Paid To (Person / Vendor)</label>
            <input
              type="text"
              placeholder="e.g. Tea stall, Torrent Power, Landlord"
              value={expenseForm.paidTo}
              onChange={(e) => setExpenseForm({ ...expenseForm, paidTo: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Payment Source</label>
            <select
              value={expenseForm.mode}
              onChange={(e) => setExpenseForm({ ...expenseForm, mode: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}
            >
              <option value="Cash">Cash (Counter Drawer)</option>
              <option value="UPI / GPay">UPI (GPay / PhonePe / Paytm)</option>
              <option value="Bank Transfer">Bank Transfer (HDFC / ICICI)</option>
            </select>
          </div>
          <button
            type="submit"
            style={{
              padding: '12px',
              borderRadius: 8,
              background: '#e11d48',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: 14,
              border: 'none',
              cursor: 'pointer',
              marginTop: 6,
            }}
          >
            Save Expense
          </button>
        </form>
      </Modal>

      {/* ─── MODAL 6: PARTY (CUSTOMER / SUPPLIER) ─── */}
      <Modal isOpen={partyModalOpen} onClose={() => setPartyModalOpen(false)} title="Create New Party (Khata Book)">
        <form onSubmit={handleCreateParty} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Party Type</label>
            <div style={{ display: 'flex', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13 }}>
                <input
                  type="radio"
                  name="partyType"
                  checked={partyForm.type === 'Customer'}
                  onChange={() => setPartyForm({ ...partyForm, type: 'Customer', openingType: 'To Receive' })}
                />
                Customer
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13 }}>
                <input
                  type="radio"
                  name="partyType"
                  checked={partyForm.type === 'Supplier'}
                  onChange={() => setPartyForm({ ...partyForm, type: 'Supplier', openingType: 'To Pay' })}
                />
                Supplier / Vendor
              </label>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Party Name *</label>
            <input
              type="text"
              placeholder="e.g. Radhika Bridal Wear"
              required
              value={partyForm.name}
              onChange={(e) => setPartyForm({ ...partyForm, name: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Mobile Number</label>
            <input
              type="tel"
              placeholder="10-digit mobile"
              value={partyForm.mobile}
              onChange={(e) => setPartyForm({ ...partyForm, mobile: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Opening Balance (₹)</label>
              <input
                type="number"
                placeholder="0"
                value={partyForm.openingBalance}
                onChange={(e) => setPartyForm({ ...partyForm, openingBalance: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Balance Type</label>
              <select
                value={partyForm.openingType}
                onChange={(e) => setPartyForm({ ...partyForm, openingType: e.target.value as any })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}
              >
                <option value="To Receive">To Receive (Get)</option>
                <option value="To Pay">To Pay (Payable)</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            style={{
              padding: '12px',
              borderRadius: 8,
              background: '#7c3aed',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: 14,
              border: 'none',
              cursor: 'pointer',
              marginTop: 6,
            }}
          >
            Create Party
          </button>
        </form>
      </Modal>

      {/* ─── MODAL 7: BANK ACCOUNTS & UPI MANAGEMENT ─── */}
      <Modal isOpen={bankModalOpen} onClose={() => setBankModalOpen(false)} title="🏦 Bank Accounts & UPI Management">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Add Bank Form */}
          <form
            onSubmit={handleCreateBank}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              background: '#f8fafc',
              padding: 16,
              borderRadius: 12,
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 13.5, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Landmark size={16} color="#0284c7" /> + Add New Bank Account / UPI ID
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Bank / Account Name *</label>
              <input
                type="text"
                placeholder="e.g. HDFC Bank, SBI Current, GPay UPI"
                required
                value={bankForm.name}
                onChange={(e) => setBankForm({ ...bankForm, name: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Account Number</label>
                <input
                  type="text"
                  placeholder="e.g. 50200012345678"
                  value={bankForm.accountNo}
                  onChange={(e) => setBankForm({ ...bankForm, accountNo: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>IFSC Code</label>
                <input
                  type="text"
                  placeholder="e.g. HDFC0001234"
                  value={bankForm.ifsc}
                  onChange={(e) => setBankForm({ ...bankForm, ifsc: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>UPI ID (VPA)</label>
                <input
                  type="text"
                  placeholder="e.g. shreebeauty@okaxis"
                  value={bankForm.upiId}
                  onChange={(e) => setBankForm({ ...bankForm, upiId: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Opening Balance (₹)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={bankForm.openingBalance}
                  onChange={(e) => setBankForm({ ...bankForm, openingBalance: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>
            </div>
            <button
              type="submit"
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                background: '#0284c7',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: 13.5,
                border: 'none',
                cursor: 'pointer',
                marginTop: 4,
              }}
            >
              Add Bank Account
            </button>
          </form>

          {/* Existing Bank Accounts List */}
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', marginBottom: 10 }}>
              Saved Bank &amp; UPI Accounts ({(data.bankAccounts || []).length})
            </div>
            {(data.bankAccounts || []).length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: 13, background: '#f8fafc', borderRadius: 10 }}>
                No custom bank accounts added yet. (Default: HDFC / ICICI / Online)
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 240, overflowY: 'auto' }}>
                {(data.bankAccounts || []).map((acc: BankAccount) => (
                  <div
                    key={acc.id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: '1px solid #e2e8f0',
                      background: '#ffffff',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Landmark size={14} color="#0284c7" /> {acc.name}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        {acc.accountNo ? `A/c: ${acc.accountNo}` : ''} {acc.ifsc ? `• IFSC: ${acc.ifsc}` : ''} {acc.upiId ? `• UPI: ${acc.upiId}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Opening Bal</div>
                        <div style={{ fontWeight: 800, fontSize: 13.5, color: '#0f172a' }}>{money(acc.openingBalance || 0)}</div>
                      </div>
                      <button
                        onClick={() => handleDeleteBank(acc.id, acc.name)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: 4,
                        }}
                        title="Delete Bank Account"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* ─── INVOICE RECEIPT MODAL ─── */}
      <InvoiceReceiptModal
        isOpen={!!viewInvoice}
        onClose={() => setViewInvoice(null)}
        invoice={viewInvoice}
        salonData={data}
      />
    </div>
  );
}
