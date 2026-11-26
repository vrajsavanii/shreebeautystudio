'use client';

import { useState, useMemo, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Pencil, Trash2, Heart, Calendar, MessageCircle,
  Sparkles, Check, Crown, User, CalendarDays, ShoppingBag, FileText, CheckCircle,
  Receipt, Download, Eye, Loader2, ExternalLink, RefreshCw, Mail, Zap, History,
  Smartphone, RotateCcw, ChevronDown, ChevronUp
} from 'lucide-react';
import { useSalonStore, resolveBridalBookingPrice, DEFAULT_BRIDAL_PACKAGES } from '@/lib/store';
import { scheduleSave } from '@/lib/sync';
import { uid, todayISO, money, fmtDate, formatCustomerContactName, autoCapitalizeName, FIFTEEN_MIN_TIME_SLOTS } from '@/lib/utils';
import { BridalBooking, BridalPackage, Invoice, InvoiceLine, SharedCustomerBridge } from '@/types/salon';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { openWAApp, bridalMessage, sendDirectWhatsAppMessage, isCustomerIn24HourWindow } from '@/lib/whatsapp';
import { downloadInvoicePDF, sendInvoicePDFViaWhatsApp } from '@/lib/invoice-pdf';
import { downloadBridalRateCardPDF, sendBridalRateCardPDFViaWhatsApp } from '@/lib/bridal-pdf';
import { getBridalGoogleCalendarUrl, getBridalFunctionGoogleCalendarUrl, downloadBridalICS } from '@/lib/calendar';
import InvoiceReceiptModal from '@/components/billing/InvoiceReceiptModal';
import ContactImportModal from '@/components/billing/ContactImportModal';
import { staggerContainer, fadeSlideUp } from '@/variants';
import { subDays, format, parseISO } from 'date-fns';
import { getPaymentOptions, getDefaultPaymentOption, getPaymentOptionIcon } from '@/lib/payments';

export function BridalPanel({ sharedCustomer }: { sharedCustomer?: SharedCustomerBridge } = {}) {
  const router = useRouter();
  const { data, updateData } = useSalonStore();
  const { toast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [prevBridal, setPrevBridal] = useState<BridalBooking | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [catalogCategory, setCatalogCategory] = useState<'Bridal Package' | 'Siders Package' | 'Makeup Package'>('Bridal Package');
  const [receiptModalInv, setReceiptModalInv] = useState<Invoice | null>(null);
  const [bulkSyncing, setBulkSyncing] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [calendarModalBridal, setCalendarModalBridal] = useState<BridalBooking | null>(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [showEventsSection, setShowEventsSection] = useState(true);
  const [showCatalogGrid, setShowCatalogGrid] = useState(true);

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

  const openNewPackage = (type: 'Bridal Package' | 'Siders Package' | 'Makeup Package' = 'Makeup Package') => {
    setEditPackageId(null);
    setPackageForm({
      type,
      name: '',
      price: type === 'Bridal Package' ? 25000 : type === 'Makeup Package' ? 12000 : 5000,
      sessions: type === 'Bridal Package' ? 3 : type === 'Makeup Package' ? 2 : 1,
      includes: type === 'Bridal Package'
        ? 'Makeup, hairstyle, jewellery, lenses, hair extensions, eyelashes, hair decor and draping'
        : type === 'Makeup Package'
        ? 'Makeup, hairstyle, draping, eyelashes and lenses'
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

      // Also mirror/update in services under 'Makeup & Bridal'
      const isSider = newPkg.type === 'Siders Package';
      const isBridal = newPkg.type === 'Bridal Package';
      let svcName = newPkg.name;
      if (isSider && !svcName.toLowerCase().includes('sider')) {
        svcName = `${newPkg.name} (Siders Package)`;
      } else if (isBridal && !svcName.toLowerCase().includes('bridal')) {
        svcName = `${newPkg.name} (Bridal Package)`;
      } else if (!isSider && !isBridal && !svcName.toLowerCase().includes('package')) {
        svcName = `${newPkg.name} (Luxury Package)`;
      }

      const services = [...(d.services || [])];
      const svcIdx = services.findIndex((s) => s.id === `svc_${id}` || s.name.toLowerCase() === svcName.toLowerCase());
      const svcObj = {
        id: `svc_${id}`,
        name: svcName,
        price: newPkg.price,
        category: 'Makeup & Bridal',
        duration: (newPkg.sessions && newPkg.sessions > 1) ? newPkg.sessions * 60 : (isBridal ? 180 : (isSider ? 60 : 90)),
        description: newPkg.includes ? `${newPkg.includes} (${newPkg.sessions || 1} ${(newPkg.sessions || 1) === 1 ? 'Session' : 'Sessions'})` : '',
        pricingType: 'fixed' as const,
      };

      if (svcIdx >= 0) {
        services[svcIdx] = svcObj;
      } else {
        services.push(svcObj);
      }

      return { ...d, bridalPackages: updated, services };
    });

    scheduleSave();
    toast(editPackageId ? `✅ Package "${newPkg.name}" updated successfully!` : `🎉 New package "${newPkg.name}" added!`);
    setPackageModalOpen(false);
  };

  const handleDeletePackage = (id: string) => {
    updateData((d) => ({
      ...d,
      bridalPackages: (d.bridalPackages || []).filter((p) => p.id !== id),
      services: (d.services || []).filter((s) => s.id !== `svc_${id}`),
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
    email: '',
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
    advanceAccount: getDefaultPaymentOption(data?.settings?.payments),
    balance: 0,
    notes: '',
  });

  const bridalPackages = data?.bridalPackages || [];
  const paymentOptions = useMemo(() => getPaymentOptions(data?.settings?.payments), [data?.settings?.payments]);
  const cust24hStatus = useMemo(() => isCustomerIn24HourWindow(form.mobile || '', data), [form.mobile, data]);

  const set = (key: keyof BridalBooking, val: unknown) => {
    setForm((prev) => {
      const updated = { ...prev, [key]: val };
      if (key === 'package' || key === 'advance') {
        const pkg = Number(key === 'package' ? val : updated.package) || 0;
        const adv = Number(key === 'advance' ? val : updated.advance) || 0;
        updated.balance = Math.max(0, pkg - adv);

        // If package price changed and there is exactly 1 package, sync its individual price
        if (key === 'package' && Array.isArray(updated.selectedPackages) && updated.selectedPackages.length === 1) {
          updated.selectedPackages = [{ ...updated.selectedPackages[0], price: pkg }];
        }
      }
      return updated;
    });
  };

const OTHER_EVENT_OPTIONS = [
  'Mandap Muhurat',
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
  const handleSelectCustomerName = (query: string) => {
    const capitalizedQuery = autoCapitalizeName(query);
    const trimmed = capitalizedQuery.trim();
    if (!trimmed) {
      set('name', '');
      return;
    }

    const match = trimmed.match(/^(.*?)\s*[\(—\-]\s*(\d{10})\)?$/);
    let targetCustomer = null;
    if (match) {
      const extractedMob = match[2].trim();
      targetCustomer = (data?.customers || []).find((c) => c.mobile === extractedMob);
    } else {
      targetCustomer = (data?.customers || []).find(
        (c) =>
          `${formatCustomerContactName(c.name)} (${c.mobile})`.toLowerCase() === trimmed.toLowerCase() ||
          `${c.name} (${c.mobile})`.toLowerCase() === trimmed.toLowerCase() ||
          `${formatCustomerContactName(c.name)} — 📞 ${c.mobile}`.toLowerCase() === trimmed.toLowerCase()
      );
    }

    if (targetCustomer) {
      const found = targetCustomer;
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
          name: autoCapitalizeName(found.name),
          mobile: found.mobile,
          email: found.email || prev.email || '',
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
      return;
    }

    set('name', capitalizedQuery);
  };

  const handleSelectCustomerMobile = (mob: string) => {
    const trimmed = mob.trim();
    if (!trimmed) {
      set('mobile', '');
      return;
    }

    const match = trimmed.match(/^(\d{10})\s*[\(—\-]\s*(.*?)\)?$/);
    if (match) {
      const extractedMob = match[1].trim();
      const found = (data?.customers || []).find((c) => c.mobile === extractedMob);
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
            name: autoCapitalizeName(found.name),
            mobile: found.mobile,
            email: found.email || prev.email || '',
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
        return;
      }
    }

    const cleanNum = trimmed.replace(/\D/g, '').slice(0, 10);
    set('mobile', cleanNum);
  };

  const handleImportContact = (importedName: string, importedPhone: string) => {
    const cleanPhone = (importedPhone || '').replace(/\D/g, '').slice(-10);
    const cleanName = autoCapitalizeName((importedName || '').trim());
    const foundByMob = cleanPhone.length === 10
      ? (data?.customers || []).find((c) => c.mobile.replace(/\D/g, '').slice(-10) === cleanPhone)
      : undefined;
    if (foundByMob) {
      handleSelectCustomerMobile(cleanPhone);
      return;
    }
    setForm((prev) => ({
      ...prev,
      name: cleanName || prev.name || '',
      mobile: cleanPhone || prev.mobile || '',
    }));
  };

  const handlePickDeviceContact = async () => {
    if (typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window) {
      try {
        const contacts = await (navigator as any).contacts.select(['name', 'tel'], { multiple: false });
        if (contacts && contacts.length > 0) {
          const c = contacts[0];
          const name = Array.isArray(c.name) ? c.name[0] : c.name || '';
          const tel = Array.isArray(c.tel) ? c.tel[0] : c.tel || '';
          handleImportContact(name, tel);
          return;
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') console.warn('Contact picker error:', err);
        return;
      }
    }
    setContactModalOpen(true);
  };

  const autoMatchCustomerByName = (inputVal: string) => {
    const trimmed = inputVal.trim();
    if (!trimmed) return;
    const q = trimmed.toLowerCase();
    const exactMatch = (data?.customers || []).find((c) => {
      const fn = formatCustomerContactName(c.name).toLowerCase();
      const raw = c.name.trim().toLowerCase();
      return fn === q || raw === q || fn.replace(/\s+/g, '') === q.replace(/\s+/g, '');
    });
    if (exactMatch) {
      handleSelectCustomerName(exactMatch.name);
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

  const openNew = (clearShared: boolean = true) => {
    setEditId(null);
    setPrevBridal(null);
    setCatalogCategory('Bridal Package');
    const defaultPkg = bridalPackages.find((p) => p.type === 'Bridal Package') || bridalPackages[0];
    const today = todayISO();
    let prev = today;
    try {
      prev = format(subDays(parseISO(today), 1), 'yyyy-MM-dd');
    } catch {
      prev = today;
    }

    const keepShared = !clearShared && Boolean(sharedCustomer);
    setForm({
      name: keepShared ? (sharedCustomer?.name || '') : '',
      mobile: keepShared ? (sharedCustomer?.mobile || '') : '',
      email: '',
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
      selectedPackages: defaultPkg ? [{ ...defaultPkg, customerName: '' }] : [],
      package: defaultPkg ? defaultPkg.price : 0,
      advance: 0,
      advanceAccount: getDefaultPaymentOption(data?.settings?.payments),
      balance: defaultPkg ? defaultPkg.price : 0,
      status: 'Confirmed',
      notes: '',
    });
    setModalOpen(false);
    if (clearShared && sharedCustomer) {
      sharedCustomer.onClear();
    }
  };

  // Sync shared common Customer Name & Mobile into Bridal Booking form
  const lastAutoMatchedMobRef = useRef('');
  useEffect(() => {
    if (!sharedCustomer) return;
    const cleanMob = (sharedCustomer.mobile || '').replace(/\D/g, '').slice(-10);
    const matched = cleanMob.length === 10
      ? (data?.customers || []).find((c) => c.mobile.replace(/\D/g, '').slice(-10) === cleanMob)
      : undefined;
    const shouldAutoFillDates = Boolean(matched && lastAutoMatchedMobRef.current !== cleanMob);
    if (shouldAutoFillDates) {
      lastAutoMatchedMobRef.current = cleanMob;
    } else if (!cleanMob) {
      lastAutoMatchedMobRef.current = '';
    }

    setForm((prev) => {
      if (!shouldAutoFillDates || !matched) {
        return {
          ...prev,
          name: sharedCustomer.name || '',
          mobile: sharedCustomer.mobile || '',
        };
      }
      const todayStr = todayISO();
      const wDate = matched.anniversary || prev.weddingDate || todayStr;
      let prevDay = wDate;
      try {
        prevDay = format(subDays(parseISO(wDate), 1), 'yyyy-MM-dd');
      } catch {
        prevDay = todayStr;
      }
      const sagai = matched.sagaiDate || matched.engagementDate || prev.sagaiDate || '';
      return {
        ...prev,
        name: sharedCustomer.name || autoCapitalizeName(matched.name),
        mobile: sharedCustomer.mobile || matched.mobile,
        email: matched.email || prev.email || '',
        birthday: matched.birthday || prev.birthday || '',
        weddingDate: wDate,
        includeWedding: true,
        sagaiDate: sagai,
        includeSagai: !!sagai,
        mandapDate: prev.mandapDate || prevDay,
        musicDate: prev.musicDate || prevDay,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedCustomer?.name, sharedCustomer?.mobile]);

  // Switch to inline New Bridal Booking if ?new=1 is in URL
  const searchParams = useSearchParams();
  const hasAutoOpenedRef = useRef(false);
  useEffect(() => {
    if (hasAutoOpenedRef.current) return;
    hasAutoOpenedRef.current = true;

    const isEditing = searchParams?.get('edit') || searchParams?.get('id');
    const isNew = searchParams?.get('new') === '1' || searchParams?.get('action') === 'add';

    if (!isEditing && isNew) {
      openNew(false);
    }
  }, [searchParams]);

  const openEdit = (b: BridalBooking) => {
    setEditId(b.id);
    setPrevBridal(b);
    if (b.packageType === 'Bridal Package' || b.packageType === 'Siders Package' || b.packageType === 'Makeup Package') {
      setCatalogCategory(b.packageType);
    } else {
      setCatalogCategory('Bridal Package');
    }
    let initialSelected = (b.selectedPackages as BridalPackage[]) || [];
    if (initialSelected.length === 0 && b.packageName) {
      const exactMatch = bridalPackages.find((p) => p.name.trim().toLowerCase() === b.packageName?.trim().toLowerCase()) ||
        DEFAULT_BRIDAL_PACKAGES.find((p) => p.name.trim().toLowerCase() === b.packageName?.trim().toLowerCase());
      if (exactMatch) {
        initialSelected = [{ ...exactMatch, customerName: '' }];
      } else {
        const names = b.packageName.split(/\s*\+\s*|\s*,\s*/);
        initialSelected = names
          .map((entry) => {
            const exactEntry = bridalPackages.find((p) => p.name.trim().toLowerCase() === entry.trim().toLowerCase()) ||
              DEFAULT_BRIDAL_PACKAGES.find((p) => p.name.trim().toLowerCase() === entry.trim().toLowerCase());
            if (exactEntry) {
              return { ...exactEntry, customerName: b.name || '' };
            }
            const match = entry.match(/^(.*?)\s*\((.*?)\)$/);
            const rawName = match ? match[1].trim() : entry.trim();
            const custName = match ? match[2].trim() : '';
            const found = bridalPackages.find((p) => p.name.trim().toLowerCase() === rawName.toLowerCase()) ||
              DEFAULT_BRIDAL_PACKAGES.find((p) => p.name.trim().toLowerCase() === rawName.toLowerCase());
            if (found) {
              return { ...found, customerName: custName || b.name || '' };
            }
            const resolvedPrice = resolveBridalBookingPrice({ packageName: rawName || entry }, bridalPackages, data?.services);
            return {
              id: uid(),
              name: rawName || entry,
              type: b.packageType || 'Bridal Package',
              price: resolvedPrice || Number(b.package || 0),
              includes: '',
              customerName: custName || b.name || '',
            };
          })
          .filter(Boolean) as BridalPackage[];
      }
    }
    const resolvedPrice = Number(b.package || 0) || resolveBridalBookingPrice(b, bridalPackages, data?.services);
    const adv = Number(b.advance || 0);
    setForm({
      ...b,
      package: resolvedPrice,
      balance: Math.max(0, resolvedPrice - adv),
      selectedPackages: initialSelected,
      email: b.email || '',
      status: b.status || 'Confirmed',
      includeWedding: b.includeWedding !== undefined ? b.includeWedding : !!b.weddingDate,
      includeSagai: b.includeSagai !== undefined ? b.includeSagai : !!b.sagaiDate,
      includeMandap: b.includeMandap !== undefined ? b.includeMandap : !!b.mandapDate,
      includeMusic: b.includeMusic !== undefined ? b.includeMusic : !!b.musicDate,
      includeOther: b.includeOther !== undefined ? b.includeOther : !!b.otherDate,
    });
    setModalOpen(false);
  };

  const togglePackage = (pkg: BridalPackage) => {
    setForm((prev) => {
      let currentList: any[] = (prev.selectedPackages as any[]) || [];
      if (currentList.length === 0 && prev.packageName) {
        const found = bridalPackages.find((p) => p.name === prev.packageName);
        if (found) currentList = [{ ...found, customerName: prev.name || '' }];
      }

      const existingIdx = currentList.findIndex(
        (p) => p.name.trim().toLowerCase() === pkg.name.trim().toLowerCase() || (p.id && pkg.id && p.id === pkg.id)
      );
      let updatedList: any[];
      if (existingIdx >= 0) {
        // Deselect it
        updatedList = currentList.filter(
          (p) => !(p.name.trim().toLowerCase() === pkg.name.trim().toLowerCase() || (p.id && pkg.id && p.id === pkg.id))
        );
      } else {
        // Add it with customerName empty - user can choose to add name if they want
        updatedList = [...currentList, { ...pkg, customerName: '' }];
      }

      const totalCalculated = updatedList.reduce((sum, p) => sum + Number(p.price || 0), 0);
      const combinedNames = updatedList
        .map((p) => (p.customerName?.trim() ? `${p.name} (${p.customerName.trim()})` : p.name))
        .join(' + ');
      const adv = Number(prev.advance || 0);

      const types = Array.from(new Set(updatedList.map((p) => p.type)));
      const derivedType = types.length === 1 ? types[0] : (types.length > 1 ? 'Combo / Multi-Package' : prev.packageType || 'Bridal Package');

      return {
        ...prev,
        selectedPackages: updatedList,
        packageName: combinedNames,
        packageType: derivedType,
        package: totalCalculated,
        balance: Math.max(0, totalCalculated - adv),
      };
    });
  };

  const addPackageInstance = (pkg: BridalPackage) => {
    setForm((prev) => {
      const currentList: any[] = (prev.selectedPackages as any[]) || [];
      const updatedList = [...currentList, { ...pkg, customerName: '', hasCustomName: true }];
      const totalCalculated = updatedList.reduce((sum, p) => sum + Number(p.price || 0), 0);
      const combinedNames = updatedList
        .map((p) => (p.customerName?.trim() ? `${p.name} (${p.customerName.trim()})` : p.name))
        .join(' + ');
      const adv = Number(prev.advance || 0);

      const types = Array.from(new Set(updatedList.map((p) => p.type)));
      const derivedType = types.length === 1 ? types[0] : (types.length > 1 ? 'Combo / Multi-Package' : prev.packageType || 'Bridal Package');

      return {
        ...prev,
        selectedPackages: updatedList,
        packageName: combinedNames,
        packageType: derivedType,
        package: totalCalculated,
        balance: Math.max(0, totalCalculated - adv),
      };
    });
  };

  const removePackageInstance = (index: number) => {
    setForm((prev) => {
      const currentList: any[] = (prev.selectedPackages as any[]) || [];
      const updatedList = currentList.filter((_, i) => i !== index);
      const totalCalculated = updatedList.reduce((sum, p) => sum + Number(p.price || 0), 0);
      const combinedNames = updatedList
        .map((p) => (p.customerName?.trim() ? `${p.name} (${p.customerName.trim()})` : p.name))
        .join(' + ');
      const adv = Number(prev.advance || 0);

      const types = Array.from(new Set(updatedList.map((p) => p.type)));
      const derivedType = types.length === 1 ? types[0] : (types.length > 1 ? 'Combo / Multi-Package' : prev.packageType || 'Bridal Package');

      return {
        ...prev,
        selectedPackages: updatedList,
        packageName: combinedNames,
        packageType: derivedType,
        package: totalCalculated,
        balance: Math.max(0, totalCalculated - adv),
      };
    });
  };

  const updatePackageCustomerName = (index: number, customerName: string, hasCustomName?: boolean) => {
    setForm((prev) => {
      const currentList: any[] = [...((prev.selectedPackages as any[]) || [])];
      if (!currentList[index]) return prev;
      currentList[index] = {
        ...currentList[index],
        customerName,
        hasCustomName: hasCustomName !== undefined ? hasCustomName : (currentList[index].hasCustomName || !!customerName),
      };
      const combinedNames = currentList
        .map((p) => (p.customerName?.trim() ? `${p.name} (${p.customerName.trim()})` : p.name))
        .join(' + ');
      return {
        ...prev,
        selectedPackages: currentList,
        packageName: combinedNames,
      };
    });
  };

  const updatePackagePrice = (index: number, newPrice: number) => {
    setForm((prev) => {
      const currentList: any[] = [...((prev.selectedPackages as any[]) || [])];
      if (!currentList[index]) return prev;
      currentList[index] = { ...currentList[index], price: isNaN(newPrice) ? 0 : newPrice };
      const totalCalculated = currentList.reduce((sum, p) => sum + Number(p.price || 0), 0);
      const adv = Number(prev.advance || 0);
      return {
        ...prev,
        selectedPackages: currentList,
        package: totalCalculated,
        balance: Math.max(0, totalCalculated - adv),
      };
    });
  };

  const updatePackageName = (index: number, newName: string) => {
    setForm((prev) => {
      const currentList: any[] = [...((prev.selectedPackages as any[]) || [])];
      if (!currentList[index]) return prev;
      currentList[index] = { ...currentList[index], name: newName };
      const combinedNames = currentList
        .map((p) => (p.customerName?.trim() ? `${p.name} (${p.customerName.trim()})` : p.name))
        .join(' + ');
      return {
        ...prev,
        selectedPackages: currentList,
        packageName: combinedNames,
      };
    });
  };

  const addCustomPackage = () => {
    setForm((prev) => {
      const currentList: any[] = (prev.selectedPackages as any[]) || [];
      const newPkg: BridalPackage = {
        id: uid(),
        name: 'Custom Makeup / Package',
        type: 'Custom Package',
        price: 0,
        includes: '',
        sessions: 1,
        customerName: prev.name || '',
      };
      const updatedList = [...currentList, newPkg];
      const totalCalculated = updatedList.reduce((sum, p) => sum + Number(p.price || 0), 0);
      const combinedNames = updatedList
        .map((p) => (p.customerName?.trim() ? `${p.name} (${p.customerName.trim()})` : p.name))
        .join(' + ');
      const adv = Number(prev.advance || 0);
      return {
        ...prev,
        selectedPackages: updatedList,
        packageName: combinedNames,
        package: totalCalculated,
        balance: Math.max(0, totalCalculated - adv),
      };
    });
  };

  const selectPackage = togglePackage;

  const handleSave = (saveMode: 'web' | 'api' | 'none' = 'web') => {
    if (!form.name) { toast('Please enter the customer / bride name.', 'error'); return; }
    if (!form.mobile) { toast('Please enter a mobile number.', 'error'); return; }

    const id = editId || uid();
    const cleanEmail = form.email?.trim() || undefined;
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
      name: autoCapitalizeName(form.name || ''),
      mobile: form.mobile || '',
      email: cleanEmail,
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
      selectedPackages: form.selectedPackages || [],
      package: Number(form.package || 0) || resolveBridalBookingPrice(form, bridalPackages, data?.services),
      advance: Number(form.advance || 0),
      advanceAccount: form.advanceAccount || 'Cash',
      balance: Math.max(0, (Number(form.package || 0) || resolveBridalBookingPrice(form, bridalPackages, data?.services)) - Number(form.advance || 0)),
      status: form.status || 'Confirmed',
      notes: form.notes || '',
    };

    updateData((d) => {
      // Auto register / update customer profile with Birthday, Wedding Date (Anniversary), Sagai Date, and Email
      let customers = [...(d.customers || [])];
      const existingIdx = customers.findIndex(
        (c) => (c.mobile && c.mobile === form.mobile) || c.name.toLowerCase() === form.name?.toLowerCase()
      );

      const effectiveWedding = (form.includeWedding !== false && form.weddingDate) ? form.weddingDate : '';
      const effectiveSagai = (form.includeSagai && form.sagaiDate) ? form.sagaiDate : '';

      if (existingIdx >= 0) {
        customers[existingIdx] = {
          ...customers[existingIdx],
          email: cleanEmail || customers[existingIdx].email,
          birthday: form.birthday || customers[existingIdx].birthday || '',
          anniversary: effectiveWedding || customers[existingIdx].anniversary || '',
          sagaiDate: effectiveSagai || customers[existingIdx].sagaiDate || '',
          engagementDate: effectiveSagai || customers[existingIdx].engagementDate || '',
        };
      } else if (form.name) {
        customers.push({
          id: uid(),
          name: autoCapitalizeName(form.name),
          mobile: form.mobile || '',
          email: cleanEmail,
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
          const invLines: InvoiceLine[] = (booking.selectedPackages && booking.selectedPackages.length > 0)
            ? booking.selectedPackages.map((p) => ({
                type: 'S',
                name: (booking.includeClientNamesInBill !== false && p.customerName?.trim()) ? `${p.name} — 👤 ${p.customerName.trim()}` : p.name,
                qty: 1,
                price: Number(p.price || 0),
                discount: 0,
                discountType: '%',
              }))
            : [
                {
                  type: 'S',
                  name: booking.packageName
                    ? `${booking.packageName}${booking.packageType && !booking.packageName.toLowerCase().includes('package') ? ` (${booking.packageType})` : ''}`
                    : (booking.packageType || 'Bridal & Makeup Package'),
                  qty: 1,
                  price: booking.package,
                  discount: 0,
                  discountType: '%',
                },
              ];
          return {
            ...inv,
            customer: booking.name,
            mobile: booking.mobile,
            lines: invLines,
            subtotal: booking.package,
            total: booking.package,
            advance: booking.advance,
            paid: 0,
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
    toast(editId ? 'Bridal booking updated & Records synced!' : 'Bridal booking saved & Records synced!');

    const salon = data?.settings?.salon || 'Shree Beauty Studio';
    const address = data?.settings?.address || 'Surat, Gujarat';

    const msg = bridalMessage(
      booking.name,
      booking.packageName || 'Bridal Package',
      booking.weddingDate || booking.date || todayISO(),
      booking.venue || 'Surat Venue',
      salon
    );

    // 1. Web Send and Save (opens WhatsApp Web / App)
    if (saveMode === 'web') {
      if (booking.mobile) {
        openWAApp(booking.mobile, msg);
        toast('🌐 WhatsApp Web / App opened with bridal booking details!');
      }
    }
    // 2. API Send and Save (Meta WhatsApp Cloud API background send)
    else if (saveMode === 'api') {
      if (booking.mobile) {
        toast('⏳ Sending WhatsApp message via Cloud API...', 'info');
        sendDirectWhatsAppMessage(booking.mobile, msg, data?.settings).then((res) => {
          if (res.success) {
            toast('⚡ WhatsApp confirmation sent successfully via API!');
          } else {
            toast(`⚠️ API Send: ${res.message || 'Outside 24h window'}. Fallback Web opened.`);
            if (res.clickToChatUrl) {
              window.open(res.clickToChatUrl, '_blank');
            }
          }
        }).catch((err) => {
          toast(`⚠️ WhatsApp API Error: ${err?.message || 'Failed'}`);
        });
      }
    }
    // 3. Only Save (Direct silent save)
    else if (saveMode === 'none') {
      toast('💾 Bridal booking saved directly (No WhatsApp message sent)');
    }

    // Auto-sync directly to Google Calendar in the cloud
    if (booking.status === 'Cancelled') {
      // If status is Cancelled, remove event from Google Calendar
      fetch('/api/calendar/auto-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'delete_bridal',
          bridal: booking,
          settings: data?.settings,
        }),
      })
        .then((res) => res.json())
        .then((resData) => {
          if (resData.success) {
            toast(`🗑️ Google Calendar માંથી "${booking.name}" ની Bridal Events કાઢી નાખવામાં આવી!`, 'info');
          }
        })
        .catch(() => {});
    } else {
      const syncUpdatedBridal = () => {
        fetch('/api/calendar/auto-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'bridal',
            bridal: booking,
            settings: data?.settings,
          }),
        })
          .then((res) => res.json())
          .then((res) => {
            if (res.success && res.provider !== 'feed_and_invite') {
              toast('📅 Bridal events Google Calendar માં Auto-Save થઈ!');
            } else if (!res.success) {
              console.error('[Bridal Calendar Auto-Sync Failed]:', res.error || res.message);
            }
          })
          .catch((err) => {
            console.error('[Bridal Calendar Auto-Sync Error]:', err);
          });
      };

      // If editing existing bridal booking, delete old events first to prevent duplicates
      if (prevBridal) {
        fetch('/api/calendar/auto-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'delete_bridal',
            bridal: prevBridal,
            settings: data?.settings,
          }),
        })
          .catch(() => {})
          .finally(() => {
            syncUpdatedBridal();
          });
      } else {
        syncUpdatedBridal();
      }
    }

    setModalOpen(false);
    openNew(true);
  };

  const handleDelete = (id: string) => {
    const target = (data?.bridal || []).find((b) => b.id === id);
    if (target) {
      fetch('/api/calendar/auto-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'delete_bridal',
          bridal: target,
          settings: data?.settings,
        }),
      })
        .then((res) => res.json())
        .then((resData) => {
          if (resData.success) {
            toast(`🗑️ Google Calendar માંથી "${target.name}" નું Bridal Booking કાઢી નાખવામાં આવ્યું!`);
          }
        })
        .catch(() => {});
    }
    updateData((d) => {
      const targetLocal = (d.bridal || []).find((b) => b.id === id);
      return {
        ...d,
        bridal: (d.bridal || []).filter((b) => b.id !== id),
        invoices: (d.invoices || []).filter(
          (inv) => inv.bridalBookingId !== id && !(targetLocal && inv.mobile === targetLocal.mobile && inv.customer === targetLocal.name)
        ),
      };
    });
    scheduleSave();
    toast('Bridal booking deleted & removed from Google Calendar', 'info');
    setDeleteId(null);
  };

  const handleSyncSingleBridal = async (b: BridalBooking) => {
    setSyncingId(b.id);
    try {
      const res = await fetch('/api/calendar/auto-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'bridal',
          bridal: b,
          settings: data?.settings,
        }),
      });
      const resData = await res.json();
      if (resData.success) {
        toast(`📅 "${b.name}" નું Bridal Booking Google Calendar માં Sync થઈ ગયું! (${resData.message || 'Saved'})`);
      } else {
        toast(`❌ Sync failed: ${resData.error || 'Unknown error'}`, 'error');
      }
    } catch (err: any) {
      toast(`❌ Error: ${err?.message || 'Sync failed'}`, 'error');
    } finally {
      setSyncingId(null);
    }
  };

  const handleDeleteBridalFromCalendar = async (b: BridalBooking) => {
    setSyncingId(b.id);
    try {
      const res = await fetch('/api/calendar/auto-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'delete_bridal',
          bridal: b,
          settings: data?.settings,
        }),
      });
      const resData = await res.json();
      if (resData.success) {
        toast(`🗑️ "${b.name}" ની બધી Events Google Calendar માંથી સફળતાપૂર્વક ડિલીટ થઈ! (${resData.message || 'Deleted'})`, 'info');
      } else {
        toast(`❌ Delete failed: ${resData.error || 'Unknown error'}`, 'error');
      }
    } catch (err: any) {
      toast(`❌ Error: ${err?.message || 'Delete failed'}`, 'error');
    } finally {
      setSyncingId(null);
    }
  };

  const handleBulkSyncBridal = async () => {
    setBulkSyncing(true);
    try {
      const activeBridals = (data?.bridal || []).filter((b) => b.status !== 'Cancelled');
      toast('⏳ બધા Bridal Bookings Google Calendar માં sync થઈ રહ્યા છે...', 'info');
      const res = await fetch('/api/calendar/auto-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'bulk',
          bridals: activeBridals,
          settings: data?.settings,
        }),
      });
      const resData = await res.json();
      if (resData.success) {
        toast(`✅ ${resData.message || 'બધા Bridal Bookings Google Calendar માં Sync થઈ ગયા!'}`);
      } else {
        toast(resData.error || 'Failed to sync to Google Calendar', 'error');
      }
    } catch (err: any) {
      toast('Network error during Google Calendar sync', 'error');
    } finally {
      setBulkSyncing(false);
    }
  };

  const eventSummary = (b: BridalBooking) => [
    (b.includeWedding !== false && b.weddingDate) && `Wedding: ${fmtDate(b.weddingDate)}${b.weddingTime ? ` @ ${b.weddingTime}` : ''}`,
    (b.includeSagai && b.sagaiDate) && `Sagai: ${fmtDate(b.sagaiDate)}${b.sagaiTime ? ` @ ${b.sagaiTime}` : ''}`,
    (b.includeMandap !== false && b.mandapDate) && `Mandap: ${fmtDate(b.mandapDate)}${b.mandapTime ? ` @ ${b.mandapTime}` : ''}`,
    (b.includeMusic !== false && b.musicDate) && `Music: ${fmtDate(b.musicDate)}${b.musicTime ? ` @ ${b.musicTime}` : ''}`,
    (b.includeOther && b.otherDate) && `${b.otherEventName || 'Pre-Event'}: ${fmtDate(b.otherDate)}${b.otherTime ? ` @ ${b.otherTime}` : ''}`,
  ].filter(Boolean).join(' • ');

  const handleSendEmailBridal = async (b: BridalBooking) => {
    const cleanEmail = b.email?.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      toast(`No email address recorded for ${b.name}.`, 'error');
      return;
    }
    const salon = data?.settings?.salon || 'Shree Beauty Studio';
    toast(`⏳ Dispatching bridal confirmation email to ${cleanEmail}…`, 'info');
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'confirmation',
          to: cleanEmail,
          subject: `👑 Bridal Booking Confirmed — ${b.packageName || 'Bridal Package'} at ${salon}`,
          customerName: b.name,
          service: b.packageName || 'Bridal & Events Package',
          staff: 'Studio Bridal Specialist',
          date: b.weddingDate || b.date,
          time: b.weddingTime || '16:00',
          price: b.package,
          address: data?.settings?.address,
          salonName: salon,
          apiKey: data?.settings?.resendApiKey,
          fromEmail: data?.settings?.resendFromEmail,
        }),
      });
      const resJson = await res.json();
      if (resJson.success) {
        toast(`📧 Bridal confirmation email dispatched to ${cleanEmail}!`);
      } else {
        toast(resJson.error || 'Failed to dispatch email.', 'error');
      }
    } catch {
      toast('Network error sending email.', 'error');
    }
  };

  const handleSendWhatsAppAPIBridal = async (b: BridalBooking) => {
    if (!b.mobile) {
      toast(`No mobile number found for ${b.name}.`, 'error');
      return;
    }
    const salon = data?.settings?.salon || 'Shree Beauty Studio';
    const msg = bridalMessage(b.name, eventSummary(b) || 'Bridal & Events', b.weddingDate || b.date, b.venue || '', salon);
    toast(`⏳ Sending WhatsApp via Cloud API to ${b.name}…`, 'info');
    try {
      const res = await sendDirectWhatsAppMessage(b.mobile, msg, data?.settings);
      if (res.success) {
        toast(`⚡ WhatsApp confirmation dispatched to ${b.name} via API!`);
      } else {
        toast(`⚠️ API Send: ${res.message || 'Outside 24h window'}. Use Direct WA button.`, 'error');
      }
    } catch (err: any) {
      toast(`⚠️ WhatsApp API Error: ${err?.message || 'Failed'}`);
    }
  };

  const handleSendDirectWABridal = (b: BridalBooking) => {
    if (!b.mobile) {
      toast(`No mobile number found for ${b.name}.`, 'error');
      return;
    }
    const salon = data?.settings?.salon || 'Shree Beauty Studio';
    const msg = bridalMessage(b.name, eventSummary(b) || 'Bridal & Events', b.weddingDate || b.date, b.venue || '', salon);
    openWAApp(b.mobile, msg);
    toast(`📲 Opened WhatsApp App / Web for ${b.name}`);
  };

  // Generate an official Invoice with package line items
  // Generate an official Invoice with package line items
  const handleGenerateInvoice = (b: BridalBooking) => {
    const totalPkg = Number(b.package || 0) || resolveBridalBookingPrice(b, bridalPackages, data?.services);
    
    // 1. Build line items with full support for selectedPackages and ticked multi-events
    let lines: InvoiceLine[] = [];

    if (b.selectedPackages && b.selectedPackages.length > 0) {
      lines = b.selectedPackages.map((p) => ({
        type: 'S',
        name: (b.includeClientNamesInBill !== false && p.customerName?.trim()) ? `${p.name} — 👤 ${p.customerName.trim()}` : p.name,
        qty: 1,
        price: Number(p.price || 0) || resolveBridalBookingPrice({ packageName: p.name }, bridalPackages, data?.services),
        discount: 0,
        discountType: '%',
      }));
    } else {
      // Collect all ticked / dated events
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
        const perEventPrice = Math.round(totalPkg / events.length);
        lines = events.map((ev, idx) => {
          const isLast = idx === events.length - 1;
          const price = isLast ? totalPkg - perEventPrice * (events.length - 1) : perEventPrice;
          return {
            type: 'S',
            name: `${b.packageName ? `[${b.packageName}] ` : ''}${ev.name}${ev.date ? ` (${fmtDate(ev.date)}${ev.time ? ` @ ${ev.time}` : ''})` : ''}`,
            qty: 1,
            price,
            discount: 0,
            discountType: '%',
          };
        });
      } else if (b.selectedEvents && b.selectedEvents.length > 0) {
        const perEventPrice = Math.round(totalPkg / b.selectedEvents.length);
        lines = b.selectedEvents.map((evName, idx) => {
          const isLast = idx === b.selectedEvents!.length - 1;
          const price = isLast ? totalPkg - perEventPrice * (b.selectedEvents!.length - 1) : perEventPrice;
          return {
            type: 'S',
            name: `${b.packageName ? `[${b.packageName}] ` : ''}${evName} Makeup & Styling`,
            qty: 1,
            price,
            discount: 0,
            discountType: '%',
          };
        });
      } else {
        lines = [
          {
            type: 'S',
            name: b.packageName 
              ? `${b.packageName}${b.packageType && !b.packageName.toLowerCase().includes('package') ? ` (${b.packageType})` : ''}`
              : (b.packageType || 'Bridal & Makeup Package'),
            qty: 1,
            price: totalPkg,
            discount: 0,
            discountType: '%',
          },
        ];
      }
    }

    const existingInv = (data?.invoices || []).find(
      (i) => (b.invoiceId && i.id === b.invoiceId) || i.bridalBookingId === b.id || (i.mobile === b.mobile && i.customer === b.name)
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
      eventDate: b.weddingDate || b.date,
      venue: b.venue || '',
      lines,
      subtotal: totalPkg,
      discount: 0,
      total: totalPkg,
      advance: advPaid,
      advanceMode: (b as any).advanceAccount || b.advanceMode || 'Cash',
      paid: 0,
      balance: bal,
      mode: (b as any).advanceAccount || b.advanceMode || data?.settings?.payments?.[0] || 'Cash',
    };

    updateData((d) => {
      const otherInvoices = (d.invoices || []).filter((i) => i.id !== invId);
      const updatedBridal = (d.bridal || []).map((br) =>
        br.id === b.id ? { ...br, invoiceId: invId } : br
      );
      return {
        ...d,
        invoiceSeq: invSeq,
        invoices: [newInv, ...otherInvoices],
        bridal: updatedBridal,
      };
    });

    scheduleSave();
    toast(`🧾 Bill ${invNo} generated for ${b.name}!`);

    // Auto-send WhatsApp PDF if possible (safe catch to avoid silent crash)
    if (newInv.mobile) {
      sendInvoicePDFViaWhatsApp(newInv, data)
        .then((res) => {
          if (res?.method === 'cloud_api') toast('✅ PDF Bill sent automatically via WhatsApp!');
        })
        .catch(() => {
          // Handled gracefully - user can download or share in receipt modal
        });
    }

    setReceiptModalInv(newInv);
  };

  const handleViewPDF = (b: BridalBooking) => {
    const existingInv = (data?.invoices || []).find(
      (i) => (b.invoiceId && i.id === b.invoiceId) || i.bridalBookingId === b.id || (i.mobile === b.mobile && i.customer === b.name)
    );

    if (existingInv) {
      if (!b.invoiceId || existingInv.bridalBookingId !== b.id) {
        updateData((d) => ({
          ...d,
          bridal: (d.bridal || []).map((item) => (item.id === b.id ? { ...item, invoiceId: existingInv.id } : item)),
          invoices: (d.invoices || []).map((inv) => (inv.id === existingInv.id ? { ...inv, bridalBookingId: b.id } : inv)),
        }));
        scheduleSave();
      }
      setReceiptModalInv(existingInv);
    } else {
      handleGenerateInvoice(b);
    }
  };

  const handleMoveToInvoiceHistory = (b: BridalBooking) => {
    const existingInv = (data?.invoices || []).find(
      (i) => (b.invoiceId && i.id === b.invoiceId) || i.bridalBookingId === b.id || (i.mobile === b.mobile && i.customer === b.name)
    );

    if (existingInv) {
      if (!b.invoiceId || existingInv.bridalBookingId !== b.id) {
        updateData((d) => ({
          ...d,
          bridal: (d.bridal || []).map((item) => (item.id === b.id ? { ...item, invoiceId: existingInv.id } : item)),
          invoices: (d.invoices || []).map((inv) => (inv.id === existingInv.id ? { ...inv, bridalBookingId: b.id } : inv)),
        }));
        scheduleSave();
      }
      toast(`✅ ${b.name}'s invoice ${existingInv.no} is already in Invoice History! (No duplicate created)`, 'success');
      router.push(`/admin/billing?tab=history&search=${encodeURIComponent(existingInv.no)}`);
      return;
    }

    handleGenerateInvoice(b);
    toast(`✅ Moved ${b.name} to Invoice History! (No duplicate created)`, 'success');
    router.push(`/admin/billing?tab=history&search=${encodeURIComponent(b.name)}`);
  };

  const packagesForType = bridalPackages.filter((p) => p.type === catalogCategory);

  const sidersPackages = bridalPackages.filter((p) => p.type === 'Siders Package');
  const bridalFullPackages = bridalPackages.filter((p) => p.type === 'Bridal Package');

  return (
    <div>
      {/* Unified Bridal Booking Card (Exact Same Layout as Billing POS) */}
      <div className="billing-layout">
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
          {/* Editing Banner */}
          {editId && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
                padding: '6px 10px',
                background: '#eff6ff',
                borderRadius: 8,
                border: '1px solid #bfdbfe',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8' }}>
                ✎ Editing Bridal Booking: {form.name || ''}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => openNew(true)}
                style={{ fontSize: 11, padding: '2px 8px', height: 24, borderRadius: 6, color: '#dc2626' }}
              >
                Cancel Edit
              </button>
            </div>
          )}

          {/* Customer / Bride Information (Up & Down POS Layout) */}
          <div
            className="billing-customer-grid"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              marginBottom: 6,
            }}
          >
            {!sharedCustomer && (
            <>
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
                  <span>Bride / Customer Name</span>
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
                name="bridal_customer_name_pos"
                className="input"
                list="bridal-cust-name-list"
                autoComplete="off"
                value={form.name || ''}
                onBlur={() => setTimeout(() => autoMatchCustomerByName(form.name || ''), 200)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    autoMatchCustomerByName(form.name || '');
                  }
                }}
                onChange={(e) => handleSelectCustomerName(autoCapitalizeName(e.target.value))}
                placeholder="Start typing bride name or contact…"
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
              <datalist id="bridal-cust-name-list">
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
                name="bridal_customer_mobile_pos"
                className="input"
                list="bridal-cust-mob-list"
                autoComplete="off"
                value={form.mobile || ''}
                onChange={(e) => handleSelectCustomerMobile(e.target.value)}
                placeholder="10-digit mobile number"
                style={{
                  height: 42,
                  fontSize: 17.5,
                  borderRadius: 8,
                  padding: '0 12px',
                  border: '1.5px solid #cbd5e1',
                  fontWeight: 600,
                }}
              />
              <datalist id="bridal-cust-mob-list">
                {(data?.customers || []).map((c) => (
                  <option key={c.id} value={`${c.mobile} (${formatCustomerContactName(c.name)})`}>
                    {c.mobile} — 👤 {formatCustomerContactName(c.name)}
                  </option>
                ))}
              </datalist>
              {(form.mobile || '').length === 10 && cust24hStatus.active ? (
                <div style={{ marginTop: 2, display: 'flex', alignItems: 'center', fontSize: 9.5 }}>
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
            </>
            )}

            {/* Compact Venue & Birthday Strip */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
                gap: 6,
                marginTop: 2,
              }}
            >
              <input
                type="text"
                className="input"
                value={form.venue || ''}
                onChange={(e) => set('venue', e.target.value)}
                placeholder="📍 Wedding Venue (e.g. Katargam, Surat)"
                style={{
                  height: 40,
                  fontSize: 15,
                  borderRadius: 8,
                  padding: '0 10px',
                  border: '1.5px solid #cbd5e1',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 40, border: '1.5px solid #cbd5e1', borderRadius: 8, padding: '0 10px', background: '#ffffff' }}>
                <span style={{ fontSize: 12.5, color: '#64748b', fontWeight: 700, whiteSpace: 'nowrap' }}>🎂 B'day:</span>
                <input
                  type="date"
                  value={form.birthday || ''}
                  onChange={(e) => set('birthday', e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    fontSize: 14,
                    fontWeight: 600,
                    flex: 1,
                    minWidth: 0,
                    background: 'transparent',
                    color: '#0f172a',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Quick Package Selector & Custom Add Row */}
          <div
            style={{
              display: 'flex',
              gap: 6,
              alignItems: 'center',
              flexWrap: 'wrap',
              margin: '4px 0 8px',
            }}
          >
            <select
              value=""
              onChange={(e) => {
                const chosen = bridalPackages.find((p) => (p.id || p.name) === e.target.value);
                if (chosen) {
                  const already = (form.selectedPackages || []).some(
                    (p) => p.name.trim().toLowerCase() === chosen.name.trim().toLowerCase() || (p.id && chosen.id && p.id === chosen.id)
                  );
                  if (already) addPackageInstance(chosen);
                  else togglePackage(chosen);
                  e.target.value = '';
                }
              }}
              style={{
                flex: '1 1 210px',
                minWidth: 0,
                height: 42,
                border: '1.5px solid #cbd5e1',
                borderRadius: 8,
                padding: '0 10px',
                fontSize: 15.5,
                fontWeight: 600,
                background: '#ffffff',
                color: '#0f172a',
                cursor: 'pointer',
              }}
            >
              <option value="" disabled>
                Quick Add Bridal / Siders / Makeup Package…
              </option>
              {bridalPackages.map((pkg) => (
                <option key={pkg.id || pkg.name} value={pkg.id || pkg.name}>
                  {pkg.name} ({pkg.type}) — {money(pkg.price)}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={addCustomPackage}
              style={{
                height: 42,
                padding: '0 14px',
                fontSize: 15,
                fontWeight: 700,
                borderRadius: 8,
                flexShrink: 0,
              }}
              title="Add custom package or service row"
            >
              <Plus size={15} /> Custom
            </button>
          </div>

          {/* Selected Packages Line Items Section (Exact POS Invoice Line Items Style) */}
          <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
                flexWrap: 'wrap',
                gap: 6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <label className="label" style={{ margin: 0, fontWeight: 800, fontSize: 12.5 }}>
                  Selected Packages
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
                  {(form.selectedPackages || []).length}
                </span>
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    color: form.includeClientNamesInBill !== false ? '#05424A' : '#64748b',
                    cursor: 'pointer',
                    background: '#f8fafc',
                    padding: '2px 7px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                  }}
                  title="બિલ / રસીદમાં દરેક પેકેજ સાથે કસ્ટમરનું નામ દર્શાવવું છે કે નહીં?"
                >
                  <input
                    type="checkbox"
                    checked={form.includeClientNamesInBill !== false}
                    onChange={(e) => set('includeClientNamesInBill', e.target.checked)}
                    style={{ accentColor: '#05424A' }}
                  />
                  <span>બિલમાં નામ દર્શાવો</span>
                </label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {(form.selectedPackages || []).length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({
                        ...prev,
                        selectedPackages: [],
                        packageName: '',
                        package: 0,
                        balance: 0,
                      }));
                    }}
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
                  >
                    <Trash2 size={11} />
                    <span>Clear All</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowCatalogGrid((v) => !v)}
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
                  {showCatalogGrid ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  <span>Catalog</span>
                </button>
              </div>
            </div>

            {(form.selectedPackages || []).length > 0 && (
              <>
                {/* 1. Desktop POS Table View */}
                <div className="billing-lines-desktop" style={{ marginBottom: 8 }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(180px, 1.4fr) minmax(190px, 1.6fr) 115px 68px',
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
                    <span>Package Description</span>
                    <span>Client / Person Name</span>
                    <span style={{ textAlign: 'right' }}>Price (₹)</span>
                    <span></span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 240, overflowY: 'auto', paddingRight: 2 }}>
                    {(form.selectedPackages || []).map((pkg, idx) => {
                      const isBridal = pkg.type === 'Bridal Package';
                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'minmax(180px, 1.4fr) minmax(190px, 1.6fr) 115px 68px',
                            gap: 6,
                            alignItems: 'start',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span
                              className={`badge ${isBridal ? 'badge-gold' : 'badge-blue'}`}
                              style={{
                                fontSize: 13.5,
                                padding: '3px 6px',
                                border: 'none',
                                flexShrink: 0,
                                borderRadius: 6,
                              }}
                              title={pkg.type || 'Package'}
                            >
                              {isBridal ? '👰' : '✨'}
                            </span>
                            <input
                              type="text"
                              className="input"
                              value={pkg.name || ''}
                              onChange={(e) => updatePackageName(idx, e.target.value)}
                              placeholder="Package Name"
                              style={{
                                height: 36,
                                fontSize: 15,
                                padding: '0 8px',
                                border: '1px solid #cbd5e1',
                                borderRadius: 6,
                                fontWeight: 600,
                              }}
                            />
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {(pkg.hasCustomName || pkg.customerName) ? (
                              <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <input
                                    type="text"
                                    className="input"
                                    list="bridal-package-clients-datalist"
                                    placeholder="Client name (Bride / Sister…)"
                                    value={pkg.customerName || ''}
                                    onChange={(e) => updatePackageCustomerName(idx, e.target.value, true)}
                                    style={{
                                      height: 36,
                                      fontSize: 14.5,
                                      padding: '0 8px',
                                      border: '1px solid #05424A',
                                      borderRadius: 6,
                                      flex: 1,
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => updatePackageCustomerName(idx, '', false)}
                                    title="Remove client name"
                                    style={{
                                      height: 36,
                                      padding: '0 7px',
                                      borderRadius: 6,
                                      border: '1px solid #fecaca',
                                      background: '#fff1f2',
                                      color: '#dc2626',
                                      fontSize: 11,
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    ✕
                                  </button>
                                </div>
                                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                                  {form.name && (
                                    <button
                                      type="button"
                                      onClick={() => updatePackageCustomerName(idx, form.name || '', true)}
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        padding: '1px 6px',
                                        borderRadius: 4,
                                        border: '1px solid #05424A',
                                        background: pkg.customerName === form.name ? '#05424A' : '#f0fdfa',
                                        color: pkg.customerName === form.name ? '#ffffff' : '#05424A',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      👰 {form.name}
                                    </button>
                                  )}
                                  {['Sister', 'Mother', 'Bhabhi', 'Masi', 'Kaki', 'Friend'].map((rel) => (
                                    <button
                                      key={rel}
                                      type="button"
                                      onClick={() => {
                                        const current = (pkg.customerName || '').trim();
                                        if (!current) updatePackageCustomerName(idx, rel, true);
                                        else if (!current.toLowerCase().includes(rel.toLowerCase())) {
                                          updatePackageCustomerName(idx, `${current} (${rel})`, true);
                                        }
                                      }}
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 600,
                                        padding: '1px 5px',
                                        borderRadius: 4,
                                        border: '1px solid #cbd5e1',
                                        background: '#f8fafc',
                                        color: '#475569',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      +{rel}
                                    </button>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => updatePackageCustomerName(idx, '', true)}
                                style={{
                                  height: 36,
                                  padding: '0 10px',
                                  borderRadius: 6,
                                  border: '1px dashed #cbd5e1',
                                  background: '#f8fafc',
                                  color: '#475569',
                                  fontSize: 12.5,
                                  fontWeight: 600,
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                }}
                              >
                                <User size={13} /> + Add Person Name
                              </button>
                            )}
                          </div>

                          <input
                            type="number"
                            min="0"
                            className="input"
                            placeholder="0"
                            value={pkg.price !== undefined && pkg.price !== null ? pkg.price : ''}
                            onChange={(e) => updatePackagePrice(idx, Math.max(0, Number(e.target.value)))}
                            style={{
                              textAlign: 'right',
                              height: 36,
                              fontSize: 15.5,
                              fontWeight: 700,
                              padding: '0 6px',
                              border: '1px solid #cbd5e1',
                              borderRadius: 6,
                            }}
                          />

                          <div style={{ display: 'flex', gap: 4, alignItems: 'center', height: 36 }}>
                            <button
                              type="button"
                              className="btn-icon"
                              onClick={() => addPackageInstance(pkg as BridalPackage)}
                              title="Duplicate for another person"
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: 6,
                                border: '1px solid #cbd5e1',
                                background: '#f8fafc',
                                color: '#05424A',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Plus size={14} />
                            </button>
                            <button
                              type="button"
                              className="btn-icon danger"
                              onClick={() => removePackageInstance(idx)}
                              title="Remove package"
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: 6,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Mobile Responsive Cards View */}
                <div className="billing-lines-mobile" style={{ maxHeight: '260px', overflowY: 'auto', marginBottom: 8 }}>
                  {(form.selectedPackages || []).map((pkg, idx) => {
                    const isBridal = pkg.type === 'Bridal Package';
                    return (
                      <div
                        key={idx}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: 7,
                          padding: '6px 8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                        }}
                      >
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span
                            className={`badge ${isBridal ? 'badge-gold' : 'badge-blue'}`}
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
                          >
                            {isBridal ? '👰' : '✨'}
                          </span>
                          <input
                            type="text"
                            className="input"
                            value={pkg.name || ''}
                            onChange={(e) => updatePackageName(idx, e.target.value)}
                            placeholder="Package Name"
                            style={{ flex: 1, height: 42, fontSize: 17, padding: '0 10px', borderRadius: 8 }}
                          />
                          <button
                            type="button"
                            className="btn-icon danger"
                            style={{ width: 40, height: 42, borderRadius: 7, flexShrink: 0 }}
                            onClick={() => removePackageInstance(idx)}
                            title="Remove package"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 115px auto', gap: 6, alignItems: 'center' }}>
                          <div>
                            <span style={{ fontSize: 11, color: '#64748b', display: 'block', fontWeight: 700, marginBottom: 2 }}>
                              PERSON NAME
                            </span>
                            {(pkg.hasCustomName || pkg.customerName) ? (
                              <input
                                type="text"
                                className="input"
                                list="bridal-package-clients-datalist"
                                placeholder="Bride / Sister…"
                                value={pkg.customerName || ''}
                                onChange={(e) => updatePackageCustomerName(idx, e.target.value, true)}
                                style={{ height: 36, fontSize: 15, padding: '0 8px' }}
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => updatePackageCustomerName(idx, '', true)}
                                style={{
                                  width: '100%',
                                  height: 36,
                                  borderRadius: 6,
                                  border: '1px dashed #cbd5e1',
                                  background: '#f8fafc',
                                  color: '#475569',
                                  fontSize: 12.5,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                + Person Name
                              </button>
                            )}
                          </div>
                          <div>
                            <span style={{ fontSize: 11, color: '#64748b', display: 'block', fontWeight: 700, marginBottom: 2 }}>
                              PRICE (₹)
                            </span>
                            <input
                              type="number"
                              min="0"
                              className="input"
                              placeholder="0"
                              value={pkg.price !== undefined && pkg.price !== null ? pkg.price : ''}
                              onChange={(e) => updatePackagePrice(idx, Math.max(0, Number(e.target.value)))}
                              style={{ textAlign: 'right', height: 36, fontSize: 17, padding: '0 6px', fontWeight: 700 }}
                            />
                          </div>
                          <div style={{ paddingTop: 15 }}>
                            <button
                              type="button"
                              onClick={() => addPackageInstance(pkg as BridalPackage)}
                              style={{
                                height: 36,
                                padding: '0 9px',
                                borderRadius: 6,
                                border: '1px solid #cbd5e1',
                                background: '#f8fafc',
                                color: '#05424A',
                                fontWeight: 700,
                                fontSize: 12,
                                cursor: 'pointer',
                              }}
                              title="Add another person"
                            >
                              +1
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <datalist id="bridal-package-clients-datalist">
                  {form.name && <option value={form.name}>{form.name} (Bride)</option>}
                  {(data?.customers || []).map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} — 📞 {c.mobile}
                    </option>
                  ))}
                </datalist>
              </>
            )}

            {/* Quick Catalog Picker Cards (Compact Small POS Cards) */}
            {showCatalogGrid && (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: '6px 8px',
                }}
              >
                <div style={{ display: 'flex', gap: 5, marginBottom: 6, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${catalogCategory === 'Bridal Package' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setCatalogCategory('Bridal Package')}
                    style={{ height: 27, padding: '0 9px', fontSize: 11.5, fontWeight: 700, borderRadius: 6 }}
                  >
                    👰 Bridal Packages
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${catalogCategory === 'Siders Package' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setCatalogCategory('Siders Package')}
                    style={{ height: 27, padding: '0 9px', fontSize: 11.5, fontWeight: 700, borderRadius: 6 }}
                  >
                    ✨ Siders Packages
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${catalogCategory === 'Makeup Package' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setCatalogCategory('Makeup Package')}
                    style={{ height: 27, padding: '0 9px', fontSize: 11.5, fontWeight: 700, borderRadius: 6 }}
                  >
                    💄 Makeup Packages
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 6 }}>
                  {packagesForType.map((pkg) => {
                    const matchingCount = (form.selectedPackages || []).filter(
                      (p) => p.name.trim().toLowerCase() === pkg.name.trim().toLowerCase() || (p.id && pkg.id && p.id === pkg.id)
                    ).length;
                    const isSelected = matchingCount > 0;
                    return (
                      <div
                        key={pkg.id || pkg.name}
                        onClick={() => togglePackage(pkg)}
                        title={pkg.includes ? `${pkg.name} — ${pkg.includes}` : pkg.name}
                        style={{
                          padding: '6px 8px',
                          borderRadius: 7,
                          cursor: 'pointer',
                          border: isSelected ? '1.5px solid #05424A' : '1px solid #e2e8f0',
                          background: isSelected ? '#f0fdfa' : '#ffffff',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 3,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: 11.5,
                              color: isSelected ? '#05424A' : '#0f172a',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {pkg.name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                            {matchingCount > 1 && (
                              <span style={{ fontSize: 9.5, fontWeight: 800, background: '#05424A', color: '#ffffff', borderRadius: 99, padding: '0 4px', lineHeight: '14px' }}>
                                ×{matchingCount}
                              </span>
                            )}
                            <div
                              style={{
                                width: 14,
                                height: 14,
                                borderRadius: 3.5,
                                border: isSelected ? '1.5px solid #05424A' : '1.5px solid #cbd5e1',
                                background: isSelected ? '#05424A' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {isSelected && <Check size={10} color="#ffffff" strokeWidth={3} />}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 13.5, fontWeight: 800, color: isSelected ? '#05424A' : '#0f172a' }}>
                            {money(pkg.price)}
                          </span>
                          {isSelected && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                addPackageInstance(pkg);
                              }}
                              style={{
                                fontSize: 10,
                                padding: '1px 6px',
                                borderRadius: 4,
                                border: '1px solid #05424A',
                                background: '#ffffff',
                                color: '#05424A',
                                fontWeight: 700,
                                cursor: 'pointer',
                                lineHeight: 1.3,
                              }}
                              title="Add another person for this package"
                            >
                              + Person
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Event Functions & Timings (Clean Uniform POS Cards) */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label className="label" style={{ margin: 0, fontWeight: 800, fontSize: 12.5 }}>
                  Event Functions &amp; Dates
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
                  {[form.includeWedding !== false, form.includeSagai, form.includeMandap !== false, form.includeMusic !== false, form.includeOther].filter(Boolean).length} Selected
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowEventsSection((v) => !v)}
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
                {showEventsSection ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                <span>{showEventsSection ? 'Hide Dates' : 'Show Dates'}</span>
              </button>
            </div>

            {showEventsSection && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(195px, 1fr))', gap: 6 }}>
                {[
                  {
                    key: 'wedding',
                    label: '👰 Wedding',
                    included: form.includeWedding !== false,
                    includeKey: 'includeWedding' as const,
                    dateKey: 'weddingDate' as const,
                    timeKey: 'weddingTime' as const,
                    defaultTime: '16:00',
                    minDate: todayISO(),
                    onDateChange: handleWeddingDateChange,
                  },
                  {
                    key: 'sagai',
                    label: '💍 Sagai',
                    included: form.includeSagai === true,
                    includeKey: 'includeSagai' as const,
                    dateKey: 'sagaiDate' as const,
                    timeKey: 'sagaiTime' as const,
                    defaultTime: '11:00',
                  },
                  {
                    key: 'mandap',
                    label: '🌺 Mandap',
                    included: form.includeMandap !== false,
                    includeKey: 'includeMandap' as const,
                    dateKey: 'mandapDate' as const,
                    timeKey: 'mandapTime' as const,
                    defaultTime: '10:00',
                  },
                  {
                    key: 'music',
                    label: '🎵 Sangeet',
                    included: form.includeMusic !== false,
                    includeKey: 'includeMusic' as const,
                    dateKey: 'musicDate' as const,
                    timeKey: 'musicTime' as const,
                    defaultTime: '19:00',
                  },
                ].map((ev) => {
                  const dateVal = (form[ev.dateKey] as string) || '';
                  const timeVal = (form[ev.timeKey] as string) || ev.defaultTime;
                  return (
                    <div
                      key={ev.key}
                      style={{
                        background: ev.included ? '#f8fafc' : '#ffffff',
                        border: ev.included ? '1.5px solid #05424A' : '1px solid #e2e8f0',
                        borderRadius: 7,
                        padding: '6px 8px',
                        opacity: ev.included ? 1 : 0.62,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 4 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: ev.included ? '#05424A' : '#64748b', whiteSpace: 'nowrap' }}>
                          {ev.label}
                        </span>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10.5, fontWeight: 700, cursor: 'pointer', color: '#05424A', whiteSpace: 'nowrap' }}>
                          <input
                            type="checkbox"
                            checked={ev.included}
                            onChange={(e) => set(ev.includeKey, e.target.checked)}
                            style={{ accentColor: '#05424A', width: 13, height: 13 }}
                          />
                          <span>Include</span>
                        </label>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 84px', gap: 4 }}>
                        <input
                          type="date"
                          className="input"
                          min={ev.minDate}
                          disabled={!ev.included}
                          value={dateVal}
                          onChange={(e) => (ev.onDateChange ? ev.onDateChange(e.target.value) : set(ev.dateKey, e.target.value))}
                          style={{ height: 30, fontSize: 11.5, padding: '0 4px', borderRadius: 5, minWidth: 0 }}
                        />
                        <select
                          className="input"
                          disabled={!ev.included}
                          value={timeVal}
                          onChange={(e) => set(ev.timeKey, e.target.value)}
                          style={{ height: 30, fontSize: 11.5, padding: '0 4px', borderRadius: 5, minWidth: 0 }}
                        >
                          {timeVal && !FIFTEEN_MIN_TIME_SLOTS.some((s) => s.value === timeVal) && (
                            <option value={timeVal}>{timeVal}</option>
                          )}
                          {FIFTEEN_MIN_TIME_SLOTS.map((slot) => (
                            <option key={slot.value} value={slot.value}>{slot.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}

                {/* Haldi / Carnival / Pre-Wedding Ceremony */}
                <div
                  style={{
                    background: form.includeOther ? '#f8fafc' : '#ffffff',
                    border: form.includeOther ? '1.5px solid #05424A' : '1px solid #e2e8f0',
                    borderRadius: 7,
                    padding: '6px 8px',
                    opacity: form.includeOther ? 1 : 0.62,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 4 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: form.includeOther ? '#05424A' : '#64748b', whiteSpace: 'nowrap' }}>
                      🎪 Pre-Wed
                    </span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10.5, fontWeight: 700, cursor: 'pointer', color: '#05424A', whiteSpace: 'nowrap' }}>
                      <input
                        type="checkbox"
                        checked={form.includeOther === true}
                        onChange={(e) => set('includeOther', e.target.checked)}
                        style={{ accentColor: '#05424A', width: 13, height: 13 }}
                      />
                      <span>Include</span>
                    </label>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 84px', gap: 4 }}>
                    <input
                      type="date"
                      className="input"
                      disabled={!form.includeOther}
                      value={form.otherDate || ''}
                      onChange={(e) => set('otherDate', e.target.value)}
                      style={{ height: 30, fontSize: 11.5, padding: '0 4px', borderRadius: 5, minWidth: 0 }}
                    />
                    <select
                      className="input"
                      disabled={!form.includeOther}
                      value={form.otherTime || '11:00'}
                      onChange={(e) => set('otherTime', e.target.value)}
                      style={{ height: 30, fontSize: 11.5, padding: '0 4px', borderRadius: 5, minWidth: 0 }}
                    >
                      {form.otherTime && !FIFTEEN_MIN_TIME_SLOTS.some((s) => s.value === form.otherTime) && (
                        <option value={form.otherTime}>{form.otherTime}</option>
                      )}
                      {FIFTEEN_MIN_TIME_SLOTS.map((slot) => (
                        <option key={slot.value} value={slot.value}>{slot.label}</option>
                      ))}
                    </select>
                  </div>
                  {form.includeOther && (
                    <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <select
                        className="input"
                        style={{ height: 26, fontSize: 11, fontWeight: 700, padding: '0 5px', borderRadius: 5 }}
                        value={OTHER_EVENT_OPTIONS.includes(form.otherEventName || '') ? form.otherEventName : 'Custom Event'}
                        onChange={(e) => set('otherEventName', e.target.value)}
                      >
                        {OTHER_EVENT_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      {(!OTHER_EVENT_OPTIONS.includes(form.otherEventName || '') || form.otherEventName === 'Custom Event') && (
                        <input
                          type="text"
                          className="input"
                          style={{ height: 26, fontSize: 11, padding: '0 6px', borderRadius: 5 }}
                          placeholder="Custom event name…"
                          value={form.otherEventName === 'Custom Event' ? '' : form.otherEventName || ''}
                          onChange={(e) => set('otherEventName', e.target.value || 'Custom Event')}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>


          {/* Integrated Settlement Section (Exact POS Checkout Style) */}
          <div id="bridal-checkout-section" style={{ marginTop: 4 }}>
            <div className="billing-checkout-grid">
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                  margin: '4px 0 2px',
                  padding: '2px 4px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#475569', fontWeight: 600 }}>
                  <span>Total Package Price:</span>
                  <span>{money(form.package || 0)}</span>
                </div>
                {Number(form.advance || 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#05424A', fontWeight: 600 }}>
                    <span>Advance Deducted ({form.advanceAccount || paymentOptions[0]}):</span>
                    <span>−{money(form.advance || 0)}</span>
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '4px 0',
                  }}
                >
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                    {Number(form.advance || 0) > 0 ? 'Balance Payable:' : 'Total Payable:'}
                  </span>
                  <span style={{ fontSize: 24, fontWeight: 900, color: '#05424A' }}>
                    {money(form.balance || 0)}
                  </span>
                </div>
              </div>

              <div
                style={{
                  marginTop: 0,
                  background: '#ffffff',
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                }}
              >
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
                        fontSize: 14,
                        fontWeight: 700,
                        color: Number(form.balance || 0) > 0 ? '#dc2626' : '#16a34a',
                        background: Number(form.balance || 0) > 0 ? '#fee2e2' : '#f0fdf4',
                        border: Number(form.balance || 0) > 0 ? '1px solid #fca5a5' : '1px solid #bbf7d0',
                        padding: '2px 8px',
                        borderRadius: 5,
                      }}
                    >
                      {Number(form.balance || 0) > 0 ? `Due: ${money(form.balance || 0)}` : 'Status: ₹0.00'}
                    </span>
                  </div>

                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      cursor: 'pointer',
                      userSelect: 'none',
                      fontSize: 14.5,
                      fontWeight: 700,
                      color: Number(form.package || 0) > 0 && Number(form.balance || 0) === 0 ? '#16a34a' : '#05424A',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={Number(form.package || 0) > 0 && Number(form.balance || 0) === 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          set('advance', Number(form.package || 0));
                        } else {
                          set('advance', 0);
                        }
                      }}
                      style={{ accentColor: '#16a34a', cursor: 'pointer', width: 17, height: 17 }}
                    />
                    <span>Fully Paid</span>
                  </label>
                </div>

                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <select
                    value={form.advanceAccount || paymentOptions[0] || 'Cash'}
                    onChange={(e) => set('advanceAccount', e.target.value)}
                    style={{
                      flex: '1 1 170px',
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
                    {getPaymentOptions(data?.settings?.payments, form.advanceAccount ? [form.advanceAccount] : undefined).map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>

                  <div style={{ width: 150, flex: '0 1 150px', position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span
                      style={{
                        position: 'absolute',
                        left: 8,
                        fontSize: 13.5,
                        fontWeight: 800,
                        color: '#64748b',
                        pointerEvents: 'none',
                      }}
                    >
                      Adv ₹
                    </span>
                    <input
                      type="number"
                      min="0"
                      className="input"
                      placeholder="0"
                      title="Advance Received (₹)"
                      value={form.advance || ''}
                      onChange={(e) => set('advance', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                      style={{
                        textAlign: 'right',
                        height: 42,
                        fontSize: 17.5,
                        fontWeight: 800,
                        padding: '0 8px 0 46px',
                        width: '100%',
                        borderRadius: 8,
                        border: '1.5px solid #cbd5e1',
                      }}
                    />
                  </div>

                  <div style={{ width: 145, flex: '0 1 145px', position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span
                      style={{
                        position: 'absolute',
                        left: 8,
                        fontSize: 13.5,
                        fontWeight: 800,
                        color: '#64748b',
                        pointerEvents: 'none',
                      }}
                    >
                      Pkg ₹
                    </span>
                    <input
                      type="number"
                      min="0"
                      className="input"
                      placeholder="0"
                      title="Total Package Price (₹)"
                      value={form.package || ''}
                      onChange={(e) => set('package', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                      style={{
                        textAlign: 'right',
                        height: 42,
                        fontSize: 17,
                        fontWeight: 700,
                        padding: '0 8px 0 44px',
                        width: '100%',
                        borderRadius: 8,
                        border: '1.5px solid #cbd5e1',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons (Exact 46px POS Action Row) */}
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => openNew(true)}
                style={{
                  padding: '0 16px',
                  height: 46,
                  fontSize: 16,
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
                title="Reset bridal booking form"
              >
                <RotateCcw size={16} />
                <span>{editId ? 'Cancel Edit' : 'All Clear'}</span>
              </button>

              <motion.button
                type="button"
                className="btn"
                onClick={() => handleSave('web')}
                whileTap={{ scale: 0.98 }}
                style={{
                  height: 46,
                  padding: '0 14px',
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                  color: '#ffffff',
                  borderColor: '#128C7E',
                  fontWeight: 800,
                  fontSize: 15,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  boxShadow: '0 2px 6px rgba(37, 211, 102, 0.25)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
                title="Save bridal booking and open WhatsApp Web/App to send confirmation"
              >
                🌐 Web Send &amp; Save
              </motion.button>

              <motion.button
                type="button"
                className="btn"
                onClick={() => handleSave('api')}
                whileTap={{ scale: 0.98 }}
                style={{
                  height: 46,
                  padding: '0 14px',
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#ffffff',
                  borderColor: '#0369a1',
                  fontWeight: 800,
                  fontSize: 15,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
                title="Save bridal booking and send WhatsApp confirmation automatically via Cloud API"
              >
                ⚡ API Send &amp; Save
              </motion.button>

              <motion.button
                type="button"
                className="btn btn-primary"
                onClick={() => handleSave('none')}
                whileTap={{ scale: 0.98 }}
                style={{
                  flex: 1,
                  minWidth: 200,
                  height: 46,
                  padding: '10px 18px',
                  fontSize: 17,
                  fontWeight: 800,
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg, #05424A 0%, #0a6572 100%)',
                  boxShadow: '0 2px 8px rgba(5, 66, 74, 0.25)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                }}
                title="Directly save bridal booking into records & Google Calendar without sending WhatsApp message"
              >
                💾 {editId ? 'Update Bridal Booking' : 'Save Bridal Booking'}
              </motion.button>
            </div>

            {(form.weddingDate || form.sagaiDate || form.mandapDate || form.musicDate || form.otherDate) && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                <a
                  href={getBridalGoogleCalendarUrl(form as any, data?.settings?.salon, data?.settings?.address)}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: '#2563eb',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 11.5,
                  }}
                >
                  <ExternalLink size={12} /> Open preview in Google Calendar ↗
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Smart Mobile Sticky Bottom Action Bar (< 768px, Exact POS Match) */}
      <div className="billing-mobile-bar no-print">
        <div
          style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer', minWidth: 0 }}
          onClick={() => {
            const el = document.getElementById('bridal-checkout-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          title="Click to jump to Payment"
        >
          <div style={{ fontSize: 9.5, color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
            <span>{(form.selectedPackages || []).length} pkg</span>
            <span>•</span>
            <span style={{ color: '#05424A', fontWeight: 700 }}>
              {getPaymentOptionIcon(form.advanceAccount || paymentOptions[0])} {form.advanceAccount || paymentOptions[0]}
            </span>
            <span style={{ fontSize: 9, color: '#05424A' }}>↓</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 900, color: '#05424A', lineHeight: 1.15 }}>
            {money(form.balance || 0)}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => {
              const curr = form.advanceAccount || paymentOptions[0];
              const currentIdx = paymentOptions.indexOf(curr);
              const nextMode = paymentOptions[(currentIdx + 1) % paymentOptions.length] || paymentOptions[0];
              set('advanceAccount', nextMode);
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
              {getPaymentOptionIcon(form.advanceAccount || paymentOptions[0])} {form.advanceAccount || paymentOptions[0]}
            </span>
            <span style={{ fontSize: 9.5, opacity: 0.7 }}>↺</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave('none')}
            style={{
              height: 38,
              padding: '0 14px',
              fontSize: 14,
              fontWeight: 800,
              borderRadius: 7,
              border: 'none',
              background: 'linear-gradient(135deg, #05424A 0%, #0a6572 100%)',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              boxShadow: '0 2px 8px rgba(5, 66, 74, 0.3)',
              whiteSpace: 'nowrap',
            }}
          >
            <CheckCircle size={15} />
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Contact Import Modal */}
      <ContactImportModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        customers={data?.customers || []}
        onSelectContact={(name, mob) => handleImportContact(name, mob)}
      />

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

      {/* Bridal Calendar Sync & 1-Click Add Modal */}
      {calendarModalBridal && (
        <Modal
          isOpen={!!calendarModalBridal}
          onClose={() => setCalendarModalBridal(null)}
          title={`📅 Google Calendar — ${calendarModalBridal.name}`}
          wide
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  downloadBridalICS(calendarModalBridal, data?.settings?.salon, data?.settings?.address);
                  toast('📥 .ics Calendar file downloaded!');
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Download size={14} /> Download .ics File (All Events)
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setCalendarModalBridal(null)}
              >
                Done
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Top Info Banner */}
            <div
              style={{
                background: '#eff6ff',
                border: '1.5px solid #bfdbfe',
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
                <div style={{ fontWeight: 800, fontSize: 15, color: '#1e40af' }}>
                  👑 {calendarModalBridal.name} — {calendarModalBridal.packageName || 'Bridal Package'}
                </div>
                <div style={{ fontSize: 12, color: '#3b82f6', marginTop: 2 }}>
                  📞 +91 {calendarModalBridal.mobile} {calendarModalBridal.venue ? `• 📍 ${calendarModalBridal.venue}` : ''}
                </div>
              </div>

              <motion.button
                type="button"
                className="btn btn-sm"
                disabled={syncingId === calendarModalBridal.id}
                onClick={async () => {
                  await handleSyncSingleBridal(calendarModalBridal);
                }}
                style={{
                  background: '#1d4ed8',
                  color: '#ffffff',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 2px 8px rgba(29, 78, 216, 0.3)',
                }}
                whileTap={{ scale: 0.96 }}
              >
                {syncingId === calendarModalBridal.id ? (
                  <>
                    <Loader2 size={14} className="spin" /> Syncing in Cloud…
                  </>
                ) : (
                  <>
                    <RefreshCw size={14} /> ⚡ 1-Click Cloud Auto-Sync (બધા Events)
                  </>
                )}
              </motion.button>
            </div>

            {/* List of Functions with 1-Click Web Add Buttons */}
            <div>
              <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CalendarDays size={15} color="var(--teal)" /> Scheduled Functions (Google Calendar માં ઉમેરો):
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* 1. Wedding */}
                {(calendarModalBridal.includeWedding !== false && calendarModalBridal.weddingDate) && (
                  <div
                    style={{
                      background: '#faf5ff',
                      border: '1.5px solid #e9d5ff',
                      borderRadius: 10,
                      padding: '12px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 10,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 13.5, color: '#6b21a8' }}>
                        💍 Wedding Makeup (લગ્ન)
                      </div>
                      <div style={{ fontSize: 12, color: '#7e22ce', marginTop: 2 }}>
                        📅 {fmtDate(calendarModalBridal.weddingDate)} @ {calendarModalBridal.weddingTime || '16:00'} (3 Hours)
                      </div>
                    </div>
                    <a
                      href={getBridalFunctionGoogleCalendarUrl(calendarModalBridal, 'wedding', data?.settings?.salon, data?.settings?.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-ghost"
                      style={{
                        background: '#ffffff',
                        borderColor: '#c084fc',
                        color: '#6b21a8',
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                      }}
                    >
                      <ExternalLink size={13} /> ➕ Add Wedding to Google Calendar
                    </a>
                  </div>
                )}

                {/* 2. Mandap Muhurat */}
                {(calendarModalBridal.includeMandap !== false && calendarModalBridal.mandapDate) && (
                  <div
                    style={{
                      background: '#f0fdf4',
                      border: '1.5px solid #bbf7d0',
                      borderRadius: 10,
                      padding: '12px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 10,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 13.5, color: '#166534' }}>
                        🌿 Mandap Muhurat (મંડપ મુહૂર્ત)
                      </div>
                      <div style={{ fontSize: 12, color: '#15803d', marginTop: 2 }}>
                        📅 {fmtDate(calendarModalBridal.mandapDate)} @ {calendarModalBridal.mandapTime || '10:00'} (2 Hours)
                      </div>
                    </div>
                    <a
                      href={getBridalFunctionGoogleCalendarUrl(calendarModalBridal, 'mandap', data?.settings?.salon, data?.settings?.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-ghost"
                      style={{
                        background: '#ffffff',
                        borderColor: '#86efac',
                        color: '#166534',
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                      }}
                    >
                      <ExternalLink size={13} /> ➕ Add Mandap to Google Calendar
                    </a>
                  </div>
                )}

                {/* 3. Music / Sangeet */}
                {(calendarModalBridal.includeMusic !== false && calendarModalBridal.musicDate) && (
                  <div
                    style={{
                      background: '#fffbeb',
                      border: '1.5px solid #fde68a',
                      borderRadius: 10,
                      padding: '12px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 10,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 13.5, color: '#92400e' }}>
                        🎶 Sangeet / Music Night (સંગીત સંધ્યા)
                      </div>
                      <div style={{ fontSize: 12, color: '#b45309', marginTop: 2 }}>
                        📅 {fmtDate(calendarModalBridal.musicDate)} @ {calendarModalBridal.musicTime || '19:00'} (2 Hours)
                      </div>
                    </div>
                    <a
                      href={getBridalFunctionGoogleCalendarUrl(calendarModalBridal, 'music', data?.settings?.salon, data?.settings?.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-ghost"
                      style={{
                        background: '#ffffff',
                        borderColor: '#fcd34d',
                        color: '#92400e',
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                      }}
                    >
                      <ExternalLink size={13} /> ➕ Add Music to Google Calendar
                    </a>
                  </div>
                )}

                {/* 4. Sagai Ceremony */}
                {(calendarModalBridal.includeSagai && calendarModalBridal.sagaiDate) && (
                  <div
                    style={{
                      background: '#fff7ed',
                      border: '1.5px solid #fed7aa',
                      borderRadius: 10,
                      padding: '12px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 10,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 13.5, color: '#9a3412' }}>
                        ✨ Sagai Ceremony (સગાઈ)
                      </div>
                      <div style={{ fontSize: 12, color: '#c2410c', marginTop: 2 }}>
                        📅 {fmtDate(calendarModalBridal.sagaiDate)} @ {calendarModalBridal.sagaiTime || '11:00'} (2 Hours)
                      </div>
                    </div>
                    <a
                      href={getBridalFunctionGoogleCalendarUrl(calendarModalBridal, 'sagai', data?.settings?.salon, data?.settings?.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-ghost"
                      style={{
                        background: '#ffffff',
                        borderColor: '#fdba74',
                        color: '#9a3412',
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                      }}
                    >
                      <ExternalLink size={13} /> ➕ Add Sagai to Google Calendar
                    </a>
                  </div>
                )}

                {/* 5. Other Event */}
                {(calendarModalBridal.includeOther && calendarModalBridal.otherDate) && (
                  <div
                    style={{
                      background: '#fdf2f8',
                      border: '1.5px solid #fbcfe8',
                      borderRadius: 10,
                      padding: '12px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 10,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 13.5, color: '#9d174d' }}>
                        🌸 {calendarModalBridal.otherEventName || 'Pre-Wedding Event'}
                      </div>
                      <div style={{ fontSize: 12, color: '#be185d', marginTop: 2 }}>
                        📅 {fmtDate(calendarModalBridal.otherDate)} @ {calendarModalBridal.otherTime || '11:00'} (2 Hours)
                      </div>
                    </div>
                    <a
                      href={getBridalFunctionGoogleCalendarUrl(calendarModalBridal, 'other', data?.settings?.salon, data?.settings?.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-ghost"
                      style={{
                        background: '#ffffff',
                        borderColor: '#f9a8d4',
                        color: '#9d174d',
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                      }}
                    >
                      <ExternalLink size={13} /> ➕ Add Event to Google Calendar
                    </a>
                  </div>
                )}

                {/* 🗑️ Purge/Delete from Google Calendar */}
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1.5px solid #fecaca',
                    borderRadius: 10,
                    padding: '12px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 10,
                    marginTop: 6,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13.5, color: '#991b1b' }}>
                      🗑️ Google Calendar માંથી Events કાઢી નાખો
                    </div>
                    <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 2 }}>
                      {calendarModalBridal.name} ની બધી જ તારીખો (Wedding, Mandap, Sangeet) ની Events ડિલીટ કરો.
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={syncingId === calendarModalBridal.id}
                    onClick={() => handleDeleteBridalFromCalendar(calendarModalBridal)}
                    style={{
                      background: '#ef4444',
                      borderColor: '#dc2626',
                      color: '#ffffff',
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                    }}
                  >
                    <Trash2 size={13} /> {syncingId === calendarModalBridal.id ? 'Deleting...' : 'Delete from Calendar'}
                  </button>
                </div>

                {/* 💡 Manual delete tip */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 11.5,
                    color: '#64748b',
                    lineHeight: 1.5,
                  }}
                >
                  💡 <strong>Direct Calendar માંથી ડિલીટ કરવા:</strong> Google Calendar (વેબ અથવા ફોન એપ) માં જે ઇવેન્ટ દેખાય છે તેના પર ક્લિક કરીને ઉપર આપેલ <strong>🗑️ Trash (ડિલીટ)</strong> આઇકન પર ક્લિક કરો.
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function BridalPage() {
  return (
    <Suspense fallback={<div>Loading bridal studio…</div>}>
      <BridalPanel />
    </Suspense>
  );
}
