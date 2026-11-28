'use client';

import { useState, useMemo, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, MessageCircle, Search, Calendar, Play, CheckCircle2, ReceiptText, Eye, FileText, Download, Printer, CalendarOff, AlertTriangle, ExternalLink, Copy, RefreshCw, Mail, Zap, Volume2, VolumeX, Bell, ChevronUp, RotateCcw, Sparkles, Smartphone } from 'lucide-react';
import { useSalonStore } from '@/lib/store';
import { scheduleSave } from '@/lib/sync';
import { uid, todayISO, fmtDate, money, formatCustomerContactName, autoCapitalizeName, isPastTimeForDate, getCurrentRoundedTimeHHMM, FIFTEEN_MIN_TIME_SLOTS, getServicePricingBasis } from '@/lib/utils';
import { Appointment, AppointmentStatus, WorkStatus, Invoice, StudioHoliday, HolidayType, SharedCustomerBridge } from '@/types/salon';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { openWAApp, appointmentStaffMessage, appointmentCustomerMessage, sendDirectWhatsAppMessage, isCustomerIn24HourWindow } from '@/lib/whatsapp';
import { staggerContainer, fadeSlideUp } from '@/variants';
import { useForm } from 'react-hook-form';
import InvoiceReceiptModal from '@/components/billing/InvoiceReceiptModal';
import ContactImportModal from '@/components/billing/ContactImportModal';
import { getAppointmentGoogleCalendarUrl, downloadBulkAppointmentsICS } from '@/lib/calendar';
import { SAMPLE_GOOGLE_APPS_SCRIPT_CODE } from '@/lib/google-calendar-server';
import { checkDateHolidayOrBlocked } from '@/lib/holidays';
import { playNewBookingChime, isAudioNotificationMuted, setAudioNotificationMuted } from '@/lib/notification-sound';
import { getPaymentOptions, getDefaultPaymentOption, getPaymentOptionIcon } from '@/lib/payments';

type ApptTab = 'all' | 'pending' | 'today' | 'upcoming' | 'inservice' | 'completed' | 'not-attempted' | 'cancelled';
const STATUS_OPTIONS: AppointmentStatus[] = ['Confirmed', 'Pending', 'Cancelled', 'Completed', 'Not Attempted'];

/**
 * Calculates the effective work status of an appointment.
 * Rule: If an appointment is booked but not started, it remains OPEN for up to 2 days after the booking date.
 * After 2 days past the booking date (day 3+), it automatically transitions to 'Not Attempted'.
 */
function getEffectiveWorkStatus(a: Appointment, todayDate: string = todayISO()): WorkStatus {
  if (a.status === 'Cancelled' || a.workStatus === 'Cancelled') return 'Cancelled';
  if (a.workStatus === 'Completed' || a.workStatus === 'Billed' || a.status === 'Completed' || a.invoiceId) {
    return a.workStatus === 'Billed' || a.invoiceId ? 'Billed' : 'Completed';
  }
  if (a.workStatus === 'In Service') return 'In Service';
  if (a.status === 'Not Attempted' || a.workStatus === 'Not Attempted') return 'Not Attempted';

  if (a.date && a.date < todayDate) {
    const [tY, tM, tD] = todayDate.split('-').map(Number);
    const [aY, aM, aD] = a.date.split('-').map(Number);
    const tUtc = Date.UTC(tY, tM - 1, tD);
    const aUtc = Date.UTC(aY, aM - 1, aD);
    const diffDays = Math.floor((tUtc - aUtc) / (1000 * 60 * 60 * 24));
    if (diffDays > 2) {
      return 'Not Attempted';
    }
  }
  return a.workStatus || 'Booked';
}

export function AppointmentsPanel({
  sharedCustomer,
  viewMode = 'all',
  onRequestNewAppointment,
}: {
  sharedCustomer?: SharedCustomerBridge;
  viewMode?: 'all' | 'form' | 'queue';
  onRequestNewAppointment?: () => void;
} = {}) {
  const showForm = viewMode !== 'queue';
  const showQueue = viewMode !== 'form';
  const router = useRouter();
  const { data, updateData } = useSalonStore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<ApptTab>('all');
  const [search, setSearch] = useState('');
  const [inlineFormOpen, setInlineFormOpen] = useState(true);
  const inlineFormRef = useRef<HTMLDivElement | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [prevAppt, setPrevAppt] = useState<Appointment | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [receiptModalInv, setReceiptModalInv] = useState<Invoice | null>(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [isSplitAdvance, setIsSplitAdvance] = useState(false);
  const [splitAdvanceAmounts, setSplitAdvanceAmounts] = useState<Record<string, number | ''>>({});
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
  const [calendarSyncModalOpen, setCalendarSyncModalOpen] = useState(false);
  const [bulkSyncing, setBulkSyncing] = useState(false);
  const prevPendingCountRef = useRef<number | null>(null);
  const [soundMuted, setSoundMuted] = useState(false);

  useEffect(() => {
    setSoundMuted(isAudioNotificationMuted());
  }, []);

  const [holidayForm, setHolidayForm] = useState<{
    date: string;
    endDate: string;
    type: HolidayType;
    reason: string;
    notes: string;
  }>({
    date: todayISO(),
    endDate: '',
    type: 'Holiday',
    reason: '',
    notes: '',
  });

  const handleBulkCloudSync = async () => {
    setBulkSyncing(true);
    try {
      const activeAppts = (data?.appointments || []).filter((a) => a.status !== 'Cancelled');
      const activeBridals = (data?.bridal || []).filter((b) => b.status !== 'Cancelled');

      const res = await fetch('/api/calendar/auto-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'bulk',
          appointments: activeAppts,
          bridals: activeBridals,
          settings: data?.settings,
        }),
      });
      const resData = await res.json();
      if (resData.success) {
        toast(`✅ ${resData.message || 'Synced to Google Calendar successfully!'}`);
      } else {
        toast(resData.error || 'Failed to sync to Google Calendar', 'error');
      }
    } catch (err: any) {
      toast('Network error during Google Calendar sync', 'error');
    } finally {
      setBulkSyncing(false);
    }
  };

  const today = todayISO();
  const holidays = data?.holidays || [];

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayForm.date) {
      toast('Please select a date', 'error');
      return;
    }
    if (!holidayForm.reason.trim()) {
      toast('Please enter a reason / title (e.g. Diwali Holiday, Full Day Housefull)', 'error');
      return;
    }

    const item: StudioHoliday = {
      id: uid(),
      date: holidayForm.date,
      endDate: holidayForm.endDate || undefined,
      type: holidayForm.type,
      reason: holidayForm.reason.trim(),
      notes: holidayForm.notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    updateData((d) => ({
      ...d,
      holidays: [item, ...(d.holidays || []).filter((h) => h.date !== item.date)],
    }));
    scheduleSave();
    toast(`✅ Marked ${fmtDate(item.date)} as ${item.type}!`);

    // Auto-sync holiday event to Google Calendar in background
    fetch('/api/calendar/auto-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'holiday', holiday: item }),
    }).catch(() => {});

    setHolidayForm({
      date: todayISO(),
      endDate: '',
      type: 'Holiday',
      reason: '',
      notes: '',
    });
  };

  const handleDeleteHoliday = (id: string) => {
    const target = (data?.holidays || []).find((h) => h.id === id);
    updateData((d) => ({
      ...d,
      holidays: (d.holidays || []).filter((h) => h.id !== id),
    }));
    scheduleSave();
    toast('Holiday / Blocked date removed', 'info');

    // Auto-sync removal from Google Calendar in background
    if (target) {
      fetch('/api/calendar/auto-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'delete_holiday', holiday: target }),
      }).catch(() => {});
    }
  };

  const defaultPayMode = getDefaultPaymentOption(data?.settings?.payments);
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<Appointment>({
    defaultValues: {
      id: '', date: today, time: '10:00', customer: '', mobile: '', email: '',
      service: '', price: '' as any, staff: '', advance: 0, advanceMode: defaultPayMode, status: 'Confirmed', workStatus: 'Booked', notes: '',
    },
  });

  const watchCustomer = watch('customer') || '';
  const watchMobile = watch('mobile') || '';
  const watchAdvanceMode = watch('advanceMode') || defaultPayMode;
  const watchAdvance = watch('advance') || 0;
  const watchPrice = watch('price');
  const watchService = watch('service') || '';
  const watchDate = watch('date') || today;
  const watchTime = watch('time') || '10:00';
  const watchStatus = watch('status') || 'Confirmed';
  const apptPriceNum = Number(watchPrice) || 0;
  const apptAdvanceNum = Number(watchAdvance) || 0;
  const apptBalance = Math.max(0, apptPriceNum - apptAdvanceNum);
  const cust24hStatus = useMemo(() => isCustomerIn24HourWindow(watchMobile, data), [watchMobile, data]);
  const paymentModes = useMemo(() => getPaymentOptions(data?.settings?.payments), [data?.settings?.payments]);

  const appointments = data?.appointments || [];

  const counts = useMemo(() => {
    let pendingCount = 0;
    let todayCount = 0;
    let upcomingCount = 0;
    let inServiceCount = 0;
    let completedCount = 0;
    let notAttemptedCount = 0;
    let cancelledCount = 0;

    appointments.forEach((a) => {
      if (a.status === 'Pending') {
        pendingCount++;
        return;
      }
      const ws = getEffectiveWorkStatus(a, today);
      if (ws === 'Cancelled' || a.status === 'Cancelled') {
        cancelledCount++;
      } else if (ws === 'Not Attempted' || a.status === 'Not Attempted') {
        notAttemptedCount++;
      } else if (ws === 'Completed' || ws === 'Billed' || a.status === 'Completed') {
        completedCount++;
      } else if (ws === 'In Service') {
        inServiceCount++;
      } else {
        // ws === 'Booked' (Confirmed)
        if (a.date === today) todayCount++;
        upcomingCount++;
      }
    });

    return {
      all: appointments.length,
      pending: pendingCount,
      today: todayCount,
      upcoming: upcomingCount,
      inService: inServiceCount,
      completed: completedCount,
      notAttempted: notAttemptedCount,
      cancelled: cancelledCount,
    };
  }, [appointments, today]);

  // Play notification chime whenever a new online appointment is received
  useEffect(() => {
    if (counts.pending > 0) {
      if (prevPendingCountRef.current !== null && counts.pending > prevPendingCountRef.current) {
        playNewBookingChime();
        toast(`🔔 ${counts.pending} New Pending Online Booking Request!`);
      }
    }
    prevPendingCountRef.current = counts.pending;
  }, [counts.pending, toast]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return appointments
      .filter((a) => {
        const matchesSearch =
          !q ||
          a.customer.toLowerCase().includes(q) ||
          a.mobile.includes(q) ||
          a.service.toLowerCase().includes(q) ||
          (a.staff && a.staff.toLowerCase().includes(q));

        if (!matchesSearch) return false;

        const ws = getEffectiveWorkStatus(a, today);

        if (activeTab === 'pending') return a.status === 'Pending';
        if (activeTab === 'today') return a.status !== 'Pending' && a.date === today && ws !== 'Cancelled' && ws !== 'Not Attempted';
        if (activeTab === 'upcoming') return a.status !== 'Pending' && ws === 'Booked';
        if (activeTab === 'inservice') return a.status !== 'Pending' && ws === 'In Service';
        if (activeTab === 'completed') return ws === 'Completed' || ws === 'Billed';
        if (activeTab === 'not-attempted') return ws === 'Not Attempted';
        if (activeTab === 'cancelled') return ws === 'Cancelled' || a.status === 'Cancelled';
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || a.time.localeCompare(b.time));
  }, [appointments, search, activeTab, today]);

  const handleConfirmAppointment = (appt: Appointment) => {
    const updatedAppt: Appointment = {
      ...appt,
      status: 'Confirmed',
      workStatus: appt.workStatus === 'Cancelled' ? 'Booked' : (appt.workStatus || 'Booked'),
    };

    updateData((d) => ({
      ...d,
      appointments: d.appointments.map((a) => (a.id === appt.id ? updatedAppt : a)),
    }));
    scheduleSave();
    toast(`🎉 Appointment Confirmed for ${appt.customer}!`);

    // Auto-save & activate Google Calendar reminder in real time for admin side
    fetch('/api/calendar/auto-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'appointment',
        appointment: updatedAppt,
        settings: data?.settings,
      }),
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.provider !== 'feed_and_invite') {
          toast('📅 Active in Admin Google Calendar in Real Time!');
        }
      })
      .catch(() => {});
  };

  const handleSendEmailConfirmation = async (appt: Appointment) => {
    const cleanEmail = appt.email?.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      toast(`No valid email address found for ${appt.customer}.`, 'error');
      return;
    }
    const salon = data?.settings?.salon || 'Shree Beauty Studio';
    const foundSvc = (data?.services || []).find((s) => s.name.toLowerCase() === appt.service?.toLowerCase());
    toast(`⏳ Dispatching confirmation email to ${cleanEmail}…`, 'info');
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'confirmation',
          to: cleanEmail,
          subject: `✅ Appointment Confirmed — ${appt.service} at ${salon}`,
          customerName: appt.customer,
          service: appt.service,
          staff: appt.staff || 'Studio Specialist',
          date: appt.date,
          time: appt.time,
          price: foundSvc?.price ?? appt.price,
          address: data?.settings?.address,
          salonName: salon,
          apiKey: data?.settings?.resendApiKey,
          fromEmail: data?.settings?.resendFromEmail,
        }),
      });
      const resJson = await res.json();
      if (resJson.success) {
        toast(`📧 Confirmation email dispatched to ${cleanEmail}!`);
      } else {
        toast(resJson.error || 'Failed to dispatch email.', 'error');
      }
    } catch {
      toast('Network error sending email.', 'error');
    }
  };

  const handleSendWhatsAppAPI = async (appt: Appointment) => {
    if (!appt.mobile) {
      toast(`No mobile number found for ${appt.customer}.`, 'error');
      return;
    }
    const salon = data?.settings?.salon || 'Shree Beauty Studio';
    const address = data?.settings?.address || 'Surat, Gujarat';
    const customTpl = data?.settings?.whatsappTemplates?.['appointment'] || data?.settings?.whatsappTemplates?.['confirmation'];
    const msg = appointmentCustomerMessage(appt, salon, address, customTpl);
    toast(`⏳ Sending WhatsApp via Cloud API to ${appt.customer}…`, 'info');
    try {
      const res = await sendDirectWhatsAppMessage(appt.mobile, msg, data?.settings);
      if (res.success) {
        toast(`⚡ WhatsApp confirmation dispatched to ${appt.customer} via API!`);
      } else {
        toast(`⚠️ API Send: ${res.message || 'Outside 24h window'}. Use Direct WA button.`, 'error');
      }
    } catch (err: any) {
      toast(`⚠️ WhatsApp API Error: ${err?.message || 'Failed'}`);
    }
  };

  const handleSendDirectWhatsApp = (appt: Appointment) => {
    if (!appt.mobile) {
      toast(`No mobile number found for ${appt.customer}.`, 'error');
      return;
    }
    const salon = data?.settings?.salon || 'Shree Beauty Studio';
    const address = data?.settings?.address || 'Surat, Gujarat';
    const customTpl = data?.settings?.whatsappTemplates?.['appointment'] || data?.settings?.whatsappTemplates?.['confirmation'];
    const msg = appointmentCustomerMessage(appt, salon, address, customTpl);
    openWAApp(appt.mobile, msg);
    toast(`📲 Opened WhatsApp App / Web for ${appt.customer}`);
  };

  const handleRejectAppointment = async (appt: Appointment) => {
    updateData((d) => ({
      ...d,
      appointments: d.appointments.map((a) =>
        a.id === appt.id ? { ...a, status: 'Cancelled', workStatus: 'Cancelled' } : a
      ),
    }));
    scheduleSave();
    toast(`❌ Appointment request rejected for ${appt.customer}`, 'info');

    // Auto-delete event directly from Google Calendar in cloud
    fetch('/api/calendar/auto-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'delete_appointment',
        appointment: appt,
        settings: data?.settings,
      }),
    })
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success) {
          toast(`🗑️ Google Calendar માંથી "${appt.customer}" ની Event કાઢી નાખવામાં આવી!`);
        }
      })
      .catch(() => {});

    // WhatsApp Cancellation Notice via WhatsApp App
    if (appt.mobile) {
      const salon = data?.settings?.salon || 'Shree Beauty Studio';
      const rejectMsg = `❌ *Appointment Request Update — ${salon}*\n\nNamaste *${appt.customer}*,\n\nWe regret to inform you that your booking request for *${appt.service}* on *${fmtDate(appt.date)}* at *${appt.time}* could not be confirmed at this time due to slot unavailability.\n\nPlease contact us directly to reschedule: 📞 ${data?.settings?.whatsapp || ''}\n\nThank you! ✨`;
      openWAApp(appt.mobile, rejectMsg);
      toast('📲 WhatsApp App opened with cancellation notice…');
    }
  };

  const resetNewFormDefaults = (clearShared: boolean = true) => {
    setEditId(null);
    setPrevAppt(null);
    setIsSplitAdvance(false);
    setSplitAdvanceAmounts({});
    const nextLiveTime = getCurrentRoundedTimeHHMM(15);
    const keepShared = !clearShared && Boolean(sharedCustomer);
    reset({
      id: '',
      date: today,
      time: nextLiveTime,
      customer: keepShared ? (sharedCustomer?.name || '') : '',
      mobile: keepShared ? (sharedCustomer?.mobile || '') : '',
      email: '',
      service: '',
      price: '' as any,
      staff: '',
      advance: 0,
      advanceMode: data?.settings?.payments?.[0] || 'Cash',
      status: 'Confirmed',
      workStatus: 'Booked',
      notes: '',
    });
    if (clearShared && sharedCustomer) {
      sharedCustomer.onClear();
    }
  };

  // Sync shared common Customer Name & Mobile into inline appointment form
  useEffect(() => {
    if (!sharedCustomer || modalOpen) return;
    setValue('customer', sharedCustomer.name || '');
    setValue('mobile', sharedCustomer.mobile || '');
    const cleanMob = (sharedCustomer.mobile || '').replace(/\D/g, '').slice(-10);
    if (cleanMob.length === 10) {
      const found = (data?.customers || []).find((c) => c.mobile.replace(/\D/g, '').slice(-10) === cleanMob);
      if (found?.email) setValue('email', found.email);
    } else if (!cleanMob) {
      setValue('email', '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedCustomer?.name, sharedCustomer?.mobile, modalOpen]);

  // Prefill live 15-min slot on mount so direct inline form is immediately ready
  useEffect(() => {
    setValue('time', getCurrentRoundedTimeHHMM(15));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openNew = () => {
    if (viewMode === 'queue' && onRequestNewAppointment) {
      onRequestNewAppointment();
      return;
    }
    setModalOpen(false);
    resetNewFormDefaults(false);
    setInlineFormOpen(true);
    setTimeout(() => {
      if (inlineFormRef.current) {
        inlineFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        const firstInput = inlineFormRef.current.querySelector<HTMLInputElement>('input[list="appt-cust-name-list"]');
        firstInput?.focus();
      }
    }, 40);
  };

  const closeEditModal = () => {
    setModalOpen(false);
    resetNewFormDefaults(false);
  };

  // Auto-open & focus new appointment inline form if ?new=1 is in URL or Topbar triggers event
  const searchParams = useSearchParams();
  useEffect(() => {
    if (showForm && (searchParams?.get('new') === '1' || searchParams?.get('action') === 'add')) {
      openNew();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, showForm]);

  useEffect(() => {
    if (!showForm) return;
    const handleOpenInlineNew = () => openNew();
    window.addEventListener('open-inline-new-appointment', handleOpenInlineNew);
    return () => window.removeEventListener('open-inline-new-appointment', handleOpenInlineNew);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showForm]);

  const openEdit = (a: Appointment) => {
    setEditId(a.id);
    setPrevAppt(a);
    const foundSvc = (data?.services || []).find((s) => s.name.toLowerCase() === a.service?.toLowerCase());
    reset({
      ...a,
      email: a.email || '',
      price: a.price ?? (foundSvc ? foundSvc.price : 0),
      advanceMode: a.advanceMode || data?.settings?.payments?.[0] || 'Cash',
    });
    setModalOpen(true);
  };

  const handleCustomerSelect = (val: string) => {
    const capitalized = autoCapitalizeName(val);
    const trimmed = capitalized.trim();
    if (!trimmed) {
      setValue('customer', '', { shouldValidate: true });
      return;
    }

    // 1. Check if chosen from datalist format "Name (Mobile)" or "Name — Mobile"
    const match = trimmed.match(/^(.*?)\s*[\(—\-]\s*(\d{10})\)?$/);
    if (match) {
      const extractedName = autoCapitalizeName(match[1].trim());
      const extractedMob = match[2].trim();
      setValue('customer', extractedName, { shouldValidate: true });
      setValue('mobile', extractedMob, { shouldValidate: true });
      const found = (data?.customers || []).find((c) => c.mobile === extractedMob);
      if (found?.email) {
        setValue('email', found.email, { shouldValidate: true });
      }
      return;
    }

    // 2. Check if exact string matches full option in customers list
    const foundByCombined = (data?.customers || []).find(
      (c) =>
        `${formatCustomerContactName(c.name)} (${c.mobile})`.toLowerCase() === trimmed.toLowerCase() ||
        `${c.name} (${c.mobile})`.toLowerCase() === trimmed.toLowerCase() ||
        `${formatCustomerContactName(c.name)} — 📞 ${c.mobile}`.toLowerCase() === trimmed.toLowerCase()
    );
    if (foundByCombined) {
      setValue('customer', autoCapitalizeName(foundByCombined.name), { shouldValidate: true });
      setValue('mobile', foundByCombined.mobile, { shouldValidate: true });
      if (foundByCombined.email) {
        setValue('email', foundByCombined.email, { shouldValidate: true });
      }
      return;
    }

    // 3. User is simply typing a name -> update name only, NEVER overwrite mobile number!
    setValue('customer', capitalized, { shouldValidate: true });
  };

  const handleMobileSelect = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) {
      setValue('mobile', '', { shouldValidate: true });
      return;
    }

    // 1. Check if chosen from datalist format "Mobile (Name)"
    const match = trimmed.match(/^(\d{10})\s*[\(—\-]\s*(.*?)\)?$/);
    if (match) {
      const extractedMob = match[1].trim();
      const extractedName = autoCapitalizeName(match[2].trim());
      setValue('mobile', extractedMob, { shouldValidate: true });
      setValue('customer', extractedName, { shouldValidate: true });
      const found = (data?.customers || []).find((c) => c.mobile === extractedMob);
      if (found?.email) {
        setValue('email', found.email, { shouldValidate: true });
      }
      return;
    }

    // 2. User is typing digits -> clean numbers only
    const cleanNum = trimmed.replace(/\D/g, '').slice(0, 10);
    setValue('mobile', cleanNum, { shouldValidate: true });

    // 3. If full 10 digits entered, auto fill existing customer details
    if (cleanNum.length === 10) {
      const c = (data?.customers || []).find((x) => x.mobile === cleanNum);
      if (c) {
        if (!watch('customer')) {
          setValue('customer', autoCapitalizeName(c.name), { shouldValidate: true });
        }
        if (c.email && !watch('email')) {
          setValue('email', c.email, { shouldValidate: true });
        }
      }
    }
  };

  const handleImportContact = (importedName: string, importedPhone: string) => {
    const cleanPhone = (importedPhone || '').replace(/\D/g, '').slice(-10);
    const cleanName = autoCapitalizeName((importedName || '').trim());
    const foundByMob = cleanPhone.length === 10
      ? (data?.customers || []).find((c) => c.mobile.replace(/\D/g, '').slice(-10) === cleanPhone)
      : undefined;
    if (foundByMob) {
      setValue('customer', autoCapitalizeName(formatCustomerContactName(foundByMob.name)), { shouldValidate: true });
      setValue('mobile', cleanPhone, { shouldValidate: true });
      if (foundByMob.email) setValue('email', foundByMob.email, { shouldValidate: true });
    } else {
      if (cleanName) setValue('customer', cleanName, { shouldValidate: true });
      if (cleanPhone) setValue('mobile', cleanPhone, { shouldValidate: true });
    }
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

  const autoMatchCustomerByName = (inputVal: string, isBlurOrEnter: boolean = false) => {
    const trimmed = inputVal.trim();
    if (!trimmed) return;
    const q = trimmed.toLowerCase();
    const customers = data?.customers || [];
    const exactMatch = customers.find((c) => {
      const fn = formatCustomerContactName(c.name).toLowerCase();
      const raw = c.name.trim().toLowerCase();
      return fn === q || raw === q || fn.replace(/\s+/g, '') === q.replace(/\s+/g, '');
    });
    if (exactMatch) {
      const cleanMob = exactMatch.mobile.replace(/\D/g, '').slice(-10);
      setValue('mobile', cleanMob, { shouldValidate: true });
      if (exactMatch.email && !watch('email')) setValue('email', exactMatch.email, { shouldValidate: true });
      if (isBlurOrEnter) setValue('customer', autoCapitalizeName(formatCustomerContactName(exactMatch.name)), { shouldValidate: true });
    }
  };

  const handleServiceSelect = (val: string) => {
    setValue('service', val);
    const found = (data?.services || []).find((s) => s.name.toLowerCase() === val.trim().toLowerCase());
    if (found) {
      setValue('price', found.price);
    }
  };

  const onSubmit = (form: Appointment, saveMode: 'web' | 'api' | 'none' = 'web') => {
    if (!form.service?.trim()) {
      toast('Please select or enter a service.', 'error');
      return;
    }
    // Validate past dates & times when booking a NEW appointment
    if (!editId) {
      if (form.date < today) {
        toast('Cannot book appointment for a past date.', 'error');
        return;
      }
      if (form.date === today && isPastTimeForDate(form.date, form.time)) {
        toast('Cannot book appointment for a past time. Please select current live or upcoming future time.', 'error');
        return;
      }
    }

    const id = editId || uid();
    const cleanEmail = form.email?.trim() || undefined;

    updateData((d) => {
      // Auto-add customer if new mobile or sync email to existing customer profile
      const existingCustIdx = d.customers.findIndex((c) => c.mobile === form.mobile);
      if (existingCustIdx >= 0) {
        if (cleanEmail && !d.customers[existingCustIdx].email) {
          const updated = [...d.customers];
          updated[existingCustIdx] = { ...updated[existingCustIdx], email: cleanEmail };
          d = { ...d, customers: updated };
        }
      } else if (form.mobile && form.customer) {
        d = {
          ...d,
          customers: [...d.customers, {
            id: uid(),
            name: autoCapitalizeName(formatCustomerContactName(form.customer)),
            mobile: form.mobile,
            email: cleanEmail,
            birthday: '',
            anniversary: '',
            notes: '',
          }],
        };
      }

      const initialWorkStatus: WorkStatus = form.status === 'Cancelled' ? 'Cancelled' : (form.workStatus || 'Booked');
      const updatedItem = { ...form, customer: autoCapitalizeName(form.customer), id, email: cleanEmail, workStatus: initialWorkStatus };

      if (editId) {
        return {
          ...d,
          appointments: d.appointments.map((a) => a.id === editId ? { ...updatedItem, id: editId } : a)
        };
      }
      return { ...d, appointments: [...d.appointments, updatedItem] };
    });
    scheduleSave();
    toast(editId ? 'Appointment updated & synced!' : 'Appointment booked & synced!');

    const salon = data?.settings?.salon || 'Shree Beauty Studio';
    const address = data?.settings?.address || 'Surat, Gujarat';
    const customTpl = data?.settings?.whatsappTemplates?.['appointment'] || data?.settings?.whatsappTemplates?.['confirmation'];

    const msg = appointmentCustomerMessage({ ...form, id }, salon, address, customTpl);

    // 1. Web Send and Save (opens WhatsApp Web / App)
    if (saveMode === 'web' && form.mobile && form.status !== 'Cancelled') {
      openWAApp(form.mobile, msg);
      toast(`🌐 WhatsApp Web / App opened for ${form.customer}!`);
    }
    // 2. API Send and Save (Meta WhatsApp Cloud API background send)
    else if (saveMode === 'api' && form.mobile && form.status !== 'Cancelled') {
      toast('⏳ Sending WhatsApp message via Cloud API...', 'info');
      sendDirectWhatsAppMessage(form.mobile, msg, data?.settings).then((res) => {
        if (res.success) {
          toast(`⚡ WhatsApp confirmation sent to ${form.customer} via API!`);
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
    // 3. Only Save (Direct silent save)
    else if (saveMode === 'none') {
      toast('💾 Appointment saved directly (No WhatsApp sent)');
    }

    // Auto-sync directly to Google Calendar in the cloud
    if (form.status === 'Cancelled' || form.workStatus === 'Cancelled') {
      // If status is Cancelled, remove event from Google Calendar
      fetch('/api/calendar/auto-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'delete_appointment',
          appointment: { ...form, id, email: cleanEmail },
          settings: data?.settings,
        }),
      })
        .then((res) => res.json())
        .then((resData) => {
          if (resData.success) {
            toast(`🗑️ Google Calendar માંથી "${form.customer}" ની ઇવેન્ટ કાઢી નાખવામાં આવી!`, 'info');
          }
        })
        .catch(() => {});
    } else {
      const syncUpdatedAppt = () => {
        fetch('/api/calendar/auto-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'appointment',
            appointment: { ...form, id, email: cleanEmail },
            settings: data?.settings,
          }),
        })
          .then((res) => res.json())
          .then((res) => {
            if (res.success && res.provider !== 'feed_and_invite') {
              toast('📅 Google Calendar માં Auto-Save થયું!');
            } else if (!res.success) {
              console.error('[Calendar Auto-Sync Failed]:', res.error || res.message);
            }
          })
          .catch((err) => {
            console.error('[Calendar Auto-Sync Error]:', err);
          });
      };

      // If editing existing appointment, remove previous event first to prevent duplicates
      if (prevAppt) {
        fetch('/api/calendar/auto-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'delete_appointment',
            appointment: prevAppt,
            settings: data?.settings,
          }),
        })
          .catch(() => {})
          .finally(() => {
            syncUpdatedAppt();
          });
      } else {
        syncUpdatedAppt();
      }
    }

    if (editId) {
      setModalOpen(false);
    }
    resetNewFormDefaults(!editId);
  };

  const handleDelete = (id: string) => {
    const target = (data?.appointments || []).find((a) => a.id === id);
    if (target) {
      fetch('/api/calendar/auto-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'delete_appointment',
          appointment: target,
          settings: data?.settings,
        }),
      })
        .then((res) => res.json())
        .then((resData) => {
          if (resData.success) {
            toast(`🗑️ Google Calendar માંથી "${target.customer}" ની ઇવેન્ટ કાઢી નાખવામાં આવી!`);
          }
        })
        .catch(() => {});
    }
    updateData((d) => ({ ...d, appointments: (d.appointments || []).filter((a) => a.id !== id) }));
    scheduleSave();
    toast('Appointment deleted & removed from Google Calendar', 'info');
    setDeleteId(null);
  };


  const handleStartService = (id: string) => {
    updateData((d) => ({
      ...d,
      appointments: d.appointments.map((a) =>
        a.id === id ? { ...a, workStatus: 'In Service', serviceStartedAt: new Date().toISOString() } : a
      ),
    }));
    scheduleSave();
    toast('Service started! Beautician is in progress.');
  };

  const handleCompleteService = (id: string) => {
    updateData((d) => ({
      ...d,
      appointments: d.appointments.map((a) =>
        a.id === id ? { ...a, workStatus: 'Completed', serviceCompletedAt: new Date().toISOString() } : a
      ),
    }));
    scheduleSave();
    toast('Service completed! Ready to generate bill.');
  };

  const handleConvertToBill = (appt: Appointment) => {
    router.push(`/admin/billing?convertApptId=${appt.id}`);
  };

  const handleOpenReceipt = (appt: Appointment) => {
    const existingInv = appt.invoiceId
      ? (data?.invoices || []).find((i) => i.id === appt.invoiceId || i.no === appt.invoiceId)
      : null;

    if (existingInv) {
      setReceiptModalInv(existingInv);
      return;
    }

    const apptPrice = Number(appt.price) || 0;
    const apptAdvance = Number(appt.advance) || 0;

    const tempInv: Invoice = {
      id: `INV-${appt.id}`,
      no: appt.invoiceId || `APP-${appt.id.slice(-6).toUpperCase()}`,
      date: appt.date,
      customer: appt.customer,
      mobile: appt.mobile,
      appointmentId: appt.id,
      lines: [
        {
          type: 'S',
          name: appt.service || 'Salon Service',
          qty: 1,
          price: apptPrice,
          staff: appt.staff || 'Staff',
        },
      ],
      subtotal: apptPrice,
      discount: 0,
      total: apptPrice,
      advance: apptAdvance,
      advanceMode: appt.advanceMode || 'Cash',
      paid: apptAdvance,
      balance: Math.max(0, apptPrice - apptAdvance),
      mode: appt.advanceMode || 'Cash',
    };

    setReceiptModalInv(tempInv);
  };

  const renderAppointmentFormFields = (isModal: boolean = false) => (
    <>
      {/* Customer Information (Up & Down POS Layout — hidden inline when shared across 3 tabs) */}
      {(isModal || !sharedCustomer) && (
      <div
        className="billing-customer-grid"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          marginBottom: 6,
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
            name="appt_customer_name_pos"
            className="input"
            list="appt-cust-name-list"
            autoComplete="off"
            placeholder="Start typing name or contact…"
            value={watchCustomer}
            onBlur={() => setTimeout(() => autoMatchCustomerByName(watchCustomer, true), 200)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                autoMatchCustomerByName(watchCustomer, true);
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
          <datalist id="appt-cust-name-list">
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
            name="appt_customer_mobile_pos"
            className="input"
            list="appt-cust-mob-list"
            autoComplete="off"
            placeholder="10-digit mobile number"
            value={watchMobile}
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
          <datalist id="appt-cust-mob-list">
            {(data?.customers || []).map((c) => (
              <option key={c.id} value={`${c.mobile} (${formatCustomerContactName(c.name)})`}>
                {c.mobile} — 👤 {formatCustomerContactName(c.name)}
              </option>
            ))}
          </datalist>
          {watchMobile.length === 10 && cust24hStatus.active ? (
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
      </div>
      )}

      {/* Date, Time & Staff Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 6,
          margin: '4px 0 8px',
        }}
      >
        <input
          type="date"
          className="input"
          min={editId ? undefined : today}
          value={watchDate}
          onChange={(e) => setValue('date', e.target.value)}
          title="Appointment Date"
          style={{
            height: 42,
            border: '1.5px solid #cbd5e1',
            borderRadius: 8,
            padding: '0 10px',
            fontSize: 16,
            fontWeight: 600,
            background: '#ffffff',
          }}
        />
        <select
          className="input"
          value={watchTime}
          onChange={(e) => setValue('time', e.target.value)}
          title="Appointment Time Slot"
          style={{
            height: 42,
            border: '1.5px solid #cbd5e1',
            borderRadius: 8,
            padding: '0 10px',
            fontSize: 16,
            fontWeight: 600,
            background: '#ffffff',
          }}
        >
          {watchTime && !FIFTEEN_MIN_TIME_SLOTS.some((s) => s.value === watchTime) && (
            <option value={watchTime}>{watchTime}</option>
          )}
          {FIFTEEN_MIN_TIME_SLOTS.map((slot) => (
            <option key={slot.value} value={slot.value}>
              {slot.label}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={watch('staff') || ''}
          onChange={(e) => setValue('staff', e.target.value)}
          title="Beautician / Staff"
          style={{
            height: 42,
            border: '1.5px solid #cbd5e1',
            borderRadius: 8,
            padding: '0 10px',
            fontSize: 16,
            fontWeight: 600,
            background: '#ffffff',
          }}
        >
          <option value="">💇 Any Staff</option>
          {(data?.staff || []).map((s) => (
            <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
          ))}
        </select>
      </div>

      {/* Holiday or Past Time Warnings */}
      {(() => {
        const holidayCheck = checkDateHolidayOrBlocked(watchDate, holidays);
        const pastWarning = !editId && watchDate === today && isPastTimeForDate(watchDate, watchTime);
        if (!holidayCheck.isBlocked && !pastWarning) return null;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
            {holidayCheck.isBlocked && (
              <div
                style={{
                  background: holidayCheck.holiday?.type === 'Holiday' ? '#fef3c7' : '#fee2e2',
                  border: `1px solid ${holidayCheck.holiday?.type === 'Holiday' ? '#fde68a' : '#fecaca'}`,
                  color: holidayCheck.holiday?.type === 'Holiday' ? '#92400e' : '#991b1b',
                  borderRadius: 8,
                  padding: '6px 10px',
                  fontSize: 11.5,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <AlertTriangle size={14} />
                <span>{holidayCheck.badgeText} (Admin Override Allowed)</span>
              </div>
            )}
            {pastWarning && (
              <div
                style={{
                  background: '#fff1f2',
                  border: '1px solid #fecdd3',
                  color: '#be123c',
                  borderRadius: 8,
                  padding: '6px 10px',
                  fontSize: 11.5,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <AlertTriangle size={14} />
                <span>⚠️ Past time! Please select live/future time.</span>
              </div>
            )}
          </div>
        );
      })()}

      {/* Service Line Item Section (Exact POS Table Style) */}
      <div style={{ marginBottom: 6, display: 'flex', flexDirection: 'column' }}>
        {/* Desktop & Tablet Grid Row */}
        <div className="billing-lines-desktop">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(180px, 1fr) 115px 140px 95px',
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
            <span>Service Description</span>
            <span style={{ textAlign: 'right' }}>Rate (₹)</span>
            <span style={{ textAlign: 'center' }}>Status</span>
            <span style={{ textAlign: 'right' }}>Total (₹)</span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(180px, 1fr) 115px 140px 95px',
              gap: 6,
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span
                className="badge badge-gold"
                style={{
                  fontSize: 14,
                  padding: '3px 6px',
                  border: 'none',
                  flexShrink: 0,
                  borderRadius: 6,
                }}
              >
                💄
              </span>
              <input
                type="text"
                className="input"
                list="appt-service-list"
                placeholder="Select or type service (e.g. Layer Cut, O3+ Facial)…"
                value={watchService}
                onChange={(e) => handleServiceSelect(e.target.value)}
                style={{
                  height: 36,
                  fontSize: 15.5,
                  padding: '0 8px',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                }}
              />
            </div>

            <input
              type="number"
              min={0}
              className="input"
              placeholder="0"
              value={watchPrice === undefined || watchPrice === null ? '' : watchPrice}
              onChange={(e) =>
                setValue('price', e.target.value === '' ? ('' as any) : Math.max(0, Number(e.target.value) || 0))
              }
              style={{
                textAlign: 'right',
                height: 36,
                fontSize: 15.5,
                padding: '0 6px',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
              }}
            />

            <select
              className="input"
              value={watchStatus}
              onChange={(e) => setValue('status', e.target.value as AppointmentStatus)}
              style={{
                height: 36,
                fontSize: 14,
                fontWeight: 600,
                padding: '0 6px',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                background: '#ffffff',
              }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <div style={{ textAlign: 'right', paddingRight: 3 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                {money(apptPriceNum)}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Responsive Card View */}
        <div className="billing-lines-mobile">
          <div
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
                className="badge badge-gold"
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
                💄
              </span>
              <input
                type="text"
                className="input"
                list="appt-service-list"
                placeholder="Select or type service…"
                value={watchService}
                onChange={(e) => handleServiceSelect(e.target.value)}
                style={{ flex: 1, height: 42, fontSize: 17.5, padding: '0 10px', borderRadius: 8 }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 6, alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: 11, color: '#64748b', display: 'block', fontWeight: 700, marginBottom: 2 }}>
                  RATE (₹)
                </span>
                <input
                  type="number"
                  min={0}
                  className="input"
                  placeholder="0"
                  value={watchPrice === undefined || watchPrice === null ? '' : watchPrice}
                  onChange={(e) =>
                    setValue('price', e.target.value === '' ? ('' as any) : Math.max(0, Number(e.target.value) || 0))
                  }
                  style={{ textAlign: 'right', height: 36, fontSize: 17, padding: '0 6px', fontWeight: 600 }}
                />
              </div>
              <div>
                <span style={{ fontSize: 11, color: '#64748b', display: 'block', fontWeight: 700, marginBottom: 2 }}>
                  STATUS
                </span>
                <select
                  className="input"
                  value={watchStatus}
                  onChange={(e) => setValue('status', e.target.value as AppointmentStatus)}
                  style={{ height: 36, fontSize: 14.5, padding: '0 6px', fontWeight: 600, background: '#ffffff' }}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div style={{ textAlign: 'right', minWidth: 68 }}>
                <span style={{ fontSize: 11, color: '#64748b', display: 'block', fontWeight: 700, marginBottom: 2 }}>
                  TOTAL
                </span>
                <span style={{ fontSize: 17.5, fontWeight: 900, color: '#0f172a' }}>
                  {money(apptPriceNum)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <datalist id="appt-service-list">
          {(data?.services || [])
            .filter((s) => {
              const n = (s.name || '').toLowerCase();
              return !(
                s.id?.startsWith('svc_bridal-') ||
                s.id?.startsWith('svc_sider-') ||
                n.includes('(bridal package)') ||
                n.includes('(siders package)') ||
                n.includes('(luxury package)') ||
                n.includes('airbrush couture bridal') ||
                n.includes('royal bridal hd makeover') ||
                n.includes('siders & bridesmaids makeup') ||
                n.includes('pre-bridal luxury skin') ||
                (n.includes('package') && (n.includes('bridal') || n.includes('sider') || n.includes('siders'))) ||
                n.startsWith('mac | forever') ||
                n.startsWith('huda | bobbi') ||
                n.startsWith('armani | dior') ||
                n.startsWith('hourglass') ||
                n.startsWith('charlotte tilbury') ||
                n.startsWith('very valentino')
              );
            })
            .map((s) => {
            const basis = getServicePricingBasis(s.category, s.name, s.pricingType);
            const tag = basis.badgeShort ? ` [${basis.badgeShort}]` : '';
            const priceLabel = basis.isFixed ? `Fixed ${money(s.price)}` : `Starts ${money(s.price)}${tag}`;
            return (
              <option key={s.id} value={s.name}>
                {s.name} — {priceLabel}
              </option>
            );
          })}
        </datalist>

        {/* Compact Optional Notes Strip */}
        <div style={{ marginTop: 8 }}>
          <input
            type="text"
            className="input"
            placeholder="Notes (e.g. Ammonia-free hair color, patch test verified…)"
            value={watch('notes') || ''}
            onChange={(e) => setValue('notes', e.target.value)}
            style={{
              height: 38,
              fontSize: 14.5,
              borderRadius: 8,
              padding: '0 10px',
              border: '1px solid #cbd5e1',
              width: '100%',
            }}
          />
        </div>
      </div>

      {/* Integrated Settlement Section (Exact POS Checkout Style) */}
      <div id="appt-checkout-section" style={{ marginTop: 4 }}>
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
            {apptAdvanceNum > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#05424A', fontWeight: 600 }}>
                <span>Advance Deposit ({watchAdvanceMode || defaultPayMode}):</span>
                <span>−{money(apptAdvanceNum)}</span>
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
                {apptAdvanceNum > 0 ? 'Balance Payable:' : 'Total Payable:'}
              </span>
              <span style={{ fontSize: 24, fontWeight: 900, color: '#05424A' }}>
                {money(apptBalance)}
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
                    color: apptBalance > 0 ? '#dc2626' : '#16a34a',
                    background: apptBalance > 0 ? '#fee2e2' : '#f0fdf4',
                    border: apptBalance > 0 ? '1px solid #fca5a5' : '1px solid #bbf7d0',
                    padding: '2px 8px',
                    borderRadius: 5,
                  }}
                >
                  {apptBalance > 0 ? `Due: ${money(apptBalance)}` : 'Status: ₹0.00'}
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
                    color: apptPriceNum > 0 && apptBalance === 0 ? '#16a34a' : '#05424A',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={apptPriceNum > 0 && apptBalance === 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setIsSplitAdvance(false);
                        setSplitAdvanceAmounts({});
                        setValue('advance', apptPriceNum);
                      } else {
                        setValue('advance', 0);
                        setSplitAdvanceAmounts({});
                      }
                    }}
                    style={{ accentColor: '#16a34a', cursor: 'pointer', width: 17, height: 17 }}
                  />
                  <span>Fully Paid</span>
                </label>

                <label
                  style={{
                    fontSize: 14.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    cursor: 'pointer',
                    color: isSplitAdvance ? '#05424A' : '#64748b',
                    fontWeight: 600,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSplitAdvance}
                    onChange={(e) => {
                      const nextSplit = e.target.checked;
                      setIsSplitAdvance(nextSplit);
                      if (!nextSplit) {
                        setSplitAdvanceAmounts({});
                      }
                    }}
                    style={{ accentColor: '#05424A', width: 17, height: 17, cursor: 'pointer' }}
                  />
                  <span>🔀 Split Payment</span>
                </label>
              </div>
            </div>

            {!isSplitAdvance ? (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <select
                  value={watchAdvanceMode || defaultPayMode}
                  onChange={(e) => setValue('advanceMode', e.target.value)}
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
                  {getPaymentOptions(data?.settings?.payments, watchAdvanceMode ? [watchAdvanceMode] : undefined).map((p) => (
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
                    placeholder="Advance"
                    value={watchAdvance || ''}
                    onChange={(e) => setValue('advance', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value) || 0))}
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
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: 6 }}>
                  {paymentModes.map((p) => (
                    <div key={p}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                        <label style={{ fontSize: 13.5, color: '#64748b', fontWeight: 700 }}>
                          {getPaymentOptionIcon(p)} {p}
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const othersTotal = Object.entries(splitAdvanceAmounts).reduce(
                              (sum, [k, v]) => (k === p ? sum : sum + (typeof v === 'number' ? v : 0)),
                              0
                            );
                            const remaining = Math.max(0, apptPriceNum - othersTotal);
                            const updated = { ...splitAdvanceAmounts, [p]: remaining };
                            setSplitAdvanceAmounts(updated);
                            let total = 0;
                            const modes: string[] = [];
                            Object.entries(updated).forEach(([mKey, mVal]) => {
                              if (typeof mVal === 'number' && mVal > 0) {
                                total += mVal;
                                modes.push(`${mKey}: ₹${mVal}`);
                              }
                            });
                            setValue('advance', total);
                            setValue('advanceMode', modes.join(', ') || 'Split Payment');
                          }}
                          style={{
                            fontSize: 12,
                            padding: '1px 7px',
                            borderRadius: 4,
                            border: '1px solid #cbd5e1',
                            background: '#f8fafc',
                            cursor: 'pointer',
                            color: '#05424A',
                            fontWeight: 700,
                          }}
                        >
                          Fill
                        </button>
                      </div>
                      <input
                        type="number"
                        min={0}
                        className="input"
                        placeholder="0"
                        value={splitAdvanceAmounts[p] ?? ''}
                        onChange={(e) => {
                          const val: number | '' = e.target.value === '' ? '' : (Number(e.target.value) || 0);
                          const updated: Record<string, number | ''> = { ...splitAdvanceAmounts, [p]: val };
                          setSplitAdvanceAmounts(updated);
                          let total = 0;
                          const modes: string[] = [];
                          Object.entries(updated).forEach(([mKey, mVal]) => {
                            if (typeof mVal === 'number' && mVal > 0) {
                              total += mVal;
                              modes.push(`${mKey}: ₹${mVal}`);
                            }
                          });
                          setValue('advance', total);
                          setValue('advanceMode', modes.join(', ') || 'Split Payment');
                        }}
                        style={{
                          padding: '0 8px',
                          height: 42,
                          fontSize: 17,
                          fontWeight: 700,
                          borderRadius: 8,
                          border: '1.5px solid #cbd5e1',
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );

  const renderAppointmentFormActions = (isModal: boolean) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
        {isModal ? (
          <button
            type="button"
            className="btn btn-outline"
            onClick={closeEditModal}
            style={{
              padding: '0 16px',
              height: 46,
              fontSize: 16,
              fontWeight: 700,
              borderRadius: 8,
              color: '#e11d48',
              borderColor: '#fecdd3',
              background: '#fff1f2',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => resetNewFormDefaults(true)}
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
            title="Clear all appointment fields & reset"
          >
            <RotateCcw size={16} />
            <span>All Clear</span>
          </button>
        )}

        <motion.button
          type="button"
          className="btn"
          onClick={handleSubmit((formData) => onSubmit(formData, 'web'))}
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
          title="Save appointment and open WhatsApp Web/App to send confirmation"
        >
          🌐 Web Send &amp; Save
        </motion.button>

        <motion.button
          type="button"
          className="btn"
          onClick={handleSubmit((formData) => onSubmit(formData, 'api'))}
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
          title="Save appointment and send WhatsApp confirmation automatically via Cloud API"
        >
          ⚡ API Send &amp; Save
        </motion.button>

        <motion.button
          type="button"
          className="btn btn-primary"
          onClick={handleSubmit((formData) => onSubmit(formData, 'none'))}
          whileTap={{ scale: 0.98 }}
          style={{
            flex: 1,
            minWidth: 190,
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
          title="Directly save appointment into records & Google Calendar without sending WhatsApp message"
        >
          💾 {editId ? 'Update Appointment' : 'Save Appointment'}
        </motion.button>
      </div>

      {watch('date') && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <a
            href={getAppointmentGoogleCalendarUrl(
              {
                customer: watchCustomer || 'Customer',
                mobile: watchMobile,
                service: watch('service') || 'Salon Service',
                date: watch('date'),
                time: watch('time') || '10:00',
                staff: watch('staff'),
                advance: watchAdvance,
                notes: watch('notes'),
                price: watch('price'),
              },
              data?.settings?.salon,
              data?.settings?.address
            )}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#2563eb',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 11.5,
            }}
            title="Open Google Calendar to save event with automatic reminders"
          >
            <Calendar size={12} /> Open preview in Google Calendar ↗
          </a>
        </div>
      )}
    </div>
  );

  return (
    <div>
      {/* Direct Inline POS-Style Appointment Booking Card (Same Unified Layout as Billing POS) */}
      {showForm && inlineFormOpen && !modalOpen && (
        <div className="billing-layout" style={{ marginBottom: showQueue ? 14 : 0 }}>
          <div
            ref={inlineFormRef}
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
            {renderAppointmentFormFields(false)}

            <div style={{ marginTop: 10 }}>
              {renderAppointmentFormActions(false)}
            </div>
          </div>
        </div>
      )}

      {showQueue && (
      <>
      {/* Today's Studio Holiday / Fully Booked Alert Banner */}
      {(() => {
        const todayCheck = checkDateHolidayOrBlocked(today, holidays);
        if (!todayCheck.isBlocked) return null;
        const isHoli = todayCheck.holiday?.type === 'Holiday';
        return (
          <div
            style={{
              background: isHoli ? '#fef3c7' : '#fee2e2',
              border: `1.5px solid ${isHoli ? '#fde68a' : '#fecaca'}`,
              color: isHoli ? '#92400e' : '#991b1b',
              borderRadius: 12,
              padding: '12px 18px',
              marginBottom: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
              boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>{isHoli ? '🏖️' : '⛔'}</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13.5 }}>
                  Today ({fmtDate(today)}) is marked as {isHoli ? 'Studio Holiday (Closed)' : 'Fully Booked / Slots Full'}!
                </div>
                <div style={{ fontSize: 12, opacity: 0.9 }}>
                  Notice: <b>{todayCheck.holiday?.reason}</b> {todayCheck.holiday?.notes ? `· ${todayCheck.holiday?.notes}` : ''}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => setHolidayModalOpen(true)}
              style={{ fontSize: 11.5, fontWeight: 800, background: '#ffffff', borderColor: 'currentColor' }}
            >
              Manage Holidays &rarr;
            </button>
          </div>
        );
      })()}

      {/* Pending Booking Requests Alert Banner with New Notification Chime Controls */}
      {counts.pending > 0 && (
        <div
          style={{
            background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
            border: '1.5px solid #f59e0b',
            color: '#92400e',
            borderRadius: 14,
            padding: '14px 18px',
            marginBottom: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            boxShadow: '0 4px 14px rgba(245, 158, 11, 0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: '#fef08a',
                border: '1.5px solid #eab308',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(234,179,8,0.25)',
              }}
            >
              🔔
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: '#78350f' }}>
                {counts.pending} New Pending Booking Request{counts.pending > 1 ? 's' : ''} (નવી બુકિંગ વિનંતી)!
              </div>
              <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>
                Customer has requested an appointment online. Click <b>Confirm &amp; Notify</b> to confirm and auto-send WhatsApp notification.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => playNewBookingChime(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 12px',
                borderRadius: 8,
                background: '#ffffff',
                border: '1.5px solid #d97706',
                color: '#92400e',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="Test new booking notification sound chime"
            >
              <span>🔊</span>
              <span>Test Chime</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const nextMuted = !soundMuted;
                setSoundMuted(nextMuted);
                setAudioNotificationMuted(nextMuted);
                if (!nextMuted) playNewBookingChime(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 12px',
                borderRadius: 8,
                background: soundMuted ? '#f1f5f9' : '#ffffff',
                border: `1.5px solid ${soundMuted ? '#94a3b8' : '#d97706'}`,
                color: soundMuted ? '#64748b' : '#92400e',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title={soundMuted ? 'Sound is muted. Click to turn sound on' : 'Sound is active'}
            >
              <span>{soundMuted ? '🔇 Muted' : '🔔 Sound On'}</span>
            </button>

            <button
              type="button"
              className="btn btn-sm btn-gold"
              onClick={() => setActiveTab('pending')}
              style={{ fontWeight: 800, padding: '7px 16px', fontSize: 12.5 }}
            >
              Review Pending Requests ({counts.pending}) &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Compact Appointments Queue Header & Search Strip */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8,
          flexWrap: 'wrap',
        }}
      >
        {viewMode === 'queue' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ fontWeight: 700, fontSize: 15.5, margin: 0, color: 'var(--text)' }}>
              📅 Appointments Queue
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
              {counts.all}
            </span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: viewMode === 'queue' ? 'flex-end' : 'space-between', flexWrap: 'wrap' }}>
          <div className="search-wrap" style={{ flex: 1, minWidth: 180, maxWidth: 320 }}>
            <Search size={14} className="search-icon" />
            <input
              type="search"
              className="input"
              placeholder="Search customer, mobile, service, staff…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ height: 34, fontSize: 12.5, borderRadius: 8 }}
            />
          </div>
          {(!inlineFormOpen || viewMode === 'queue') && (
            <motion.button className="btn btn-primary btn-sm btn-glow" onClick={openNew} whileTap={{ scale: 0.97 }}>
              <Plus size={14} /> New Appointment
            </motion.button>
          )}
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <span>All Bookings</span>
          <span className="tab-badge">{counts.all}</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
          style={{
            borderBottom: activeTab === 'pending' ? '2px solid #f59e0b' : undefined,
            color: activeTab === 'pending' ? '#b45309' : undefined,
          }}
        >
          <span>⏳ Pending Requests</span>
          <span
            className="tab-badge"
            style={{
              background: counts.pending > 0 ? '#f59e0b' : '#f1f5f9',
              color: counts.pending > 0 ? '#ffffff' : '#64748b',
              fontWeight: 800,
            }}
          >
            {counts.pending}
          </span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'today' ? 'active' : ''}`}
          onClick={() => setActiveTab('today')}
        >
          <span>📅 Today's Queue</span>
          <span className="tab-badge">{counts.today}</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          <span>⏳ Confirmed</span>
          <span className="tab-badge">{counts.upcoming}</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'inservice' ? 'active' : ''}`}
          onClick={() => setActiveTab('inservice')}
        >
          <span>✨ In Service</span>
          <span className="tab-badge gold">{counts.inService}</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          <span>✓ Completed & Billed</span>
          <span className="tab-badge">{counts.completed}</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'not-attempted' ? 'active' : ''}`}
          onClick={() => setActiveTab('not-attempted')}
        >
          <span>⚠️ Not Attempted</span>
          <span
            className="tab-badge"
            style={{
              background: counts.notAttempted > 0 ? '#fef3c7' : '#f1f5f9',
              color: counts.notAttempted > 0 ? '#92400e' : '#64748b',
              fontWeight: 800,
            }}
          >
            {counts.notAttempted}
          </span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'cancelled' ? 'active' : ''}`}
          onClick={() => setActiveTab('cancelled')}
        >
          <span>❌ Cancelled</span>
          <span className="tab-badge danger">{counts.cancelled}</span>
        </button>
      </div>

      {/* Table */}
      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <Calendar size={48} />
            <h3>{search ? 'No results found' : activeTab === 'pending' ? 'No pending requests' : 'No appointments yet'}</h3>
            <p>{activeTab === 'pending' ? 'All online booking requests have been reviewed.' : 'Book your first appointment to get started'}</p>
            {!search && (
              <motion.button className="btn btn-primary btn-sm" onClick={openNew} whileTap={{ scale: 0.97 }}>
                <Plus size={14} /> New Appointment
              </motion.button>
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
                    <thead>
                      <tr>
                        <th>Schedule & Time</th>
                        <th>Customer & Mobile</th>
                        <th>Service & Staff</th>
                        <th>Service Flow</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <motion.tbody variants={staggerContainer} initial="hidden" animate="visible">
                      {filtered.map((a) => {
                        const ws = getEffectiveWorkStatus(a, today);
                        return (
                          <motion.tr
                            key={a.id}
                            variants={fadeSlideUp}
                            className={a.date === today ? 'today-row' : ''}
                          >
                            <td>
                              <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13 }}>
                                {fmtDate(a.date)}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--teal)', fontWeight: 700 }}>
                                {a.time}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{a.customer}</div>
                              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{a.mobile}</div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                                {a.service} {a.price ? `— ${money(a.price)}` : ''}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                                Beautician: {a.staff || 'Any'} {a.advance ? `· Adv: ${money(a.advance)} (${a.advanceMode || 'Cash'})` : ''}
                              </div>
                            </td>
                            <td>
                              {a.status === 'Pending' ? (
                                <span
                                  style={{
                                    fontSize: 10.5,
                                    fontWeight: 800,
                                    padding: '3px 8px',
                                    borderRadius: 999,
                                    background: '#fef3c7',
                                    color: '#b45309',
                                    border: '1.5px solid #fde68a',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    boxShadow: '0 1px 3px rgba(245,158,11,0.15)',
                                  }}
                                  title="Customer has requested this booking online; pending studio confirmation"
                                >
                                  ⏳ Pending Review
                                </span>
                              ) : ws === 'Cancelled' ? (
                                <span className="badge-chip cancelled">Cancelled</span>
                              ) : ws === 'Not Attempted' ? (
                                <span
                                  style={{
                                    fontSize: 10.5,
                                    fontWeight: 700,
                                    padding: '3px 8px',
                                    borderRadius: 999,
                                    background: '#fef3c7',
                                    color: '#92400e',
                                    border: '1px solid #fde68a',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 3,
                                  }}
                                  title="Appointment was not started within 2 days after scheduled date"
                                >
                                  ⚠️ Not Attempted
                                </span>
                              ) : (
                                <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                                  <span
                                    style={{
                                      fontSize: 9.5,
                                      fontWeight: 700,
                                      padding: '2px 5px',
                                      borderRadius: 999,
                                      background: ws === 'Booked' ? '#fff0c9' : '#eef3f4',
                                      color: ws === 'Booked' ? '#806012' : '#6b7880',
                                    }}
                                  >
                                    Booked
                                  </span>
                                  <span style={{ color: 'var(--muted)', fontSize: 9 }}>›</span>
                                  <span
                                    style={{
                                      fontSize: 9.5,
                                      fontWeight: 700,
                                      padding: '2px 5px',
                                      borderRadius: 999,
                                      background:
                                        ws === 'In Service' || ws === 'Completed' || ws === 'Billed'
                                          ? '#dff5e8'
                                          : '#eef3f4',
                                      color:
                                        ws === 'In Service' || ws === 'Completed' || ws === 'Billed'
                                          ? '#19734b'
                                          : '#6b7880',
                                    }}
                                  >
                                    In Service
                                  </span>
                                  <span style={{ color: 'var(--muted)', fontSize: 9 }}>›</span>
                                  <span
                                    style={{
                                      fontSize: 9.5,
                                      fontWeight: 700,
                                      padding: '2px 5px',
                                      borderRadius: 999,
                                      background:
                                        ws === 'Completed' || ws === 'Billed' ? '#dff5e8' : '#eef3f4',
                                      color: ws === 'Completed' || ws === 'Billed' ? '#19734b' : '#6b7880',
                                    }}
                                  >
                                    Done
                                  </span>
                                  <span style={{ color: 'var(--muted)', fontSize: 9 }}>›</span>
                                  <span
                                    style={{
                                      fontSize: 9.5,
                                      fontWeight: 700,
                                      padding: '2px 5px',
                                      borderRadius: 999,
                                      background: ws === 'Billed' ? 'var(--teal)' : '#eef3f4',
                                      color: ws === 'Billed' ? '#fff' : '#6b7880',
                                    }}
                                  >
                                    Billed
                                  </span>
                                </div>
                              )}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                {a.status === 'Pending' ? (
                                  <>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-primary"
                                      style={{
                                        fontSize: 10.5,
                                        padding: '4px 8px',
                                        fontWeight: 800,
                                        background: 'linear-gradient(135deg, #10b981, #059669)',
                                        borderColor: '#059669',
                                        color: '#ffffff',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 3,
                                      }}
                                      onClick={() => handleConfirmAppointment(a)}
                                      title="Confirm booking and send WhatsApp confirmation to customer"
                                    >
                                      <CheckCircle2 size={12} /> Confirm &amp; Notify
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-ghost"
                                      style={{
                                        fontSize: 10.5,
                                        padding: '4px 6px',
                                        color: '#ef4444',
                                        borderColor: '#fca5a5',
                                        background: '#fef2f2',
                                        fontWeight: 700,
                                      }}
                                      onClick={() => handleRejectAppointment(a)}
                                      title="Reject / Cancel this booking request"
                                    >
                                      ❌ Reject
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    {(ws === 'Booked' || ws === 'Not Attempted') && (
                                      <button
                                        className="btn btn-sm btn-ghost"
                                        style={{ color: 'var(--teal)', fontSize: 10.5, padding: '3px 6px' }}
                                        onClick={() => handleStartService(a.id)}
                                        title="Start beautician service"
                                      >
                                        <Play size={10} /> Start
                                      </button>
                                    )}
                                    {ws === 'In Service' && (
                                      <button
                                        className="btn btn-sm btn-ghost"
                                        style={{ color: 'var(--green)', fontSize: 10.5, padding: '3px 6px' }}
                                        onClick={() => handleCompleteService(a.id)}
                                        title="Complete service"
                                      >
                                        <CheckCircle2 size={10} /> Complete
                                      </button>
                                    )}
                                    {ws === 'Completed' && (
                                      <button
                                        className="btn btn-sm btn-gold"
                                        style={{ fontSize: 10.5, padding: '3px 6px' }}
                                        onClick={() => handleConvertToBill(a)}
                                        title="Convert to Bill POS"
                                      >
                                        <ReceiptText size={10} /> Bill POS
                                      </button>
                                    )}
                                    {ws === 'Billed' && (
                                      <button
                                        className="btn btn-sm btn-ghost"
                                        style={{ fontSize: 10.5, padding: '3px 6px' }}
                                        onClick={() => router.push('/admin/billing')}
                                        title="View Billing POS"
                                      >
                                        <Eye size={10} /> View Bill
                                      </button>
                                    )}

                                    <button
                                      className="btn btn-sm btn-ghost"
                                      style={{ color: 'var(--teal)', fontSize: 10.5, padding: '3px 6px', fontWeight: 600 }}
                                      onClick={() => handleOpenReceipt(a)}
                                      title="View / Print / Download PDF Invoice Receipt"
                                    >
                                      <FileText size={11} /> Bill PDF
                                    </button>
                                  </>
                                )}

                                {/* Separate Email Button (Sends Email Only) */}
                                {a.email && (
                                  <button
                                    type="button"
                                    className="btn-icon"
                                    style={{ background: '#fdf2f8', color: '#db2777' }}
                                    title="📧 Send Confirmation Email ONLY to Customer"
                                    onClick={() => handleSendEmailConfirmation(a)}
                                  >
                                    <Mail size={12} />
                                  </button>
                                )}

                                {/* Separate WhatsApp Cloud API Button (Dispatches via Meta API Only) */}
                                <button
                                  type="button"
                                  className="btn-icon"
                                  style={{ background: '#f0fdf4', color: '#16a34a' }}
                                  title="⚡ Send WhatsApp via Official Cloud API ONLY"
                                  onClick={() => handleSendWhatsAppAPI(a)}
                                >
                                  <Zap size={12} />
                                </button>

                                {/* Separate Direct WhatsApp Web / App Button (Opens Chat Only) */}
                                <button
                                  type="button"
                                  className="btn-icon wa"
                                  title="💬 Open Direct WhatsApp Chat ONLY"
                                  onClick={() => handleSendDirectWhatsApp(a)}
                                >
                                  <MessageCircle size={12} />
                                </button>

                                <a
                                  href={getAppointmentGoogleCalendarUrl(a, data?.settings?.salon, data?.settings?.address)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn-icon"
                                  title="📅 Save & Remind in Google Calendar"
                                  style={{
                                    background: '#eff6ff',
                                    color: '#2563eb',
                                    textDecoration: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <Calendar size={12} />
                                </a>

                                <button className="btn-icon edit" onClick={() => openEdit(a)} title="Edit">
                                  <Pencil size={12} />
                                </button>

                                <button className="btn-icon danger" onClick={() => setDeleteId(a.id)} title="Delete">
                                  <Trash2 size={12} />
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

      {/* Appointment Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeEditModal}
        title="Edit Appointment"
        wide
        footer={renderAppointmentFormActions(true)}
      >
        {renderAppointmentFormFields(true)}
      </Modal>

      {/* Delete Confirm */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Appointment"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setDeleteId(null)}>Cancel</button>
            <motion.button
              className="btn btn-danger"
              onClick={() => deleteId && handleDelete(deleteId)}
              whileTap={{ scale: 0.97 }}
            >
              Delete
            </motion.button>
          </>
        }
      >
        <p style={{ color: 'var(--muted)' }}>
          Are you sure you want to delete this appointment? This action cannot be undone.
        </p>
      </Modal>

      {/* Direct Appointment Invoice PDF / Thermal Print Modal */}
      <InvoiceReceiptModal
        isOpen={!!receiptModalInv}
        onClose={() => setReceiptModalInv(null)}
        invoice={receiptModalInv}
        salonData={data}
      />

      {/* Studio Holidays & Slot Full Management Modal */}
      <Modal
        isOpen={holidayModalOpen}
        onClose={() => setHolidayModalOpen(false)}
        title="📅 Studio Holidays &amp; Full Bookings Management"
        footer={
          <button className="btn btn-ghost" onClick={() => setHolidayModalOpen(false)}>
            Close
          </button>
        }
      >
        <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '0 0 16px' }}>
          Mark dates when Shree Beauty Studio is <b>Closed / on Holiday (રજા)</b> or <b>Fully Booked / Slots Full (હાઉસફુલ)</b>. When marked, customers booking online will see these dates as unavailable.
        </p>

        {/* Add Holiday / Block Date Form */}
        <form onSubmit={handleAddHoliday} style={{ background: '#f8fafc', border: '1.5px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>➕ Mark New Holiday / Block Date</span>
          </div>

          <div className="form-grid" style={{ marginBottom: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label">Date (Single Day or Start Date) *</label>
              <input
                type="date"
                className="input"
                required
                value={holidayForm.date}
                onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label">Status / Block Type *</label>
              <select
                className="input"
                value={holidayForm.type}
                onChange={(e) => setHolidayForm({ ...holidayForm, type: e.target.value as HolidayType })}
              >
                <option value="Holiday">🏖️ Studio Holiday (Salon Closed / રજા)</option>
                <option value="Full Booking">⛔ Full Booking / Slots Full (હાઉસફુલ)</option>
                <option value="Closed">🔒 Studio Closed (Weekly Off / અંગત)</option>
                <option value="Maintenance">🛠️ Maintenance / Private Session</option>
              </select>
            </div>
          </div>

          <div className="form-grid" style={{ marginBottom: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label">Reason / Occasion / Title *</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Diwali Vacation, VIP Bridal Full Day, Studio Maintenance"
                value={holidayForm.reason}
                onChange={(e) => setHolidayForm({ ...holidayForm, reason: e.target.value })}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label">End Date (Optional — for multi-day vacation)</label>
              <input
                type="date"
                className="input"
                min={holidayForm.date}
                value={holidayForm.endDate}
                onChange={(e) => setHolidayForm({ ...holidayForm, endDate: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              style={{
                background: holidayForm.type === 'Holiday' ? 'linear-gradient(135deg, #d97706, #b45309)' : holidayForm.type === 'Full Booking' ? 'linear-gradient(135deg, #e11d48, #be123c)' : 'var(--teal)',
                borderColor: 'transparent',
                fontWeight: 800,
              }}
            >
              + Save Holiday / Block Date
            </button>
          </div>
        </form>

        {/* Existing Holidays / Blocked Dates List */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--text)' }}>
              📋 Active Holidays &amp; Blocked Dates ({(holidays || []).length})
            </span>
          </div>

          {(holidays || []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 16px', background: '#f8fafc', borderRadius: 10, border: '1px dashed var(--border)', color: 'var(--muted)', fontSize: 12.5 }}>
              No holidays or full booking dates marked yet. All regular dates are open for booking.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
              {(holidays || []).map((h) => {
                const isHoli = h.type === 'Holiday';
                const isFull = h.type === 'Full Booking';
                return (
                  <div
                    key={h.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: isHoli ? '#fffbeb' : isFull ? '#fff1f2' : '#f8fafc',
                      border: `1.5px solid ${isHoli ? '#fde68a' : isFull ? '#fecdd3' : 'var(--border)'}`,
                      borderRadius: 10,
                      padding: '10px 14px',
                      gap: 10,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 18 }}>{isHoli ? '🏖️' : isFull ? '⛔' : '🔒'}</span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--text)' }}>
                            {fmtDate(h.date)} {h.endDate ? `→ ${fmtDate(h.endDate)}` : ''}
                          </span>
                          <span
                            style={{
                              fontSize: 10.5,
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: 999,
                              background: isHoli ? '#fef3c7' : isFull ? '#ffe4e6' : '#e2e8f0',
                              color: isHoli ? '#92400e' : isFull ? '#9f1239' : '#334155',
                            }}
                          >
                            {h.type}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                          {h.reason} {h.notes ? `(${h.notes})` : ''}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn-icon danger"
                      onClick={() => handleDeleteHoliday(h.id)}
                      title="Delete / Unblock this date"
                      style={{ flexShrink: 0 }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      {/* Google Calendar Bulk Sync & Export Modal */}
      <Modal
        isOpen={calendarSyncModalOpen}
        onClose={() => setCalendarSyncModalOpen(false)}
        title="📅 Google Calendar All-Appointments Sync & Export"
        footer={
          <button className="btn btn-ghost" onClick={() => setCalendarSyncModalOpen(false)}>
            Close
          </button>
        }
      >
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 16px', lineHeight: 1.5 }}>
          Show and sync <b>all salon appointments and bridal bookings</b> into your Google Calendar on your phone and computer.
        </p>

        {/* Method 1: 1-Click .ICS File Export & Import (Instant for all appointments) */}
        <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
            <span style={{ fontWeight: 800, fontSize: 14, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
              📥 Method 1: Instant 1-Click Export All to Google Calendar
            </span>
            <span style={{ fontSize: 11, fontWeight: 800, background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: 6 }}>
              Fastest &amp; Guaranteed
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#374151', marginBottom: 12, lineHeight: 1.5 }}>
            Download an all-in-one <code>.ics</code> calendar file containing all <b>{appointments.filter((a) => a.status !== 'Cancelled').length} appointments</b> and open Google Calendar Import to save them in 10 seconds!
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                downloadBulkAppointmentsICS(
                  appointments,
                  data?.bridal || [],
                  data?.settings?.salon,
                  data?.settings?.address,
                  data?.settings?.calendarDeletePastDays !== undefined ? data?.settings?.calendarDeletePastDays : 2
                );
                toast('📥 Downloaded .ICS file with appointments (cleaned older than 2 days)!');
              }}
              style={{ background: '#16a34a', borderColor: '#15803d', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Download size={14} /> 1. Download All Appointments (.ICS)
            </button>
            <a
              href="https://calendar.google.com/calendar/u/0/r/settings/export"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
              style={{
                background: '#ffffff',
                borderColor: '#86efac',
                color: '#166534',
                fontWeight: 800,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <ExternalLink size={14} /> 2. Open Google Calendar Import Page ↗
            </a>
            {data?.settings?.googleCalendarWebhookUrl && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  toast('⏳ બધા orders Google Calendar માં sync થઈ રહ્યા છે...', 'info');
                  fetch('/api/calendar/auto-sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      type: 'bulk',
                      appointments: appointments.filter((a) => a.status !== 'Cancelled'),
                      bridals: data?.bridal?.filter((b: any) => b.status !== 'Cancelled') || [],
                      settings: data?.settings,
                    }),
                  })
                    .then((res) => res.json())
                    .then((res) => {
                      if (res.success) {
                        toast(`✅ ${res.syncedCount} orders Google Calendar માં sync થઈ ગયા!`);
                      } else {
                        toast(`❌ Sync failed: ${res.error || 'Unknown error'}`, 'error');
                      }
                    })
                    .catch((err) => {
                      toast(`❌ Error: ${err?.message || 'Failed'}`, 'error');
                    });
                }}
                style={{ background: '#7c3aed', borderColor: '#6d28d9', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <RefreshCw size={14} /> ☁️ Sync ALL Old Orders to Google Calendar
              </button>
            )}
          </div>
          <div style={{ background: '#ffffff', borderRadius: 8, padding: '10px 12px', border: '1px solid #bbf7d0', marginTop: 12, fontSize: 11.5, color: '#14532d' }}>
            <b>Step-by-step Gujarati Guide (Google Calendar માં બધી અપોઇન્ટમેન્ટ્સ કેવી રીતે સેવ કરવી):</b>
            <ol style={{ margin: '4px 0 0', paddingLeft: 18, lineHeight: 1.5 }}>
              <li>પહેલા <b>&quot;1. Download All Appointments&quot;</b> બટન દબાવી ફાઇલ ડાઉનલોડ કરો.</li>
              <li>પછી <b>&quot;2. Open Google Calendar Import Page&quot;</b> ખોલીને <b>&quot;Select file from your computer&quot;</b> માં ડાઉનલોડ થયેલી ફાઇલ પસંદ કરો.</li>
              <li><b>&quot;Import&quot;</b> દબાવતાં જ તમામ અપોઇન્ટમેન્ટ્સ તમારા Google Calendar માં તાત્કાલિક દેખાશે!</li>
            </ol>
          </div>
        </div>

        {/* Method 2: Live WebCal Google Calendar Feed URL (Continuous 24/7 background sync) */}
        <div style={{ background: '#eff6ff', border: '1.5px solid #93c5fd', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
            <span style={{ fontWeight: 800, fontSize: 14, color: '#1e40af', display: 'flex', alignItems: 'center', gap: 6 }}>
              ⚡ Method 2: Live 24/7 Auto-Sync Feed URL
            </span>
            <span style={{ fontSize: 11, fontWeight: 800, background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: 6 }}>
              Zero-Maintenance
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#374151', marginBottom: 10, lineHeight: 1.5 }}>
            Subscribe to your live salon feed URL in Google Calendar. Any new appointment booked will automatically sync directly into your Google Calendar.
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input
              type="text"
              readOnly
              className="input"
              value={typeof window !== 'undefined' ? `${window.location.origin}/api/calendar/feed.ics` : '/api/calendar/feed.ics'}
              style={{ background: '#fff', fontSize: 12, fontWeight: 600, color: '#1e3a8a' }}
            />
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                const url = typeof window !== 'undefined' ? `${window.location.origin}/api/calendar/feed.ics` : '/api/calendar/feed.ics';
                navigator.clipboard.writeText(url);
                toast('🔗 Live Calendar Feed URL copied to clipboard!');
              }}
              style={{ flexShrink: 0, background: '#2563eb', borderColor: '#1d4ed8', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              <Copy size={13} /> Copy Feed URL
            </button>
          </div>
          <div style={{ background: '#ffffff', borderRadius: 8, padding: '10px 12px', border: '1px solid #bfdbfe', fontSize: 11.5, color: '#1e3a8a' }}>
            <b>How to Subscribe in Google Calendar (Google Calendar માં કાયમ માટે ઓટો-સિંક કેવી રીતે કરવું):</b>
            <ol style={{ margin: '4px 0 0', paddingLeft: 18, lineHeight: 1.5 }}>
              <li>તમારા મોબાઈલ કે કમ્પ્યુટરમાં <a href="https://calendar.google.com" target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontWeight: 700 }}>Google Calendar</a> ખોલો.</li>
              <li>ડાબી બાજુ <b>&quot;Other calendars&quot;</b> પાસે <b>+</b> નિશાન દબાવી <b>&quot;From URL&quot;</b> પસંદ કરો.</li>
              <li>ઉપરથી Copy કરેલી Feed URL પેસ્ટ કરી <b>&quot;Add calendar&quot;</b> દબાવો. હવેથી બધી નવી એપોઇન્ટમેન્ટ્સ આપમેળે સિંક થતી રહેશે!</li>
            </ol>
          </div>
        </div>

        {/* Method 3: Cloud Webhook Direct Sync */}
        <div style={{ background: '#faf5ff', border: '1.5px solid #d8b4fe', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
            <span style={{ fontWeight: 800, fontSize: 14, color: '#6b21a8' }}>
              🚀 Method 3: Instant Cloud Webhook Auto-Sync
            </span>
            <span style={{ fontSize: 11, fontWeight: 800, background: '#f3e8ff', color: '#7e22ce', padding: '2px 8px', borderRadius: 6 }}>
              {data?.settings?.googleCalendarWebhookUrl ? '✅ Webhook Configured' : '⚙️ Webhook Not Set'}
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#4b5563', marginBottom: 10 }}>
            Every time an appointment is booked or confirmed, it will automatically insert directly into your Google Calendar in real-time.
          </div>

          <div className="form-group" style={{ marginBottom: 10 }}>
            <label className="label" style={{ fontSize: 11.5, fontWeight: 700, color: '#581c87' }}>
              Google Apps Script Web App URL
            </label>
            <input
              type="url"
              className="input"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={data?.settings?.googleCalendarWebhookUrl || ''}
              onChange={(e) => {
                const val = e.target.value;
                updateData((d) => ({ ...d, settings: { ...(d.settings || {}), googleCalendarWebhookUrl: val } }));
                scheduleSave();
              }}
              style={{ background: '#fff', fontSize: 12 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                navigator.clipboard.writeText(SAMPLE_GOOGLE_APPS_SCRIPT_CODE);
                toast('📋 Google Apps Script Code copied to clipboard!');
              }}
              style={{ background: '#fff', borderColor: '#d8b4fe', color: '#7e22ce', fontSize: 11.5, fontWeight: 700 }}
            >
              <Copy size={12} /> 1. Copy Apps Script Code
            </button>
            <a
              href="https://script.google.com"
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost btn-sm"
              style={{ background: '#fff', borderColor: '#d8b4fe', color: '#7e22ce', fontSize: 11.5, fontWeight: 700, textDecoration: 'none' }}
            >
              <ExternalLink size={12} /> 2. Open script.google.com ↗
            </a>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleBulkCloudSync}
              disabled={bulkSyncing}
              style={{
                background: '#7e22ce',
                borderColor: '#6b21a8',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11.5,
              }}
            >
              <RefreshCw size={13} className={bulkSyncing ? 'spin' : ''} />
              {bulkSyncing ? 'Pushing to Google Calendar…' : '3. Push All Appointments to Webhook'}
            </button>
          </div>

          <div style={{ background: '#ffffff', borderRadius: 8, padding: '10px 12px', border: '1px solid #e9d5ff', fontSize: 11.5, color: '#581c87' }}>
            <b>Free 1-Minute Cloud Setup (૧ મિનિટમાં ફ્રી સેટઅપ):</b>
            <ol style={{ margin: '4px 0 0', paddingLeft: 18, lineHeight: 1.5 }}>
              <li><b>&quot;1. Copy Apps Script Code&quot;</b> પર ક્લિક કરો.</li>
              <li><b>&quot;2. Open script.google.com&quot;</b> ખોલી New Project બનાવી ત્યાં કોડ પેસ્ટ કરો.</li>
              <li><b>Deploy &rarr; New deployment &rarr; Web app</b> (Who has access: <b>Anyone</b>) કરી Deploy કરો.</li>
              <li>મળેલી Web App URL ઉપરના બોક્સમાં પેસ્ટ કરો. હવેથી દરેક અપોઇન્ટમેન્ટ આપમેળે તમારા Google Calendar માં સેવ થશે!</li>
            </ol>
          </div>
        </div>
      </Modal>
      </>
      )}

      {/* Smart Mobile Sticky Bottom Action Bar (< 768px, Exact POS Match) */}
      {showForm && inlineFormOpen && !modalOpen && (
        <div className="billing-mobile-bar no-print">
          <div
            style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer', minWidth: 0 }}
            onClick={() => {
              const el = document.getElementById('appt-checkout-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            title="Click to jump to Payment"
          >
            <div style={{ fontSize: 9.5, color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
              <span>{watchService.trim() ? '1 service' : 'New Appt'}</span>
              <span>•</span>
              <span style={{ color: '#05424A', fontWeight: 700 }}>
                {isSplitAdvance ? '🔀 Split' : `${getPaymentOptionIcon(watchAdvanceMode || defaultPayMode)} ${watchAdvanceMode || defaultPayMode}`}
              </span>
              <span style={{ fontSize: 9, color: '#05424A' }}>↓</span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#05424A', lineHeight: 1.15 }}>
              {money(apptBalance)}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => {
                const currentIdx = paymentModes.indexOf(watchAdvanceMode);
                const nextMode = paymentModes[(currentIdx + 1) % paymentModes.length] || paymentModes[0];
                setIsSplitAdvance(false);
                setSplitAdvanceAmounts({});
                setValue('advanceMode', nextMode);
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
                {getPaymentOptionIcon(watchAdvanceMode || defaultPayMode)} {watchAdvanceMode || defaultPayMode}
              </span>
              <span style={{ fontSize: 9.5, opacity: 0.7 }}>↺</span>
            </button>

            <button
              type="button"
              onClick={handleSubmit((formData) => onSubmit(formData, 'none'))}
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
              <CheckCircle2 size={15} />
              <span>Save</span>
            </button>
          </div>
        </div>
      )}

      {/* Contact Import Modal */}
      <ContactImportModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        customers={data?.customers || []}
        onSelectContact={(name, mob) => handleImportContact(name, mob)}
      />
    </div>
  );
}

export default function AppointmentsPage() {
  return (
    <Suspense fallback={<div>Loading appointments…</div>}>
      <AppointmentsPanel />
    </Suspense>
  );
}
