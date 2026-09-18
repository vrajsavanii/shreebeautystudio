'use client';

import { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Trash2,
  MessageCircle,
  Printer,
  Receipt,
  X,
  Barcode,
  CheckCircle,
  History,
  Search,
  Columns,
  CreditCard,
  Camera,
  Coins,
  Sparkles,
  ArrowDownLeft,
  CheckCircle2,
  Pencil,
  Download,
  Eye,
  FileText,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { useSalonStore } from '@/lib/store';
import { scheduleSave, cloudSave } from '@/lib/sync';
import { uid, todayISO, money, fmtDate, formatCustomerContactName } from '@/lib/utils';
import { Invoice, InvoiceLine, PaymentVoucher, LoyaltyTransaction, WalletTransaction, BridalBooking } from '@/types/salon';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { downloadInvoicePDF, formatIndianDate, sendInvoicePDFViaWhatsApp, sendInvoiceTextViaWhatsApp, cleanServiceNameForBill, shareInvoicePDFViaDirectWhatsApp } from '@/lib/invoice-pdf';
import { SHREE_LOGO_BASE64 } from '@/lib/logo-base64';
import InvoiceReceiptModal from '@/components/billing/InvoiceReceiptModal';
import { staggerContainer, fadeSlideUp } from '@/variants';
import CameraBarcodeScanner from '@/components/barcode/CameraBarcodeScanner';

const EMPTY_LINE = (): InvoiceLine => ({
  type: 'S',
  name: '',
  qty: 1,
  price: 0,
  discount: 0,
  discountType: '₹',
});

const calcLineDiscount = (l: InvoiceLine): number => {
  const qty = Number(l.qty) || 1;
  const price = Number(l.price) || 0;
  const gross = qty * price;
  const disc = Number(l.discount) || 0;
  if (disc <= 0) return 0;
  if (l.discountType === '%') {
    return Math.min(gross, (gross * disc) / 100);
  }
  return Math.min(gross, disc);
};

const calcLineTotal = (l: InvoiceLine): number => {
  const qty = Number(l.qty) || 1;
  const price = Number(l.price) || 0;
  const gross = qty * price;
  const discAmt = calcLineDiscount(l);
  return Math.max(0, gross - discAmt);
};

type BillingViewTab = 'builder' | 'history' | 'split';

function BillingContent() {
  const searchParams = useSearchParams();
  const convertApptId = searchParams.get('convertApptId');

  const { data, updateData } = useSalonStore();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<BillingViewTab>('builder');
  const [historySearch, setHistorySearch] = useState('');

  // Form state
  const [customer, setCustomer] = useState('');
  const [mobile, setMobile] = useState('');
  const [lines, setLines] = useState<InvoiceLine[]>([EMPTY_LINE()]);
  const [discount, setDiscount] = useState(0);
  const [advance, setAdvance] = useState(0);
  const [advanceMode, setAdvanceMode] = useState('Cash');
  const [paid, setPaid] = useState<number | ''>('');
  const [mode, setMode] = useState(data?.settings?.payments?.[0] || 'Cash');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [appointmentRef, setAppointmentRef] = useState<string | null>(null);

  // Loyalty & Wallet
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [useWallet, setUseWallet] = useState(0);
  const [selectedCustomerObj, setSelectedCustomerObj] = useState<any>(null);

  // Advanced Vyapar Features: Round-off & Split Payment
  const [autoRoundOff, setAutoRoundOff] = useState(true);
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [splitCash, setSplitCash] = useState<number | ''>('');
  const [splitUpi, setSplitUpi] = useState<number | ''>('');
  const [splitCard, setSplitCard] = useState<number | ''>('');
  const [splitUpiMode, setSplitUpiMode] = useState('GPay UPI');

  // Camera Barcode Scanner State
  const [cameraModalOpen, setCameraModalOpen] = useState(false);

  // Payment-In Modal for historical invoices
  const [paymentInModalOpen, setPaymentInModalOpen] = useState(false);
  const [settleInvoice, setSettleInvoice] = useState<Invoice | null>(null);
  const [settleAmount, setSettleAmount] = useState<number | ''>('');
  const [settleMode, setSettleMode] = useState('GPay UPI');
  const [settleRef, setSettleRef] = useState('');

  // Print state
  const [printInv, setPrintInv] = useState<Invoice | null>(null);
  const [receiptModalInv, setReceiptModalInv] = useState<Invoice | null>(null);

  // WhatsApp send status for history table rows (invoiceId -> 'sending'|'sent'|'failed')
  const [waPdfStatus, setWaPdfStatus] = useState<Record<string, 'sending' | 'sent' | 'failed'>>({});
  const [waTextStatus, setWaTextStatus] = useState<Record<string, 'sending' | 'sent' | 'failed'>>({});
  const [waInvoiceStatus, setWaInvoiceStatus] = useState<Record<string, 'sending' | 'sent' | 'failed'>>({});

  const handleSendInvoicePDF = async (inv: Invoice) => {
    if (!inv.mobile) {
      toast('No mobile number on this invoice', 'error');
      return;
    }

    // If Meta has an active payment issue, immediately use Direct WhatsApp PDF sharing (100% free)
    if (data?.settings?.whatsappPaymentIssue) {
      setWaPdfStatus((s) => ({ ...s, [inv.id]: 'sending' }));
      try {
        const shareRes = await shareInvoicePDFViaDirectWhatsApp(inv, data);
        setWaPdfStatus((s) => ({ ...s, [inv.id]: shareRes.success ? 'sent' : 'failed' }));
        toast(shareRes.message);
        setTimeout(() => setWaPdfStatus((s) => { const n = { ...s }; delete n[inv.id]; return n; }), 4000);
      } catch {
        setWaPdfStatus((s) => ({ ...s, [inv.id]: 'failed' }));
        setTimeout(() => setWaPdfStatus((s) => { const n = { ...s }; delete n[inv.id]; return n; }), 4000);
      }
      return;
    }

    setWaPdfStatus((s) => ({ ...s, [inv.id]: 'sending' }));
    try {
      const res = await sendInvoicePDFViaWhatsApp(inv, data);
      if (res.success) {
        setWaPdfStatus((s) => ({ ...s, [inv.id]: 'sent' }));
        toast(res.message);
        setTimeout(() => setWaPdfStatus((s) => { const n = { ...s }; delete n[inv.id]; return n; }), 4000);
      } else {
        if (res.isPaymentRequired) {
          toast('Meta payment required. Opening Direct WhatsApp PDF share (Free)…', 'info');
          const shareRes = await shareInvoicePDFViaDirectWhatsApp(inv, data);
          setWaPdfStatus((s) => ({ ...s, [inv.id]: shareRes.success ? 'sent' : 'failed' }));
          toast(shareRes.message);
          setTimeout(() => setWaPdfStatus((s) => { const n = { ...s }; delete n[inv.id]; return n; }), 4000);
          return;
        }

        setWaPdfStatus((s) => ({ ...s, [inv.id]: 'failed' }));
        const is24h = res.is24HourWindow || res.isPendingTemplate || res.message?.toLowerCase().includes('pending');
        const fallbackMsg = is24h
          ? 'PDF template pending review. Click TXT button for guaranteed instant delivery!'
          : res.message || 'WhatsApp PDF send failed';
        toast(fallbackMsg, is24h ? 'info' : 'error');
        setTimeout(() => setWaPdfStatus((s) => { const n = { ...s }; delete n[inv.id]; return n; }), 4000);
      }
    } catch {
      setWaPdfStatus((s) => ({ ...s, [inv.id]: 'failed' }));
      toast('Unexpected error sending PDF via WhatsApp', 'error');
      setTimeout(() => setWaPdfStatus((s) => { const n = { ...s }; delete n[inv.id]; return n; }), 4000);
    }
  };

  const handleSendInvoiceText = async (inv: Invoice) => {
    if (!inv.mobile) {
      toast('No mobile number on this invoice', 'error');
      return;
    }
    setWaTextStatus((s) => ({ ...s, [inv.id]: 'sending' }));
    try {
      const res = await sendInvoiceTextViaWhatsApp(inv, data);
      if (res.success) {
        setWaTextStatus((s) => ({ ...s, [inv.id]: 'sent' }));
        toast(res.message);
        setTimeout(() => setWaTextStatus((s) => { const n = { ...s }; delete n[inv.id]; return n; }), 4000);
      } else {
        setWaTextStatus((s) => ({ ...s, [inv.id]: 'failed' }));
        const isPayment = res.isPaymentRequired || Boolean(data?.settings?.whatsappPaymentIssue);
        const fallbackMsg = isPayment
          ? 'Meta requires payment method on WhatsApp account. Open View (Eye) -> Direct WA.'
          : res.message || 'WhatsApp text receipt failed';
        toast(fallbackMsg, 'error');
        setTimeout(() => setWaTextStatus((s) => { const n = { ...s }; delete n[inv.id]; return n; }), 4000);
      }
    } catch {
      setWaTextStatus((s) => ({ ...s, [inv.id]: 'failed' }));
      toast('Unexpected error sending WhatsApp text receipt', 'error');
      setTimeout(() => setWaTextStatus((s) => { const n = { ...s }; delete n[inv.id]; return n; }), 4000);
    }
  };

  // Editing and Deleting Invoice State
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [deleteInvoiceId, setDeleteInvoiceId] = useState<string | null>(null);

  const openEditInvoice = (inv: Invoice) => {
    setEditingInvoiceId(inv.id);
    setCustomer(inv.customer);
    setMobile(inv.mobile);
    setLines(
      inv.lines && inv.lines.length > 0
        ? [...inv.lines, EMPTY_LINE()]
        : [EMPTY_LINE()]
    );
    setDiscount(inv.discount || 0);
    setAdvance(inv.advance || 0);
    setAdvanceMode(inv.advanceMode || 'Cash');
    setPaid(inv.paid);
    setMode(inv.mode || 'Cash');
    if (inv.splitPayment) {
      setIsSplitPayment(true);
      setSplitCash(inv.splitPayment.cash || '');
      setSplitUpi(inv.splitPayment.upi || '');
      setSplitCard(inv.splitPayment.card || '');
      setSplitUpiMode(inv.splitPayment.upiMode || 'GPay UPI');
    } else {
      setIsSplitPayment(false);
      setSplitCash('');
      setSplitUpi('');
      setSplitCard('');
      setSplitUpiMode('GPay UPI');
    }
    setActiveTab('builder');
    toast(`Loaded invoice ${inv.no} for editing`);
  };

  const cancelEditInvoice = () => {
    setEditingInvoiceId(null);
    setCustomer('');
    setMobile('');
    setLines([EMPTY_LINE()]);
    setDiscount(0);
    setAdvance(0);
    setAdvanceMode('Cash');
    setPaid('');
    setIsSplitPayment(false);
    setSplitCash('');
    setSplitUpi('');
    setSplitCard('');
    setMode(data?.settings?.payments?.[0] || 'Cash');
  };

  const handleDeleteInvoice = (id: string) => {
    const inv = (data?.invoices || []).find((i) => i.id === id);
    if (!inv) return;

    updateData((d) => {
      // 1. Restore inventory stock for sold products
      let inventory = [...(d.inventory || [])];
      (inv.lines || [])
        .filter((l) => l.type === 'P')
        .forEach((l) => {
          inventory = inventory.map((item) =>
            item.name === l.name ? { ...item, stock: item.stock + Number(l.qty || 0) } : item
          );
        });

      // 2. Sync / remove corresponding bridal booking if linked
      let bridal = [...(d.bridal || [])];
      if (inv.bridalBookingId) {
        bridal = bridal.filter((b) => b.id !== inv.bridalBookingId);
      } else {
        bridal = bridal.filter(
          (b) => !(b.name === inv.customer && b.mobile === inv.mobile)
        );
      }

      // 3. Remove invoice from invoices list
      const invoices = (d.invoices || []).filter((i) => i.id !== id);

      // 4. Remove sales transaction audit entries
      const inventoryTx = (d.inventoryTx || []).filter((tx) => tx.invoiceNo !== inv.no);

      // 5. Remove linked payment vouchers
      const vouchers = (d.vouchers || []).filter((v) => v.linkedDocNo !== inv.no);

      return {
        ...d,
        inventory,
        invoices,
        bridal,
        inventoryTx,
        vouchers,
      };
    });

    scheduleSave();
    cloudSave().catch(() => {});
    toast(`Invoice ${inv.no} & linked Bridal Booking deleted and stock restored!`, 'info');
    setDeleteInvoiceId(null);
  };

  // Play audio beep on barcode scan
  const playBeep = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } catch {
      // Audio not permitted
    }
  }, []);

  // Pre-load from Appointment if convertApptId is present
  useEffect(() => {
    if (convertApptId && data?.appointments) {
      const a = data.appointments.find((x) => x.id === convertApptId);
      if (a) {
        setCustomer(a.customer);
        setMobile(a.mobile);
        setAdvance(Number(a.advance || 0));
        setAdvanceMode(a.advanceMode || 'Cash');

        // Find service price if available
        const s = (data?.services || []).find((x) => x.name.toLowerCase() === a.service.toLowerCase());
        const price = s ? s.price : 0;
        setLines([
          { type: 'S', name: a.service, qty: 1, price, discount: 0, discountType: '₹' },
          EMPTY_LINE(),
        ]);
        setAppointmentRef(`From Appt: ${a.customer} • ${fmtDate(a.date)} ${a.time} • ${a.service}`);
        setActiveTab('builder');
        toast(`Loaded appointment for ${a.customer}`);
      }
    }
  }, [convertApptId, data?.appointments, data?.services]);

  const handleImportBridal = (b: BridalBooking) => {
    setCustomer(b.name);
    setMobile(b.mobile || '');
    if (Number(b.advance) > 0) {
      setAdvance(Number(b.advance));
      setAdvanceMode(b.advanceMode || 'Cash');
    }
    setAppointmentRef(`Bridal Booking: ${b.packageName || 'Luxury Package'}`);

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

    if (events.length > 0) {
      const totalPkg = Number(b.package || 0);
      const perEventPrice = Math.round(totalPkg / events.length);

      const newLines: InvoiceLine[] = events.map((ev, idx) => {
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
      setLines([...newLines, EMPTY_LINE()]);
      toast(`👰 Imported ${b.name}'s bridal booking with ${events.length} ticked function${events.length > 1 ? 's' : ''}!`);
    } else {
      setLines([
        {
          type: 'S',
          name: `Bridal Package — ${b.packageName || 'Luxury Makeup'}`,
          qty: 1,
          price: Number(b.package || 0),
          discount: 0,
          discountType: '₹',
        },
        EMPTY_LINE(),
      ]);
      toast(`👰 Imported bridal package for ${b.name}!`);
    }
  };

  const allServices = useMemo(() => data?.services || [], [data?.services]);
  const allProducts = useMemo(() => data?.inventory || [], [data?.inventory]);

  const allItems = useMemo(
    () => [
      ...allServices.map((s) => ({
        label: `[Service] ${s.name} (${money(s.price)})`,
        name: s.name,
        price: s.price,
        type: 'S' as const,
        barcode: '',
        brand: '',
      })),
      ...allProducts.map((p) => ({
        label: `[Product] ${p.name}${p.brand ? ` · ${p.brand}` : ''}${p.barcode ? ` [Barcode: ${p.barcode}]` : ''} (${money(p.sell)})`,
        name: p.name,
        price: p.sell,
        mrp: p.mrp || p.sell * 1.15,
        expiry: p.expiry,
        type: 'P' as const,
        barcode: p.barcode || '',
        brand: p.brand || '',
      })),
    ],
    [allServices, allProducts]
  );

  const rawSubtotal = useMemo(
    () =>
      lines
        .filter((l) => l.name && l.name.trim() !== '')
        .reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.price) || 0), 0),
    [lines]
  );

  const serviceDiscountTotal = useMemo(
    () =>
      lines
        .filter((l) => l.name && l.name.trim() !== '' && l.type === 'S')
        .reduce((s, l) => s + calcLineDiscount(l), 0),
    [lines]
  );

  const productDiscountTotal = useMemo(
    () =>
      lines
        .filter((l) => l.name && l.name.trim() !== '' && l.type === 'P')
        .reduce((s, l) => s + calcLineDiscount(l), 0),
    [lines]
  );

  const itemDiscountTotal = useMemo(
    () => serviceDiscountTotal + productDiscountTotal,
    [serviceDiscountTotal, productDiscountTotal]
  );

  const lineNetTotal = useMemo(
    () => Math.max(0, rawSubtotal - itemDiscountTotal),
    [rawSubtotal, itemDiscountTotal]
  );

  const totalAllDiscount = useMemo(
    () => itemDiscountTotal + Number(discount || 0),
    [itemDiscountTotal, discount]
  );

  const discounted = Math.max(0, rawSubtotal - totalAllDiscount);
  const roundedTotal = autoRoundOff ? Math.round(discounted) : discounted;
  const roundOffDiff = autoRoundOff ? roundedTotal - discounted : 0;

  // Loyalty points to ₹ conversion
  const loyaltySettings = data?.settings;
  const redeemRate = loyaltySettings?.loyaltyRedeemRate || 10; // 10 pts = ₹1
  const pointsDiscountAmount = Math.floor(redeemPoints / redeemRate);
  const totalAfterLoyalty = Math.max(0, roundedTotal - pointsDiscountAmount - Number(useWallet || 0));

  // Split payment total computation
  const effectivePaid = useMemo(() => {
    if (isSplitPayment) {
      return Number(splitCash || 0) + Number(splitUpi || 0) + Number(splitCard || 0);
    }
    return Number(paid || 0);
  }, [isSplitPayment, splitCash, splitUpi, splitCard, paid]);

  const balance = Math.max(0, totalAfterLoyalty - Number(advance || 0) - effectivePaid);

  const setLine = (idx: number, updates: Partial<InvoiceLine>) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...updates } : l)));
  };

  const handleItemSelect = (idx: number, inputVal: string) => {
    const trimmed = inputVal.trim();
    const item =
      allItems.find((x) => x.name.toLowerCase() === trimmed.toLowerCase()) ||
      allItems.find((x) => x.barcode && x.barcode === trimmed);

    setLines((prev) => {
      const updated = prev.map((l, i) => {
        if (i !== idx) return l;
        if (item) {
          return {
            ...l,
            name: item.name,
            price: item.price,
            type: item.type,
            barcode: item.barcode,
            mrp: (item as any).mrp,
            expiry: (item as any).expiry,
            discount: l.discount || 0,
            discountType: l.discountType || '₹',
          };
        }
        return { ...l, name: inputVal };
      });

      // Auto-append new empty line underneath when the last row gets an item selected / entered
      const isLastRow = idx === prev.length - 1;
      const lastLineHasContent = updated[updated.length - 1]?.name?.trim().length > 0;

      if (isLastRow && lastLineHasContent) {
        return [...updated, EMPTY_LINE()];
      }

      return updated;
    });
  };

  // Auto-append empty row whenever the last row is filled so cashier never has to click "+ Add Item"
  useEffect(() => {
    if (lines.length === 0) {
      setLines([EMPTY_LINE()]);
      return;
    }
    const last = lines[lines.length - 1];
    if (last.name && last.name.trim() !== '') {
      setLines((prev) => {
        const lastLine = prev[prev.length - 1];
        if (lastLine && lastLine.name && lastLine.name.trim() !== '') {
          return [...prev, EMPTY_LINE()];
        }
        return prev;
      });
    }
  }, [lines]);

  const handleLineKeyDown = (e: React.KeyboardEvent, currentIdx: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextIdx = currentIdx + 1;
      if (nextIdx >= lines.length) {
        setLines((prev) => [...prev, EMPTY_LINE()]);
      }
      setTimeout(() => {
        const nextInput = document.getElementById(`billing-line-name-${nextIdx}`) as HTMLInputElement | null;
        if (nextInput) {
          nextInput.focus();
        }
      }, 60);
    }
  };

  const handleCustomerSelect = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) {
      setCustomer('');
      setSelectedCustomerObj(null);
      return;
    }

    // 1. Check if chosen from datalist format "Name (Mobile)"
    const match = trimmed.match(/^(.*?)\s*[\(—\-]\s*(\d{10})\)?$/);
    if (match) {
      const extractedName = match[1].trim();
      const extractedMob = match[2].trim();
      const c = (data?.customers || []).find((x) => x.mobile === extractedMob) || null;
      setCustomer(extractedName);
      setMobile(extractedMob);
      setSelectedCustomerObj(c);
      setRedeemPoints(0);
      setUseWallet(0);
      return;
    }

    const foundByCombined = (data?.customers || []).find(
      (c) =>
        `${formatCustomerContactName(c.name)} (${c.mobile})`.toLowerCase() === trimmed.toLowerCase() ||
        `${c.name} (${c.mobile})`.toLowerCase() === trimmed.toLowerCase() ||
        `${formatCustomerContactName(c.name)} — 📞 ${c.mobile}`.toLowerCase() === trimmed.toLowerCase()
    );
    if (foundByCombined) {
      setCustomer(foundByCombined.name);
      setMobile(foundByCombined.mobile);
      setSelectedCustomerObj(foundByCombined);
      setRedeemPoints(0);
      setUseWallet(0);
      return;
    }

    // 2. User is just typing name -> update customer name only
    setCustomer(val);
    setSelectedCustomerObj(null);
  };

  const handleMobileSelect = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) {
      setMobile('');
      setSelectedCustomerObj(null);
      return;
    }

    // 1. Check if chosen from datalist format "Mobile (Name)"
    const match = trimmed.match(/^(\d{10})\s*[\(—\-]\s*(.*?)\)?$/);
    if (match) {
      const extractedMob = match[1].trim();
      const extractedName = match[2].trim();
      const c = (data?.customers || []).find((x) => x.mobile === extractedMob) || null;
      setMobile(extractedMob);
      setCustomer(extractedName);
      setSelectedCustomerObj(c);
      return;
    }

    const cleanNum = trimmed.replace(/\D/g, '').slice(0, 10);
    setMobile(cleanNum);

    if (cleanNum.length === 10) {
      const c = (data?.customers || []).find((x) => x.mobile === cleanNum);
      if (c) {
        setSelectedCustomerObj(c);
        if (!customer) {
          setCustomer(c.name);
        }
      } else {
        setSelectedCustomerObj(null);
      }
    } else {
      setSelectedCustomerObj(null);
    }
  };

  // Barcode scanning handler (USB or Camera)
  const handleScanBarcode = (scannedCode?: string) => {
    const code = (scannedCode || barcodeInput).trim();
    if (!code) return;
    setBarcodeInput('');

    const p = allProducts.find((x) => String(x.barcode || '').trim() === code);
    if (!p) {
      toast(`Barcode "${code}" not found in inventory`, 'error');
      return;
    }

    playBeep();

    // Check if product line already exists
    const existingIdx = lines.findIndex((l) => l.type === 'P' && l.name === p.name);
    if (existingIdx >= 0) {
      setLine(existingIdx, { qty: lines[existingIdx].qty + 1 });
    } else {
      const newLine: InvoiceLine = {
        type: 'P',
        name: p.name,
        qty: 1,
        price: p.sell,
        discount: 0,
        discountType: '₹',
        mrp: p.mrp || p.sell * 1.15,
        expiry: p.expiry,
        barcode: p.barcode,
      };

      setLines((prev) => {
        const lastIdx = prev.length - 1;
        if (prev.length === 1 && !prev[0].name) {
          return [newLine, EMPTY_LINE()];
        }
        if (lastIdx >= 0 && !prev[lastIdx].name) {
          const next = [...prev];
          next[lastIdx] = newLine;
          return [...next, EMPTY_LINE()];
        }
        return [...prev, newLine, EMPTY_LINE()];
      });
    }
    toast(`Added ${p.name} (${money(p.sell)})`);
  };

  const handleSave = () => {
    const validLines = lines.filter((l) => l.name && l.name.trim() !== '' && Number(l.qty) > 0);
    if (validLines.length === 0) {
      toast('Add at least one item to the invoice.', 'error');
      return;
    }
    if (!customer) {
      toast('Please select or enter a customer name.', 'error');
      return;
    }

    // Validate stock for products
    for (const l of validLines.filter((x) => x.type === 'P')) {
      const p = allProducts.find((x) => x.name === l.name);
      if (p && Number(p.stock) < Number(l.qty)) {
        toast(`Not enough stock for ${p.name}. Only ${p.stock} available.`, 'error');
        return;
      }
    }

    if (editingInvoiceId) {
      const existingInv = (data?.invoices || []).find((i) => i.id === editingInvoiceId);
      if (!existingInv) return;

      const updatedInv: Invoice = {
        ...existingInv,
        customer,
        mobile,
        lines: validLines,
        subtotal: rawSubtotal,
        discount: Number(discount || 0),
        itemDiscountTotal,
        serviceDiscountTotal,
        productDiscountTotal,
        total: roundedTotal,
        advance: Number(advance || 0),
        advanceMode: Number(advance || 0) > 0 ? advanceMode : undefined,
        paid: effectivePaid,
        balance,
        mode: isSplitPayment ? 'Split Payment' : mode,
        splitPayment: isSplitPayment
          ? {
              cash: Number(splitCash || 0),
              upi: Number(splitUpi || 0),
              card: Number(splitCard || 0),
            }
          : undefined,
        roundOff: roundOffDiff,
      };

      updateData((d) => {
        // Reconcile stock: Add back old quantities, deduct new quantities
        let inventory = [...(d.inventory || [])];

        // 1. Add back previous quantities
        (existingInv.lines || [])
          .filter((l) => l.type === 'P')
          .forEach((l) => {
            inventory = inventory.map((item) =>
              item.name === l.name ? { ...item, stock: item.stock + Number(l.qty || 0) } : item
            );
          });

        // 2. Deduct new quantities
        validLines
          .filter((l) => l.type === 'P')
          .forEach((l) => {
            inventory = inventory.map((item) =>
              item.name === l.name ? { ...item, stock: Math.max(0, item.stock - Number(l.qty || 0)) } : item
            );
          });

        // 3. Update invoice in list
        const invoices = (d.invoices || []).map((i) => (i.id === editingInvoiceId ? updatedInv : i));

        // 4. Sync linked bridal booking if present
        let bridal = [...(d.bridal || [])];
        if (existingInv.bridalBookingId || existingInv.customer) {
          bridal = bridal.map((b) => {
            if (b.id === existingInv.bridalBookingId || (b.name === existingInv.customer && b.mobile === existingInv.mobile)) {
              return {
                ...b,
                name: updatedInv.customer,
                mobile: updatedInv.mobile,
                package: updatedInv.total,
                advance: updatedInv.advance,
                balance: updatedInv.balance,
              };
            }
            return b;
          });
        }

        // 5. Update sales transactions
        const remainingTx = (d.inventoryTx || []).filter((tx) => tx.invoiceNo !== existingInv.no);
        const newInvTxs = validLines
          .filter((l) => l.type === 'P')
          .map((l) => {
            const invItem = inventory.find((x) => x.name === l.name);
            return {
              id: uid(),
              date: existingInv.date || todayISO(),
              product: l.name,
              barcode: l.barcode || invItem?.barcode || '',
              type: 'Sell' as const,
              qty: l.qty,
              rate: l.price,
              mrp: l.mrp || invItem?.mrp,
              expiry: l.expiry || invItem?.expiry,
              party: customer,
              invoiceNo: existingInv.no,
            };
          });

        return {
          ...d,
          inventory,
          invoices,
          bridal,
          inventoryTx: [...remainingTx, ...newInvTxs],
        };
      });

      scheduleSave();
      toast(`Invoice ${existingInv.no} updated successfully!`);
      cancelEditInvoice();
      if (updatedInv.mobile) {
        sendInvoiceTextViaWhatsApp(updatedInv, data).then((res) => {
          if (res.success) toast(res.message);
          else if (!res.notConfigured) toast(res.message, 'error');
        });
      }
      setReceiptModalInv(updatedInv);
      return;
    }

    const no = `INV-${data?.invoiceSeq || 1001}`;
    const invId = uid();
    const inv: Invoice = {
      id: invId,
      no,
      date: todayISO(),
      customer,
      mobile,
      appointmentId: convertApptId || undefined,
      lines: validLines,
      subtotal: rawSubtotal,
      discount: Number(discount || 0),
      itemDiscountTotal,
      serviceDiscountTotal,
      productDiscountTotal,
      total: roundedTotal,
      advance: Number(advance || 0),
      advanceMode: Number(advance || 0) > 0 ? advanceMode : undefined,
      paid: effectivePaid,
      balance,
      mode: isSplitPayment ? 'Split Payment' : mode,
      splitPayment: isSplitPayment
        ? {
            cash: Number(splitCash || 0),
            upi: Number(splitUpi || 0),
            card: Number(splitCard || 0),
            upiMode: splitUpiMode,
          }
        : undefined,
      roundOff: roundOffDiff,
    };

    // Compute loyalty points to earn
    const earnRate = data?.settings?.loyaltyEarnRate || 100; // ₹100 = 1 pt
    const ptsEarned = data?.settings?.loyaltyEnabled ? Math.floor(roundedTotal / earnRate) : 0;
    inv.loyaltyPointsEarned = ptsEarned;
    inv.loyaltyPointsRedeemed = redeemPoints;
    inv.walletAmountUsed = Number(useWallet || 0);

    updateData((d) => {
      // Auto-add customer if new mobile/name
      let customers = [...(d.customers || [])];
      const custIdx = customers.findIndex((c) => (c.mobile && c.mobile === mobile) || c.name === customer);
      if (custIdx === -1 && customer) {
        customers.push({
          id: uid(),
          name: customer,
          mobile: mobile || '',
          birthday: '',
          anniversary: '',
          loyaltyPoints: ptsEarned,
          walletBalance: 0,
        });
      } else if (custIdx >= 0) {
        // Update loyalty & wallet
        const prev = customers[custIdx];
        const currentPts = Number(prev.loyaltyPoints || 0);
        const currentWallet = Number(prev.walletBalance || 0);
        customers[custIdx] = {
          ...prev,
          loyaltyPoints: Math.max(0, currentPts - redeemPoints + ptsEarned),
          walletBalance: Math.max(0, currentWallet - Number(useWallet || 0)),
        };
      }

      // Deduct inventory stock for product lines
      let inventory = [...(d.inventory || [])];
      validLines
        .filter((l) => l.type === 'P')
        .forEach((l) => {
          inventory = inventory.map((item) =>
            item.name === l.name ? { ...item, stock: Math.max(0, item.stock - l.qty) } : item
          );
        });

      // Log inventoryTx transactions for sales
      const invTxs = validLines
        .filter((l) => l.type === 'P')
        .map((l) => {
          const invItem = inventory.find((x) => x.name === l.name);
          return {
            id: uid(),
            date: todayISO(),
            product: l.name,
            barcode: l.barcode || invItem?.barcode || '',
            type: 'Sell' as const,
            qty: l.qty,
            rate: l.price,
            mrp: l.mrp || invItem?.mrp,
            expiry: l.expiry || invItem?.expiry,
            party: customer,
            invoiceNo: no,
          };
        });

      // Update appointment work status to 'Billed' if converted
      let appointments = [...(d.appointments || [])];
      if (convertApptId) {
        appointments = appointments.map((a) =>
          a.id === convertApptId
            ? { ...a, workStatus: 'Billed', invoiceId: invId, billedAt: new Date().toISOString() }
            : a
        );
      }

      // Loyalty transaction log
      const loyaltyTx: LoyaltyTransaction[] = [...(d.loyaltyTx || [])];
      if (ptsEarned > 0 || redeemPoints > 0) {
        if (ptsEarned > 0) {
          loyaltyTx.push({ id: uid(), date: todayISO(), customerId: customer, customerName: customer, type: 'Earned', points: ptsEarned, invoiceNo: no });
        }
        if (redeemPoints > 0) {
          loyaltyTx.push({ id: uid(), date: todayISO(), customerId: customer, customerName: customer, type: 'Redeemed', points: -redeemPoints, invoiceNo: no });
        }
      }

      // Wallet transaction log
      const walletTx: WalletTransaction[] = [...(d.walletTx || [])];
      if (Number(useWallet || 0) > 0) {
        const custAfter = customers.find((c) => c.name === customer);
        walletTx.push({ id: uid(), date: todayISO(), customerId: customer, customerName: customer, type: 'Redeemed', amount: -Number(useWallet || 0), balanceAfter: custAfter?.walletBalance || 0, invoiceNo: no });
      }

      return {
        ...d,
        customers,
        invoices: [inv, ...(d.invoices || [])],
        inventory,
        inventoryTx: [...(d.inventoryTx || []), ...invTxs],
        appointments,
        invoiceSeq: (d.invoiceSeq || 1001) + 1,
        loyaltyTx,
        walletTx,
      };
    });

    scheduleSave();
    toast(`Invoice ${no} saved & sent!`);

    // Reset form
    setCustomer('');
    setMobile('');
    setLines([EMPTY_LINE()]);
    setDiscount(0);
    setAdvance(0);
    setPaid('');
    setIsSplitPayment(false);
    setSplitCash('');
    setSplitUpi('');
    setSplitCard('');
    setMode(data?.settings?.payments?.[0] || 'Cash');
    setAppointmentRef(null);
    setRedeemPoints(0);
    setUseWallet(0);
    setSelectedCustomerObj(null);

    // Auto-send approved WhatsApp text receipt to customer immediately
    if (inv.mobile) {
      sendInvoiceTextViaWhatsApp(inv, data).then((res) => {
        if (res.success) {
          toast(res.message);
        } else if (!res.notConfigured) {
          toast(res.message, 'error');
        }
      });
    }

    // Auto-send Email receipt to customer via Resend if email is on file
    const custEmail = (data?.customers || []).find((c: any) => c.mobile === inv.mobile)?.email;
    if (custEmail && custEmail.includes('@')) {
      fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'invoice',
          to: custEmail.trim(),
          data: {
            customerName: inv.customer,
            invoiceNo: inv.no,
            date: inv.date,
            total: inv.total,
            mode: inv.mode,
            lines: inv.lines,
            salonName: data?.settings?.salon || 'Shree Beauty Studio',
          },
          apiKey: data?.settings?.resendApiKey,
          fromEmail: data?.settings?.resendFromEmail,
        }),
      })
        .then((r) => r.json())
        .then((emailRes) => {
          if (emailRes.success) {
            toast(`📧 Invoice emailed to ${custEmail}!`);
          }
        })
        .catch(() => {});
    }

    // Open sample layout modal with instant PDF download & print
    setReceiptModalInv(inv);
  };

  const handlePrint = (inv: Invoice) => {
    setReceiptModalInv(inv);
  };

  // Record Payment-In for historic invoice dues
  const openPaymentInModal = (inv: Invoice) => {
    setSettleInvoice(inv);
    setSettleAmount(inv.balance);
    setSettleMode('GPay UPI');
    setSettleRef('');
    setPaymentInModalOpen(true);
  };

  const handleSavePaymentIn = () => {
    if (!settleInvoice) return;
    const numPaid = Number(settleAmount || 0);
    if (numPaid <= 0) {
      toast('Please enter a valid received amount.', 'error');
      return;
    }

    const voucherSeq = data?.voucherSeq || 1001;
    const vNo = `PAY-IN-${voucherSeq}`;

    const newVoucher: PaymentVoucher = {
      id: uid(),
      voucherNo: vNo,
      type: 'Payment-In',
      partyType: 'Customer',
      partyId: settleInvoice.id,
      partyName: settleInvoice.customer,
      partyMobile: settleInvoice.mobile,
      date: todayISO(),
      amount: numPaid,
      mode: settleMode,
      referenceNo: settleRef.trim(),
      linkedDocNo: settleInvoice.no,
      notes: `Payment-In received against invoice ${settleInvoice.no}`,
    };

    updateData((d) => {
      const updatedInvoices = (d.invoices || []).map((i) => {
        if (i.id === settleInvoice.id) {
          const newPaid = Number(i.paid || 0) + numPaid;
          const newBal = Math.max(0, Number(i.total || 0) - Number(i.advance || 0) - newPaid);
          return { ...i, paid: newPaid, balance: newBal };
        }
        return i;
      });

      let updatedBridals = [...(d.bridal || [])];
      if (settleInvoice.bridalBookingId) {
        updatedBridals = updatedBridals.map((b) => {
          if (b.id === settleInvoice.bridalBookingId) {
            const newAdv = Number(b.advance || 0) + numPaid;
            const newBal = Math.max(0, Number(b.package || 0) - newAdv);
            return { ...b, advance: newAdv, balance: newBal };
          }
          return b;
        });
      }

      return {
        ...d,
        invoices: updatedInvoices,
        bridal: updatedBridals,
        vouchers: [newVoucher, ...(d.vouchers || [])],
        voucherSeq: voucherSeq + 1,
      };
    });

    scheduleSave();
    toast(`✅ Payment-In of ₹${numPaid} recorded for ${settleInvoice.customer}!`);
    setPaymentInModalOpen(false);
  };

  const recentInvoices = useMemo(
    () => [...(data?.invoices || [])].filter((i) => i.no !== 'INV-1025' && i.id !== 'mtvk1tvbmodfe').sort((a, b) => b.date.localeCompare(a.date)),
    [data?.invoices]
  );

  const filteredInvoices = useMemo(() => {
    const q = historySearch.toLowerCase();
    return recentInvoices.filter(
      (inv) =>
        !q ||
        inv.no.toLowerCase().includes(q) ||
        inv.customer.toLowerCase().includes(q) ||
        inv.mobile.includes(q)
    );
  }, [recentInvoices, historySearch]);

  const invoiceStats = useMemo(() => {
    const count = filteredInvoices.length;
    const totalBilled = filteredInvoices.reduce((s, i) => s + (Number(i.total) || 0), 0);
    const totalDue = filteredInvoices.reduce((s, i) => s + (Number(i.balance) || 0), 0);
    const totalCollected = totalBilled - totalDue;
    return { count, totalBilled, totalDue, totalCollected };
  }, [filteredInvoices]);

  const tabs: { id: BillingViewTab; label: string; shortLabel: string; icon: any; count?: number }[] = [
    { id: 'builder', label: 'New POS Bill', shortLabel: 'New Bill', icon: Receipt },
    { id: 'split', label: 'Side-by-Side POS', shortLabel: 'Split POS', icon: Columns },
    { id: 'history', label: 'Invoice Receipts History', shortLabel: 'History', icon: History, count: recentInvoices.length },
  ];

  return (
    <div>
      {/* Segmented Navigation Tabs */}
      <div className="billing-tabs no-print" role="tablist" aria-label="Billing Views">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={14} />
              <span className="tab-label-full">{tab.label}</span>
              <span className="tab-label-short">{tab.shortLabel}</span>
              {tab.count !== undefined && (
                <span className="tab-badge" aria-label={`${tab.count} invoices`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Hidden printable receipt */}
      {printInv && (
        <div id="printable-receipt" style={{ display: 'none', maxWidth: 420, margin: '0 auto', fontFamily: "'Segoe UI', Arial, sans-serif", color: '#111' }}>
          {/* Official Logo */}
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <img
              src={SHREE_LOGO_BASE64}
              alt="Shree Beauty Studio"
              style={{ maxWidth: 240, height: 'auto', margin: '0 auto 6px', display: 'block' }}
            />
            <div style={{ fontSize: 11, color: '#4b5563', lineHeight: 1.45, maxWidth: 320, margin: '0 auto 3px' }}>
              {data?.settings?.address || '22, Radhika Society, Near Cancer Hospital, Katargam, Surat - 395004'}
            </div>
            <div style={{ fontSize: 11, color: '#4b5563', lineHeight: 1.4 }}>
              Email: shreebeauty.studio22@gmail.com
            </div>
            <div style={{ fontSize: 11, color: '#4b5563', lineHeight: 1.4 }}>
              Phone / WhatsApp: {data?.settings?.whatsapp ? `${data.settings.whatsapp}, 9825339924` : '9773240010, 9825339924'}
            </div>
          </div>

          {/* Dashed Line Divider */}
          <div style={{ borderTop: '1.5px dashed #9ca3af', margin: '12px 0 16px' }} />

          {/* Key-Value Info */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14, fontSize: 13 }}>
            <tbody>
              <tr>
                <td style={{ width: 85, padding: '3px 0', fontWeight: 800, color: '#111' }}>Inv. No :</td>
                <td style={{ padding: '3px 0', fontWeight: 600, color: '#111' }}>{printInv.no.replace(/^INV-/, '')}</td>
              </tr>
              <tr>
                <td style={{ padding: '3px 0', fontWeight: 800, color: '#111' }}>Date :</td>
                <td style={{ padding: '3px 0', fontWeight: 600, color: '#111' }}>{formatIndianDate(printInv.date)}</td>
              </tr>
              <tr>
                <td style={{ padding: '3px 0', fontWeight: 800, color: '#111' }}>Name :</td>
                <td style={{ padding: '3px 0', fontWeight: 600, color: '#111', textTransform: 'capitalize' }}>{printInv.customer}</td>
              </tr>
              <tr>
                <td style={{ padding: '3px 0', fontWeight: 800, color: '#111' }}>Phone :</td>
                <td style={{ padding: '3px 0', fontWeight: 600, color: '#111' }}>{printInv.mobile || '—'}</td>
              </tr>
              <tr>
                <td style={{ padding: '3px 0', fontWeight: 800, color: '#111' }}>Event :</td>
                <td style={{ padding: '3px 0', fontWeight: 600, color: '#111' }}>{formatIndianDate(printInv.date)}</td>
              </tr>
              <tr>
                <td style={{ padding: '3px 0', fontWeight: 800, color: '#111' }}>Venue :</td>
                <td style={{ padding: '3px 0', fontWeight: 600, color: '#111' }}>Katargam Studio</td>
              </tr>
            </tbody>
          </table>

          {/* Service Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #222' }}>
            <thead>
              <tr style={{ background: '#fdfefe' }}>
                <th style={{ border: '1.5px solid #222', padding: '6px 8px', fontSize: 11.5, fontWeight: 800, textAlign: 'center' }}>SERVICE</th>
                <th style={{ border: '1.5px solid #222', padding: '6px 4px', fontSize: 11.5, fontWeight: 800, textAlign: 'center', width: 45 }}>QTY</th>
                <th style={{ border: '1.5px solid #222', padding: '6px 6px', fontSize: 11.5, fontWeight: 800, textAlign: 'center', width: 65 }}>PRICE</th>
                <th style={{ border: '1.5px solid #222', padding: '6px 8px', fontSize: 11.5, fontWeight: 800, textAlign: 'center', width: 75 }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {printInv.lines.map((l, i) => {
                const discAmt = calcLineDiscount(l);
                const netAmt = calcLineTotal(l);
                return (
                  <tr key={i}>
                    <td style={{ border: '1.5px solid #222', padding: '6px 8px', fontSize: 12, fontWeight: 600 }}>
                      <div>{cleanServiceNameForBill(l.name)}</div>
                      {discAmt > 0 && <div style={{ fontSize: 9.5, color: '#16a34a' }}>(Disc: −₹{discAmt})</div>}
                    </td>
                    <td style={{ border: '1.5px solid #222', textAlign: 'center', padding: '6px 4px', fontSize: 12, fontWeight: 600 }}>{l.qty}</td>
                    <td style={{ border: '1.5px solid #222', textAlign: 'right', padding: '6px 6px', fontSize: 12, fontWeight: 600 }}>{Number(l.price).toLocaleString('en-IN')}</td>
                    <td style={{ border: '1.5px solid #222', textAlign: 'right', padding: '6px 8px', fontSize: 12.5, fontWeight: 800 }}>{netAmt.toLocaleString('en-IN')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Totals Summary */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #222', borderTop: 'none', marginBottom: 18 }}>
            <tbody>
              <tr>
                <td style={{ border: '1.5px solid #222', borderTop: 'none', padding: '6px 10px', fontSize: 12.5, fontWeight: 800 }}>Total</td>
                <td style={{ border: '1.5px solid #222', borderTop: 'none', padding: '6px 10px', fontSize: 13.5, fontWeight: 800, textAlign: 'right' }}>₹{Number(printInv.total || 0).toLocaleString('en-IN')}</td>
              </tr>
              {Number(printInv.advance || 0) > 0 && (
                <tr>
                  <td style={{ border: '1.5px solid #222', padding: '6px 10px', fontSize: 12.5, fontWeight: 800 }}>Advance</td>
                  <td style={{ border: '1.5px solid #222', padding: '6px 10px', fontSize: 13.5, fontWeight: 800, textAlign: 'right' }}>₹{Number(printInv.advance).toLocaleString('en-IN')}</td>
                </tr>
              )}
              <tr>
                <td style={{ border: '1.5px solid #222', padding: '6px 10px', fontSize: 12.5, fontWeight: 800 }}>{Number(printInv.balance || 0) > 0 ? 'Received / Paid' : 'Payment'}</td>
                <td style={{ border: '1.5px solid #222', padding: '6px 10px', fontSize: 13.5, fontWeight: 800, textAlign: 'right' }}>₹{(Number(printInv.paid || 0) > 0 ? Number(printInv.paid) : Number(printInv.total || 0) - Number(printInv.advance || 0)).toLocaleString('en-IN')}</td>
              </tr>
              {Number(printInv.balance || 0) > 0 && (
                <tr style={{ background: '#fff1f2' }}>
                  <td style={{ border: '1.5px solid #222', padding: '6px 10px', fontSize: 12.5, fontWeight: 800, color: '#dc2626' }}>Balance Due</td>
                  <td style={{ border: '1.5px solid #222', padding: '6px 10px', fontSize: 13.5, fontWeight: 800, textAlign: 'right', color: '#dc2626' }}>₹{Number(printInv.balance).toLocaleString('en-IN')}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Heartfelt Footer */}
          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#111', marginBottom: 2 }}>Thank you for choosing us! 🙏</div>
            <div style={{ fontSize: 10, color: '#4b5563', lineHeight: 1.4, maxWidth: 300, margin: '0 auto' }}>
              We truly value your trust and hope your experience was everything you imagined !!
            </div>
          </div>

          {/* 35mm Trailing Feed Spacer for Thermal Auto-Cutting */}
          <div className="thermal-cut-feed" style={{ height: '35mm', minHeight: '35mm', width: '100%', clear: 'both' }}></div>
        </div>
      )}

      {/* VIEW: Split OR Builder Mode (balanced 2-column on desktop, stacked on mobile) */}
      <div className={activeTab === 'history' ? '' : 'billing-layout'}>
        {/* Invoice Builder Component */}
        {(activeTab === 'split' || activeTab === 'builder') && (
          <motion.div
            className="card billing-builder-card"
            variants={fadeSlideUp}
            initial="hidden"
            animate="visible"
            style={{
              padding: '16px 18px',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              background: '#ffffff',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <h2
                style={{
                  fontWeight: 800,
                  fontSize: 16,
                  margin: 0,
                  color: '#0f172a',
                  letterSpacing: '-0.01em',
                }}
              >
                {editingInvoiceId
                  ? `✎ Edit Invoice — ${data?.invoices?.find((i) => i.id === editingInvoiceId)?.no || ''}`
                  : 'New POS Invoice'}
              </h2>
              {editingInvoiceId ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={cancelEditInvoice}
                  style={{ fontSize: 11.5, padding: '3px 10px', height: 28, borderRadius: 6 }}
                >
                  Cancel Edit
                </button>
              ) : appointmentRef ? (
                <span
                  style={{
                    fontSize: 11,
                    background: '#e0f2fe',
                    color: '#0369a1',
                    padding: '3px 8px',
                    borderRadius: 6,
                    fontWeight: 700,
                    border: '1px solid #bae6fd',
                  }}
                >
                  {appointmentRef}
                </span>
              ) : null}
            </div>

            {/* Quick Import Bridal Booking (Compact pink container) */}
            {data?.bridal && data.bridal.length > 0 && (
              <div
                style={{
                  marginBottom: 12,
                  padding: '8px 12px',
                  background: 'linear-gradient(135deg, #fdf2f8 0%, #fff1f2 100%)',
                  borderRadius: 10,
                  border: '1px solid #fbcfe8',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: '#9d174d',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    👑 Quick Import Bridal Booking
                  </span>
                  <span style={{ fontSize: 10.5, fontWeight: 500, color: '#be185d' }}>
                    Auto-loads ceremony events &amp; package into bill
                  </span>
                </div>
                <select
                  className="input"
                  style={{
                    height: 34,
                    fontSize: 12,
                    fontWeight: 600,
                    borderColor: '#f472b6',
                    background: '#ffffff',
                    color: '#831843',
                    cursor: 'pointer',
                    padding: '0 10px',
                    borderRadius: 7,
                  }}
                  onChange={(e) => {
                    const b = data.bridal?.find((x) => x.id === e.target.value);
                    if (b) {
                      handleImportBridal(b);
                    }
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select bride booking to load into bill…
                  </option>
                  {data.bridal.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.mobile || 'No mobile'}) — {b.packageName || 'Bridal'} ({money(b.package)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Customer Information (Compact 2-column layout) */}
            <div
              className="billing-customer-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)',
                gap: 10,
                marginBottom: 10,
              }}
            >
              <div className="form-group" style={{ margin: 0 }}>
                <label
                  className="label"
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    marginBottom: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    color: '#1e293b',
                  }}
                >
                  <span>Customer Name</span>
                  <span style={{ fontSize: 10.5, fontWeight: 400, color: '#64748b' }}>
                    (auto-suggest)
                  </span>
                </label>
                <input
                  type="text"
                  className="input"
                  list="billing-cust-name-list"
                  autoComplete="off"
                  placeholder="Start typing name or contact…"
                  value={customer}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  style={{
                    height: 38,
                    fontSize: 12.5,
                    borderRadius: 8,
                    padding: '0 10px',
                    border: '1px solid #cbd5e1',
                  }}
                />
                <datalist id="billing-cust-name-list">
                  {(data?.customers || []).map((c) => (
                    <option
                      key={c.id}
                      value={`${formatCustomerContactName(c.name)} (${c.mobile})`}
                    >
                      {formatCustomerContactName(c.name)} — 📞 {c.mobile}
                    </option>
                  ))}
                </datalist>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label
                  className="label"
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    marginBottom: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    color: '#1e293b',
                  }}
                >
                  <span>Mobile Number</span>
                  <span style={{ fontSize: 10.5, fontWeight: 400, color: '#64748b' }}>
                    (10-digit)
                  </span>
                </label>
                <input
                  type="tel"
                  className="input"
                  list="billing-cust-mob-list"
                  autoComplete="off"
                  placeholder="10-digit mobile number"
                  value={mobile}
                  onChange={(e) => handleMobileSelect(e.target.value)}
                  style={{
                    height: 38,
                    fontSize: 12.5,
                    borderRadius: 8,
                    padding: '0 10px',
                    border: '1px solid #cbd5e1',
                  }}
                />
                <datalist id="billing-cust-mob-list">
                  {(data?.customers || []).map((c) => (
                    <option
                      key={c.id}
                      value={`${c.mobile} (${formatCustomerContactName(c.name)})`}
                    >
                      {c.mobile} — 👤 {formatCustomerContactName(c.name)}
                    </option>
                  ))}
                </datalist>
              </div>
            </div>

            {/* Loyalty & Wallet Banner */}
            {selectedCustomerObj &&
              (data?.settings?.loyaltyEnabled || data?.settings?.walletEnabled) && (
                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                    flexWrap: 'wrap',
                    background: 'linear-gradient(135deg, #05424a10, #eaba3815)',
                    border: '1px solid #05424A',
                    borderRadius: 8,
                    padding: '8px 12px',
                    marginBottom: 10,
                    alignItems: 'center',
                  }}
                >
                  <Sparkles size={15} color="#05424A" />
                  <span style={{ fontWeight: 700, fontSize: 12.5, color: '#05424A', flex: 1 }}>
                    {selectedCustomerObj.name}
                  </span>
                  {data?.settings?.loyaltyEnabled && (
                    <span
                      style={{
                        fontSize: 11.5,
                        background: '#eaba3825',
                        borderRadius: 6,
                        padding: '2px 7px',
                        fontWeight: 700,
                        color: '#92741a',
                      }}
                    >
                      ⭐ {selectedCustomerObj.loyaltyPoints || 0} pts
                    </span>
                  )}
                  {data?.settings?.walletEnabled && (
                    <span
                      style={{
                        fontSize: 11.5,
                        background: '#05424a15',
                        borderRadius: 6,
                        padding: '2px 7px',
                        fontWeight: 700,
                        color: '#05424A',
                      }}
                    >
                      💳 Wallet: {money(selectedCustomerObj.walletBalance || 0)}
                    </span>
                  )}
                </div>
              )}

            {/* Barcode / Product Scanning Area (Compact & Action-Oriented) */}
            <div
              className="billing-barcode-container"
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                background: '#f8fafc',
                border: '1px dashed #cbd5e1',
                borderRadius: 8,
                padding: '6px 10px',
                margin: '10px 0 14px',
              }}
            >
              <div
                className="billing-barcode-input-row"
                style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}
              >
                <Barcode size={18} color="#05424A" style={{ flexShrink: 0 }} />
                <input
                  type="text"
                  className="input billing-barcode-input"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    height: 34,
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                    padding: '0 10px',
                    fontSize: 12,
                  }}
                  placeholder="Scan barcode or type item & press Enter…"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleScanBarcode();
                    }
                  }}
                />
              </div>
              <div
                className="billing-barcode-actions"
                style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}
              >
                <button
                  className="btn btn-primary btn-sm"
                  type="button"
                  style={{
                    height: 34,
                    padding: '0 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    borderRadius: 6,
                  }}
                  onClick={() => handleScanBarcode()}
                >
                  Scan Item
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  type="button"
                  style={{
                    height: 34,
                    padding: '0 10px',
                    fontSize: 12,
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                  onClick={() => setCameraModalOpen(true)}
                >
                  <Camera size={13} /> <span>Camera</span>
                </button>
              </div>
            </div>

            {/* Line Items Section */}
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label className="label" style={{ margin: 0, fontWeight: 800, fontSize: 13 }}>
                    Invoice Line Items
                  </label>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      background: '#f1f5f9',
                      color: '#475569',
                      padding: '1px 6px',
                      borderRadius: 99,
                    }}
                  >
                    {lines.filter((l) => l.name && l.name.trim() !== '').length}
                  </span>
                </div>
                <motion.button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setLines((p) => [...p, EMPTY_LINE()])}
                  whileTap={{ scale: 0.96 }}
                  style={{
                    height: 28,
                    padding: '0 10px',
                    fontSize: 11.5,
                    fontWeight: 700,
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#05424A',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Plus size={13} /> <span>Add Item</span>
                </motion.button>
              </div>

              {/* 1. Desktop & Tablet Grid Table (Screens > 640px) */}
              <div className="billing-lines-desktop">
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(140px, 2.3fr) 46px 72px 90px 72px 28px',
                    gap: 6,
                    padding: '6px 8px',
                    background: '#f1f5f9',
                    borderRadius: '7px 7px 0 0',
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: 6,
                    alignItems: 'center',
                    border: '1px solid #e2e8f0',
                    borderBottom: 'none',
                  }}
                >
                  <span>Service / Product Description</span>
                  <span style={{ textAlign: 'center' }}>Qty</span>
                  <span style={{ textAlign: 'right' }}>Price (₹)</span>
                  <span style={{ textAlign: 'center' }}>Disc (₹ / %)</span>
                  <span style={{ textAlign: 'right' }}>Total (₹)</span>
                  <span></span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {lines.map((line, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(140px, 2.3fr) 46px 72px 90px 72px 28px',
                        gap: 6,
                        alignItems: 'center',
                      }}
                    >
                      {/* Item Name + Type Badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button
                          type="button"
                          className={`badge ${line.type === 'P' ? 'badge-blue' : 'badge-gold'}`}
                          style={{
                            cursor: 'pointer',
                            fontSize: 11,
                            padding: '3px 6px',
                            border: 'none',
                            flexShrink: 0,
                            borderRadius: 6,
                          }}
                          title={
                            line.type === 'P'
                              ? 'Retail Product (Click to switch to Service)'
                              : 'Salon Service (Click to switch to Product)'
                          }
                          onClick={() => setLine(idx, { type: line.type === 'P' ? 'S' : 'P' })}
                        >
                          {line.type === 'P' ? '📦' : '💄'}
                        </button>
                        <input
                          type="text"
                          id={`billing-line-name-${idx}`}
                          className="input"
                          list="billing-items-list"
                          placeholder="Select service or scan product…"
                          value={line.name}
                          onChange={(e) => handleItemSelect(idx, e.target.value)}
                          onKeyDown={(e) => handleLineKeyDown(e, idx)}
                          style={{
                            height: 34,
                            fontSize: 12,
                            padding: '0 8px',
                            border: '1px solid #cbd5e1',
                            borderRadius: 6,
                          }}
                        />
                      </div>

                      {/* Qty */}
                      <input
                        type="number"
                        min={1}
                        className="input"
                        title="Quantity"
                        placeholder="Qty"
                        value={line.qty}
                        onChange={(e) =>
                          setLine(idx, { qty: Math.max(1, Number(e.target.value) || 1) })
                        }
                        onKeyDown={(e) => handleLineKeyDown(e, idx)}
                        style={{
                          textAlign: 'center',
                          height: 34,
                          fontSize: 12,
                          padding: '0 2px',
                          border: '1px solid #cbd5e1',
                          borderRadius: 6,
                        }}
                      />

                      {/* Price */}
                      <input
                        type="number"
                        min={0}
                        className="input"
                        title="Rate (₹)"
                        placeholder="0"
                        value={line.price || ''}
                        onChange={(e) =>
                          setLine(idx, { price: Number(e.target.value) || 0 })
                        }
                        onKeyDown={(e) => handleLineKeyDown(e, idx)}
                        style={{
                          textAlign: 'right',
                          height: 34,
                          fontSize: 12,
                          padding: '0 6px',
                          border: '1px solid #cbd5e1',
                          borderRadius: 6,
                        }}
                      />

                      {/* Item Discount Input + Unit Toggle (₹ or %) */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <input
                          type="number"
                          min={0}
                          className="input"
                          title="Discount on this item"
                          placeholder="0"
                          value={line.discount || ''}
                          onChange={(e) =>
                            setLine(idx, { discount: Number(e.target.value) || 0 })
                          }
                          onKeyDown={(e) => handleLineKeyDown(e, idx)}
                          style={{
                            textAlign: 'right',
                            height: 34,
                            fontSize: 12,
                            padding: '0 4px',
                            border: '1px solid #cbd5e1',
                            borderRadius: 6,
                            color: Number(line.discount || 0) > 0 ? '#16a34a' : 'inherit',
                            fontWeight: Number(line.discount || 0) > 0 ? 700 : 400,
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{
                            padding: 0,
                            width: 24,
                            height: 34,
                            fontSize: 11,
                            fontWeight: 700,
                            borderRadius: 6,
                            color: (line.discountType || '₹') === '%' ? '#2563eb' : '#05424A',
                            background:
                              (line.discountType || '₹') === '%' ? '#eff6ff' : '#f0fdf4',
                            border: '1px solid #cbd5e1',
                            flexShrink: 0,
                          }}
                          title={`Toggle Discount Unit: currently ${line.discountType || '₹'}`}
                          onClick={() =>
                            setLine(idx, {
                              discountType: (line.discountType || '₹') === '₹' ? '%' : '₹',
                            })
                          }
                        >
                          {line.discountType || '₹'}
                        </button>
                      </div>

                      {/* Line Net Total */}
                      <div style={{ textAlign: 'right', paddingRight: 4 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>
                          {money(calcLineTotal(line))}
                        </span>
                      </div>

                      {/* Delete Line */}
                      <button
                        type="button"
                        className="btn-icon danger"
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        onClick={() =>
                          setLines((p) => {
                            const remaining = p.filter((_, i) => i !== idx);
                            return remaining.length === 0 ? [EMPTY_LINE()] : remaining;
                          })
                        }
                        disabled={lines.length === 1 && !lines[0].name}
                        title="Remove item"
                      >
                        <Trash2 size={13} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* 2. Mobile Responsive Cards View (Screens <= 640px) */}
              <div className="billing-lines-mobile">
                {lines.map((line, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      padding: 10,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button
                        type="button"
                        className={`badge ${line.type === 'P' ? 'badge-blue' : 'badge-gold'}`}
                        style={{
                          fontSize: 11,
                          padding: '3px 6px',
                          border: 'none',
                          borderRadius: 6,
                          flexShrink: 0,
                        }}
                        onClick={() => setLine(idx, { type: line.type === 'P' ? 'S' : 'P' })}
                      >
                        {line.type === 'P' ? '📦' : '💄'}
                      </button>
                      <input
                        type="text"
                        className="input"
                        list="billing-items-list"
                        placeholder="Select service or scan product…"
                        value={line.name}
                        onChange={(e) => handleItemSelect(idx, e.target.value)}
                        onKeyDown={(e) => handleLineKeyDown(e, idx)}
                        style={{ flex: 1, height: 34, fontSize: 12, padding: '0 8px' }}
                      />
                      <button
                        type="button"
                        className="btn-icon danger"
                        style={{ width: 28, height: 28, borderRadius: 6, flexShrink: 0 }}
                        onClick={() =>
                          setLines((p) => {
                            const remaining = p.filter((_, i) => i !== idx);
                            return remaining.length === 0 ? [EMPTY_LINE()] : remaining;
                          })
                        }
                        disabled={lines.length === 1 && !lines[0].name}
                        title="Remove item"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '46px 72px 1fr auto',
                        gap: 6,
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: 9.5, color: '#64748b', display: 'block', fontWeight: 700 }}>
                          QTY
                        </span>
                        <input
                          type="number"
                          min={1}
                          className="input"
                          value={line.qty}
                          onChange={(e) =>
                            setLine(idx, { qty: Math.max(1, Number(e.target.value) || 1) })
                          }
                          onKeyDown={(e) => handleLineKeyDown(e, idx)}
                          style={{ textAlign: 'center', height: 32, fontSize: 12, padding: 0 }}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: 9.5, color: '#64748b', display: 'block', fontWeight: 700 }}>
                          RATE (₹)
                        </span>
                        <input
                          type="number"
                          min={0}
                          className="input"
                          placeholder="0"
                          value={line.price || ''}
                          onChange={(e) => setLine(idx, { price: Number(e.target.value) || 0 })}
                          onKeyDown={(e) => handleLineKeyDown(e, idx)}
                          style={{ textAlign: 'right', height: 32, fontSize: 12, padding: '0 4px' }}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: 9.5, color: '#64748b', display: 'block', fontWeight: 700 }}>
                          DISCOUNT
                        </span>
                        <div style={{ display: 'flex', gap: 2 }}>
                          <input
                            type="number"
                            min={0}
                            className="input"
                            placeholder="0"
                            value={line.discount || ''}
                            onChange={(e) =>
                              setLine(idx, { discount: Number(e.target.value) || 0 })
                            }
                            onKeyDown={(e) => handleLineKeyDown(e, idx)}
                            style={{ textAlign: 'right', height: 32, fontSize: 12, padding: '0 4px', flex: 1 }}
                          />
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{
                              padding: 0,
                              width: 22,
                              height: 32,
                              fontSize: 10.5,
                              fontWeight: 700,
                              borderRadius: 5,
                            }}
                            onClick={() =>
                              setLine(idx, {
                                discountType: (line.discountType || '₹') === '₹' ? '%' : '₹',
                              })
                            }
                          >
                            {line.discountType || '₹'}
                          </button>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: 60 }}>
                        <span style={{ fontSize: 9.5, color: '#64748b', display: 'block', fontWeight: 700 }}>
                          TOTAL
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                          {money(calcLineTotal(line))}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <datalist id="billing-items-list">
                {allItems.map((item, i) => (
                  <option key={i} value={item.name}>
                    {item.label}
                  </option>
                ))}
              </datalist>
            </div>

            {/* Totals & Discounts Summary Card */}
            <div className="billing-totals" style={{ marginTop: 14 }}>
              <div className="total-row">
                <span>Gross Subtotal</span>
                <span style={{ fontWeight: 600 }}>{money(rawSubtotal)}</span>
              </div>

              {serviceDiscountTotal > 0 && (
                <div className="total-row" style={{ color: '#16a34a', fontSize: 12 }}>
                  <span>💄 Service Discounts</span>
                  <span style={{ fontWeight: 700 }}>−{money(serviceDiscountTotal)}</span>
                </div>
              )}

              {productDiscountTotal > 0 && (
                <div className="total-row" style={{ color: '#16a34a', fontSize: 12 }}>
                  <span>📦 Product Discounts</span>
                  <span style={{ fontWeight: 700 }}>−{money(productDiscountTotal)}</span>
                </div>
              )}

              {itemDiscountTotal > 0 && (
                <div
                  className="total-row"
                  style={{
                    color: '#05424A',
                    fontWeight: 600,
                    fontSize: 12,
                    borderTop: '1px dashed #e2e8f0',
                    paddingTop: 4,
                  }}
                >
                  <span>Net Items Subtotal</span>
                  <span>{money(lineNetTotal)}</span>
                </div>
              )}

              <div className="total-row" style={{ alignItems: 'center' }}>
                <span style={{ fontSize: 12 }}>Additional Bill Discount (₹)</span>
                <input
                  type="number"
                  min={0}
                  className="input"
                  style={{
                    width: 90,
                    height: 30,
                    textAlign: 'right',
                    padding: '0 8px',
                    fontSize: 12,
                    borderRadius: 6,
                  }}
                  placeholder="₹ 0"
                  value={discount || ''}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                />
              </div>

              {totalAllDiscount > 0 && (
                <div
                  className="total-row"
                  style={{ color: '#16a34a', fontWeight: 700, fontSize: 12 }}
                >
                  <span>Total Savings &amp; Discounts</span>
                  <span>−{money(totalAllDiscount)}</span>
                </div>
              )}

              {/* Loyalty Points Redemption */}
              {selectedCustomerObj &&
                data?.settings?.loyaltyEnabled &&
                (selectedCustomerObj.loyaltyPoints || 0) >=
                  (data?.settings?.loyaltyMinRedeem || 50) && (
                  <div
                    className="total-row"
                    style={{
                      alignItems: 'center',
                      background: '#fefce8',
                      borderRadius: 8,
                      padding: '5px 8px',
                    }}
                  >
                    <label
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        color: '#92741a',
                      }}
                    >
                      ⭐ Redeem Points ({selectedCustomerObj.loyaltyPoints || 0} pts)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <input
                        type="number"
                        min={0}
                        max={selectedCustomerObj.loyaltyPoints || 0}
                        step={data?.settings?.loyaltyMinRedeem || 50}
                        className="input"
                        style={{ width: 75, height: 28, padding: '0 6px', fontSize: 11.5 }}
                        value={redeemPoints || ''}
                        placeholder="0 pts"
                        onChange={(e) =>
                          setRedeemPoints(
                            Math.min(
                              Number(e.target.value) || 0,
                              selectedCustomerObj.loyaltyPoints || 0
                            )
                          )
                        }
                      />
                      {pointsDiscountAmount > 0 && (
                        <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>
                          = −{money(pointsDiscountAmount)}
                        </span>
                      )}
                    </div>
                  </div>
                )}

              {/* Wallet Usage */}
              {selectedCustomerObj &&
                data?.settings?.walletEnabled &&
                (selectedCustomerObj.walletBalance || 0) > 0 && (
                  <div
                    className="total-row"
                    style={{
                      alignItems: 'center',
                      background: '#f0fdf4',
                      borderRadius: 8,
                      padding: '5px 8px',
                    }}
                  >
                    <label
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        color: '#15803d',
                      }}
                    >
                      💳 Pay from Wallet ({money(selectedCustomerObj.walletBalance || 0)})
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <input
                        type="number"
                        min={0}
                        max={Math.min(
                          selectedCustomerObj.walletBalance || 0,
                          roundedTotal - pointsDiscountAmount
                        )}
                        className="input"
                        style={{ width: 85, height: 28, padding: '0 6px', fontSize: 11.5 }}
                        value={useWallet || ''}
                        placeholder="₹ 0"
                        onChange={(e) =>
                          setUseWallet(
                            Math.min(
                              Number(e.target.value) || 0,
                              selectedCustomerObj.walletBalance || 0,
                              roundedTotal
                            )
                          )
                        }
                      />
                    </div>
                  </div>
                )}

              {advance > 0 && (
                <div
                  className="total-row"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>Advance Deducted:</span>
                    <select
                      value={advanceMode}
                      onChange={(e) => setAdvanceMode(e.target.value)}
                      style={{
                        fontSize: 11,
                        padding: '2px 6px',
                        borderRadius: 4,
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                      }}
                    >
                      <option value="Cash">💵 Cash</option>
                      <option value="GPay UPI">📱 GPay</option>
                      <option value="PhonePe UPI">📲 PhonePe</option>
                      <option value="Card">💳 Card</option>
                      <option value="Bank Transfer">🏦 Bank</option>
                    </select>
                  </div>
                  <span style={{ color: '#05424A', fontWeight: 700 }}>−{money(advance)}</span>
                </div>
              )}

              {/* Vyapar Auto Round Off Toggle */}
              <div className="total-row" style={{ fontSize: 11.5, color: '#64748b' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={autoRoundOff}
                    onChange={(e) => setAutoRoundOff(e.target.checked)}
                  />
                  <span>Auto Round Off (₹0.50)</span>
                </label>
                <span>
                  {roundOffDiff !== 0
                    ? roundOffDiff > 0
                      ? `+₹${roundOffDiff.toFixed(2)}`
                      : `−₹${Math.abs(roundOffDiff).toFixed(2)}`
                    : '₹0.00'}
                </span>
              </div>

              {/* Final Payable — Primary visual emphasis */}
              <div className="total-row grand">
                <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                  Final Payable
                </span>
                <span style={{ fontSize: 18, fontWeight: 900, color: '#05424A' }}>
                  {money(totalAfterLoyalty - Number(advance || 0))}
                </span>
              </div>

              {/* Payment Section (Split or Single Method) */}
              <div
                style={{
                  marginTop: 8,
                  background: '#f1f5f9',
                  padding: 10,
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 6,
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
                    Payment Method
                  </span>
                  <label
                    style={{
                      fontSize: 11,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      cursor: 'pointer',
                      color: '#05424A',
                      fontWeight: 600,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSplitPayment}
                      onChange={(e) => setIsSplitPayment(e.target.checked)}
                    />
                    <span>Split Payment (Cash + UPI)</span>
                  </label>
                </div>

                {isSplitPayment ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                    <div>
                      <label style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>
                        Cash (₹)
                      </label>
                      <input
                        type="number"
                        min={0}
                        className="input"
                        placeholder="Cash"
                        value={splitCash}
                        onChange={(e) => setSplitCash(Number(e.target.value) || '')}
                        style={{ padding: '0 6px', height: 32, fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 1,
                        }}
                      >
                        <label style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>
                          UPI (₹)
                        </label>
                        <select
                          value={splitUpiMode}
                          onChange={(e) => setSplitUpiMode(e.target.value)}
                          style={{
                            fontSize: 9.5,
                            padding: '1px 3px',
                            borderRadius: 4,
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                          }}
                        >
                          <option value="GPay UPI">GPay</option>
                          <option value="PhonePe UPI">PhonePe</option>
                        </select>
                      </div>
                      <input
                        type="number"
                        min={0}
                        className="input"
                        placeholder="UPI"
                        value={splitUpi}
                        onChange={(e) => setSplitUpi(Number(e.target.value) || '')}
                        style={{ padding: '0 6px', height: 32, fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>
                        Card (₹)
                      </label>
                      <input
                        type="number"
                        min={0}
                        className="input"
                        placeholder="Card"
                        value={splitCard}
                        onChange={(e) => setSplitCard(Number(e.target.value) || '')}
                        style={{ padding: '0 6px', height: 32, fontSize: 12 }}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ flex: 1 }}>
                        <input
                          type="text"
                          className="input"
                          list="pos-payment-accounts"
                          placeholder="Pick payment method…"
                          value={mode}
                          onChange={(e) => setMode(e.target.value)}
                          style={{ height: 32, fontSize: 12, padding: '0 8px' }}
                        />
                        <datalist id="pos-payment-accounts">
                          {(
                            data?.settings?.payments || [
                              'Cash',
                              'GPay UPI',
                              'PhonePe UPI',
                              'Card',
                              'Bank Transfer',
                              'HDFC Bank',
                            ]
                          ).map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </datalist>
                      </div>
                      <div style={{ width: 110 }}>
                        <input
                          type="number"
                          min={0}
                          className="input"
                          placeholder="Paid ₹"
                          value={paid}
                          onChange={(e) => setPaid(Number(e.target.value) || '')}
                          style={{ textAlign: 'right', height: 32, fontSize: 12, padding: '0 6px' }}
                        />
                      </div>
                    </div>

                    {/* Quick Pick Pills */}
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {(
                        data?.settings?.payments || [
                          'Cash',
                          'GPay UPI',
                          'PhonePe UPI',
                          'Card',
                          'Bank Transfer',
                          'HDFC Bank',
                        ]
                      ).map((p) => {
                        const isSelected = mode === p;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setMode(p)}
                            style={{
                              padding: '3px 7px',
                              borderRadius: 5,
                              border: isSelected ? '1.5px solid #05424A' : '1px solid #cbd5e1',
                              background: isSelected ? '#05424A' : '#ffffff',
                              color: isSelected ? '#ffffff' : '#334155',
                              fontWeight: isSelected ? 700 : 500,
                              fontSize: 11,
                              cursor: 'pointer',
                            }}
                          >
                            {p}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Balance Due Status */}
              <div
                className="total-row"
                style={{
                  marginTop: 6,
                  fontWeight: 700,
                  color: balance > 0 ? '#dc2626' : '#16a34a',
                }}
              >
                <span>{balance > 0 ? 'Balance Due' : 'Status'}</span>
                <span>{balance > 0 ? money(balance) : '✅ Fully Paid'}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              {editingInvoiceId && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ flex: 1, padding: '10px 14px', height: 42, fontSize: 13, borderRadius: 8 }}
                  onClick={cancelEditInvoice}
                >
                  Cancel Edit
                </button>
              )}
              <motion.button
                type="button"
                className="btn btn-primary"
                style={{
                  flex: editingInvoiceId ? 2 : 1,
                  height: 42,
                  padding: '10px 16px',
                  fontSize: 14,
                  fontWeight: 700,
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #05424A 0%, #0a6572 100%)',
                  boxShadow: '0 2px 8px rgba(5, 66, 74, 0.25)',
                }}
                onClick={handleSave}
                whileTap={{ scale: 0.98 }}
              >
                <Printer size={16} />{' '}
                <span>{editingInvoiceId ? 'Update Invoice & Print' : 'Save & Print Receipt'}</span>
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Invoice Receipts History Panel */}
        {(activeTab === 'split' || activeTab === 'history') && (
          <motion.div className="card billing-builder-card" variants={fadeSlideUp} initial="hidden" animate="visible">
            {/* Header & Search */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ fontWeight: 700, fontSize: 16, margin: 0, color: 'var(--text)' }}>
                  Recent Invoices
                </h2>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    background: 'var(--teal-subtle)',
                    color: 'var(--teal)',
                    padding: '2px 8px',
                    borderRadius: 99,
                    lineHeight: 1.2,
                  }}
                >
                  {filteredInvoices.length}
                </span>
              </div>
              <div className="search-wrap" style={{ maxWidth: 220, flex: 1, minWidth: 140 }}>
                <Search size={13} className="search-icon" />
                <input
                  type="search"
                  className="input"
                  placeholder="Search invoice…"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  style={{ padding: '6px 10px 6px 30px', fontSize: 12, height: 32 }}
                />
              </div>
            </div>

            {/* Quick Metrics Strip */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  background: '#f8fafc',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Invoices
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginTop: 3, lineHeight: 1.2 }}>
                  {invoiceStats.count}
                </div>
              </div>
              <div
                style={{
                  background: '#f0fdf4',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #bbf7d0',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 10.5, color: '#15803d', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Collected
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#16a34a', marginTop: 3, lineHeight: 1.2 }}>
                  {money(invoiceStats.totalCollected)}
                </div>
              </div>
              <div
                style={{
                  background: invoiceStats.totalDue > 0 ? '#fef2f2' : '#f8fafc',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: invoiceStats.totalDue > 0 ? '1px solid #fecaca' : '1px solid #e2e8f0',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 10.5, color: invoiceStats.totalDue > 0 ? '#dc2626' : '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Due Balance
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: invoiceStats.totalDue > 0 ? '#dc2626' : '#0f172a', marginTop: 3, lineHeight: 1.2 }}>
                  {money(invoiceStats.totalDue)}
                </div>
              </div>
            </div>

            {filteredInvoices.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px 16px' }}>
                <History size={36} />
                <h3 style={{ fontSize: 14, marginTop: 8 }}>No invoices found</h3>
                <p style={{ fontSize: 12 }}>Generated bills and receipts will appear here.</p>
              </div>
            ) : (
              <>
                {/* Desktop & Tablet Table (>= 681px) */}
                <div className="billing-invoices-desktop">
                  <div className="table-wrap" style={{ maxHeight: 520, overflowY: 'auto', overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
                      <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <tr>
                          <th style={{ padding: '9px 8px', fontSize: 10.5, textAlign: 'left', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>Invoice &amp; Date</th>
                          <th style={{ padding: '9px 8px', fontSize: 10.5, textAlign: 'left', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Customer</th>
                          <th style={{ padding: '9px 8px', fontSize: 10.5, textAlign: 'left', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>Amount &amp; Status</th>
                          <th style={{ padding: '9px 8px', fontSize: 10.5, textAlign: 'right', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap', width: activeTab === 'history' ? 'auto' : 92 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredInvoices.map((inv) => (
                          <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px 8px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                              <div style={{ height: 22, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <button
                                  type="button"
                                  onClick={() => setReceiptModalInv(inv)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: 0,
                                    fontWeight: 800,
                                    color: '#05424A',
                                    cursor: 'pointer',
                                    fontSize: 12.5,
                                    fontFamily: 'monospace, sans-serif',
                                  }}
                                  title="Click to view receipt"
                                >
                                  {inv.no}
                                </button>
                                {inv.bridalBookingId || inv.lines?.some((l) => l.name?.toLowerCase().includes('bridal') || l.name?.toLowerCase().includes('makeup')) ? (
                                  <span style={{ fontSize: 9.5, fontWeight: 800, color: '#be185d', background: '#fdf2f8', border: '1px solid #fbcfe8', padding: '1.5px 6px', borderRadius: 4 }}>
                                    👑 Bridal
                                  </span>
                                ) : (
                                  <span style={{ fontSize: 9.5, fontWeight: 700, color: '#0369a1', background: '#f0f9ff', border: '1px solid #bae6fd', padding: '1.5px 6px', borderRadius: 4 }}>
                                    🛍️ POS
                                  </span>
                                )}
                              </div>
                              <div style={{ height: 20, display: 'flex', alignItems: 'center', marginTop: 4, fontSize: 11, color: '#64748b' }}>
                                {fmtDate(inv.date)}
                              </div>
                            </td>
                            <td style={{ padding: '10px 8px', verticalAlign: 'top' }}>
                              <div style={{ height: 22, display: 'flex', alignItems: 'center' }}>
                                <span
                                  style={{ fontWeight: 700, fontSize: 12.5, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: activeTab === 'history' ? 220 : 105 }}
                                  title={inv.customer}
                                >
                                  {inv.customer}
                                </span>
                              </div>
                              <div style={{ height: 20, display: 'flex', alignItems: 'center', marginTop: 4, fontSize: 11, color: '#64748b' }}>
                                {inv.mobile || '—'}
                              </div>
                            </td>
                            <td style={{ padding: '10px 8px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                              <div style={{ height: 22, display: 'flex', alignItems: 'center' }}>
                                <span style={{ fontWeight: 800, fontSize: 13, color: '#0f172a' }}>{money(inv.total)}</span>
                              </div>
                              <div style={{ height: 20, display: 'flex', alignItems: 'center', marginTop: 4 }}>
                                {Number(inv.balance) > 0 ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <span style={{ color: '#dc2626', fontWeight: 700, fontSize: 11 }}>
                                      Due: {money(inv.balance)}
                                    </span>
                                    <button
                                      type="button"
                                      className="btn btn-xs"
                                      style={{
                                        fontSize: 10,
                                        padding: '1px 6px',
                                        height: 19,
                                        borderRadius: 4,
                                        background: '#f0fdf4',
                                        color: '#15803d',
                                        border: '1px solid #86efac',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                      }}
                                      title="Record Payment-In"
                                      onClick={() => openPaymentInModal(inv)}
                                    >
                                      + Collect
                                    </button>
                                  </div>
                                ) : (
                                  <span style={{ color: '#16a34a', fontSize: 11, fontWeight: 600 }}>
                                    Paid: {money(inv.paid)}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: '10px 8px', verticalAlign: 'top', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <div
                                style={
                                  activeTab === 'history'
                                    ? { display: 'flex', gap: 5, alignItems: 'center', justifyContent: 'flex-end', height: 46 }
                                    : { display: 'grid', gridTemplateColumns: 'repeat(3, 26px)', gap: 4, justifyContent: 'flex-end', width: 86, marginLeft: 'auto' }
                                }
                              >
                                <button
                                  type="button"
                                  className="pos-action-btn"
                                  title="View Official Bill Layout"
                                  style={{
                                    background: '#f0f9ff',
                                    color: '#0284c7',
                                    borderColor: '#bae6fd',
                                    height: activeTab === 'history' ? 28 : 21,
                                    width: 26,
                                    padding: 0,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                  onClick={() => setReceiptModalInv(inv)}
                                >
                                  <Eye size={12} />
                                </button>
                                <button
                                  type="button"
                                  className="pos-action-btn"
                                  title="Download PDF Bill"
                                  style={{
                                    background: '#fffbeb',
                                    color: '#b45309',
                                    borderColor: '#fde68a',
                                    height: activeTab === 'history' ? 28 : 21,
                                    width: 26,
                                    padding: 0,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                  onClick={() => downloadInvoicePDF(inv, data)}
                                >
                                  <Download size={12} />
                                </button>
                                <button
                                  type="button"
                                  className="pos-action-btn"
                                  title="Print Thermal / A4 Receipt"
                                  style={{
                                    background: '#f8fafc',
                                    color: '#475569',
                                    borderColor: '#cbd5e1',
                                    height: activeTab === 'history' ? 28 : 21,
                                    width: 26,
                                    padding: 0,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                  onClick={() => handlePrint(inv)}
                                >
                                  <Printer size={12} />
                                </button>
                                {/* 1. Send PDF Invoice via WhatsApp */}
                                <button
                                  type="button"
                                  className="pos-action-btn"
                                  title={
                                    waPdfStatus[inv.id] === 'sending'
                                      ? 'Sending PDF…'
                                      : waPdfStatus[inv.id] === 'sent'
                                      ? '✅ PDF Sent!'
                                      : waPdfStatus[inv.id] === 'failed'
                                      ? '❌ PDF Failed'
                                      : 'Send PDF Invoice via WhatsApp'
                                  }
                                  style={{
                                    background:
                                      waPdfStatus[inv.id] === 'sent'
                                        ? '#dcfce7'
                                        : waPdfStatus[inv.id] === 'failed'
                                        ? '#fee2e2'
                                        : '#ecfdf5',
                                    color:
                                      waPdfStatus[inv.id] === 'sent'
                                        ? '#16a34a'
                                        : waPdfStatus[inv.id] === 'failed'
                                        ? '#dc2626'
                                        : '#059669',
                                    borderColor:
                                      waPdfStatus[inv.id] === 'sent'
                                        ? '#86efac'
                                        : waPdfStatus[inv.id] === 'failed'
                                        ? '#fecaca'
                                        : '#a7f3d0',
                                    opacity: waPdfStatus[inv.id] === 'sending' ? 0.6 : 1,
                                    cursor: waPdfStatus[inv.id] === 'sending' ? 'wait' : 'pointer',
                                    height: activeTab === 'history' ? 28 : 21,
                                    minWidth: 26,
                                    padding: '0 4px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 2,
                                    fontSize: 10,
                                    fontWeight: 700,
                                  }}
                                  disabled={waPdfStatus[inv.id] === 'sending'}
                                  onClick={() => handleSendInvoicePDF(inv)}
                                >
                                  {waPdfStatus[inv.id] === 'sending' ? (
                                    <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />
                                  ) : (
                                    <>
                                      <FileText size={11} />
                                      <span style={{ fontSize: 9 }}>PDF</span>
                                    </>
                                  )}
                                </button>

                                {/* 2. Send Text Receipt via WhatsApp (Approved Template) */}
                                <button
                                  type="button"
                                  className="pos-action-btn"
                                  title={
                                    waTextStatus[inv.id] === 'sending'
                                      ? 'Sending Text…'
                                      : waTextStatus[inv.id] === 'sent'
                                      ? '✅ Text Sent!'
                                      : waTextStatus[inv.id] === 'failed'
                                      ? '❌ Text Failed'
                                      : 'Send Text Receipt via WhatsApp (Approved Template)'
                                  }
                                  style={{
                                    background:
                                      waTextStatus[inv.id] === 'sent'
                                        ? '#dcfce7'
                                        : waTextStatus[inv.id] === 'failed'
                                        ? '#fee2e2'
                                        : '#eff6ff',
                                    color:
                                      waTextStatus[inv.id] === 'sent'
                                        ? '#16a34a'
                                        : waTextStatus[inv.id] === 'failed'
                                        ? '#dc2626'
                                        : '#2563eb',
                                    borderColor:
                                      waTextStatus[inv.id] === 'sent'
                                        ? '#86efac'
                                        : waTextStatus[inv.id] === 'failed'
                                        ? '#fecaca'
                                        : '#bfdbfe',
                                    opacity: waTextStatus[inv.id] === 'sending' ? 0.6 : 1,
                                    cursor: waTextStatus[inv.id] === 'sending' ? 'wait' : 'pointer',
                                    height: activeTab === 'history' ? 28 : 21,
                                    minWidth: 26,
                                    padding: '0 4px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 2,
                                    fontSize: 10,
                                    fontWeight: 700,
                                  }}
                                  disabled={waTextStatus[inv.id] === 'sending'}
                                  onClick={() => handleSendInvoiceText(inv)}
                                >
                                  {waTextStatus[inv.id] === 'sending' ? (
                                    <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />
                                  ) : (
                                    <>
                                      <MessageSquare size={11} />
                                      <span style={{ fontSize: 9 }}>TXT</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  className="pos-action-btn"
                                  title="Edit Invoice"
                                  style={{
                                    background: '#f5f3ff',
                                    color: '#7c3aed',
                                    borderColor: '#ddd6fe',
                                    height: activeTab === 'history' ? 28 : 21,
                                    width: 26,
                                    padding: 0,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                  onClick={() => openEditInvoice(inv)}
                                >
                                  <Pencil size={12} />
                                </button>
                                <button
                                  type="button"
                                  className="pos-action-btn"
                                  title="Delete Invoice & Return Stock"
                                  style={{
                                    background: '#fef2f2',
                                    color: '#dc2626',
                                    borderColor: '#fecaca',
                                    height: activeTab === 'history' ? 28 : 21,
                                    width: 26,
                                    padding: 0,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                  onClick={() => setDeleteInvoiceId(inv.id)}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Cards View (<= 680px) */}
                <div className="billing-invoices-mobile">
                  {filteredInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 10,
                        padding: '12px 14px',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                      }}
                    >
                      {/* Top Row: Invoice Number, Badge, Date */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => setReceiptModalInv(inv)}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              fontWeight: 800,
                              color: '#05424A',
                              cursor: 'pointer',
                              fontSize: 13,
                              fontFamily: 'monospace, sans-serif',
                            }}
                          >
                            {inv.no}
                          </button>
                          {inv.bridalBookingId || inv.lines?.some((l) => l.name?.toLowerCase().includes('bridal') || l.name?.toLowerCase().includes('makeup')) ? (
                            <span style={{ fontSize: 10, fontWeight: 800, color: '#be185d', background: '#fdf2f8', border: '1px solid #fbcfe8', padding: '1.5px 6px', borderRadius: 4 }}>
                              👑 Bridal
                            </span>
                          ) : (
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#0369a1', background: '#f0f9ff', border: '1px solid #bae6fd', padding: '1.5px 6px', borderRadius: 4 }}>
                              🛍️ POS
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: 11, color: '#64748b' }}>{fmtDate(inv.date)}</span>
                      </div>

                      {/* Middle Row: Customer Info & Amount */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                            {inv.customer}
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                            {inv.mobile || '—'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>
                            {money(inv.total)}
                          </div>
                          {Number(inv.balance) > 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end', marginTop: 2 }}>
                              <span style={{ color: '#dc2626', fontWeight: 700, fontSize: 11 }}>
                                Due: {money(inv.balance)}
                              </span>
                              <button
                                type="button"
                                className="btn btn-xs"
                                style={{
                                  fontSize: 10,
                                  padding: '2px 7px',
                                  height: 20,
                                  borderRadius: 4,
                                  background: '#f0fdf4',
                                  color: '#15803d',
                                  border: '1px solid #86efac',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                                onClick={() => openPaymentInModal(inv)}
                              >
                                + Collect
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: '#16a34a', fontSize: 11, fontWeight: 600 }}>
                              ✅ Paid: {money(inv.paid)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions Row */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(4, 1fr) auto auto',
                          gap: 6,
                          borderTop: '1px solid #f1f5f9',
                          paddingTop: 10,
                          alignItems: 'center',
                        }}
                      >
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => setReceiptModalInv(inv)}
                          style={{ height: 32, fontSize: 11, borderRadius: 6, background: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '0 4px' }}
                        >
                          <Eye size={12} /> View
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => downloadInvoicePDF(inv, data)}
                          style={{ height: 32, fontSize: 11, borderRadius: 6, background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '0 4px' }}
                        >
                          <Download size={12} /> PDF
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => handlePrint(inv)}
                          style={{ height: 32, fontSize: 11, borderRadius: 6, background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '0 4px' }}
                        >
                          <Printer size={12} /> Print
                        </button>
                        {/* Card PDF button */}
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          disabled={waPdfStatus[inv.id] === 'sending'}
                          onClick={() => handleSendInvoicePDF(inv)}
                          style={{
                            height: 32,
                            fontSize: 11,
                            borderRadius: 6,
                            background:
                              waPdfStatus[inv.id] === 'sent'
                                ? '#dcfce7'
                                : waPdfStatus[inv.id] === 'failed'
                                ? '#fee2e2'
                                : '#ecfdf5',
                            color:
                              waPdfStatus[inv.id] === 'sent'
                                ? '#16a34a'
                                : waPdfStatus[inv.id] === 'failed'
                                ? '#dc2626'
                                : '#059669',
                            border: '1px solid #86efac',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 3,
                            padding: '0 4px',
                          }}
                        >
                          {waPdfStatus[inv.id] === 'sending' ? (
                            <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                          ) : (
                            <FileText size={12} />
                          )}
                          <span>PDF</span>
                        </button>
                        {/* Card Text button */}
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          disabled={waTextStatus[inv.id] === 'sending'}
                          onClick={() => handleSendInvoiceText(inv)}
                          style={{
                            height: 32,
                            fontSize: 11,
                            borderRadius: 6,
                            background:
                              waTextStatus[inv.id] === 'sent'
                                ? '#dcfce7'
                                : waTextStatus[inv.id] === 'failed'
                                ? '#fee2e2'
                                : '#eff6ff',
                            color:
                              waTextStatus[inv.id] === 'sent'
                                ? '#16a34a'
                                : waTextStatus[inv.id] === 'failed'
                                ? '#dc2626'
                                : '#2563eb',
                            border: '1px solid #bfdbfe',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 3,
                            padding: '0 4px',
                          }}
                        >
                          {waTextStatus[inv.id] === 'sending' ? (
                            <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                          ) : (
                            <MessageSquare size={12} />
                          )}
                          <span>Text</span>
                        </button>
                        <button
                          type="button"
                          className="pos-action-btn"
                          title="Edit Invoice"
                          onClick={() => openEditInvoice(inv)}
                          style={{ width: 32, height: 32, borderRadius: 6, background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe' }}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          className="pos-action-btn"
                          title="Delete Invoice"
                          onClick={() => setDeleteInvoiceId(inv.id)}
                          style={{ width: 32, height: 32, borderRadius: 6, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Quick POS Tips & Shortcuts */}
            <div
              style={{
                marginTop: 16,
                padding: '12px 14px',
                background: '#f8fafc',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, color: '#05424A', fontWeight: 700, fontSize: 12 }}>
                <Sparkles size={14} style={{ color: '#EABA38' }} /> Quick POS Tips &amp; Shortcuts
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: 8 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 10px',
                    background: '#ffffff',
                    borderRadius: 6,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 5,
                      background: '#f1f5f9',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      flexShrink: 0,
                    }}
                  >
                    ⚡
                  </span>
                  <span style={{ fontSize: 11, color: '#475569', lineHeight: 1.35 }}>
                    <strong style={{ color: '#0f172a', fontWeight: 700 }}>Fast Billing:</strong> Press Enter to add rows
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 10px',
                    background: '#ffffff',
                    borderRadius: 6,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 5,
                      background: '#fdf2f8',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      flexShrink: 0,
                    }}
                  >
                    👰
                  </span>
                  <span style={{ fontSize: 11, color: '#475569', lineHeight: 1.35 }}>
                    <strong style={{ color: '#0f172a', fontWeight: 700 }}>Bridal Import:</strong> Auto-fill wedding events
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 10px',
                    background: '#ffffff',
                    borderRadius: 6,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 5,
                      background: '#f0fdf4',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      flexShrink: 0,
                    }}
                  >
                    💬
                  </span>
                  <span style={{ fontSize: 11, color: '#475569', lineHeight: 1.35 }}>
                    <strong style={{ color: '#0f172a', fontWeight: 700 }}>WhatsApp:</strong> Send PDF bill to customer
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 10px',
                    background: '#ffffff',
                    borderRadius: 6,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 5,
                      background: '#f1f5f9',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      flexShrink: 0,
                    }}
                  >
                    🖨️
                  </span>
                  <span style={{ fontSize: 11, color: '#475569', lineHeight: 1.35 }}>
                    <strong style={{ color: '#0f172a', fontWeight: 700 }}>Thermal Print:</strong> 80mm roll auto-cut
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Payment-In Modal for Historic Invoices */}
      {settleInvoice && (
        <Modal
          isOpen={paymentInModalOpen}
          onClose={() => setPaymentInModalOpen(false)}
          title={`💰 Record Payment-In from ${settleInvoice.customer}`}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setPaymentInModalOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSavePaymentIn}>
                <CheckCircle2 size={15} /> Save Payment Receipt
              </button>
            </>
          }
        >
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                <span>Invoice: <b>{settleInvoice.no}</b></span>
                <span>Outstanding Balance: <b style={{ color: 'var(--red)' }}>{money(settleInvoice.balance)}</b></span>
              </div>
            </div>

            <div className="form-group">
              <label className="label">Amount Received (₹) *</label>
              <input
                type="number"
                min={1}
                className="input"
                placeholder="Amount received"
                value={settleAmount}
                onChange={(e) => setSettleAmount(Number(e.target.value) || '')}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="label">Payment Mode</label>
              <select className="input" value={settleMode} onChange={(e) => setSettleMode(e.target.value)}>
                {(data?.settings?.payments || ['Cash', 'GPay UPI', 'PhonePe UPI', 'Card', 'Bank']).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="label">Transaction Reference / UPI ID</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. UPI Ref #492819038"
                value={settleRef}
                onChange={(e) => setSettleRef(e.target.value)}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Invoice Confirmation Modal */}
      {deleteInvoiceId && (
        <Modal
          isOpen={!!deleteInvoiceId}
          onClose={() => setDeleteInvoiceId(null)}
          title="🗑️ Delete Invoice & Restore Stock"
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setDeleteInvoiceId(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={() => handleDeleteInvoice(deleteInvoiceId)}>
                Delete Invoice
              </button>
            </>
          }
        >
          <p style={{ fontSize: 13.5, color: 'var(--text)', margin: '0 0 8px' }}>
            Are you sure you want to delete invoice{' '}
            <b>{data?.invoices?.find((i) => i.id === deleteInvoiceId)?.no}</b> for{' '}
            <b>{data?.invoices?.find((i) => i.id === deleteInvoiceId)?.customer}</b>?
          </p>
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
            💡 All product quantities sold on this bill will be automatically restored back into your inventory stock.
          </p>
        </Modal>
      )}

      {/* Live Camera Barcode Scanner */}
      <CameraBarcodeScanner
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onScan={(code) => handleScanBarcode(code)}
      />

      {/* Official Shree Beauty Studio Invoice Receipt & PDF Modal */}
      <InvoiceReceiptModal
        isOpen={!!receiptModalInv}
        onClose={() => setReceiptModalInv(null)}
        invoice={receiptModalInv}
        salonData={data}
      />
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div>Loading billing module…</div>}>
      <BillingContent />
    </Suspense>
  );
}
