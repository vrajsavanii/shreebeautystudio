'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Pencil, Trash2, Heart, Calendar, MessageCircle, ChevronRight, ChevronLeft,
  Sparkles, Check, Crown, User, CalendarDays, ShoppingBag, FileText, CheckCircle,
  Receipt, Download, Eye
} from 'lucide-react';
import { useSalonStore } from '@/lib/store';
import { scheduleSave } from '@/lib/sync';
import { uid, todayISO, money, fmtDate, formatCustomerContactName } from '@/lib/utils';
import { BridalBooking, BridalPackage, Invoice, InvoiceLine } from '@/types/salon';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { openWA, openWAWeb, bridalMessage } from '@/lib/whatsapp';
import { downloadInvoicePDF, sendInvoicePDFViaWhatsApp } from '@/lib/invoice-pdf';
import { downloadBridalRateCardPDF, sendBridalRateCardPDFViaWhatsApp } from '@/lib/bridal-pdf';
import InvoiceReceiptModal from '@/components/billing/InvoiceReceiptModal';
import { staggerContainer, fadeSlideUp } from '@/variants';
import { subDays, format, parseISO } from 'date-fns';

type MainTab = 'bookings' | 'packages';

export default function BridalPage() {
  const { data, updateData } = useSalonStore();
  const { toast } = useToast();
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('bookings');

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [tab, setTab] = useState(0);
  const [receiptModalInv, setReceiptModalInv] = useState<Invoice | null>(null);

  // Package Management State
  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [editPackageId, setEditPackageId] = useState<string | null>(null);
  const [deletePackageId, setDeletePackageId] = useState<string | null>(null);

  const [packageForm, setPackageForm] = useState<Partial<BridalPackage>>({
    type: 'Bridal Package',
    name: '',
    price: 25000,
    sessions: 3,
    includes: 'Makeup, hairstyle, jewellery, lenses, hair extensions, eyelashes, hair decor and draping',
  });

  const openNewPackage = (type: 'Bridal Package' | 'Siders Package' = 'Bridal Package') => {
    setEditPackageId(null);
    setPackageForm({
      type,
      name: '',
      price: type === 'Bridal Package' ? 25000 : 5000,
      sessions: type === 'Bridal Package' ? 3 : 1,
      includes: type === 'Bridal Package'
        ? 'Makeup, hairstyle, jewellery, lenses, hair extensions, eyelashes, hair decor and draping'
        : 'Makeup, hairstyle and draping',
    });
    setPackageModalOpen(true);
  };

  const openEditPackage = (pkg: BridalPackage) => {
    setEditPackageId(pkg.id);
    setPackageForm({ ...pkg });
    setPackageModalOpen(true);
  };

  const handleSavePackage = () => {
    if (!packageForm.name?.trim()) {
      toast('Please enter package name.', 'error');
      return;
    }
    if (!packageForm.price || packageForm.price <= 0) {
      toast('Please enter a valid price.', 'error');
      return;
    }

    const id = editPackageId || uid();
    const newPkg: BridalPackage = {
      id,
      type: packageForm.type || 'Bridal Package',
      name: packageForm.name.trim(),
      price: Number(packageForm.price),
      sessions: Number(packageForm.sessions || 1),
      includes: packageForm.includes || '',
    };

    updateData((d) => {
      const existing = d.bridalPackages || [];
      const idx = existing.findIndex((p) => p.id === id);
      let updated: BridalPackage[];
      if (idx >= 0) {
        updated = [...existing];
        updated[idx] = newPkg;
      } else {
        updated = [...existing, newPkg];
      }
      return { ...d, bridalPackages: updated };
    });

    scheduleSave();
    toast(editPackageId ? `✅ Package "${newPkg.name}" updated successfully!` : `🎉 New package "${newPkg.name}" added!`);
    setPackageModalOpen(false);
  };

  const handleDeletePackage = (id: string) => {
    updateData((d) => ({
      ...d,
      bridalPackages: (d.bridalPackages || []).filter((p) => p.id !== id),
    }));
    scheduleSave();
    toast('🗑️ Package removed from rate card.');
    setDeletePackageId(null);
  };

  const handleDownloadPDF = async () => {
    toast('⏳ Generating high-res Glamour Lounge Rate Card PDF…');
    await downloadBridalRateCardPDF(data?.bridalPackages || [], data);
    toast('✅ Rate Card PDF downloaded!');
  };

  const handleSendPDFWhatsApp = async (mobile?: string, name?: string) => {
    const targetMob = mobile || prompt('Enter recipient WhatsApp mobile number (10 digits):');
    if (!targetMob) return;

    toast(`⏳ Sending Bridal Rate Card PDF to ${targetMob} via Meta WhatsApp API…`);
    const res = await sendBridalRateCardPDFViaWhatsApp(data?.bridalPackages || [], targetMob, name, data);
    if (res.success) {
      toast(`✅ Bridal Rate Card PDF sent directly to ${targetMob}'s WhatsApp via Meta API!`);
    } else {
      toast(`❌ Error sending PDF via Meta API: ${res.message}`, 'error');
    }
  };

  // Form State
  const [form, setForm] = useState<Partial<BridalBooking>>({
    name: '',
    mobile: '',
    venue: '',
    includeWedding: true,
    weddingDate: '',
    weddingTime: '16:00',
    includeMandap: true,
    mandapDate: '',
    mandapTime: '10:00',
    includeMusic: true,
    musicDate: '',
    musicTime: '19:00',
    includeOther: false,
    otherDate: '',
    otherTime: '11:00',
    otherEventName: 'Carnival / Pool Party',
    packageType: 'Bridal Package',
    packageName: '',
    package: 0,
    advance: 0,
    advanceAccount: data?.settings?.payments?.[0] || 'Cash',
    balance: 0,
    notes: '',
  });

  const bridalPackages = data?.bridalPackages || [];

  const set = (key: keyof BridalBooking, val: unknown) => {
    setForm((prev) => {
      const updated = { ...prev, [key]: val };
      if (key === 'package' || key === 'advance') {
        const pkg = Number(key === 'package' ? val : updated.package) || 0;
        const adv = Number(key === 'advance' ? val : updated.advance) || 0;
        updated.balance = Math.max(0, pkg - adv);
      }
      return updated;
    });
  };

const OTHER_EVENT_OPTIONS = [
  'Haldi Ceremony',
  'Carnival / Pool Party',
  'Engagement / Ring Ceremony',
  'Mehndi Ceremony',
  'Cocktail / Sangeet Party',
  'Pre-Wedding Shoot',
  'Reception',
  'Custom Event',
];

  // Customer Autocomplete: auto-fills Birthday, Sagai Date, and Wedding Date
  const handleCustomerSelect = (query: string) => {
    set('name', query);
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return;
    const cleanNum = query.replace(/\D/g, '');

    const found = (data?.customers || []).find(
      (c) =>
        c.name.toLowerCase() === trimmed ||
        formatCustomerContactName(c.name).toLowerCase() === trimmed ||
        (cleanNum.length >= 4 && c.mobile.includes(cleanNum)) ||
        c.mobile === query.trim()
    );

    if (found) {
      setForm((prev) => {
        const today = todayISO();
        const wDate = found.anniversary || prev.weddingDate || today;
        let prevDay = wDate;
        try {
          prevDay = format(subDays(parseISO(wDate), 1), 'yyyy-MM-dd');
        } catch {
          prevDay = today;
        }

        const sagai = found.sagaiDate || found.engagementDate || prev.sagaiDate || '';

        return {
          ...prev,
          name: found.name,
          mobile: found.mobile,
          birthday: found.birthday || prev.birthday || '',
          weddingDate: wDate,
          includeWedding: true,
          sagaiDate: sagai,
          includeSagai: !!sagai,
          mandapDate: prev.mandapDate || prevDay,
          musicDate: prev.musicDate || prevDay,
        };
      });
      toast(`✨ Bride details auto-filled for ${found.name}`);
    }
  };

  // Gujarati Auto-Date calculation: sets other events to weddingDate - 1 day without bugs
  const handleWeddingDateChange = (wDate: string) => {
    set('weddingDate', wDate);
    if (!wDate || wDate.length < 10) return;
    try {
      const parsed = parseISO(wDate);
      if (isNaN(parsed.getTime()) || parsed.getFullYear() < 2020) return;
      const prevDay = format(subDays(parsed, 1), 'yyyy-MM-dd');
      setForm((prev) => ({
        ...prev,
        weddingDate: wDate,
        mandapDate: prevDay,
        musicDate: prevDay,
        otherDate: prevDay,
      }));
    } catch {
      // ignore date parse errors
    }
  };

  const openNew = () => {
    setEditId(null);
    setTab(0);
    const defaultPkg = bridalPackages.find((p) => p.type === 'Bridal Package') || bridalPackages[0];
    const today = todayISO();
    let prev = today;
    try {
      prev = format(subDays(parseISO(today), 1), 'yyyy-MM-dd');
    } catch {
      prev = today;
    }

    setForm({
      name: '',
      mobile: '',
      birthday: '',
      venue: '',
      includeWedding: true,
      weddingDate: today,
      weddingTime: '16:00',
      includeSagai: false,
      sagaiDate: '',
      sagaiTime: '11:00',
      includeMandap: true,
      mandapDate: prev,
      mandapTime: '10:00',
      includeMusic: true,
      musicDate: prev,
      musicTime: '19:00',
      includeOther: false,
      otherEventName: 'Carnival / Pool Party',
      otherDate: prev,
      otherTime: '11:00',
      packageType: 'Bridal Package',
      packageName: defaultPkg ? defaultPkg.name : '',
      package: defaultPkg ? defaultPkg.price : 0,
      advance: 0,
      advanceAccount: data?.settings?.payments?.[0] || 'Cash',
      balance: defaultPkg ? defaultPkg.price : 0,
      notes: '',
    });
    setModalOpen(true);
  };

  const openEdit = (b: BridalBooking) => {
    setEditId(b.id);
    setTab(0);
    setForm({
      ...b,
      includeWedding: b.includeWedding !== undefined ? b.includeWedding : !!b.weddingDate,
      includeSagai: b.includeSagai !== undefined ? b.includeSagai : !!b.sagaiDate,
      includeMandap: b.includeMandap !== undefined ? b.includeMandap : !!b.mandapDate,
      includeMusic: b.includeMusic !== undefined ? b.includeMusic : !!b.musicDate,
      includeOther: b.includeOther !== undefined ? b.includeOther : !!b.otherDate,
    });
    setModalOpen(true);
  };

  const selectPackage = (pkg: BridalPackage) => {
    setForm((prev) => {
      const pPrice = Number(pkg.price);
      const adv = Number(prev.advance || 0);
      return {
        ...prev,
        packageName: pkg.name,
        packageType: pkg.type,
        package: pPrice,
        balance: Math.max(0, pPrice - adv),
      };
    });
  };

  const handleSave = () => {
    if (!form.name) { toast('Please enter the customer / bride name.', 'error'); setTab(0); return; }
    if (!form.mobile) { toast('Please enter a mobile number.', 'error'); setTab(0); return; }

    const id = editId || uid();
    const selectedEvents: string[] = [];
    if (form.includeWedding !== false && form.weddingDate) {
      selectedEvents.push(`Wedding (${fmtDate(form.weddingDate)} ${form.weddingTime || ''})`);
    }
    if (form.includeSagai && form.sagaiDate) {
      selectedEvents.push(`Sagai (${fmtDate(form.sagaiDate)} ${form.sagaiTime || ''})`);
    }
    if (form.includeMandap !== false && form.mandapDate) {
      selectedEvents.push(`Mandap Muhurat (${fmtDate(form.mandapDate)} ${form.mandapTime || ''})`);
    }
    if (form.includeMusic !== false && form.musicDate) {
      selectedEvents.push(`Music / Sangeet (${fmtDate(form.musicDate)} ${form.musicTime || ''})`);
    }
    if (form.includeOther && form.otherDate) {
      selectedEvents.push(`${form.otherEventName || 'Pre-Event'} (${fmtDate(form.otherDate)} ${form.otherTime || ''})`);
    }

    const booking: BridalBooking = {
      id,
      name: form.name || '',
      mobile: form.mobile || '',
      birthday: form.birthday || '',
      venue: form.venue || '',
      includeWedding: form.includeWedding !== false,
      weddingDate: form.includeWedding !== false ? form.weddingDate || '' : '',
      weddingTime: form.includeWedding !== false ? form.weddingTime || '' : '',
      includeSagai: form.includeSagai === true,
      sagaiDate: form.includeSagai ? form.sagaiDate || '' : '',
      sagaiTime: form.includeSagai ? form.sagaiTime || '' : '',
      includeMandap: form.includeMandap !== false,
      mandapDate: form.includeMandap !== false ? form.mandapDate || '' : '',
      mandapTime: form.includeMandap !== false ? form.mandapTime || '' : '',
      includeMusic: form.includeMusic !== false,
      musicDate: form.includeMusic !== false ? form.musicDate || '' : '',
      musicTime: form.includeMusic !== false ? form.musicTime || '' : '',
      includeOther: form.includeOther === true,
      otherDate: form.includeOther ? form.otherDate || '' : '',
      otherTime: form.includeOther ? form.otherTime || '' : '',
      otherEventName: form.otherEventName || 'Carnival / Pool Party',
      selectedEvents,
      date: form.weddingDate || form.sagaiDate || form.date || todayISO(),
      packageType: form.packageType || 'Bridal Package',
      packageName: form.packageName || '',
      package: Number(form.package || 0),
      advance: Number(form.advance || 0),
      advanceAccount: form.advanceAccount || 'Cash',
      balance: Math.max(0, Number(form.package || 0) - Number(form.advance || 0)),
      notes: form.notes || '',
    };

    updateData((d) => {
      // Auto register / update customer profile with Birthday, Wedding Date (Anniversary), and Sagai Date
      let customers = [...(d.customers || [])];
      const existingIdx = customers.findIndex(
        (c) => (c.mobile && c.mobile === form.mobile) || c.name.toLowerCase() === form.name?.toLowerCase()
      );

      const effectiveWedding = (form.includeWedding !== false && form.weddingDate) ? form.weddingDate : '';
      const effectiveSagai = (form.includeSagai && form.sagaiDate) ? form.sagaiDate : '';

      if (existingIdx >= 0) {
        customers[existingIdx] = {
          ...customers[existingIdx],
          birthday: form.birthday || customers[existingIdx].birthday || '',
          anniversary: effectiveWedding || customers[existingIdx].anniversary || '',
          sagaiDate: effectiveSagai || customers[existingIdx].sagaiDate || '',
          engagementDate: effectiveSagai || customers[existingIdx].engagementDate || '',
        };
      } else if (form.name) {
        customers.push({
          id: uid(),
          name: form.name,
          mobile: form.mobile || '',
          birthday: form.birthday || '',
          anniversary: effectiveWedding,
          sagaiDate: effectiveSagai,
          engagementDate: effectiveSagai,
          loyaltyPoints: 0,
          walletBalance: 0,
        });
      }

      const list = [...(d.bridal || [])];
      let invoices = [...(d.invoices || [])];

      // Reconcile and sync linked invoice if present
      invoices = invoices.map((inv) => {
        if (inv.bridalBookingId === booking.id || (inv.mobile === booking.mobile && inv.customer === booking.name)) {
          return {
            ...inv,
            customer: booking.name,
            mobile: booking.mobile,
            subtotal: booking.package,
            total: booking.package,
            advance: booking.advance,
            paid: booking.advance,
            balance: Math.max(0, booking.package - booking.advance),
          };
        }
        return inv;
      });

      if (editId) {
        return {
          ...d,
          customers,
          bridal: list.map((b) => (b.id === editId ? booking : b)),
          invoices,
        };
      }
      return {
        ...d,
        customers,
        bridal: [booking, ...list],
        invoices,
      };
    });

    scheduleSave();
    toast(editId ? 'Bridal booking updated & Receipts History synced!' : 'Bridal booking saved & Receipts History synced!');
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    updateData((d) => {
      const target = (d.bridal || []).find((b) => b.id === id);
      return {
        ...d,
        bridal: (d.bridal || []).filter((b) => b.id !== id),
        invoices: (d.invoices || []).filter(
          (inv) => inv.bridalBookingId !== id && !(target && inv.mobile === target.mobile && inv.customer === target.name)
        ),
      };
    });
    scheduleSave();
    toast('Bridal booking & linked Invoice Receipts History deleted', 'info');
    setDeleteId(null);
  };

  const eventSummary = (b: BridalBooking) => [
    (b.includeWedding !== false && b.weddingDate) && `Wedding: ${fmtDate(b.weddingDate)}${b.weddingTime ? ` @ ${b.weddingTime}` : ''}`,
    (b.includeSagai && b.sagaiDate) && `Sagai: ${fmtDate(b.sagaiDate)}${b.sagaiTime ? ` @ ${b.sagaiTime}` : ''}`,
    (b.includeMandap !== false && b.mandapDate) && `Mandap: ${fmtDate(b.mandapDate)}${b.mandapTime ? ` @ ${b.mandapTime}` : ''}`,
    (b.includeMusic !== false && b.musicDate) && `Music: ${fmtDate(b.musicDate)}${b.musicTime ? ` @ ${b.musicTime}` : ''}`,
    (b.includeOther && b.otherDate) && `${b.otherEventName || 'Pre-Event'}: ${fmtDate(b.otherDate)}${b.otherTime ? ` @ ${b.otherTime}` : ''}`,
  ].filter(Boolean).join(' • ');

  // Generate an official Invoice with ONLY the ticked/selected functions
  const handleGenerateInvoice = (b: BridalBooking) => {
    const events: { name: string; date?: string; time?: string }[] = [];
    if (b.includeWedding !== false && b.weddingDate) {
      events.push({ name: 'Wedding Day Bridal Makeup & Draping', date: b.weddingDate, time: b.weddingTime });
    }
    if (b.includeSagai && b.sagaiDate) {
      events.push({ name: 'Sagai / Engagement Ceremony Makeup & Styling', date: b.sagaiDate, time: b.sagaiTime });
    }
    if (b.includeMandap !== false && b.mandapDate) {
      events.push({ name: 'Mandap Muhurat Makeup & Styling', date: b.mandapDate, time: b.mandapTime });
    }
    if (b.includeMusic !== false && b.musicDate) {
      events.push({ name: 'Music / Sangeet Night Makeup & Hair Styling', date: b.musicDate, time: b.musicTime });
    }
    if (b.includeOther && b.otherDate) {
      events.push({ name: `${b.otherEventName || 'Pre-Wedding Ceremony'} Makeup & Styling`, date: b.otherDate, time: b.otherTime });
    }

    if (events.length === 0) {
      toast('Please enable at least 1 function checkbox to generate a bill.', 'error');
      return;
    }

    const totalPkg = Number(b.package || 0);
    const perEventPrice = Math.round(totalPkg / events.length);

    const lines: InvoiceLine[] = events.map((ev, idx) => {
      const isLast = idx === events.length - 1;
      const price = isLast ? totalPkg - perEventPrice * (events.length - 1) : perEventPrice;
      return {
        type: 'S',
        name: `${b.packageName ? `[${b.packageName}] ` : ''}${ev.name}${ev.date ? ` (${fmtDate(ev.date)}${ev.time ? ` @ ${ev.time}` : ''})` : ''}`,
        qty: 1,
        price: price,
        discount: 0,
        discountType: '₹',
      };
    });

    const existingInv = (data?.invoices || []).find(
      (i) => i.bridalBookingId === b.id || (i.mobile === b.mobile && i.customer === b.name)
    );

    const invId = existingInv ? existingInv.id : uid();
    const invNo = existingInv ? existingInv.no : `INV-${data?.invoiceSeq || 1001}`;
    const invSeq = existingInv ? (data?.invoiceSeq || 1001) : (data?.invoiceSeq || 1001) + 1;
    const advPaid = Number(b.advance || 0);
    const bal = Math.max(0, totalPkg - advPaid);

    const newInv: Invoice = {
      id: invId,
      no: invNo,
      date: existingInv?.date || todayISO(),
      customer: b.name,
      mobile: b.mobile || '',
      bridalBookingId: b.id,
      lines,
      subtotal: totalPkg,
      discount: 0,
      total: totalPkg,
      advance: advPaid,
      paid: advPaid,
      balance: bal,
      mode: b.advanceAccount || data?.settings?.payments?.[0] || 'Cash',
    };

    updateData((d) => {
      const otherInvoices = (d.invoices || []).filter((i) => i.id !== invId);
      return {
        ...d,
        invoiceSeq: invSeq,
        invoices: [newInv, ...otherInvoices],
      };
    });

    scheduleSave();
    toast(`🧾 Bill ${invNo} generated! (${events.length} ticked function${events.length > 1 ? 's' : ''} added)`);

    // Auto-send WhatsApp PDF
    if (newInv.mobile) {
      sendInvoicePDFViaWhatsApp(newInv, data).then((res) => {
        if (res.method === 'cloud_api') toast('✅ PDF Bill sent automatically via WhatsApp!');
      });
    }

    setReceiptModalInv(newInv);
  };

  const TAB_STEPS = [
    { label: 'Bride Info', icon: User },
    { label: 'Event Dates', icon: CalendarDays },
    { label: 'Package Catalog', icon: Crown },
    { label: 'Notes & Finalize', icon: FileText },
  ];

  const packagesForType = bridalPackages.filter((p) => p.type === (form.packageType || 'Bridal Package'));

  const sidersPackages = bridalPackages.filter((p) => p.type === 'Siders Package');
  const bridalFullPackages = bridalPackages.filter((p) => p.type === 'Bridal Package');

  return (
    <div>
      {/* Header Toolbar */}
      <div className="toolbar">
        <div className="toolbar-title">Bridal & Event Studio</div>
        <motion.button className="btn btn-primary" onClick={openNew} whileTap={{ scale: 0.97 }}>
          <Plus size={15} /> New Bridal Booking
        </motion.button>
      </div>

      {/* Main Sub Tabs */}
      <div className="tabs">
        <button
          type="button"
          className={`tab-btn ${activeMainTab === 'bookings' ? 'active' : ''}`}
          onClick={() => setActiveMainTab('bookings')}
        >
          <Heart size={14} />
          <span>Bridal Bookings List</span>
          <span className="tab-badge">{(data?.bridal || []).length}</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeMainTab === 'packages' ? 'active' : ''}`}
          onClick={() => setActiveMainTab('packages')}
        >
          <Crown size={14} />
          <span>13 Luxury Packages Catalog</span>
          <span className="tab-badge gold">{bridalPackages.length}</span>
        </button>
      </div>

      {/* Tab 1: Bookings List */}
      {activeMainTab === 'bookings' && (
        <div className="card">
          {(data?.bridal || []).length === 0 ? (
            <div className="empty-state">
              <Heart size={44} />
              <h3>No bridal bookings yet</h3>
              <p>Book bridal & siders makeup packages with multi-event scheduling and advance tracking.</p>
              <motion.button className="btn btn-primary btn-sm" onClick={openNew} whileTap={{ scale: 0.97 }} style={{ marginTop: 8 }}>
                <Plus size={14} /> New Bridal Booking
              </motion.button>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Bride & Mobile</th>
                    <th>Events & Schedule</th>
                    <th>Package Tier</th>
                    <th>Payment & Due</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                  <motion.tbody variants={staggerContainer} initial="hidden" animate="visible">
                    {(data?.bridal || []).map((b) => (
                      <motion.tr key={b.id} variants={fadeSlideUp}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13.5 }}>{b.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                            {b.mobile} {b.birthday ? `• 🎂 ${fmtDate(b.birthday)}` : ''}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--teal)', fontSize: 13 }}>
                            {fmtDate(b.weddingDate || b.date)}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                            {eventSummary(b) || 'Bridal Makeup'} {b.venue ? `· 📍 ${b.venue}` : ''}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--teal)', fontSize: 13 }}>{b.packageName}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{money(b.package)}</div>
                        </td>
                        <td>
                          <div style={{ fontSize: 11.5, color: 'var(--green)', fontWeight: 600 }}>
                            Adv: {money(b.advance)} {b.advanceAccount ? `(${b.advanceAccount})` : ''}
                          </div>
                          {Number(b.balance) > 0 ? (
                            <div style={{ color: 'var(--red)', fontWeight: 700, fontSize: 11.5 }}>
                              Due: {money(b.balance)}
                            </div>
                          ) : (
                            <span className="badge badge-green" style={{ fontSize: 10, padding: '1px 5px' }}>
                              Fully Paid
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <button
                              className="btn btn-sm btn-ghost"
                              style={{ fontSize: 11, padding: '3px 8px', color: '#0d9488', borderColor: '#99f6e4', background: '#f0fdfa', fontWeight: 700 }}
                              title="Generate Bill for Ticked Functions"
                              onClick={() => handleGenerateInvoice(b)}
                            >
                              <Receipt size={12} /> Bill
                            </button>
                            <button className="btn-icon edit" onClick={() => openEdit(b)} title="Edit"><Pencil size={13} /></button>
                            <button
                              className="btn-icon wa"
                              title="WhatsApp Bride"
                              onClick={() => openWA(b.mobile, bridalMessage(b.name, eventSummary(b) || 'Bridal & Events', b.weddingDate, b.venue || '', data?.settings?.salon || 'Shree Beauty Studio'))}
                            >
                              <MessageCircle size={13} />
                            </button>
                            <button className="btn-icon danger" onClick={() => setDeleteId(b.id)} title="Delete"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </motion.tbody>
                </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Packages Catalog (Glamour Lounge Rate Card) */}
      {activeMainTab === 'packages' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Top Actions Bar for Rate Card */}
          <div
            style={{
              background: '#f0fdf4',
              border: '1.5px solid #bbf7d0',
              borderRadius: 12,
              padding: '14px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
                👑 The Glamour Lounge — Official Rate Card & Packages
              </div>
              <div style={{ fontSize: 12, color: '#15803d', marginTop: 2 }}>
                Update prices anytime. Generated PDF & WhatsApp rate card will reflect your updated prices live!
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <motion.button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => window.open('/shree-bridal-rate-card.pdf', '_blank')}
                style={{ background: '#ffffff', borderColor: '#86efac', color: '#15803d', fontWeight: 700 }}
                whileTap={{ scale: 0.96 }}
                title="View 100% original uploaded PDF rate card"
              >
                <Eye size={14} /> View Original PDF
              </motion.button>

              <motion.button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleDownloadPDF}
                style={{ background: '#ffffff', borderColor: '#86efac', color: '#15803d', fontWeight: 700 }}
                whileTap={{ scale: 0.96 }}
              >
                <Download size={14} /> Download Rate Card PDF
              </motion.button>

              <motion.button
                type="button"
                className="btn btn-sm"
                onClick={() => handleSendPDFWhatsApp()}
                style={{ background: '#25D366', color: '#ffffff', border: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
                whileTap={{ scale: 0.96 }}
              >
                <MessageCircle size={14} /> Send PDF via WhatsApp
              </motion.button>

              <motion.button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => openNewPackage('Bridal Package')}
                whileTap={{ scale: 0.96 }}
              >
                <Plus size={14} /> Add New Package
              </motion.button>
            </div>
          </div>

          {/* Bridal Packages (3 Sessions) */}
          <div>
            <div className="section-header" style={{ marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                  👰 Bridal Packages (3 Sessions)
                </h2>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  3-session package with makeup, hairstyle, jewellery, lenses, hair extensions, eyelashes, hair decor and draping.
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => openNewPackage('Bridal Package')}
                style={{ fontSize: 11.5, color: 'var(--teal)', fontWeight: 700 }}
              >
                + Add Bridal Package
              </button>
            </div>
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {(data?.bridalPackages || []).filter((p) => p.type === 'Bridal Package').map((pkg) => (
                <div key={pkg.id || pkg.name} className="stat-card" style={{ border: '1.5px solid #cbd5e1', padding: 18, background: '#ffffff', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--teal)' }}>{pkg.name}</div>
                      <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'var(--gold-light)', color: 'var(--teal-dark)', display: 'inline-block', marginTop: 4 }}>
                        {pkg.sessions || 3} Sessions Package
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        type="button"
                        className="btn-icon edit"
                        onClick={() => openEditPackage(pkg)}
                        title="Edit Package & Price"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon danger"
                        onClick={() => setDeletePackageId(pkg.id)}
                        title="Delete Package"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', margin: '10px 0 6px', fontFamily: 'monospace' }}>
                    {money(pkg.price)}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.4 }}>{pkg.includes}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Siders Packages (1 Session) */}
          <div>
            <div className="section-header" style={{ marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                  ✨ Siders &amp; Family Packages (1 Session)
                </h2>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  1-Time package with makeup, hairstyle and draping.
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => openNewPackage('Siders Package')}
                style={{ fontSize: 11.5, color: 'var(--teal)', fontWeight: 700 }}
              >
                + Add Siders Package
              </button>
            </div>
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
              {(data?.bridalPackages || []).filter((p) => p.type === 'Siders Package').map((pkg) => (
                <div key={pkg.id || pkg.name} className="stat-card" style={{ border: '1.5px solid #cbd5e1', padding: 16, background: '#ffffff', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--teal)' }}>{pkg.name}</div>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 99, background: '#eff6ff', color: '#1e40af', display: 'inline-block', marginTop: 4 }}>
                        1 Session
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        type="button"
                        className="btn-icon edit"
                        onClick={() => openEditPackage(pkg)}
                        title="Edit Package & Price"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon danger"
                        onClick={() => setDeletePackageId(pkg.id)}
                        title="Delete Package"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: '8px 0 4px', fontFamily: 'monospace' }}>
                    {money(pkg.price)}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.4 }}>{pkg.includes}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bridal Booking Wizard Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? '👰 Edit Bridal Booking' : '👰 New Bridal Booking'}
        wide
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {tab > 0 && (
                <motion.button className="btn btn-ghost btn-sm" onClick={() => setTab((t) => t - 1)} whileTap={{ scale: 0.97 }}>
                  <ChevronLeft size={14} /> Back
                </motion.button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
              {tab < TAB_STEPS.length - 1 ? (
                <motion.button className="btn btn-primary" onClick={() => setTab((t) => t + 1)} whileTap={{ scale: 0.97 }}>
                  Next <ChevronRight size={14} />
                </motion.button>
              ) : (
                <motion.button className="btn btn-primary" onClick={handleSave} whileTap={{ scale: 0.97 }}>
                  <Heart size={14} /> Save Booking
                </motion.button>
              )}
            </div>
          </div>
        }
      >
        {/* Wizard Step Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
          {TAB_STEPS.map((st, idx) => {
            const Icon = st.icon;
            const isActive = tab === idx;
            const isPassed = tab > idx;
            return (
              <button
                key={st.label}
                type="button"
                onClick={() => setTab(idx)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: isActive ? 'var(--teal-subtle)' : isPassed ? '#f0fdf4' : '#f8fafc',
                  color: isActive ? 'var(--teal)' : isPassed ? '#16a34a' : 'var(--muted)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: isActive ? 700 : 500,
                  transition: 'all 0.16s ease',
                }}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isActive ? 'var(--teal)' : isPassed ? '#16a34a' : '#cbd5e1',
                  color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0
                }}>
                  {isPassed ? <Check size={12} /> : idx + 1}
                </div>
                <span style={{ whiteSpace: 'nowrap' }}>{st.label}</span>
              </button>
            );
          })}
        </div>

        {/* Step 0: Bride Details */}
        {tab === 0 && (
          <div>
            <div className="form-grid">
              <div className="form-group">
                <label className="label">Bride / Customer Name * (Type to auto pick contact)</label>
                <input
                  type="text"
                  className="input"
                  list="bridal-cust-name-list"
                  value={form.name || ''}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  placeholder="Start typing name or contact..."
                  autoFocus
                />
                <datalist id="bridal-cust-name-list">
                  {(data?.customers || []).flatMap((c) => [
                    <option key={`${c.id}-name`} value={c.name}>
                      {c.name} — 📞 {c.mobile}
                    </option>,
                    <option key={`${c.id}-fmt`} value={formatCustomerContactName(c.name)}>
                      {formatCustomerContactName(c.name)} — 📞 {c.mobile}
                    </option>
                  ])}
                </datalist>
              </div>
              <div className="form-group">
                <label className="label">Mobile Number * (Type to auto pick contact)</label>
                <input
                  type="tel"
                  className="input"
                  list="bridal-cust-mob-list"
                  value={form.mobile || ''}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  placeholder="10-digit mobile number"
                />
                <datalist id="bridal-cust-mob-list">
                  {(data?.customers || []).flatMap((c) => [
                    <option key={`${c.id}-mob`} value={c.mobile}>
                      {c.mobile} — 👤 {c.name}
                    </option>,
                    <option key={`${c.id}-mob-name`} value={c.name}>
                      👤 {c.name} — 📞 {c.mobile}
                    </option>
                  ])}
                </datalist>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="label">🎂 Birthday Date (Auto-saved to Profile)</label>
                <input
                  type="date"
                  className="input"
                  value={form.birthday || ''}
                  onChange={(e) => set('birthday', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="label">Wedding Venue</label>
                <input
                  type="text"
                  className="input"
                  value={form.venue || ''}
                  onChange={(e) => set('venue', e.target.value)}
                  placeholder="e.g. The Grand Bhagwati, SG Highway, Surat"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Event Dates & Timings */}
        {tab === 1 && (
          <div>
            <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: 8, padding: 10, fontSize: 12, color: '#854d0e', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                💡 <b>Function Selector:</b> Check (tick) only the functions that should be booked &amp; added to the bill.
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, background: '#fef08a', color: '#713f12', padding: '2px 8px', borderRadius: 99 }}>
                {[form.includeWedding !== false, form.includeSagai, form.includeMandap !== false, form.includeMusic !== false, form.includeOther].filter(Boolean).length} Functions Selected
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 14 }}>
              {/* Wedding Date & Time */}
              <div
                className="form-group"
                style={{
                  background: form.includeWedding !== false ? '#fffbeb' : '#f8fafc',
                  border: form.includeWedding !== false ? '2px solid #f59e0b' : '1px solid #cbd5e1',
                  borderRadius: 10,
                  padding: 12,
                  opacity: form.includeWedding !== false ? 1 : 0.65,
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="label" style={{ color: form.includeWedding !== false ? '#b45309' : '#64748b', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                    👰 WEDDING CEREMONY
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: form.includeWedding !== false ? '#b45309' : '#64748b', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.includeWedding !== false}
                      onChange={(e) => set('includeWedding', e.target.checked)}
                    />
                    Add to Bill
                  </label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 6 }}>
                  <div>
                    <span style={{ fontSize: 10.5, color: form.includeWedding !== false ? '#92400e' : '#64748b', fontWeight: 700, display: 'block', marginBottom: 2 }}>Date</span>
                    <input
                      type="date"
                      className="input"
                      min={todayISO()}
                      disabled={form.includeWedding === false}
                      value={form.weddingDate || ''}
                      onChange={(e) => handleWeddingDateChange(e.target.value)}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: 10.5, color: form.includeWedding !== false ? '#92400e' : '#64748b', fontWeight: 700, display: 'block', marginBottom: 2 }}>Time</span>
                    <input
                      type="time"
                      className="input"
                      disabled={form.includeWedding === false}
                      value={form.weddingTime || '16:00'}
                      onChange={(e) => set('weddingTime', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Sagai / Engagement Ceremony Date & Time */}
              <div
                className="form-group"
                style={{
                  background: form.includeSagai ? '#f0f9ff' : '#f8fafc',
                  border: form.includeSagai ? '2px solid #0284c7' : '1px solid #cbd5e1',
                  borderRadius: 10,
                  padding: 12,
                  opacity: form.includeSagai ? 1 : 0.65,
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="label" style={{ color: form.includeSagai ? '#0369a1' : '#64748b', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                    💍 SAGAI / ENGAGEMENT
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: form.includeSagai ? '#0369a1' : '#64748b', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.includeSagai === true}
                      onChange={(e) => set('includeSagai', e.target.checked)}
                    />
                    Add to Bill
                  </label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 6 }}>
                  <div>
                    <span style={{ fontSize: 10.5, color: form.includeSagai ? '#0284c7' : '#64748b', fontWeight: 700, display: 'block', marginBottom: 2 }}>Date</span>
                    <input
                      type="date"
                      className="input"
                      disabled={!form.includeSagai}
                      value={form.sagaiDate || ''}
                      onChange={(e) => set('sagaiDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: 10.5, color: form.includeSagai ? '#0284c7' : '#64748b', fontWeight: 700, display: 'block', marginBottom: 2 }}>Time</span>
                    <input
                      type="time"
                      className="input"
                      disabled={!form.includeSagai}
                      value={form.sagaiTime || '11:00'}
                      onChange={(e) => set('sagaiTime', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Mandap Muhurat Date & Time */}
              <div
                className="form-group"
                style={{
                  background: form.includeMandap !== false ? '#fdf2f8' : '#f8fafc',
                  border: form.includeMandap !== false ? '2px solid #ec4899' : '1px solid #cbd5e1',
                  borderRadius: 10,
                  padding: 12,
                  opacity: form.includeMandap !== false ? 1 : 0.65,
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="label" style={{ color: form.includeMandap !== false ? '#be185d' : '#64748b', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                    🌺 MANDAP MUHURAT
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: form.includeMandap !== false ? '#be185d' : '#64748b', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.includeMandap !== false}
                      onChange={(e) => set('includeMandap', e.target.checked)}
                    />
                    Add to Bill
                  </label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 6 }}>
                  <div>
                    <span style={{ fontSize: 10.5, color: form.includeMandap !== false ? '#9d174d' : '#64748b', fontWeight: 700, display: 'block', marginBottom: 2 }}>Date</span>
                    <input
                      type="date"
                      className="input"
                      disabled={form.includeMandap === false}
                      value={form.mandapDate || ''}
                      onChange={(e) => set('mandapDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: 10.5, color: form.includeMandap !== false ? '#9d174d' : '#64748b', fontWeight: 700, display: 'block', marginBottom: 2 }}>Time</span>
                    <input
                      type="time"
                      className="input"
                      disabled={form.includeMandap === false}
                      value={form.mandapTime || '10:00'}
                      onChange={(e) => set('mandapTime', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Music / Sangeet Night Date & Time */}
              <div
                className="form-group"
                style={{
                  background: form.includeMusic !== false ? '#f5f3ff' : '#f8fafc',
                  border: form.includeMusic !== false ? '2px solid #8b5cf6' : '1px solid #cbd5e1',
                  borderRadius: 10,
                  padding: 12,
                  opacity: form.includeMusic !== false ? 1 : 0.65,
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="label" style={{ color: form.includeMusic !== false ? '#6d28d9' : '#64748b', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                    🎵 MUSIC / SANGEET NIGHT
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: form.includeMusic !== false ? '#6d28d9' : '#64748b', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.includeMusic !== false}
                      onChange={(e) => set('includeMusic', e.target.checked)}
                    />
                    Add to Bill
                  </label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 6 }}>
                  <div>
                    <span style={{ fontSize: 10.5, color: form.includeMusic !== false ? '#5b21b6' : '#64748b', fontWeight: 700, display: 'block', marginBottom: 2 }}>Date</span>
                    <input
                      type="date"
                      className="input"
                      disabled={form.includeMusic === false}
                      value={form.musicDate || ''}
                      onChange={(e) => set('musicDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: 10.5, color: form.includeMusic !== false ? '#5b21b6' : '#64748b', fontWeight: 700, display: 'block', marginBottom: 2 }}>Time</span>
                    <input
                      type="time"
                      className="input"
                      disabled={form.includeMusic === false}
                      value={form.musicTime || '19:00'}
                      onChange={(e) => set('musicTime', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Haldi / Carnival / Pre-Wedding Ceremony Date & Time */}
              <div
                className="form-group"
                style={{
                  background: form.includeOther ? '#ecfdf5' : '#f8fafc',
                  border: form.includeOther ? '2px solid #10b981' : '1px solid #cbd5e1',
                  borderRadius: 10,
                  padding: 12,
                  opacity: form.includeOther ? 1 : 0.65,
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="label" style={{ color: form.includeOther ? '#047857' : '#64748b', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                    🎪 PRE-WEDDING CEREMONY
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: form.includeOther ? '#047857' : '#64748b', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.includeOther === true}
                      onChange={(e) => set('includeOther', e.target.checked)}
                    />
                    Add to Bill
                  </label>
                </div>
                
                {/* Dropdown for Haldi / Carnival / Engagement / Mehndi / Reception */}
                <select
                  className="input"
                  disabled={!form.includeOther}
                  style={{ marginBottom: 6, fontSize: 12, fontWeight: 700 }}
                  value={OTHER_EVENT_OPTIONS.includes(form.otherEventName || '') ? form.otherEventName : 'Custom Event'}
                  onChange={(e) => {
                    if (e.target.value === 'Custom Event') {
                      set('otherEventName', 'Custom Event');
                    } else {
                      set('otherEventName', e.target.value);
                    }
                  }}
                >
                  {OTHER_EVENT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>

                {(!OTHER_EVENT_OPTIONS.includes(form.otherEventName || '') || form.otherEventName === 'Custom Event') && (
                  <input
                    type="text"
                    className="input"
                    disabled={!form.includeOther}
                    style={{ marginBottom: 6, fontSize: 12 }}
                    placeholder="Type custom event name (e.g. Pool Party, Sangeet)..."
                    value={form.otherEventName === 'Custom Event' ? '' : form.otherEventName || ''}
                    onChange={(e) => set('otherEventName', e.target.value || 'Custom Event')}
                  />
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 6 }}>
                  <div>
                    <span style={{ fontSize: 10.5, color: form.includeOther ? '#065f46' : '#64748b', fontWeight: 700, display: 'block', marginBottom: 2 }}>Date</span>
                    <input
                      type="date"
                      className="input"
                      disabled={!form.includeOther}
                      value={form.otherDate || ''}
                      onChange={(e) => set('otherDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: 10.5, color: form.includeOther ? '#065f46' : '#64748b', fontWeight: 700, display: 'block', marginBottom: 2 }}>Time</span>
                    <input
                      type="time"
                      className="input"
                      disabled={!form.includeOther}
                      value={form.otherTime || '11:00'}
                      onChange={(e) => set('otherTime', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Package Catalog & Advance */}
        {tab === 2 && (
          <div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <button
                type="button"
                className={`btn btn-sm ${form.packageType === 'Bridal Package' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => set('packageType', 'Bridal Package')}
              >
                👰 Bridal Packages (3 Sessions)
              </button>
              <button
                type="button"
                className={`btn btn-sm ${form.packageType === 'Siders Package' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => set('packageType', 'Siders Package')}
              >
                ✨ Siders Packages (1 Session)
              </button>
            </div>

            {/* Package Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10, maxHeight: 220, overflowY: 'auto', padding: 4, marginBottom: 14 }}>
              {packagesForType.map((pkg) => {
                const isSelected = form.packageName === pkg.name;
                return (
                  <div
                    key={pkg.name}
                    className={`package-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => selectPackage(pkg)}
                    style={{ padding: 12, borderRadius: 10, cursor: 'pointer' }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 13, color: isSelected ? 'var(--teal)' : 'var(--text)' }}>
                      {pkg.name}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: isSelected ? 'var(--teal)' : 'var(--text)', margin: '4px 0' }}>
                      {money(pkg.price)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{pkg.includes}</div>
                  </div>
                );
              })}
            </div>

            {/* Advance & Payment Account */}
            <div className="form-grid" style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid var(--border)' }}>
              <div className="form-group">
                <label className="label">Total Package Price (₹)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="₹ Total package price"
                  value={form.package || ''}
                  onChange={(e) => set('package', Number(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label className="label">Advance Received (₹)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="₹ Advance deposit"
                  value={form.advance || ''}
                  onChange={(e) => set('advance', Number(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label className="label">Payment Account</label>
                <select
                  className="input"
                  value={form.advanceAccount || data?.settings?.payments?.[0] || 'Cash'}
                  onChange={(e) => set('advanceAccount', e.target.value)}
                >
                  {(data?.settings?.payments || ['Cash', 'GPay UPI']).map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Remaining Balance Due</label>
                <div style={{ fontSize: 18, fontWeight: 800, color: Number(form.balance || 0) > 0 ? 'var(--red)' : 'var(--green)', paddingTop: 6 }}>
                  {money(form.balance || 0)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Notes & Finalize */}
        {tab === 3 && (
          <div>
            <div className="form-group">
              <label className="label">Special Instructions & Notes</label>
              <textarea
                className="input"
                rows={4}
                value={form.notes || ''}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Bridal lens preference, jewelry setting, hairstyling references, staff assigned..."
              />
            </div>
            <div style={{ background: '#edf7f9', padding: 14, borderRadius: 10, border: '1px solid #ccebee' }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal)', marginBottom: 6 }}>Booking Overview</h4>
              <div style={{ fontSize: 12.5, color: 'var(--text)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <div><b>Bride:</b> {form.name || '—'}</div>
                <div><b>Mobile:</b> {form.mobile || '—'}</div>
                <div><b>Package:</b> {form.packageName || '—'} ({money(form.package || 0)})</div>
                <div><b>Advance:</b> {money(form.advance || 0)} ({form.advanceAccount})</div>
                <div><b>Balance Due:</b> {money(form.balance || 0)}</div>
                <div><b>Wedding:</b> {form.weddingDate ? fmtDate(form.weddingDate) : '—'}</div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <Modal
          isOpen={!!deleteId}
          onClose={() => setDeleteId(null)}
          title="Delete Bridal Booking?"
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteId)}>Delete</button>
            </>
          }
        >
          <p>Are you sure you want to delete this bridal booking? This action cannot be undone.</p>
        </Modal>
      )}

      {/* Official Shree Beauty Studio Invoice Receipt & PDF Modal */}
      <InvoiceReceiptModal
        isOpen={!!receiptModalInv}
        onClose={() => setReceiptModalInv(null)}
        invoice={receiptModalInv}
        salonData={data}
      />

      {/* 👑 Package Edit / Add Modal */}
      {packageModalOpen && (
        <Modal
          isOpen={packageModalOpen}
          onClose={() => setPackageModalOpen(false)}
          title={editPackageId ? '✏️ Edit Package & Price' : '➕ Add New Glamour Lounge Package'}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setPackageModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSavePackage}>
                Save Package
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="label">Package Type *</label>
              <select
                className="input"
                value={packageForm.type}
                onChange={(e) => {
                  const t = e.target.value as 'Bridal Package' | 'Siders Package';
                  setPackageForm((prev) => ({
                    ...prev,
                    type: t,
                    sessions: t === 'Bridal Package' ? 3 : 1,
                    includes: t === 'Bridal Package'
                      ? 'Makeup, hairstyle, jewellery, lenses, hair extensions, eyelashes, hair decor and draping'
                      : 'Makeup, hairstyle and draping',
                  }));
                }}
              >
                <option value="Bridal Package">👰 Bridal Package (3 Sessions)</option>
                <option value="Siders Package">✨ Siders Package (1 Session)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="label">Package / Brand Name *</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Mac | Forever, Hourglass, Charlotte Tilbury"
                value={packageForm.name || ''}
                onChange={(e) => setPackageForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="label">Package Price (₹) *</label>
                <input
                  type="number"
                  min={0}
                  className="input"
                  placeholder="25300"
                  value={packageForm.price || ''}
                  onChange={(e) => setPackageForm((prev) => ({ ...prev, price: Number(e.target.value) }))}
                  style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 700 }}
                />
              </div>

              <div className="form-group">
                <label className="label">Number of Sessions</label>
                <input
                  type="number"
                  min={1}
                  className="input"
                  value={packageForm.sessions || 1}
                  onChange={(e) => setPackageForm((prev) => ({ ...prev, sessions: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="label">Included Services / Description</label>
              <textarea
                className="input"
                rows={3}
                placeholder="Makeup, hairstyle, jewellery, lenses, hair extensions, eyelashes, hair decor and draping..."
                value={packageForm.includes || ''}
                onChange={(e) => setPackageForm((prev) => ({ ...prev, includes: e.target.value }))}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Package Confirmation Modal */}
      {deletePackageId && (
        <Modal
          isOpen={!!deletePackageId}
          onClose={() => setDeletePackageId(null)}
          title="Delete Package from Rate Card?"
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setDeletePackageId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDeletePackage(deletePackageId)}>Delete</button>
            </>
          }
        >
          <p>Are you sure you want to remove this package from your Glamour Lounge Rate Card?</p>
        </Modal>
      )}
    </div>
  );
}
