'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, MessageCircle, Search, Calendar, Play, CheckCircle2, ReceiptText, Eye, FileText, Download, Printer } from 'lucide-react';
import { useSalonStore } from '@/lib/store';
import { scheduleSave } from '@/lib/sync';
import { uid, todayISO, fmtDate, money, formatCustomerContactName } from '@/lib/utils';
import { Appointment, AppointmentStatus, WorkStatus, Invoice } from '@/types/salon';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { openWA, appointmentStaffMessage, appointmentCustomerMessage, sendDirectWhatsAppMessage } from '@/lib/whatsapp';
import { staggerContainer, fadeSlideUp } from '@/variants';
import { useForm } from 'react-hook-form';
import InvoiceReceiptModal from '@/components/billing/InvoiceReceiptModal';

type ApptTab = 'all' | 'today' | 'upcoming' | 'inservice' | 'completed' | 'cancelled';
const STATUS_OPTIONS: AppointmentStatus[] = ['Confirmed', 'Pending', 'Cancelled', 'Completed'];

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
  const today = todayISO();

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
    const todayCount = appointments.filter((a) => a.date === today && a.status !== 'Cancelled').length;
    const upcomingCount = appointments.filter((a) => a.date >= today && a.status === 'Confirmed' && (a.workStatus === 'Booked' || !a.workStatus)).length;
    const inServiceCount = appointments.filter((a) => a.workStatus === 'In Service').length;
    const completedCount = appointments.filter((a) => a.workStatus === 'Completed' || a.workStatus === 'Billed' || a.status === 'Completed').length;
    const cancelledCount = appointments.filter((a) => a.status === 'Cancelled' || a.workStatus === 'Cancelled').length;
    return { all: appointments.length, today: todayCount, upcoming: upcomingCount, inService: inServiceCount, completed: completedCount, cancelled: cancelledCount };
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

        const ws = a.workStatus || (a.status === 'Cancelled' ? 'Cancelled' : 'Booked');

        if (activeTab === 'today') return a.date === today && a.status !== 'Cancelled';
        if (activeTab === 'upcoming') return a.date >= today && a.status === 'Confirmed' && ws === 'Booked';
        if (activeTab === 'inservice') return ws === 'In Service';
        if (activeTab === 'completed') return ws === 'Completed' || ws === 'Billed' || a.status === 'Completed';
        if (activeTab === 'cancelled') return a.status === 'Cancelled' || ws === 'Cancelled';
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || a.time.localeCompare(b.time));
  }, [appointments, search, activeTab, today]);

  const openNew = () => {
    setEditId(null);
    setIsSplitAdvance(false);
    setSplitAdvanceAmounts({});
    reset({
      id: '', date: today, time: '10:00', customer: '', mobile: '', email: '',
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
        <div style={{ display: 'flex', gap: 8 }}>
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
            <Eye size={15} /> Copy Customer Booking Link
          </button>
          <motion.button className="btn btn-primary" onClick={openNew} whileTap={{ scale: 0.97 }}>
            <Plus size={15} /> New Appointment
          </motion.button>
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
                        const ws = a.workStatus || (a.status === 'Cancelled' ? 'Cancelled' : 'Booked');
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
                                {ws === 'Booked' && (
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
          <>
            <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            <motion.button
              className="btn btn-primary"
              onClick={handleSubmit(onSubmit)}
              whileTap={{ scale: 0.97 }}
            >
              {editId ? 'Update' : 'Book Appointment'}
            </motion.button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-group">
            <label className="label">Date</label>
            <input type="date" className="input" {...register('date', { required: true })} />
          </div>
          <div className="form-group">
            <label className="label">Time</label>
            <input type="time" className="input" {...register('time', { required: true })} />
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
    </div>
  );
}
