'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Plus,
  Search,
  Receipt,
  Phone,
  MessageCircle,
  Pencil,
  Trash2,
  AlertTriangle,
  ArrowUpRight,
  TrendingDown,
  ShoppingBag,
  CreditCard,
  Printer,
  Share2,
  FileSpreadsheet,
  CheckCircle2,
  X,
} from 'lucide-react';
import { useSalonStore } from '@/lib/store';
import { scheduleSave } from '@/lib/sync';
import { uid, money, fmtDate, todayISO } from '@/lib/utils';
import { Supplier, Purchase, PaymentVoucher } from '@/types/salon';
import { openWA } from '@/lib/whatsapp';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { staggerContainer, fadeSlideUp } from '@/variants';

type SupplierTab = 'all' | 'dues';

export default function SuppliersPage() {
  const { data, updateData } = useSalonStore();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<SupplierTab>('all');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewLedgerSupplier, setViewLedgerSupplier] = useState<Supplier | null>(null);

  // Payment Out Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paySupplier, setPaySupplier] = useState<Supplier | null>(null);
  const [payAmount, setPayAmount] = useState<number | ''>('');
  const [payMode, setPayMode] = useState(data?.settings?.payments?.[0] || 'Cash');
  const [payRef, setPayRef] = useState('');
  const [payDate, setPayDate] = useState(todayISO());
  const [payNotes, setPayNotes] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [opening, setOpening] = useState(0);
  const [paymentTerms, setPaymentTerms] = useState('Immediate');
  const [bankName, setBankName] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [upiId, setUpiId] = useState('');
  const [notes, setNotes] = useState('');

  const suppliers = data?.suppliers || [];
  const purchases = data?.purchases || [];
  const vouchers = data?.vouchers || [];

  // Metrics and Running Ledgers for suppliers
  const supplierStats = useMemo(() => {
    let totalPurchasesSum = 0;
    let totalPaidSum = 0;
    let totalDueSum = 0;

    const map: Record<
      string,
      {
        purchaseTotal: number;
        paid: number;
        due: number;
        count: number;
        invoices: Purchase[];
        vouchers: PaymentVoucher[];
        ledgerRows: {
          date: string;
          type: 'Opening Balance' | 'Purchase Bill' | 'Payment-Out';
          refNo: string;
          debit: number;
          credit: number;
          balance: number;
          mode?: string;
        }[];
      }
    > = {};

    suppliers.forEach((s) => {
      const sp = purchases.filter((p) => p.supplierId === s.id);
      const sv = vouchers.filter((v) => v.partyId === s.id && v.type === 'Payment-Out');

      const pTotal = sp.reduce((acc, p) => acc + Number(p.total || 0), 0);
      const directPaid = sp.reduce((acc, p) => acc + Number(p.paid || 0), 0);
      const voucherPaid = sv.reduce((acc, v) => acc + Number(v.amount || 0), 0);
      const totalPaid = directPaid + voucherPaid;

      // Net due = Opening + Purchases - Total Paid
      const due = Math.max(0, Number(s.opening || 0) + pTotal - totalPaid);

      // Build Chronological Ledger Entries
      const ledgerEvents: {
        date: string;
        type: 'Opening Balance' | 'Purchase Bill' | 'Payment-Out';
        refNo: string;
        debit: number;
        credit: number;
        mode?: string;
      }[] = [];

      if (Number(s.opening || 0) > 0) {
        ledgerEvents.push({
          date: 'Opening',
          type: 'Opening Balance',
          refNo: 'OPENING',
          debit: Number(s.opening || 0),
          credit: 0,
        });
      }

      sp.forEach((p) => {
        ledgerEvents.push({
          date: p.date,
          type: 'Purchase Bill',
          refNo: p.no + (p.supplierInvoice ? ` (${p.supplierInvoice})` : ''),
          debit: Number(p.total || 0),
          credit: Number(p.paid || 0),
          mode: p.mode,
        });
      });

      sv.forEach((v) => {
        ledgerEvents.push({
          date: v.date,
          type: 'Payment-Out',
          refNo: v.voucherNo + (v.referenceNo ? ` [${v.referenceNo}]` : ''),
          debit: 0,
          credit: Number(v.amount || 0),
          mode: v.mode,
        });
      });

      // Sort by date
      ledgerEvents.sort((a, b) => (a.date === 'Opening' ? -1 : b.date === 'Opening' ? 1 : a.date.localeCompare(b.date)));

      let runningBal = 0;
      const ledgerRows = ledgerEvents.map((e) => {
        runningBal += e.debit - e.credit;
        return { ...e, balance: runningBal };
      });

      map[s.id] = {
        purchaseTotal: pTotal,
        paid: totalPaid,
        due,
        count: sp.length,
        invoices: sp,
        vouchers: sv,
        ledgerRows,
      };

      totalPurchasesSum += pTotal;
      totalPaidSum += totalPaid;
      totalDueSum += due;
    });

    return { map, totalPurchasesSum, totalPaidSum, totalDueSum };
  }, [suppliers, purchases, vouchers]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return suppliers.filter((s) => {
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.contact && s.contact.toLowerCase().includes(q)) ||
        (s.mobile && s.mobile.includes(q)) ||
        (s.gstin && s.gstin.toLowerCase().includes(q)) ||
        (s.city && s.city.toLowerCase().includes(q));

      if (activeTab === 'dues') {
        const stat = supplierStats.map[s.id];
        return matchesSearch && stat && stat.due > 0;
      }
      return matchesSearch;
    });
  }, [suppliers, search, activeTab, supplierStats]);

  const suppliersWithDuesCount = useMemo(
    () => suppliers.filter((s) => (supplierStats.map[s.id]?.due || 0) > 0).length,
    [suppliers, supplierStats]
  );

  const openAdd = () => {
    setEditingId(null);
    setName('');
    setContact('');
    setMobile('');
    setEmail('');
    setGstin('');
    setPan('');
    setAddress('');
    setCity('');
    setState('');
    setPincode('');
    setOpening(0);
    setPaymentTerms('Immediate');
    setBankName('');
    setAccountNo('');
    setIfsc('');
    setUpiId('');
    setNotes('');
    setModalOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditingId(s.id);
    setName(s.name);
    setContact(s.contact || '');
    setMobile(s.mobile || '');
    setEmail(s.email || '');
    setGstin(s.gstin || '');
    setPan(s.pan || '');
    setAddress(s.address || '');
    setCity(s.city || '');
    setState(s.state || '');
    setPincode(s.pincode || '');
    setOpening(s.opening || 0);
    setPaymentTerms(s.paymentTerms || 'Immediate');
    setBankName(s.bankName || '');
    setAccountNo(s.accountNo || '');
    setIfsc(s.ifsc || '');
    setUpiId(s.upiId || '');
    setNotes(s.notes || '');
    setModalOpen(true);
  };

  const openPaymentOut = (s: Supplier) => {
    const due = supplierStats.map[s.id]?.due || 0;
    setPaySupplier(s);
    setPayAmount(due > 0 ? due : '');
    setPayMode(data?.settings?.payments?.[0] || 'Cash');
    setPayRef('');
    setPayDate(todayISO());
    setPayNotes(`Payment against outstanding balance to ${s.name}`);
    setPaymentModalOpen(true);
  };

  const handleSavePaymentOut = () => {
    if (!paySupplier) return;
    const numAmt = Number(payAmount || 0);
    if (numAmt <= 0) {
      toast('Please enter a valid payment amount.', 'error');
      return;
    }

    const voucherSeq = data?.voucherSeq || 1001;
    const vNo = `PAY-OUT-${voucherSeq}`;

    const newVoucher: PaymentVoucher = {
      id: uid(),
      voucherNo: vNo,
      type: 'Payment-Out',
      partyType: 'Supplier',
      partyId: paySupplier.id,
      partyName: paySupplier.name,
      partyMobile: paySupplier.mobile,
      date: payDate,
      amount: numAmt,
      mode: payMode,
      referenceNo: payRef.trim(),
      notes: payNotes.trim(),
    };

    updateData((d) => ({
      ...d,
      vouchers: [newVoucher, ...(d.vouchers || [])],
      voucherSeq: voucherSeq + 1,
    }));

    scheduleSave();
    toast(`✅ Payment of ₹${numAmt} recorded to ${paySupplier.name}!`);
    setPaymentModalOpen(false);
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast('Supplier company or store name is required.', 'error');
      return;
    }

    const supplierObj: Supplier = {
      id: editingId || uid(),
      name: name.trim(),
      contact: contact.trim(),
      mobile: mobile.trim(),
      email: email.trim(),
      gstin: gstin.trim().toUpperCase(),
      pan: pan.trim().toUpperCase(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      opening: Number(opening || 0),
      paymentTerms: paymentTerms || 'Immediate',
      bankName: bankName.trim(),
      accountNo: accountNo.trim(),
      ifsc: ifsc.trim().toUpperCase(),
      upiId: upiId.trim(),
      notes: notes.trim(),
    };

    updateData((d) => {
      const list = [...(d.suppliers || [])];
      const idx = list.findIndex((s) => s.id === supplierObj.id);
      if (idx >= 0) list[idx] = supplierObj;
      else list.push(supplierObj);
      return { ...d, suppliers: list };
    });

    scheduleSave();
    toast(editingId ? 'Supplier details updated!' : 'Supplier added successfully!');
    setModalOpen(false);
  };

  const handleDelete = (s: Supplier) => {
    const used = purchases.filter((p) => p.supplierId === s.id).length;
    if (
      confirm(
        'Delete supplier ' + s.name + '?' +
        (used ? '\n\nNote: ' + used + ' purchase record(s) will remain in purchase history.' : '')
      )
    ) {
      updateData((d) => ({
        ...d,
        suppliers: (d.suppliers || []).filter((x) => x.id !== s.id),
      }));
      scheduleSave();
      toast('Supplier removed.');
    }
  };

  // WhatsApp Statement Send
  const sendWhatsAppStatement = (s: Supplier) => {
    if (!s.mobile) {
      toast('Please enter mobile number to send WhatsApp statement.', 'error');
      return;
    }
    const stat = supplierStats.map[s.id];
    const salon = data?.settings?.salon || 'Shree Beauty Studio';
    const lines = [
      `🏢 *PARTY LEDGER STATEMENT*`,
      `*${salon}*`,
      `━━━━━━━━━━━━━━━━━━`,
      `*Supplier:* ${s.name}`,
      s.contact ? `*Contact:* ${s.contact}` : '',
      `*Date:* ${fmtDate(todayISO())}`,
      `━━━━━━━━━━━━━━━━━━`,
      `• *Total Purchases:* ${money(stat?.purchaseTotal || 0)}`,
      `• *Total Paid:* ${money(stat?.paid || 0)}`,
      `• *Current Balance Due:* ${money(stat?.due || 0)}`,
      `━━━━━━━━━━━━━━━━━━`,
      `Thank you for your business! 🙏`,
    ]
      .filter(Boolean)
      .join('\n');

    openWA(s.mobile, lines);
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
          <div className="stat-card-icon" style={{ background: 'rgba(5,66,74,.1)', color: '#05424A' }}>
            <Building2 size={20} />
          </div>
          <div className="stat-card-label">Total Suppliers</div>
          <div className="stat-card-value">{suppliers.length}</div>
          <div className="stat-card-sub">Active Stockists & Distributors</div>
        </motion.div>

        <motion.div className="stat-card" variants={fadeSlideUp}>
          <div className="stat-card-icon" style={{ background: 'rgba(35,163,109,.12)', color: '#23a36d' }}>
            <ShoppingBag size={20} />
          </div>
          <div className="stat-card-label">Total Purchased Volume</div>
          <div className="stat-card-value">{money(supplierStats.totalPurchasesSum)}</div>
          <div className="stat-card-sub">{purchases.length} Purchase Invoices</div>
        </motion.div>

        <motion.div className="stat-card" variants={fadeSlideUp}>
          <div className="stat-card-icon" style={{ background: 'rgba(230,154,34,.12)', color: '#e69a22' }}>
            <CreditCard size={20} />
          </div>
          <div className="stat-card-label">Total Paid to Vendors</div>
          <div className="stat-card-value" style={{ color: 'var(--green)' }}>
            {money(supplierStats.totalPaidSum)}
          </div>
          <div className="stat-card-sub">Settled via Cash/UPI/Bank</div>
        </motion.div>

        <motion.div className="stat-card" variants={fadeSlideUp}>
          <div className="stat-card-icon" style={{ background: 'rgba(217,48,37,.1)', color: '#d93025' }}>
            <AlertTriangle size={20} />
          </div>
          <div className="stat-card-label">Total Outstanding Dues</div>
          <div className="stat-card-value" style={{ color: 'var(--red)' }}>
            {money(supplierStats.totalDueSum)}
          </div>
          <div className="stat-card-sub">{suppliersWithDuesCount} Suppliers Pending</div>
        </motion.div>
      </motion.div>

      {/* Main Toolbar */}
      <div className="toolbar" style={{ justifyContent: 'space-between', marginTop: 16 }}>
        <div className="search-wrap" style={{ flex: 1, maxWidth: 360 }}>
          <Search size={15} className="search-icon" />
          <input
            type="search"
            className="input"
            placeholder="Search company, contact, GSTIN, city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link href="/purchases" className="btn btn-ghost">
            <Receipt size={14} /> Product Purchases ({purchases.length})
          </Link>
          <motion.button className="btn btn-primary" onClick={openAdd} whileTap={{ scale: 0.97 }}>
            <Plus size={15} /> Add Supplier
          </motion.button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <Building2 size={14} />
          <span>All Suppliers</span>
          <span className="tab-badge">{suppliers.length}</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'dues' ? 'active' : ''}`}
          onClick={() => setActiveTab('dues')}
        >
          <AlertTriangle size={14} />
          <span>Pending Dues</span>
          <span className="tab-badge danger">{suppliersWithDuesCount}</span>
        </button>
      </div>

      {/* Suppliers Table */}
      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <Building2 size={48} />
            <h3>{search ? 'No suppliers match search' : 'No suppliers registered yet'}</h3>
            <p>Register your product distributors, stockists, and cosmetic vendors to track purchases and ledger accounts.</p>
            {!search && (
              <motion.button className="btn btn-primary btn-sm" onClick={openAdd} whileTap={{ scale: 0.97 }} style={{ marginTop: 8 }}>
                <Plus size={14} /> Add First Supplier
              </motion.button>
            )}
          </div>
        ) : (
          <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Supplier & Tax Info</th>
                        <th>Contact & Mobile</th>
                        <th>Purchases & Paid</th>
                        <th>Current Balance Due</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <motion.tbody variants={staggerContainer} initial="hidden" animate="visible">
                      {filtered.map((s) => {
                        const stat = supplierStats.map[s.id] || { purchaseTotal: 0, paid: 0, due: 0, count: 0 };
                        const hasDue = stat.due > 0;

                        return (
                          <motion.tr key={s.id} variants={fadeSlideUp}>
                            <td>
                              <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13.5 }}>
                                {s.name}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                                {s.city && <span>📍 {s.city}{s.state ? ', ' + s.state : ''}</span>}
                                {s.gstin ? (
                                  <span style={{ fontFamily: 'monospace', color: 'var(--teal)', fontWeight: 600 }}>
                                    GST: {s.gstin}
                                  </span>
                                ) : s.pan ? (
                                  <span style={{ fontFamily: 'monospace' }}>PAN: {s.pan}</span>
                                ) : null}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{s.contact || '—'}</div>
                              {s.mobile && (
                                <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                  <span>{s.mobile}</span>
                                  <button
                                    className="btn-icon wa"
                                    style={{ width: 20, height: 20 }}
                                    title="WhatsApp Supplier"
                                    onClick={() =>
                                      openWA(
                                        s.mobile!,
                                        `Hello ${s.contact || s.name},\nThis is from ${data?.settings?.salon || 'Shree Beauty Studio'}.`
                                      )
                                    }
                                  >
                                    <MessageCircle size={11} />
                                  </button>
                                </div>
                              )}
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>
                                Purchases: {money(stat.purchaseTotal)}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600, marginTop: 2 }}>
                                Paid: {money(stat.paid)}
                              </div>
                            </td>
                            <td>
                              <span
                                style={{
                                  fontSize: 13.5,
                                  fontWeight: 800,
                                  color: hasDue ? 'var(--red)' : 'var(--green)',
                                }}
                              >
                                {money(stat.due)}
                              </span>
                              {hasDue && (
                                <div style={{ fontSize: 10.5, color: 'var(--red)', fontWeight: 600 }}>
                                  Payment Pending
                                </div>
                              )}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                <button
                                  className="btn btn-sm btn-ghost"
                                  style={{ fontSize: 10.5, padding: '3px 7px', color: 'var(--green)', borderColor: '#86efac' }}
                                  title="Record Payment-Out"
                                  onClick={() => openPaymentOut(s)}
                                >
                                  <CreditCard size={11} /> Pay
                                </button>
                                <button
                                  className="btn btn-sm btn-ghost"
                                  style={{ fontSize: 10.5, padding: '3px 7px', color: 'var(--teal)' }}
                                  title="View Ledger Statement"
                                  onClick={() => setViewLedgerSupplier(s)}
                                >
                                  <Receipt size={11} /> Ledger
                                </button>
                                <button className="btn-icon edit" onClick={() => openEdit(s)} title="Edit Supplier">
                                  <Pencil size={13} />
                                </button>
                                <button className="btn-icon danger" onClick={() => handleDelete(s)} title="Delete Supplier">
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

      {/* Supplier Ledger Statement Modal (Vyapar Format) */}
      {viewLedgerSupplier && (
        <Modal
          isOpen={!!viewLedgerSupplier}
          onClose={() => setViewLedgerSupplier(null)}
          title={`📑 Party Ledger Statement: ${viewLedgerSupplier.name}`}
          wide
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => sendWhatsAppStatement(viewLedgerSupplier)}>
                  <MessageCircle size={13} color="#16a34a" /> WhatsApp Statement
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>
                  <Printer size={13} /> Print Statement
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ background: 'var(--green)', borderColor: 'var(--green)' }}
                  onClick={() => {
                    openPaymentOut(viewLedgerSupplier);
                  }}
                >
                  <CreditCard size={13} /> Record Payment-Out
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setViewLedgerSupplier(null)}>
                  Close
                </button>
              </div>
            </div>
          }
        >
          {/* Supplier Info Header */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: 16,
              marginBottom: 16,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 12,
              fontSize: 12.5,
            }}
          >
            <div>
              <div style={{ color: 'var(--muted)' }}>Contact Person</div>
              <div style={{ fontWeight: 700 }}>{viewLedgerSupplier.contact || '—'}</div>
            </div>
            <div>
              <div style={{ color: 'var(--muted)' }}>Mobile Number</div>
              <div style={{ fontWeight: 700 }}>{viewLedgerSupplier.mobile || '—'}</div>
            </div>
            <div>
              <div style={{ color: 'var(--muted)' }}>GSTIN / Tax No</div>
              <div style={{ fontWeight: 700, color: 'var(--teal)' }}>{viewLedgerSupplier.gstin || 'Unregistered'}</div>
            </div>
            <div>
              <div style={{ color: 'var(--muted)' }}>Bank & UPI</div>
              <div style={{ fontWeight: 700 }}>
                {viewLedgerSupplier.bankName
                  ? `${viewLedgerSupplier.bankName} (A/C: ${viewLedgerSupplier.accountNo})`
                  : viewLedgerSupplier.upiId || '—'}
              </div>
            </div>
          </div>

          {/* KPI Snapshot */}
          <div className="stats-grid" style={{ marginBottom: 16 }}>
            <div className="stat-card">
              <div className="stat-card-label">Total Purchased (₹)</div>
              <div className="stat-card-value">{money(supplierStats.map[viewLedgerSupplier.id]?.purchaseTotal || 0)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Total Paid (₹)</div>
              <div className="stat-card-value" style={{ color: 'var(--green)' }}>
                {money(supplierStats.map[viewLedgerSupplier.id]?.paid || 0)}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Current Outstanding Due (₹)</div>
              <div
                className="stat-card-value"
                style={{
                  color: (supplierStats.map[viewLedgerSupplier.id]?.due || 0) > 0 ? 'var(--red)' : 'var(--green)',
                }}
              >
                {money(supplierStats.map[viewLedgerSupplier.id]?.due || 0)}
              </div>
            </div>
          </div>

          {/* Chronological Running Ledger Table */}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Transaction Type</th>
                  <th>Reference / Doc No</th>
                  <th>Payment Mode</th>
                  <th style={{ textAlign: 'right' }}>Debit (Bills ₹)</th>
                  <th style={{ textAlign: 'right' }}>Credit (Paid ₹)</th>
                  <th style={{ textAlign: 'right' }}>Running Balance (₹)</th>
                </tr>
              </thead>
              <tbody>
                {(supplierStats.map[viewLedgerSupplier.id]?.ledgerRows || []).length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>
                      No ledger transactions recorded yet for this supplier.
                    </td>
                  </tr>
                ) : (
                  (supplierStats.map[viewLedgerSupplier.id]?.ledgerRows || []).map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ whiteSpace: 'nowrap' }}>{row.date === 'Opening' ? 'Opening' : fmtDate(row.date)}</td>
                      <td>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 99,
                            background:
                              row.type === 'Purchase Bill'
                                ? '#eff6ff'
                                : row.type === 'Payment-Out'
                                ? '#f0fdf4'
                                : '#f8fafc',
                            color:
                              row.type === 'Purchase Bill'
                                ? '#1d4ed8'
                                : row.type === 'Payment-Out'
                                ? '#15803d'
                                : '#475569',
                          }}
                        >
                          {row.type}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{row.refNo}</td>
                      <td>{row.mode || '—'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {row.debit > 0 ? money(row.debit) : '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--green)' }}>
                        {row.credit > 0 ? money(row.credit) : '—'}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontWeight: 700,
                          color: row.balance > 0 ? 'var(--red)' : 'var(--green)',
                        }}
                      >
                        {money(row.balance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Modal>
      )}

      {/* Record Payment-Out Modal */}
      {paySupplier && (
        <Modal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          title={`💸 Record Payment-Out to ${paySupplier.name}`}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setPaymentModalOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSavePaymentOut}>
                <CheckCircle2 size={15} /> Save Payment Voucher
              </button>
            </>
          }
        >
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                <span>Supplier: <b>{paySupplier.name}</b></span>
                <span>Current Outstanding Due: <b style={{ color: 'var(--red)' }}>{money(supplierStats.map[paySupplier.id]?.due || 0)}</b></span>
              </div>
            </div>

            <div className="form-group">
              <label className="label">Payment Date</label>
              <input type="date" className="input" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="label">Amount Paid (₹) *</label>
              <input
                type="number"
                min={1}
                className="input"
                placeholder="Enter amount paid"
                value={payAmount}
                onChange={(e) => setPayAmount(Number(e.target.value) || '')}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="label">Payment Mode</label>
              <select className="input" value={payMode} onChange={(e) => setPayMode(e.target.value)}>
                {(data?.settings?.payments || ['Cash', 'GPay UPI', 'PhonePe UPI', 'Bank Transfer', 'Card', 'Cheque']).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="label">Transaction / UTR / Cheque Ref No</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. UPI Ref #489201938"
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="label">Notes / Description</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Settle January cosmetics delivery"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Add/Edit Supplier Profile Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? '✎ Edit Supplier Profile' : '🏢 Add New Supplier'}
        wide
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            <motion.button className="btn btn-primary" onClick={handleSave} whileTap={{ scale: 0.97 }}>
              {editingId ? 'Update Supplier' : 'Save Supplier'}
            </motion.button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="label">Company / Distributor / Store Name *</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. L'Oreal Professional Distributor / Surat Cosmetics Hub"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="label">Contact Person Name</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Rajeshbhai Shah"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="label">Mobile / WhatsApp Number</label>
            <input
              type="tel"
              className="input"
              placeholder="10-digit mobile number"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="label">Email Address</label>
            <input
              type="email"
              className="input"
              placeholder="supplier@cosmetics.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="label">GSTIN (Tax ID)</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. 24ABCDE1234F1Z5"
              value={gstin}
              onChange={(e) => setGstin(e.target.value)}
              maxLength={15}
            />
          </div>

          <div className="form-group">
            <label className="label">PAN Number</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. ABCDE1234F"
              value={pan}
              onChange={(e) => setPan(e.target.value)}
              maxLength={10}
            />
          </div>

          <div className="form-group">
            <label className="label">Opening Balance Due (₹)</label>
            <input
              type="number"
              min={0}
              className="input"
              placeholder="₹ 0 (Previous pending balance)"
              value={opening || ''}
              onChange={(e) => setOpening(Number(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label className="label">Payment Terms</label>
            <select
              className="input"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
            >
              <option value="Immediate">Immediate / Advance</option>
              <option value="Net 7 Days">Net 7 Days</option>
              <option value="Net 15 Days">Net 15 Days</option>
              <option value="Net 30 Days">Net 30 Days</option>
              <option value="Credit on Delivery">Credit on Delivery</option>
            </select>
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="label">Physical Address</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Shop 12, Ring Road Textile & Cosmetics Market"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="label">City</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Surat"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="label">State</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Gujarat"
              value={state}
              onChange={(e) => setState(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="label">Bank Name</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. HDFC Bank / ICICI Bank"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="label">Account Number</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. 5010029482910"
              value={accountNo}
              onChange={(e) => setAccountNo(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="label">IFSC Code</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. HDFC0000123"
              value={ifsc}
              onChange={(e) => setIfsc(e.target.value.toUpperCase())}
            />
          </div>

          <div className="form-group">
            <label className="label">UPI ID / VPA</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. supplier@okhdfcbank"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="label">Internal Notes</label>
            <input
              type="text"
              className="input"
              placeholder="Distributor discounts, rep visit days, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
