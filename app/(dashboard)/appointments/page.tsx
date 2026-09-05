'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, MessageCircle, Search, Calendar, Play, CheckCircle2, ReceiptText, Eye } from 'lucide-react';
import { useSalonStore } from '@/lib/store';
import { scheduleSave } from '@/lib/sync';
import { uid, todayISO, fmtDate, money, formatCustomerContactName } from '@/lib/utils';
import { Appointment, AppointmentStatus, WorkStatus } from '@/types/salon';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { openWA, appointmentStaffMessage } from '@/lib/whatsapp';
import { staggerContainer, fadeSlideUp } from '@/variants';
import { useForm } from 'react-hook-form';

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
  const today = todayISO();

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<Appointment>({
    defaultValues: {
      id: '', date: today, time: '10:00', customer: '', mobile: '',
      service: '', staff: '', advance: 0, advanceMode: data?.settings?.payments?.[0] || 'Cash', status: 'Confirmed', workStatus: 'Booked', notes: '',
    },
  });

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
    reset({
      id: '', date: today, time: '10:00', customer: '', mobile: '',
      service: data?.services?.[0]?.name || '',
      staff: data?.staff?.[0]?.name || '',
      advance: 0, advanceMode: data?.settings?.payments?.[0] || 'Cash', status: 'Confirmed', workStatus: 'Booked', notes: ''
    });
    setModalOpen(true);
  };

  const openEdit = (a: Appointment) => {
    setEditId(a.id);
    reset({
      ...a,
      advanceMode: a.advanceMode || data?.settings?.payments?.[0] || 'Cash',
    });
    setModalOpen(true);
  };

  const handleCustomerSelect = (val: string) => {
    setValue('customer', val);
    const trimmed = val.trim().toLowerCase();
    if (!trimmed) return;
    const cleanNum = val.replace(/\D/g, '');
    const c = (data?.customers || []).find(
      (x) =>
        x.name.toLowerCase() === trimmed ||
        formatCustomerContactName(x.name).toLowerCase() === trimmed ||
        (cleanNum.length >= 4 && x.mobile.includes(cleanNum)) ||
        x.mobile === val.trim()
    );
    if (c) {
      setValue('customer', c.name);
      setValue('mobile', c.mobile);
    }
  };

  const handleMobileSelect = (val: string) => {
    setValue('mobile', val);
    const trimmed = val.trim();
    const cleanNum = trimmed.replace(/\D/g, '');
    if (!trimmed) return;
    const c = (data?.customers || []).find(
      (x) =>
        (cleanNum.length >= 4 && x.mobile.includes(cleanNum)) ||
        x.mobile === cleanNum ||
        x.mobile === trimmed ||
        x.name.toLowerCase() === trimmed.toLowerCase() ||
        formatCustomerContactName(x.name).toLowerCase() === trimmed.toLowerCase()
    );
    if (c) {
      setValue('customer', c.name);
      setValue('mobile', c.mobile);
    }
  };

  const onSubmit = (form: Appointment) => {
    const id = editId || uid();
    updateData((d) => {
      // Auto-add customer if new mobile
      const exists = d.customers.find((c) => c.mobile === form.mobile);
      if (!exists && form.mobile && form.customer) {
        d = {
          ...d,
          customers: [...d.customers, {
            id: uid(), name: formatCustomerContactName(form.customer), mobile: form.mobile,
            birthday: '', anniversary: '', notes: '',
          }],
        };
      }
      const initialWorkStatus: WorkStatus = form.status === 'Cancelled' ? 'Cancelled' : (form.workStatus || 'Booked');
      const updatedItem = { ...form, id, workStatus: initialWorkStatus };

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
                              <div style={{ fontWeight: 600, color: 'var(--text)' }}>{a.service}</div>
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
                                    <ReceiptText size={10} /> Bill
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
            placeholder="Start typing customer name or contact..."
            {...register('customer', { required: 'Customer is required' })}
            onChange={(e) => handleCustomerSelect(e.target.value)}
          />
          <datalist id="appt-cust-name-list">
            {(data?.customers || []).map((c) => (
              <option key={c.id} value={formatCustomerContactName(c.name)}>
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
            placeholder="10-digit mobile number"
            {...register('mobile')}
            onChange={(e) => handleMobileSelect(e.target.value)}
          />
          <datalist id="appt-cust-mob-list">
            {(data?.customers || []).map((c) => (
              <option key={c.id} value={c.mobile}>
                {c.mobile} — 👤 {formatCustomerContactName(c.name)}
              </option>
            ))}
          </datalist>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label className="label">Service</label>
            <select className="input" {...register('service', { required: true })}>
              <option value="">Select service</option>
              {(data?.services || []).map((s) => (
                <option key={s.id} value={s.name}>{s.name} — {money(s.price)}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Staff</label>
            <select className="input" {...register('staff')}>
              <option value="">Any staff</option>
              {(data?.staff || []).map((s) => (
                <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label className="label">Advance Deposit (₹)</label>
            <input type="number" className="input" min="0" placeholder="₹ 0 (Advance deposit)" {...register('advance', { valueAsNumber: true })} />
          </div>
          <div className="form-group">
            <label className="label">Payment Mode / Received In Account *</label>
            <select className="input" {...register('advanceMode')}>
              {(data?.settings?.payments || ['Cash', 'GPay UPI', 'PhonePe UPI', 'Bank Transfer', 'Card', 'HDFC Bank']).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
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
    </div>
  );
}
