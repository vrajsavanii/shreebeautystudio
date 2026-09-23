'use client';

import { useState, useMemo, useEffect } from 'react';
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
type WebAutoCategory = 'appointments' | 'birthdays' | 'invoices' | 'advances' | 'dues' | 'quick';
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
  const [webAutoCategory, setWebAutoCategory] = useState<WebAutoCategory>('appointments');
  const [autoSearch, setAutoSearch] = useState('');
  const [sentLog, setSentLog] = useState<Record<string, boolean>>({});

  // Composer Form State
  const [targetPhone, setTargetPhone] = useState('');
  const [targetName, setTargetName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('appointment');
  const [customText, setCustomText] = useState('');
  const [promoOffer, setPromoOffer] = useState('Flat 20% OFF on all Hair Spa & Hydra Facials this week! ✨');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [selectedApptId, setSelectedApptId] = useState('');
  const [preferWeb, setPreferWeb] = useState(true);
  const [receptionDeskModalOpen, setReceptionDeskModalOpen] = useState(false);

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

  const salon = data?.settings?.salon || 'Shree Beauty Studio';
  const address = data?.settings?.address || 'Surat, Gujarat';
  const salonPhone = data?.settings?.whatsapp || '919773240010';

  const customers = data?.customers || [];
  const appointments = data?.appointments || [];
  const invoices = data?.invoices || [];

  const currentMonth = new Date().getMonth() + 1;

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
    const now = new Date();
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
      staff: 'Amita',
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
    // If a custom saved template exists, expand its variable tags
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
        staff: 'Amita',
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
      return bridalMessage(clientName, 'Wedding Day Makeup & Draping', todayISO(), 'Katargam Community Hall, Surat', salon);
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

  const handleSelectCustomer = (mob: string) => {
    const trimmed = mob.trim();
    setTargetPhone(trimmed);
    const c = customers.find(
      (x) => x.mobile === trimmed || x.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (c) {
      setTargetPhone(c.mobile);
      setTargetName(c.name);
    }
  };

  const handleSelectCustomerName = (name: string) => {
    const trimmed = name.trim();
    setTargetName(trimmed);
    const c = customers.find(
      (x) => x.name.toLowerCase() === trimmed.toLowerCase() || x.mobile === trimmed
    );
    if (c) {
      setTargetPhone(c.mobile);
      setTargetName(c.name);
    }
  };

  const [sendingPDF, setSendingPDF] = useState(false);
  const [pdfSentStatus, setPdfSentStatus] = useState<string | null>(null);

  const handleSendInvoicePDF = async () => {
    const inv = invoices.find((i) => i.id === selectedInvoiceId) || invoices[0];
    if (!inv) {
      toast('No invoices found to send. Please create an invoice first.', 'error');
      return;
    }

    const targetInv: typeof inv = {
      ...inv,
      mobile: targetPhone || inv.mobile,
      customer: targetName || inv.customer,
    };

    if (!targetInv.mobile) {
      toast('Please enter a recipient mobile number.', 'error');
      return;
    }

    // If Meta has an active payment issue, immediately use Direct WhatsApp PDF sharing (100% free)
    if (data?.settings?.whatsappPaymentIssue) {
      setSendingPDF(true);
      try {
        const shareRes = await shareInvoicePDFViaDirectWhatsApp(targetInv, data);
        toast(shareRes.message);
        setPdfSentStatus(`✅ Direct WhatsApp opened with PDF!`);
      } catch (err: any) {
        toast(err?.message || 'Error sharing PDF', 'error');
      } finally {
        setSendingPDF(false);
      }
      return;
    }

    setSendingPDF(true);
    setPdfSentStatus(null);
    toast(`⏳ Sending Invoice PDF ${targetInv.no} via Meta WhatsApp API…`);

    try {
      const res = await sendInvoicePDFViaWhatsApp(targetInv, data);
      if (res.success) {
        toast(`✅ PDF Invoice ${targetInv.no} sent directly to ${targetInv.customer}'s WhatsApp via Meta API!`);
        setPdfSentStatus(`✅ PDF Sent successfully via Meta Cloud API!`);
      } else {
        if (res.isPaymentRequired) {
          toast('Meta payment required. Opening Direct WhatsApp PDF share (Free)…', 'info');
          const shareRes = await shareInvoicePDFViaDirectWhatsApp(targetInv, data);
          toast(shareRes.message);
          setPdfSentStatus(`✅ Direct WhatsApp opened with PDF!`);
          return;
        }
        toast(`❌ Failed to send PDF via Meta API: ${res.message}`, 'error');
      }
    } catch (err: any) {
      toast(`Error sending PDF: ${err?.message || 'Unknown error'}`, 'error');
    } finally {
      setSendingPDF(false);
    }
  };

  const [sendingText, setSendingText] = useState(false);

  const handleSendInvoiceText = async () => {
    const inv = invoices.find((i) => i.id === selectedInvoiceId) || invoices[0];
    if (!inv) {
      toast('No invoices found to send. Please create an invoice first.', 'error');
      return;
    }

    const targetInv: typeof inv = {
      ...inv,
      mobile: targetPhone || inv.mobile,
      customer: targetName || inv.customer,
    };

    if (!targetInv.mobile) {
      toast('Please enter a recipient mobile number.', 'error');
      return;
    }

    setSendingText(true);
    setPdfSentStatus(null);
    toast(`⏳ Sending official text receipt for ${targetInv.no} via Meta API…`);

    try {
      const res = await sendInvoiceTextViaWhatsApp(targetInv, data);
      if (res.success) {
        toast(`✅ Official text receipt for ${targetInv.no} sent directly to ${targetInv.customer}'s WhatsApp!`);
        setPdfSentStatus(`✅ Text receipt sent successfully via Meta Cloud API!`);
      } else {
        toast(`❌ Failed to send text receipt: ${res.message}`, 'error');
      }
    } catch (err: any) {
      toast(`Error sending text receipt: ${err?.message || 'Unknown error'}`, 'error');
    } finally {
      setSendingText(false);
    }
  };

  const handleSendBridalPDF = async () => {
    if (!targetPhone) {
      toast('Please enter or select a recipient mobile number.', 'error');
      return;
    }
    setSendingPDF(true);
    setPdfSentStatus(null);
    toast(`⏳ Sending Bridal Rate Card PDF to ${targetPhone} via Meta WhatsApp API…`);

    try {
      const res = await sendBridalRateCardPDFViaWhatsApp(data?.bridalPackages || [], targetPhone, targetName, data);
      if (res.success) {
        toast(`✅ Bridal Rate Card PDF sent directly to ${targetName || targetPhone}'s WhatsApp via Meta API!`);
        setPdfSentStatus(`✅ Bridal Rate Card PDF Sent successfully via Meta Cloud API!`);
      } else {
        toast(`❌ Failed to send PDF via Meta API: ${res.message}`, 'error');
      }
    } catch (err: any) {
      toast(`Error sending PDF: ${err?.message || 'Unknown error'}`, 'error');
    } finally {
      setSendingPDF(false);
    }
  };

  const handleSendMessage = () => {
    if (!targetPhone) {
      toast('Please enter or select a recipient mobile number.', 'error');
      return;
    }
    if (selectedTemplate === 'invoice') {
      handleSendInvoicePDF();
      return;
    }
    if (selectedTemplate === 'bridal') {
      handleSendBridalPDF();
      return;
    }

    const messageToSend = expandTemplateVariables(manualText || generatedMessage, templateContext);
    openWAApp(targetPhone, messageToSend);
    toast(`📲 Opening WhatsApp App for ${targetName || targetPhone}…`);
    setPdfSentStatus(`✅ WhatsApp App opened!`);
  };

  const handleDirectWebLaunch = () => {
    const messageToSend = expandTemplateVariables(manualText || generatedMessage, templateContext);
    openWAApp(targetPhone, messageToSend);
    toast('📲 Opening WhatsApp App with your message…');
  };

  const handleCopyMessage = () => {
    const messageToCopy = expandTemplateVariables(manualText || generatedMessage, templateContext);
    navigator.clipboard.writeText(messageToCopy);
    toast('Message copied to clipboard! Ready to paste into WhatsApp.');
  };

  // Web WhatsApp Auto Computed Datasets
  const todayStr = todayISO();
  const tomorrowStr = useMemo(() => format(addDays(new Date(), 1), 'yyyy-MM-dd'), []);
  const todayMMDD = useMemo(() => format(new Date(), 'MM-dd'), []);

  // 1. Appointments
  const todayAppointments = useMemo(() => {
    return appointments.filter((a) => a.date === todayStr);
  }, [appointments, todayStr]);

  const tomorrowAppointments = useMemo(() => {
    return appointments.filter((a) => a.date === tomorrowStr);
  }, [appointments, tomorrowStr]);

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

  const todaySagai = useMemo(() => {
    return customers.filter((c) => (c as any).sagaiDate && (c as any).sagaiDate.endsWith(todayMMDD));
  }, [customers, todayMMDD]);

  // 3. Advance Bookings (Bridal & Appointments with Advance Paid)
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

  // 1-Click Send via Web WhatsApp Helpers
  const markSent = (id: string) => {
    setSentLog((prev) => ({ ...prev, [id]: true }));
  };

  const handleSendApptWebWA = (appt: any) => {
    if (!appt.mobile) {
      toast('Client phone number missing.', 'error');
      return;
    }
    const msg = appointmentReminderMessage(appt, salon);
    openWAApp(appt.mobile, msg);
    markSent(`appt_${appt.id}`);
    toast(`📲 Opening WhatsApp App reminder for ${appt.customer}…`);
  };

  const handleSendWishWA = (c: any, occasion: 'birthday' | 'anniversary' | 'sagai') => {
    if (!c.mobile) {
      toast('Customer mobile missing.', 'error');
      return;
    }
    let msg = '';
    if (occasion === 'birthday') {
      msg = birthdayMessage(c.name, salon, 20);
    } else if (occasion === 'anniversary') {
      msg = anniversaryMessage(c.name, salon);
    } else {
      msg = sagaiAnniversaryMessage(c.name, salon);
    }
    openWAApp(c.mobile, msg);
    markSent(`wish_${c.id}_${occasion}`);
    toast(`🎉 Opening WhatsApp App wish for ${c.name}…`);
  };

  const handleSendInvoiceWA = (inv: any) => {
    if (!inv.mobile) {
      toast('Invoice recipient phone number is missing.', 'error');
      return;
    }
    const msg = invoiceMessage(inv, salon);
    openWAApp(inv.mobile, msg);
    markSent(`inv_${inv.id}`);
    toast(`🧾 Opening WhatsApp App invoice for ${inv.customer} (${inv.no})…`);
  };

  const handleSendAdvanceWA = (adv: any) => {
    if (!adv.mobile) {
      toast('Customer mobile is missing.', 'error');
      return;
    }
    const msg = advanceReceiptMessage(adv.customer, adv.service, adv.date, adv.advance, adv.total, salon);
    openWAApp(adv.mobile, msg);
    markSent(`adv_${adv.id}`);
    toast(`💰 Opening WhatsApp App Advance Receipt for ${adv.customer}…`);
  };

  const handleSendDueWA = (c: any) => {
    if (!c.mobile) {
      toast('Customer mobile is missing.', 'error');
      return;
    }
    const msg = paymentReminderMessage(c.name, c.balanceDue, salon, '9773240010@okaxis');
    openWAApp(c.mobile, msg);
    markSent(`due_${c.id}`);
    toast(`💵 Opening WhatsApp App payment due reminder for ${c.name}…`);
  };

  const handleSendAllTodayAppts = () => {
    if (todayAppointments.length === 0) {
      toast('No appointments scheduled for today.', 'info');
      return;
    }
    todayAppointments.forEach((a, index) => {
      setTimeout(() => {
        const msg = appointmentReminderMessage(a, salon);
        openWAApp(a.mobile, msg);
        markSent(`appt_${a.id}`);
      }, index * 1200);
    });
    toast(`🚀 Triggered WhatsApp App reminders for all ${todayAppointments.length} clients!`);
  };

  return (
    <div>
      {/* Meta Payment Issue Banner */}
      {data?.settings?.whatsappPaymentIssue && (
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
                  <span>⚠️ Meta Action Required: Add Payment Method to WhatsApp Account</span>
                  <span style={{ fontSize: 11, background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                    Error 131042
                  </span>
                </div>
                <p style={{ margin: '4px 0 8px', fontSize: 12.5, color: '#7f1d1d', lineHeight: 1.5, maxWidth: 820 }}>
                  Meta Cloud API has paused automated dispatch for WABA <code>3350176545369989</code> (+91 97732 40010) because no payment method (card or UPI) is attached.
                  Use <b>Web WhatsApp</b> for 100% free, direct and unlimited message dispatch!
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <a
                    href={
                      data?.settings?.whatsappPaymentIssue?.href ||
                      'https://business.facebook.com/billing_hub/accounts/details/?business_id=2541939702957992&asset_id=3350176545369989&wizard_name=ADD_PM&account_type=whatsapp-business-account'
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm"
                    style={{
                      background: '#dc2626',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: 12,
                      padding: '8px 14px',
                      borderRadius: 8,
                      border: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      textDecoration: 'none',
                      boxShadow: '0 2px 8px rgba(220,38,38,0.25)',
                    }}
                  >
                    <ExternalLink size={14} />
                    <span>💳 Add Payment Method on Meta Business Manager</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* WhatsApp App Auto Messenger Banner */}
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
            onClick={() => window.open('https://api.whatsapp.com/send', '_blank')}
            title="Open WhatsApp App"
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
                APP READY
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#d1fae5', opacity: 0.95 }}>
              Send 1-Click WhatsApp reminders, bills, advance receipts &amp; wishes directly using the official WhatsApp App!
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => launchWhatsAppCompanionWindow()}
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
            title="Opens WhatsApp Web in a dedicated side-by-side companion window on this screen"
          >
            <Globe size={15} color="#05424A" /> 🖥️ Open WhatsApp Web Window (એ જ સ્ક્રીન પર ઓપન કરો)
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => window.open('https://api.whatsapp.com/send', '_blank')}
            style={{
              background: '#25D366',
              color: '#ffffff',
              fontWeight: 800,
              border: 'none',
              padding: '9px 15px',
              fontSize: 13,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 4px 14px rgba(37,211,102,0.35)',
              cursor: 'pointer',
            }}
          >
            <ExternalLink size={15} /> 📲 Open WhatsApp App
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
            <Settings size={14} /> Meta Settings
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
          <span>⚡ WhatsApp App (ઓટો સેન્ડ)</span>
          {(todayAppointments.length > 0 || todayBirthdays.length > 0) && (
            <span
              className="tab-badge"
              style={{
                background: activeTab === 'web_auto' ? '#fff' : '#25D366',
                color: activeTab === 'web_auto' ? '#15803d' : '#fff',
                fontWeight: 800,
              }}
            >
              {todayAppointments.length + todayBirthdays.length} Today
            </span>
          )}
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

      {/* TAB 0: WhatsApp App 1-Click Auto Messaging Center */}
      {activeTab === 'web_auto' && (
        <motion.div variants={fadeSlideUp} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Sub-Category Navigation Bar */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: 10,
            }}
          >
            {[
              {
                id: 'appointments',
                label: "Today's Appointments",
                sub: 'એપોઇન્ટમેન્ટ રીમાઇન્ડર',
                count: todayAppointments.length,
                badgeColor: '#0284c7',
                icon: Calendar,
              },
              {
                id: 'birthdays',
                label: 'Wishes & Celebrations',
                sub: 'જન્મદિવસ / એનિવર્સરી',
                count: todayBirthdays.length + todayAnniversaries.length + todaySagai.length,
                badgeColor: '#e11d48',
                icon: Gift,
              },
              {
                id: 'invoices',
                label: 'Bills & Invoices',
                sub: 'બિલિંગ રસીદ મોકલો',
                count: recentInvoices.length,
                badgeColor: '#16a34a',
                icon: Receipt,
              },
              {
                id: 'advances',
                label: 'Advance Receipts',
                sub: 'એડવાન્સ બુકિંગ પહોંચ',
                count: advanceBookings.length,
                badgeColor: '#d97706',
                icon: Coins,
              },
              {
                id: 'dues',
                label: 'Pending Khata Dues',
                sub: 'બાકી પેમેન્ટ ઉઘરાણી',
                count: dueCustomers.length,
                badgeColor: '#dc2626',
                icon: Clock,
              },
              {
                id: 'quick',
                label: 'Fast Instant Send',
                sub: 'ઝડપી મેસેજ મોકલો',
                count: null,
                badgeColor: '#25D366',
                icon: Zap,
              },
            ].map((cat) => {
              const isSelected = webAutoCategory === cat.id;
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setWebAutoCategory(cat.id as WebAutoCategory)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: isSelected ? '2px solid #25D366' : '1px solid var(--border)',
                    background: isSelected ? 'linear-gradient(135deg, rgba(37,211,102,0.12), rgba(37,211,102,0.04))' : '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 4,
                    textAlign: 'left',
                    boxShadow: isSelected ? '0 4px 14px rgba(37,211,102,0.15)' : '0 1px 3px rgba(0,0,0,0.04)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: isSelected ? '#25D366' : '#f1f5f9',
                        color: isSelected ? '#ffffff' : 'var(--text)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={15} />
                    </div>
                    {cat.count !== null && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          background: cat.count > 0 ? cat.badgeColor : '#94a3b8',
                          color: '#ffffff',
                          padding: '1px 7px',
                          borderRadius: 99,
                        }}
                      >
                        {cat.count}
                      </span>
                    )}
                  </div>
                  <div style={{ marginTop: 2 }}>
                    <div style={{ fontWeight: 800, fontSize: 13, color: isSelected ? '#15803d' : 'var(--text)' }}>
                      {cat.label}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{cat.sub}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Search Bar for Web Auto */}
          {webAutoCategory !== 'quick' && (
            <div className="card" style={{ padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  className="input"
                  placeholder="Search by customer name, mobile number, bill no or service…"
                  value={autoSearch}
                  onChange={(e) => setAutoSearch(e.target.value)}
                  style={{ paddingLeft: 36 }}
                />
              </div>
              {autoSearch && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setAutoSearch('')}
                  style={{ fontSize: 12 }}
                >
                  Clear Search
                </button>
              )}
            </div>
          )}

          {/* CATEGORY 1: TODAY'S & UPCOMING APPOINTMENTS */}
          {webAutoCategory === 'appointments' && (
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--teal)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Calendar size={18} /> Today&apos;s Appointments · આજની એપોઇન્ટમેન્ટ્સ ({todayAppointments.length})
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: 12.5, color: '#64748b' }}>
                    1-Click opens WhatsApp App with client name, service, timing, and Google Calendar link.
                  </p>
                </div>

                {todayAppointments.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleSendAllTodayAppts}
                    style={{
                      background: 'linear-gradient(135deg, #25D366, #15803d)',
                      borderColor: '#25D366',
                      fontWeight: 800,
                      padding: '8px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: '0 4px 12px rgba(37,211,102,0.3)',
                    }}
                  >
                    <Zap size={14} /> ⚡ Send Reminders to All Today&apos;s Clients (WhatsApp App)
                  </button>
                )}
              </div>

              {todayAppointments.length === 0 && !autoSearch ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
                  <Calendar size={36} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#475569' }}>No appointments scheduled for today.</div>
                  <p style={{ margin: '4px 0 12px', fontSize: 12.5, color: '#94a3b8' }}>
                    You can view tomorrow&apos;s or upcoming appointments below:
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {todayAppointments
                    .filter((a) => !autoSearch || a.customer.toLowerCase().includes(autoSearch.toLowerCase()) || a.mobile.includes(autoSearch) || (a.service || '').toLowerCase().includes(autoSearch.toLowerCase()))
                    .map((a) => {
                      const isSent = sentLog[`appt_${a.id}`];
                      return (
                        <div
                          key={a.id}
                          style={{
                            padding: '14px 16px',
                            borderRadius: 10,
                            border: '1px solid var(--border)',
                            background: isSent ? 'rgba(37,211,102,0.05)' : '#ffffff',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 12,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: 10,
                                background: '#f0fdf4',
                                color: '#16a34a',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: 12,
                                border: '1px solid #bbf7d0',
                                flexShrink: 0,
                              }}
                            >
                              <Clock size={14} />
                              <span style={{ fontSize: 10 }}>{a.time}</span>
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>{a.customer}</span>
                                <span style={{ fontSize: 11, background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: 4 }}>
                                  📞 {a.mobile}
                                </span>
                                {Number(a.advance || 0) > 0 && (
                                  <span style={{ fontSize: 10.5, fontWeight: 700, background: '#fef3c7', color: '#b45309', padding: '1px 6px', borderRadius: 4 }}>
                                    Adv: {money(a.advance || 0)}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                                💄 <b>{a.service}</b> {a.staff ? `• Specialist: ${a.staff}` : ''}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {isSent && (
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Check size={14} /> Sent
                              </span>
                            )}
                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={() => handleSendApptWebWA(a)}
                              style={{
                                background: '#25D366',
                                color: '#ffffff',
                                fontWeight: 800,
                                border: 'none',
                                padding: '7px 14px',
                                fontSize: 12,
                                borderRadius: 8,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(37,211,102,0.3)',
                              }}
                            >
                              <ExternalLink size={13} /> 📲 Send Reminder (WhatsApp)
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Tomorrow's Appointments Section */}
              {tomorrowAppointments.length > 0 && (
                <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px dashed var(--border)' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 800, color: '#0369a1', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={16} /> Tomorrow&apos;s Appointments ({tomorrowAppointments.length})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {tomorrowAppointments.map((a) => (
                      <div
                        key={a.id}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                          background: '#f8fafc',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 10,
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 700, fontSize: 13 }}>{a.customer}</span>
                          <span style={{ fontSize: 11.5, color: '#64748b', marginLeft: 8 }}>
                            ⏰ {a.time} • 💄 {a.service}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => handleSendApptWebWA(a)}
                          style={{
                            background: '#0284c7',
                            color: '#ffffff',
                            fontWeight: 700,
                            border: 'none',
                            padding: '5px 12px',
                            fontSize: 11.5,
                            borderRadius: 6,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <ExternalLink size={12} /> 📲 Send Reminder
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CATEGORY 2: BIRTHDAYS & CELEBRATIONS */}
          {webAutoCategory === 'birthdays' && (
            <div className="card" style={{ padding: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#e11d48', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Gift size={18} /> Birthday &amp; Anniversary Wishes · જન્મદિવસ / એનિવર્સરી શુભેચ્છા
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: 12.5, color: '#64748b' }}>
                  Auto-composed warm wishes with 20% celebratory salon treat discount voucher sent directly via WhatsApp.
                </p>
              </div>

              {todayBirthdays.length === 0 && todayAnniversaries.length === 0 && todaySagai.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', background: '#fff1f2', borderRadius: 12, border: '1px dashed #fecdd3' }}>
                  <Gift size={36} color="#fb7185" style={{ margin: '0 auto 8px' }} />
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#9f1239' }}>No customer birthdays or anniversaries today!</div>
                  <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#be123c' }}>
                    Customer celebrations occurring on today&apos;s date ({format(new Date(), 'dd MMMM')}) will automatically pop up here for 1-click wishing.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Today Birthdays */}
                  {todayBirthdays.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        padding: '14px 16px',
                        borderRadius: 10,
                        border: '1.5px solid #fecdd3',
                        background: '#fff1f2',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 12,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#ffe4e6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                          🎂
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 14, color: '#9f1239' }}>
                            {c.name} — <span style={{ fontSize: 12, fontWeight: 700 }}>🎉 Birthday Today!</span>
                          </div>
                          <div style={{ fontSize: 12, color: '#be123c' }}>📞 {c.mobile} • Send 20% Birthday Discount Treat</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => handleSendWishWA(c, 'birthday')}
                        style={{
                          background: '#e11d48',
                          color: '#ffffff',
                          fontWeight: 800,
                          border: 'none',
                          padding: '8px 16px',
                          fontSize: 12,
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(225,29,72,0.3)',
                        }}
                      >
                        <ExternalLink size={13} /> 🎁 Send Birthday Wish (WhatsApp)
                      </button>
                    </div>
                  ))}

                  {/* Today Anniversaries */}
                  {todayAnniversaries.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        padding: '14px 16px',
                        borderRadius: 10,
                        border: '1.5px solid #e9d5ff',
                        background: '#faf5ff',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 12,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                          💍
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 14, color: '#6b21a8' }}>
                            {c.name} — <span style={{ fontSize: 12, fontWeight: 700 }}>💕 Wedding Anniversary Today!</span>
                          </div>
                          <div style={{ fontSize: 12, color: '#7e22ce' }}>📞 {c.mobile}</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => handleSendWishWA(c, 'anniversary')}
                        style={{
                          background: '#9333ea',
                          color: '#ffffff',
                          fontWeight: 800,
                          border: 'none',
                          padding: '8px 16px',
                          fontSize: 12,
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(147,51,234,0.3)',
                        }}
                      >
                        <ExternalLink size={13} /> 💍 Send Anniversary Wish (WhatsApp)
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CATEGORY 3: BILLS & INVOICES */}
          {webAutoCategory === 'invoices' && (
            <div className="card" style={{ padding: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Receipt size={18} /> Invoices &amp; Digital Bills · બિલિંગ રસીદ મોકલો
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: 12.5, color: '#64748b' }}>
                  Send itemized bill breakdown or PDF download link directly to customer via WhatsApp App.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {recentInvoices
                  .filter((inv) => !autoSearch || inv.customer.toLowerCase().includes(autoSearch.toLowerCase()) || inv.no.toLowerCase().includes(autoSearch.toLowerCase()) || (inv.mobile || '').includes(autoSearch))
                  .slice(0, 20)
                  .map((inv) => {
                    const isSent = sentLog[`inv_${inv.id}`];
                    return (
                      <div
                        key={inv.id}
                        style={{
                          padding: '14px 16px',
                          borderRadius: 10,
                          border: '1px solid var(--border)',
                          background: isSent ? 'rgba(37,211,102,0.05)' : '#ffffff',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 12,
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 800, fontSize: 14 }}>{inv.no}</span>
                            <span style={{ fontWeight: 700, color: 'var(--text)' }}>{inv.customer}</span>
                            <span style={{ fontSize: 11, background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: 4 }}>
                              📞 {inv.mobile}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
                            📅 {fmtDate(inv.date)} • 💵 Total: <b>{money(inv.total)}</b> (Paid: {money(inv.paid || 0)}
                            {Number(inv.balance || 0) > 0 ? `, Due: ${money(inv.balance)}` : ''})
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => handleSendInvoiceWA(inv)}
                            style={{
                              background: '#25D366',
                              color: '#ffffff',
                              fontWeight: 800,
                              border: 'none',
                              padding: '7px 14px',
                              fontSize: 12,
                              borderRadius: 8,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              cursor: 'pointer',
                              boxShadow: '0 2px 8px rgba(37,211,102,0.25)',
                            }}
                          >
                            <ExternalLink size={13} /> 📲 Send WhatsApp Bill
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={async () => {
                              await downloadInvoicePDF(inv, data);
                              toast('✅ PDF Bill Downloaded!');
                            }}
                            style={{ fontSize: 11.5, padding: '7px 10px' }}
                            title="Download PDF Invoice"
                          >
                            <Download size={13} /> PDF
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* CATEGORY 4: ADVANCE BOOKING RECEIPTS */}
          {webAutoCategory === 'advances' && (
            <div className="card" style={{ padding: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#d97706', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Coins size={18} /> Advance Payment Receipts · એડવાન્સ બુકિંગ પહોંચ ({advanceBookings.length})
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: 12.5, color: '#64748b' }}>
                  Send official advance payment token confirmation receipts with date lock &amp; remaining balance details.
                </p>
              </div>

              {advanceBookings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', background: '#fffbeb', borderRadius: 12, border: '1px dashed #fde68a' }}>
                  <Coins size={36} color="#d97706" style={{ margin: '0 auto 8px' }} />
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#92400e' }}>No active advance bookings found.</div>
                  <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#b45309' }}>
                    When a client pays advance for bridal or salon appointments, it will appear here for instant WhatsApp receipt dispatch.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {advanceBookings
                    .filter((adv) => !autoSearch || adv.customer.toLowerCase().includes(autoSearch.toLowerCase()) || adv.mobile.includes(autoSearch) || adv.service.toLowerCase().includes(autoSearch.toLowerCase()))
                    .map((adv) => {
                      const isSent = sentLog[`adv_${adv.id}`];
                      return (
                        <div
                          key={adv.id}
                          style={{
                            padding: '14px 16px',
                            borderRadius: 10,
                            border: '1.5px solid #fde68a',
                            background: '#fffbeb',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 12,
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontWeight: 800, fontSize: 14, color: '#78350f' }}>{adv.customer}</span>
                              <span style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                                📞 {adv.mobile}
                              </span>
                              <span style={{ fontSize: 10.5, fontWeight: 800, background: '#25D366', color: '#fff', padding: '1px 6px', borderRadius: 4 }}>
                                Advance: {money(adv.advance)}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: '#92400e', marginTop: 3 }}>
                              💄 {adv.service} • 📅 Event Date: <b>{fmtDate(adv.date)}</b> • ⏳ Due: {money(adv.balance)}
                            </div>
                          </div>

                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => handleSendAdvanceWA(adv)}
                            style={{
                              background: '#25D366',
                              color: '#ffffff',
                              fontWeight: 800,
                              border: 'none',
                              padding: '8px 16px',
                              fontSize: 12,
                              borderRadius: 8,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              cursor: 'pointer',
                              boxShadow: '0 2px 8px rgba(37,211,102,0.3)',
                            }}
                          >
                            <ExternalLink size={13} /> 💰 Send Advance Receipt (WhatsApp)
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* CATEGORY 5: KHATA / DUE PAYMENTS */}
          {webAutoCategory === 'dues' && (
            <div className="card" style={{ padding: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={18} /> Khata &amp; Pending Balance Reminders · બાકી પેમેન્ટ ઉઘરાણી ({dueCustomers.length})
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: 12.5, color: '#64748b' }}>
                  Send polite payment due reminders with UPI ID (9773240010@okaxis) via WhatsApp App.
                </p>
              </div>

              {dueCustomers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', background: '#f0fdf4', borderRadius: 12, border: '1px dashed #bbf7d0' }}>
                  <CheckCircle2 size={36} color="#16a34a" style={{ margin: '0 auto 8px' }} />
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#166534' }}>All customer accounts are 100% clear!</div>
                  <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#15803d' }}>No pending balances or khata dues at this time.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {dueCustomers
                    .filter((c) => !autoSearch || c.name.toLowerCase().includes(autoSearch.toLowerCase()) || c.mobile.includes(autoSearch))
                    .map((c) => (
                      <div
                        key={c.id}
                        style={{
                          padding: '14px 16px',
                          borderRadius: 10,
                          border: '1.5px solid #fecaca',
                          background: '#fef2f2',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 12,
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 800, fontSize: 14, color: '#991b1b' }}>{c.name}</span>
                            <span style={{ fontSize: 11, background: '#fee2e2', color: '#991b1b', padding: '1px 6px', borderRadius: 4 }}>
                              📞 {c.mobile}
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 800, background: '#dc2626', color: '#fff', padding: '1px 7px', borderRadius: 4 }}>
                              Due: {money(c.balanceDue)}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 3 }}>
                            Total Spend: {money(c.totalSpend)} • Visits: {c.visitCount}
                            {c.lastVisit ? ` • Last Visit: ${fmtDate(c.lastVisit)}` : ''}
                          </div>
                        </div>

                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => handleSendDueWA(c)}
                          style={{
                            background: '#dc2626',
                            color: '#ffffff',
                            fontWeight: 800,
                            border: 'none',
                            padding: '8px 16px',
                            fontSize: 12,
                            borderRadius: 8,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(220,38,38,0.25)',
                          }}
                        >
                          <ExternalLink size={13} /> 💵 Send Due Reminder (WhatsApp)
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* CATEGORY 6: FAST INSTANT WHATSAPP SENDER */}
          {webAutoCategory === 'quick' && (
            <div className="card" style={{ padding: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#15803d', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Zap size={18} /> Fast Instant WhatsApp Sender · ઝડપી મેસેજ મોકલો
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: 12.5, color: '#64748b' }}>
                  Pick customer, choose template, and launch directly into WhatsApp App with 1 click!
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1.2fr) minmax(300px, 1fr)', gap: 16, alignItems: 'start' }}>
                <div>
                  <div className="form-grid" style={{ marginBottom: 12 }}>
                    <div className="form-group">
                      <label className="label">Select Customer Name</label>
                      <input
                        type="text"
                        className="input"
                        list="wa-quick-cust-names"
                        placeholder="Search customer name…"
                        value={targetName}
                        onChange={(e) => handleSelectCustomerName(e.target.value)}
                      />
                      <datalist id="wa-quick-cust-names">
                        {customers.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name} — 📞 {c.mobile}
                          </option>
                        ))}
                      </datalist>
                    </div>
                    <div className="form-group">
                      <label className="label">Mobile Number (10 digits) *</label>
                      <input
                        type="tel"
                        className="input"
                        list="wa-quick-cust-mobiles"
                        placeholder="e.g. 9898012345"
                        value={targetPhone}
                        onChange={(e) => handleSelectCustomer(e.target.value)}
                      />
                      <datalist id="wa-quick-cust-mobiles">
                        {customers.map((c) => (
                          <option key={c.id} value={c.mobile}>
                            {c.mobile} — 👤 {c.name}
                          </option>
                        ))}
                      </datalist>
                    </div>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label className="label">Choose Message Template:</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
                      {[
                        { id: 'appointment', label: '📅 Booking Confirm' },
                        { id: 'invoice', label: '🧾 Bill Receipt' },
                        { id: 'birthday', label: '🎂 Birthday Wish' },
                        { id: 'anniversary', label: '💍 Anniversary' },
                        { id: 'review', label: '⭐ Google Review' },
                        { id: 'payment', label: '💳 Payment Reminder' },
                        { id: 'loyalty', label: '🌟 Points & Wallet' },
                        { id: 'bridal', label: '👰 Bridal Package' },
                        { id: 'custom', label: '✍️ Custom Text' },
                      ].map((tpl) => (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => handleTemplateSelect(tpl.id as TemplateId)}
                          style={{
                            padding: '8px 10px',
                            borderRadius: 8,
                            border: selectedTemplate === tpl.id ? '2px solid #25D366' : '1px solid var(--border)',
                            background: selectedTemplate === tpl.id ? 'rgba(37,211,102,0.1)' : '#f8fafc',
                            color: selectedTemplate === tpl.id ? '#15803d' : 'var(--text)',
                            fontWeight: selectedTemplate === tpl.id ? 800 : 500,
                            fontSize: 11.5,
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          {tpl.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 14 }}>
                    <label className="label">Live Message Content:</label>
                    <textarea
                      className="input"
                      rows={6}
                      value={manualText}
                      onChange={(e) => {
                        setManualText(e.target.value);
                        setIsManualEdited(true);
                      }}
                      style={{ fontFamily: 'inherit', fontSize: 13, lineHeight: 1.5 }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        if (!targetPhone) {
                          toast('Please enter or select a mobile number.', 'error');
                          return;
                        }
                        const msg = expandTemplateVariables(manualText || generatedMessage, templateContext);
                        openWAApp(targetPhone, msg);
                        toast(`📲 Opening WhatsApp App for ${targetName || targetPhone}…`);
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #25D366, #15803d)',
                        borderColor: '#25D366',
                        fontWeight: 800,
                        fontSize: 13,
                        padding: '10px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        boxShadow: '0 4px 14px rgba(37,211,102,0.35)',
                      }}
                    >
                      <ExternalLink size={16} /> 📲 Send via WhatsApp App
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={handleCopyMessage}
                      style={{ fontSize: 12.5 }}
                    >
                      <Copy size={14} /> Copy Message
                    </button>
                  </div>
                </div>

                {/* Right Column: WhatsApp Mockup */}
                <div
                  style={{
                    background: '#e5ddd5',
                    borderRadius: 16,
                    padding: 16,
                    border: '1px solid #d1d5db',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                  }}
                >
                  <div
                    style={{
                      background: '#075e54',
                      color: '#fff',
                      padding: '10px 14px',
                      borderRadius: '12px 12px 0 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                      🌸
                    </div>
                    <div>
                      <div>{targetName || 'Customer'}</div>
                      <div style={{ fontSize: 10, opacity: 0.85 }}>+91 {targetPhone || '98980XXXXX'}</div>
                    </div>
                  </div>
                  <div
                    style={{
                      background: '#efeae2',
                      padding: 14,
                      minHeight: 220,
                      borderRadius: '0 0 12px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <div
                      style={{
                        background: '#ffffff',
                        padding: '10px 12px',
                        borderRadius: '8px 8px 0 8px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                        maxWidth: '92%',
                        alignSelf: 'flex-end',
                        whiteSpace: 'pre-wrap',
                        fontSize: 12.5,
                        lineHeight: 1.45,
                        color: '#111827',
                      }}
                    >
                      {expandTemplateVariables(manualText || generatedMessage, templateContext)}
                      <div style={{ textAlign: 'right', fontSize: 10, color: '#9ca3af', marginTop: 4 }}>
                        {format(new Date(), 'hh:mm a')} ✓✓
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
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
                  onChange={(e) => handleSelectCustomerName(e.target.value)}
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
                    onChange={(e) => handleSelectCustomer(e.target.value)}
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

            {/* Template Specific Options */}
            {selectedTemplate === 'appointment' && (
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="label">Link Specific Appointment (Optional):</label>
                <select
                  className="input"
                  value={selectedApptId}
                  onChange={(e) => {
                    setSelectedApptId(e.target.value);
                    const a = appointments.find((x) => x.id === e.target.value);
                    if (a) {
                      setTargetName(a.customer);
                      setTargetPhone(a.mobile);
                    }
                  }}
                >
                  <option value="">-- Latest / Sample Appointment --</option>
                  {appointments.slice(0, 10).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.customer} • {fmtDate(a.date)} {a.time} ({a.service})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedTemplate === 'invoice' && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 14, marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Receipt size={16} /> Direct WhatsApp PDF Invoice Dispatch
                  </div>
                  {selectedInvoiceId && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 11, padding: '2px 8px', color: '#15803d', fontWeight: 700 }}
                      onClick={async () => {
                        const inv = invoices.find((x) => x.id === selectedInvoiceId) || invoices[0];
                        if (inv) {
                          await downloadInvoicePDF(inv, data);
                          toast('✅ Official PDF Bill Downloaded!');
                        }
                      }}
                    >
                      <Download size={12} /> Download PDF
                    </button>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label className="label" style={{ fontSize: 11.5, color: '#15803d', fontWeight: 700 }}>Select Invoice to Send as PDF File:</label>
                  <select
                    className="input"
                    style={{ background: '#ffffff', borderColor: '#86efac' }}
                    value={selectedInvoiceId}
                    onChange={(e) => {
                      setSelectedInvoiceId(e.target.value);
                      const inv = invoices.find((x) => x.id === e.target.value);
                      if (inv) {
                        setTargetName(inv.customer);
                        setTargetPhone(inv.mobile);
                      }
                    }}
                  >
                    <option value="">-- Latest / Sample Invoice --</option>
                    {invoices.slice(0, 15).map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.no} • {inv.customer} ({money(inv.total)})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, alignItems: 'center' }}>
                  <motion.button
                    type="button"
                    className="btn btn-primary"
                    disabled={sendingPDF}
                    onClick={handleSendInvoicePDF}
                    style={{
                      background: 'linear-gradient(135deg, #16a34a, #15803d)',
                      borderColor: '#16a34a',
                      fontSize: 12.5,
                      fontWeight: 700,
                      padding: '9px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      boxShadow: '0 3px 10px rgba(22,163,74,0.25)',
                    }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Receipt size={15} /> {sendingPDF ? 'Generating & Sending PDF…' : '📄 Send PDF Bill (WhatsApp)'}
                  </motion.button>

                  <motion.button
                    type="button"
                    className="btn btn-primary"
                    disabled={sendingText}
                    onClick={handleSendInvoiceText}
                    style={{
                      background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                      borderColor: '#2563eb',
                      fontSize: 12.5,
                      fontWeight: 700,
                      padding: '9px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      boxShadow: '0 3px 10px rgba(37,99,235,0.25)',
                    }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <MessageSquare size={15} /> {sendingText ? 'Sending Text…' : '💬 Send Text Receipt (Approved)'}
                  </motion.button>
                </div>

                {pdfSentStatus && (
                  <div style={{ fontSize: 11.5, color: '#15803d', fontWeight: 700, marginTop: 8, textAlign: 'center' }}>
                    {pdfSentStatus}
                  </div>
                )}
              </div>
            )}

            {selectedTemplate === 'bridal' && (
              <div style={{ background: '#fdf2f8', border: '1px solid #fbcfe8', borderRadius: 10, padding: 14, marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: '#9d174d', display: 'flex', alignItems: 'center', gap: 6 }}>
                    👑 Direct WhatsApp Bridal Rate Card PDF Dispatch
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: 11, padding: '2px 8px', color: '#be185d', fontWeight: 700 }}
                    onClick={async () => {
                      await downloadBridalRateCardPDF(data?.bridalPackages || [], data);
                      toast('✅ Official Bridal Rate Card PDF Downloaded!');
                    }}
                  >
                    <Download size={12} /> Download Rate Card PDF
                  </button>
                </div>

                <p style={{ fontSize: 11.5, color: '#be185d', margin: '0 0 10px', lineHeight: 1.4 }}>
                  Sends the 2-page official <b>Shree Beauty Studio Glamour Lounge Rate Card PDF</b> (Siders &amp; Bridal Packages with live prices) directly to customer&apos;s WhatsApp!
                </p>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <motion.button
                    type="button"
                    className="btn btn-primary"
                    disabled={sendingPDF}
                    onClick={handleSendBridalPDF}
                    style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, #db2777, #be185d)',
                      borderColor: '#db2777',
                      fontSize: 12.5,
                      fontWeight: 700,
                      padding: '9px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      boxShadow: '0 3px 10px rgba(219,39,119,0.25)',
                    }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Sparkles size={15} /> {sendingPDF ? 'Generating & Sending PDF…' : '📄 Send Bridal Rate Card PDF via WhatsApp API'}
                  </motion.button>
                </div>

                {pdfSentStatus && (
                  <div style={{ fontSize: 11.5, color: '#be185d', fontWeight: 700, marginTop: 8, textAlign: 'center' }}>
                    {pdfSentStatus}
                  </div>
                )}
              </div>
            )}

            {selectedTemplate === 'festival' && (
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="label">Festival Offer Text:</label>
                <textarea
                  className="input"
                  rows={2}
                  value={promoOffer}
                  onChange={(e) => setPromoOffer(e.target.value)}
                  placeholder="e.g. Flat 20% OFF on all Hair Spa & Facials!"
                />
              </div>
            )}

            {selectedTemplate === 'custom' && (
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="label">Custom Message Text:</label>
                <textarea
                  className="input"
                  rows={4}
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Type your personalized message here…"
                />
              </div>
            )}

            {/* Interactive Manual Template Editor & Permanent Save System */}
            <div className="form-group" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label className="label" style={{ fontWeight: 800, color: 'var(--teal)', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                    <Pencil size={15} color="var(--teal)" /> 2. WhatsApp Template Editor (ટેમ્પલેટ સેવ ઓપ્શન)
                  </label>
                  {hasCustomSavedTemplate ? (
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        background: '#dcfce7',
                        color: '#15803d',
                        padding: '2px 8px',
                        borderRadius: 99,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        border: '1px solid #86efac',
                      }}
                    >
                      💾 કાયમી સેવ કરેલું ટેમ્પલેટ
                    </span>
                  ) : isManualEdited ? (
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        padding: '2px 8px',
                        borderRadius: 99,
                        border: '1px solid #93c5fd',
                      }}
                    >
                      ✏️ unsaved changes
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 600,
                        background: '#f1f5f9',
                        color: '#64748b',
                        padding: '2px 8px',
                        borderRadius: 99,
                      }}
                    >
                      ⚡ Default Template
                    </span>
                  )}
                </div>

                {/* Template Action Buttons: Save & Reset */}
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
                      boxShadow: '0 2px 6px rgba(22,163,74,0.3)',
                    }}
                    title="કાયમી સેવ કરો: Future messages will use this custom text"
                  >
                    <Save size={13} /> 💾 Save Template (કાયમી સેવ કરો)
                  </button>

                  {(hasCustomSavedTemplate || isManualEdited) && (
                    <button
                      type="button"
                      onClick={handleResetCustomTemplate}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        color: '#475569',
                        padding: '5px 10px',
                        borderRadius: 6,
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                      title="મૂળ ડિફોલ્ટ સેટ કરો: Reset to system default"
                    >
                      <RotateCcw size={12} /> Reset (ડિફોલ્ટ કરો)
                    </button>
                  )}
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
                placeholder="Type or edit your custom WhatsApp message here... Use tags like {name}, {salon}, {date}, {time}, {amount}, {balance}"
                style={{
                  width: '100%',
                  fontFamily: 'inherit',
                  fontSize: 12.5,
                  lineHeight: 1.5,
                  padding: 10,
                  borderColor: hasCustomSavedTemplate ? '#16a34a' : isManualEdited ? '#3b82f6' : 'var(--border)',
                  background: hasCustomSavedTemplate ? '#f0fdf4' : isManualEdited ? '#eff6ff' : '#ffffff',
                }}
              />

              {/* Clickable Variable Tags */}
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>
                  📌 Click tag to insert dynamic variable placeholder:
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {[
                    { tag: '{name}', label: '👤 {name}' },
                    { tag: '{salon}', label: '🌸 {salon}' },
                    { tag: '{date}', label: '📅 {date}' },
                    { tag: '{time}', label: '⏰ {time}' },
                    { tag: '{service}', label: '💇 {service}' },
                    { tag: '{amount}', label: '💰 {amount}' },
                    { tag: '{balance}', label: '⚠️ {balance}' },
                    { tag: '{points}', label: '⭐ {points}' },
                    { tag: '{offer}', label: '🎁 {offer}' },
                    { tag: '{link}', label: '🔗 {link}' },
                  ].map((v) => (
                    <button
                      key={v.tag}
                      type="button"
                      onClick={() => insertVariableTag(v.tag)}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        padding: '2px 8px',
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#0f172a',
                        cursor: 'pointer',
                        transition: 'all 0.1s ease',
                      }}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                <span style={{ fontSize: 10.5, color: '#64748b' }}>
                  💡 ટેમ્પલેટ એડિટ કર્યા પછી <b>💾 Save Template</b> બટન દબાવો જેથી e જ સેવ રહેશે!
                </span>
                {hasCustomSavedTemplate && (
                  <span style={{ fontSize: 10.5, color: '#16a34a', fontWeight: 800 }}>
                    ✓ Saved Permanently in Store
                  </span>
                )}
              </div>
            </div>

            {/* Launch Settings */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                borderRadius: 10,
                background: '#f0fdf4',
                border: '1.5px solid #86efac',
                marginBottom: 16,
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: 13, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
                  🌐 WhatsApp Web &amp; 📲 App — 1-Click Direct Send
                </div>
                <div style={{ fontSize: 11, color: '#15803d', marginTop: 2 }}>
                  Opens WhatsApp Web or App directly with prefilled message — 100% Free &amp; Unlimited!
                </div>
              </div>
            </div>

            {/* Send Actions */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <motion.button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  if (!targetPhone) {
                    toast('Please enter or select a recipient mobile number.', 'error');
                    return;
                  }
                  const messageToSend = expandTemplateVariables(manualText || generatedMessage, templateContext);
                  openWAWeb(targetPhone, messageToSend);
                  toast(`🌐 Opening WhatsApp Web for ${targetName || targetPhone}…`);
                }}
                style={{
                  flex: 1,
                  minWidth: 160,
                  padding: '11px 16px',
                  fontSize: 13,
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #05424A 0%, #032B30 100%)',
                  border: '1.5px solid #05424A',
                  color: '#ffffff',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 6,
                  borderRadius: 10,
                  boxShadow: '0 4px 14px rgba(5,66,74,0.3)',
                }}
                whileTap={{ scale: 0.97 }}
              >
                <Globe size={16} color="#EABA38" /> 🌐 Send via WhatsApp Web
              </motion.button>

              <motion.button
                type="button"
                className="btn"
                onClick={handleSendMessage}
                style={{
                  flex: 1,
                  minWidth: 150,
                  padding: '11px 16px',
                  fontSize: 13,
                  fontWeight: 800,
                  background: '#25D366',
                  border: 'none',
                  color: '#ffffff',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 6,
                  borderRadius: 10,
                  boxShadow: '0 4px 14px rgba(37,211,102,0.35)',
                }}
                whileTap={{ scale: 0.97 }}
              >
                <Send size={15} /> 📲 Send via WhatsApp App
              </motion.button>

              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleCopyMessage}
                title="Copy formatted text"
                style={{ padding: '11px 14px', borderRadius: 10 }}
              >
                <Copy size={15} />
              </button>
            </div>
          </motion.div>

          {/* Right Column: Realistic WhatsApp Web Chat Preview Box */}
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
                <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.15)', padding: '3px 8px', borderRadius: 6 }}>
                  WhatsApp Web
                </span>
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
                  {selectedTemplate === 'invoice' && (
                    <div
                      style={{
                        background: '#ffffff',
                        border: '1px solid #bbf7d0',
                        borderRadius: 8,
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        marginBottom: 10,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      }}
                    >
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 8,
                          background: '#fee2e2',
                          color: '#dc2626',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: 11,
                        }}
                      >
                        PDF
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 12, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {(invoices.find((x) => x.id === selectedInvoiceId) || invoices[0])?.no || 'INVOICE'}.pdf
                        </div>
                        <div style={{ fontSize: 10.5, color: '#64748b' }}>
                          Official PDF Bill · 128 KB
                        </div>
                      </div>
                      <Receipt size={18} color="#16a34a" />
                    </div>
                  )}

                  {selectedTemplate === 'bridal' && (
                    <div
                      style={{
                        background: '#ffffff',
                        border: '1px solid #fbcfe8',
                        borderRadius: 8,
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        marginBottom: 10,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      }}
                    >
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 8,
                          background: '#fce7f3',
                          color: '#db2777',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: 11,
                        }}
                      >
                        PDF
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 12, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          Shree_Beauty_Studio_Bridal_Rate_Card.pdf
                        </div>
                        <div style={{ fontSize: 10.5, color: '#64748b' }}>
                          Official Glamour Lounge Rate Card · 2 Pages · 245 KB
                        </div>
                      </div>
                      <Sparkles size={18} color="#db2777" />
                    </div>
                  )}

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

              {/* Live Meta Chat Input Footer */}
              <div
                style={{
                  background: '#f0f2f5',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  borderTop: '1px solid #e9edef',
                  flexWrap: 'wrap',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (!targetPhone) {
                      toast('Please enter or select a recipient mobile number.', 'error');
                      return;
                    }
                    const messageToSend = expandTemplateVariables(manualText || generatedMessage, templateContext);
                    openWAWeb(targetPhone, messageToSend);
                    toast(`🌐 Opening WhatsApp Web for ${targetName || targetPhone}!`);
                  }}
                  style={{
                    flex: 1,
                    minWidth: 140,
                    background: '#05424A',
                    color: '#ffffff',
                    fontWeight: 800,
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    cursor: 'pointer',
                  }}
                >
                  <Globe size={13} color="#EABA38" /> 🌐 WhatsApp Web
                </button>
                <button
                  type="button"
                  onClick={handleSendMessage}
                  style={{
                    flex: 1,
                    minWidth: 140,
                    background: '#25D366',
                    color: '#053320',
                    fontWeight: 800,
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    cursor: 'pointer',
                  }}
                >
                  <Send size={13} /> 📲 WhatsApp App
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
                Filter client cohorts and reach out individually with 1 click to boost retention &amp; fill empty chairs.
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

          {/* Client Table with 1-Click WhatsApp Web Actions */}
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
                    <th>1-Click WhatsApp Action</th>
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
                              openWAApp(c.mobile, msg);
                              toast(`📲 Opening WhatsApp App for ${c.name}…`);
                            }}
                          >
                            <Send size={13} /> 📲 Send (WhatsApp App)
                          </button>

                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: 11, padding: '5px 8px' }}
                            onClick={() => {
                              setTargetName(c.name);
                              setTargetPhone(c.mobile);
                              setActiveTab('composer');
                              toast(`Loaded ${c.name} into message composer!`);
                            }}
                          >
                            Customize
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
          {/* Top Banner: Reception Standee QR Card & 24h Meta Rules */}
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

            {/* Right Card: How the 24-Hour Free Meta Policy Works */}
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
                    24-Hour Free Service Window Rules
                  </h3>
                </div>
                <p style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.5, margin: '0 0 12px' }}>
                  Meta WhatsApp Cloud API grants <strong>1,000 Free Service Conversations every calendar month (₹0 charged)</strong>:
                </p>
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 14, background: '#f0fdf4', color: '#16a34a', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800 }}>1</span>
                    <div style={{ fontSize: 12, color: '#334155' }}>
                      <strong>Customer Initiates:</strong> Customer scans the reception desk QR or sends any message (&quot;Hi&quot;) to +91 {salonPhone.replace(/\D/g, '').slice(-10)}.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 14, background: '#f0fdf4', color: '#16a34a', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800 }}>2</span>
                    <div style={{ fontSize: 12, color: '#334155' }}>
                      <strong>24h Window Opens:</strong> Meta opens a 24-hour customer service window for that phone number.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 14, background: '#f0fdf4', color: '#16a34a', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800 }}>3</span>
                    <div style={{ fontSize: 12, color: '#334155' }}>
                      <strong>Unlimited Free PDFs &amp; Texts:</strong> Within these 24 hours, you can send unlimited PDF invoices, appointment reminders, and custom texts via Meta Cloud API at ₹0 cost!
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 14, background: '#f0fdf4', color: '#16a34a', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800 }}>4</span>
                    <div style={{ fontSize: 12, color: '#334155' }}>
                      <strong>Outside 24h Fallback:</strong> If customer hasn&apos;t messaged within 24 hours, use <em>Direct WA</em> (100% free via WhatsApp Web) or official utility templates.
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: 14,
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 10,
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <CheckCircle2 size={16} color="#16a34a" />
                <div style={{ fontSize: 11.5, color: '#15803d', fontWeight: 600 }}>
                  Active Free Sessions in Studio: <strong>{active24hCount}</strong> client{active24hCount !== 1 ? 's' : ''} currently eligible for ₹0 Meta API dispatch.
                </div>
              </div>
            </div>
          </div>

          {/* Active 24-Hour Customer Sessions Table */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                  🟢 Active 24-Hour Free Customer Sessions
                </h3>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    background: active24hCount > 0 ? '#dcfce7' : '#f1f5f9',
                    color: active24hCount > 0 ? '#15803d' : '#64748b',
                    padding: '2px 8px',
                    borderRadius: 99,
                  }}
                >
                  {active24hCount} Active
                </span>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setReceptionDeskModalOpen(true)}
                style={{ fontSize: 12, fontWeight: 600, color: '#05424A', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <QrCode size={13} /> Show Desk QR
              </button>
            </div>

            {activeSessionsList.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '30px 16px',
                  color: '#64748b',
                  fontSize: 13,
                  background: '#f8fafc',
                  borderRadius: 12,
                  border: '1px dashed #cbd5e1',
                }}
              >
                <Smartphone size={28} style={{ opacity: 0.4, margin: '0 auto 8px' }} />
                <div style={{ fontWeight: 700, color: '#1e293b' }}>No active customer sessions right now</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  When clients scan the Reception QR and message &quot;Hi&quot;, their 24h free session will show here in real-time.
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Mobile</th>
                      <th>Last Message</th>
                      <th>Time Remaining</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSessionsList.map((sess) => (
                      <tr key={sess.mobile}>
                        <td style={{ fontWeight: 700, color: '#0f172a' }}>
                          {sess.name || 'Valued Client'}
                        </td>
                        <td style={{ fontFamily: 'monospace' }}>+91 {sess.mobile}</td>
                        <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64748b' }}>
                          {sess.lastMessage || 'Incoming chat interaction'}
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: sess.isExpired ? '#94a3b8' : '#15803d' }}>
                            {sess.formattedRemaining}
                          </span>
                        </td>
                        <td>
                          {sess.isExpired ? (
                            <span style={{ fontSize: 10.5, background: '#f1f5f9', color: '#64748b', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                              ⚪ Outside 24h
                            </span>
                          ) : (
                            <span style={{ fontSize: 10.5, background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                              🟢 24h Free Active
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={() => {
                                setTargetPhone(sess.mobile);
                                if (sess.name) setTargetName(sess.name);
                                setActiveTab('composer');
                              }}
                              style={{
                                background: '#05424A',
                                color: '#ffffff',
                                fontSize: 11,
                                fontWeight: 700,
                                padding: '4px 8px',
                                borderRadius: 6,
                              }}
                            >
                              ⚡ Compose Free Msg
                            </button>
                            <a
                              href={`https://wa.me/91${sess.mobile}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-sm"
                              style={{
                                background: '#25D366',
                                color: '#ffffff',
                                fontSize: 11,
                                fontWeight: 700,
                                padding: '4px 8px',
                                borderRadius: 6,
                                textDecoration: 'none',
                              }}
                            >
                              💬 Direct WA
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Meta Cloud API Templates Status Overview */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
              📋 Official Meta WhatsApp Message Templates Status
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ fontSize: 12 }}>
                <thead>
                  <tr>
                    <th>Template Name</th>
                    <th>Category</th>
                    <th>Meta Approval Status</th>
                    <th>Parameters</th>
                    <th>Dispatched For</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>shree_invoice_receipt</td>
                    <td><span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: 4, fontSize: 10.5, fontWeight: 700 }}>UTILITY</span></td>
                    <td><span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: 4, fontSize: 10.5, fontWeight: 800 }}>✅ APPROVED</span></td>
                    <td>Name, Invoice No, Total, Status</td>
                    <td>Instant Billing POS &amp; Tax Receipt</td>
                  </tr>
                  <tr>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>shree_appointment_reminder</td>
                    <td><span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: 4, fontSize: 10.5, fontWeight: 700 }}>UTILITY</span></td>
                    <td><span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: 4, fontSize: 10.5, fontWeight: 800 }}>✅ APPROVED</span></td>
                    <td>Name, Date, Time, Service</td>
                    <td>24h Prior Booking Reminder</td>
                  </tr>
                  <tr>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>shree_appointment_confirmation</td>
                    <td><span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: 4, fontSize: 10.5, fontWeight: 700 }}>UTILITY</span></td>
                    <td><span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: 4, fontSize: 10.5, fontWeight: 800 }}>✅ APPROVED</span></td>
                    <td>Name, Date, Time, Service</td>
                    <td>Approved Calendar Booking</td>
                  </tr>
                  <tr>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>shree_booking_confirmation</td>
                    <td><span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: 4, fontSize: 10.5, fontWeight: 700 }}>UTILITY</span></td>
                    <td><span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: 4, fontSize: 10.5, fontWeight: 800 }}>✅ APPROVED</span></td>
                    <td>Name, Date, Time, Service</td>
                    <td>Online &amp; Walk-in Bookings</td>
                  </tr>
                  <tr>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>shree_appt_update</td>
                    <td><span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: 4, fontSize: 10.5, fontWeight: 700 }}>UTILITY</span></td>
                    <td><span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: 4, fontSize: 10.5, fontWeight: 800 }}>✅ APPROVED</span></td>
                    <td>Name, Date, Time, Service</td>
                    <td>Rescheduled Appointments</td>
                  </tr>
                  <tr>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>shree_invoice_pdf</td>
                    <td><span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: 4, fontSize: 10.5, fontWeight: 700 }}>UTILITY</span></td>
                    <td><span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 6px', borderRadius: 4, fontSize: 10.5, fontWeight: 800 }}>🟡 PENDING REVIEW</span></td>
                    <td>Header PDF Document + Body</td>
                    <td>Direct PDF Attachment outside 24h</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Webhook Connection Guide */}
          <div className="card" style={{ padding: 22 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 800 }}>
              🔗 Meta WhatsApp Cloud API Credentials &amp; Webhook Setup
            </h3>
            <div style={{ display: 'grid', gap: 12 }}>
              <div className="form-group">
                <label className="label">Webhook Callback URL</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    className="input"
                    readOnly
                    value={typeof window !== 'undefined' ? `${window.location.origin}/api/whatsapp/webhook` : '/api/whatsapp/webhook'}
                    style={{ fontFamily: 'monospace', fontSize: 12.5 }}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      const url = typeof window !== 'undefined' ? `${window.location.origin}/api/whatsapp/webhook` : '/api/whatsapp/webhook';
                      navigator.clipboard.writeText(url);
                      toast('Webhook URL copied!');
                    }}
                  >
                    <Copy size={14} /> Copy
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="label">Verify Token (hub.verify_token)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    className="input"
                    readOnly
                    value="shree_beauty_webhook_token_2026"
                    style={{ fontFamily: 'monospace', fontSize: 12.5 }}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      navigator.clipboard.writeText('shree_beauty_webhook_token_2026');
                      toast('Verify Token copied!');
                    }}
                  >
                    <Copy size={14} /> Copy
                  </button>
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
