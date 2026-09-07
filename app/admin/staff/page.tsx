'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, UserCog, MessageCircle, Search, TrendingUp, Calendar, Clock, IndianRupee, Award } from 'lucide-react';
import { useSalonStore } from '@/lib/store';
import { scheduleSave } from '@/lib/sync';
import { uid, money, todayISO } from '@/lib/utils';
import { Staff, AttendanceLog } from '@/types/salon';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { openWA } from '@/lib/whatsapp';
import { staggerContainer, fadeSlideUp } from '@/variants';
import { useForm } from 'react-hook-form';
import { format, startOfMonth, endOfMonth } from 'date-fns';

import { ShieldCheck, UserCheck, KeyRound, Lock, Eye, EyeOff } from 'lucide-react';
import { DEFAULT_USERS } from '@/lib/store';
import { UserAccount, UserRole } from '@/types/salon';

type StaffTab = 'all' | 'performance' | 'attendance' | 'commission' | 'users';

export default function StaffPage() {
  const { data, updateData } = useSalonStore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<StaffTab>('all');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [attendanceStaff, setAttendanceStaff] = useState<Staff | null>(null);
  const [attendanceDate, setAttendanceDate] = useState(todayISO());
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceLog['status']>('Present');
  const [checkIn, setCheckIn] = useState('10:00');
  const [checkOut, setCheckOut] = useState('19:00');

  // User account modal state
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('Salesperson');
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  const today = new Date();
  const monthFrom = format(startOfMonth(today), 'yyyy-MM-dd');
  const monthTo = format(endOfMonth(today), 'yyyy-MM-dd');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Staff>();

  const staffList = data?.staff || [];

  // Performance: compute per-staff stats from invoices this month
  const staffPerformance = useMemo(() => {
    const invoices = (data?.invoices || []).filter((i) => i.date >= monthFrom && i.date <= monthTo);
    return staffList.map((s) => {
      let serviceRevenue = 0;
      let productRevenue = 0;
      let serviceCount = 0;
      let clientSet = new Set<string>();
      invoices.forEach((inv) => {
        (inv.lines || []).forEach((l) => {
          if (l.staff === s.name) {
            if (l.type === 'S') { serviceRevenue += Number(l.qty || 1) * Number(l.price || 0); serviceCount++; }
            else { productRevenue += Number(l.qty || 1) * Number(l.price || 0); }
            if (inv.mobile) clientSet.add(inv.mobile);
          }
        });
      });
      const svcComm = serviceRevenue * ((s.serviceCommission || 0) / 100);
      const prdComm = productRevenue * ((s.productCommission || 0) / 100);
      // attendance this month
      const attendance = (data?.attendance || []).filter((a) => a.staffId === s.id && a.date >= monthFrom && a.date <= monthTo);
      const daysPresent = attendance.filter((a) => a.status === 'Present' || a.status === 'Half Day').length;
      return {
        ...s,
        serviceRevenue,
        productRevenue,
        totalRevenue: serviceRevenue + productRevenue,
        serviceCount,
        clientCount: clientSet.size,
        commission: svcComm + prdComm,
        daysPresent,
      };
    });
  }, [staffList, data?.invoices, data?.attendance, monthFrom, monthTo]);

  // Attendance for this month
  const attendanceLogs = useMemo(() => {
    return (data?.attendance || []).filter((a) => a.date >= monthFrom && a.date <= monthTo)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [data?.attendance, monthFrom, monthTo]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return staffList.filter((s) => {
      return !q ||
        s.name.toLowerCase().includes(q) ||
        s.mobile.includes(q) ||
        s.role.toLowerCase().includes(q) ||
        (s.services && s.services.toLowerCase().includes(q));
    });
  }, [staffList, search]);

  const openNew = () => {
    setEditId(null);
    reset({ id: '', name: '', mobile: '', role: 'Senior Beautician', services: 'Hair Spa, Facial, Cleanup', serviceCommission: 0, productCommission: 0 });
    setModalOpen(true);
  };

  const openEdit = (s: Staff) => {
    setEditId(s.id);
    reset(s);
    setModalOpen(true);
  };

  const onSubmit = (form: Staff) => {
    const id = editId || uid();
    updateData((d) => {
      if (editId) {
        return { ...d, staff: d.staff.map((s) => s.id === editId ? { ...form, id: editId } : s) };
      }
      return { ...d, staff: [...d.staff, { ...form, id }] };
    });
    scheduleSave();
    toast(editId ? 'Staff details updated!' : 'Team member added!');
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    const s = data?.staff?.find((x) => x.id === id);
    const hasAppts = (data?.appointments || []).some((a) => a.staff === s?.name && new Date(a.date) >= new Date());
    if (hasAppts) {
      toast('Cannot delete — staff has upcoming scheduled appointments.', 'error');
      setDeleteId(null);
      return;
    }
    updateData((d) => ({ ...d, staff: (d.staff || []).filter((s) => s.id !== id) }));
    scheduleSave();
    toast('Staff member removed.', 'info');
    setDeleteId(null);
  };

  const openAttendance = (s: Staff) => {
    setAttendanceStaff(s);
    setAttendanceDate(todayISO());
    setAttendanceStatus('Present');
    setCheckIn('10:00');
    setCheckOut('19:00');
    setAttendanceModalOpen(true);
  };

  const handleMarkAttendance = () => {
    if (!attendanceStaff) return;
    updateData((d) => {
      const existing = (d.attendance || []).findIndex((a) => a.staffId === attendanceStaff.id && a.date === attendanceDate);
      const newLog: AttendanceLog = {
        id: existing >= 0 ? (d.attendance || [])[existing].id : uid(),
        staffId: attendanceStaff.id,
        staffName: attendanceStaff.name,
        date: attendanceDate,
        status: attendanceStatus,
        checkIn: attendanceStatus !== 'Absent' ? checkIn : undefined,
        checkOut: attendanceStatus !== 'Absent' ? checkOut : undefined,
      };
      let attendance = [...(d.attendance || [])];
      if (existing >= 0) attendance[existing] = newLog;
      else attendance.push(newLog);
      return { ...d, attendance };
    });
    scheduleSave();
    toast(`Attendance marked for ${attendanceStaff.name} — ${attendanceStatus}`);
    setAttendanceModalOpen(false);
  };

  const TABS: { id: StaffTab; label: string }[] = [
    { id: 'all', label: '👥 Team Members' },
    { id: 'performance', label: '📊 Performance' },
    { id: 'attendance', label: '📅 Attendance' },
    { id: 'commission', label: '💰 Commission' },
    { id: 'users', label: '🔑 User Accounts & Roles' },
  ];

  return (
    <div>
      <div className="toolbar" style={{ justifyContent: 'space-between' }}>
        <div className="search-wrap" style={{ flex: 1, maxWidth: 360 }}>
          <Search size={15} className="search-icon" />
          <input type="search" className="input" placeholder="Search staff name, mobile, role, skills…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {activeTab === 'users' ? (
          <motion.button className="btn btn-primary" onClick={() => setUserModalOpen(true)} whileTap={{ scale: 0.97 }}>
            <Plus size={15} /> Create User Account
          </motion.button>
        ) : (
          <motion.button className="btn btn-primary" onClick={openNew} whileTap={{ scale: 0.97 }}>
            <Plus size={15} /> Add Team Member
          </motion.button>
        )}
      </div>

      <div className="tabs">
        {TABS.map((tab) => (
          <button key={tab.id} type="button" className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB: All Members */}
      {activeTab === 'all' && (
        <div className="card">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <UserCog size={44} />
              <h3>{search ? 'No matching team members' : 'No staff added yet'}</h3>
              <p>Add your salon beauticians and artists to assign duties and track bookings.</p>
              {!search && (
                <motion.button className="btn btn-primary btn-sm" onClick={openNew} whileTap={{ scale: 0.97 }} style={{ marginTop: 8 }}>
                  <Plus size={14} /> Add First Team Member
                </motion.button>
              )}
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Staff Name</th>
                    <th>Role</th>
                    <th>Services</th>
                    <th>Commission %</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <motion.tbody variants={staggerContainer} initial="hidden" animate="visible">
                  {filtered.map((s) => (
                    <motion.tr key={s.id} variants={fadeSlideUp}>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{s.name}</div>
                        {s.mobile && <div style={{ fontSize: 11, color: 'var(--muted)' }}>📞 {s.mobile}</div>}
                      </td>
                      <td><span className="badge badge-blue">{s.role}</span></td>
                      <td style={{ color: 'var(--muted)', fontSize: 12.5 }}>{s.services || 'All Salon Services'}</td>
                      <td>
                        <div style={{ fontSize: 12 }}>
                          <span style={{ color: 'var(--teal)', fontWeight: 700 }}>Svc: {s.serviceCommission || 0}%</span>
                          <span style={{ color: 'var(--muted)', margin: '0 4px' }}>|</span>
                          <span style={{ color: '#3b6ff5', fontWeight: 700 }}>Prd: {s.productCommission || 0}%</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                          {s.mobile && (
                            <button className="btn-icon wa" title="WhatsApp" onClick={() => openWA(s.mobile, `Hello ${s.name},\nThis is from ${data?.settings?.salon || 'Shree Beauty Studio'}.`)}>
                              <MessageCircle size={14} />
                            </button>
                          )}
                          <button className="btn-icon edit" onClick={() => openEdit(s)} title="Edit"><Pencil size={13} /></button>
                          <button className="btn-icon" title="Mark Attendance" style={{ background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => openAttendance(s)}><Calendar size={13} /></button>
                          <button className="btn-icon danger" onClick={() => setDeleteId(s.id)} title="Delete"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: Performance */}
      {activeTab === 'performance' && (
        <div className="card">
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', fontSize: 12.5, color: 'var(--muted)', fontWeight: 600 }}>
            📅 This Month's Staff Performance
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Staff</th>
                  <th>Services Done</th>
                  <th>Service Revenue</th>
                  <th>Product Sales</th>
                  <th>Total Revenue</th>
                  <th>Clients</th>
                </tr>
              </thead>
              <tbody>
                {staffPerformance.sort((a, b) => b.totalRevenue - a.totalRevenue).map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 700 }}>{s.name}
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.role}</div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--teal)' }}>{s.serviceCount}</td>
                    <td style={{ color: 'var(--green)', fontWeight: 700 }}>{money(s.serviceRevenue)}</td>
                    <td style={{ color: '#3b6ff5', fontWeight: 700 }}>{money(s.productRevenue)}</td>
                    <td style={{ fontWeight: 800, fontSize: 14 }}>{money(s.totalRevenue)}</td>
                    <td style={{ textAlign: 'center' }}>{s.clientCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: Attendance */}
      {activeTab === 'attendance' && (
        <div className="card">
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', fontSize: 12.5, color: 'var(--muted)', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>📅 Attendance Log — This Month</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {staffList.map((s) => (
                <button key={s.id} className="btn btn-ghost btn-sm" onClick={() => openAttendance(s)}>
                  + Mark {s.name}
                </button>
              ))}
            </div>
          </div>
          {attendanceLogs.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 20px' }}>
              <Calendar size={40} />
              <h3>No attendance records this month</h3>
              <p>Mark attendance for your team members</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Staff</th>
                    <th>Status</th>
                    <th>Check-In</th>
                    <th>Check-Out</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceLogs.map((a) => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 600 }}>{a.date}</td>
                      <td style={{ fontWeight: 700 }}>{a.staffName}</td>
                      <td>
                        <span style={{
                          fontSize: 11.5, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                          background: a.status === 'Present' ? '#dcfce7' : a.status === 'Half Day' ? '#fef9c3' : a.status === 'Leave' ? '#e0f2fe' : '#fee2e2',
                          color: a.status === 'Present' ? '#15803d' : a.status === 'Half Day' ? '#92741a' : a.status === 'Leave' ? '#0369a1' : '#dc2626',
                        }}>
                          {a.status}
                        </span>
                      </td>
                      <td>{a.checkIn || '—'}</td>
                      <td>{a.checkOut || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: Commission */}
      {activeTab === 'commission' && (
        <div className="card">
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', fontSize: 12.5, color: 'var(--muted)', fontWeight: 600 }}>
            💰 Commission Report — This Month
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Staff</th>
                  <th>Svc Revenue</th>
                  <th>Svc Comm %</th>
                  <th>Svc Commission</th>
                  <th>Prd Revenue</th>
                  <th>Prd Comm %</th>
                  <th>Prd Commission</th>
                  <th>Total Commission</th>
                  <th>Days Present</th>
                </tr>
              </thead>
              <tbody>
                {staffPerformance.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 700 }}>{s.name}</td>
                    <td>{money(s.serviceRevenue)}</td>
                    <td style={{ textAlign: 'center' }}>{s.serviceCommission || 0}%</td>
                    <td style={{ color: 'var(--green)', fontWeight: 700 }}>{money(s.serviceRevenue * ((s.serviceCommission || 0) / 100))}</td>
                    <td>{money(s.productRevenue)}</td>
                    <td style={{ textAlign: 'center' }}>{s.productCommission || 0}%</td>
                    <td style={{ color: '#3b6ff5', fontWeight: 700 }}>{money(s.productRevenue * ((s.productCommission || 0) / 100))}</td>
                    <td style={{ fontWeight: 800, fontSize: 14, color: 'var(--teal)' }}>{money(s.commission)}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{s.daysPresent}</td>
                  </tr>
                ))}
                <tr style={{ background: 'var(--teal-subtle)', fontWeight: 800 }}>
                  <td>TOTAL</td>
                  <td>{money(staffPerformance.reduce((s, x) => s + x.serviceRevenue, 0))}</td>
                  <td></td>
                  <td style={{ color: 'var(--green)' }}>{money(staffPerformance.reduce((s, x) => s + x.serviceRevenue * ((x.serviceCommission || 0) / 100), 0))}</td>
                  <td>{money(staffPerformance.reduce((s, x) => s + x.productRevenue, 0))}</td>
                  <td></td>
                  <td style={{ color: '#3b6ff5' }}>{money(staffPerformance.reduce((s, x) => s + x.productRevenue * ((x.productCommission || 0) / 100), 0))}</td>
                  <td style={{ color: 'var(--teal)', fontSize: 15 }}>{money(staffPerformance.reduce((s, x) => s + x.commission, 0))}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: User Accounts & Roles */}
      {activeTab === 'users' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--teal)' }}>
                🔑 System User Accounts &amp; Access Roles
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                Create accounts for your staff. <b>Salespersons</b> can only access Appointments, Bridal, Purchase, Inventory, and Billing POS.
              </p>
            </div>
            <motion.button className="btn btn-primary btn-sm" onClick={() => setUserModalOpen(true)} whileTap={{ scale: 0.97 }}>
              <Plus size={14} /> Create Account
            </motion.button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User Name</th>
                  <th>Login Email</th>
                  <th>Role</th>
                  <th>Password</th>
                  <th>Permissions Matrix</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <motion.tbody variants={staggerContainer} initial="hidden" animate="visible">
                {(data?.users && data.users.length > 0 ? data.users : DEFAULT_USERS).map((user) => (
                  <motion.tr key={user.id} variants={fadeSlideUp}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{user.name}</div>
                      <div style={{ fontSize: 10.5, color: '#94a3b8' }}>ID: {user.id}</div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#0369a1' }}>{user.email}</span>
                    </td>
                    <td>
                      {user.role === 'Salesperson' ? (
                        <span className="badge" style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', fontWeight: 800 }}>
                          👤 Salesperson
                        </span>
                      ) : (
                        <span className="badge" style={{ background: '#fef08a', color: '#854d0e', border: '1px solid #fde047', fontWeight: 800 }}>
                          👑 Admin / Owner
                        </span>
                      )}
                    </td>
                    <td>
                      <code style={{ fontSize: 12, background: '#f1f5f9', padding: '3px 7px', borderRadius: 4, color: '#475569' }}>
                        {user.password || '******'}
                      </code>
                    </td>
                    <td style={{ fontSize: 11.5, color: '#64748b' }}>
                      {user.role === 'Salesperson'
                        ? '📅 Appointments, 💍 Bridal, 🛍️ Purchase, 📦 Inventory, 🧾 Billing POS'
                        : '⭐ Unrestricted Full Admin Access (All 15 Modules)'}
                    </td>
                    <td>
                      {(data?.users || DEFAULT_USERS).length > 1 && (
                        <button
                          className="btn-icon danger"
                          onClick={() => {
                            updateData((d) => ({
                              ...d,
                              users: (d.users || DEFAULT_USERS).filter((u) => u.id !== user.id),
                            }));
                            scheduleSave();
                            toast(`User account ${user.name} removed!`);
                          }}
                          title="Delete User Account"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Staff Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editId ? '✎ Edit Team Member' : '👥 Add Team Member'}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            <motion.button className="btn btn-primary" onClick={handleSubmit(onSubmit)} whileTap={{ scale: 0.97 }}>
              {editId ? 'Update Member' : 'Save Member'}
            </motion.button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-group">
            <label className="label">Full Name *</label>
            <input type="text" className={`input ${errors.name ? 'error' : ''}`} placeholder="e.g. Pooja Sharma" {...register('name', { required: 'Name is required' })} autoFocus />
            {errors.name && <span className="error-msg">{errors.name.message}</span>}
          </div>
          <div className="form-group">
            <label className="label">Mobile Number</label>
            <input type="tel" className="input" placeholder="10-digit mobile" {...register('mobile')} />
          </div>
        </div>
        <div className="form-group">
          <label className="label">Designation / Role</label>
          <input type="text" className="input" placeholder="e.g. Senior Beautician, Nail Artist" {...register('role')} />
        </div>
        <div className="form-group">
          <label className="label">Specialized Services (comma separated)</label>
          <input type="text" className="input" placeholder="e.g. Hair Spa, Keratin, Facial, HD Bridal" {...register('services')} />
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label className="label">Service Commission (%)</label>
            <input type="number" min={0} max={100} className="input" placeholder="e.g. 20" {...register('serviceCommission', { valueAsNumber: true })} />
          </div>
          <div className="form-group">
            <label className="label">Product Commission (%)</label>
            <input type="number" min={0} max={100} className="input" placeholder="e.g. 5" {...register('productCommission', { valueAsNumber: true })} />
          </div>
        </div>
        <div className="form-group">
          <label className="label">Fixed Monthly Salary (₹)</label>
          <input type="number" min={0} className="input" placeholder="e.g. 15000" {...register('salary', { valueAsNumber: true })} />
        </div>
      </Modal>

      {/* Attendance Modal */}
      <Modal isOpen={attendanceModalOpen} onClose={() => setAttendanceModalOpen(false)} title={`📅 Mark Attendance — ${attendanceStaff?.name}`}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setAttendanceModalOpen(false)}>Cancel</button>
            <motion.button className="btn btn-primary" onClick={handleMarkAttendance} whileTap={{ scale: 0.97 }}>Mark Attendance</motion.button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-group">
            <label className="label">Date</label>
            <input type="date" className="input" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label">Status</label>
            <select className="input" value={attendanceStatus} onChange={(e) => setAttendanceStatus(e.target.value as AttendanceLog['status'])}>
              <option value="Present">Present</option>
              <option value="Half Day">Half Day</option>
              <option value="Absent">Absent</option>
              <option value="Leave">Leave</option>
            </select>
          </div>
        </div>
        {attendanceStatus !== 'Absent' && (
          <div className="form-grid">
            <div className="form-group">
              <label className="label">Check-In Time</label>
              <input type="time" className="input" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Check-Out Time</label>
              <input type="time" className="input" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
            </div>
          </div>
        )}
      </Modal>

      {/* Create User Account Modal */}
      <Modal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        title="🔑 Create New User Account"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setUserModalOpen(false)}>Cancel</button>
            <motion.button
              className="btn btn-primary"
              onClick={() => {
                if (!userName.trim() || !userEmail.trim() || !userPassword.trim()) {
                  toast('Please fill in Name, Email, and Password.', 'error');
                  return;
                }
                const newUser: UserAccount = {
                  id: `usr_${uid()}`,
                  name: userName.trim(),
                  email: userEmail.trim().toLowerCase(),
                  password: userPassword.trim(),
                  role: userRole,
                  createdAt: todayISO(),
                };
                updateData((d) => ({
                  ...d,
                  users: [...(d.users || DEFAULT_USERS), newUser],
                }));
                scheduleSave();
                toast(`✅ Created ${userRole} account for ${newUser.name}!`);
                setUserName('');
                setUserEmail('');
                setUserPassword('');
                setUserModalOpen(false);
              }}
              whileTap={{ scale: 0.97 }}
            >
              Create Account
            </motion.button>
          </>
        }
      >
        <div className="form-group">
          <label className="label">Full Name *</label>
          <input
            type="text"
            className="input"
            placeholder="e.g. Priya (Sales Executive)"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="label">Email / Login ID *</label>
          <input
            type="email"
            className="input"
            placeholder="e.g. priya@shree.com"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="label">Password *</label>
          <input
            type="text"
            className="input"
            placeholder="Set account password (e.g. priya1234)"
            value={userPassword}
            onChange={(e) => setUserPassword(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="label">Account Role &amp; Access Level *</label>
          <select
            className="input"
            value={userRole}
            onChange={(e) => setUserRole(e.target.value as UserRole)}
          >
            <option value="Salesperson">👤 Salesperson (Restricted: Appointments, Bridal, Purchase, Inventory, Billing POS only)</option>
            <option value="Admin">👑 Admin / Owner (Full Access to all 15 modules)</option>
          </select>
        </div>
      </Modal>

      {/* Delete Confirm */}
      {deleteId && (
        <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Remove Team Member?"
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteId)}>Remove</button>
            </>
          }
        >
          <p>Are you sure you want to remove this staff member from your studio team?</p>
        </Modal>
      )}
    </div>
  );
}
