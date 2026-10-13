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
  ChevronDown,
  ChevronUp,
  Filter,
  Video,
  Laptop,
  CheckCircle,
  Paperclip,
  MoreVertical,
  Plus,
  Radio,
  Lock,
  User,
  Store,
  UserPlus,
  FileText,
  Volume2,
  Image as ImageIcon,
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
  sendDirectWhatsAppMessage,
} from '@/lib/whatsapp';
import ReceptionDeskQRModal from '@/components/whatsapp/ReceptionDeskQRModal';
import TodayWishesBanner from '@/components/wishes/TodayWishesBanner';
import WhatsAppQRScannerTab from '@/components/whatsapp/WhatsAppQRScannerTab';
import WhatsAppLiveChatTab from '@/components/whatsapp/WhatsAppLiveChatTab';
import WhatsAppSyncingModal from '@/components/whatsapp/WhatsAppSyncingModal';
import { staggerContainer, fadeSlideUp } from '@/variants';
import { format, addDays } from 'date-fns';

type WATab = 'connect' | 'composer' | 'broadcast' | 'incoming';
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

  const [activeTab, setActiveTab] = useState<WATab>('connect');
  const [connectSubView, setConnectSubView] = useState<'chat' | 'qr'>('chat');
  const [webAutoCategory, setWebAutoCategory] = useState<WebAutoCategory>('all');
  const [autoSearch, setAutoSearch] = useState('');
  const [sentLog, setSentLog] = useState<Record<string, boolean>>({});
  const [hideMetaBanner, setHideMetaBanner] = useState(false);
  const [batchSending, setBatchSending] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, name: '' });

  // WhatsApp Connect Chat States (Matches User Screenshot)
  const [connectSearch, setConnectSearch] = useState('9601014899');
  const [connectInputMessage, setConnectInputMessage] = useState('');
  const [showSmartMenu, setShowSmartMenu] = useState(false);
  const [showPartyMenu, setShowPartyMenu] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [chatMenuOpen, setChatMenuOpen] = useState(false);

  // Baileys Real-Time Backend Connection States
  const [waStatus, setWaStatus] = useState<'disconnected' | 'waiting_qr' | 'connecting' | 'connected'>('disconnected');
  const [waQrDataUrl, setWaQrDataUrl] = useState<string | null>(null);
  const [waConnectedPhone, setWaConnectedPhone] = useState<string>('');
  const [waConnectedName, setWaConnectedName] = useState<string>('');
  const [backendChats, setBackendChats] = useState<Array<{ jid: string; name: string; phone: string; lastMessage: string; timestamp: string; unreadCount: number }>>([]);
  const [backendMessages, setBackendMessages] = useState<Record<string, any[]>>({});
  const [isSendingLive, setIsSendingLive] = useState(false);
  const [showCustomerDrawer, setShowCustomerDrawer] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ active: boolean; current: number; total: number; clientName: string; cancelled: boolean }>({ active: false, current: 0, total: 0, clientName: '', cancelled: false });
  const bulkCancelRef = useRef(false);
  const [isSyncingModalOpen, setIsSyncingModalOpen] = useState(false);
  const wasWaitingQrRef = useRef(false);

  // WhatsApp Connect QR Code State
  const [isDeviceLinked, setIsDeviceLinked] = useState<boolean>(true);
  const [carouselSlide, setCarouselSlide] = useState<number>(0);
  const [keepSignedIn, setKeepSignedIn] = useState<boolean>(true);
  const [qrRefreshTimer, setQrRefreshTimer] = useState<number>(60);
  const [qrKey, setQrKey] = useState<number>(1);
  const [phoneLinkModal, setPhoneLinkModal] = useState<boolean>(false);
  const [phoneInput, setPhoneInput] = useState<string>('98241 83769');
  const [pairingCode, setPairingCode] = useState<string>('');
  const [tutorialModal, setTutorialModal] = useState<boolean>(false);

  const deskRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileUploadType, setFileUploadType] = useState<'image' | 'document' | 'audio'>('image');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      await handleSendConnectDirectMessage('', {
        mediaUrl: base64Data,
        mediaType: fileUploadType,
        fileName: file.name,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const triggerUpload = (type: 'image' | 'document' | 'audio') => {
    setFileUploadType(type);
    setShowAttachMenu(false);
    if (fileInputRef.current) {
      if (type === 'image') fileInputRef.current.accept = 'image/*';
      else if (type === 'document') fileInputRef.current.accept = '.pdf,.doc,.docx,.txt';
      else if (type === 'audio') fileInputRef.current.accept = 'audio/*';
      fileInputRef.current.click();
    }
  };

  // Composer / Live Desk Target State
  const [targetPhone, setTargetPhone] = useState('9601014899');
  const [targetName, setTargetName] = useState('sandip');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('appointment');
  const [customText, setCustomText] = useState('');
  const [promoOffer, setPromoOffer] = useState('Flat 20% OFF on all Hair Spa & Hydra Facials this week! ✨');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [selectedApptId, setSelectedApptId] = useState('');
  const [receptionDeskModalOpen, setReceptionDeskModalOpen] = useState(false);

  const salon = data?.settings?.salon || 'Shree Beauty Studio';
  const address = data?.settings?.address || 'Surat, Gujarat';
  const salonPhone = data?.settings?.whatsapp || '919824183769';

  const customers = data?.customers || [];
  const appointments = data?.appointments || [];
  const invoices = data?.invoices || [];

  const currentMonth = new Date().getMonth() + 1;

  const carouselSlidesData = useMemo(() => [
    {
      incoming: 'Hi, Can you send me my last invoice?',
      outgoing: 'Sure, sending your digital PDF Invoice here 🧾',
      badge: 'Invoice Sent',
      title: 'Send Invoice in One Click',
      desc: 'Bills, party statements, reminders and all transactions are shared instantly from a smart panel.',
    },
    {
      incoming: 'Hello! Is my appointment confirmed for today?',
      outgoing: 'Yes! Your Hair Spa is confirmed for 04:00 PM today ✨',
      badge: 'Reminder Sent',
      title: 'Automated Appointment Reminders',
      desc: 'Send booking confirmations with Google Calendar links and studio map directions in 1 click.',
    },
    {
      incoming: 'Do you have special offers for my birthday? 🎉',
      outgoing: 'Happy Birthday! Here is your 20% discount treat voucher 🎂',
      badge: 'Wish Delivered',
      title: 'Celebrations & Advance Receipts',
      desc: 'Delight clients on birthdays & anniversaries with custom 20% discount treats and advance tokens.',
    },
  ], []);

  const currentSlide = carouselSlidesData[carouselSlide] || carouselSlidesData[0];

  // ── REAL-TIME BAILEYS WHATSAPP SSE LISTENER & POLLING ────────────────
  const fetchBackendStatus = async () => {
    try {
      const res = await fetch('/api/whatsapp/status');
      if (res.ok) {
        const json = await res.json();
        setWaStatus(json.status || 'disconnected');
        setWaConnectedPhone(json.phone || '');
        setWaConnectedName(json.name || '');
        if (json.qrDataUrl) setWaQrDataUrl(json.qrDataUrl);
      }
    } catch {}
  };

  const fetchBackendChats = async () => {
    try {
      const res = await fetch('/api/whatsapp/chats');
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.chats)) {
          setBackendChats(json.chats);
        }
      }
    } catch {}
  };

  const fetchBackendMessages = async (jid: string) => {
    try {
      const res = await fetch(`/api/whatsapp/messages?jid=${encodeURIComponent(jid)}`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.messages)) {
          setBackendMessages((prev) => ({ ...prev, [jid]: json.messages }));
        }
      }
    } catch {}
  };

  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/whatsapp/events');
      es.addEventListener('status', (e) => {
        try {
          const parsed = JSON.parse(e.data);
          setWaStatus(parsed.status || 'disconnected');
          setWaConnectedPhone(parsed.phone || '');
          setWaConnectedName(parsed.name || '');
          if (parsed.qrDataUrl) setWaQrDataUrl(parsed.qrDataUrl);
        } catch {}
      });

      es.addEventListener('qr', (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed.qrDataUrl) setWaQrDataUrl(parsed.qrDataUrl);
          setWaStatus('waiting_qr');
        } catch {}
      });

      es.addEventListener('message', (e) => {
        try {
          const msg = JSON.parse(e.data);
          setBackendMessages((prev) => {
            const list = prev[msg.jid] || [];
            if (list.some((m) => m.id === msg.id)) return prev;
            return { ...prev, [msg.jid]: [...list, msg] };
          });
          fetchBackendChats();
        } catch {}
      });

      es.addEventListener('chat_update', (e) => {
        try {
          const chat = JSON.parse(e.data);
          setBackendChats((prev) => {
            const idx = prev.findIndex((c) => c.jid === chat.jid);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = { ...next[idx], ...chat };
              return next.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            }
            return [chat, ...prev];
          });
        } catch {}
      });

      es.addEventListener('message_status', (e) => {
        try {
          const { id, jid, status } = JSON.parse(e.data);
          setBackendMessages((prev) => {
            const list = prev[jid];
            if (!list) return prev;
            return {
              ...prev,
              [jid]: list.map((m) => (m.id === id ? { ...m, status } : m)),
            };
          });
        } catch {}
      });
    } catch (err) {
      console.warn('SSE connection warning:', err);
    }

    fetchBackendStatus();
    fetchBackendChats();

    const interval = setInterval(() => {
      fetchBackendStatus();
      fetchBackendChats();
    }, 4000);

    return () => {
      clearInterval(interval);
      if (es) es.close();
    };
  }, []);

  useEffect(() => {
    if (waStatus === 'waiting_qr' || waStatus === 'connecting') {
      wasWaitingQrRef.current = true;
    } else if (waStatus === 'connected') {
      setIsDeviceLinked(true);
      if (wasWaitingQrRef.current) {
        wasWaitingQrRef.current = false;
        setIsSyncingModalOpen(true);
        const timer = setTimeout(() => {
          setIsSyncingModalOpen(false);
          setActiveTab('connect');
          setConnectSubView('chat');
          toast('🎉 WhatsApp Web connected & synced successfully!');
        }, 2800);
        return () => clearTimeout(timer);
      } else {
        setConnectSubView('chat');
      }
    }
  }, [waStatus]);

  useEffect(() => {
    if (targetPhone) {
      const clean = targetPhone.replace(/\D/g, '').slice(-10);
      fetchBackendMessages(`91${clean}@s.whatsapp.net`);
    }
  }, [targetPhone]);

  // QR Refresh Timer countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setQrRefreshTimer((prev) => {
        if (prev <= 1) {
          setQrKey((k) => k + 1);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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
    Object.entries(sessions).forEach(([mobile, sess]: [string, any]) => {
      const expires = new Date(sess?.activeUntil || 0).getTime();
      const diffMs = expires - now;
      const totalMinutes = Math.floor(Math.max(0, diffMs) / (60 * 1000));
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      list.push({
        mobile,
        name: sess?.name,
        activeUntil: sess?.activeUntil || '',
        lastMessage: sess?.lastMessage,
        lastMessageAt: sess?.lastMessageAt,
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
      calendar: `https://shreebeauty.studio/cal?c=${encodeURIComponent(clientName)}&s=${encodeURIComponent((appt as any).service || 'Salon Service')}&d=${encodeURIComponent((appt as any).date || todayISO())}&t=${encodeURIComponent((appt as any).time || '10:00')}`,
      cal_link: `https://shreebeauty.studio/cal?c=${encodeURIComponent(clientName)}&s=${encodeURIComponent((appt as any).service || 'Salon Service')}&d=${encodeURIComponent((appt as any).date || todayISO())}&t=${encodeURIComponent((appt as any).time || '10:00')}`,
      calendar_link: `https://shreebeauty.studio/cal?c=${encodeURIComponent(clientName)}&s=${encodeURIComponent((appt as any).service || 'Salon Service')}&d=${encodeURIComponent((appt as any).date || todayISO())}&t=${encodeURIComponent((appt as any).time || '10:00')}`,
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
    text = text.replace(/\{calendar\}|\{cal_link\}|\{calendar_link\}|\{gcal\}/gi, ctx.calendar || '');
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
      return paymentReminderMessage(clientName, due, salon, '98241 83769@okaxis');
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
    setManualText((prev) => {
      const base = prev !== undefined && prev !== '' ? prev : (generatedMessage || '');
      const separator = base.length === 0 || base.endsWith(' ') || base.endsWith('\n') ? '' : ' ';
      return base + separator + tag + ' ';
    });
    setIsManualEdited(true);
    toast(`🏷️ Added ${tag} tag to message!`, 'info');
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
      setTargetPhone('9601014899');
      setTargetName('sandip');
    }
  }, [targetPhone]);

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

  // Handle Simulate Scan / Connect Device
  const handleConnectDevice = () => {
    setIsDeviceLinked(true);
    updateData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        whatsappDeviceLinked: true,
        whatsappLinkedPhone: salonPhone,
        whatsappLinkedAt: new Date().toISOString(),
      },
    }));
    scheduleSave();
    setActiveTab('connect');
    setConnectSubView('chat');
    toast('🎉 WhatsApp Web Device Linked Successfully! Live Chat Ready.');
  };

  // Handle Disconnect Device
  const handleDisconnectDevice = () => {
    setIsDeviceLinked(false);
    updateData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        whatsappDeviceLinked: false,
      },
    }));
    scheduleSave();
    setActiveTab('connect');
    setConnectSubView('qr');
    toast('ℹ️ WhatsApp Web Device Unlinked. Scan QR to reconnect.');
  };

  // Generate Pairing Code for Phone Link
  const handleGeneratePairingCode = () => {
    if (!phoneInput || phoneInput.length < 10) {
      toast('Please enter a valid 10-digit mobile number.', 'error');
      return;
    }
    const randomCode = `${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
    setPairingCode(randomCode);
    toast(`🔑 Pairing code generated: ${randomCode}`);
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
        .filter((a) => !q || a.customer.toLowerCase().includes(q) || a.mobile.includes(q) || a.service.toLowerCase().includes(q))
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

  // ── IN-PANEL LIVE WHATSAPP SEND HANDLER ────────────────────────────
  const handleSendConnectDirectMessage = async (
    customMsg?: string,
    mediaParams?: { mediaUrl?: string; mediaType?: any; fileName?: string }
  ) => {
    const textToSend = (customMsg !== undefined ? customMsg : connectInputMessage).trim();
    if (!textToSend && !mediaParams?.mediaUrl) {
      toast('કૃપા કરીને મેસેજ લખો (Please type a message).', 'info');
      return;
    }

    const cleanMobile = (targetPhone || '9601014899').replace(/\D/g, '').slice(-10);
    const targetJid = `91${cleanMobile}@s.whatsapp.net`;
    const clientName = targetName || 'Sandip';

    setIsSendingLive(true);

    const tempMsgId = `sent_${Date.now()}`;
    const newLogItem = {
      id: tempMsgId,
      mobile: cleanMobile,
      customerName: clientName,
      text: textToSend,
      timestamp: new Date().toISOString(),
      direction: 'outbound' as const,
      status: 'delivered' as const,
      templateId: 'custom',
    };

    updateData((prev) => {
      const existing = prev.whatsappLogs || [];
      return {
        ...prev,
        whatsappLogs: [newLogItem, ...existing].slice(0, 500),
      };
    });
    scheduleSave();

    setSentLog((prev) => ({
      ...prev,
      [cleanMobile]: true,
      [`cust_${cleanMobile}`]: true,
    }));

    setBackendMessages((prev) => {
      const list = prev[targetJid] || [];
      return {
        ...prev,
        [targetJid]: [
          ...list,
          {
            id: tempMsgId,
            jid: targetJid,
            fromMe: true,
            type: mediaParams?.mediaType || 'text',
            body: textToSend,
            mediaUrl: mediaParams?.mediaUrl,
            fileName: mediaParams?.fileName,
            status: 'delivered',
            timestamp: new Date().toISOString(),
            senderName: 'Me',
          },
        ],
      };
    });

    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jid: targetJid,
          text: textToSend,
          ...mediaParams,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        if (waStatus !== 'connected') {
          toast(`⚠️ WhatsApp Web disconnected – opening fallback…`, 'info');
          openWAWeb(cleanMobile, textToSend, undefined, 'shree_whatsapp_desk');
        } else {
          toast(`⚠️ ${json.error || 'Failed to dispatch message'}`, 'error');
        }
      } else {
        toast(`✅ '${clientName}' ને WhatsApp Web દ્વારા મેસેજ મોકલાઈ ગયો! (✓✓ Sent)`);
      }
    } catch (err: any) {
      if (waStatus !== 'connected') {
        openWAWeb(cleanMobile, textToSend, undefined, 'shree_whatsapp_desk');
      }
    } finally {
      setIsSendingLive(false);
      setConnectInputMessage('');
      setShowSmartMenu(false);
      setShowPartyMenu(false);
      setShowAttachMenu(false);
    }
  };

  // ── BACKEND AUTH ACTIONS ──────────────────────────────────────────
  const handleBackendLogout = async () => {
    try {
      await fetch('/api/whatsapp/logout', { method: 'POST' });
      setWaStatus('disconnected');
      setWaConnectedPhone('');
      setWaConnectedName('');
      setWaQrDataUrl(null);
      toast('🔴 WhatsApp device logged out and session cleared.');
    } catch (e: any) {
      toast(`Error: ${e.message}`, 'error');
    }
  };

  const handleBackendReconnect = async () => {
    try {
      await fetch('/api/whatsapp/reconnect', { method: 'POST' });
      toast('🔄 Reconnecting to WhatsApp servers...');
      fetchBackendStatus();
    } catch (e: any) {
      toast(`Error: ${e.message}`, 'error');
    }
  };

  const handleBackendReset = async () => {
    try {
      await fetch('/api/whatsapp/reset', { method: 'POST' });
      toast('⚡ Session reset. Generating fresh QR code...');
      fetchBackendStatus();
    } catch (e: any) {
      toast(`Error: ${e.message}`, 'error');
    }
  };

  // ── QUICK ADD TO CUSTOMERS ────────────────────────────────────────
  const handleAddAsCustomer = () => {
    const clean = (targetPhone || '').replace(/\D/g, '').slice(-10);
    if (!clean || clean.length < 10) {
      toast('Invalid mobile number', 'error');
      return;
    }
    const newCust = {
      id: `cust_${Date.now()}`,
      name: targetName || 'Client ' + clean.slice(-4),
      mobile: clean,
      createdAt: new Date().toISOString(),
      notes: 'Added from WhatsApp Connect Web Desk',
    };
    updateData((prev) => ({
      ...prev,
      customers: [newCust, ...(prev.customers || [])],
    }));
    scheduleSave();
    toast(`🎉 Added ${newCust.name} (+91 ${clean}) to Salon Customer List!`);
  };

  // ── CURRENT CUSTOMER SUMMARY INFO FOR SIDE DRAWER ─────────────────
  const currentCustomerInfo = useMemo(() => {
    const clean = (targetPhone || '').replace(/\D/g, '').slice(-10);
    const found = customers.find((c) => (c.mobile || '').replace(/\D/g, '').slice(-10) === clean);

    const custInvs = invoices.filter((i) => (i.mobile || '').replace(/\D/g, '').slice(-10) === clean);
    const totalSpend = custInvs.reduce((s, i) => s + Number(i.total || 0), 0);
    const totalBalance = custInvs.reduce((s, i) => s + Number(i.balance || 0), 0);
    const custAppts = appointments
      .filter((a) => (a.mobile || '').replace(/\D/g, '').slice(-10) === clean)
      .sort((a, b) => b.date.localeCompare(a.date));

    const upcomingAppts = custAppts.filter((a) => a.date >= todayISO());

    return {
      isCustomer: Boolean(found),
      customer: found || { name: targetName || 'Client', mobile: clean },
      totalSpend,
      totalBalance,
      visitCount: custInvs.length,
      lastVisit: custInvs[0]?.date || found?.createdAt || '',
      upcomingAppts,
      allAppts: custAppts,
    };
  }, [customers, invoices, appointments, targetPhone, targetName, todayISO]);

  // ── BULK SEGMENT SEND WITH ANTI-BAN RANDOM DELAY (5-15s) ──────────
  const handleBulkSegmentSend = async (clients: any[], templateGenerator: (c: any) => string) => {
    if (clients.length === 0) {
      toast('No clients in this segment.', 'info');
      return;
    }
    if (waStatus !== 'connected') {
      toast('WhatsApp not connected – please scan QR code first!', 'error');
      setActiveTab('connect');
      setConnectSubView('qr');
      return;
    }

    bulkCancelRef.current = false;
    setBulkProgress({ active: true, current: 0, total: clients.length, clientName: '', cancelled: false });

    for (let i = 0; i < clients.length; i++) {
      if (bulkCancelRef.current) {
        toast('🛑 Bulk broadcast cancelled.', 'info');
        break;
      }
      const c = clients[i];
      setBulkProgress({ active: true, current: i + 1, total: clients.length, clientName: c.name, cancelled: false });

      const msgText = templateGenerator(c);
      const cleanMob = (c.mobile || '').replace(/\D/g, '').slice(-10);
      const jid = `91${cleanMob}@s.whatsapp.net`;

      try {
        await fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jid, text: msgText }),
        });
      } catch {}

      if (i < clients.length - 1 && !bulkCancelRef.current) {
        // Random anti-ban delay between 5 and 15 seconds
        const delaySeconds = Math.floor(Math.random() * 11) + 5;
        await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000));
      }
    }

    setBulkProgress({ active: false, current: 0, total: 0, clientName: '', cancelled: false });
    toast(`🚀 Broadcast complete! Messages dispatched.`);
  };

  // ── CONTACTS LIST (MERGING LIVE BAILEYS CHATS + SANDIP + CLIENTS) ──
  const connectDeskContacts = useMemo(() => {
    const q = (connectSearch || '').toLowerCase().trim();
    const contactMap = new Map<string, { id: string; name: string; mobile: string; lastMessage: string; lastTime: string; unreadCount: number }>();

    // 1. From live Baileys chats
    backendChats.forEach((bc) => {
      const clean = bc.phone || bc.jid.replace(/@.*$/, '').replace(/^91/, '').slice(-10);
      const timeStr = bc.timestamp ? format(new Date(bc.timestamp), 'h:mm a') : '3:46 PM';
      contactMap.set(clean, {
        id: `bc_${clean}`,
        name: bc.name || clean,
        mobile: clean,
        lastMessage: bc.lastMessage || 'Ready to chat',
        lastTime: timeStr,
        unreadCount: bc.unreadCount || 0,
      });
    });

    // 2. Ensure Sandip is in list
    if (!contactMap.has('9601014899')) {
      contactMap.set('9601014899', {
        id: 'sandip_default',
        name: 'sandip',
        mobile: '9601014899',
        lastMessage: 'hi',
        lastTime: '3:46 PM',
        unreadCount: 0,
      });
    }

    // 3. From salon customers
    (customers || []).forEach((c) => {
      const clean = (c.mobile || '').replace(/\D/g, '').slice(-10);
      if (!clean) return;
      if (!contactMap.has(clean)) {
        contactMap.set(clean, {
          id: c.id,
          name: c.name || 'Customer',
          mobile: clean,
          lastMessage: 'Ready to chat',
          lastTime: '',
          unreadCount: 0,
        });
      } else {
        const item = contactMap.get(clean)!;
        if (c.name && item.name === clean) {
          item.name = c.name;
        }
      }
    });

    let list = Array.from(contactMap.values());
    if (q) {
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.mobile.includes(q));
    }
    return list;
  }, [backendChats, customers, connectSearch]);

  // ── ACTIVE CHAT MESSAGES ──────────────────────────────────────────
  const activeChatMessages = useMemo(() => {
    const clean = (targetPhone || '9601014899').replace(/\D/g, '').slice(-10);
    const targetJid = `91${clean}@s.whatsapp.net`;

    const liveList = backendMessages[targetJid] || [];
    if (liveList.length > 0) {
      return liveList;
    }

    const logs = (data?.whatsappLogs || [])
      .filter((l) => (l.mobile || '').replace(/\D/g, '').slice(-10) === clean)
      .slice(-40);

    const isSandip = clean === '9601014899' || (targetName && targetName.toLowerCase() === 'sandip');
    const seedMessages = isSandip
      ? [
          {
            id: 'seed_1',
            mobile: '9601014899',
            customerName: 'sandip',
            text: "This message can't be displayed here",
            timestamp: '2026-09-22T18:44:00',
            direction: 'outbound' as const,
            status: 'sent' as const,
          },
          {
            id: 'seed_2',
            mobile: '9601014899',
            customerName: 'sandip',
            text: 'hi',
            timestamp: '2026-10-13T15:46:00',
            direction: 'outbound' as const,
            status: 'delivered' as const,
          },
        ]
      : [];

    return [...seedMessages, ...logs];
  }, [backendMessages, data?.whatsappLogs, targetPhone, targetName]);

  return (
    <div style={{ maxWidth: 1300, margin: '0 auto', paddingBottom: 20 }}>
      {/* ── TOP HEADER: COMPACT "WhatsApp Connect" BRANDING ─── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 14px',
          background: '#ffffff',
          borderRadius: 10,
          border: '1px solid #e2e8f0',
          marginBottom: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: '#25D366',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(37,211,102,0.25)',
              flexShrink: 0,
            }}
          >
            <MessageCircle size={16} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <h1 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.2px' }}>
                WhatsApp Connect
              </h1>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>
                Official Studio WhatsApp Web Linker &amp; Smart Desk
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {waStatus === 'connected' || isDeviceLinked ? (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                background: '#dcfce7',
                color: '#15803d',
                padding: '3px 9px',
                borderRadius: 99,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                border: '1px solid #86efac',
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a' }} />
              Connected (+91 {waConnectedPhone || salonPhone.replace(/\D/g, '').slice(-10)})
            </span>
          ) : (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                background: '#fef3c7',
                color: '#b45309',
                padding: '3px 9px',
                borderRadius: 99,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                border: '1px solid #fde68a',
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#d97706' }} />
              Scan QR to Connect
            </span>
          )}

          {/* Settings Gear Icon */}
          <button
            type="button"
            onClick={() => setSettingsModalOpen(true)}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#475569',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="WhatsApp Connect Settings & Tools"
          >
            <Settings size={15} />
          </button>

          {/* YouTube Video Help Icon Button */}
          <button
            type="button"
            onClick={() => setTutorialModal(true)}
            style={{
              background: '#fff1f2',
              border: '1px solid #fecdd3',
              borderRadius: 6,
              padding: '4px 8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              color: '#e11d48',
              fontWeight: 700,
              fontSize: 11,
              height: 28,
            }}
            title="Watch WhatsApp Connect Tutorial Video"
          >
            <div style={{ width: 14, height: 11, background: '#e11d48', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 0, height: 0, borderTop: '2.5px solid transparent', borderBottom: '2.5px solid transparent', borderLeft: '5px solid #ffffff' }} />
            </div>
            <span>Tutorial</span>
          </button>
        </div>
      </div>

      {/* Connection Lost Alert Banner with Reconnect Action */}
      {waStatus === 'disconnected' && (
        <div
          style={{
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: 10,
            padding: '10px 16px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#991b1b',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={18} color="#dc2626" />
            <span>Connection to WhatsApp lost. Scan QR or click Reconnect to resume live chat.</span>
          </div>
          <button
            type="button"
            onClick={handleBackendReconnect}
            style={{
              background: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              padding: '5px 12px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <RotateCcw size={13} /> Reconnect
          </button>
        </div>
      )}

      {/* Syncing Modal */}
      <WhatsAppSyncingModal isOpen={isSyncingModalOpen} />

      {/* Primary Navigation Tabs & Toolbar COMBINED IN ONE SINGLE ROW */}
      <div
        className="tabs"
        style={{
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          padding: '3px 6px',
          background: '#f1f5f9',
          borderRadius: 8,
          border: '1px solid #e2e8f0',
          boxSizing: 'border-box',
          width: '100%',
        }}
      >
        {/* Left: Navigation Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'nowrap', overflowX: 'auto' }}>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'connect' ? 'active' : ''}`}
            onClick={() => setActiveTab('connect')}
            style={{
              padding: '5px 11px',
              fontSize: 12,
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              ...(activeTab === 'connect'
                ? {
                    background: 'linear-gradient(135deg, #05424A, #0a6572)',
                    color: '#fff',
                    borderColor: '#05424A',
                    fontWeight: 700,
                  }
                : {}),
            }}
          >
            <MessageCircle size={13} />
            <span>WhatsApp Connect</span>
            <span
              style={{
                fontSize: 9.5,
                fontWeight: 800,
                borderRadius: 99,
                padding: '1px 5px',
                marginLeft: 3,
                background: waStatus === 'connected' ? '#22c55e' : '#f59e0b',
                color: '#ffffff',
              }}
            >
              {waStatus === 'connected' ? 'Live' : 'Scan QR'}
            </span>
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === 'composer' ? 'active' : ''}`}
            onClick={() => setActiveTab('composer')}
            style={{
              padding: '5px 11px',
              fontSize: 12,
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <MessageCircle size={13} />
            <span>Composer &amp; Templates</span>
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === 'broadcast' ? 'active' : ''}`}
            onClick={() => setActiveTab('broadcast')}
            style={{
              padding: '5px 11px',
              fontSize: 12,
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Users size={13} />
            <span>Client Segments</span>
            <span className="tab-badge" style={{ fontSize: 9.5, padding: '1px 5px', marginLeft: 3 }}>
              {enrichedCustomers.length}
            </span>
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === 'incoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('incoming')}
            style={{
              padding: '5px 11px',
              fontSize: 12,
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Bot size={13} />
            <span>24h Free Sessions &amp; Standee</span>
          </button>
        </div>

        {/* Right: Sub-View Toggle (Live Chat / QR Scanner) + Live Online Status IN SAME ROW */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {activeTab === 'connect' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                background: '#ffffff',
                padding: '2px 4px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
              }}
            >
              <button
                type="button"
                onClick={() => setConnectSubView('chat')}
                style={{
                  padding: '3px 8px',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'all 0.15s ease',
                  background: connectSubView === 'chat' ? '#05424A' : 'transparent',
                  color: connectSubView === 'chat' ? '#ffffff' : '#475569',
                }}
              >
                <MessageCircle size={12} />
                <span>Live Chat</span>
                {waStatus === 'connected' && (
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: '#22c55e',
                      display: 'inline-block',
                    }}
                  />
                )}
              </button>

              <button
                type="button"
                onClick={() => setConnectSubView('qr')}
                style={{
                  padding: '3px 8px',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'all 0.15s ease',
                  background: connectSubView === 'qr' ? '#05424A' : 'transparent',
                  color: connectSubView === 'qr' ? '#ffffff' : '#475569',
                }}
              >
                <QrCode size={12} />
                <span>QR Scanner</span>
                {waStatus !== 'connected' && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      background: '#ef4444',
                      color: '#ffffff',
                      borderRadius: 8,
                      padding: '1px 5px',
                    }}
                  >
                    Scan
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Connection Status Pill */}
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '3px 9px',
              borderRadius: 99,
              background: waStatus === 'connected' ? '#dcfce7' : '#fffbeb',
              color: waStatus === 'connected' ? '#15803d' : '#b45309',
              border: `1px solid ${waStatus === 'connected' ? '#86efac' : '#fde68a'}`,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              whiteSpace: 'nowrap',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: waStatus === 'connected' ? '#16a34a' : '#f59e0b',
              }}
            />
            {waStatus === 'connected'
              ? `WhatsApp Online (+91 ${waConnectedPhone || salonPhone.replace(/\D/g, '').slice(-10)})`
              : 'QR Scan Required'}
          </span>
        </div>
      </div>

      {/* ── TAB: WHATSAPP CONNECT CONTENT ── */}
      {activeTab === 'connect' && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {connectSubView === 'chat' ? (
            <WhatsAppLiveChatTab
              customers={customers}
              invoices={invoices}
              appointments={appointments}
              salonName={salon}
              onSendInvoice={(phone, name) => {
                const clean = phone.replace(/\D/g, '').slice(-10);
                const inv = invoices.find((i) => (i.mobile || '').includes(clean)) || invoices[0];
                if (inv) {
                  handleSendInPageMessage(clean, name, invoiceMessage(inv, salon));
                }
              }}
              onSendBridalCard={(name) => {
                handleSendInPageMessage(targetPhone, name, bridalMessage(name, salon));
              }}
              onSendPartyStatement={(phone, name) => {
                const clean = phone.replace(/\D/g, '').slice(-10);
                const custInvs = invoices.filter((i) => (i.mobile || '').includes(clean));
                const totalSpend = custInvs.reduce((s, i) => s + Number(i.total || 0), 0);
                const totalBalance = custInvs.reduce((s, i) => s + Number(i.balance || 0), 0);
                const msg = `📊 *PARTY STATEMENT / KHATA — ${salon.toUpperCase()}* 📊\n\nClient: ${name || 'Client'}\nMobile: +91 ${clean}\nTotal Bills: ${custInvs.length}\nTotal Spend: ${money(totalSpend)}\nBalance Due: ${money(totalBalance)}\n\nStatus: ${totalBalance > 0 ? '⚠️ Payment Pending' : '✅ All Clear / No Dues'}\nThank you for choosing ${salon}! 🌸`;
                handleSendInPageMessage(clean, name, msg);
              }}
              onShowCustomerProfile={(phone, name) => {
                setTargetPhone(phone);
                setTargetName(name);
                setShowCustomerDrawer(true);
              }}
            />
          ) : (
            <WhatsAppQRScannerTab
              waStatus={waStatus}
              waQrDataUrl={waQrDataUrl}
              onRefreshQR={handleBackendReconnect}
            />
          )}
        </div>
      )}

      {/* TAB 3: Message Composer & Live WhatsApp Preview */}
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

              {/* Dynamic Shortcut Tags Chip Bar */}
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8, padding: '6px 8px', background: '#f1f5f9', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--teal)' }}>⚡ Insert Shortcut Tag:</span>
                {[
                  { tag: '{name}', label: '👤 {name}', title: 'Customer Name' },
                  { tag: '{salon}', label: '👑 {salon}', title: 'Studio Name' },
                  { tag: '{date}', label: '📅 {date}', title: 'Appointment/Bill Date' },
                  { tag: '{time}', label: '⏰ {time}', title: 'Appointment Time' },
                  { tag: '{service}', label: '💇 {service}', title: 'Service Name' },
                  { tag: '{amount}', label: '💰 {amount}', title: 'Total Bill Amount' },
                  { tag: '{paid}', label: '💵 {paid}', title: 'Paid Amount' },
                  { tag: '{balance}', label: '⚠️ {balance}', title: 'Due Balance' },
                  { tag: '{points}', label: '⭐ {points}', title: 'Loyalty Points' },
                  { tag: '{wallet}', label: '💳 {wallet}', title: 'Wallet Balance' },
                  { tag: '{address}', label: '📍 {address}', title: 'Studio Address' },
                  { tag: '{calendar}', label: '📅 {calendar}', title: 'Google Calendar Event Short Link' },
                  { tag: '{link}', label: '🔗 {link}', title: 'Google Review Link' },
                  { tag: '{offer}', label: '🎉 {offer}', title: 'Festival Promo Offer' },
                ].map((v) => (
                  <button
                    key={v.tag}
                    type="button"
                    onClick={() => insertVariableTag(v.tag)}
                    title={`Click to insert ${v.tag} (${v.title})`}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: 6,
                      padding: '3px 8px',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      color: '#0f172a',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {v.label}
                  </button>
                ))}
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

      {/* TAB 4: Broadcast / Segmented Client Assistant */}
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

          {/* Segment Bulk Send Action & Progress Bar */}
          <div
            style={{
              background: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              borderRadius: 12,
              padding: '12px 16px',
              marginBottom: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Zap size={14} color="#16a34a" /> Bulk Broadcast with Anti-Ban Protection
                </div>
                <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                  Sends customized templates to all clients in this segment with a random 5–15 sec delay between messages.
                </div>
              </div>

              {!bulkProgress.active ? (
                <button
                  type="button"
                  onClick={() => {
                    handleBulkSegmentSend(filteredBroadcastClients, (c) => {
                      if (broadcastFilter === 'dues') return paymentReminderMessage(c.name, c.balanceDue, salon);
                      if (broadcastFilter === 'birthdays') return birthdayMessage(c.name, salon);
                      if (broadcastFilter === 'anniversaries') return anniversaryMessage(c.name, salon);
                      return festivalPromoMessage(c.name, promoOffer, salon);
                    });
                  }}
                  disabled={filteredBroadcastClients.length === 0}
                  style={{
                    background: 'linear-gradient(135deg, #05424A, #0f766e)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 14px',
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: filteredBroadcastClients.length === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    opacity: filteredBroadcastClients.length === 0 ? 0.6 : 1,
                  }}
                >
                  <Send size={13} /> 🚀 Start Bulk Send to {filteredBroadcastClients.length} Clients
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    bulkCancelRef.current = true;
                    toast('🛑 Stopping broadcast...', 'info');
                  }}
                  style={{
                    background: '#fee2e2',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                    borderRadius: 8,
                    padding: '8px 14px',
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <X size={14} /> 🛑 Cancel Broadcast
                </button>
              )}
            </div>

            {bulkProgress.active && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#334155', marginBottom: 4, fontWeight: 700 }}>
                  <span>Sending message {bulkProgress.current} of {bulkProgress.total}: <strong>{bulkProgress.clientName}</strong></span>
                  <span>{Math.round((bulkProgress.current / bulkProgress.total) * 100)}%</span>
                </div>
                <div style={{ width: '100%', height: 7, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${(bulkProgress.current / bulkProgress.total) * 100}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #16a34a, #22c55e)',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
                <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 4 }}>
                  ⏳ Applying safe random delay (5–15s) between clients to safeguard WhatsApp account reputation.
                </div>
              </div>
            )}
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
                              setActiveTab('connect');
                              setConnectSubView('chat');
                              toast(`Loaded ${c.name} into WhatsApp Live Chat!`);
                            }}
                          >
                            Open Chat
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

      {/* TAB 5: WhatsApp 24h Free Sessions & Desk QR */}
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

      {/* ── MODAL 1: LINK WITH PHONE NUMBER MODAL ── */}
      {phoneLinkModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => setPhoneLinkModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              padding: 24,
              maxWidth: 420,
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                📱 Link with Phone Number
              </h3>
              <button
                type="button"
                onClick={() => setPhoneLinkModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={18} color="#94a3b8" />
              </button>
            </div>

            <p style={{ fontSize: 12.5, color: '#64748b', margin: '0 0 14px' }}>
              Enter your studio mobile number to generate an 8-character pairing code:
            </p>

            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="label">Studio Phone Number</label>
              <input
                type="tel"
                className="input"
                placeholder="e.g. 98241 83769"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
              />
            </div>

            {pairingCode && (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1.5px solid #86efac',
                  borderRadius: 10,
                  padding: '12px 14px',
                  textAlign: 'center',
                  marginBottom: 14,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', marginBottom: 4 }}>
                  YOUR 8-CHARACTER PAIRING CODE:
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: 4, color: '#15803d', fontFamily: 'monospace' }}>
                  {pairingCode}
                </div>
                <div style={{ fontSize: 11, color: '#16a34a', marginTop: 4 }}>
                  Enter this code on your phone: <strong>WhatsApp &gt; Linked Devices &gt; Link with phone number</strong>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={handleGeneratePairingCode}
                style={{
                  flex: 1,
                  background: '#05424A',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 12.5,
                  cursor: 'pointer',
                }}
              >
                🔑 Generate Code
              </button>
              <button
                type="button"
                onClick={() => {
                  handleConnectDevice();
                  setPhoneLinkModal(false);
                }}
                style={{
                  flex: 1,
                  background: '#25D366',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontWeight: 800,
                  fontSize: 12.5,
                  cursor: 'pointer',
                }}
              >
                ✓ Confirm Connected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: TUTORIAL MODAL ── */}
      {tutorialModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => setTutorialModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              padding: 24,
              maxWidth: 480,
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Video size={18} color="#e11d48" /> How to Connect WhatsApp Web (QR Scanner Guide)
              </h3>
              <button
                type="button"
                onClick={() => setTutorialModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={18} color="#94a3b8" />
              </button>
            </div>

            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 8 }}>
                3 સરળ સ્ટેપમાં WhatsApp Connect કરો:
              </div>
              <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: '#475569', lineHeight: 1.6 }}>
                <li>તમારા મોબાઈલમાં WhatsApp ઓપન કરીને ઉપર જમણી બાજુ <strong>ત્રણ ટપકાં (⋮)</strong> અથવા સેટિંગ્સ પર ક્લિક કરો.</li>
                <li><strong>&quot;Linked devices&quot; (લિંક કરેલ ડિવાઇસ)</strong> પર ટેપ કરીને <strong>&quot;Link a Device&quot;</strong> દબાવો.</li>
                <li>આ સ્ક્રીન પર આપેલો <strong>QR Code સ્કેન કરો</strong>. તરત જ તમારું WhatsApp Smart Desk સાથે કનેક્ટ થઈ જશે!</li>
              </ol>
            </div>

            <button
              type="button"
              onClick={() => setTutorialModal(false)}
              style={{
                width: '100%',
                background: '#25D366',
                color: '#ffffff',
                border: 'none',
                padding: '10px 14px',
                borderRadius: 8,
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              સમજાઈ ગયું (Got it!)
            </button>
          </div>
        </div>
      )}

      {/* WhatsApp Connect Tools & Settings Modal */}
      {settingsModalOpen && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 16,
          }}
          onClick={() => setSettingsModalOpen(false)}
        >
          <div
            className="modal-content card"
            style={{
              background: '#ffffff',
              borderRadius: 14,
              padding: 24,
              maxWidth: 480,
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                ⚙️ WhatsApp Connect Tools &amp; Settings
              </h3>
              <button
                type="button"
                onClick={() => setSettingsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 12px' }}>
              Switch workspace view or manage studio automation tools:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {[
                { id: 'connect', label: '💬 WhatsApp Connect (Live Chat & QR Scanner)', desc: 'Standard WhatsApp Web messaging workspace with QR pairing' },
                { id: 'broadcast', label: '👥 Broadcast to Customer Segments', desc: '1-click mass dispatch to VIPs, Birthdays, Dues' },
                { id: 'composer', label: '📱 Template Manager & Composer', desc: 'Edit automated text templates' },
                { id: 'incoming', label: '🟢 24-Hour Free Sessions & QR Standee', desc: 'Meta Cloud API 24h window monitor & counter QR' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id as WATab);
                    setSettingsModalOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: activeTab === tab.id ? '1.5px solid #05424A' : '1px solid #e2e8f0',
                    background: activeTab === tab.id ? '#f0fdf4' : '#ffffff',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: 13, color: activeTab === tab.id ? '#166534' : '#0f172a' }}>
                    {tab.label}
                  </span>
                  <span style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    {tab.desc}
                  </span>
                </button>
              ))}
            </div>

            {waStatus === 'connected' && (
              <div style={{ marginBottom: 12 }}>
                <button
                  type="button"
                  onClick={() => {
                    handleBackendLogout();
                    setSettingsModalOpen(false);
                  }}
                  style={{
                    width: '100%',
                    background: '#fee2e2',
                    border: '1.5px solid #fecaca',
                    color: '#dc2626',
                    padding: '9px 14px',
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                  title="Disconnect device and log out session"
                >
                  <RotateCcw size={14} /> Disconnect / Logout
                </button>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
              <button
                type="button"
                onClick={() => {
                  window.open('https://web.whatsapp.com', '_blank');
                  setSettingsModalOpen(false);
                }}
                style={{
                  background: '#25D366',
                  color: '#053320',
                  fontWeight: 800,
                  fontSize: 12,
                  padding: '7px 12px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <ExternalLink size={13} /> Open web.whatsapp.com
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setSettingsModalOpen(false)}
                style={{ fontSize: 12 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
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
