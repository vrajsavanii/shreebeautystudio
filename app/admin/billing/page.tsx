'use client';

import { useState, useMemo, useEffect, useCallback, useRef, Suspense } from 'react';
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
  QrCode,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Smartphone,
  UserPlus,
  Zap,
  Calendar,
  Heart,
} from 'lucide-react';
import { AppointmentsPanel } from '@/app/admin/appointments/AppointmentsView';
import { BridalPanel } from '@/app/admin/bridal/BridalView';
import { useSalonStore, resolveBridalBookingPrice } from '@/lib/store';
import { scheduleSave, cloudSave } from '@/lib/sync';
import { uid, todayISO, money, fmtDate, formatCustomerContactName, autoCapitalizeName, getServicePricingBasis, fmtExpiry } from '@/lib/utils';
import { Invoice, InvoiceLine, PaymentVoucher, LoyaltyTransaction, WalletTransaction, BridalBooking, SharedCustomerBridge } from '@/types/salon';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { downloadInvoicePDF, formatIndianDate, sendInvoicePDFViaWhatsApp, sendInvoiceTextViaWhatsApp, cleanServiceNameForBill, shareInvoicePDFViaDirectWhatsApp } from '@/lib/invoice-pdf';
import { isCustomerIn24HourWindow } from '@/lib/whatsapp';
import ReceptionDeskQRModal from '@/components/whatsapp/ReceptionDeskQRModal';
import { SHREE_INVOICE_BILL_LOGO_BASE64 } from '@/lib/logo-base64';
import InvoiceReceiptModal from '@/components/billing/InvoiceReceiptModal';
import ContactImportModal from '@/components/billing/ContactImportModal';
import { staggerContainer, fadeSlideUp } from '@/variants';
import CameraBarcodeScanner from '@/components/barcode/CameraBarcodeScanner';
import {
  getPaymentOptions,
  getDefaultPaymentOption,
  getUpiOrOnlinePaymentOptions,
  getPaymentOptionIcon,
} from '@/lib/payments';

const EMPTY_LINE = (): InvoiceLine => ({
  type: 'S',
  name: '',
  qty: 1,
  price: 0,
  discount: 0,
  discountType: '%',
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

type BillingViewTab = 'appointments' | 'bridal' | 'builder' | 'history';
const TAB_ORDER: BillingViewTab[] = ['appointments', 'bridal', 'builder', 'history'];

const isSwipeBlockedTarget = (target: HTMLElement | null, boundary: HTMLElement | null): boolean => {
  if (!target) return false;
  if (
    target.closest(
      'input, textarea, select, [contenteditable="true"], .no-swipe, [data-no-swipe], .barcode-slider, .modal-backdrop, .modal-panel, .modal-overlay, [role="dialog"], [aria-modal="true"], .tabs, .billing-tabs, [role="tablist"]'
    )
  ) {
    return true;
  }
  let el: HTMLElement | null = target;
  while (el && el !== boundary) {
    if (window.getComputedStyle(el).position === 'fixed') {
      return true;
    }
    el = el.parentElement;
  }
  return false;
};

const canScrollHorizontallyInDirection = (
  target: HTMLElement | null,
  boundary: HTMLElement | null,
  deltaX: number
): boolean => {
  let el: HTMLElement | null = target;
  while (el && el !== boundary) {
    const overflowX = window.getComputedStyle(el).overflowX;
    if ((overflowX === 'auto' || overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 2) {
      if (deltaX < 0 && el.scrollLeft + el.clientWidth < el.scrollWidth - 2) {
        return true;
      }
      if (deltaX > 0 && el.scrollLeft > 2) {
        return true;
      }
    }
    el = el.parentElement;
  }
  return false;
};

const getBridalDetailsForInvoice = (
  inv: Invoice,
  bridalList?: BridalBooking[],
  bridalPackages?: any[],
  services?: any[]
) => {
  const b = (bridalList || []).find(
    (item) =>
      (inv.bridalBookingId && item.id === inv.bridalBookingId) ||
      (item.invoiceId && (item.invoiceId === inv.id || item.invoiceId === inv.no)) ||
      (inv.no && item.notes && item.notes.includes(inv.no)) ||
      (item.name && inv.customer && item.name.trim().toLowerCase() === inv.customer.trim().toLowerCase() &&
        ((item.mobile && inv.mobile && item.mobile.replace(/\D/g, '').endsWith(inv.mobile.replace(/\D/g, '').slice(-10))) ||
         (inv.lines || []).some((l) => l.name?.toLowerCase().includes('bridal') || l.name?.toLowerCase().includes('make-up') || l.name?.toLowerCase().includes('makeup'))))
  );

  const isBridal = Boolean(
    b ||
    inv.bridalBookingId ||
    (inv.lines || []).some((l) => l.name?.toLowerCase().includes('bridal') || l.name?.toLowerCase().includes('makeup') || l.name?.toLowerCase().includes('make-up'))
  );

  if (!isBridal) {
    return {
      isBridal: false,
      booking: undefined,
      brideName: inv.customer,
      brideMobile: inv.mobile || '—',
      birthday: '',
      primaryDate: inv.eventDate || inv.date,
      eventsString: '',
      packageName: (inv.lines || []).map((l) => l.name).slice(0, 2).join(', '),
      packagePrice: inv.total,
      advancePaid: inv.advance || inv.paid || Math.max(0, inv.total - Number(inv.balance || 0)),
      advanceAccount: inv.advanceMode || inv.mode || 'Cash',
      dueBalance: Number(inv.balance || 0),
    };
  }

  const brideName = b?.name || inv.customer;
  const brideMobile = b?.mobile || inv.mobile || '—';
  const birthday = b?.birthday || '';
  const primaryDate = b?.weddingDate || b?.date || inv.eventDate || inv.date;

  const eventsList: string[] = [];
  if (b) {
    if (b.includeWedding !== false && b.weddingDate) {
      eventsList.push(`Wedding: ${fmtDate(b.weddingDate)}${b.weddingTime ? ` @ ${b.weddingTime}` : ''}`);
    }
    if (b.includeSagai && b.sagaiDate) {
      eventsList.push(`Sagai: ${fmtDate(b.sagaiDate)}${b.sagaiTime ? ` @ ${b.sagaiTime}` : ''}`);
    }
    if (b.includeMandap !== false && b.mandapDate) {
      eventsList.push(`Mandap: ${fmtDate(b.mandapDate)}${b.mandapTime ? ` @ ${b.mandapTime}` : ''}`);
    }
    if (b.includeMusic !== false && b.musicDate) {
      eventsList.push(`Music: ${fmtDate(b.musicDate)}${b.musicTime ? ` @ ${b.musicTime}` : ''}`);
    }
    if (b.includeOther && b.otherDate) {
      eventsList.push(`${b.otherEventName || 'Pre-Event'}: ${fmtDate(b.otherDate)}${b.otherTime ? ` @ ${b.otherTime}` : ''}`);
    }
  }

  let eventsString = eventsList.join(' • ');
  if (!eventsString && (b?.date || inv.eventDate)) {
    eventsString = `Wedding: ${fmtDate(b?.date || inv.eventDate)}`;
  }
  const venue = b?.venue || inv.venue;
  if (venue) {
    eventsString = eventsString ? `${eventsString} • 📍 ${venue}` : `📍 ${venue}`;
  }

  const packageName = b?.packageName || (inv.lines && inv.lines[0]?.name) || 'Bridal Luxury Package';
  const packagePrice = b
    ? resolveBridalBookingPrice(b, bridalPackages, services) || inv.total
    : inv.total;

  const advancePaid = b?.advance !== undefined && Number(b.advance) > 0
    ? Number(b.advance)
    : (inv.advance || inv.paid || Math.max(0, inv.total - Number(inv.balance || 0)));

  const advanceAccount = b?.advanceAccount || inv.advanceMode || inv.mode || 'Cash';
  const dueBalance = b?.balance !== undefined ? Number(b.balance) : Number(inv.balance || 0);

  return {
    isBridal: true,
    booking: b,
    brideName,
    brideMobile,
    birthday,
    primaryDate,
    eventsString,
    packageName,
    packagePrice,
    advancePaid,
    advanceAccount,
    dueBalance,
  };
};

function BillingContent() {
  const searchParams = useSearchParams();
  const convertApptId = searchParams.get('convertApptId');
  const importBridalId = searchParams.get('bridalId') || searchParams.get('importBridalId') || searchParams.get('convertBridalId');
  const tabParam = searchParams.get('tab') as BillingViewTab | null;
  const searchParam = searchParams.get('search');

  const { data, updateData } = useSalonStore();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<BillingViewTab>(
    tabParam && TAB_ORDER.includes(tabParam)
      ? tabParam
      : 'builder'
  );
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right'>('left');
  const [swipePreview, setSwipePreview] = useState<{
    offsetX: number;
    targetTab: BillingViewTab | null;
    direction: 'left' | 'right' | null;
  }>({ offsetX: 0, targetTab: null, direction: null });

  const activeTabRef = useRef<BillingViewTab>(activeTab);
  activeTabRef.current = activeTab;
  const prevTabParamRef = useRef<string | null>(tabParam);

  const swipeStateRef = useRef<{
    startX: number;
    startY: number;
    startTime: number;
    axis: 'pending' | 'horizontal' | 'vertical';
    targetEl: HTMLElement | null;
  } | null>(null);
  const billingTabsListRef = useRef<HTMLDivElement | null>(null);
  const tabButtonRefs = useRef<{ [key in BillingViewTab]?: HTMLButtonElement | null }>({});

  const handleSwitchTab = useCallback((tab: BillingViewTab, dir?: 'left' | 'right') => {
    const prev = activeTabRef.current;
    if (prev !== tab) {
      const prevIdx = TAB_ORDER.indexOf(prev);
      const nextIdx = TAB_ORDER.indexOf(tab);
      setSwipeDirection(dir || (nextIdx > prevIdx ? 'left' : 'right'));
      setActiveTab(tab);
    }

    prevTabParamRef.current = tab;

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      if (tab !== 'builder') {
        url.searchParams.delete('convertApptId');
        url.searchParams.delete('bridalId');
        url.searchParams.delete('importBridalId');
        url.searchParams.delete('convertBridalId');
      }
      if (tab !== 'appointments') {
        url.searchParams.delete('new');
        url.searchParams.delete('action');
      }
      if (tab !== 'history') {
        url.searchParams.delete('search');
      }
      window.history.replaceState(null, '', url.pathname + url.search);
      window.dispatchEvent(new CustomEvent('billing-tab-change', { detail: { tab } }));
    }
  }, []);

  // Keep MobileBottomNav in sync whenever activeTab changes from any code path
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('billing-tab-change', { detail: { tab: activeTab } }));
    }
  }, [activeTab]);

  // Auto-scroll active tab pill horizontally into center on mobile without jumping page scroll
  useEffect(() => {
    const container = billingTabsListRef.current;
    const btn = tabButtonRefs.current[activeTab];
    if (container && btn) {
      const targetLeft = btn.offsetLeft - container.clientWidth / 2 + btn.offsetWidth / 2;
      container.scrollTo({
        left: Math.max(0, targetLeft),
        behavior: 'smooth',
      });
    }
  }, [activeTab]);

  const clearSwipeGesture = () => {
    swipeStateRef.current = null;
    setSwipePreview((prev) => (prev.offsetX === 0 && prev.targetTab === null ? prev : { offsetX: 0, targetTab: null, direction: null }));
  };

  const handleContainerTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) {
      clearSwipeGesture();
      return;
    }

    const isMobileViewport = typeof window !== 'undefined' && window.innerWidth < 768;
    if (!isMobileViewport) {
      clearSwipeGesture();
      return;
    }

    // Do not swipe tabs while any modal/dialog is open
    const hasOpenModal =
      cameraModalOpen ||
      paymentInModalOpen ||
      Boolean(receiptModalInv) ||
      qrModalOpen ||
      contactModalOpen ||
      Boolean(deleteInvoiceId) ||
      Boolean(document.querySelector('.modal-backdrop, [role="dialog"][aria-modal="true"]'));
    if (hasOpenModal) {
      clearSwipeGesture();
      return;
    }

    const target = e.target as HTMLElement | null;
    if (isSwipeBlockedTarget(target, e.currentTarget)) {
      clearSwipeGesture();
      return;
    }

    // Skip far-left edge swipe (< 28px) so the mobile drawer edge swipe takes priority
    if (e.touches[0].clientX < 28) {
      clearSwipeGesture();
      return;
    }

    swipeStateRef.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      startTime: Date.now(),
      axis: 'pending',
      targetEl: target,
    };
  };

  const handleContainerTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const state = swipeStateRef.current;
    if (!state || e.touches.length !== 1) {
      if (state) clearSwipeGesture();
      return;
    }

    const dx = e.touches[0].clientX - state.startX;
    const dy = e.touches[0].clientY - state.startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (state.axis === 'vertical') return;

    if (state.axis === 'pending') {
      if (absX < 10 && absY < 10) return;

      // Vertical scroll takes priority so normal scrolling stays smooth
      if (absY >= absX * 0.9) {
        state.axis = 'vertical';
        return;
      }

      if (absX > 12 && absX > absY * 1.3) {
        // Respect horizontally-scrollable nested tables/containers
        if (canScrollHorizontallyInDirection(state.targetEl, e.currentTarget, dx)) {
          state.axis = 'vertical';
          return;
        }
        state.axis = 'horizontal';
      } else {
        return;
      }
    }

    // Axis is locked to horizontal: show gentle drag offset & target tab pill
    const dir: 'left' | 'right' = dx < 0 ? 'left' : 'right';
    const currentIndex = TAB_ORDER.indexOf(activeTabRef.current);
    const targetIndex = dir === 'left' ? currentIndex + 1 : currentIndex - 1;
    const hasTarget = targetIndex >= 0 && targetIndex < TAB_ORDER.length;

    const dampenedOffset = hasTarget
      ? Math.max(-28, Math.min(28, dx * 0.25))
      : Math.max(-10, Math.min(10, dx * 0.08));

    setSwipePreview({
      offsetX: dampenedOffset,
      targetTab: hasTarget && absX >= 20 ? TAB_ORDER[targetIndex] : null,
      direction: dir,
    });
  };

  const handleContainerTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const state = swipeStateRef.current;
    clearSwipeGesture();
    if (!state || state.axis === 'vertical') return;

    const touch = e.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.clientX - state.startX;
    const deltaY = touch.clientY - state.startY;
    const elapsed = Date.now() - state.startTime;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    const isStandardSwipe = absX >= 52 && absX > absY * 1.35 && elapsed <= 900;
    const isQuickFlick = elapsed >= 40 && elapsed <= 260 && absX >= 32 && absX > absY * 1.5;

    if (isStandardSwipe || isQuickFlick) {
      if (
        state.axis === 'pending' &&
        canScrollHorizontallyInDirection(state.targetEl, e.currentTarget, deltaX)
      ) {
        return;
      }

      const currentIndex = TAB_ORDER.indexOf(activeTabRef.current);
      if (deltaX < 0 && currentIndex < TAB_ORDER.length - 1) {
        try {
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate(12);
          }
        } catch {}
        handleSwitchTab(TAB_ORDER[currentIndex + 1], 'left');
      } else if (deltaX > 0 && currentIndex > 0) {
        try {
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate(12);
          }
        } catch {}
        handleSwitchTab(TAB_ORDER[currentIndex - 1], 'right');
      }
    }
  };

  useEffect(() => {
    if (tabParam !== prevTabParamRef.current) {
      prevTabParamRef.current = tabParam;
      if (tabParam && TAB_ORDER.includes(tabParam)) {
        const prevIdx = TAB_ORDER.indexOf(activeTabRef.current);
        const nextIdx = TAB_ORDER.indexOf(tabParam);
        setSwipeDirection(nextIdx >= prevIdx ? 'left' : 'right');
        setActiveTab(tabParam);
      } else if (!tabParam && !convertApptId && !importBridalId && !searchParam) {
        const prevIdx = TAB_ORDER.indexOf(activeTabRef.current);
        const nextIdx = TAB_ORDER.indexOf('builder');
        setSwipeDirection(nextIdx >= prevIdx ? 'left' : 'right');
        setActiveTab('builder');
      }
    }
  }, [tabParam, convertApptId, importBridalId, searchParam]);

  const [historySearch, setHistorySearch] = useState(searchParam || '');

  useEffect(() => {
    if (searchParam) {
      setHistorySearch(searchParam);
      setActiveTab('history');
    }
  }, [searchParam]);
  const [layoutOrientation, setLayoutOrientation] = useState<'up-down' | 'side-by-side'>('side-by-side');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setLayoutOrientation('side-by-side');
      try {
        localStorage.setItem('shree_billing_layout', 'side-by-side');
        localStorage.removeItem('shree_default_discount_pct');
      } catch {}
    }
  }, []);

  const paymentOptions = useMemo(
    () => getPaymentOptions(data?.settings?.payments),
    [data?.settings?.payments]
  );
  const upiPaymentOptions = useMemo(
    () => getUpiOrOnlinePaymentOptions(data?.settings?.payments),
    [data?.settings?.payments]
  );

  // Form state
  const [customer, setCustomer] = useState('');
  const [mobile, setMobile] = useState('');
  const [lines, setLines] = useState<InvoiceLine[]>([EMPTY_LINE()]);
  const [discount, setDiscount] = useState(0);
  const [billDiscountPercent, setBillDiscountPercent] = useState<number | ''>('');
  const [discountMode, setDiscountMode] = useState<'percent' | 'amount'>('amount');
  const [advance, setAdvance] = useState(0);
  const [advanceMode, setAdvanceMode] = useState(getDefaultPaymentOption(data?.settings?.payments));
  const [paid, setPaid] = useState<number | ''>('');
  const [mode, setMode] = useState(getDefaultPaymentOption(data?.settings?.payments));
  const [barcodeInput, setBarcodeInput] = useState('');
  const [appointmentRef, setAppointmentRef] = useState<string | null>(null);

  // Loyalty & Wallet
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [useWallet, setUseWallet] = useState(0);
  const [selectedCustomerObj, setSelectedCustomerObj] = useState<any>(null);

  // Advanced Vyapar Features: Round-off & Manual Price Adjustment (+ YA -)
  const [autoRoundOff, setAutoRoundOff] = useState(true);
  const [isManualRoundOff, setIsManualRoundOff] = useState(false);
  const [customRoundOffSign, setCustomRoundOffSign] = useState<'+' | '-'>('+');
  const [customRoundOffValue, setCustomRoundOffValue] = useState<number | ''>('');
  const [isEditingFinalPayable, setIsEditingFinalPayable] = useState(false);
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [splitCash, setSplitCash] = useState<number | ''>('');
  const [splitUpi, setSplitUpi] = useState<number | ''>('');
  const [splitCard, setSplitCard] = useState<number | ''>('');
  const [splitUpiMode, setSplitUpiMode] = useState(upiPaymentOptions[0] || paymentOptions[0] || 'GPay UPI');

  // Camera Barcode Scanner State
  const [cameraModalOpen, setCameraModalOpen] = useState(false);

  // Payment-In Modal for historical invoices
  const [paymentInModalOpen, setPaymentInModalOpen] = useState(false);
  const [settleInvoice, setSettleInvoice] = useState<Invoice | null>(null);
  const [settleAmount, setSettleAmount] = useState<number | ''>('');
  const [settleMode, setSettleMode] = useState(upiPaymentOptions[0] || paymentOptions[0] || 'GPay UPI');
  const [settleRef, setSettleRef] = useState('');

  // Print state
  const [printInv, setPrintInv] = useState<Invoice | null>(null);
  const [receiptModalInv, setReceiptModalInv] = useState<Invoice | null>(null);

  // WhatsApp send status for history table rows (invoiceId -> 'sending'|'sent'|'failed')
  const [waPdfStatus, setWaPdfStatus] = useState<Record<string, 'sending' | 'sent' | 'failed'>>({});
  const [waTextStatus, setWaTextStatus] = useState<Record<string, 'sending' | 'sent' | 'failed'>>({});
  const [waInvoiceStatus, setWaInvoiceStatus] = useState<Record<string, 'sending' | 'sent' | 'failed'>>({});

  // 24-Hour Free WhatsApp Customer Service Window & Reception QR Modal
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const cust24hStatus = useMemo(() => isCustomerIn24HourWindow(mobile, data), [mobile, data]);

  // Android & iPhone Contact Import Modal & Auto-Suggest State
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [activeCustSuggest, setActiveCustSuggest] = useState<'name' | 'mobile' | null>(null);

  const handleDownloadInvoicePDF = async (inv: Invoice) => {
    try {
      const rawName = (inv.customer || 'invoice').trim();
      const cleanName = rawName.replace(/[^a-zA-Z0-9_\-]/g, '_').toLowerCase();
      const filename = `${cleanName || 'invoice'}_${inv.no || 'bill'}.pdf`;
      toast(`Generating ${filename}…`);
      await downloadInvoicePDF(inv, data, filename, 'thermal');
      toast(`✅ Downloaded ${filename}!`);
    } catch (e: any) {
      // Fallback
      try {
        const res = await fetch(`/api/billing/${inv.id}/pdf`);
        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${inv.customer || 'invoice'}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast(`✅ Downloaded PDF!`);
          return;
        }
      } catch {}
      toast(`Download error: ${e?.message || e || 'Failed to download bill'}`, 'error');
    }
  };

  const handleSendInvoicePDF = async (inv: Invoice) => {
    if (!inv.mobile) {
      toast('No mobile number on this invoice', 'error');
      return;
    }
    const cleanDigits = inv.mobile.replace(/\D/g, '').slice(-10);
    if (cleanDigits.length !== 10) {
      toast('Invalid mobile number. 10 digits required.', 'error');
      return;
    }

    setWaPdfStatus((s) => ({ ...s, [inv.id]: 'sending' }));
    try {
      const res = await fetch(`/api/billing/${inv.id}/whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice: inv, salonData: data }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setWaPdfStatus((s) => ({ ...s, [inv.id]: 'sent' }));
        toast(result.message || 'Bill PDF sent on WhatsApp!');
        setTimeout(() => setWaPdfStatus((s) => { const n = { ...s }; delete n[inv.id]; return n; }), 4000);
      } else {
        if (result.directWaUrl) {
          window.open(result.directWaUrl, '_blank');
          setWaPdfStatus((s) => ({ ...s, [inv.id]: 'sent' }));
          toast('WhatsApp Connect waiting for scan. Opened WhatsApp with bill message.', 'info');
          setTimeout(() => setWaPdfStatus((s) => { const n = { ...s }; delete n[inv.id]; return n; }), 4000);
        } else {
          setWaPdfStatus((s) => ({ ...s, [inv.id]: 'failed' }));
          toast(result.error || result.message || 'WhatsApp PDF send failed', 'error');
          setTimeout(() => setWaPdfStatus((s) => { const n = { ...s }; delete n[inv.id]; return n; }), 4000);
        }
      }
    } catch (err: any) {
      setWaPdfStatus((s) => ({ ...s, [inv.id]: 'failed' }));
      toast(err?.message || 'Unexpected error sending PDF via WhatsApp', 'error');
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

  // Sync active billing payment selectors when Studio Settings payment options change
  useEffect(() => {
    if (!editingInvoiceId) {
      if (!paymentOptions.includes(mode)) {
        setMode(paymentOptions[0] || 'Cash');
      }
      if (!upiPaymentOptions.includes(splitUpiMode)) {
        setSplitUpiMode(upiPaymentOptions[0] || paymentOptions[0] || 'GPay UPI');
      }
    }
  }, [paymentOptions, upiPaymentOptions, editingInvoiceId, mode, splitUpiMode]);

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
    if (inv.discount && (inv.subtotal || 0) > 0) {
      const pct = Number(((inv.discount / inv.subtotal) * 100).toFixed(1));
      setBillDiscountPercent(pct === Math.round(pct) ? Math.round(pct) : pct);
      setDiscountMode('amount');
    } else {
      setBillDiscountPercent('');
      setDiscountMode('amount');
    }
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
    if (inv.roundOff !== undefined && inv.roundOff !== 0) {
      setIsManualRoundOff(true);
      setAutoRoundOff(false);
      setCustomRoundOffSign(inv.roundOff >= 0 ? '+' : '-');
      setCustomRoundOffValue(Number(Math.abs(inv.roundOff).toFixed(2)));
    } else {
      setIsManualRoundOff(false);
      setAutoRoundOff(true);
      setCustomRoundOffSign('+');
      setCustomRoundOffValue('');
    }
    setIsEditingFinalPayable(false);
    handleSwitchTab('builder', 'right');
    toast(`Loaded invoice ${inv.no} for editing`);
  };

  const cancelEditInvoice = () => {
    setEditingInvoiceId(null);
    setCustomer('');
    setMobile('');
    setLines([EMPTY_LINE()]);
    setDiscount(0);
    setBillDiscountPercent('');
    setDiscountMode('amount');
    setAdvance(0);
    setAdvanceMode(getDefaultPaymentOption(data?.settings?.payments));
    setPaid('');
    setIsManualRoundOff(false);
    setAutoRoundOff(true);
    setCustomRoundOffSign('+');
    setCustomRoundOffValue('');
    setIsEditingFinalPayable(false);
    setIsSplitPayment(false);
    setSplitCash('');
    setSplitUpi('');
    setSplitCard('');
    setBarcodeInput('');
    setAppointmentRef(null);
    setRedeemPoints(0);
    setUseWallet(0);
    setSelectedCustomerObj(null);
    setMode(getDefaultPaymentOption(data?.settings?.payments));
  };

  const handleAllClearInvoice = () => {
    const hasData =
      Boolean(editingInvoiceId) ||
      customer.trim() !== '' ||
      mobile.trim() !== '' ||
      lines.some((l) => (l.name && l.name.trim() !== '') || Number(l.price || 0) > 0) ||
      Number(discount || 0) > 0 ||
      paid !== '' ||
      Number(splitCash || 0) > 0 ||
      Number(splitUpi || 0) > 0 ||
      Number(splitCard || 0) > 0 ||
      Boolean(appointmentRef);

    if (hasData) {
      if (!window.confirm('Clear entire invoice and reset all fields (All Clear)?')) {
        return;
      }
    }
    cancelEditInvoice();
    toast('Invoice cleared successfully');
  };

  const handleClearAllLines = () => {
    const hasItems = lines.some((l) => (l.name && l.name.trim() !== '') || Number(l.price || 0) > 0);
    if (!hasItems) return;
    if (window.confirm('Clear all invoice items?')) {
      setLines([EMPTY_LINE()]);
      toast('Invoice items cleared');
    }
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
          { type: 'S', name: a.service, qty: 1, price, discount: 0, discountType: '%' },
          EMPTY_LINE(),
        ]);
        setAppointmentRef(`From Appt: ${a.customer} • ${fmtDate(a.date)} ${a.time} • ${a.service}`);
        setActiveTab('builder');
        toast(`Loaded appointment for ${a.customer}`);
      }
    }
  }, [convertApptId, data?.appointments, data?.services]);

  // Pre-load from Bridal Booking if bridalId query param is present
  useEffect(() => {
    if (importBridalId && data?.bridal) {
      const b = data.bridal.find((x) => x.id === importBridalId);
      if (b) {
        handleImportBridal(b);
        setActiveTab('builder');
      }
    }
  }, [importBridalId, data?.bridal]);

  const handleImportBridal = (b: BridalBooking) => {
    const resolvedTotal = resolveBridalBookingPrice(b, data?.bridalPackages, data?.services);

    // Auto-heal booking in state/store if it was recorded as 0
    if (Number(b.package || 0) === 0 && resolvedTotal > 0) {
      updateData((d) => ({
        ...d,
        bridal: (d.bridal || []).map((x) =>
          x.id === b.id
            ? { ...x, package: resolvedTotal, balance: Math.max(0, resolvedTotal - Number(x.advance || 0)) }
            : x
        ),
      }));
    }

    // 🛡️ DUPLICATE GUARD: If an invoice already exists for this bridal booking, load it in EDIT mode so no duplicate is created!
    const existingInv = (data?.invoices || []).find(
      (i) =>
        (b.invoiceId && i.id === b.invoiceId) ||
        i.bridalBookingId === b.id ||
        (i.mobile === b.mobile && i.customer?.trim().toLowerCase() === b.name?.trim().toLowerCase())
    );

    if (existingInv) {
      setEditingInvoiceId(existingInv.id);
      setCustomer(existingInv.customer || b.name);
      setMobile(existingInv.mobile || b.mobile || '');
      if (existingInv.lines && existingInv.lines.length > 0) {
        setLines([...existingInv.lines, EMPTY_LINE()]);
      }
      setDiscount(existingInv.discount || 0);
      setAdvance(Number(existingInv.advance || b.advance || 0));
      setAdvanceMode(existingInv.advanceMode || b.advanceMode || 'Cash');
      setMode(existingInv.mode || 'Cash');
      setAppointmentRef(`Bridal Booking (${existingInv.no}): ${b.packageName || 'Luxury Package'}`);
      toast(`🛡️ Duplicate Protection Active: Loaded existing Invoice ${existingInv.no}. Saving will update this invoice without creating a duplicate!`, 'info');
      return;
    }

    setCustomer(b.name);
    setMobile(b.mobile || '');
    if (Number(b.advance) > 0) {
      setAdvance(Number(b.advance));
      setAdvanceMode(b.advanceMode || 'Cash');
    }
    setAppointmentRef(`Bridal Booking: ${b.packageName || 'Luxury Package'}`);

    // Case 1: Booking contains specific selectedPackages (combo / bride + siders)
    if (b.selectedPackages && b.selectedPackages.length > 0) {
      const newLines: InvoiceLine[] = b.selectedPackages.map((p) => {
        const itemPrice = Number(p.price || 0) || resolveBridalBookingPrice({ packageName: p.name }, data?.bridalPackages, data?.services);
        const displayName = p.customerName?.trim() ? `${p.name} — 👤 ${p.customerName.trim()}` : p.name;
        return {
          type: 'S',
          name: displayName,
          qty: 1,
          price: itemPrice,
          discount: 0,
          discountType: '%',
        };
      });
      setLines([...newLines, EMPTY_LINE()]);
      toast(`👰 Imported ${b.name}'s bridal booking (${b.selectedPackages.length} package${b.selectedPackages.length > 1 ? 's' : ''})!`);
      return;
    }

    // Case 2: Booking contains ticked / dated events
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
      const perEventPrice = Math.round(resolvedTotal / events.length);

      const newLines: InvoiceLine[] = events.map((ev, idx) => {
        const isLast = idx === events.length - 1;
        const price = isLast ? resolvedTotal - perEventPrice * (events.length - 1) : perEventPrice;
        return {
          type: 'S',
          name: `${b.packageName ? `[${b.packageName}] ` : ''}${ev.name}${ev.date ? ` (${fmtDate(ev.date)}${ev.time ? ` @ ${ev.time}` : ''})` : ''}`,
          qty: 1,
          price: price,
          discount: 0,
          discountType: '%',
        };
      });
      setLines([...newLines, EMPTY_LINE()]);
      toast(`👰 Imported ${b.name}'s bridal booking with ${events.length} ticked function${events.length > 1 ? 's' : ''}!`);
    } else if (b.selectedEvents && b.selectedEvents.length > 0) {
      // Case 3: Events list present without specific dates
      const perEventPrice = Math.round(resolvedTotal / b.selectedEvents.length);
      const newLines: InvoiceLine[] = b.selectedEvents.map((evName, idx) => {
        const isLast = idx === b.selectedEvents!.length - 1;
        const price = isLast ? resolvedTotal - perEventPrice * (b.selectedEvents!.length - 1) : perEventPrice;
        return {
          type: 'S',
          name: `${b.packageName ? `[${b.packageName}] ` : ''}${evName} Makeup & Styling`,
          qty: 1,
          price: price,
          discount: 0,
          discountType: '%',
        };
      });
      setLines([...newLines, EMPTY_LINE()]);
      toast(`👰 Imported ${b.name}'s bridal booking with ${b.selectedEvents.length} event${b.selectedEvents.length > 1 ? 's' : ''}!`);
    } else {
      // Case 4: Single overall package
      setLines([
        {
          type: 'S',
          name: `Bridal Package — ${b.packageName || 'Luxury Makeup'}`,
          qty: 1,
          price: resolvedTotal,
          discount: 0,
          discountType: '%',
        },
        EMPTY_LINE(),
      ]);
      toast(`👰 Imported bridal package for ${b.name} (${money(resolvedTotal)})!`);
    }
  };

  const allServices = useMemo(() => data?.services || [], [data?.services]);

  const popularServices = useMemo(() => {
    const priority = ['hair cut', 'haircut', 'cleanup', 'clean up', 'facial', 'hair spa', 'threading', 'waxing', 'd-tan', 'bleach', 'pedicure', 'manicure'];
    const matched: typeof allServices = [];
    const others: typeof allServices = [];
    allServices.forEach((s) => {
      const lower = (s.name || '').toLowerCase();
      if (priority.some((p) => lower.includes(p))) {
        matched.push(s);
      } else {
        others.push(s);
      }
    });
    return [...matched, ...others].slice(0, 10);
  }, [allServices]);

  const handleQuickAddService = (service: { name: string; price: number }) => {
    setLines((prev) => {
      const lastLineIdx = prev.length - 1;
      const lastLine = prev[lastLineIdx];
      const newLine: InvoiceLine = {
        name: service.name,
        qty: 1,
        price: service.price,
        discount: 0,
        discountType: '%',
        type: 'S',
      };
      if (lastLine && (!lastLine.name || lastLine.name.trim() === '')) {
        const copy = [...prev];
        copy[lastLineIdx] = newLine;
        return copy;
      }
      return [...prev, newLine];
    });
    toast(`⚡ Added "${service.name}" (${money(service.price)})`);
  };

  // Sort inventory items FEFO: Products expiring first appear first!
  const allProducts = useMemo(() => {
    const list = [...(data?.inventory || [])];
    return list.sort((a, b) => {
      // 1. In-stock products first
      const hasStockA = (a.stock ?? 0) > 0 ? 1 : 0;
      const hasStockB = (b.stock ?? 0) > 0 ? 1 : 0;
      if (hasStockA !== hasStockB) return hasStockB - hasStockA;

      // Helper to extract earliest active expiry date
      const getEarliestExp = (item: typeof a) => {
        if (item.batches && item.batches.length > 0) {
          const active = item.batches.filter((x) => (x.stock ?? 0) > 0 && x.expiry);
          if (active.length > 0) {
            active.sort((x, y) => x.expiry!.localeCompare(y.expiry!));
            return active[0].expiry!;
          }
          const allWithExp = item.batches.filter((x) => x.expiry);
          if (allWithExp.length > 0) {
            allWithExp.sort((x, y) => x.expiry!.localeCompare(y.expiry!));
            return allWithExp[0].expiry!;
          }
        }
        return item.expiry || '9999-99-99';
      };

      // 2. FIRST EXPIRY FIRST SHOW (Earliest expiry date at top)
      const expA = getEarliestExp(a);
      const expB = getEarliestExp(b);
      if (expA !== expB) return expA.localeCompare(expB);

      // 3. Name alphabetical
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [data?.inventory]);

  const allItems = useMemo(
    () => [
      ...allServices.map((s) => {
        const basis = getServicePricingBasis(s.category, s.name, s.pricingType);
        const tag = basis.badgeShort ? ` [${basis.badgeShort}]` : '';
        const priceLabel = basis.isFixed ? `Fixed ${money(s.price)}` : `Starts ${money(s.price)}${tag}`;
        return {
          id: s.id,
          label: `[Service] ${s.name} (${priceLabel})`,
          name: s.name,
          price: s.price,
          type: 'S' as const,
          barcode: '',
          brand: '',
          stock: undefined as number | undefined,
          expiry: undefined as string | undefined,
          batch: undefined as string | undefined,
        };
      }),
      ...allProducts.flatMap((p) => {
        // Sort batches by earliest expiry first (FEFO)
        const sortedBatches = (p.batches || [])
          .slice()
          .sort((a, b) => (a.expiry || '9999').localeCompare(b.expiry || '9999'));
        const activeBatches = sortedBatches.filter((b) => (b.stock ?? 0) > 0);
        const earliestBatch = activeBatches[0] || sortedBatches[0];

        const primaryExp = earliestBatch?.expiry || p.expiry || '';
        const primaryBatch = earliestBatch?.batch || earliestBatch?.id || p.batch || '';
        const stockStr = `Stock: ${p.stock ?? 0}`;
        const expStr = primaryExp ? ` · Exp: ${fmtExpiry(primaryExp)}` : '';
        const batchStr = primaryBatch ? ` · Lot: ${primaryBatch}` : '';

        const mainEntry = {
          id: p.id,
          label: `[Product] ${p.name}${p.brand ? ` · ${p.brand}` : ''} [${stockStr}${expStr}${batchStr}]${p.barcode ? ` [Barcode: ${p.barcode}]` : ''} (${money(p.sell)})`,
          name: p.name,
          price: p.sell,
          mrp: p.mrp || p.sell * 1.15,
          expiry: primaryExp,
          batch: primaryBatch,
          batches: sortedBatches,
          stock: p.stock ?? 0,
          type: 'P' as const,
          barcode: p.barcode || '',
          brand: p.brand || '',
        };

        // If product has multiple batches, also include individual batch options sorted FEFO
        if (sortedBatches.length > 1) {
          const batchEntries = sortedBatches.map((b, bi) => ({
            id: `${p.id}-batch-${b.batch || b.id}`,
            productId: p.id,
            label: `[Product] ${p.name} [${bi === 0 ? '⭐ FIRST EXPIRY · ' : ''}Lot: ${b.batch || b.id} · Stock: ${b.stock} · Exp: ${fmtExpiry(b.expiry)}] (${money(b.mrp || p.sell)})`,
            name: p.name,
            price: p.sell,
            mrp: b.mrp || p.mrp || p.sell * 1.15,
            expiry: b.expiry || '',
            batch: b.batch || b.id,
            batches: sortedBatches,
            stock: b.stock ?? 0,
            type: 'P' as const,
            barcode: p.barcode || '',
            brand: p.brand || '',
          }));
          return [mainEntry, ...batchEntries];
        }

        return [mainEntry];
      }),
    ],
    [allServices, allProducts]
  );

  // Helper to extract purchase buy price and detect if selling price is below cost (Loss)
  const getLineProductBuyInfo = useCallback(
    (line: InvoiceLine) => {
      if (line.type !== 'P' || !line.name || !line.name.trim()) return null;
      const p =
        allProducts.find(
          (x) =>
            (line.productId && x.id === line.productId) ||
            x.name.trim().toLowerCase() === line.name.trim().toLowerCase() ||
            (x.barcode && line.barcode && x.barcode === line.barcode)
        ) ||
        (data?.inventory || []).find(
          (x) =>
            (line.productId && x.id === line.productId) ||
            x.name.trim().toLowerCase() === line.name.trim().toLowerCase() ||
            (x.barcode && line.barcode && x.barcode === line.barcode)
        );
      if (!p) return null;

      const batchObj = p.batches?.find((b) => (b.batch || b.id) === line.batch);
      const batchBuyRate = Number(batchObj?.buyRate) || 0;
      const defaultBuyRate = Number(p.buy) || 0;
      const buyPrice = batchBuyRate > 0 ? batchBuyRate : defaultBuyRate;
      const mrp = Number(batchObj?.mrp ?? p.mrp ?? 0);
      const qty = Math.max(1, Number(line.qty) || 1);
      const total = calcLineTotal(line);
      const unitNet = total / qty;
      const rawUnitRate = Number(line.price) || 0;

      // Sell price below buy price condition (Buy Price > Net Selling Price)
      const isBelowBuy = buyPrice > 0 && unitNet < buyPrice;
      const lossPerUnit = isBelowBuy ? buyPrice - unitNet : 0;
      const totalLoss = isBelowBuy ? lossPerUnit * qty : 0;

      return {
        product: p,
        buyPrice,
        mrp,
        unitNet,
        rawUnitRate,
        isBelowBuy,
        lossPerUnit,
        totalLoss,
      };
    },
    [allProducts, data?.inventory]
  );

  const belowBuyLinesList = useMemo(() => {
    return lines
      .map((line, idx) => ({ line, idx, info: getLineProductBuyInfo(line) }))
      .filter((x) => x.info && x.info.isBelowBuy);
  }, [lines, getLineProductBuyInfo]);

  const hasBelowBuyLines = belowBuyLinesList.length > 0;

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

  // Synchronize bill discount amount when rawSubtotal changes and discount mode is percent
  useEffect(() => {
    if (discountMode === 'percent' && typeof billDiscountPercent === 'number' && billDiscountPercent > 0) {
      const calcAmt = Math.round((rawSubtotal * billDiscountPercent) / 100);
      setDiscount(calcAmt);
    }
  }, [rawSubtotal, discountMode, billDiscountPercent]);

  // Auto mathematical round-off to nearest rupee (threshold ₹0.50)
  const autoDiff = useMemo(() => {
    const rawRounded = Math.round(discounted);
    return Number((rawRounded - discounted).toFixed(2));
  }, [discounted]);

  // Round off difference: manual override takes priority if enabled
  const roundOffDiff = useMemo(() => {
    if (isManualRoundOff && customRoundOffValue !== '') {
      const val = Number(customRoundOffValue) || 0;
      return Number((customRoundOffSign === '-' ? -val : val).toFixed(2));
    }
    if (autoRoundOff) {
      return autoDiff;
    }
    return 0;
  }, [isManualRoundOff, customRoundOffValue, customRoundOffSign, autoRoundOff, autoDiff]);

  const roundedTotal = Math.max(0, Number((discounted + roundOffDiff).toFixed(2)));

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

  const handleSetFullPayment = () => {
    const finalPayable = Math.max(0, totalAfterLoyalty - Number(advance || 0));
    if (isSplitPayment) {
      const currentSplitSum = Number(splitCash || 0) + Number(splitUpi || 0) + Number(splitCard || 0);
      const needed = Math.max(0, finalPayable - currentSplitSum);
      if (needed > 0) {
        if (!splitCash && !splitUpi && !splitCard) {
          setSplitCash(finalPayable);
        } else if (splitCash && !splitUpi && !splitCard) {
          setSplitCash(finalPayable);
        } else if (splitUpi && !splitCash && !splitCard) {
          setSplitUpi(finalPayable);
        } else if (splitCard && !splitCash && !splitUpi) {
          setSplitCard(finalPayable);
        } else {
          setSplitCash((prev) => Number(prev || 0) + needed);
        }
      } else if (finalPayable === 0) {
        setSplitCash(0);
        setSplitUpi('');
        setSplitCard('');
      } else {
        setSplitCash(finalPayable);
        setSplitUpi('');
        setSplitCard('');
      }
    } else {
      setPaid(finalPayable);
    }
  };

  const setLine = (idx: number, updates: Partial<InvoiceLine>) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...updates } : l)));
  };

  const handleItemSelect = (idx: number, inputVal: string) => {
    const trimmed = inputVal.trim();
    const item =
      allItems.find((x) => x.name.toLowerCase() === trimmed.toLowerCase()) ||
      allItems.find((x) => x.label.toLowerCase() === trimmed.toLowerCase()) ||
      allItems.find((x) => x.barcode && x.barcode === trimmed);

    setLines((prev) => {
      const updated = prev.map((l, i) => {
        if (i !== idx) return l;
        if (item) {
          let selectedBatch = (item as any).batch;
          let selectedExpiry = (item as any).expiry;

          // FEFO: Auto-assign the earliest active expiring batch
          if (item.type === 'P') {
            const p = (data?.inventory || []).find(
              (x) => x.id === item.id || x.name.toLowerCase() === item.name.toLowerCase()
            );
            const batches = (p?.batches || (item as any).batches || []) as any[];
            if (batches.length > 0) {
              const active = batches
                .filter((b) => (b.stock ?? 0) > 0)
                .sort((a, b) => (a.expiry || '9999').localeCompare(b.expiry || '9999'));
              const allSorted = batches
                .slice()
                .sort((a, b) => (a.expiry || '9999').localeCompare(b.expiry || '9999'));
              const earliest = active[0] || allSorted[0];
              if (earliest) {
                selectedBatch = selectedBatch || earliest.batch || earliest.id;
                selectedExpiry = earliest.expiry || selectedExpiry;
              }
            }
          }

          return {
            ...l,
            productId: (item as any).productId || item.id,
            name: item.name,
            price: item.price,
            type: item.type,
            barcode: item.barcode,
            mrp: (item as any).mrp,
            expiry: selectedExpiry,
            batch: selectedBatch,
            discount: l.discount || 0,
            discountType: l.discountType || '%',
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

  // Smart helper to apply imported contact (from phonebook, paste, or selection)
  const handleImportContact = (rawName: string, rawPhone: string) => {
    let digits = (rawPhone || '').replace(/\D/g, '');
    if (digits.length > 10) {
      if (digits.startsWith('91') && digits.length === 12) digits = digits.slice(2);
      else if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);
      else digits = digits.slice(-10);
    }
    const cleanNum = digits.slice(0, 10);
    const cleanName = autoCapitalizeName((rawName || '').trim());

    if (cleanNum) setMobile(cleanNum);
    if (cleanName) setCustomer(cleanName);

    // Auto-match in salon customers database
    const matched = (data?.customers || []).find(
      (c) =>
        (cleanNum && c.mobile === cleanNum) ||
        (cleanName && c.name.trim().toLowerCase() === cleanName.toLowerCase())
    );

    if (matched) {
      setCustomer(autoCapitalizeName(matched.name));
      setMobile(matched.mobile);
      setSelectedCustomerObj(matched);
      setRedeemPoints(0);
      setUseWallet(0);
      toast(`✅ Matched & auto-imported salon customer: ${matched.name} (📞 ${matched.mobile})`);
    } else {
      setSelectedCustomerObj(null);
      if (cleanName || cleanNum) {
        toast(`📲 Imported contact: ${cleanName || 'Contact'} (${cleanNum || 'No phone'})`);
      }
    }
    setActiveCustSuggest(null);
  };

  // Web Contact Picker API for mobile devices (Android Chrome/Edge/Samsung)
  const handlePickDeviceContact = async () => {
    if (typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window) {
      try {
        const props = ['name', 'tel'];
        const contacts = await (navigator as any).contacts.select(props, { multiple: false });
        if (contacts && contacts.length > 0) {
          const c = contacts[0];
          const name = Array.isArray(c.name) ? c.name[0] : c.name || '';
          const tel = Array.isArray(c.tel) ? c.tel[0] : c.tel || '';
          handleImportContact(name, tel);
          return;
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Contact picker error:', err);
        }
        return;
      }
    }
    // Fallback for iPhone / Safari / Desktop
    setContactModalOpen(true);
  };

  // Auto-Match Customer as user writes Name (Without needing any button!)
  const autoMatchCustomerByName = (inputVal: string, isBlurOrEnter: boolean = false) => {
    const trimmed = inputVal.trim();
    if (!trimmed) {
      if (isBlurOrEnter) {
        setSelectedCustomerObj(null);
      }
      return null;
    }

    const q = trimmed.toLowerCase();
    const customers = data?.customers || [];

    // 1. Exact match (case-insensitive) on name or stripped prefix name
    const exactMatch = customers.find((c) => {
      const fn = formatCustomerContactName(c.name).toLowerCase();
      const raw = c.name.trim().toLowerCase();
      return fn === q || raw === q || fn.replace(/\s+/g, '') === q.replace(/\s+/g, '');
    });

    if (exactMatch) {
      const cleanMob = exactMatch.mobile.replace(/\D/g, '').slice(-10);
      setMobile(cleanMob);
      setSelectedCustomerObj(exactMatch);
      if (isBlurOrEnter) {
        setCustomer(autoCapitalizeName(formatCustomerContactName(exactMatch.name)));
      }
      return exactMatch;
    }

    // 2. Filter matching candidates by name or phone
    const candidates = customers.filter((c) => {
      const fn = formatCustomerContactName(c.name).toLowerCase();
      const raw = c.name.toLowerCase();
      return (
        fn.startsWith(q) ||
        raw.startsWith(q) ||
        fn.includes(q) ||
        raw.includes(q) ||
        c.mobile.includes(q)
      );
    });

    // When typing (at least 2 letters) and exactly 1 salon customer matches:
    if (candidates.length === 1 && q.length >= 2) {
      const single = candidates[0];
      const cleanMob = single.mobile.replace(/\D/g, '').slice(-10);
      setMobile(cleanMob);
      setSelectedCustomerObj(single);
      if (isBlurOrEnter) {
        setCustomer(autoCapitalizeName(formatCustomerContactName(single.name)));
      }
      return single;
    }

    // On Blur or Enter (e.g. user finished typing or tapped away):
    if (isBlurOrEnter && candidates.length > 0) {
      // Find best candidate: prefix match first, then first candidate
      const best =
        candidates.find((c) => formatCustomerContactName(c.name).toLowerCase().startsWith(q)) ||
        candidates.find((c) => c.name.toLowerCase().startsWith(q)) ||
        candidates[0];
      const cleanMob = best.mobile.replace(/\D/g, '').slice(-10);
      setCustomer(autoCapitalizeName(formatCustomerContactName(best.name)));
      setMobile(cleanMob);
      setSelectedCustomerObj(best);
      toast(`👤 Auto-matched: ${formatCustomerContactName(best.name)} (📞 ${cleanMob})`);
      return best;
    }

    return null;
  };

  const handleCustomerSelect = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) {
      setCustomer('');
      setMobile('');
      setSelectedCustomerObj(null);
      return;
    }

    // 1. Check if chosen from datalist format "Name (Mobile)" or "Name — 📞 Mobile"
    const match = trimmed.match(/^(.*?)\s*[\(—\-]\s*(?:📞\s*)?(\d{10})\)?$/);
    if (match) {
      const extractedName = autoCapitalizeName(formatCustomerContactName(match[1].trim()));
      const extractedMob = match[2].trim();
      handleImportContact(extractedName, extractedMob);
      return;
    }

    // 2. Check combined format match
    const foundByCombined = (data?.customers || []).find(
      (c) =>
        `${formatCustomerContactName(c.name)} (${c.mobile})`.toLowerCase() === trimmed.toLowerCase() ||
        `${c.name} (${c.mobile})`.toLowerCase() === trimmed.toLowerCase() ||
        `${formatCustomerContactName(c.name)} — 📞 ${c.mobile}`.toLowerCase() === trimmed.toLowerCase()
    );
    if (foundByCombined) {
      handleImportContact(foundByCombined.name, foundByCombined.mobile);
      return;
    }

    // 3. Smart check if user pasted text with both Name and 10-digit number (e.g. from WhatsApp/Contacts)
    const hasPhoneMatch = trimmed.match(/(?:(?:\+?91|0)[-\s]?)?([6-9]\d{9})/);
    if (hasPhoneMatch) {
      const extractedMob = hasPhoneMatch[1];
      const extractedName = autoCapitalizeName(
        trimmed.replace(hasPhoneMatch[0], '').replace(/[\(\)—\-\:\,\+]/g, ' ').replace(/\s+/g, ' ').trim()
      );
      handleImportContact(extractedName, extractedMob);
      return;
    }

    // 4. User is typing name directly
    setCustomer(val);

    // 5. Automatic real-time matching as they write!
    autoMatchCustomerByName(val, false);
  };

  const handleMobileSelect = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) {
      setMobile('');
      setSelectedCustomerObj(null);
      return;
    }

    // 1. Check if chosen from datalist format "Mobile (Name)" or "Mobile — 👤 Name"
    const match = trimmed.match(/^(\d{10})\s*[\(—\-]\s*(?:👤\s*)?(.*?)\)?$/);
    if (match) {
      const extractedMob = match[1].trim();
      const extractedName = match[2].trim();
      handleImportContact(extractedName, extractedMob);
      return;
    }

    // 2. Normalize mobile number for Android & iPhone (strips +91, 0, spaces, dashes)
    let digits = trimmed.replace(/\D/g, '');
    if (digits.length > 10) {
      if (digits.startsWith('91') && digits.length === 12) {
        digits = digits.slice(2);
      } else if (digits.startsWith('0') && digits.length === 11) {
        digits = digits.slice(1);
      } else {
        digits = digits.slice(-10);
      }
    }
    const cleanNum = digits.slice(0, 10);
    setMobile(cleanNum);

    // 3. AUTO-MATCH & AUTO-IMPORT: When 10 digits match an existing customer
    if (cleanNum.length === 10) {
      const c = (data?.customers || []).find(
        (x) => x.mobile.replace(/\D/g, '').slice(-10) === cleanNum
      );
      if (c) {
        setSelectedCustomerObj(c);
        setCustomer(autoCapitalizeName(formatCustomerContactName(c.name)));
        toast(`👤 Auto-imported: ${formatCustomerContactName(c.name)} (${cleanNum})`);
      } else {
        setSelectedCustomerObj(null);
      }
    } else {
      setSelectedCustomerObj(null);
    }
  };

  // Auto-suggest matches for touch-friendly mobile dropdowns
  // Auto-suggest matches for touch-friendly mobile dropdowns
  const custNameSuggestions = useMemo(() => {
    const q = customer.trim().toLowerCase();
    if (!q || q.length < 1) return [];
    return (data?.customers || [])
      .filter((c) => {
        const fn = formatCustomerContactName(c.name).toLowerCase();
        const raw = c.name.toLowerCase();
        return fn.includes(q) || raw.includes(q) || c.mobile.includes(q);
      })
      .slice(0, 8);
  }, [customer, data?.customers]);

  const custMobSuggestions = useMemo(() => {
    const q = mobile.trim().replace(/\D/g, '');
    if (!q || q.length < 2) return [];
    return (data?.customers || [])
      .filter((c) => c.mobile.replace(/\D/g, '').includes(q))
      .slice(0, 8);
  }, [mobile, data?.customers]);

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
      // FEFO: Auto-assign earliest active expiring batch
      let scanBatch = p.batch;
      let scanExpiry = p.expiry;
      if (p.batches && p.batches.length > 0) {
        const sortedBatches = p.batches
          .filter((b) => (b.stock ?? 0) > 0)
          .sort((a, b) => (a.expiry || '9999').localeCompare(b.expiry || '9999'));
        const earliest = sortedBatches[0] || p.batches.slice().sort((a, b) => (a.expiry || '9999').localeCompare(b.expiry || '9999'))[0];
        if (earliest) {
          scanBatch = earliest.batch || earliest.id;
          scanExpiry = earliest.expiry || scanExpiry;
        }
      }

      const newLine: InvoiceLine = {
        type: 'P',
        productId: p.id,
        name: p.name,
        qty: 1,
        price: p.sell,
        discount: 0,
        discountType: '%',
        mrp: p.mrp || p.sell * 1.15,
        expiry: scanExpiry,
        batch: scanBatch,
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
      const p = allProducts.find((x) => x.name.toLowerCase() === l.name.toLowerCase());
      if (p && Number(p.stock) < Number(l.qty)) {
        toast(`Not enough stock for ${p.name}. Only ${p.stock} available.`, 'error');
        return;
      }
    }

    // Validate buy price: Product cannot be sold below buy price!
    const belowBuySold = validLines
      .map((l) => ({ line: l, info: getLineProductBuyInfo(l) }))
      .filter((x) => x.info && x.info.isBelowBuy);

    if (belowBuySold.length > 0) {
      const lossMsg = belowBuySold
        .map(
          (x) =>
            `• ${x.line.name}: Buy Price ${money(x.info!.buyPrice)} > Net Sell Price ${money(x.info!.unitNet)} (Loss: -${money(x.info!.lossPerUnit)}/pc)`
        )
        .join('\n');
      toast(
        `⛔ PRODUCT NOT SELL: Cannot sell below Buy Price! Please fix marked items.`,
        'error'
      );
      alert(
        `⛔ PRODUCT NOT SELL — BELOW BUY PRICE (LOSS PREVENTION):\n\nThe following product(s) cannot be sold because the Net Selling Price is LESS than the Buy Price:\n\n${lossMsg}\n\nPlease reduce the discount or increase the price before proceeding.`
      );
      return;
    }

    // Expiry check warning before sale
    const expiredSold = validLines.filter((l) => {
      if (l.type !== 'P') return false;
      const exp = l.expiry || allProducts.find((x) => x.name.toLowerCase() === l.name.toLowerCase())?.expiry;
      return exp && exp < todayISO();
    });
    if (expiredSold.length > 0) {
      const expMsg = expiredSold.map((x) => `• ${x.name} (Exp: ${fmtExpiry(x.expiry)})`).join('\n');
      if (!window.confirm(`⚠️ EXPIRED PRODUCT WARNING:\n\nThe following product(s) are EXPIRED:\n\n${expMsg}\n\nDo you still wish to proceed with selling this item?`)) {
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

    const matchedBridal = (data?.bridal || []).find((b) =>
      (importBridalId && b.id === importBridalId) ||
      (appointmentRef?.includes(b.name) || (b.name.trim().toLowerCase() === customer.trim().toLowerCase() && (b.mobile === mobile || !mobile)))
    );

    // 🛡️ STRICT DUPLICATE GUARD: If an invoice already exists for this bridal booking or customer, update it instead of creating a duplicate!
    const existingDuplicateInv = (data?.invoices || []).find((i) =>
      (matchedBridal && (i.bridalBookingId === matchedBridal.id || (matchedBridal.invoiceId && i.id === matchedBridal.invoiceId))) ||
      (matchedBridal && i.customer?.trim().toLowerCase() === matchedBridal.name?.trim().toLowerCase() && (!matchedBridal.mobile || i.mobile === matchedBridal.mobile)) ||
      (customer && i.customer?.trim().toLowerCase() === customer.trim().toLowerCase() && mobile && i.mobile === mobile && Math.abs(Number(i.total || 0) - roundedTotal) < 1)
    );

    if (existingDuplicateInv) {
      const updatedInv: Invoice = {
        ...existingDuplicateInv,
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
        roundOff: roundOffDiff,
        bridalBookingId: matchedBridal?.id || existingDuplicateInv.bridalBookingId,
      };

      updateData((d) => ({
        ...d,
        invoices: (d.invoices || []).map((i) => (i.id === existingDuplicateInv.id ? updatedInv : i)),
        bridal: (d.bridal || []).map((b) =>
          matchedBridal && b.id === matchedBridal.id ? { ...b, invoiceId: existingDuplicateInv.id } : b
        ),
      }));

      scheduleSave();
      toast(`🛡️ Duplicate Protection Active: Updated existing invoice ${existingDuplicateInv.no} without duplicates!`, 'success');
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
      bridalBookingId: matchedBridal?.id || undefined,
      eventDate: matchedBridal?.weddingDate || matchedBridal?.date || undefined,
      venue: matchedBridal?.venue || undefined,
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

      // Deduct inventory stock & batch quantities for product lines
      let inventory = [...(d.inventory || [])];
      validLines
        .filter((l) => l.type === 'P')
        .forEach((l) => {
          inventory = inventory.map((item) => {
            if (item.name.toLowerCase() !== l.name.toLowerCase()) return item;

            const newStock = Math.max(0, item.stock - Number(l.qty || 0));

            // If item has batches, also deduct from matching batch or FIFO earliest expiry
            let updatedBatches = item.batches ? [...item.batches] : undefined;
            if (updatedBatches && updatedBatches.length > 0) {
              let qtyRemaining = Number(l.qty || 0);

              // 1. If line has an explicit batch, deduct from that batch first
              if (l.batch) {
                const targetIdx = updatedBatches.findIndex((b) => (b.batch || b.id) === l.batch);
                if (targetIdx >= 0) {
                  const bStock = updatedBatches[targetIdx].stock;
                  const deduct = Math.min(bStock, qtyRemaining);
                  updatedBatches[targetIdx] = {
                    ...updatedBatches[targetIdx],
                    stock: Math.max(0, bStock - deduct),
                  };
                  qtyRemaining -= deduct;
                }
              }

              // 2. Deduct any remaining qty from earliest expiring batches (FIFO)
              if (qtyRemaining > 0) {
                const sortedIndices = updatedBatches
                  .map((b, idx) => ({ b, idx }))
                  .sort((a, b) => (a.b.expiry || '9999') > (b.b.expiry || '9999') ? 1 : -1);

                for (const { idx } of sortedIndices) {
                  if (qtyRemaining <= 0) break;
                  const bStock = updatedBatches[idx].stock;
                  if (bStock <= 0) continue;
                  const deduct = Math.min(bStock, qtyRemaining);
                  updatedBatches[idx] = {
                    ...updatedBatches[idx],
                    stock: Math.max(0, bStock - deduct),
                  };
                  qtyRemaining -= deduct;
                }
              }
            }

            // Determine active earliest expiry date after sale
            let nextExpiry = item.expiry;
            if (updatedBatches && updatedBatches.length > 0) {
              const activeBatches = updatedBatches.filter((b) => b.stock > 0 && b.expiry);
              if (activeBatches.length > 0) {
                activeBatches.sort((a, b) => (a.expiry! > b.expiry! ? 1 : -1));
                nextExpiry = activeBatches[0].expiry;
              }
            }

            return {
              ...item,
              stock: newStock,
              batches: updatedBatches,
              expiry: nextExpiry,
            };
          });
        });

      // Log inventoryTx transactions for sales with exact batch & expiry
      const invTxs = validLines
        .filter((l) => l.type === 'P')
        .map((l) => {
          const invItem = (d.inventory || []).find((x) => x.name.toLowerCase() === l.name.toLowerCase());
          return {
            id: uid(),
            date: todayISO(),
            product: l.name,
            barcode: l.barcode || invItem?.barcode || '',
            type: 'Sell' as const,
            qty: l.qty,
            rate: l.price,
            mrp: l.mrp || invItem?.mrp,
            batch: l.batch || invItem?.batch || '',
            expiry: l.expiry || invItem?.expiry || '',
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

      // Update bridal booking invoice ID if linked
      let bridal = [...(d.bridal || [])];
      if (matchedBridal) {
        bridal = bridal.map((b) =>
          b.id === matchedBridal.id ? { ...b, invoiceId: invId } : b
        );
      }

      return {
        ...d,
        customers,
        invoices: [inv, ...(d.invoices || [])],
        inventory,
        inventoryTx: [...(d.inventoryTx || []), ...invTxs],
        appointments,
        bridal,
        invoiceSeq: (d.invoiceSeq || 1001) + 1,
        loyaltyTx,
        walletTx,
      };
    });

    scheduleSave();
    toast(`Invoice ${no} saved & sent!`);

    // Auto-sync to Google Calendar if linked to bridal or advance booking
    if (matchedBridal) {
      fetch('/api/calendar/auto-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'bridal',
          bridal: { ...matchedBridal, invoiceId: invId },
          settings: data?.settings,
        }),
      }).catch(() => {});
    } else if (Number(advance || 0) > 0 || inv.eventDate) {
      // Auto-sync advance booking to Google Calendar
      const autoBridalBooking = {
        id: inv.bridalBookingId || uid(),
        name: customer,
        mobile: mobile || '',
        venue: inv.venue || 'Katargam Studio',
        event: 'Advance Booking',
        date: inv.eventDate || inv.date,
        weddingDate: inv.eventDate || inv.date,
        weddingTime: '10:00',
        includeWedding: true,
        packageName: validLines.map((l) => l.name).join(', '),
        package: roundedTotal,
        totalAmount: roundedTotal,
        advance: Number(advance || 0),
        balance,
        status: 'Confirmed',
        notes: `POS Invoice #${no} · Advance Booking`,
        invoiceId: invId,
      };
      fetch('/api/calendar/auto-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'bridal',
          bridal: autoBridalBooking,
          settings: data?.settings,
        }),
      }).catch(() => {});
    }

    // Reset form
    setCustomer('');
    setMobile('');
    setLines([EMPTY_LINE()]);
    setDiscount(0);
    setBillDiscountPercent('');
    setDiscountMode('amount');
    setAdvance(0);
    setPaid('');
    setIsSplitPayment(false);
    setSplitCash('');
    setSplitUpi('');
    setSplitCard('');
    setMode(getDefaultPaymentOption(data?.settings?.payments));
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

    // Open sample layout modal with instant PDF download & print
    setReceiptModalInv(inv);
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleSave]);

  const handlePrint = (inv: Invoice) => {
    setReceiptModalInv(inv);
  };

  // Record Payment-In for historic invoice dues
  const openPaymentInModal = (inv: Invoice) => {
    setSettleInvoice(inv);
    setSettleAmount(inv.balance);
    setSettleMode(upiPaymentOptions[0] || paymentOptions[0] || 'Cash');
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
    {
      id: 'appointments',
      label: 'Appointments',
      shortLabel: 'Appointments',
      icon: Calendar,
      count: (data?.appointments || []).filter((a) => a.date === todayISO()).length,
    },
    {
      id: 'bridal',
      label: 'Bridal Booking',
      shortLabel: 'Bridal',
      icon: Heart,
      count: (data?.bridal || []).length,
    },
    {
      id: 'builder',
      label: 'Billing (POS)',
      shortLabel: 'Billing POS',
      icon: Receipt,
    },
    {
      id: 'history',
      label: 'Invoice History',
      shortLabel: 'History',
      icon: History,
      count: recentInvoices.length,
    },
  ];

  const sharedCustomerBridge: SharedCustomerBridge = useMemo(
    () => ({
      name: customer,
      mobile,
      onSetCustomer: (nextName: string, nextMobile: string) => {
        setCustomer(autoCapitalizeName(nextName || ''));
        setMobile((nextMobile || '').replace(/\D/g, '').slice(-10));
      },
      onClear: () => {
        setCustomer('');
        setMobile('');
        setSelectedCustomerObj(null);
      },
    }),
    [customer, mobile]
  );

  return (
    <div
      className="billing-page-container"
      onTouchStart={handleContainerTouchStart}
      onTouchMove={handleContainerTouchMove}
      onTouchEnd={handleContainerTouchEnd}
      onTouchCancel={clearSwipeGesture}
      style={{ position: 'relative', minHeight: '100%', touchAction: 'pan-y' }}
    >
      {/* Floating Swipe Preview Pill during active mobile drag */}
      {swipePreview.targetTab && Math.abs(swipePreview.offsetX) > 6 && (
        <div
          className="no-print md:hidden"
          style={{
            position: 'fixed',
            top: 66,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 105,
            background: '#05424A',
            color: '#ffffff',
            padding: '5px 12px',
            borderRadius: 99,
            fontSize: 11.5,
            fontWeight: 700,
            boxShadow: '0 6px 20px rgba(5, 66, 74, 0.35)',
            border: '1px solid rgba(234, 186, 56, 0.65)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <span>{swipePreview.direction === 'right' ? '←' : ''}</span>
          <span>{tabs.find((t) => t.id === swipePreview.targetTab)?.label}</span>
          <span>{swipePreview.direction === 'left' ? '→' : ''}</span>
        </div>
      )}

      {/* Segmented Navigation Tabs & Box Layout Switcher */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div ref={billingTabsListRef} className="billing-tabs" role="tablist" aria-label="Billing Views">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={(el) => { tabButtonRefs.current[tab.id] = el; }}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => handleSwitchTab(tab.id)}
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
      </div>

      {/* Mobile Swipe Navigation Bar (Dots indicator, current tab & quick arrows) */}
      <div className="mobile-tab-swipe-bar no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#05424A', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Sparkles size={12} color="#EABA38" />
            {tabs.find((t) => t.id === activeTab)?.label}
          </span>
          <span style={{ fontSize: 10, color: '#64748b' }}>
            ({TAB_ORDER.indexOf(activeTab) + 1}/4 · ⇄ Swipe)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* 4 Active Dots for visual swipe position */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {TAB_ORDER.map((t) => {
              const tabInfo = tabs.find((item) => item.id === t);
              return (
                <button
                  key={t}
                  type="button"
                  aria-label={`Switch to ${tabInfo?.label || t}`}
                  onClick={() => handleSwitchTab(t)}
                  style={{
                    width: activeTab === t ? 16 : 6,
                    height: 6,
                    padding: 0,
                    border: 'none',
                    borderRadius: 99,
                    background: activeTab === t ? '#05424A' : '#cbd5e1',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                  }}
                />
              );
            })}
          </div>

          {/* Prev / Next touch buttons */}
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              type="button"
              disabled={TAB_ORDER.indexOf(activeTab) === 0}
              onClick={() => {
                const idx = TAB_ORDER.indexOf(activeTab);
                if (idx > 0) handleSwitchTab(TAB_ORDER[idx - 1], 'right');
              }}
              className="swipe-nav-arrow-btn"
              title="Previous tab (Swipe Right)"
              aria-label="Previous tab"
            >
              ‹
            </button>
            <button
              type="button"
              disabled={TAB_ORDER.indexOf(activeTab) === TAB_ORDER.length - 1}
              onClick={() => {
                const idx = TAB_ORDER.indexOf(activeTab);
                if (idx < TAB_ORDER.length - 1) handleSwitchTab(TAB_ORDER[idx + 1], 'left');
              }}
              className="swipe-nav-arrow-btn"
              title="Next tab (Swipe Left)"
              aria-label="Next tab"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* Hidden printable receipt */}
      {printInv && (
        <div id="printable-receipt" style={{ display: 'none', maxWidth: 420, margin: '0 auto', fontFamily: "'Segoe UI', Arial, sans-serif", color: '#111' }}>
          {/* Official Logo */}
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <img
              src={SHREE_INVOICE_BILL_LOGO_BASE64}
              alt="Shree Beauty Studio"
              style={{ maxWidth: 210, width: '60%', height: 'auto', margin: '0 auto 6px', display: 'block' }}
            />
            <div style={{ fontSize: 11, color: '#4b5563', lineHeight: 1.45, maxWidth: 320, margin: '0 auto 3px' }}>
              {data?.settings?.address || '22, Radhika Society, Near Cancer Hospital, Katargam, Surat - 395004'}
            </div>
            <div style={{ fontSize: 11, color: '#4b5563', lineHeight: 1.4 }}>
              Email: shreebeauty.studio22@gmail.com
            </div>
            <div style={{ fontSize: 11, color: '#4b5563', lineHeight: 1.4 }}>
              Phone / WhatsApp: {data?.settings?.whatsapp ? `${data.settings.whatsapp}, ${data.settings?.phone2 || '9824183769'}` : '98241 83769'}
            </div>
          </div>

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
                <th style={{ border: '1.5px solid #222', padding: '6px 8px', fontSize: 11.5, fontWeight: 800, textAlign: 'center', verticalAlign: 'middle' }}>SERVICE</th>
                <th style={{ border: '1.5px solid #222', padding: '6px 4px', fontSize: 11.5, fontWeight: 800, textAlign: 'center', verticalAlign: 'middle', width: 45 }}>QTY</th>
                <th style={{ border: '1.5px solid #222', padding: '6px 6px', fontSize: 11.5, fontWeight: 800, textAlign: 'center', verticalAlign: 'middle', width: 65 }}>PRICE</th>
                <th style={{ border: '1.5px solid #222', padding: '6px 8px', fontSize: 11.5, fontWeight: 800, textAlign: 'center', verticalAlign: 'middle', width: 75 }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {printInv.lines.map((l, i) => {
                const discAmt = calcLineDiscount(l);
                const netAmt = calcLineTotal(l);
                return (
                  <tr key={i}>
                    <td style={{ border: '1.5px solid #222', padding: '6px 8px', fontSize: 12, fontWeight: 600, verticalAlign: 'middle' }}>
                      <div>{cleanServiceNameForBill(l.name)}</div>
                      {l.expiry && l.type === 'P' && (
                        <div style={{ fontSize: 9.5, color: '#475569', fontWeight: 600 }}>
                          Exp: {fmtExpiry(l.expiry)}{l.batch ? ` · Batch: ${l.batch}` : ''}
                        </div>
                      )}
                      {discAmt > 0 && <div style={{ fontSize: 9.5, color: '#16a34a' }}>(Disc: −₹{discAmt})</div>}
                    </td>
                    <td style={{ border: '1.5px solid #222', textAlign: 'center', verticalAlign: 'middle', padding: '6px 4px', fontSize: 12, fontWeight: 600 }}>{l.qty}</td>
                    <td style={{ border: '1.5px solid #222', textAlign: 'right', verticalAlign: 'middle', padding: '6px 6px', fontSize: 12, fontWeight: 600 }}>{Number(l.price).toLocaleString('en-IN')}</td>
                    <td style={{ border: '1.5px solid #222', textAlign: 'right', verticalAlign: 'middle', padding: '6px 8px', fontSize: 12.5, fontWeight: 800 }}>{netAmt.toLocaleString('en-IN')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Totals Summary */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #222', borderTop: 'none', marginBottom: 18 }}>
            <tbody>
              <tr>
                <td style={{ border: '1.5px solid #222', borderTop: 'none', padding: '6px 10px', fontSize: 12.5, fontWeight: 800, verticalAlign: 'middle' }}>Total</td>
                <td style={{ border: '1.5px solid #222', borderTop: 'none', padding: '6px 10px', fontSize: 13.5, fontWeight: 800, textAlign: 'right', verticalAlign: 'middle' }}>₹{Number(printInv.total || 0).toLocaleString('en-IN')}</td>
              </tr>
              {Number(printInv.advance || 0) > 0 && (
                <tr>
                  <td style={{ border: '1.5px solid #222', padding: '6px 10px', fontSize: 12.5, fontWeight: 800, verticalAlign: 'middle' }}>Advance</td>
                  <td style={{ border: '1.5px solid #222', padding: '6px 10px', fontSize: 13.5, fontWeight: 800, textAlign: 'right', verticalAlign: 'middle' }}>₹{Number(printInv.advance).toLocaleString('en-IN')}</td>
                </tr>
              )}
              <tr>
                <td style={{ border: '1.5px solid #222', padding: '6px 10px', fontSize: 12.5, fontWeight: 800, verticalAlign: 'middle' }}>{Number(printInv.balance || 0) > 0 ? 'Received / Paid' : 'Payment'}</td>
                <td style={{ border: '1.5px solid #222', padding: '6px 10px', fontSize: 13.5, fontWeight: 800, textAlign: 'right', verticalAlign: 'middle' }}>₹{(Number(printInv.paid || 0) > 0 ? Number(printInv.paid) : Number(printInv.total || 0) - Number(printInv.advance || 0)).toLocaleString('en-IN')}</td>
              </tr>
              {Number(printInv.balance || 0) > 0 && (
                <tr style={{ background: '#fff1f2' }}>
                  <td style={{ border: '1.5px solid #222', padding: '6px 10px', fontSize: 12.5, fontWeight: 800, color: '#dc2626', verticalAlign: 'middle' }}>Balance Due</td>
                  <td style={{ border: '1.5px solid #222', padding: '6px 10px', fontSize: 13.5, fontWeight: 800, textAlign: 'right', color: '#dc2626', verticalAlign: 'middle' }}>₹{Number(printInv.balance).toLocaleString('en-IN')}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Heartfelt Footer with 1-row space */}
          <div style={{ textAlign: 'center', marginTop: 22 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#111', marginBottom: 5 }}>Thank you for choosing us! 🙏</div>
            <div style={{ fontSize: 10.5, color: '#4b5563', lineHeight: 1.5, maxWidth: 300, margin: '0 auto' }}>
              We truly value your trust and hope your experience was wonderful !!
            </div>
          </div>

          {/* 35mm Trailing Feed Spacer for Thermal Auto-Cutting */}
          <div className="thermal-cut-feed" style={{ height: '35mm', minHeight: '35mm', width: '100%', clear: 'both' }}></div>
        </div>
      )}

      {/* Common Customer Name & Mobile Number Bar (Shared across Appointments, Bridal Booking & Billing POS) */}
      {activeTab !== 'history' && (
        <div
          className="card billing-builder-card billing-unified-card no-print"
          style={{
            padding: '12px 14px',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            background: '#ffffff',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
            marginBottom: 8,
          }}
        >
          <div
            className="billing-customer-grid"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div className="form-group" style={{ margin: 0, position: 'relative' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 2,
                  height: 20,
                }}
              >
                <label
                  className="label"
                  style={{
                    fontSize: 14.5,
                    fontWeight: 700,
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    color: '#1e293b',
                  }}
                >
                  <span>Customer Name</span>
                </label>
                <button
                  type="button"
                  onClick={handlePickDeviceContact}
                  title="Import contact from Android / iPhone"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: '#05424A',
                    background: '#E2F7F4',
                    border: '1px solid #7EDAD0',
                    borderRadius: 4,
                    padding: '2px 8px',
                    cursor: 'pointer',
                    lineHeight: 1.2,
                  }}
                >
                  <Smartphone size={13} />
                  <span>Import</span>
                </button>
              </div>
              <input
                type="text"
                name="billing_customer_name_no_pop"
                list="shared-cust-name-list"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                className="input"
                placeholder="Start typing name or contact…"
                value={customer}
                onBlur={() => {
                  setTimeout(() => {
                    autoMatchCustomerByName(customer, true);
                  }, 250);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    autoMatchCustomerByName(customer, true);
                  }
                }}
                onChange={(e) => handleCustomerSelect(autoCapitalizeName(e.target.value))}
                style={{
                  height: 42,
                  fontSize: 17.5,
                  borderRadius: 8,
                  padding: '0 12px',
                  border: '1.5px solid #cbd5e1',
                  textTransform: 'capitalize',
                  fontWeight: 600,
                }}
              />
              <datalist id="shared-cust-name-list">
                {(data?.customers || []).map((c) => (
                  <option key={c.id} value={`${formatCustomerContactName(c.name)} (${c.mobile})`}>
                    {formatCustomerContactName(c.name)} — 📞 {c.mobile}
                  </option>
                ))}
              </datalist>
            </div>

            <div className="form-group" style={{ margin: 0, position: 'relative' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: 2,
                  height: 24,
                }}
              >
                <label
                  className="label"
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    color: '#1e293b',
                  }}
                >
                  <span>Mobile Number</span>
                </label>
              </div>
              <input
                type="tel"
                inputMode="tel"
                name="billing_customer_mobile_no_pop"
                list="shared-cust-mob-list"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                className="input"
                placeholder="10-digit mobile number"
                value={mobile}
                onBlur={() => {
                  setTimeout(() => {
                    const clean = mobile.replace(/\D/g, '').slice(-10);
                    if (clean.length === 10) {
                      const c = (data?.customers || []).find(
                        (x) => x.mobile.replace(/\D/g, '').slice(-10) === clean
                      );
                      if (c) {
                        setSelectedCustomerObj(c);
                        if (!customer || customer.trim() === '') {
                          setCustomer(autoCapitalizeName(formatCustomerContactName(c.name)));
                        }
                      }
                    }
                  }, 250);
                }}
                onChange={(e) => handleMobileSelect(e.target.value)}
                style={{
                  height: 42,
                  fontSize: 17.5,
                  borderRadius: 8,
                  padding: '0 12px',
                  border: '1.5px solid #cbd5e1',
                  fontWeight: 600,
                }}
              />
              <datalist id="shared-cust-mob-list">
                {(data?.customers || []).map((c) => (
                  <option key={c.id} value={`${c.mobile} (${formatCustomerContactName(c.name)})`}>
                    {c.mobile} — 👤 {formatCustomerContactName(c.name)}
                  </option>
                ))}
              </datalist>

              {/* 24-Hour Free Customer Service Window Status */}
              {mobile.length === 10 && cust24hStatus.active ? (
                <div
                  style={{
                    marginTop: 2,
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: 9.5,
                  }}
                >
                  <span
                    style={{
                      color: '#16a34a',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      background: '#f0fdf4',
                      padding: '1px 5px',
                      borderRadius: 4,
                      border: '1px solid #bbf7d0',
                    }}
                    title={`Incoming message received. Meta Cloud API dispatch is ₹0 until ${cust24hStatus.expiresAt}`}
                  >
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                    🟢 24h Free ({cust24hStatus.formattedRemaining})
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Swipeable Tab Stage (Drag offset applied only here so fixed bars/modals stay anchored) */}
      <div
        className="billing-swipe-stage"
        style={
          swipePreview.offsetX !== 0
            ? { transform: `translateX(${swipePreview.offsetX}px)`, transition: 'none' }
            : undefined
        }
      >
        {/* 1. Appointments View */}
        {activeTab === 'appointments' && (
          <motion.div
            key="appointments"
            initial={{ opacity: 0, x: swipeDirection === 'left' ? 24 : -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{ marginTop: 2 }}
          >
            <AppointmentsPanel sharedCustomer={sharedCustomerBridge} viewMode="form" />
          </motion.div>
        )}

        {/* 2. Bridal Booking View */}
        {activeTab === 'bridal' && (
          <motion.div
            key="bridal"
            initial={{ opacity: 0, x: swipeDirection === 'left' ? 24 : -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{ marginTop: 2 }}
          >
            <BridalPanel sharedCustomer={sharedCustomerBridge} />
          </motion.div>
        )}

        {/* VIEW: Single Unified POS Builder or Full-width History */}
        {(activeTab === 'builder' || activeTab === 'history') && (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: swipeDirection === 'left' ? 24 : -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className={activeTab === 'history' ? '' : 'billing-layout'}
          >
          {/* 1. BUILDER MODE: Single Unified POS Box (2 Boxes Mixed Into 1) */}
          {activeTab === 'builder' && (
          <>
            <div
              className="card billing-builder-card billing-unified-card"
              style={{
                padding: '12px 14px',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                background: '#ffffff',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* If editing an invoice or linked appointment, show a compact pill/banner */}
              {(editingInvoiceId || appointmentRef) && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                    padding: '6px 10px',
                    background: editingInvoiceId ? '#eff6ff' : '#f0fdf4',
                    borderRadius: 8,
                    border: editingInvoiceId ? '1px solid #bfdbfe' : '1px solid #bbf7d0',
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700, color: editingInvoiceId ? '#1d4ed8' : '#15803d' }}>
                    {editingInvoiceId
                      ? `✎ Editing Invoice: ${data?.invoices?.find((i) => i.id === editingInvoiceId)?.no || ''}`
                      : `Appt: ${appointmentRef}`}
                  </span>
                  {editingInvoiceId && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={cancelEditInvoice}
                      style={{ fontSize: 11, padding: '2px 8px', height: 24, borderRadius: 6, color: '#dc2626' }}
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              )}



              {/* Barcode / Product Scanning Area (Clean Flat Row — No Outer Dashed Box) */}
              <div
                className="billing-barcode-container"
                style={{
                  display: 'flex',
                  gap: 6,
                  alignItems: 'center',
                  margin: '4px 0 8px',
                }}
              >
                <div
                  className="billing-barcode-input-row"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}
                >
                  <Barcode size={18} color="#05424A" style={{ flexShrink: 0 }} />
                  <input
                    type="text"
                    className="input billing-barcode-input"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      height: 42,
                      border: '1px solid #cbd5e1',
                      borderRadius: 7,
                      padding: '0 12px',
                      fontSize: 17,
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
                      height: 42,
                      padding: '0 14px',
                      fontSize: 16,
                      fontWeight: 700,
                      borderRadius: 7,
                    }}
                    onClick={() => handleScanBarcode()}
                  >
                    <span className="hide-on-mobile">Scan Item</span>
                    <span className="show-on-mobile">Scan</span>
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    style={{
                      height: 42,
                      padding: '0 12px',
                      fontSize: 16,
                      border: '1px solid #cbd5e1',
                      borderRadius: 7,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                    onClick={() => setCameraModalOpen(true)}
                  >
                    <Camera size={16} /> <span className="hide-on-mobile">Camera</span>
                  </button>

                  {/* 👑 Bridal Booking Import (Placed right next to Camera) */}
                  {data?.bridal && data.bridal.length > 0 && (
                    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                      <select
                        style={{
                          height: 42,
                          padding: '0 10px',
                          fontSize: 16,
                          fontWeight: 700,
                          border: '1.5px solid #f472b6',
                          background: '#fff1f2',
                          color: '#9d174d',
                          borderRadius: 7,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          maxWidth: 155,
                        }}
                        onChange={(e) => {
                          if (e.target.value === '__new__') {
                            handleSwitchTab('bridal', 'left');
                            e.target.value = '';
                            return;
                          }
                          const b = data.bridal?.find((x) => x.id === e.target.value);
                          if (b) {
                            handleImportBridal(b);
                            e.target.value = '';
                          }
                        }}
                        defaultValue=""
                        title="Load Bridal Booking into bill or create new"
                      >
                        <option value="" disabled>
                          👑 Bridal ({data.bridal.length})
                        </option>
                        <option value="__new__" style={{ fontWeight: 800, color: '#be185d', background: '#fdf2f8' }}>
                          ✨ + New Bridal Booking
                        </option>
                        {data.bridal.map((b) => {
                          const pPrice = resolveBridalBookingPrice(b, data?.bridalPackages, data?.services);
                          return (
                            <option key={b.id} value={b.id}>
                              {b.name} ({b.mobile || 'No mob'}) — {b.packageName || 'Bridal'} ({money(pPrice)})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}
                </div>
              </div>



              {/* Line Items Section */}
              <div style={{ marginBottom: 4, display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 6,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <label className="label" style={{ margin: 0, fontWeight: 800, fontSize: 12.5 }}>
                      Invoice Line Items
                    </label>
                    <span
                      style={{
                        fontSize: 10,
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {lines.some((l) => (l.name && l.name.trim() !== '') || Number(l.price || 0) > 0) && (
                      <button
                        type="button"
                        onClick={handleClearAllLines}
                        style={{
                          height: 26,
                          padding: '0 8px',
                          fontSize: 10.5,
                          fontWeight: 700,
                          borderRadius: 6,
                          border: '1px solid #fecdd3',
                          background: '#fff1f2',
                          color: '#e11d48',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                          cursor: 'pointer',
                        }}
                        title="Clear all item lines"
                      >
                        <Trash2 size={11} />
                        <span>Clear Items</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setLines((p) => [...p, EMPTY_LINE()])}
                      style={{
                        height: 26,
                        padding: '0 9px',
                        fontSize: 11,
                        fontWeight: 700,
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        background: '#f8fafc',
                        color: '#05424A',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        cursor: 'pointer',
                      }}
                    >
                      <Plus size={12} /> <span>Add Item</span>
                    </button>
                  </div>
                </div>

                {/* 1. Desktop & Tablet Grid Table */}
                <div className="billing-lines-desktop">
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: layoutOrientation === 'up-down' ? 'minmax(180px, 1fr) 58px 90px 105px 95px 32px' : 'minmax(140px, 2fr) 52px 80px 92px 84px 30px',
                      gap: 6,
                      padding: '7px 10px',
                      background: '#f1f5f9',
                      borderRadius: '8px 8px 0 0',
                      fontSize: 13.5,
                      fontWeight: 700,
                      color: '#475569',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      marginBottom: 4,
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

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 5,
                      maxHeight: 'calc(100vh - 360px)',
                      minHeight: '130px',
                      overflowY: 'auto',
                      paddingRight: 4,
                    }}
                  >
                    {lines.map((line, idx) => {
                      const buyInfo = getLineProductBuyInfo(line);
                      const isBelowBuy = buyInfo?.isBelowBuy;
                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: layoutOrientation === 'up-down' ? 'minmax(180px, 1fr) 58px 90px 105px 95px 32px' : 'minmax(140px, 2fr) 52px 80px 92px 84px 30px',
                            gap: 6,
                            alignItems: 'center',
                            background: isBelowBuy ? 'rgba(254, 242, 242, 0.75)' : 'transparent',
                            borderRadius: 6,
                            padding: isBelowBuy ? '3px 4px' : '0',
                            border: isBelowBuy ? '1.5px solid #fca5a5' : 'none',
                          }}
                        >
                        {/* Item Name + Type Badge */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <button
                              type="button"
                              className={`badge ${line.type === 'P' ? 'badge-blue' : 'badge-gold'}`}
                              style={{
                                cursor: 'pointer',
                                fontSize: 14,
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
                                height: 36,
                                fontSize: 15.5,
                                padding: '0 8px',
                                border: '1px solid #cbd5e1',
                                borderRadius: 6,
                              }}
                            />
                          </div>

                          {/* Live Inventory Stock & Expiry Pill for Products */}
                          {line.type === 'P' && line.name.trim() !== '' && (() => {
                            const p = allProducts.find(
                              (x) => x.name.toLowerCase() === line.name.trim().toLowerCase() || (x.barcode && x.barcode === line.barcode)
                            );
                            const buyInfo = getLineProductBuyInfo(line);
                            const stock = p?.stock ?? 0;
                            const isOutOfStock = stock <= 0;
                            const isLowStock = stock > 0 && stock <= (p?.low ?? 3);
                            const expDate = line.expiry || p?.expiry;
                            const isExpired = expDate ? expDate < todayISO() : false;

                            return (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, paddingLeft: 20, marginTop: 1, flexWrap: 'wrap' }}>
                                {/* Stock pill */}
                                <span
                                  style={{
                                    padding: '1px 5px',
                                    borderRadius: 4,
                                    fontWeight: 700,
                                    background: isOutOfStock ? '#fef2f2' : isLowStock ? '#fff7ed' : '#f0fdf4',
                                    color: isOutOfStock ? '#dc2626' : isLowStock ? '#c2410c' : '#15803d',
                                    border: `1px solid ${isOutOfStock ? '#fca5a5' : isLowStock ? '#fed7aa' : '#bbf7d0'}`,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 2,
                                  }}
                                  title={`Current Available Stock in Inventory: ${stock}`}
                                >
                                  📦 Stock: {stock}
                                  {isOutOfStock && ' (Nil/0)'}
                                  {stock > 0 && Number(line.qty) > stock && ' ⚠️ Exceeds'}
                                </span>

                                {/* Expiry pill */}
                                {expDate ? (
                                  <span
                                    style={{
                                      padding: '1px 5px',
                                      borderRadius: 4,
                                      fontWeight: 700,
                                      background: isExpired ? '#fef2f2' : '#f8fafc',
                                      color: isExpired ? '#dc2626' : '#05424A',
                                      border: `1px solid ${isExpired ? '#fca5a5' : '#cbd5e1'}`,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 2,
                                    }}
                                    title={isExpired ? '⚠️ Product is EXPIRED' : `Product Expiry: ${fmtExpiry(expDate)}`}
                                  >
                                    ⏳ Exp: {fmtExpiry(expDate)}
                                    {isExpired && ' (EXPIRED!)'}
                                  </span>
                                ) : (
                                  <span style={{ color: '#94a3b8', fontSize: 9.5 }}>No Expiry</span>
                                )}

                                {/* Batch selector if multiple batches */}
                                {p?.batches && p.batches.length > 1 ? (
                                  <select
                                    value={line.batch || ''}
                                    onChange={(e) => {
                                      const b = p.batches?.find((x) => (x.batch || x.id) === e.target.value);
                                      setLine(idx, {
                                        batch: b?.batch || b?.id,
                                        expiry: b?.expiry || line.expiry,
                                      });
                                    }}
                                    style={{
                                      height: 19,
                                      fontSize: 9.5,
                                      padding: '0 4px',
                                      borderRadius: 4,
                                      border: '1px solid #93c5fd',
                                      background: '#eff6ff',
                                      color: '#1d4ed8',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                    }}
                                    title="Choose Batch / Expiry Date (First Expiry First)"
                                  >
                                    <option value="">Select Batch/Exp</option>
                                    {p.batches
                                      .slice()
                                      .sort((a, b) => (a.expiry || '9999').localeCompare(b.expiry || '9999'))
                                      .map((b, bi) => (
                                        <option key={bi} value={b.batch || b.id}>
                                          {bi === 0 ? '⭐ [FIRST EXP] ' : ''}{b.batch ? `Lot ${b.batch}` : `B#${bi + 1}`}: {b.stock} pcs ({fmtExpiry(b.expiry)})
                                        </option>
                                      ))}
                                  </select>
                                ) : (
                                  (line.batch || p?.batch) && (
                                    <span style={{ color: '#64748b', fontSize: 9.5 }}>
                                      Lot: {line.batch || p?.batch}
                                    </span>
                                  )
                                )}

                                {/* 🔴 Red Warning: Buy Price > Net Selling Price */}
                                {buyInfo?.isBelowBuy && (
                                  <span
                                    style={{
                                      padding: '1.5px 6px',
                                      borderRadius: 4,
                                      fontWeight: 800,
                                      background: '#fee2e2',
                                      color: '#b91c1c',
                                      border: '1.5px solid #ef4444',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 3,
                                      fontSize: 10,
                                    }}
                                    title={`Cannot sell below buy price! Buy Rate: ₹${buyInfo.buyPrice}, Net Sell Rate: ₹${buyInfo.unitNet.toFixed(1)}`}
                                  >
                                    🚨 BELOW BUY PRICE (Buy: {money(buyInfo.buyPrice)} &gt; Net: {money(buyInfo.unitNet)} | Loss: -{money(buyInfo.lossPerUnit)}/pc) — DO NOT SELL
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Qty Up-Down Box */}
                        <div
                          className="qty-up-down-box"
                          style={{
                            height: 36,
                            position: 'relative',
                          }}
                        >
                          <input
                            type="number"
                            min={1}
                            className="input"
                            title="Quantity (Type or use Up/Down arrows)"
                            placeholder="Qty"
                            value={line.qty}
                            onChange={(e) =>
                              setLine(idx, { qty: Math.max(1, Number(e.target.value) || 1) })
                            }
                            onKeyDown={(e) => handleLineKeyDown(e, idx)}
                            style={{
                              textAlign: 'center',
                              height: '100%',
                              width: '100%',
                              fontSize: 15.5,
                              fontWeight: 700,
                              padding: '0 16px 0 2px',
                              border: 'none',
                              background: 'transparent',
                              boxShadow: 'none',
                            }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              right: 0,
                              top: 0,
                              bottom: 0,
                              width: 16,
                              display: 'flex',
                              flexDirection: 'column',
                              borderLeft: '1px solid #e2e8f0',
                              background: '#f8fafc',
                            }}
                          >
                            <button
                              type="button"
                              tabIndex={-1}
                              title="Increase (+1)"
                              onClick={() => setLine(idx, { qty: (Number(line.qty) || 1) + 1 })}
                              style={{
                                flex: 1,
                                border: 'none',
                                background: 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                padding: 0,
                                color: '#475569',
                                borderBottom: '1px solid #e2e8f0',
                              }}
                            >
                              <ChevronUp size={10} strokeWidth={2.5} />
                            </button>
                            <button
                              type="button"
                              tabIndex={-1}
                              title="Decrease (-1)"
                              onClick={() => setLine(idx, { qty: Math.max(1, (Number(line.qty) || 1) - 1) })}
                              style={{
                                flex: 1,
                                border: 'none',
                                background: 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                padding: 0,
                                color: '#475569',
                              }}
                            >
                              <ChevronDown size={10} strokeWidth={2.5} />
                            </button>
                          </div>
                        </div>

                        {/* Price */}
                        {(() => {
                          const buyInfo = getLineProductBuyInfo(line);
                          const isLoss = buyInfo?.isBelowBuy;
                          return (
                            <input
                              type="number"
                              min={0}
                              className="input"
                              title={isLoss ? `🚨 Cannot sell below buy price (${money(buyInfo!.buyPrice)})!` : "Rate (₹)"}
                              placeholder="0"
                              value={line.price || ''}
                              onChange={(e) =>
                                setLine(idx, { price: Number(e.target.value) || 0 })
                              }
                              onKeyDown={(e) => handleLineKeyDown(e, idx)}
                              style={{
                                textAlign: 'right',
                                height: 36,
                                fontSize: 15.5,
                                padding: '0 6px',
                                border: isLoss ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                                background: isLoss ? '#fef2f2' : '#ffffff',
                                color: isLoss ? '#dc2626' : 'inherit',
                                fontWeight: isLoss ? 800 : 400,
                                borderRadius: 6,
                              }}
                            />
                          );
                        })()}

                        {/* Item Discount Input + Unit Toggle (₹ or %) */}
                        {(() => {
                          const buyInfo = getLineProductBuyInfo(line);
                          const isLoss = buyInfo?.isBelowBuy;
                          return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <input
                                type="number"
                                min={0}
                                className="input"
                                title={
                                  isLoss
                                    ? `🚨 Discount brings net price (${money(buyInfo!.unitNet)}) below buy price (${money(buyInfo!.buyPrice)})! Loss: -${money(buyInfo!.lossPerUnit)}/pc`
                                    : "Discount on this item"
                                }
                                placeholder="0"
                                value={line.discount || ''}
                                onChange={(e) =>
                                  setLine(idx, { discount: Number(e.target.value) || 0 })
                                }
                                onKeyDown={(e) => handleLineKeyDown(e, idx)}
                                style={{
                                  textAlign: 'right',
                                  height: 36,
                                  fontSize: 15.5,
                                  padding: '0 4px',
                                  border: isLoss ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                                  background: isLoss ? '#fef2f2' : '#ffffff',
                                  borderRadius: 6,
                                  color: isLoss ? '#dc2626' : (Number(line.discount || 0) > 0 ? '#16a34a' : 'inherit'),
                                  fontWeight: 700,
                                }}
                              />
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                style={{
                                  padding: 0,
                                  width: 26,
                                  height: 36,
                                  fontSize: 13,
                                  fontWeight: 700,
                                  borderRadius: 5,
                                  color: isLoss ? '#dc2626' : ((line.discountType || '%') === '%' ? '#2563eb' : '#05424A'),
                                  background:
                                    isLoss ? '#fee2e2' : ((line.discountType || '%') === '%' ? '#eff6ff' : '#f0fdf4'),
                                  border: isLoss ? '1px solid #fca5a5' : '1px solid #cbd5e1',
                                  flexShrink: 0,
                                }}
                                title={`Toggle Discount Unit: currently ${line.discountType || '%'}`}
                                onClick={() =>
                                  setLine(idx, {
                                    discountType: (line.discountType || '%') === '%' ? '₹' : '%',
                                  })
                                }
                              >
                                {line.discountType || '%'}
                              </button>
                            </div>
                          );
                        })()}

                        {/* Line Net Total */}
                        {(() => {
                          const buyInfo = getLineProductBuyInfo(line);
                          const isLoss = buyInfo?.isBelowBuy;
                          return (
                            <div style={{ textAlign: 'right', paddingRight: 3 }}>
                              <span
                                style={{
                                  fontSize: 16,
                                  fontWeight: 800,
                                  color: isLoss ? '#dc2626' : '#0f172a',
                                  background: isLoss ? '#fee2e2' : 'transparent',
                                  padding: isLoss ? '1px 5px' : '0',
                                  borderRadius: 4,
                                  display: 'inline-block',
                                }}
                              >
                                {money(calcLineTotal(line))}
                              </span>
                              {isLoss && (
                                <span
                                  style={{
                                    display: 'block',
                                    fontSize: 8.5,
                                    fontWeight: 800,
                                    color: '#b91c1c',
                                    lineHeight: 1.1,
                                    marginTop: 1,
                                    letterSpacing: -0.2,
                                  }}
                                  title={`Buy Price: ₹${buyInfo!.buyPrice}. Loss: -₹${buyInfo!.lossPerUnit.toFixed(1)}/pc`}
                                >
                                  ⛔ BELOW BUY ({money(buyInfo!.buyPrice)})
                                </span>
                              )}
                            </div>
                          );
                        })()}

                        {/* Delete Line */}
                        <button
                          type="button"
                          className="btn-icon danger"
                          style={{
                            width: 30,
                            height: 30,
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
                          <Trash2 size={15} />
                        </button>
                      </div>
                    );
                  })}
                  </div>
                </div>

                {/* 2. Mobile Responsive Cards View */}
                <div className="billing-lines-mobile" style={{ maxHeight: '260px', overflowY: 'auto' }}>
                  {lines.map((line, idx) => {
                    const buyInfo = getLineProductBuyInfo(line);
                    const isBelowBuy = buyInfo?.isBelowBuy;
                    return (
                      <div
                        key={idx}
                        style={{
                          background: isBelowBuy ? '#fff7f7' : '#ffffff',
                          border: isBelowBuy ? '1.5px solid #ef4444' : '1px solid #e2e8f0',
                          borderRadius: 7,
                          padding: '5px 7px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                          boxShadow: isBelowBuy ? '0 1px 4px rgba(239, 68, 68, 0.15)' : '0 1px 2px rgba(0,0,0,0.02)',
                        }}
                      >
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button
                          type="button"
                          className={`badge ${line.type === 'P' ? 'badge-blue' : 'badge-gold'}`}
                          style={{
                            fontSize: 16,
                            padding: '0 6px',
                            border: 'none',
                            borderRadius: 7,
                            flexShrink: 0,
                            height: 42,
                            width: 40,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
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
                          style={{ flex: 1, height: 42, fontSize: 17.5, padding: '0 10px', borderRadius: 8 }}
                        />
                        <button
                          type="button"
                          className="btn-icon danger"
                          style={{ width: 40, height: 42, borderRadius: 7, flexShrink: 0 }}
                          onClick={() =>
                            setLines((p) => {
                              const remaining = p.filter((_, i) => i !== idx);
                              return remaining.length === 0 ? [EMPTY_LINE()] : remaining;
                            })
                          }
                          disabled={lines.length === 1 && !lines[0].name}
                          title="Remove item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Live Inventory Stock & Expiry Pill for Products (Mobile) */}
                      {line.type === 'P' && line.name.trim() !== '' && (() => {
                        const p = allProducts.find(
                          (x) => x.name.toLowerCase() === line.name.trim().toLowerCase() || (x.barcode && x.barcode === line.barcode)
                        );
                        const buyInfo = getLineProductBuyInfo(line);
                        const stock = p?.stock ?? 0;
                        const isOutOfStock = stock <= 0;
                        const isLowStock = stock > 0 && stock <= (p?.low ?? 3);
                        const expDate = line.expiry || p?.expiry;
                        const isExpired = expDate ? expDate < todayISO() : false;

                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9.5, flexWrap: 'wrap' }}>
                            <span
                              style={{
                                padding: '1px 4px',
                                borderRadius: 4,
                                fontWeight: 700,
                                background: isOutOfStock ? '#fef2f2' : isLowStock ? '#fff7ed' : '#f0fdf4',
                                color: isOutOfStock ? '#dc2626' : isLowStock ? '#c2410c' : '#15803d',
                                border: `1px solid ${isOutOfStock ? '#fca5a5' : isLowStock ? '#fed7aa' : '#bbf7d0'}`,
                              }}
                            >
                              📦 Stock: {stock}
                              {isOutOfStock && ' (Nil/0)'}
                              {stock > 0 && Number(line.qty) > stock && ' ⚠️ Exceeds'}
                            </span>
                            {expDate && (
                              <span
                                style={{
                                  padding: '1px 4px',
                                  borderRadius: 4,
                                  fontWeight: 700,
                                  background: isExpired ? '#fef2f2' : '#f8fafc',
                                  color: isExpired ? '#dc2626' : '#05424A',
                                  border: `1px solid ${isExpired ? '#fca5a5' : '#cbd5e1'}`,
                                }}
                              >
                                ⏳ Exp: {fmtExpiry(expDate)}
                                {isExpired && ' (EXPIRED!)'}
                              </span>
                            )}
                            {p?.batches && p.batches.length > 1 ? (
                              <select
                                value={line.batch || ''}
                                onChange={(e) => {
                                  const b = p.batches?.find((x) => (x.batch || x.id) === e.target.value);
                                  setLine(idx, {
                                    batch: b?.batch || b?.id,
                                    expiry: b?.expiry || line.expiry,
                                  });
                                }}
                                style={{
                                  height: 19,
                                  fontSize: 9.5,
                                  padding: '0 4px',
                                  borderRadius: 4,
                                  border: '1px solid #93c5fd',
                                  background: '#eff6ff',
                                  color: '#1d4ed8',
                                  fontWeight: 700,
                                }}
                              >
                                <option value="">Select Batch/Exp</option>
                                {p.batches
                                  .slice()
                                  .sort((a, b) => (a.expiry || '9999').localeCompare(b.expiry || '9999'))
                                  .map((b, bi) => (
                                    <option key={bi} value={b.batch || b.id}>
                                      {bi === 0 ? '⭐ [FIRST EXP] ' : ''}{b.batch ? `Lot ${b.batch}` : `B#${bi + 1}`}: {b.stock} pcs ({fmtExpiry(b.expiry)})
                                    </option>
                                  ))}
                              </select>
                            ) : null}

                            {/* 🔴 Red Loss Alert */}
                            {buyInfo?.isBelowBuy && (
                              <span
                                style={{
                                  padding: '1px 5px',
                                  borderRadius: 4,
                                  fontWeight: 800,
                                  background: '#fee2e2',
                                  color: '#b91c1c',
                                  border: '1.5px solid #ef4444',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 2,
                                  fontSize: 9.5,
                                }}
                                title={`Cannot sell below buy price! Buy Rate: ₹${buyInfo.buyPrice}, Net Sell Rate: ₹${buyInfo.unitNet.toFixed(1)}`}
                              >
                                🚨 BELOW BUY PRICE (Buy: {money(buyInfo.buyPrice)} &gt; Net: {money(buyInfo.unitNet)} | Loss: -{money(buyInfo.lossPerUnit)}/pc)
                              </span>
                            )}
                          </div>
                        );
                      })()}

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '62px 82px 1fr auto',
                          gap: 6,
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <span style={{ fontSize: 11, color: '#64748b', display: 'block', fontWeight: 700, marginBottom: 2 }}>
                            QTY
                          </span>
                          <div
                            className="qty-up-down-box"
                            style={{
                              height: 36,
                              position: 'relative',
                            }}
                          >
                            <input
                              type="number"
                              min={1}
                              className="input"
                              value={line.qty}
                              onChange={(e) =>
                                setLine(idx, { qty: Math.max(1, Number(e.target.value) || 1) })
                              }
                              onKeyDown={(e) => handleLineKeyDown(e, idx)}
                              style={{
                                textAlign: 'center',
                                height: '100%',
                                width: '100%',
                                fontSize: 17,
                                fontWeight: 800,
                                padding: '0 16px 0 2px',
                                border: 'none',
                                background: 'transparent',
                                boxShadow: 'none',
                              }}
                            />
                            <div
                              style={{
                                position: 'absolute',
                                right: 0,
                                top: 0,
                                bottom: 0,
                                width: 16,
                                display: 'flex',
                                flexDirection: 'column',
                                borderLeft: '1px solid #e2e8f0',
                                background: '#f8fafc',
                              }}
                            >
                              <button
                                type="button"
                                tabIndex={-1}
                                title="Increase (+1)"
                                onClick={() => setLine(idx, { qty: (Number(line.qty) || 1) + 1 })}
                                style={{
                                  flex: 1,
                                  border: 'none',
                                  background: 'transparent',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  padding: 0,
                                  color: '#475569',
                                  borderBottom: '1px solid #e2e8f0',
                                }}
                              >
                                <ChevronUp size={10} strokeWidth={2.5} />
                              </button>
                              <button
                                type="button"
                                tabIndex={-1}
                                title="Decrease (-1)"
                                onClick={() => setLine(idx, { qty: Math.max(1, (Number(line.qty) || 1) - 1) })}
                                style={{
                                  flex: 1,
                                  border: 'none',
                                  background: 'transparent',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  padding: 0,
                                  color: '#475569',
                                }}
                              >
                                <ChevronDown size={10} strokeWidth={2.5} />
                              </button>
                            </div>
                          </div>
                        </div>
                        {(() => {
                          const buyInfo = getLineProductBuyInfo(line);
                          const isLoss = buyInfo?.isBelowBuy;
                          return (
                            <>
                              <div>
                                <span style={{ fontSize: 11, color: isLoss ? '#dc2626' : '#64748b', display: 'block', fontWeight: 700, marginBottom: 2 }}>
                                  RATE (₹)
                                </span>
                                <input
                                  type="number"
                                  min={0}
                                  className="input"
                                  placeholder="0"
                                  title={isLoss ? `🚨 Cannot sell below buy price (${money(buyInfo!.buyPrice)})!` : "Rate (₹)"}
                                  value={line.price || ''}
                                  onChange={(e) => setLine(idx, { price: Number(e.target.value) || 0 })}
                                  onKeyDown={(e) => handleLineKeyDown(e, idx)}
                                  style={{
                                    textAlign: 'right',
                                    height: 36,
                                    fontSize: 17,
                                    padding: '0 6px',
                                    border: isLoss ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                                    background: isLoss ? '#fef2f2' : '#ffffff',
                                    color: isLoss ? '#dc2626' : 'inherit',
                                    fontWeight: isLoss ? 800 : 600,
                                  }}
                                />
                              </div>
                              <div>
                                <span style={{ fontSize: 11, color: isLoss ? '#dc2626' : '#64748b', display: 'block', fontWeight: 700, marginBottom: 2 }}>
                                  DISCOUNT
                                </span>
                                <div style={{ display: 'flex', gap: 2 }}>
                                  <input
                                    type="number"
                                    min={0}
                                    className="input"
                                    placeholder="0"
                                    title={isLoss ? `🚨 Net price (${money(buyInfo!.unitNet)}) is below buy price (${money(buyInfo!.buyPrice)})!` : "Discount"}
                                    value={line.discount || ''}
                                    onChange={(e) =>
                                      setLine(idx, { discount: Number(e.target.value) || 0 })
                                    }
                                    onKeyDown={(e) => handleLineKeyDown(e, idx)}
                                    style={{
                                      textAlign: 'right',
                                      height: 36,
                                      fontSize: 17,
                                      padding: '0 6px',
                                      flex: 1,
                                      minWidth: 0,
                                      border: isLoss ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                                      background: isLoss ? '#fef2f2' : '#ffffff',
                                      color: isLoss ? '#dc2626' : (Number(line.discount || 0) > 0 ? '#16a34a' : 'inherit'),
                                      fontWeight: 700,
                                    }}
                                  />
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    style={{
                                      padding: 0,
                                      width: 28,
                                      height: 36,
                                      fontSize: 15,
                                      fontWeight: 800,
                                      borderRadius: 4,
                                      color: isLoss ? '#dc2626' : ((line.discountType || '%') === '%' ? '#2563eb' : '#05424A'),
                                      background: isLoss ? '#fee2e2' : ((line.discountType || '%') === '%' ? '#eff6ff' : '#f0fdf4'),
                                      border: isLoss ? '1px solid #fca5a5' : '1px solid #cbd5e1',
                                    }}
                                    onClick={() =>
                                      setLine(idx, {
                                        discountType: (line.discountType || '%') === '%' ? '₹' : '%',
                                      })
                                    }
                                  >
                                    {line.discountType || '%'}
                                  </button>
                                </div>
                              </div>
                              <div style={{ textAlign: 'right', minWidth: 60 }}>
                                <span style={{ fontSize: 11, color: isLoss ? '#dc2626' : '#64748b', display: 'block', fontWeight: 700, marginBottom: 2 }}>
                                  TOTAL
                                </span>
                                <span
                                  style={{
                                    fontSize: 17.5,
                                    fontWeight: 900,
                                    color: isLoss ? '#dc2626' : '#0f172a',
                                    background: isLoss ? '#fee2e2' : 'transparent',
                                    padding: isLoss ? '1px 4px' : '0',
                                    borderRadius: 4,
                                    display: 'inline-block',
                                  }}
                                >
                                  {money(calcLineTotal(line))}
                                </span>
                                {isLoss && (
                                  <span
                                    style={{
                                      display: 'block',
                                      fontSize: 8.5,
                                      fontWeight: 800,
                                      color: '#b91c1c',
                                      lineHeight: 1.1,
                                      marginTop: 1,
                                    }}
                                  >
                                    ⛔ BELOW
                                  </span>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
                </div>

                <datalist id="billing-items-list">
                  {allItems.map((item, i) => (
                    <option key={i} value={item.name}>
                      {item.label}
                    </option>
                  ))}
                </datalist>
              </div>

              {/* ─── Integrated Settlement Section ─── */}
              <div id="billing-checkout-section" style={{ marginTop: 4 }}>

              {/* Loyalty & Wallet Banner */}
              {selectedCustomerObj &&
                (data?.settings?.loyaltyEnabled || data?.settings?.walletEnabled) && (
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      flexWrap: 'wrap',
                      background: 'linear-gradient(135deg, #05424a10, #eaba3815)',
                      border: '1px solid #05424A',
                      borderRadius: 8,
                      padding: '5px 8px',
                      marginBottom: 8,
                      alignItems: 'center',
                    }}
                  >
                    <Sparkles size={13} color="#05424A" />
                    <span style={{ fontWeight: 700, fontSize: 11.5, color: '#05424A', flex: 1 }}>
                      {selectedCustomerObj.name}
                    </span>
                    {data?.settings?.loyaltyEnabled && (
                      <span
                        style={{
                          fontSize: 10.5,
                          background: '#eaba3825',
                          borderRadius: 5,
                          padding: '1.5px 5px',
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
                          fontSize: 10.5,
                          background: '#05424a15',
                          borderRadius: 5,
                          padding: '1.5px 5px',
                          fontWeight: 700,
                          color: '#05424A',
                        }}
                      >
                        💳 Wallet: {money(selectedCustomerObj.walletBalance || 0)}
                      </span>
                    )}
                  </div>
                )}

              {/* Checkout Two-Column Grid (Active in Up & Down Layout) */}
              <div className="billing-checkout-grid">
                {/* Total Payable (Clean Display, No Box) */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                    margin: '4px 0 2px',
                    padding: '2px 4px',
                  }}
                >
                  {/* Conditional Discounts/Advance/Loyalty/Wallet badges if active */}
                  {totalAllDiscount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#16a34a', fontWeight: 600 }}>
                      <span>Discounts:</span>
                      <span>−{money(totalAllDiscount)}</span>
                    </div>
                  )}
                  {pointsDiscountAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#16a34a', fontWeight: 600 }}>
                      <span>Redeemed Points:</span>
                      <span>−{money(pointsDiscountAmount)}</span>
                    </div>
                  )}
                  {Number(useWallet || 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#15803d', fontWeight: 600 }}>
                      <span>Paid from Wallet:</span>
                      <span>−{money(Number(useWallet || 0))}</span>
                    </div>
                  )}
                  {advance > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#05424A', fontWeight: 600 }}>
                      <span>Advance Deducted:</span>
                      <span>−{money(advance)}</span>
                    </div>
                  )}

                  {/* Clean Total Display Row (No Box, Just Clean Prominent Total) */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '4px 0',
                    }}
                  >
                    <span style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                      Total Payable:
                    </span>

                    {isEditingFinalPayable ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 16, fontWeight: 900, color: '#05424A' }}>₹</span>
                        <input
                          type="number"
                          step="1"
                          min={0}
                          autoFocus
                          className="input"
                          placeholder="Final Price"
                          value={Math.max(0, totalAfterLoyalty - Number(advance || 0))}
                          onChange={(e) => {
                            const targetFinal = Math.max(0, Number(e.target.value) || 0);
                            const base = Math.max(0, discounted - pointsDiscountAmount - Number(useWallet || 0) - Number(advance || 0));
                            const diff = Number((targetFinal - base).toFixed(2));
                            setIsManualRoundOff(true);
                            setAutoRoundOff(false);
                            if (diff >= 0) {
                              setCustomRoundOffSign('+');
                              setCustomRoundOffValue(diff);
                            } else {
                              setCustomRoundOffSign('-');
                              setCustomRoundOffValue(Math.abs(diff));
                            }
                          }}
                          style={{
                            height: 36,
                            width: 105,
                            textAlign: 'right',
                            fontSize: 18,
                            fontWeight: 900,
                            color: '#05424A',
                            border: '2px solid #05424A',
                            borderRadius: 7,
                            padding: '0 6px',
                            background: '#f0fdfa',
                          }}
                        />
                      </div>
                    ) : (
                      <span
                        style={{ fontSize: 24, fontWeight: 900, color: '#05424A', cursor: 'pointer' }}
                        title="Click to edit final payable price directly"
                        onClick={() => setIsEditingFinalPayable(true)}
                      >
                        {money(totalAfterLoyalty - Number(advance || 0))}
                      </span>
                    )}
                  </div>
                </div>

              {/* Lower Section: Payment Method, Settlement & Actions (Up & Down Layout) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                {/* Payment Section (Split or Single Method) */}
                <div
                  style={{
                    marginTop: 0,
                    background: '#ffffff',
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  {/* Mixed Header & Status Row (2 Rows Mixed Into 1) */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 8,
                      flexWrap: 'wrap',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 15.5, fontWeight: 800, color: '#1e293b' }}>
                        Payment Method
                      </span>
                      <span
                        style={{
                          fontSize: 14.5,
                          fontWeight: 700,
                          color: balance > 0 ? '#dc2626' : '#16a34a',
                          background: balance > 0 ? '#fee2e2' : '#f0fdf4',
                          border: balance > 0 ? '1px solid #fca5a5' : '1px solid #bbf7d0',
                          padding: '2px 8px',
                          borderRadius: 5,
                        }}
                      >
                        {balance > 0 ? `Due: ${money(balance)}` : `Status: ₹0.00`}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <label
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          cursor: 'pointer',
                          userSelect: 'none',
                          fontSize: 14.5,
                          fontWeight: 700,
                          color: balance === 0 ? '#16a34a' : '#05424A',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={balance === 0 && effectivePaid > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleSetFullPayment();
                            } else {
                              if (isSplitPayment) {
                                setSplitCash('');
                                setSplitUpi('');
                                setSplitCard('');
                              } else {
                                setPaid('');
                              }
                            }
                          }}
                          style={{ accentColor: '#16a34a', cursor: 'pointer', width: 17, height: 17 }}
                        />
                        <span>Fully Paid</span>
                      </label>

                      {/* Split Payment Checkbox Toggle */}
                      <label
                        style={{
                          fontSize: 14.5,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          cursor: 'pointer',
                          color: isSplitPayment ? '#05424A' : '#64748b',
                          fontWeight: 600,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSplitPayment}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setIsSplitPayment(checked);
                            setSplitCash('');
                            setSplitUpi('');
                            setSplitCard('');
                            if (!checked) {
                              setPaid(Math.max(0, totalAfterLoyalty - Number(advance || 0)));
                            }
                          }}
                          style={{ accentColor: '#05424A', width: 17, height: 17, cursor: 'pointer' }}
                        />
                        <span>🔀 Split Payment</span>
                      </label>
                    </div>
                  </div>

                  {isSplitPayment ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                          <label style={{ fontSize: 14, color: '#64748b', fontWeight: 700 }}>
                            Cash (₹)
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const remaining = Math.max(0, (totalAfterLoyalty - Number(advance || 0)) - Number(splitUpi || 0) - Number(splitCard || 0));
                              setSplitCash(remaining);
                            }}
                            title="Fill remaining into Cash"
                            style={{ fontSize: 13, padding: '2px 8px', borderRadius: 4, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', color: '#05424A', fontWeight: 700 }}
                          >
                            Fill
                          </button>
                        </div>
                        <input
                          type="number"
                          min={0}
                          className="input"
                          placeholder="0"
                          value={splitCash}
                          onChange={(e) => setSplitCash(Number(e.target.value) || '')}
                          style={{ padding: '0 8px', height: 42, fontSize: 17.5, fontWeight: 700, borderRadius: 8, border: '1.5px solid #cbd5e1' }}
                        />
                      </div>
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 2,
                          }}
                        >
                          <select
                            value={splitUpiMode}
                            onChange={(e) => setSplitUpiMode(e.target.value)}
                            style={{
                              fontSize: 13.5,
                              padding: '2px 6px',
                              borderRadius: 4,
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              fontWeight: 700,
                            }}
                          >
                            {getUpiOrOnlinePaymentOptions(data?.settings?.payments, [splitUpiMode]).map((p) => (
                              <option key={p} value={p}>
                                {p} (₹)
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              const remaining = Math.max(0, (totalAfterLoyalty - Number(advance || 0)) - Number(splitCash || 0) - Number(splitCard || 0));
                              setSplitUpi(remaining);
                            }}
                            title="Fill remaining into UPI"
                            style={{ fontSize: 13, padding: '2px 8px', borderRadius: 4, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', color: '#05424A', fontWeight: 700 }}
                          >
                            Fill
                          </button>
                        </div>
                        <input
                          type="number"
                          min={0}
                          className="input"
                          placeholder="0"
                          value={splitUpi}
                          onChange={(e) => setSplitUpi(Number(e.target.value) || '')}
                          style={{ padding: '0 8px', height: 42, fontSize: 17.5, fontWeight: 700, borderRadius: 8, border: '1.5px solid #cbd5e1' }}
                        />
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                          <label style={{ fontSize: 14, color: '#64748b', fontWeight: 700 }}>
                            Card (₹)
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const remaining = Math.max(0, (totalAfterLoyalty - Number(advance || 0)) - Number(splitCash || 0) - Number(splitUpi || 0));
                              setSplitCard(remaining);
                            }}
                            title="Fill remaining into Card"
                            style={{ fontSize: 13, padding: '2px 8px', borderRadius: 4, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', color: '#05424A', fontWeight: 700 }}
                          >
                            Fill
                          </button>
                        </div>
                        <input
                          type="number"
                          min={0}
                          className="input"
                          placeholder="0"
                          value={splitCard}
                          onChange={(e) => setSplitCard(Number(e.target.value) || '')}
                          style={{ padding: '0 8px', height: 42, fontSize: 17.5, fontWeight: 700, borderRadius: 8, border: '1.5px solid #cbd5e1' }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <select
                          value={mode}
                          onChange={(e) => setMode(e.target.value)}
                          style={{
                            flex: 1,
                            height: 42,
                            fontSize: 17.5,
                            fontWeight: 700,
                            padding: '0 10px',
                            borderRadius: 8,
                            border: '1.5px solid #cbd5e1',
                            background: '#ffffff',
                            color: '#0f172a',
                          }}
                        >
                          {getPaymentOptions(data?.settings?.payments, editingInvoiceId ? [mode] : undefined).map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                        <div style={{ width: 150, position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <span
                            style={{
                              position: 'absolute',
                              left: 8,
                              fontSize: 14,
                              fontWeight: 800,
                              color: '#64748b',
                              pointerEvents: 'none',
                            }}
                          >
                            ₹
                          </span>
                          <input
                            type="number"
                            min={0}
                            className="input"
                            placeholder="0"
                            value={paid}
                            onChange={(e) => setPaid(Number(e.target.value) || '')}
                            style={{
                              textAlign: 'right',
                              height: 42,
                              fontSize: 17.5,
                              fontWeight: 800,
                              padding: '0 8px 0 22px',
                              width: '100%',
                              borderRadius: 8,
                              border: '1.5px solid #cbd5e1',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>


              </div>

              {/* Below Buy Price Loss Alert Banner */}
              {hasBelowBuyLines && (
                <div
                  style={{
                    marginTop: 8,
                    marginBottom: 4,
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: '#fef2f2',
                    border: '1.5px solid #ef4444',
                    color: '#991b1b',
                    fontSize: 11.5,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 18 }}>⛔</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#b91c1c', fontWeight: 800 }}>
                      PRODUCT NOT SELL — BELOW BUY PRICE
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 500, color: '#991b1b', marginTop: 2 }}>
                      {belowBuyLinesList.length} item(s) are selling below purchase cost. Adjust discount or rate to proceed.
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{
                    padding: '0 16px',
                    height: 46,
                    fontSize: 17,
                    fontWeight: 700,
                    borderRadius: 8,
                    color: '#e11d48',
                    borderColor: '#fecdd3',
                    background: '#fff1f2',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                  onClick={editingInvoiceId ? cancelEditInvoice : handleAllClearInvoice}
                  title={editingInvoiceId ? 'Cancel editing invoice' : 'Clear all fields & reset invoice (All Clear)'}
                >
                  <RotateCcw size={17} />
                  <span>{editingInvoiceId ? 'Cancel Edit' : 'All Clear'}</span>
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{
                    flex: 1,
                    height: 46,
                    padding: '10px 18px',
                    fontSize: 18,
                    fontWeight: 800,
                    borderRadius: 8,
                    cursor: 'pointer',
                    background: hasBelowBuyLines ? '#dc2626' : 'linear-gradient(135deg, #05424A 0%, #0a6572 100%)',
                    boxShadow: hasBelowBuyLines ? '0 2px 8px rgba(220, 38, 38, 0.3)' : '0 2px 8px rgba(5, 66, 74, 0.25)',
                  }}
                  onClick={handleSave}
                  title={hasBelowBuyLines ? 'Cannot sell: Item marked in red is below purchase price!' : 'Save invoice and print receipt (Ctrl+Enter)'}
                >
                  <Printer size={19} />{' '}
                  <span>
                    {hasBelowBuyLines
                      ? '⛔ Below Buy Price — Cannot Sell'
                      : editingInvoiceId
                      ? 'Update Invoice & Print'
                      : 'Generate & Save Bill (Ctrl+Enter)'}
                  </span>
                </button>
              </div>
              </div>
            </div>
            {/* End billing-checkout-section */}
          </div>
          {/* End billing-unified-card */}
          </>
        )}

        {/* 2. Invoice Receipts History & Appointments Queue Panel */}
        {activeTab === 'history' && (
          <>
          <div className="card billing-builder-card">
            {/* Header & Search */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ fontWeight: 700, fontSize: 15.5, margin: 0, color: 'var(--text)' }}>
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
                  style={{ padding: '5px 10px 5px 28px', fontSize: 11.5, height: 30 }}
                />
              </div>
            </div>

            {/* Quick Metrics Strip */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  background: '#f8fafc',
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Invoices
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginTop: 2, lineHeight: 1.2 }}>
                  {invoiceStats.count}
                </div>
              </div>
              <div
                style={{
                  background: '#f0fdf4',
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid #bbf7d0',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 10, color: '#15803d', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Collected
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#16a34a', marginTop: 2, lineHeight: 1.2 }}>
                  {money(invoiceStats.totalCollected)}
                </div>
              </div>
              <div
                style={{
                  background: invoiceStats.totalDue > 0 ? '#fef2f2' : '#f8fafc',
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: invoiceStats.totalDue > 0 ? '1px solid #fecaca' : '1px solid #e2e8f0',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 10, color: invoiceStats.totalDue > 0 ? '#dc2626' : '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Due Balance
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: invoiceStats.totalDue > 0 ? '#dc2626' : '#0f172a', marginTop: 2, lineHeight: 1.2 }}>
                  {money(invoiceStats.totalDue)}
                </div>
              </div>
            </div>

            {filteredInvoices.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 16px' }}>
                <History size={32} />
                <h3 style={{ fontSize: 13.5, marginTop: 6 }}>No invoices found</h3>
                <p style={{ fontSize: 11.5 }}>Generated bills and receipts will appear here.</p>
              </div>
            ) : (
              <>
                {/* Desktop & Tablet Table (>= 681px) */}
                <div className="billing-invoices-desktop">
                  <div className="table-wrap" style={{ maxHeight: 'calc(100vh - 340px)', minHeight: 220, overflowY: 'auto', overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
                      <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <tr>
                          <th style={{ padding: '9px 10px', fontSize: 10, textAlign: 'left', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>Invoice &amp; Date</th>
                          <th style={{ padding: '9px 10px', fontSize: 10, textAlign: 'left', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>Bride &amp; Mobile</th>
                          <th style={{ padding: '9px 10px', fontSize: 10, textAlign: 'left', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Events &amp; Schedule</th>
                          <th style={{ padding: '9px 10px', fontSize: 10, textAlign: 'left', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>Package Tier</th>
                          <th style={{ padding: '9px 10px', fontSize: 10, textAlign: 'left', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>Payment &amp; Due</th>
                          <th style={{ padding: '9px 10px', fontSize: 10, textAlign: 'right', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredInvoices.map((inv) => {
                          const bridalInfo = getBridalDetailsForInvoice(inv, data?.bridal, data?.bridalPackages, data?.services);

                          return (
                            <tr
                              key={inv.id}
                              style={{
                                borderBottom: '1px solid #f1f5f9',
                                background: bridalInfo.isBridal ? '#fffbfd' : 'transparent',
                              }}
                            >
                              {/* 1. Invoice & Date */}
                              <td style={{ padding: '10px 10px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                                <div style={{ height: 20, display: 'flex', alignItems: 'center', gap: 5 }}>
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
                                    title="Click to view official receipt"
                                  >
                                    {inv.no}
                                  </button>
                                  {bridalInfo.isBridal ? (
                                    <span style={{ fontSize: 9.5, fontWeight: 800, color: '#be185d', background: '#fdf2f8', border: '1px solid #fbcfe8', padding: '1px 5px', borderRadius: 4 }}>
                                      👑 Bridal
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: 9.5, fontWeight: 700, color: '#0369a1', background: '#f0f9ff', border: '1px solid #bae6fd', padding: '1px 5px', borderRadius: 4 }}>
                                      🛍️ POS
                                    </span>
                                  )}
                                </div>
                                <div style={{ height: 18, display: 'flex', alignItems: 'center', marginTop: 2, fontSize: 11, color: '#64748b' }}>
                                  {fmtDate(inv.date)}
                                </div>
                              </td>

                              {/* 2. Bride & Mobile */}
                              <td style={{ padding: '10px 10px', verticalAlign: 'top' }}>
                                <div style={{ height: 20, display: 'flex', alignItems: 'center' }}>
                                  <span
                                    style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}
                                    title={bridalInfo.isBridal ? bridalInfo.brideName : inv.customer}
                                  >
                                    {bridalInfo.isBridal ? bridalInfo.brideName : inv.customer}
                                  </span>
                                </div>
                                <div style={{ height: 18, display: 'flex', alignItems: 'center', marginTop: 2, fontSize: 11, color: '#64748b' }}>
                                  {bridalInfo.isBridal ? bridalInfo.brideMobile : (inv.mobile || '—')}
                                  {bridalInfo.isBridal && bridalInfo.birthday ? ` • 🎂 ${fmtDate(bridalInfo.birthday)}` : ''}
                                </div>
                              </td>

                              {/* 3. Events & Schedule */}
                              <td style={{ padding: '10px 10px', verticalAlign: 'top', minWidth: 200, maxWidth: 320 }}>
                                {bridalInfo.isBridal ? (
                                  <>
                                    <div style={{ height: 20, display: 'flex', alignItems: 'center', fontWeight: 700, color: '#05424A', fontSize: 13 }}>
                                      {fmtDate(bridalInfo.primaryDate)}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, lineHeight: 1.4 }} title={bridalInfo.eventsString}>
                                      {bridalInfo.eventsString || 'Bridal Makeup'}
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div style={{ height: 20, display: 'flex', alignItems: 'center', fontWeight: 600, color: '#475569', fontSize: 12 }}>
                                      Salon Service
                                    </div>
                                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                                      Counter Billing · {fmtDate(inv.date)}
                                    </div>
                                  </>
                                )}
                              </td>

                              {/* 4. Package Tier */}
                              <td style={{ padding: '10px 10px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                                {bridalInfo.isBridal ? (
                                  <>
                                    <div style={{ height: 20, display: 'flex', alignItems: 'center', fontWeight: 700, color: '#05424A', fontSize: 13 }}>
                                      {bridalInfo.packageName}
                                    </div>
                                    <div style={{ height: 18, display: 'flex', alignItems: 'center', marginTop: 2, fontSize: 11.5, color: '#64748b' }}>
                                      {money(bridalInfo.packagePrice)}
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div style={{ height: 20, display: 'flex', alignItems: 'center', fontWeight: 700, color: '#334155', fontSize: 12.5 }}>
                                      📦 {(inv.lines || []).length} {(inv.lines || []).length === 1 ? 'item' : 'items'}
                                    </div>
                                    <div style={{ height: 18, display: 'flex', alignItems: 'center', marginTop: 2, fontSize: 11.5, color: '#64748b', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {(inv.lines || []).map((l) => l.name).slice(0, 2).join(', ') || money(inv.total)}
                                    </div>
                                  </>
                                )}
                              </td>

                              {/* 5. Payment & Due */}
                              <td style={{ padding: '10px 10px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                                {bridalInfo.isBridal ? (
                                  <>
                                    <div style={{ height: 20, display: 'flex', alignItems: 'center', fontSize: 11.5, color: '#16a34a', fontWeight: 600 }}>
                                      Adv: {money(bridalInfo.advancePaid)} {bridalInfo.advanceAccount ? `(${bridalInfo.advanceAccount})` : ''}
                                    </div>
                                    <div style={{ height: 18, display: 'flex', alignItems: 'center', marginTop: 2 }}>
                                      {bridalInfo.dueBalance > 0 ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                          <span style={{ color: '#dc2626', fontWeight: 700, fontSize: 11.5 }}>
                                            Due: {money(bridalInfo.dueBalance)}
                                          </span>
                                          <button
                                            type="button"
                                            className="btn btn-xs"
                                            style={{
                                              fontSize: 9.5,
                                              padding: '1px 5px',
                                              height: 18,
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
                                        <span style={{ color: '#16a34a', fontSize: 11, fontWeight: 700 }}>
                                          ✅ Fully Paid
                                        </span>
                                      )}
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div style={{ height: 20, display: 'flex', alignItems: 'center' }}>
                                      <span style={{ fontWeight: 800, fontSize: 12.5, color: '#0f172a' }}>{money(inv.total)}</span>
                                    </div>
                                    <div style={{ height: 18, display: 'flex', alignItems: 'center', marginTop: 2 }}>
                                      {Number(inv.balance) > 0 ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                          <span style={{ color: '#dc2626', fontWeight: 700, fontSize: 10.5 }}>
                                            Due: {money(inv.balance)}
                                          </span>
                                          <button
                                            type="button"
                                            className="btn btn-xs"
                                            style={{
                                              fontSize: 9.5,
                                              padding: '1px 5px',
                                              height: 18,
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
                                        <span style={{ color: '#16a34a', fontSize: 10.5, fontWeight: 600 }}>
                                          Paid: {money(inv.paid || inv.total)} {inv.mode ? `(${inv.mode})` : ''}
                                        </span>
                                      )}
                                    </div>
                                  </>
                                )}
                              </td>

                              {/* 6. Actions */}
                              <td style={{ padding: '10px 10px', verticalAlign: 'top', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'flex-end', height: 40 }}>
                                  {/* View PDF Button matching user screenshot */}
                                  <button
                                    type="button"
                                    className="btn btn-sm"
                                    style={{
                                      fontSize: 11,
                                      padding: '3px 8px',
                                      color: '#047857',
                                      borderColor: '#a7f3d0',
                                      background: '#ecfdf5',
                                      fontWeight: 700,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      borderRadius: 6,
                                      height: 26,
                                      boxShadow: '0 1px 2px rgba(4,120,87,0.06)',
                                      cursor: 'pointer',
                                    }}
                                    title="📄 View, Download or Print Official PDF Bill Receipt"
                                    onClick={() => setReceiptModalInv(inv)}
                                  >
                                    <FileText size={12} /> View PDF
                                  </button>

                                  {/* POS Load Button */}
                                  <button
                                    type="button"
                                    className="btn btn-sm"
                                    style={{
                                      fontSize: 10.5,
                                      padding: '3px 7px',
                                      color: '#7c3aed',
                                      borderColor: '#ddd6fe',
                                      background: '#f5f3ff',
                                      fontWeight: 700,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      borderRadius: 6,
                                      height: 26,
                                      cursor: 'pointer',
                                    }}
                                    title="Open & Edit in POS Billing Builder"
                                    onClick={() => openEditInvoice(inv)}
                                  >
                                    POS
                                  </button>

                                  {/* Thermal Print */}
                                  <button
                                    type="button"
                                    className="pos-action-btn"
                                    title="Print Thermal / A4 Receipt"
                                    style={{
                                      background: '#f8fafc',
                                      color: '#475569',
                                      borderColor: '#cbd5e1',
                                      height: 26,
                                      width: 26,
                                      padding: 0,
                                    }}
                                    onClick={() => handlePrint(inv)}
                                  >
                                    <Printer size={11} />
                                  </button>

                                  {/* WhatsApp PDF */}
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
                                      background: waPdfStatus[inv.id] === 'sent' ? '#dcfce7' : waPdfStatus[inv.id] === 'failed' ? '#fee2e2' : '#ecfdf5',
                                      color: waPdfStatus[inv.id] === 'sent' ? '#16a34a' : waPdfStatus[inv.id] === 'failed' ? '#dc2626' : '#059669',
                                      borderColor: waPdfStatus[inv.id] === 'sent' ? '#86efac' : waPdfStatus[inv.id] === 'failed' ? '#fecaca' : '#a7f3d0',
                                      height: 26,
                                      width: 26,
                                      padding: 0,
                                    }}
                                    disabled={waPdfStatus[inv.id] === 'sending'}
                                    onClick={() => handleSendInvoicePDF(inv)}
                                  >
                                    {waPdfStatus[inv.id] === 'sending' ? (
                                      <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />
                                    ) : (
                                      <MessageCircle size={11} />
                                    )}
                                  </button>

                                  {/* Delete Invoice */}
                                  <button
                                    type="button"
                                    className="pos-action-btn"
                                    title="Delete Invoice & Return Stock"
                                    style={{
                                      background: '#fef2f2',
                                      color: '#dc2626',
                                      borderColor: '#fecaca',
                                      height: 26,
                                      width: 26,
                                      padding: 0,
                                    }}
                                    onClick={() => setDeleteInvoiceId(inv.id)}
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Cards View (<= 680px) */}
                <div className="billing-invoices-mobile" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                  {filteredInvoices.map((inv) => {
                    const bridalInfo = getBridalDetailsForInvoice(inv, data?.bridal, data?.bridalPackages, data?.services);

                    return (
                      <div
                        key={inv.id}
                        style={{
                          background: '#ffffff',
                          border: bridalInfo.isBridal ? '1px solid #fbcfe8' : '1px solid #e2e8f0',
                          borderRadius: 9,
                          padding: '10px 12px',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                        }}
                      >
                        {/* Top Row: Invoice Number, Badge, Date */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
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
                            >
                              {inv.no}
                            </button>
                            {bridalInfo.isBridal ? (
                              <span style={{ fontSize: 9.5, fontWeight: 800, color: '#be185d', background: '#fdf2f8', border: '1px solid #fbcfe8', padding: '1px 5px', borderRadius: 4 }}>
                                👑 Bridal
                              </span>
                            ) : (
                              <span style={{ fontSize: 9.5, fontWeight: 700, color: '#0369a1', background: '#f0f9ff', border: '1px solid #bae6fd', padding: '1px 5px', borderRadius: 4 }}>
                                🛍️ POS
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: 10.5, color: '#64748b' }}>{fmtDate(inv.date)}</span>
                        </div>

                        {/* Middle Row: Bride / Customer Info & Amount */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                              {bridalInfo.isBridal ? bridalInfo.brideName : inv.customer}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                              {bridalInfo.isBridal ? bridalInfo.brideMobile : (inv.mobile || '—')}
                              {bridalInfo.isBridal && bridalInfo.birthday ? ` • 🎂 ${fmtDate(bridalInfo.birthday)}` : ''}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            {bridalInfo.isBridal ? (
                              <>
                                <div style={{ fontWeight: 700, fontSize: 11.5, color: '#16a34a' }}>
                                  Adv: {money(bridalInfo.advancePaid)}
                                </div>
                                <div style={{ fontWeight: 800, fontSize: 12.5, color: bridalInfo.dueBalance > 0 ? '#dc2626' : '#16a34a', marginTop: 1 }}>
                                  {bridalInfo.dueBalance > 0 ? `Due: ${money(bridalInfo.dueBalance)}` : '✅ Paid'}
                                </div>
                              </>
                            ) : (
                              <>
                                <div style={{ fontWeight: 800, fontSize: 13.5, color: '#0f172a' }}>
                                  {money(inv.total)}
                                </div>
                                {Number(inv.balance) > 0 ? (
                                  <div style={{ color: '#dc2626', fontWeight: 700, fontSize: 10.5, marginTop: 1 }}>
                                    Due: {money(inv.balance)}
                                  </div>
                                ) : (
                                  <span style={{ color: '#16a34a', fontSize: 10.5, fontWeight: 600 }}>
                                    ✅ Paid: {money(inv.paid)}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Bridal Details Box if Bridal Booking */}
                        {bridalInfo.isBridal && (
                          <div style={{ background: '#fdf4f8', border: '1px solid #fce7f3', borderRadius: 7, padding: '7px 10px', fontSize: 11, display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 700, color: '#9d174d' }}>
                                💍 {fmtDate(bridalInfo.primaryDate)}
                              </span>
                              <span style={{ fontWeight: 700, color: '#05424A' }}>
                                {bridalInfo.packageName} ({money(bridalInfo.packagePrice)})
                              </span>
                            </div>
                            <div style={{ color: '#64748b', fontSize: 10.5, lineHeight: 1.3 }}>
                              {bridalInfo.eventsString || 'Bridal Events Schedule'}
                            </div>
                          </div>
                        )}

                        {/* Actions Row */}
                        <div
                          style={{
                            display: 'flex',
                            gap: 5,
                            borderTop: '1px solid #f1f5f9',
                            paddingTop: 8,
                            alignItems: 'center',
                            flexWrap: 'wrap',
                          }}
                        >
                          <button
                            type="button"
                            className="btn btn-xs"
                            onClick={() => setReceiptModalInv(inv)}
                            style={{ height: 26, fontSize: 10.5, borderRadius: 5, background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3, padding: '0 8px' }}
                          >
                            <FileText size={11} /> View PDF
                          </button>
                          <button
                            type="button"
                            className="btn btn-xs"
                            onClick={() => openEditInvoice(inv)}
                            style={{ height: 26, fontSize: 10.5, borderRadius: 5, background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3, padding: '0 8px' }}
                          >
                            POS
                          </button>
                          <button
                            type="button"
                            className="btn btn-xs"
                            onClick={() => handlePrint(inv)}
                            style={{ height: 26, fontSize: 10.5, borderRadius: 5, background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3, padding: '0 8px' }}
                          >
                            <Printer size={11} /> Print
                          </button>
                          <button
                            type="button"
                            className="btn btn-xs"
                            disabled={waPdfStatus[inv.id] === 'sending'}
                            onClick={() => handleSendInvoicePDF(inv)}
                            style={{ height: 26, fontSize: 10.5, borderRadius: 5, background: '#ecfdf5', color: '#059669', border: '1px solid #86efac', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3, padding: '0 8px' }}
                          >
                            <MessageCircle size={11} /> WA
                          </button>
                          {Number(inv.balance) > 0 && (
                            <button
                              type="button"
                              className="btn btn-xs"
                              onClick={() => openPaymentInModal(inv)}
                              style={{ height: 26, fontSize: 10.5, borderRadius: 5, background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', fontWeight: 700, padding: '0 8px' }}
                            >
                              + Collect
                            </button>
                          )}
                          <button
                            type="button"
                            className="pos-action-btn"
                            title="Delete Invoice"
                            onClick={() => setDeleteInvoiceId(inv.id)}
                            style={{ width: 26, height: 26, borderRadius: 5, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', marginLeft: 'auto' }}
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Quick POS Tips & Shortcuts */}
            <div
              style={{
                marginTop: 12,
                padding: '10px 12px',
                background: '#f8fafc',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: '#05424A', fontWeight: 700, fontSize: 11.5 }}>
                <Sparkles size={13} style={{ color: '#EABA38' }} /> Quick POS Tips &amp; Shortcuts
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 6 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 8px',
                    background: '#ffffff',
                    borderRadius: 6,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      background: '#f1f5f9',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      flexShrink: 0,
                    }}
                  >
                    ⚡
                  </span>
                  <span style={{ fontSize: 10.5, color: '#475569', lineHeight: 1.35 }}>
                    <strong style={{ color: '#0f172a', fontWeight: 700 }}>Fast Billing:</strong> Press Enter to add rows
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 8px',
                    background: '#ffffff',
                    borderRadius: 6,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      background: '#fdf2f8',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      flexShrink: 0,
                    }}
                  >
                    👰
                  </span>
                  <span style={{ fontSize: 10.5, color: '#475569', lineHeight: 1.35 }}>
                    <strong style={{ color: '#0f172a', fontWeight: 700 }}>Bridal Import:</strong> Auto-fill wedding events
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 8px',
                    background: '#ffffff',
                    borderRadius: 6,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      background: '#f0fdf4',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      flexShrink: 0,
                    }}
                  >
                    💬
                  </span>
                  <span style={{ fontSize: 10.5, color: '#475569', lineHeight: 1.35 }}>
                    <strong style={{ color: '#0f172a', fontWeight: 700 }}>WhatsApp:</strong> Send PDF bill to customer
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 8px',
                    background: '#ffffff',
                    borderRadius: 6,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      background: '#f1f5f9',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      flexShrink: 0,
                    }}
                  >
                    🖨️
                  </span>
                  <span style={{ fontSize: 10.5, color: '#475569', lineHeight: 1.35 }}>
                    <strong style={{ color: '#0f172a', fontWeight: 700 }}>Thermal Print:</strong> 80mm roll auto-cut
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <AppointmentsPanel
              viewMode="queue"
              onRequestNewAppointment={() => handleSwitchTab('appointments', 'right')}
            />
          </div>
          </>
        )}
      </motion.div>
      )}
      </div>
      {/* End billing-swipe-stage */}

      {/* 3. Smart Mobile Sticky Bottom Action Bar (< 768px, Builder Only) */}
      {activeTab === 'builder' && (
        <div className="billing-mobile-bar no-print">
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              cursor: 'pointer',
              minWidth: 0,
            }}
            onClick={() => {
              const el = document.getElementById('billing-checkout-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            title="Click to jump to Settlement"
          >
            <div style={{ fontSize: 9.5, color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
              <span>{lines.filter((l) => l.name && l.name.trim() !== '').length} items</span>
              <span>•</span>
              <span style={{ color: '#05424A', fontWeight: 700 }}>
                {isSplitPayment ? '🔀 Split' : mode === 'Cash' ? '💵 Cash' : '📱 ' + mode}
              </span>
              <span style={{ fontSize: 9, color: '#05424A' }}>↓</span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#05424A', lineHeight: 1.15 }}>
              {money(totalAfterLoyalty - Number(advance || 0))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            {/* Fast Payment Mode Switch Pill (cycles through all configured Studio payment options) */}
            <button
              type="button"
              onClick={() => {
                const currentIdx = paymentOptions.indexOf(mode);
                const nextMode = paymentOptions[(currentIdx + 1) % paymentOptions.length] || paymentOptions[0];
                setMode(nextMode);
                setIsSplitPayment(false);
                const payAmt = Math.max(0, totalAfterLoyalty - Number(advance || 0));
                setPaid(payAmt);
              }}
              title="Tap to cycle payment option"
              style={{
                fontSize: 12,
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                color: '#05424A',
                cursor: 'pointer',
                height: 36,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                maxWidth: 120,
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {getPaymentOptionIcon(mode)} {mode}
              </span>
              <span style={{ fontSize: 9.5, opacity: 0.7 }}>↺</span>
            </button>

            {/* 1-Tap Bill Generation */}
            <button
              type="button"
              onClick={handleSave}
              disabled={hasBelowBuyLines}
              style={{
                height: 38,
                padding: '0 14px',
                fontSize: 14,
                fontWeight: 800,
                borderRadius: 7,
                border: 'none',
                background: hasBelowBuyLines ? '#dc2626' : 'linear-gradient(135deg, #05424A 0%, #0a6572 100%)',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                boxShadow: hasBelowBuyLines ? 'none' : '0 2px 8px rgba(5, 66, 74, 0.3)',
                whiteSpace: 'nowrap',
              }}
            >
              <Printer size={15} />
              <span>{editingInvoiceId ? 'Update & Print' : 'Bill'}</span>
            </button>
          </div>
        </div>
      )}

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
                {getPaymentOptions(data?.settings?.payments, [settleMode]).map((p) => (
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

      {/* Reception Desk QR Code Modal for 24h Free Window Activation */}
      <ReceptionDeskQRModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        studioName={data?.settings?.salon || 'Shree Beauty Studio'}
        studioMobile={data?.settings?.whatsapp || '919824183769'}
        customerMobile={mobile}
        customerName={customer}
      />

      {/* Android & iPhone Contact Import Modal (Smart Paste, VCF, Directory Search) */}
      <ContactImportModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        customers={data?.customers || []}
        onSelectContact={(name, mob) => handleImportContact(name, mob)}
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
