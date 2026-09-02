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
} from 'lucide-react';
import { useSalonStore } from '@/lib/store';
import { scheduleSave } from '@/lib/sync';
import { uid, todayISO, money, fmtDate } from '@/lib/utils';
import { Invoice, InvoiceLine, PaymentVoucher, LoyaltyTransaction, WalletTransaction, BridalBooking } from '@/types/salon';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { downloadInvoicePDF, formatIndianDate, sendInvoicePDFViaWhatsApp } from '@/lib/invoice-pdf';
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

  const [activeTab, setActiveTab] = useState<BillingViewTab>('split');
  const [historySearch, setHistorySearch] = useState('');

  // Form state
  const [customer, setCustomer] = useState('');
  const [mobile, setMobile] = useState('');
  const [lines, setLines] = useState<InvoiceLine[]>([EMPTY_LINE()]);
  const [discount, setDiscount] = useState(0);
  const [advance, setAdvance] = useState(0);
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
  const [waInvoiceStatus, setWaInvoiceStatus] = useState<Record<string, 'sending' | 'sent' | 'failed'>>({});

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
    setPaid(inv.paid);
    setMode(inv.mode || 'Cash');
    if (inv.splitPayment) {
      setIsSplitPayment(true);
      setSplitCash(inv.splitPayment.cash || '');
      setSplitUpi(inv.splitPayment.upi || '');
      setSplitCard(inv.splitPayment.card || '');
    } else {
      setIsSplitPayment(false);
      setSplitCash('');
      setSplitUpi('');
      setSplitCard('');
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
      setLines(newLines);
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

  const handleCustomerSelect = (name: string) => {
    setCustomer(name);
    const c = (data?.customers || []).find((c) => c.name === name);
    if (c) {
      setMobile(c.mobile);
      setSelectedCustomerObj(c);
    } else {
      setSelectedCustomerObj(null);
    }
    setRedeemPoints(0);
    setUseWallet(0);
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
        sendInvoicePDFViaWhatsApp(updatedInv, data).then((res) => {
          if (res.success) toast('✅ PDF Bill sent directly to customer WhatsApp!');
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

    // Auto-send WhatsApp PDF receipt to customer
    if (inv.mobile) {
      sendInvoicePDFViaWhatsApp(inv, data).then((res) => {
        if (res.success) {
          toast('✅ PDF Bill sent directly to customer WhatsApp!');
        } else if (!res.notConfigured) {
          // Only show error toast if it's a real failure (not just "not configured yet")
          toast(res.message, 'error');
        }
      });
    }

    // Open sample layout modal with instant PDF download & print
    setReceiptModalInv(inv);
  };

  const handlePrint = (inv: Invoice) => {
    setPrintInv(inv);
    setTimeout(() => {
      if (data?.settings?.printer === '80') document.body.classList.add('print80');
      window.print();
      document.body.classList.remove('print80');
      setPrintInv(null);
    }, 150);
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

      return {
        ...d,
        invoices: updatedInvoices,
        vouchers: [newVoucher, ...(d.vouchers || [])],
        voucherSeq: voucherSeq + 1,
      };
    });

    scheduleSave();
    toast(`✅ Payment-In of ₹${numPaid} recorded for ${settleInvoice.customer}!`);
    setPaymentInModalOpen(false);
  };

  const recentInvoices = useMemo(
    () => [...(data?.invoices || [])].sort((a, b) => b.date.localeCompare(a.date)),
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

  const tabs: { id: BillingViewTab; label: string; icon: any; count?: number }[] = [
    { id: 'split', label: 'Side-by-Side POS', icon: Columns },
    { id: 'builder', label: 'New POS Bill', icon: Receipt },
    { id: 'history', label: 'Invoice Receipts History', icon: History, count: recentInvoices.length },
  ];

  return (
    <div>
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
              {tab.count !== undefined && <span className="tab-badge">{tab.count}</span>}
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
              Phone / WhatsApp: {data?.settings?.whatsapp ? `${data.settings.whatsapp}, 9825339924` : '9824183769, 9825339924'}
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
                      <div>{l.name}</div>
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
        </div>
      )}

      {/* VIEW: Split OR Builder Mode */}
      <div className={activeTab === 'split' ? 'billing-layout' : ''}>
        {/* Invoice Builder Component */}
        {(activeTab === 'split' || activeTab === 'builder') && (
          <motion.div className="card" style={{ padding: 24 }} variants={fadeSlideUp} initial="hidden" animate="visible">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={{ fontWeight: 700, fontSize: 16, margin: 0, color: 'var(--text)' }}>
                {editingInvoiceId
                  ? `✎ Edit Invoice — ${data?.invoices?.find((i) => i.id === editingInvoiceId)?.no || ''}`
                  : 'New POS Invoice'}
              </h2>
              {editingInvoiceId ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={cancelEditInvoice}
                  style={{ fontSize: 11, padding: '3px 8px' }}
                >
                  Cancel Edit
                </button>
              ) : appointmentRef ? (
                <span
                  style={{
                    fontSize: 11,
                    background: 'var(--teal-subtle)',
                    color: 'var(--teal)',
                    padding: '3px 8px',
                    borderRadius: 6,
                    fontWeight: 700,
                  }}
                >
                  {appointmentRef}
                </span>
              ) : null}
            </div>

            {/* Quick Import Bridal Booking (Loads only ticked functions) */}
            {data?.bridal && data.bridal.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <select
                  className="input"
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    borderColor: '#f472b6',
                    background: '#fdf2f8',
                    color: '#9d174d',
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
                    👰 Quick Import Bridal Booking (Loads only ticked functions into bill)...
                  </option>
                  {data.bridal.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.mobile || 'No mobile'}) — {b.packageName || 'Bridal'} ({money(b.package)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-grid">
              <div className="form-group">
                <label className="label">Customer Name</label>
                <input
                  type="text"
                  className="input"
                  list="billing-cust-list"
                  placeholder="e.g. Priya Sharma / Anjali Patel"
                  value={customer}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                />
                <datalist id="billing-cust-list">
                  {(data?.customers || []).map((c) => <option key={c.id} value={c.name} />)}
                </datalist>
              </div>
              <div className="form-group">
                <label className="label">Mobile Number</label>
                <input
                  type="tel"
                  className="input"
                  placeholder="10-digit mobile (e.g. 9876543210)"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                />
              </div>
            </div>

            {/* Loyalty & Wallet Banner */}
            {selectedCustomerObj && (data?.settings?.loyaltyEnabled || data?.settings?.walletEnabled) && (
              <div style={{
                display: 'flex', gap: 10, flexWrap: 'wrap',
                background: 'linear-gradient(135deg, #05424a14, #eaba3814)',
                border: '1.5px solid var(--teal)',
                borderRadius: 10, padding: '10px 14px',
                marginBottom: 12, alignItems: 'center',
              }}>
                <Sparkles size={16} color="var(--teal)" />
                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--teal)', flex: 1 }}>
                  {selectedCustomerObj.name}
                </span>
                {data?.settings?.loyaltyEnabled && (
                  <span style={{ fontSize: 12, background: '#eaba3820', borderRadius: 6, padding: '3px 8px', fontWeight: 700, color: '#92741a' }}>
                    ⭐ {selectedCustomerObj.loyaltyPoints || 0} pts
                  </span>
                )}
                {data?.settings?.walletEnabled && (
                  <span style={{ fontSize: 12, background: '#05424a15', borderRadius: 6, padding: '3px 8px', fontWeight: 700, color: 'var(--teal)' }}>
                    💳 Wallet: {money(selectedCustomerObj.walletBalance || 0)}
                  </span>
                )}
              </div>
            )}
            <div
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                background: '#f8fafc',
                border: '1.5px dashed var(--border)',
                borderRadius: 10,
                padding: '10px 12px',
                margin: '14px 0 16px',
              }}
            >
              <Barcode size={20} color="var(--teal)" />
              <input
                type="text"
                className="input"
                style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px' }}
                placeholder="Scan barcode with USB laser gun or type & press Enter…"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleScanBarcode();
                  }
                }}
              />
              <button className="btn btn-primary btn-sm" type="button" onClick={() => handleScanBarcode()}>
                Scan Item
              </button>
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setCameraModalOpen(true)}>
                <Camera size={14} /> Camera
              </button>
            </div>

            {/* Line Items */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label className="label" style={{ margin: 0, fontWeight: 800 }}>Invoice Line Items</label>
                <motion.button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setLines((p) => [...p, EMPTY_LINE()])}
                  whileTap={{ scale: 0.97 }}
                >
                  <Plus size={13} /> Add Item
                </motion.button>
              </div>

              {/* Column Header Titles */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(180px, 1.8fr) 52px 75px 105px 75px 28px',
                  gap: 6,
                  padding: '6px 8px',
                  background: '#e2e8f0',
                  borderRadius: '6px 6px 0 0',
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: '#334155',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  marginBottom: 4,
                  alignItems: 'center',
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
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(180px, 1.8fr) 52px 75px 105px 75px 28px',
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
                          fontSize: 10.5,
                          padding: '3px 6px',
                          border: 'none',
                          flexShrink: 0,
                        }}
                        title={line.type === 'P' ? 'Retail Product (Click to switch to Service)' : 'Salon Service (Click to switch to Product)'}
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
                        style={{ fontSize: 12.5, padding: '7px 9px' }}
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
                      onChange={(e) => setLine(idx, { qty: Math.max(1, Number(e.target.value) || 1) })}
                      style={{ textAlign: 'center', fontSize: 12.5, padding: '7px 4px' }}
                    />

                    {/* Price */}
                    <input
                      type="number"
                      min={0}
                      className="input"
                      title="Rate (₹)"
                      placeholder="₹ 0"
                      value={line.price}
                      onChange={(e) => setLine(idx, { price: Number(e.target.value) || 0 })}
                      style={{ textAlign: 'right', fontSize: 12.5, padding: '7px 6px' }}
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
                        onChange={(e) => setLine(idx, { discount: Number(e.target.value) || 0 })}
                        style={{
                          textAlign: 'right',
                          fontSize: 12,
                          padding: '7px 4px',
                          color: Number(line.discount || 0) > 0 ? 'var(--green)' : 'inherit',
                          fontWeight: Number(line.discount || 0) > 0 ? 700 : 400,
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{
                          padding: '5px 5px',
                          fontSize: 11,
                          fontWeight: 700,
                          minWidth: 24,
                          height: 32,
                          borderRadius: 5,
                          color: (line.discountType || '₹') === '%' ? '#2563eb' : 'var(--teal)',
                          background: (line.discountType || '₹') === '%' ? '#eff6ff' : '#f0fdf4',
                          border: '1px solid #cbd5e1',
                        }}
                        title={`Toggle Discount Unit: currently ${line.discountType || '₹'}`}
                        onClick={() => setLine(idx, { discountType: (line.discountType || '₹') === '₹' ? '%' : '₹' })}
                      >
                        {line.discountType || '₹'}
                      </button>
                    </div>

                    {/* Line Net Total */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--teal)' }}>
                        {money(calcLineTotal(line))}
                      </div>
                      {calcLineDiscount(line) > 0 && (
                        <div style={{ fontSize: 9.5, color: 'var(--green)', fontWeight: 700 }}>
                          −{money(calcLineDiscount(line))}
                        </div>
                      )}
                    </div>

                    {/* Delete Line */}
                    <button
                      className="btn-icon danger"
                      style={{ width: 28, height: 28 }}
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

                <datalist id="billing-items-list">
                  {allItems.map((item, i) => (
                    <option key={i} value={item.name}>
                      {item.label}
                    </option>
                  ))}
                </datalist>
              </div>
            </div>

            {/* Totals & Discounts */}
            <div className="billing-totals" style={{ marginTop: 16 }}>
              <div className="total-row">
                <span>Gross Subtotal</span>
                <span style={{ fontWeight: 600 }}>{money(rawSubtotal)}</span>
              </div>

              {serviceDiscountTotal > 0 && (
                <div className="total-row" style={{ color: 'var(--green)', fontSize: 12.5 }}>
                  <span>💄 Service Discounts</span>
                  <span style={{ fontWeight: 700 }}>−{money(serviceDiscountTotal)}</span>
                </div>
              )}

              {productDiscountTotal > 0 && (
                <div className="total-row" style={{ color: 'var(--green)', fontSize: 12.5 }}>
                  <span>📦 Product Discounts</span>
                  <span style={{ fontWeight: 700 }}>−{money(productDiscountTotal)}</span>
                </div>
              )}

              {itemDiscountTotal > 0 && (
                <div className="total-row" style={{ color: 'var(--teal)', fontWeight: 600, fontSize: 12.5, borderTop: '1px dashed var(--border)', paddingTop: 4 }}>
                  <span>Net Items Subtotal</span>
                  <span>{money(lineNetTotal)}</span>
                </div>
              )}

              <div className="total-row" style={{ alignItems: 'center' }}>
                <span style={{ fontSize: 12.5 }}>Additional Bill Discount (₹)</span>
                <input
                  type="number"
                  min={0}
                  className="input"
                  style={{ width: 95, textAlign: 'right', padding: '4px 8px', fontSize: 12.5 }}
                  placeholder="₹ 0"
                  value={discount || ''}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                />
              </div>

              {totalAllDiscount > 0 && (
                <div className="total-row" style={{ color: 'var(--green)', fontWeight: 700, fontSize: 12.5 }}>
                  <span>Total Savings & Discounts</span>
                  <span>−{money(totalAllDiscount)}</span>
                </div>
              )}

              {/* Loyalty Points Redemption */}
              {selectedCustomerObj && data?.settings?.loyaltyEnabled && (selectedCustomerObj.loyaltyPoints || 0) >= (data?.settings?.loyaltyMinRedeem || 50) && (
                <div className="total-row" style={{ alignItems: 'center', background: '#fefce8', borderRadius: 8, padding: '6px 10px' }}>
                  <label style={{ fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, color: '#92741a' }}>
                    ⭐ Redeem Points ({selectedCustomerObj.loyaltyPoints || 0} available)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <input
                      type="number" min={0}
                      max={selectedCustomerObj.loyaltyPoints || 0}
                      step={data?.settings?.loyaltyMinRedeem || 50}
                      className="input"
                      style={{ width: 80, padding: '4px 6px', fontSize: 12 }}
                      value={redeemPoints || ''}
                      placeholder="0 pts"
                      onChange={(e) => setRedeemPoints(Math.min(Number(e.target.value) || 0, selectedCustomerObj.loyaltyPoints || 0))}
                    />
                    {pointsDiscountAmount > 0 && (
                      <span style={{ fontSize: 11.5, color: '#16a34a', fontWeight: 700 }}>= −{money(pointsDiscountAmount)}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Wallet Usage */}
              {selectedCustomerObj && data?.settings?.walletEnabled && (selectedCustomerObj.walletBalance || 0) > 0 && (
                <div className="total-row" style={{ alignItems: 'center', background: '#f0fdf4', borderRadius: 8, padding: '6px 10px' }}>
                  <label style={{ fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, color: '#15803d' }}>
                    💳 Pay from Wallet ({money(selectedCustomerObj.walletBalance || 0)} available)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <input
                      type="number" min={0}
                      max={Math.min(selectedCustomerObj.walletBalance || 0, roundedTotal - pointsDiscountAmount)}
                      className="input"
                      style={{ width: 90, padding: '4px 6px', fontSize: 12 }}
                      value={useWallet || ''}
                      placeholder="₹ 0"
                      onChange={(e) => setUseWallet(Math.min(Number(e.target.value) || 0, selectedCustomerObj.walletBalance || 0, roundedTotal))}
                    />
                  </div>
                </div>
              )}


              {advance > 0 && (
                <div className="total-row">
                  <span>Advance Deducted</span>
                  <span style={{ color: 'var(--teal)' }}>−{money(advance)}</span>
                </div>
              )}

              {/* Vyapar Auto Round Off Toggle */}
              <div className="total-row" style={{ fontSize: 12, color: 'var(--muted)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={autoRoundOff}
                    onChange={(e) => setAutoRoundOff(e.target.checked)}
                  />
                  <span>Auto Round Off (₹0.50)</span>
                </label>
                <span>{roundOffDiff !== 0 ? (roundOffDiff > 0 ? `+₹${roundOffDiff.toFixed(2)}` : `−₹${Math.abs(roundOffDiff).toFixed(2)}`) : '₹0.00'}</span>
              </div>

              <div className="total-row grand">
                <span>Final Payable</span>
                <span>{money(totalAfterLoyalty - Number(advance || 0))}</span>
              </div>

              {/* Split Payment or Single Payment Mode */}
              <div style={{ marginTop: 10, background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700 }}>Payment Method:</span>
                  <label style={{ fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', color: 'var(--teal)' }}>
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
                      <label style={{ fontSize: 10.5, color: 'var(--muted)' }}>Cash (₹)</label>
                      <input
                        type="number"
                        min={0}
                        className="input"
                        placeholder="Cash"
                        value={splitCash}
                        onChange={(e) => setSplitCash(Number(e.target.value) || '')}
                        style={{ padding: '4px 6px', fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10.5, color: 'var(--muted)' }}>UPI / GPay (₹)</label>
                      <input
                        type="number"
                        min={0}
                        className="input"
                        placeholder="UPI"
                        value={splitUpi}
                        onChange={(e) => setSplitUpi(Number(e.target.value) || '')}
                        style={{ padding: '4px 6px', fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10.5, color: 'var(--muted)' }}>Card (₹)</label>
                      <input
                        type="number"
                        min={0}
                        className="input"
                        placeholder="Card"
                        value={splitCard}
                        onChange={(e) => setSplitCard(Number(e.target.value) || '')}
                        style={{ padding: '4px 6px', fontSize: 12 }}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <select className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
                        {(data?.settings?.payments || ['Cash', 'GPay UPI', 'PhonePe UPI', 'Card', 'Bank']).map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ width: 120 }}>
                      <input
                        type="number"
                        min={0}
                        className="input"
                        placeholder="Paid ₹"
                        value={paid}
                        onChange={(e) => setPaid(Number(e.target.value) || '')}
                        style={{ textAlign: 'right' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="total-row" style={{ marginTop: 8, fontWeight: 700, color: balance > 0 ? 'var(--red)' : 'var(--green)' }}>
                <span>Balance Due</span>
                <span>{money(balance)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              {editingInvoiceId && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ flex: 1, padding: 12, fontSize: 13 }}
                  onClick={cancelEditInvoice}
                >
                  Cancel Edit
                </button>
              )}
              <motion.button
                className="btn btn-primary"
                style={{ flex: editingInvoiceId ? 2 : 1, padding: 12, fontSize: 14 }}
                onClick={handleSave}
                whileTap={{ scale: 0.98 }}
              >
                <Printer size={16} /> {editingInvoiceId ? 'Update Invoice & Print' : 'Save & Print Receipt'}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Invoice Receipts History Panel */}
        {(activeTab === 'split' || activeTab === 'history') && (
          <motion.div className="card" style={{ padding: 24 }} variants={fadeSlideUp} initial="hidden" animate="visible">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={{ fontWeight: 700, fontSize: 16, margin: 0, color: 'var(--text)' }}>
                Recent Invoices ({filteredInvoices.length})
              </h2>
              <div className="search-wrap" style={{ maxWidth: 220 }}>
                <Search size={14} className="search-icon" />
                <input
                  type="search"
                  className="input"
                  placeholder="Search invoice…"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  style={{ padding: '6px 10px 6px 32px', fontSize: 12 }}
                />
              </div>
            </div>

            {filteredInvoices.length === 0 ? (
              <div className="empty-state">
                <History size={40} />
                <h3>No invoices found</h3>
                <p>Generated bills and receipts will appear here.</p>
              </div>
            ) : (
              <div className="table-wrap" style={{ maxHeight: 520, overflowY: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Invoice & Date</th>
                      <th>Customer & Mobile</th>
                      <th>Amount & Due</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((inv) => (
                      <tr key={inv.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 700, color: 'var(--teal)' }}>{inv.no}</span>
                            {inv.bridalBookingId || inv.lines?.some((l) => l.name?.toLowerCase().includes('bridal') || l.name?.toLowerCase().includes('makeup')) ? (
                              <span style={{ fontSize: 10, fontWeight: 800, color: '#be185d', background: '#fce7f3', padding: '1px 6px', borderRadius: 6 }}>
                                👑 Bridal
                              </span>
                            ) : (
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#0369a1', background: '#e0f2fe', padding: '1px 6px', borderRadius: 6 }}>
                                🛍️ POS
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{fmtDate(inv.date)}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{inv.customer}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{inv.mobile}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, fontSize: 13.5 }}>{money(inv.total)}</div>
                          {Number(inv.balance) > 0 ? (
                            <div style={{ color: 'var(--red)', fontWeight: 700, fontSize: 11 }}>
                              Due: {money(inv.balance)}
                            </div>
                          ) : (
                            <div style={{ color: 'var(--green)', fontSize: 11, fontWeight: 600 }}>
                              Paid: {money(inv.paid)}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                            {Number(inv.balance) > 0 && (
                              <button
                                className="btn btn-sm btn-ghost"
                                style={{ fontSize: 10, padding: '2px 5px', color: 'var(--green)', borderColor: '#86efac' }}
                                title="Record Payment-In"
                                onClick={() => openPaymentInModal(inv)}
                              >
                                <ArrowDownLeft size={10} /> Collect
                              </button>
                            )}
                            <button
                              className="btn-icon"
                              title="View Official Bill Layout"
                              style={{ background: '#e0f2fe', color: '#0369a1' }}
                              onClick={() => setReceiptModalInv(inv)}
                            >
                              <Eye size={12} />
                            </button>
                            <button
                              className="btn-icon"
                              title="Download PDF Bill"
                              style={{ background: '#fef3c7', color: '#92400e' }}
                              onClick={() => downloadInvoicePDF(inv, data)}
                            >
                              <Download size={12} />
                            </button>
                            <button
                              className="btn-icon edit"
                              title="Edit Invoice"
                              onClick={() => openEditInvoice(inv)}
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              className="btn-icon wa"
                              title={
                                waInvoiceStatus[inv.id] === 'sending'
                                  ? 'Sending…'
                                  : waInvoiceStatus[inv.id] === 'sent'
                                  ? '✅ Sent!'
                                  : waInvoiceStatus[inv.id] === 'failed'
                                  ? '❌ Send Failed'
                                  : 'Send PDF Invoice via WhatsApp'
                              }
                              style={{
                                background:
                                  waInvoiceStatus[inv.id] === 'sent'
                                    ? '#dcfce7'
                                    : waInvoiceStatus[inv.id] === 'failed'
                                    ? '#fee2e2'
                                    : undefined,
                                color:
                                  waInvoiceStatus[inv.id] === 'sent'
                                    ? '#16a34a'
                                    : waInvoiceStatus[inv.id] === 'failed'
                                    ? '#dc2626'
                                    : undefined,
                                opacity: waInvoiceStatus[inv.id] === 'sending' ? 0.6 : 1,
                                cursor: waInvoiceStatus[inv.id] === 'sending' ? 'wait' : 'pointer',
                              }}
                              disabled={waInvoiceStatus[inv.id] === 'sending'}
                              onClick={async () => {
                                if (!inv.mobile) {
                                  toast('No mobile number on this invoice', 'error');
                                  return;
                                }
                                setWaInvoiceStatus((s) => ({ ...s, [inv.id]: 'sending' }));
                                try {
                                  const res = await sendInvoicePDFViaWhatsApp(inv, data);
                                  if (res.success) {
                                    setWaInvoiceStatus((s) => ({ ...s, [inv.id]: 'sent' }));
                                    toast('✅ PDF Invoice sent to customer WhatsApp!');
                                    setTimeout(() => setWaInvoiceStatus((s) => { const n = { ...s }; delete n[inv.id]; return n; }), 4000);
                                  } else {
                                    setWaInvoiceStatus((s) => ({ ...s, [inv.id]: 'failed' }));
                                    toast(res.message || 'WhatsApp send failed', 'error');
                                    setTimeout(() => setWaInvoiceStatus((s) => { const n = { ...s }; delete n[inv.id]; return n; }), 4000);
                                  }
                                } catch {
                                  setWaInvoiceStatus((s) => ({ ...s, [inv.id]: 'failed' }));
                                  toast('Unexpected error sending WhatsApp message', 'error');
                                  setTimeout(() => setWaInvoiceStatus((s) => { const n = { ...s }; delete n[inv.id]; return n; }), 4000);
                                }
                              }}
                            >
                              <MessageCircle size={12} />
                            </button>
                            <button
                              className="btn-icon"
                              title="Print Thermal / A4 Receipt"
                              onClick={() => handlePrint(inv)}
                            >
                              <Printer size={12} />
                            </button>
                            <button
                              className="btn-icon danger"
                              title="Delete Invoice & Return Stock"
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
            )}
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
