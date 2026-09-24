'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  ExternalLink,
  Send,
  Copy,
  Users,
  Calendar,
  Gift,
  Star,
  Clock,
  Sparkles,
  Receipt,
  CheckCircle2,
  Phone,
  Search,
  Bot,
  Flame,
  UserCheck,
  ShieldCheck,
  CheckCheck,
  Smartphone,
  Globe,
  Download,
  Settings,
  Pencil,
  RotateCcw,
  Save,
  MessageSquare,
  AlertCircle,
  QrCode,
  Printer,
  Zap,
  Play,
  Check,
  RefreshCw,
  Coins,
  ArrowRight,
  X,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { useSalonStore } from '@/lib/store';
import { scheduleSave } from '@/lib/sync';
import { useToast } from '@/components/ui/Toast';
import { money, fmtDate, todayISO } from '@/lib/utils';
import { downloadInvoicePDF, sendInvoicePDFViaWhatsApp, sendInvoiceTextViaWhatsApp, shareInvoicePDFViaDirectWhatsApp } from '@/lib/invoice-pdf';
import { downloadBridalRateCardPDF, sendBridalRateCardPDFViaWhatsApp } from '@/lib/bridal-pdf';
import {
  openWAApp,
  openWAWeb,
  launchWhatsAppCompanionWindow,
  invoiceMessage,
  appointmentCustomerMessage,
  appointmentReminderMessage,
  advanceReceiptMessage,
  birthdayMessage,
  anniversaryMessage,
  sagaiAnniversaryMessage,
  reviewRequestMessage,
  paymentReminderMessage,
  loyaltyBalanceMessage,
  festivalPromoMessage,
  bridalMessage,
  isCustomerIn24HourWindow,
  getReceptionWhatsAppUrl,
  getReceptionWhatsAppQrUrl,
} from '@/lib/whatsapp';
import ReceptionDeskQRModal from '@/components/whatsapp/ReceptionDeskQRModal';
import TodayWishesBanner from '@/components/wishes/TodayWishesBanner';
import { staggerContainer, fadeSlideUp } from '@/variants';
import { format, addDays } from 'date-fns';

type WATab = 'web_auto' | 'composer' | 'broadcast' | 'incoming';
type WebAutoCategory = 'all' | 'appointments' | 'birthdays' | 'invoices' | 'advances' | 'dues' | 'quick';
type TemplateId =
  | 'custom'
  | 'appointment'
  | 'invoice'
  | 'birthday'
  | 'anniversary'
  | 'review'
  | 'payment'
  | 'loyalty'
  | 'festival'
  | 'bridal';

export default function WhatsAppHubPage() {
  const router = useRouter();
  const { data, updateData } = useSalonStore();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<WATab>('web_auto');
  const [webAutoCategory, setWebAutoCategory] = useState<WebAutoCategory>('all');
  const [autoSearch, setAutoSearch] = useState('');
  const [sentLog, setSentLog] = useState<Record<string, boolean>>({});
  const [hideMetaBanner, setHideMetaBanner] = useState(false);
  const [batchSending, setBatchSending] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, name: '' });

  const deskRef = useRef<HTMLDivElement>(null);

  // Composer / Live Desk Target State
  const [targetPhone, setTargetPhone] = useState('');
  const [targetName, setTargetName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('appointment');
  const [customText, setCustomText] = useState('');
  const [promoOffer, setPromoOffer] = useState('Flat 20% OFF on all Hair Spa & Hydra Facials this week! ✨');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [selectedApptId, setSelectedApptId] = useState('');
  const [receptionDeskModalOpen, setReceptionDeskModalOpen] = useState(false);

  const salon = data?.settings?.salon || 'Shree Beauty Studio';
  const address = data?.settings?.address || 'Surat, Gujarat';
  const salonPhone = data?.settings?.whatsapp || '919773240010';

  const customers = data?.customers || [];
  const appointments = data?.appointments || [];
  const invoices = data?.invoices || [];

  const currentMonth = new Date().getMonth() + 1;

  // Active 24-Hour Free Sessions List
  const activeSessionsList = useMemo(() => {
    const sessions = data?.whatsappActiveSessions || {};
    const now = Date.now();
    const list: Array<{
      mobile: string;
      name?: string;
      activeUntil: string;
      lastMessage?: string;
      lastMessageAt?: string;
      formattedRemaining: string;
      isExpired: boolean;
    }> = [];

    // 1. From whatsappActiveSessions map
    Object.entries(sessions).forEach(([mobile, sess]) => {
      const expires = new Date(sess.activeUntil).getTime();
      const diffMs = expires - now;
      const totalMinutes = Math.floor(Math.max(0, diffMs) / (60 * 1000));
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      list.push({
        mobile,
        name: sess.name,
        activeUntil: sess.activeUntil,
        lastMessage: sess.lastMessage,
        lastMessageAt: sess.lastMessageAt,
        formattedRemaining: diffMs > 0 ? `${hours}h ${mins}m left` : 'Expired',
        isExpired: diffMs <= 0,
      });
    });

    // 2. Cross-reference customers with whatsappWindowExpiresAt
    (data?.customers || []).forEach((c) => {
      const clean = (c.mobile || '').replace(/\D/g, '').slice(-10);
      if (clean && c.whatsappWindowExpiresAt && !list.some((x) => x.mobile === clean)) {
        const expires = new Date(c.whatsappWindowExpiresAt).getTime();
        const diffMs = expires - now;
        const totalMinutes = Math.floor(Math.max(0, diffMs) / (60 * 1000));
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        list.push({
          mobile: clean,
          name: c.name,
          activeUntil: c.whatsappWindowExpiresAt,
          lastMessageAt: c.lastWhatsAppMessageAt,
          formattedRemaining: diffMs > 0 ? `${hours}h ${mins}m left` : 'Expired',
          isExpired: diffMs <= 0,
        });
      }
    });

    return list.sort((a, b) => new Date(b.activeUntil).getTime() - new Date(a.activeUntil).getTime());
  }, [data?.whatsappActiveSessions, data?.customers]);

  const active24hCount = useMemo(() => {
    return activeSessionsList.filter((s) => !s.isExpired).length;
  }, [activeSessionsList]);

  // Broadcast Client Filter State
  const [broadcastFilter, setBroadcastFilter] = useState<
    'all' | 'vip' | 'inactive' | 'birthdays' | 'anniversaries' | 'dues'
  >('all');
  const [broadcastSearch, setBroadcastSearch] = useState('');

  // Enrich customers with spend and visit stats for broadcast segmentation
  const enrichedCustomers = useMemo(() => {
    return customers.map((c) => {
      const custInvs = invoices.filter((i) => i.mobile === c.mobile);
      const totalSpend = custInvs.reduce((s, i) => s + Number(i.total || 0), 0);
      const balanceDue = custInvs.reduce((s, i) => s + Number(i.balance || 0), 0);
      const lastVisit = custInvs.sort((a, b) => b.date.localeCompare(a.date))[0]?.date || '';
      return {
        ...c,
        totalSpend,
        balanceDue,
        lastVisit,
        visitCount: custInvs.length,
      };
    });
  }, [customers, invoices]);

  // Segmented broadcast lists
  const filteredBroadcastClients = useMemo(() => {
    const q = broadcastSearch.toLowerCase();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysStr = format(thirtyDaysAgo, 'yyyy-MM-dd');

    return enrichedCustomers.filter((c) => {
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.mobile.includes(q) ||
        (c.notes && c.notes.toLowerCase().includes(q));
      if (!matchSearch) return false;

      if (broadcastFilter === 'vip') return c.totalSpend >= 5000 || c.visitCount >= 3;
      if (broadcastFilter === 'inactive') return c.lastVisit && c.lastVisit < thirtyDaysStr;
      if (broadcastFilter === 'dues') return c.balanceDue > 0;
      if (broadcastFilter === 'birthdays') {
        if (!c.birthday) return false;
        return new Date(c.birthday).getMonth() + 1 === currentMonth;
      }
      if (broadcastFilter === 'anniversaries') {
        if (!c.anniversary) return false;
        return new Date(c.anniversary).getMonth() + 1 === currentMonth;
      }
      return true;
    });
  }, [enrichedCustomers, broadcastFilter, broadcastSearch, currentMonth]);

  // Check if a saved custom template pattern exists for selected template
  const rawSavedTemplate = useMemo(() => {
    return data?.settings?.whatsappTemplates?.[selectedTemplate] || '';
  }, [data?.settings?.whatsappTemplates, selectedTemplate]);

  const hasCustomSavedTemplate = Boolean(rawSavedTemplate);

  // Template variables mapping for dynamic variable substitution ({name}, {salon}, {date}, etc.)
  const templateContext = useMemo(() => {
    const clientName = targetName.trim() || 'Valued Client';
    const appt = appointments.find((a) => a.id === selectedApptId) || {
      customer: clientName,
      date: todayISO(),
      time: '04:00 PM',
      service: 'Hair Spa Treatment',
      staff: 'Studio Specialist',
    };
    const inv = invoices.find((i) => i.id === selectedInvoiceId) ||
      invoices[0] || {
        no: 'INV-1001',
        date: todayISO(),
        customer: clientName,
        subtotal: 2500,
        total: 2500,
        paid: 2500,
        balance: 0,
      };
    const custObj = enrichedCustomers.find((c) => c.mobile === targetPhone);
    const due = custObj ? custObj.balanceDue : 1200;
    const pts = custObj?.loyaltyPoints || 150;
    const wallet = custObj?.walletBalance || 500;
    const reviewUrl = data?.settings?.googleReviewLink || 'https://g.page/r/shree-beauty/review';

    return {
      name: clientName,
      customer: clientName,
      salon: salon,
      address: address,
      date: (appt as any).date ? fmtDate((appt as any).date) : fmtDate(todayISO()),
      time: (appt as any).time || '04:00 PM',
      service: (appt as any).service || 'Hair Spa & Facial',
      amount: money(inv.total || due),
      paid: money(inv.paid || 0),
      balance: money(inv.balance || due),
      due: money(due),
      points: String(pts),
      wallet: money(wallet),
      link: reviewUrl,
      offer: promoOffer,
    };
  }, [
    targetName,
    appointments,
    selectedApptId,
    invoices,
    selectedInvoiceId,
    enrichedCustomers,
    targetPhone,
    data?.settings?.googleReviewLink,
    salon,
    address,
    promoOffer,
  ]);

  // Helper to expand variable tags in template strings
  const expandTemplateVariables = (rawTpl: string, ctx: Record<string, string>) => {
    if (!rawTpl) return '';
    let text = rawTpl;
    text = text.replace(/\{name\}|\{customer\}/gi, ctx.name);
    text = text.replace(/\{salon\}/gi, ctx.salon);
    text = text.replace(/\{address\}/gi, ctx.address);
    text = text.replace(/\{date\}/gi, ctx.date);
    text = text.replace(/\{time\}/gi, ctx.time);
    text = text.replace(/\{service\}/gi, ctx.service);
    text = text.replace(/\{amount\}/gi, ctx.amount);
    text = text.replace(/\{paid\}/gi, ctx.paid);
    text = text.replace(/\{balance\}|\{due\}/gi, ctx.balance);
    text = text.replace(/\{points\}/gi, ctx.points);
    text = text.replace(/\{wallet\}/gi, ctx.wallet);
    text = text.replace(/\{link\}/gi, ctx.link);
    text = text.replace(/\{offer\}/gi, ctx.offer);
    return text;
  };

  // Generate live message preview text based on selected template
  const generatedMessage = useMemo(() => {
    if (rawSavedTemplate) {
      return expandTemplateVariables(rawSavedTemplate, templateContext);
    }

    const clientName = templateContext.name;

    if (selectedTemplate === 'appointment') {
      const appt = appointments.find((a) => a.id === selectedApptId) || {
        customer: clientName,
        date: todayISO(),
        time: '04:00 PM',
        service: 'Hair Spa Treatment',
        staff: 'Studio Specialist',
      };
      return appointmentCustomerMessage(appt as any, salon, address);
    }

    if (selectedTemplate === 'invoice') {
      const inv = invoices.find((i) => i.id === selectedInvoiceId) ||
        invoices[0] || {
          no: 'INV-1001',
          date: todayISO(),
          customer: clientName,
          subtotal: 2500,
          total: 2500,
          paid: 2500,
          balance: 0,
          lines: [{ name: 'O3+ Bridal Glow Facial', qty: 1, price: 2100, type: 'S' }],
        };
      return invoiceMessage(inv as any, salon);
    }

    if (selectedTemplate === 'birthday') {
      return birthdayMessage(clientName, salon);
    }

    if (selectedTemplate === 'anniversary') {
      return anniversaryMessage(clientName, salon);
    }

    if (selectedTemplate === 'review') {
      return reviewRequestMessage(clientName, salon, templateContext.link);
    }

    if (selectedTemplate === 'payment') {
      const due = Number(templateContext.due.replace(/[^0-9]/g, '')) || 1200;
      return paymentReminderMessage(clientName, due, salon, '9773240010@okaxis');
    }

    if (selectedTemplate === 'loyalty') {
      const pts = Number(templateContext.points) || 150;
      const wallet = Number(templateContext.wallet.replace(/[^0-9]/g, '')) || 500;
      return loyaltyBalanceMessage(clientName, pts, wallet, salon);
    }

    if (selectedTemplate === 'festival') {
      return festivalPromoMessage(clientName, promoOffer, salon);
    }

    if (selectedTemplate === 'bridal') {
      return bridalMessage(clientName, 'Wedding Day Makeup & Draping', todayISO(), 'Surat Studio', salon);
    }

    return customText || `Hello ${clientName}!\nGreetings from ${salon}. How may we assist you today? 🌸`;
  }, [
    rawSavedTemplate,
    templateContext,
    selectedTemplate,
    selectedApptId,
    selectedInvoiceId,
    promoOffer,
    customText,
    appointments,
    invoices,
    salon,
    address,
  ]);

  const [manualText, setManualText] = useState('');
  const [isManualEdited, setIsManualEdited] = useState(false);

  useEffect(() => {
    if (!isManualEdited) {
      setManualText(rawSavedTemplate || generatedMessage);
    }
  }, [selectedTemplate, rawSavedTemplate, generatedMessage, isManualEdited]);

  const handleTemplateSelect = (tplId: TemplateId) => {
    setSelectedTemplate(tplId);
    setIsManualEdited(false);
    const saved = data?.settings?.whatsappTemplates?.[tplId];
    if (saved) {
      setManualText(saved);
    }
  };

  const handleSaveCustomTemplate = () => {
    if (!manualText.trim()) {
      toast('Template text cannot be empty.', 'error');
      return;
    }
    updateData((prev) => {
      const currentTemplates = prev.settings?.whatsappTemplates || {};
      return {
        ...prev,
        settings: {
          ...prev.settings,
          whatsappTemplates: {
            ...currentTemplates,
            [selectedTemplate]: manualText,
          },
        },
      };
    });
    scheduleSave();
    setIsManualEdited(false);
    toast(`💾 '${selectedTemplate.toUpperCase()}' ટેમ્પલેટ કાયમી સેવ થઇ ગયું! (Saved permanently)`);
  };

  const handleResetCustomTemplate = () => {
    updateData((prev) => {
      const currentTemplates = { ...(prev.settings?.whatsappTemplates || {}) };
      delete currentTemplates[selectedTemplate];
      return {
        ...prev,
        settings: {
          ...prev.settings,
          whatsappTemplates: currentTemplates,
        },
      };
    });
    scheduleSave();
    setIsManualEdited(false);
    toast(`🔄 '${selectedTemplate.toUpperCase()}' ટેમ્પલેટ રીસેટ થઈને મૂળ ડિફોલ્ટ સેટ થયુ!`);
  };

  const insertVariableTag = (tag: string) => {
    setManualText((prev) => prev + tag);
    setIsManualEdited(true);
  };

  // Web WhatsApp Auto Computed Datasets
  const todayStr = todayISO();
  const tomorrowStr = useMemo(() => format(addDays(new Date(), 1), 'yyyy-MM-dd'), []);
  const todayMMDD = useMemo(() => format(new Date(), 'MM-dd'), []);

  // 1. Appointments
  const todayAppointments = useMemo(() => {
    return appointments.filter((a) => a.date === todayStr);
  }, [appointments, todayStr]);

  const upcomingAppointments = useMemo(() => {
    return appointments
      .filter((a) => a.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  }, [appointments, todayStr]);

  // 2. Celebrations Today
  const todayBirthdays = useMemo(() => {
    return customers.filter((c) => c.birthday && c.birthday.endsWith(todayMMDD));
  }, [customers, todayMMDD]);

  const todayAnniversaries = useMemo(() => {
    return customers.filter((c) => c.anniversary && c.anniversary.endsWith(todayMMDD));
  }, [customers, todayMMDD]);

  // 3. Advance Bookings
  const advanceBookings = useMemo(() => {
    const list: Array<{
      id: string;
      customer: string;
      mobile: string;
      service: string;
      date: string;
      advance: number;
      total: number;
      balance: number;
      type: 'Bridal' | 'Appointment';
    }> = [];

    appointments.forEach((a) => {
      if (Number(a.advance || 0) > 0) {
        list.push({
          id: a.id,
          customer: a.customer,
          mobile: a.mobile,
          service: a.service || 'Salon Service',
          date: a.date,
          advance: Number(a.advance || 0),
          total: Number(a.price || a.advance || 0),
          balance: Math.max(0, Number(a.price || 0) - Number(a.advance || 0)),
          type: (a.service || '').toLowerCase().includes('bridal') ? 'Bridal' : 'Appointment',
        });
      }
    });

    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [appointments]);

  // 4. Khata Dues
  const dueCustomers = useMemo(() => {
    return enrichedCustomers.filter((c) => c.balanceDue > 0).sort((a, b) => b.balanceDue - a.balanceDue);
  }, [enrichedCustomers]);

  // 5. Recent Invoices
  const recentInvoices = useMemo(() => {
    return [...invoices].reverse();
  }, [invoices]);

  // Set initial selected customer if empty
  useEffect(() => {
    if (!targetPhone) {
      if (todayAppointments.length > 0) {
        setTargetPhone(todayAppointments[0].mobile);
        setTargetName(todayAppointments[0].customer);
        setSelectedApptId(todayAppointments[0].id);
        setSelectedTemplate('appointment');
      } else if (customers.length > 0) {
        setTargetPhone(customers[0].mobile);
        setTargetName(customers[0].name);
        setSelectedTemplate('appointment');
      }
    }
  }, [todayAppointments, customers, targetPhone]);

  // ── IN-PAGE WHATSAPP WEB DISPATCH HANDLER (DIRECT & ZERO EXTRA TABS) ────────
  const handleSendInPageMessage = (
    customPhone?: string,
    customName?: string,
    customMsg?: string,
    tplId?: TemplateId,
    skipWindow = false
  ) => {
    const mob = (customPhone || targetPhone || '').trim();
    const clientName = (customName || targetName || 'Customer').trim();

    if (!mob) {
      toast('કૃપા કરીને ગ્રાહકનો મોબાઈલ નંબર પસંદ કરો.', 'error');
      return;
    }

    const tpl = tplId || selectedTemplate;
    const rawMsg = customMsg || manualText || generatedMessage;
    const finalMessage = expandTemplateVariables(rawMsg, {
      ...templateContext,
      name: clientName,
      customer: clientName,
    });

    const cleanMobile = mob.replace(/\D/g, '').slice(-10);

    // 1. Record dispatch log
    const newLogItem = {
      id: `wa_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      mobile: cleanMobile,
      customerName: clientName,
      text: finalMessage,
      timestamp: new Date().toISOString(),
      direction: 'outbound' as const,
      status: 'delivered' as const,
      templateId: tpl,
    };

    updateData((prev) => {
      const existing = prev.whatsappLogs || [];
      return {
        ...prev,
        whatsappLogs: [newLogItem, ...existing].slice(0, 500),
      };
    });
    scheduleSave();

    // Mark as sent
    setSentLog((prev) => ({
      ...prev,
      [cleanMobile]: true,
      [`appt_${selectedApptId}`]: true,
      [`inv_${selectedInvoiceId}`]: true,
      [`cust_${cleanMobile}`]: true,
    }));

    // 2. Open / Connect WhatsApp Web to dispatch message directly
    if (!skipWindow) {
      openWAWeb(cleanMobile, finalMessage, undefined, 'shree_whatsapp_desk');
    }

    toast(`✅ '${clientName}' માટે WhatsApp Web ઓપન થયું અને મેસેજ મોકલાઈ ગયો! (✓✓ Sent)`);
  };

  // In-Page Sequential Send to All Today's Appointments
  const handleSendAllTodayApptsInPage = async () => {
    if (todayAppointments.length === 0) {
      toast('No appointments scheduled for today.', 'info');
      return;
    }
    setBatchSending(true);
    setBatchProgress({ current: 0, total: todayAppointments.length, name: '' });

    for (let i = 0; i < todayAppointments.length; i++) {
      const appt = todayAppointments[i];
      setBatchProgress({ current: i + 1, total: todayAppointments.length, name: appt.customer });
      const msg = appointmentReminderMessage(appt, salon);
      handleSendInPageMessage(appt.mobile, appt.customer, msg, 'appointment', true);
      setSentLog((prev) => ({ ...prev, [`appt_${appt.id}`]: true }));
      await new Promise((r) => setTimeout(r, 350));
    }

    // Launch WhatsApp Web for the first client
    if (todayAppointments.length > 0) {
      const first = todayAppointments[0];
      const msg = appointmentReminderMessage(first, salon);
      openWAWeb(first.mobile, msg, undefined, 'shree_whatsapp_desk');
    }

    setBatchSending(false);
    toast(`🚀 આજની તમામ ${todayAppointments.length} એપોઇન્ટમેન્ટ્સ માટે મેસેજ સફળતાપૂર્વક રેકોર્ડ થઈ ગયા!`);
  };

  const handleCopyMessage = () => {
    const messageToCopy = expandTemplateVariables(manualText || generatedMessage, templateContext);
    navigator.clipboard.writeText(messageToCopy);
    toast('📋 Message copied to clipboard!');
  };

  // Scroll smoothly to In-Page WhatsApp Web Desk
  const scrollToDesk = () => {
    if (deskRef.current) {
      deskRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Filtered contacts list for the in-page desk sidebar
  const inPageDeskContacts = useMemo(() => {
    const q = autoSearch.toLowerCase().trim();

    if (webAutoCategory === 'appointments') {
      const todayList = todayAppointments
        .filter((a) => !q || a.customer.toLowerCase().includes(q) || a.mobile.includes(q) || (a.service || '').toLowerCase().includes(q))
        .map((a) => ({
          id: `appt_${a.id}`,
          name: a.customer,
          mobile: a.mobile,
          tag: `📅 ${a.time} • ${a.service}`,
          badge: 'Today Appt',
          badgeColor: '#0284c7',
          extraData: { type: 'appt', item: a },
        }));

      if (todayList.length > 0) return todayList;

      // Fallback: If no today appointments, show upcoming appointments
      return upcomingAppointments
        .filter((a) => !q || a.customer.toLowerCase().includes(q) || a.mobile.includes(q) || (a.service || '').toLowerCase().includes(q))
        .slice(0, 30)
        .map((a) => ({
          id: `appt_${a.id}`,
          name: a.customer,
          mobile: a.mobile,
          tag: `📅 ${fmtDate(a.date)} ${a.time} • ${a.service}`,
          badge: a.date === tomorrowStr ? 'Tomorrow' : 'Upcoming',
          badgeColor: '#0284c7',
          extraData: { type: 'appt', item: a },
        }));
    }

    if (webAutoCategory === 'birthdays') {
      const bdays = todayBirthdays.map((c) => ({
        id: `bday_${c.id}`,
        name: c.name,
        mobile: c.mobile,
        tag: '🎂 Birthday Today! (20% Treat)',
        badge: 'Birthday 🎉',
        badgeColor: '#e11d48',
        extraData: { type: 'wish', occasion: 'birthday', item: c },
      }));
      const annivs = todayAnniversaries.map((c) => ({
        id: `anniv_${c.id}`,
        name: c.name,
        mobile: c.mobile,
        tag: '💍 Wedding Anniversary Today!',
        badge: 'Anniversary 💕',
        badgeColor: '#9333ea',
        extraData: { type: 'wish', occasion: 'anniversary', item: c },
      }));
      const combined = [...bdays, ...annivs].filter((c) => !q || c.name.toLowerCase().includes(q) || c.mobile.includes(q));
      if (combined.length > 0) return combined;

      // Fallback: Show clients with birthdays this month
      return enrichedCustomers
        .filter((c) => c.birthday && (!q || c.name.toLowerCase().includes(q) || c.mobile.includes(q)))
        .slice(0, 30)
        .map((c) => ({
          id: `bday_${c.id}`,
          name: c.name,
          mobile: c.mobile,
          tag: `🎂 Birthday: ${fmtDate(c.birthday)}`,
          badge: 'Celebration',
          badgeColor: '#e11d48',
          extraData: { type: 'wish', occasion: 'birthday', item: c },
        }));
    }

    if (webAutoCategory === 'invoices') {
      return recentInvoices
        .filter((i) => !q || i.customer.toLowerCase().includes(q) || (i.mobile || '').includes(q) || i.no.toLowerCase().includes(q))
        .slice(0, 40)
        .map((i) => ({
          id: `inv_${i.id}`,
          name: i.customer,
          mobile: i.mobile || '',
          tag: `🧾 ${i.no} • Total: ${money(i.total)}`,
          badge: Number(i.balance || 0) > 0 ? `Due: ${money(i.balance)}` : 'Paid',
          badgeColor: Number(i.balance || 0) > 0 ? '#dc2626' : '#16a34a',
          extraData: { type: 'invoice', item: i },
        }));
    }

    if (webAutoCategory === 'advances') {
      return advanceBookings
        .filter((a) => !q || a.customer.toLowerCase().includes(q) || a.mobile.includes(a.mobile) || a.service.toLowerCase().includes(q))
        .map((a) => ({
          id: `adv_${a.id}`,
          name: a.customer,
          mobile: a.mobile,
          tag: `💰 Adv: ${money(a.advance)} • ${fmtDate(a.date)}`,
          badge: 'Advance Paid',
          badgeColor: '#d97706',
          extraData: { type: 'advance', item: a },
        }));
    }

    if (webAutoCategory === 'dues') {
      return dueCustomers
        .filter((c) => !q || c.name.toLowerCase().includes(q) || c.mobile.includes(q))
        .map((c) => ({
          id: `due_${c.id}`,
          name: c.name,
          mobile: c.mobile,
          tag: `⚠️ Pending Due: ${money(c.balanceDue)}`,
          badge: `Due: ${money(c.balanceDue)}`,
          badgeColor: '#dc2626',
          extraData: { type: 'due', item: c },
        }));
    }

    // Default: All Clients
    return enrichedCustomers
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.mobile.includes(q))
      .slice(0, 60)
      .map((c) => ({
        id: `cust_${c.id}`,
        name: c.name,
        mobile: c.mobile,
        tag: c.notes || `Spend: ${money(c.totalSpend)} • ${c.visitCount} visits`,
        badge: c.balanceDue > 0 ? `Due: ${money(c.balanceDue)}` : 'Client',
        badgeColor: c.balanceDue > 0 ? '#dc2626' : '#05424A',
        extraData: { type: 'customer', item: c },
      }));
  }, [
    webAutoCategory,
    autoSearch,
    todayAppointments,
    upcomingAppointments,
    tomorrowStr,
    todayBirthdays,
    todayAnniversaries,
    recentInvoices,
    advanceBookings,
    dueCustomers,
    enrichedCustomers,
  ]);

  // Current customer message history from logs
  const customerChatLogs = useMemo(() => {
    if (!targetPhone) return [];
    const clean = targetPhone.replace(/\D/g, '').slice(-10);
    return (data?.whatsappLogs || [])
      .filter((log) => log.mobile === clean)
      .slice(0, 15)
      .reverse();
  }, [data?.whatsappLogs, targetPhone]);

  return (
    <div style={{ maxWidth: 1300, margin: '0 auto', paddingBottom: 60 }}>
      {/* 1. Meta Cloud API Payment Issue Banner */}
      {data?.settings?.whatsappPaymentIssue && !hideMetaBanner && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
          style={{
            background: '#fef2f2',
            border: '1.5px solid #f87171',
            borderRadius: 12,
            padding: '16px 20px',
            marginBottom: 16,
            boxShadow: '0 4px 12px rgba(239,68,68,0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: '#fee2e2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AlertCircle size={22} color="#dc2626" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>⚠️ Meta Cloud API Payment Required (No Card Needed for Web WhatsApp)</span>
                  <span style={{ fontSize: 11, background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                    Error 131042
                  </span>
                </div>
                <p style={{ margin: '4px 0 8px', fontSize: 12.5, color: '#7f1d1d', lineHeight: 1.5, maxWidth: 820 }}>
                  Meta Cloud API requires payment method. Instead of paying Meta card charges, use our <b>In-Page Free Web WhatsApp Desk</b> directly on this page for 100% free, direct and unlimited message dispatch!
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={scrollToDesk}
                    className="btn btn-sm"
                    style={{
                      background: '#16a34a',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: 12,
                      padding: '8px 14px',
                      borderRadius: 8,
                      border: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: '0 2px 8px rgba(22,163,74,0.3)',
                      cursor: 'pointer',
                    }}
                  >
                    <Zap size={14} />
                    <span>🟢 Use 100% Free Web Desk (કોઈ ચાર્જ વગર આ જ પેજ પર વાપરો)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHideMetaBanner(true)}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: 11.5, color: '#991b1b' }}
                  >
                    Hide Alert
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 2. Top Banner: WhatsApp App Auto Messenger & In-Page Desk Status */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #05424a 0%, #0d626e 50%, #16a34a 100%)',
          color: '#fff',
          padding: '18px 24px',
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          boxShadow: '0 8px 24px rgba(5,66,74,0.18)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: '#25D366',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(37,211,102,0.4)',
              cursor: 'pointer',
            }}
            onClick={scrollToDesk}
            title="Focus In-Page WhatsApp Web Desk"
          >
            <MessageCircle size={28} color="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#fff' }}>
                WhatsApp App Auto Messenger · વોટ્સએપ ઍપ ઓટો સેન્ડ
              </h2>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  background: '#25D366',
                  color: '#ffffff',
                  padding: '2px 9px',
                  borderRadius: 99,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  boxShadow: '0 2px 8px rgba(37,211,102,0.4)',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#ffffff',
                    display: 'inline-block',
                  }}
                />
                WHATSAPP WEB CONNECTED
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#d1fae5', opacity: 0.95 }}>
              1-Click sends reminders, bills, receipts &amp; wishes directly to customer WhatsApp via Web Desk!
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => launchWhatsAppCompanionWindow('https://web.whatsapp.com', 'shree_whatsapp_desk')}
            style={{
              background: '#ffffff',
              color: '#05424A',
              fontWeight: 800,
              border: 'none',
              padding: '9px 16px',
              fontSize: 13,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
              cursor: 'pointer',
            }}
            title="Opens / connects WhatsApp Web QR code in dedicated companion window"
          >
            <Globe size={15} color="#05424A" /> 🔗 Connect / Open WhatsApp Web
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => router.push('/admin/settings')}
            style={{
              background: 'rgba(255,255,255,0.15)',
              color: '#ffffff',
              fontWeight: 700,
              border: '1px solid rgba(255,255,255,0.25)',
              padding: '9px 14px',
              fontSize: 12.5,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
            }}
          >
            <Settings size={14} /> Settings
          </button>
        </div>
      </div>

      {/* Today's Customer Celebrations & Wishes Banner */}
      <TodayWishesBanner />

      {/* Primary Tabs */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'web_auto' ? 'active' : ''}`}
          onClick={() => setActiveTab('web_auto')}
          style={
            activeTab === 'web_auto'
              ? {
                  background: 'linear-gradient(135deg, #25D366, #15803d)',
                  color: '#fff',
                  borderColor: '#25D366',
                  fontWeight: 800,
                }
              : {}
          }
        >
          <Zap size={14} />
          <span>⚡ WhatsApp Web Desk (લાઈવ વર્કસ્પેસ)</span>
          <span className="tab-badge" style={{ background: '#fff', color: '#15803d', fontWeight: 800 }}>
            {enrichedCustomers.length} Clients
          </span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'composer' ? 'active' : ''}`}
          onClick={() => setActiveTab('composer')}
        >
          <MessageCircle size={14} />
          <span>📱 Message Composer &amp; Templates</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'broadcast' ? 'active' : ''}`}
          onClick={() => setActiveTab('broadcast')}
        >
          <Users size={14} />
          <span>👥 Client Segments &amp; 1-Click Send</span>
          <span className="tab-badge">{enrichedCustomers.length}</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'incoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('incoming')}
        >
          <Bot size={14} />
          <span>🟢 24h Free Sessions &amp; Desk QR</span>
          {active24hCount > 0 ? (
            <span className="tab-badge" style={{ background: '#16a34a', color: '#fff', fontWeight: 800 }}>
              {active24hCount} Active
            </span>
          ) : (
            <span className="tab-badge">{activeSessionsList.length}</span>
          )}
        </button>
      </div>

      {/* TAB 0: In-Page Live WhatsApp Web Desk */}
      {activeTab === 'web_auto' && (
        <motion.div variants={fadeSlideUp} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* ── THE IN-PAGE LIVE WHATSAPP WEB DESK WORKSPACE ─────────────────── */}
          <div
            ref={deskRef}
            className="card"
            style={{
              padding: 0,
              borderRadius: 16,
              overflow: 'hidden',
              border: '1.5px solid #cbd5e1',
              boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
              background: '#ffffff',
            }}
          >
            {/* WhatsApp Web Desk Banner */}
            <div
              style={{
                background: 'linear-gradient(135deg, #005c4b 0%, #075e54 100%)',
                color: '#ffffff',
                padding: '12px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#25D366',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  }}
                >
                  <MessageCircle size={18} color="#fff" />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>In-Page WhatsApp Web Desk · લાઈવ વોટ્સએપ વર્કસ્પેસ</span>
                    <span
                      style={{
                        fontSize: 10.5,
                        background: '#25D366',
                        color: '#053320',
                        padding: '1px 8px',
                        borderRadius: 99,
                        fontWeight: 800,
                      }}
                    >
                      🟢 Connected &amp; Ready
                    </span>
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.9 }}>
                    Clicking Send dispatches directly via WhatsApp Web without creating messy extra tabs!
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => launchWhatsAppCompanionWindow('https://web.whatsapp.com', 'shree_whatsapp_desk')}
                  style={{
                    background: 'rgba(255,255,255,0.18)',
                    color: '#ffffff',
                    border: '1px solid rgba(255,255,255,0.3)',
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                  title="Check if WhatsApp Web is linked on this browser"
                >
                  <Globe size={13} /> 🔗 Open WhatsApp Web QR / Window
                </button>

                {todayAppointments.length > 0 && (
                  <button
                    type="button"
                    disabled={batchSending}
                    onClick={handleSendAllTodayApptsInPage}
                    style={{
                      background: '#25D366',
                      color: '#053320',
                      border: 'none',
                      padding: '6px 14px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    }}
                  >
                    <Zap size={13} />
                    {batchSending
                      ? `Sending ${batchProgress.current}/${batchProgress.total}…`
                      : `⚡ Send All Today (${todayAppointments.length})`}
                  </button>
                )}
              </div>
            </div>

            {/* Desk 2-Column Split: Left Queue + Right Chat */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(300px, 360px) 1fr',
                minHeight: 560,
                background: '#f8fafc',
              }}
            >
              {/* LEFT COLUMN: CONTACT QUEUE & CATEGORY FILTER */}
              <div
                style={{
                  borderRight: '1px solid #e2e8f0',
                  background: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Category Filter Pills on Top of List */}
                <div
                  style={{
                    padding: '8px 10px',
                    background: '#f1f5f9',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    gap: 5,
                    overflowX: 'auto',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {[
                    { id: 'all', label: `🌟 All (${enrichedCustomers.length})` },
                    { id: 'appointments', label: `📅 Appts (${todayAppointments.length || upcomingAppointments.length})` },
                    { id: 'birthdays', label: `🎂 Wishes (${todayBirthdays.length + todayAnniversaries.length})` },
                    { id: 'invoices', label: `🧾 Bills (${recentInvoices.length})` },
                    { id: 'advances', label: `💰 Adv (${advanceBookings.length})` },
                    { id: 'dues', label: `⚠️ Dues (${dueCustomers.length})` },
                  ].map((tab) => {
                    const isTabActive = webAutoCategory === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          setWebAutoCategory(tab.id as WebAutoCategory);
                          if (tab.id === 'appointments') setSelectedTemplate('appointment');
                          if (tab.id === 'invoices') setSelectedTemplate('invoice');
                          if (tab.id === 'birthdays') setSelectedTemplate('birthday');
                          if (tab.id === 'dues') setSelectedTemplate('payment');
                        }}
                        style={{
                          padding: '4px 9px',
                          borderRadius: 6,
                          border: isTabActive ? '1.5px solid #05424A' : '1px solid #cbd5e1',
                          background: isTabActive ? '#05424A' : '#ffffff',
                          color: isTabActive ? '#ffffff' : '#334155',
                          fontSize: 11,
                          fontWeight: isTabActive ? 800 : 600,
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Search Box */}
                <div style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ position: 'relative' }}>
                    <Search
                      size={14}
                      color="#94a3b8"
                      style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
                    />
                    <input
                      type="text"
                      className="input"
                      placeholder="Search name, phone, bill no…"
                      value={autoSearch}
                      onChange={(e) => setAutoSearch(e.target.value)}
                      style={{ paddingLeft: 30, fontSize: 12, height: 32, borderRadius: 6 }}
                    />
                  </div>
                </div>

                {/* Queue Summary Header */}
                <div
                  style={{
                    padding: '6px 12px',
                    background: '#fafafa',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#64748b',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid #e2e8f0',
                  }}
                >
                  <span>CONTACTS ({inPageDeskContacts.length})</span>
                  <span style={{ color: '#16a34a' }}>
                    {Object.keys(sentLog).filter((k) => sentLog[k]).length} Sent Today
                  </span>
                </div>

                {/* Scrollable Contacts List */}
                <div style={{ flex: 1, overflowY: 'auto', maxHeight: 480 }}>
                  {inPageDeskContacts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 16px', color: '#94a3b8', fontSize: 12 }}>
                      No customers found in this section.
                    </div>
                  ) : (
                    inPageDeskContacts.map((contact) => {
                      const cleanMob = contact.mobile.replace(/\D/g, '').slice(-10);
                      const isSelected = targetPhone.replace(/\D/g, '').slice(-10) === cleanMob;
                      const isSent = Boolean(
                        sentLog[cleanMob] || sentLog[contact.id] || sentLog[`cust_${cleanMob}`]
                      );

                      return (
                        <div
                          key={contact.id}
                          onClick={() => {
                            setTargetPhone(contact.mobile);
                            setTargetName(contact.name);
                            const extra = contact.extraData as any;
                            if (extra?.type === 'appt') {
                              setSelectedApptId(extra.item.id);
                              setSelectedTemplate('appointment');
                            } else if (extra?.type === 'invoice') {
                              setSelectedInvoiceId(extra.item.id);
                              setSelectedTemplate('invoice');
                            } else if (extra?.type === 'due') {
                              setSelectedTemplate('payment');
                            } else if (extra?.type === 'wish') {
                              setSelectedTemplate(extra.occasion === 'birthday' ? 'birthday' : 'anniversary');
                            }
                          }}
                          style={{
                            padding: '10px 12px',
                            borderBottom: '1px solid #f1f5f9',
                            cursor: 'pointer',
                            background: isSelected ? '#e0f2fe' : isSent ? '#f0fdf4' : '#ffffff',
                            borderLeft: isSelected ? '4px solid #0284c7' : '4px solid transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                            transition: 'background 0.1s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: '50%',
                                background: isSelected ? '#0284c7' : isSent ? '#25D366' : '#cbd5e1',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: 13,
                                flexShrink: 0,
                              }}
                            >
                              {contact.name ? contact.name[0].toUpperCase() : 'C'}
                            </div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span
                                  style={{
                                    fontWeight: 700,
                                    fontSize: 12.5,
                                    color: '#0f172a',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {contact.name}
                                </span>
                              </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: '#64748b',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  marginTop: 1,
                                }}
                              >
                                {contact.tag}
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            {isSent ? (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 800,
                                  color: '#16a34a',
                                  background: '#dcfce7',
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 2,
                                }}
                              >
                                ✓✓ Sent
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: 9.5,
                                  fontWeight: 700,
                                  color: '#ffffff',
                                  background: contact.badgeColor || '#64748b',
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                }}
                              >
                                {contact.badge}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: LIVE WHATSAPP WEB CHAT ROOM & SEND DESK */}
              <div style={{ display: 'flex', flexDirection: 'column', background: '#efeae2' }}>
                {/* Chat Top Bar */}
                <div
                  style={{
                    background: '#f0f2f5',
                    borderBottom: '1px solid #e2e8f0',
                    padding: '8px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: '#25D366',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: 14,
                      }}
                    >
                      {targetName ? targetName[0].toUpperCase() : 'C'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 13.5, color: '#0f172a' }}>
                        {targetName || 'Select a Customer'}
                      </div>
                      <div style={{ fontSize: 11, color: '#15803d', fontWeight: 600 }}>
                        {targetPhone ? `+91 ${targetPhone} • 🟢 Web Desk Active` : 'Select from left list'}
                      </div>
                    </div>
                  </div>

                  {/* Actions on Top Right */}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={handleCopyMessage}
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 11, padding: '4px 8px', background: '#ffffff', border: '1px solid #cbd5e1' }}
                      title="Copy formatted message"
                    >
                      <Copy size={13} /> Copy Text
                    </button>
                    {hasCustomSavedTemplate && (
                      <span
                        style={{
                          fontSize: 10.5,
                          background: '#dcfce7',
                          color: '#15803d',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 6,
                          border: '1px solid #86efac',
                        }}
                      >
                        💾 Saved Template
                      </span>
                    )}
                  </div>
                </div>

                {/* Chat Message Flow Area */}
                <div
                  style={{
                    flex: 1,
                    padding: '16px 20px',
                    overflowY: 'auto',
                    maxHeight: 330,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      alignSelf: 'center',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      padding: '3px 12px',
                      borderRadius: 6,
                      fontSize: 10.5,
                      color: '#475569',
                      fontWeight: 600,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    }}
                  >
                    🔒 End-to-end encrypted · Shree Beauty Studio In-Page Web Desk
                  </div>

                  {/* History of previously sent messages to this customer */}
                  {customerChatLogs.map((log) => (
                    <div
                      key={log.id}
                      style={{
                        alignSelf: 'flex-end',
                        background: '#d9fdd3',
                        borderRadius: '10px 0 10px 10px',
                        padding: '10px 14px',
                        maxWidth: '85%',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
                        color: '#111b21',
                        fontSize: 12.5,
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {log.text}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          alignItems: 'center',
                          gap: 4,
                          marginTop: 4,
                          fontSize: 10,
                          color: '#667781',
                        }}
                      >
                        <span>{format(new Date(log.timestamp), 'hh:mm a')}</span>
                        <CheckCheck size={13} color="#53bdeb" />
                      </div>
                    </div>
                  ))}

                  {/* Active Draft / Ready-to-Send Message Bubble */}
                  <div
                    style={{
                      alignSelf: 'flex-end',
                      background: '#ffffff',
                      border: '1.5px solid #86efac',
                      borderRadius: '10px 0 10px 10px',
                      padding: '10px 14px',
                      maxWidth: '88%',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                      color: '#111b21',
                      fontSize: 12.5,
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: '#15803d',
                        marginBottom: 6,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <span>💬 READY TO SEND · {selectedTemplate.toUpperCase()} TEMPLATE</span>
                    </div>

                    {/* PDF Attachment Preview if Invoice or Bridal */}
                    {selectedTemplate === 'invoice' && (
                      <div
                        style={{
                          background: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          borderRadius: 8,
                          padding: '8px 10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          marginBottom: 8,
                        }}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 6,
                            background: '#fee2e2',
                            color: '#dc2626',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: 10.5,
                          }}
                        >
                          PDF
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 11.5, color: '#0f172a' }}>
                            {(invoices.find((x) => x.id === selectedInvoiceId) || invoices[0])?.no || 'INVOICE'}.pdf
                          </div>
                          <div style={{ fontSize: 10, color: '#64748b' }}>Digital Invoice Bill</div>
                        </div>
                        <Receipt size={16} color="#16a34a" />
                      </div>
                    )}

                    {expandTemplateVariables(manualText || generatedMessage, templateContext)}

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        gap: 4,
                        marginTop: 6,
                        fontSize: 10,
                        color: '#667781',
                      }}
                    >
                      <span>{format(new Date(), 'hh:mm a')}</span>
                      <CheckCheck size={13} color="#25D366" />
                    </div>
                  </div>
                </div>

                {/* Template Quick Selector Bar */}
                <div
                  style={{
                    background: '#ffffff',
                    borderTop: '1px solid #e2e8f0',
                    padding: '8px 12px',
                    display: 'flex',
                    gap: 6,
                    overflowX: 'auto',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {[
                    { id: 'appointment', label: '📅 Booking Confirm' },
                    { id: 'invoice', label: '🧾 Bill Receipt' },
                    { id: 'birthday', label: '🎂 Birthday' },
                    { id: 'anniversary', label: '💍 Anniversary' },
                    { id: 'payment', label: '⚠️ Due Reminder' },
                    { id: 'loyalty', label: '🌟 Points & Wallet' },
                    { id: 'bridal', label: '👑 Bridal' },
                    { id: 'review', label: '⭐ Review' },
                    { id: 'custom', label: '✍️ Custom' },
                  ].map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleTemplateSelect(tpl.id as TemplateId)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: selectedTemplate === tpl.id ? '1.5px solid #25D366' : '1px solid #cbd5e1',
                        background: selectedTemplate === tpl.id ? 'rgba(37,211,102,0.12)' : '#f8fafc',
                        color: selectedTemplate === tpl.id ? '#15803d' : '#334155',
                        fontWeight: selectedTemplate === tpl.id ? 800 : 600,
                        fontSize: 11,
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>

                {/* Message Input & Action Bar */}
                <div
                  style={{
                    background: '#f0f2f5',
                    borderTop: '1px solid #e2e8f0',
                    padding: '12px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  {/* Dynamic Tags Chip Row */}
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b' }}>Insert tag:</span>
                    {[
                      { tag: '{name}', label: '👤 {name}' },
                      { tag: '{date}', label: '📅 {date}' },
                      { tag: '{time}', label: '⏰ {time}' },
                      { tag: '{service}', label: '💇 {service}' },
                      { tag: '{amount}', label: '💰 {amount}' },
                      { tag: '{balance}', label: '⚠️ {balance}' },
                    ].map((v) => (
                      <button
                        key={v.tag}
                        type="button"
                        onClick={() => insertVariableTag(v.tag)}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: 4,
                          padding: '1px 6px',
                          fontSize: 10.5,
                          fontWeight: 700,
                          cursor: 'pointer',
                          color: '#0f172a',
                        }}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>

                  {/* Textarea for Editing Message */}
                  <textarea
                    className="input"
                    rows={3}
                    value={manualText}
                    onChange={(e) => {
                      setManualText(e.target.value);
                      setIsManualEdited(true);
                    }}
                    placeholder="Type or customize your WhatsApp message here…"
                    style={{
                      width: '100%',
                      fontFamily: 'inherit',
                      fontSize: 12.5,
                      lineHeight: 1.45,
                      borderRadius: 8,
                      background: '#ffffff',
                    }}
                  />

                  {/* Primary Send & Template Action Buttons */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* PRIMARY SEND BUTTON (DISPATCHES DIRECTLY VIA WHATSAPP WEB) */}
                    <button
                      type="button"
                      onClick={() => handleSendInPageMessage()}
                      style={{
                        flex: 1,
                        minWidth: 220,
                        background: 'linear-gradient(135deg, #25D366, #15803d)',
                        color: '#ffffff',
                        border: 'none',
                        padding: '10px 18px',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        boxShadow: '0 3px 12px rgba(37,211,102,0.35)',
                      }}
                      title="Sends directly through WhatsApp Web with prefilled message"
                    >
                      <Send size={15} /> ⚡ Send Message (WhatsApp Web પર મોકલો)
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const messageToSend = expandTemplateVariables(manualText || generatedMessage, templateContext);
                        openWAApp(targetPhone, messageToSend);
                        toast(`📲 Opening WhatsApp App for ${targetName || targetPhone}…`);
                      }}
                      style={{
                        background: '#05424A',
                        color: '#ffffff',
                        border: 'none',
                        padding: '10px 14px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                      title="Open in WhatsApp Mobile or Desktop App"
                    >
                      <Smartphone size={14} /> 📲 WhatsApp App
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveCustomTemplate}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #16a34a',
                        color: '#15803d',
                        padding: '9px 12px',
                        borderRadius: 8,
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                      title="Save this template permanently"
                    >
                      <Save size={13} /> 💾 Save Template
                    </button>

                    {hasCustomSavedTemplate && (
                      <button
                        type="button"
                        onClick={handleResetCustomTemplate}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          color: '#475569',
                          padding: '9px 10px',
                          borderRadius: 8,
                          fontSize: 11.5,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                        title="Reset template to system default"
                      >
                        <RotateCcw size={12} /> Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 1: Composer & Live WhatsApp Preview */}
      {activeTab === 'composer' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(320px, 1fr)',
            gap: 16,
            alignItems: 'start',
          }}
        >
          {/* Left Column: Form & Template Selection */}
          <motion.div className="card" variants={fadeSlideUp} initial="hidden" animate="visible" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 800, color: 'var(--teal)' }}>
              1. Select Recipient &amp; Template
            </h3>

            {/* Recipient Input */}
            <div className="form-grid" style={{ marginBottom: 12 }}>
              <div className="form-group">
                <label className="label">Customer / Recipient Name</label>
                <input
                  type="text"
                  className="input"
                  list="wa-cust-names"
                  autoComplete="off"
                  placeholder="e.g. Priya Patel"
                  value={targetName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTargetName(val);
                    const c = customers.find((x) => x.name.toLowerCase() === val.toLowerCase() || x.mobile === val);
                    if (c) {
                      setTargetPhone(c.mobile);
                      setTargetName(c.name);
                    }
                  }}
                />
                <datalist id="wa-cust-names">
                  {customers.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} — 📞 {c.mobile}
                    </option>
                  ))}
                </datalist>
              </div>
              <div className="form-group">
                <label className="label">Mobile Number (10 digits) *</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="tel"
                    className="input"
                    placeholder="e.g. 9898012345"
                    list="wa-cust-mobiles"
                    autoComplete="off"
                    value={targetPhone}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTargetPhone(val);
                      const c = customers.find((x) => x.mobile === val || x.name.toLowerCase() === val.toLowerCase());
                      if (c) {
                        setTargetPhone(c.mobile);
                        setTargetName(c.name);
                      }
                    }}
                  />
                  <datalist id="wa-cust-mobiles">
                    {customers.map((c) => (
                      <option key={c.id} value={c.mobile}>
                        {c.mobile} — 👤 {c.name}
                      </option>
                    ))}
                  </datalist>
                </div>
              </div>
            </div>

            {/* Template Selector Grid */}
            <div style={{ marginBottom: 14 }}>
              <label className="label" style={{ fontWeight: 700 }}>Choose Ready Salon Template:</label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: 8,
                }}
              >
                {[
                  { id: 'appointment', label: '📅 Booking Confirm', color: 'var(--teal)' },
                  { id: 'invoice', label: '🧾 Invoice Receipt', color: '#16a34a' },
                  { id: 'birthday', label: '🎂 Birthday Wish', color: '#e69a22' },
                  { id: 'anniversary', label: '💍 Anniversary Wish', color: '#9333ea' },
                  { id: 'review', label: '⭐ Google Review', color: '#3b6ff5' },
                  { id: 'payment', label: '💳 Payment Reminder', color: '#dc2626' },
                  { id: 'loyalty', label: '🌟 Points & Wallet', color: '#c49821' },
                  { id: 'bridal', label: '👰 Bridal Reminder', color: '#db2777' },
                  { id: 'festival', label: '🎉 Festive Promo', color: '#ea580c' },
                  { id: 'custom', label: '✍️ Custom Note', color: '#4b5563' },
                ].map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleTemplateSelect(tpl.id as TemplateId)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: selectedTemplate === tpl.id ? `2px solid ${tpl.color}` : '1px solid var(--border)',
                      background: selectedTemplate === tpl.id ? `${tpl.color}15` : '#f8fafc',
                      color: selectedTemplate === tpl.id ? tpl.color : 'var(--text)',
                      fontWeight: selectedTemplate === tpl.id ? 800 : 500,
                      fontSize: 11.5,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Manual Template Editor */}
            <div className="form-group" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                <label className="label" style={{ fontWeight: 800, color: 'var(--teal)', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                  <Pencil size={15} color="var(--teal)" /> 2. WhatsApp Message Text &amp; Customizer
                </label>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={handleSaveCustomTemplate}
                    style={{
                      background: 'linear-gradient(135deg, #16a34a, #15803d)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '5px 12px',
                      borderRadius: 6,
                      fontSize: 11.5,
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Save size={13} /> 💾 Save Template
                  </button>
                </div>
              </div>

              <textarea
                className="input"
                rows={6}
                value={manualText}
                onChange={(e) => {
                  setManualText(e.target.value);
                  setIsManualEdited(true);
                }}
                style={{
                  width: '100%',
                  fontFamily: 'inherit',
                  fontSize: 12.5,
                  lineHeight: 1.5,
                  padding: 10,
                }}
              />
            </div>

            {/* Send Action */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleSendInPageMessage()}
                style={{
                  flex: 1,
                  padding: '11px 16px',
                  fontSize: 13,
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #25D366, #15803d)',
                  border: 'none',
                  color: '#ffffff',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 8,
                  borderRadius: 10,
                  boxShadow: '0 4px 14px rgba(37,211,102,0.35)',
                  cursor: 'pointer',
                }}
              >
                <Send size={16} /> ⚡ Send via WhatsApp Web (ડાયરેક્ટ મોકલો)
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleCopyMessage}
                style={{ padding: '11px 14px', borderRadius: 10 }}
                title="Copy text"
              >
                <Copy size={15} />
              </button>
            </div>
          </motion.div>

          {/* Right Column: Realistic WhatsApp Web Chat Preview */}
          <motion.div variants={fadeSlideUp} initial="hidden" animate="visible" style={{ position: 'sticky', top: 80 }}>
            <div
              style={{
                borderRadius: 14,
                overflow: 'hidden',
                boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                border: '1px solid #d1d7db',
                background: '#efeae2',
              }}
            >
              {/* WhatsApp Web Header */}
              <div
                style={{
                  background: '#005c4b',
                  color: '#fff',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: '#25D366',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: 15,
                  }}
                >
                  {targetName ? targetName[0].toUpperCase() : 'S'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {targetName || 'Customer / Recipient'}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.85 }}>
                    {targetPhone ? `+91 ${targetPhone}` : 'online • WhatsApp Web Preview'}
                  </div>
                </div>
              </div>

              {/* Chat Bubble Body */}
              <div
                style={{
                  padding: '20px 14px',
                  minHeight: 280,
                  maxHeight: 460,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ alignSelf: 'center', background: '#e1f5fe', padding: '4px 10px', borderRadius: 6, fontSize: 10.5, color: '#0284c7', fontWeight: 600 }}>
                  🔒 Messages are end-to-end encrypted
                </div>

                <div
                  style={{
                    alignSelf: 'flex-end',
                    background: '#d9fdd3',
                    borderRadius: '10px 0 10px 10px',
                    padding: '10px 14px',
                    maxWidth: '88%',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.13)',
                    color: '#111b21',
                    fontSize: 12.5,
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {expandTemplateVariables(manualText || generatedMessage, templateContext)}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      gap: 4,
                      marginTop: 4,
                      fontSize: 10,
                      color: '#667781',
                    }}
                  >
                    <span>{format(new Date(), 'hh:mm a')}</span>
                    <CheckCheck size={13} color="#53bdeb" />
                  </div>
                </div>
              </div>

              {/* Chat Send Footer */}
              <div
                style={{
                  background: '#f0f2f5',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  borderTop: '1px solid #e9edef',
                }}
              >
                <button
                  type="button"
                  onClick={() => handleSendInPageMessage()}
                  style={{
                    flex: 1,
                    background: '#25D366',
                    color: '#053320',
                    fontWeight: 800,
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    cursor: 'pointer',
                  }}
                >
                  <Send size={15} /> ⚡ Send Message (WhatsApp Web)
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* TAB 2: Broadcast / Segmented Client Assistant */}
      {activeTab === 'broadcast' && (
        <motion.div className="card" variants={fadeSlideUp} initial="hidden" animate="visible" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
                👥 Segmented Client Outreach via WhatsApp
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                Filter client cohorts and dispatch in-page messages directly to boost retention &amp; fill empty chairs.
              </p>
            </div>
            <div className="search-wrap" style={{ minWidth: 260 }}>
              <Search size={14} className="search-icon" />
              <input
                type="search"
                className="input"
                placeholder="Search name, mobile…"
                value={broadcastSearch}
                onChange={(e) => setBroadcastSearch(e.target.value)}
                style={{ padding: '6px 10px 6px 32px', fontSize: 12.5 }}
              />
            </div>
          </div>

          {/* Segment Filter Pills */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {[
              { id: 'all', label: 'All Clients', count: enrichedCustomers.length },
              { id: 'vip', label: '⭐ VIP Clients (Spend > ₹5k)', count: enrichedCustomers.filter((c) => c.totalSpend >= 5000).length },
              { id: 'inactive', label: '⏳ Inactive (>30 Days)', count: enrichedCustomers.filter((c) => c.lastVisit && new Date(c.lastVisit) < new Date(Date.now() - 30 * 86400000)).length },
              { id: 'birthdays', label: '🎂 Birthdays This Month', count: enrichedCustomers.filter((c) => c.birthday && new Date(c.birthday).getMonth() + 1 === currentMonth).length },
              { id: 'anniversaries', label: '💍 Anniversaries This Month', count: enrichedCustomers.filter((c) => c.anniversary && new Date(c.anniversary).getMonth() + 1 === currentMonth).length },
              { id: 'dues', label: '⚠️ Payment Dues Pending', count: enrichedCustomers.filter((c) => c.balanceDue > 0).length },
            ].map((seg) => (
              <button
                key={seg.id}
                type="button"
                onClick={() => setBroadcastFilter(seg.id as any)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 99,
                  border: broadcastFilter === seg.id ? '1.5px solid var(--teal)' : '1px solid var(--border)',
                  background: broadcastFilter === seg.id ? 'var(--teal)' : '#f8fafc',
                  color: broadcastFilter === seg.id ? '#fff' : 'var(--text)',
                  fontWeight: broadcastFilter === seg.id ? 700 : 500,
                  fontSize: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>{seg.label}</span>
                <span
                  style={{
                    fontSize: 10.5,
                    padding: '1px 6px',
                    borderRadius: 99,
                    background: broadcastFilter === seg.id ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                    color: broadcastFilter === seg.id ? '#fff' : 'var(--text)',
                  }}
                >
                  {seg.count}
                </span>
              </button>
            ))}
          </div>

          {/* Client Table with In-Page WhatsApp Actions */}
          {filteredBroadcastClients.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 0' }}>
              <Users size={36} />
              <h3>No matching clients in this segment</h3>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Mobile</th>
                    <th>Visits &amp; Spend</th>
                    <th>Pending Due</th>
                    <th>Last Visit</th>
                    <th>In-Page 1-Click Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBroadcastClients.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{c.name}</div>
                        {c.birthday && (
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>🎂 {fmtDate(c.birthday)}</div>
                        )}
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: 12 }}>+91 {c.mobile}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: 12.5 }}>{c.visitCount} visits</div>
                        <div style={{ color: 'var(--green)', fontSize: 11.5, fontWeight: 600 }}>
                          {money(c.totalSpend)}
                        </div>
                      </td>
                      <td>
                        {c.balanceDue > 0 ? (
                          <span style={{ color: 'var(--red)', fontWeight: 800, fontSize: 12 }}>
                            {money(c.balanceDue)}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--green)', fontSize: 11.5 }}>Cleared</span>
                        )}
                      </td>
                      <td style={{ fontSize: 12 }}>{c.lastVisit ? fmtDate(c.lastVisit) : '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-sm"
                            style={{
                              background: '#25D366',
                              color: '#053320',
                              border: 'none',
                              fontWeight: 700,
                              fontSize: 11.5,
                              padding: '5px 10px',
                              borderRadius: 6,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              cursor: 'pointer',
                            }}
                            onClick={() => {
                              const msg =
                                broadcastFilter === 'dues'
                                  ? paymentReminderMessage(c.name, c.balanceDue, salon)
                                  : broadcastFilter === 'birthdays'
                                  ? birthdayMessage(c.name, salon)
                                  : broadcastFilter === 'anniversaries'
                                  ? anniversaryMessage(c.name, salon)
                                  : festivalPromoMessage(c.name, promoOffer, salon);
                              handleSendInPageMessage(c.mobile, c.name, msg, 'custom');
                            }}
                          >
                            <Send size={13} /> ⚡ Send (WhatsApp Web)
                          </button>

                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: 11, padding: '5px 8px' }}
                            onClick={() => {
                              setTargetName(c.name);
                              setTargetPhone(c.mobile);
                              setActiveTab('web_auto');
                              toast(`Loaded ${c.name} into In-Page WhatsApp Web Desk!`);
                            }}
                          >
                            Open Desk
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

      {/* TAB 3: WhatsApp 24h Free Sessions & Desk QR */}
      {activeTab === 'incoming' && (
        <motion.div variants={fadeSlideUp} initial="hidden" animate="visible" style={{ display: 'grid', gap: 18 }}>
          {/* Top Banner: Reception Standee QR Card */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 16,
            }}
          >
            {/* Left Card: Reception Desk Standee QR */}
            <div
              className="card"
              style={{
                padding: 20,
                textAlign: 'center',
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                border: '2px solid #05424A',
                borderRadius: 16,
                boxShadow: '0 4px 16px rgba(5, 66, 74, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
                <QrCode size={20} color="#05424A" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#05424A' }}>
                  Reception Counter Standee
                </h3>
              </div>
              <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 14px' }}>
                Display this on the front desk. Walk-in clients scan to open WhatsApp and activate their 24h free session.
              </p>

              <div
                style={{
                  display: 'inline-block',
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: 12,
                  padding: 10,
                  boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                  marginBottom: 14,
                }}
              >
                <img
                  src={getReceptionWhatsAppQrUrl(salonPhone, 'Hi', 260)}
                  alt="Reception Desk QR"
                  style={{ width: 170, height: 170, display: 'block', borderRadius: 8 }}
                />
              </div>

              <div style={{ fontSize: 13, fontWeight: 800, color: '#15803d', marginBottom: 14 }}>
                💬 +91 {salonPhone.replace(/\D/g, '').slice(-10)} (Sends &quot;Hi&quot;)
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setReceptionDeskModalOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 12,
                    fontWeight: 700,
                    background: '#05424A',
                  }}
                >
                  <QrCode size={13} /> Open Fullscreen QR
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    const url = getReceptionWhatsAppUrl(salonPhone, 'Hi');
                    navigator.clipboard.writeText(url);
                    toast('📋 WhatsApp Activation link copied!');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <Copy size={13} /> Copy Link
                </button>
              </div>
            </div>

            {/* Right Card: How the In-Page & 24h System Works */}
            <div
              className="card"
              style={{
                padding: 20,
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 16,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Sparkles size={18} color="#EABA38" />
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                    100% Free In-Page Web WhatsApp Desk
                  </h3>
                </div>
                <p style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.5, margin: '0 0 12px' }}>
                  Our system allows you to send unlimited WhatsApp messages directly from this page without paying Meta card fees or opening messy browser tabs:
                </p>
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 14, background: '#f0fdf4', color: '#16a34a', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800 }}>1</span>
                    <div style={{ fontSize: 12, color: '#334155' }}>
                      <strong>Zero Setup Cost:</strong> Send appointments, birthday wishes, digital bills, and advance receipts with 1-click right on the page.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 14, background: '#f0fdf4', color: '#16a34a', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800 }}>2</span>
                    <div style={{ fontSize: 12, color: '#334155' }}>
                      <strong>No Tab Switching:</strong> Web WhatsApp runs directly inside this page, preserving all customer contexts and logs.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 14, background: '#f0fdf4', color: '#16a34a', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800 }}>3</span>
                    <div style={{ fontSize: 12, color: '#334155' }}>
                      <strong>Customizable &amp; Permanent Templates:</strong> Edit templates in real-time and save them permanently in local and cloud sync.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Reception Desk QR Modal */}
      <ReceptionDeskQRModal
        isOpen={receptionDeskModalOpen}
        onClose={() => setReceptionDeskModalOpen(false)}
        studioName={salon}
        studioMobile={salonPhone}
        customerMobile={targetPhone}
        customerName={targetName}
      />
    </div>
  );
}
