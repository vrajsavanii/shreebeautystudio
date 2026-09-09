'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, MessageCircle, Search, Calendar, Play, CheckCircle2, ReceiptText, Eye, FileText, Download, Printer, CalendarOff, AlertTriangle } from 'lucide-react';
import { useSalonStore } from '@/lib/store';
import { scheduleSave } from '@/lib/sync';
import { uid, todayISO, fmtDate, money, formatCustomerContactName, isPastTimeForDate, getCurrentRoundedTimeHHMM } from '@/lib/utils';
import { Appointment, AppointmentStatus, WorkStatus, Invoice, StudioHoliday, HolidayType } from '@/types/salon';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { openWA, appointmentStaffMessage, appointmentCustomerMessage, sendDirectWhatsAppMessage } from '@/lib/whatsapp';
import { staggerContainer, fadeSlideUp } from '@/variants';
import { useForm } from 'react-hook-form';
import InvoiceReceiptModal from '@/components/billing/InvoiceReceiptModal';
import { getAppointmentGoogleCalendarUrl } from '@/lib/calendar';
import { checkDateHolidayOrBlocked } from '@/lib/holidays';

type ApptTab = 'all' | 'today' | 'upcoming' | 'inservice' | 'completed' | 'not-attempted' | 'cancelled';
const STATUS_OPTIONS: AppointmentStatus[] = ['Confirmed', 'Pending', 'Cancelled', 'Completed', 'Not Attempted'];

/**
 * Calculates the effective work status of an appointment.
 * Rule: If an appointment is booked but not started, it remains OPEN for up to 2 days after the booking date.
 * After 2 days past the booking date (day 3+), it automatically transitions to 'Not Attempted'.
 */
export function getEffectiveWorkStatus(a: Appointment, todayDate: string = todayISO()): WorkStatus {
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

export default function AppointmentsPage() {
  const router = useRouter();
  const { data, updateData } = useSalonStore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<ApptTab>('all');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [receiptModalInv, setReceiptModalInv] = useState<Invoice | null>(null);
  const [isSplitAdvance, setIsSplitAdvance] = useState(false);
  const [splitAdvanceAmounts, setSplitAdvanceAmounts] = useState<Record<string, number | ''>>({});
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
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
    setHolidayForm({
      date: todayISO(),
      endDate: '',
      type: 'Holiday',
      reason: '',
      notes: '',
    });
  };

  const handleDeleteHoliday = (id: string) => {
    updateData((d) => ({
      ...d,
      holidays: (d.holidays || []).filter((h) => h.id !== id),
    }));
    scheduleSave();
    toast('Holiday / Blocked date removed', 'info');
  };

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<Appointment>({
    defaultValues: {
      id: '', date: today, time: '10:00', customer: '', mobile: '', email: '',
      service: '', price: '' as any, staff: '', advance: 0, advanceMode: data?.settings?.payments?.[0] || 'Cash', status: 'Confirmed', workStatus: 'Booked', notes: '',
    },
  });

  const watchCustomer = watch('customer') || '';
  const watchMobile = watch('mobile') || '';
  const watchAdvanceMode = watch('advanceMode') || '';
  const watchAdvance = watch('advance') || 0;
  const paymentModes = useMemo(() => data?.settings?.payments || ['Cash', 'GPay UPI', 'PhonePe UPI', 'Bank Transfer', 'Card', 'HDFC Bank'], [data?.settings?.payments]);

  const appointments = data?.appointments || [];

  const counts = useMemo(() => {
    let todayCount = 0;
    let upcomingCount = 0;
    let inServiceCount = 0;
    let completedCount = 0;
    let notAttemptedCount = 0;
    let cancelledCount = 0;

    appointments.forEach((a) => {
      const ws = getEffectiveWorkStatus(a, today);
      if (ws === 'Cancelled') {
        cancelledCount++;
      } else if (ws === 'Not Attempted') {
        notAttemptedCount++;
      } else if (ws === 'Completed' || ws === 'Billed') {
        completedCount++;
      } else if (ws === 'In Service') {
        inServiceCount++;
      } else {
        // ws === 'Booked' (Open / Confirmed)
        if (a.date === today) todayCount++;
        upcomingCount++;
      }
    });

    return {
      all: appointments.length,
      today: todayCount,
      upcoming: upcomingCount,
      inService: inServiceCount,
      completed: completedCount,
      notAttempted: notAttemptedCount,
      cancelled: cancelledCount,
    };
  }, [appointments, today]);

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

        if (activeTab === 'today') return a.date === today && ws !== 'Cancelled' && ws !== 'Not Attempted';
        if (activeTab === 'upcoming') return ws === 'Booked';
        if (activeTab === 'inservice') return ws === 'In Service';
        if (activeTab === 'completed') return ws === 'Completed' || ws === 'Billed';
        if (activeTab === 'not-attempted') return ws === 'Not Attempted';
        if (activeTab === 'cancelled') return ws === 'Cancelled';
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || a.time.localeCompare(b.time));
  }, [appointments, search, activeTab, today]);

  const openNew = () => {
    setEditId(null);
    setIsSplitAdvance(false);
    setSplitAdvanceAmounts({});
    const nextLiveTime = getCurrentRoundedTimeHHMM(15);
    reset({
      id: '', date: today, time: nextLiveTime, customer: '', mobile: '', email: '',
      service: '',
      price: '' as any,
      staff: '',
      advance: 0, advanceMode: data?.settings?.payments?.[0] || 'Cash', status: 'Confirmed', workStatus: 'Booked', notes: ''
    });
    setModalOpen(true);
  };

  const openEdit = (a: Appointment) => {
    setEditId(a.id);
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
    const trimmed = val.trim();
    if (!trimmed) {
      setValue('customer', '', { shouldValidate: true });
      return;
    }

    // 1. Check if chosen from datalist format "Name (Mobile)" or "Name — Mobile"
    const match = trimmed.match(/^(.*?)\s*[\(—\-]\s*(\d{10})\)?$/);
    if (match) {
      const extractedName = match[1].trim();
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
      setValue('customer', foundByCombined.name, { shouldValidate: true });
      setValue('mobile', foundByCombined.mobile, { shouldValidate: true });
      if (foundByCombined.email) {
        setValue('email', foundByCombined.email, { shouldValidate: true });
      }
      return;
    }

    // 3. User is simply typing a name -> update name only, NEVER overwrite mobile number!
    setValue('customer', val, { shouldValidate: true });
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
      const extractedName = match[2].trim();
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
          setValue('customer', c.name, { shouldValidate: true });
        }
        if (c.email && !watch('email')) {
          setValue('email', c.email, { shouldValidate: true });
        }
      }
    }
  };

  const handleServiceSelect = (val: string) => {
    setValue('service', val);
    const found = (data?.services || []).find((s) => s.name.toLowerCase() === val.trim().toLowerCase());
    if (found) {
      setValue('price', found.price);
    }
  };

  const onSubmit = (form: Appointment) => {
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
            name: formatCustomerContactName(form.customer),
            mobile: form.mobile,
            email: cleanEmail,
            birthday: '',
            anniversary: '',
            notes: '',
          }],
        };
      }

      const initialWorkStatus: WorkStatus = form.status === 'Cancelled' ? 'Cancelled' : (form.workStatus || 'Booked');
      const updatedItem = { ...form, id, email: cleanEmail, workStatus: initialWorkStatus };

      if (editId) {
        return {
          ...d,
          appointments: d.appointments.map((a) => a.id === editId ? { ...updatedItem, id: editId } : a)
        };
      }
      return { ...d, appointments: [...d.appointments, updatedItem] };
    });
    scheduleSave();
    toast(editId ? 'Appointment updated!' : 'Appointment booked!');

    // Auto-send WhatsApp confirmation to customer
    if (form.mobile && form.status !== 'Cancelled') {
      const salon = data?.settings?.salon || 'Shree Beauty Studio';
      const address = data?.settings?.address || 'Surat, Gujarat';
      const msg = appointmentCustomerMessage({ ...form, id }, salon, address);
      sendDirectWhatsAppMessage(form.mobile, msg).then((res) => {
        if (res.success) {
          toast('✅ WhatsApp confirmation sent to customer!');
        }
      });
    }

    // Auto-send Email confirmation to customer via Resend if email is provided
    if (cleanEmail && cleanEmail.includes('@') && form.status !== 'Cancelled') {
      fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'confirmation',
          to: cleanEmail,
          data: {
            customerName: form.customer,
            service: form.service,
            staff: form.staff,
            date: form.date,
            time: form.time,
            price: form.price,
            address: data?.settings?.address,
            salonName: data?.settings?.salon,
          },
        }),
      })
        .then((res) => res.json())
        .then((res) => {
          if (res.success) {
            toast('📧 Email confirmation sent to customer via Resend!');
          }
        })
        .catch(() => {});
    }

    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    updateData((d) => ({ ...d, appointments: d.appointments.filter((a) => a.id !== id) }));
    scheduleSave();
    toast('Appointment deleted', 'info');
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
    router.push(`/billing?convertApptId=${appt.id}`);
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

  return (
    <div>
      {/* Toolbar */}
      <div className="toolbar" style={{ justifyContent: 'space-between' }}>
        <div className="search-wrap" style={{ flex: 1, maxWidth: 360 }}>
          <Search size={15} className="search-icon" />
          <input
            type="search"
            className="input"
            placeholder="Search customer, mobile, service, staff…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setHolidayModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              borderColor: '#f59e0b',
              color: '#b45309',
              background: '#fffbeb',
              fontWeight: 700,
            }}
            title="Manage Studio Holidays, Closed days, or Fully Booked dates"
          >
            <CalendarOff size={15} /> Holidays &amp; Slot Full ({holidays.length})
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              const link = typeof window !== 'undefined' ? `${window.location.origin}/book` : '/book';
              navigator.clipboard.writeText(link);
              toast('🔗 Public Online Self-Booking Link copied to clipboard!');
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, borderColor: 'var(--teal)', color: 'var(--teal)', fontWeight: 700 }}
          >
            <Eye size={15} /> Copy Booking Link
          </button>
          <motion.button className="btn btn-primary" onClick={openNew} whileTap={{ scale: 0.97 }}>
            <Plus size={15} /> New Appointment
          </motion.button>
        </div>
      </div>

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
              marginBottom: 16,
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
            <h3>{search ? 'No results found' : 'No appointments yet'}</h3>
            <p>Book your first appointment to get started</p>
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
                              {ws === 'Cancelled' ? (
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
                                    onClick={() => router.push('/billing')}
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

                                <button className="btn-icon edit" onClick={() => openEdit(a)} title="Edit">
                                  <Pencil size={12} />
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
                                <button
                                  className="btn-icon wa"
                                  title="WhatsApp staff"
                                  onClick={() => openWA(a.mobile, appointmentStaffMessage(a, data.settings.salon))}
                                >
                                  <MessageCircle size={12} />
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

      {/* Appointment Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? 'Edit Appointment' : 'New Appointment'}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            {watch('date') ? (
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
                className="btn btn-ghost btn-sm"
                style={{
                  color: '#2563eb',
                  borderColor: '#bfdbfe',
                  background: '#eff6ff',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 11.5,
                }}
                title="Open Google Calendar to save event with automatic reminders"
              >
                <Calendar size={13} /> 📅 Google Calendar Event
              </a>
            ) : <div />}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
              <motion.button
                className="btn btn-primary"
                onClick={handleSubmit(onSubmit)}
                whileTap={{ scale: 0.97 }}
              >
                {editId ? 'Update' : 'Book Appointment'}
              </motion.button>
            </div>
          </div>
        }
      >
        <div className="form-grid">
          <div className="form-group">
            <label className="label">Date</label>
            <input
              type="date"
              className="input"
              min={editId ? undefined : today}
              {...register('date', { required: true })}
            />
            {(() => {
              const check = checkDateHolidayOrBlocked(watch('date'), holidays);
              if (!check.isBlocked) return null;
              return (
                <div
                  style={{
                    background: check.holiday?.type === 'Holiday' ? '#fef3c7' : '#fee2e2',
                    border: `1px solid ${check.holiday?.type === 'Holiday' ? '#fde68a' : '#fecaca'}`,
                    color: check.holiday?.type === 'Holiday' ? '#92400e' : '#991b1b',
                    borderRadius: 8,
                    padding: '6px 10px',
                    fontSize: 11.5,
                    fontWeight: 700,
                    marginTop: 6,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <AlertTriangle size={14} />
                  <span>{check.badgeText} (Admin Override Allowed)</span>
                </div>
              );
            })()}
          </div>
          <div className="form-group">
            <label className="label">Time</label>
            <input type="time" className="input" {...register('time', { required: true })} />
            {(() => {
              const selectedDate = watch('date');
              const selectedTime = watch('time');
              if (!editId && selectedDate === today && isPastTimeForDate(selectedDate, selectedTime)) {
                return (
                  <div
                    style={{
                      background: '#fff1f2',
                      border: '1px solid #fecdd3',
                      color: '#be123c',
                      borderRadius: 8,
                      padding: '6px 10px',
                      fontSize: 11.5,
                      fontWeight: 700,
                      marginTop: 6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <AlertTriangle size={14} />
                    <span>⚠️ Past time! Please select live/future time.</span>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>

        <div className="form-group">
          <label className="label">Customer (Type to auto pick contact)</label>
          <input
            type="text"
            className="input"
            list="appt-cust-name-list"
            autoComplete="off"
            placeholder="Start typing customer name or contact..."
            value={watchCustomer}
            onChange={(e) => handleCustomerSelect(e.target.value)}
          />
          <datalist id="appt-cust-name-list">
            {(data?.customers || []).map((c) => (
              <option key={c.id} value={`${formatCustomerContactName(c.name)} (${c.mobile})`}>
                {formatCustomerContactName(c.name)} — 📞 {c.mobile}
              </option>
            ))}
          </datalist>
          {errors.customer && <span className="error-msg">{errors.customer.message}</span>}
        </div>

        <div className="form-group">
          <label className="label">Mobile Number (Type to auto pick contact)</label>
          <input
            type="tel"
            className="input"
            list="appt-cust-mob-list"
            autoComplete="off"
            placeholder="10-digit mobile number"
            value={watchMobile}
            onChange={(e) => handleMobileSelect(e.target.value)}
          />
          <datalist id="appt-cust-mob-list">
            {(data?.customers || []).map((c) => (
              <option key={c.id} value={`${c.mobile} (${formatCustomerContactName(c.name)})`}>
                {c.mobile} — 👤 {formatCustomerContactName(c.name)}
              </option>
            ))}
          </datalist>
        </div>

        <div className="form-group">
          <label className="label">Customer Email (Optional — for Resend confirmation &amp; invoice)</label>
          <input
            type="email"
            className="input"
            placeholder="e.g. customer@gmail.com"
            {...register('email')}
          />
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label className="label">Service Name (Type custom or pick from menu)</label>
            <input
              type="text"
              className="input"
              list="appt-service-list"
              placeholder="e.g. Layer Cut, O3+ Facial, Custom Treatment"
              {...register('service', { required: 'Service is required' })}
              onChange={(e) => handleServiceSelect(e.target.value)}
            />
            <datalist id="appt-service-list">
              {(data?.services || []).map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name} — {money(s.price)}
                </option>
              ))}
            </datalist>
            {errors.service && <span className="error-msg">{errors.service.message}</span>}
          </div>
          <div className="form-group">
            <label className="label">Service Price / Rate (₹)</label>
            <input
              type="number"
              className="input"
              min="0"
              placeholder="₹ 0 (Custom or catalog rate)"
              {...register('price', { valueAsNumber: true })}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="label">Beautician / Staff</label>
          <select className="input" {...register('staff')}>
            <option value="">Any staff</option>
            {(data?.staff || []).map((s) => (
              <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
            ))}
          </select>
        </div>

        {/* Payment & Advance Deposit Entry Section (No restrictive dropdown) */}
        <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <label className="label" style={{ fontWeight: 800, color: 'var(--teal)', margin: 0 }}>
              💳 Payment &amp; Advance Deposit Entry
            </label>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                const nextSplit = !isSplitAdvance;
                setIsSplitAdvance(nextSplit);
                if (!nextSplit) {
                  setSplitAdvanceAmounts({});
                }
              }}
              style={{ fontSize: 11, padding: '3px 8px', color: 'var(--teal)', fontWeight: 700 }}
            >
              {isSplitAdvance ? '← Single Payment Mode' : '⇄ Split / Multi-Payment Entry'}
            </button>
          </div>

          {!isSplitAdvance ? (
            <div>
              <div className="form-grid" style={{ marginBottom: 10 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="label">Advance Deposit (₹)</label>
                  <input
                    type="number"
                    className="input"
                    min="0"
                    placeholder="₹ 0 (Advance deposit)"
                    {...register('advance', { valueAsNumber: true })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="label">Payment Account / Received In *</label>
                  <input
                    type="text"
                    className="input"
                    list="appt-payment-modes"
                    placeholder="Type or pick payment account…"
                    {...register('advanceMode')}
                  />
                  <datalist id="appt-payment-modes">
                    {paymentModes.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Quick Pick Payment Mode Pills */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 5 }}>
                  ⚡ All Available Payment Accounts (Click to Pick):
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {paymentModes.map((p) => {
                    const isSelected = watchAdvanceMode === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setValue('advanceMode', p)}
                        style={{
                          padding: '5px 11px',
                          borderRadius: 8,
                          border: isSelected ? '1.5px solid var(--teal)' : '1px solid var(--border)',
                          background: isSelected ? 'var(--teal)' : '#ffffff',
                          color: isSelected ? '#ffffff' : 'var(--text)',
                          fontWeight: isSelected ? 800 : 500,
                          fontSize: 11.5,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        {p === 'Cash' && '💵'}
                        {p.includes('GPay') && '📱'}
                        {p.includes('PhonePe') && '🟣'}
                        {p.includes('Card') && '💳'}
                        {(p.includes('Bank') || p.includes('HDFC')) && '🏦'}
                        <span>{p}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Split Payment Breakdown Grid */
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>
                Enter split amounts per account (e.g. Cash: ₹500, PhonePe: ₹1000):
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginBottom: 10 }}>
                {paymentModes.map((p) => (
                  <div key={p}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: 2 }}>
                      {p} (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      className="input"
                      placeholder="₹ 0"
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
                      style={{ padding: '5px 8px', fontSize: 12 }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>Total Advance Deposit:</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--teal)' }}>
                  ₹{Number(watchAdvance || 0).toLocaleString('en-IN')} ({watchAdvanceMode || 'None'})
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="label">Appointment Status</label>
          <select className="input" {...register('status')}>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="label">Notes</label>
          <textarea className="input" rows={2} placeholder="e.g. Requested ammonia-free hair color, patch test verified…" {...register('notes')} />
        </div>
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
    </div>
  );
}
