'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, MessageCircle, Search, Users, Wallet, Star, Gift, X, PlusCircle, Download } from 'lucide-react';
import { useSalonStore } from '@/lib/store';
import { scheduleSave } from '@/lib/sync';
import { uid, fmtDate, money, todayISO, formatCustomerContactName } from '@/lib/utils';
import { Customer, WalletTransaction } from '@/types/salon';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { sendDirectWhatsAppMessage, customerReminderMessage } from '@/lib/whatsapp';
import { staggerContainer, fadeSlideUp } from '@/variants';
import { useForm } from 'react-hook-form';
import TodayWishesBanner from '@/components/wishes/TodayWishesBanner';
import { isSameDayAndMonth } from '@/lib/auto-wish';

type CustomerTab = 'all' | 'todayWishes' | 'birthdays' | 'anniversaries' | 'vip';

export default function CustomersPage() {
  const { data, updateData } = useSalonStore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<CustomerTab>('all');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Wallet top-up modal
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [walletCustomer, setWalletCustomer] = useState<Customer | null>(null);
  const [walletTopup, setWalletTopup] = useState<number | ''>('');
  const [walletMode, setWalletMode] = useState('Cash');

  // Loyalty history modal
  const [loyaltyModalOpen, setLoyaltyModalOpen] = useState(false);
  const [loyaltyCustomer, setLoyaltyCustomer] = useState<Customer | null>(null);
  const [adjustPoints, setAdjustPoints] = useState<number | ''>('');
  const [adjustType, setAdjustType] = useState<'add' | 'deduct'>('add');

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<Customer>();
  const watchName = watch('name');

  const currentMonth = new Date().getMonth() + 1;
  const today = todayISO();

  const enriched = useMemo(() => {
    return (data?.customers || []).map((c) => {
      const custInvoices = (data?.invoices || []).filter((i) => i.mobile === c.mobile);
      const totalSpend = custInvoices.reduce((s, i) => s + Number(i.total || 0), 0);
      const lastVisit = custInvoices.sort((a, b) => b.date.localeCompare(a.date))[0]?.date || '';
      return { ...c, visits: custInvoices.length, totalSpend, lastVisit };
    });
  }, [data?.customers, data?.invoices]);

  const counts = useMemo(() => {
    const isThisMonth = (dateStr?: string) => {
      if (!dateStr) return false;
      const m = new Date(dateStr).getMonth() + 1;
      return m === currentMonth;
    };
    const bdays = enriched.filter((c) => isThisMonth(c.birthday)).length;
    const annivs = enriched.filter((c) => isThisMonth(c.anniversary) || isThisMonth(c.sagaiDate)).length;
    const vips = enriched.filter((c) => c.totalSpend >= 5000 || c.visits >= 3).length;
    const todayWishes = enriched.filter((c) => 
      isSameDayAndMonth(c.birthday, today) || 
      isSameDayAndMonth(c.sagaiDate || c.engagementDate, today) || 
      isSameDayAndMonth(c.anniversary, today)
    ).length;

    return { all: enriched.length, todayWishes, birthdays: bdays, anniversaries: annivs, vip: vips };
  }, [enriched, currentMonth, today]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return enriched.filter((c) => {
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.mobile.includes(q) ||
        (c.notes && c.notes.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      const isThisMonth = (dateStr?: string) => {
        if (!dateStr) return false;
        const m = new Date(dateStr).getMonth() + 1;
        return m === currentMonth;
      };

      if (activeTab === 'todayWishes') {
        return (
          isSameDayAndMonth(c.birthday, today) ||
          isSameDayAndMonth(c.sagaiDate || c.engagementDate, today) ||
          isSameDayAndMonth(c.anniversary, today)
        );
      }
      if (activeTab === 'birthdays') return isThisMonth(c.birthday);
      if (activeTab === 'anniversaries') return isThisMonth(c.anniversary) || isThisMonth(c.sagaiDate);
      if (activeTab === 'vip') return c.totalSpend >= 5000 || c.visits >= 3;
      return true;
    });
  }, [enriched, search, activeTab, currentMonth, today]);

  const openNew = () => {
    setEditId(null);
    reset({ id: '', name: '', mobile: '', birthday: '', anniversary: '', sagaiDate: '', notes: '' });
    setModalOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditId(c.id);
    reset(c);
    setModalOpen(true);
  };

  const handleCustomerSelect = (val: string) => {
    setValue('name', val);
    const trimmed = val.trim().toLowerCase();
    if (!trimmed) return;
    const cleanNum = val.replace(/\D/g, '');
    const found = (data?.customers || []).find(
      (c) =>
        c.name.toLowerCase() === trimmed ||
        formatCustomerContactName(c.name).toLowerCase() === trimmed ||
        (cleanNum.length >= 4 && c.mobile.includes(cleanNum)) ||
        c.mobile === val.trim()
    );
    if (found) {
      setEditId(found.id);
      setValue('name', found.name);
      setValue('mobile', found.mobile);
      setValue('birthday', found.birthday || '');
      setValue('sagaiDate', found.sagaiDate || found.engagementDate || '');
      setValue('anniversary', found.anniversary || '');
      setValue('notes', found.notes || '');
      toast(`✨ Existing Customer "${found.name}" loaded!`);
    }
  };

  const handleMobileSelect = (val: string) => {
    setValue('mobile', val);
    const trimmed = val.trim();
    const cleanNum = trimmed.replace(/\D/g, '');
    if (!trimmed) return;
    const found = (data?.customers || []).find(
      (c) =>
        (cleanNum.length >= 4 && c.mobile.includes(cleanNum)) ||
        c.mobile === cleanNum ||
        c.mobile === trimmed ||
        c.name.toLowerCase() === trimmed.toLowerCase() ||
        formatCustomerContactName(c.name).toLowerCase() === trimmed.toLowerCase()
    );
    if (found) {
      setEditId(found.id);
      setValue('name', found.name);
      setValue('mobile', found.mobile);
      setValue('birthday', found.birthday || '');
      setValue('sagaiDate', found.sagaiDate || found.engagementDate || '');
      setValue('anniversary', found.anniversary || '');
      setValue('notes', found.notes || '');
      toast(`✨ Existing Customer "${found.name}" loaded!`);
    }
  };

  const handlePickDeviceContact = async () => {
    if (typeof window !== 'undefined' && 'contacts' in navigator && 'select' in (navigator as any).contacts) {
      try {
        const contacts = await (navigator as any).contacts.select(['name', 'tel'], { multiple: false });
        if (contacts && contacts[0]) {
          const c = contacts[0];
          const name = c.name?.[0] || '';
          const tel = c.tel?.[0]?.replace(/\D/g, '').slice(-10) || '';
          if (name) handleCustomerSelect(name);
          if (tel) handleMobileSelect(tel);
          if (name) setValue('name', name);
          if (tel) setValue('mobile', tel);
          toast(`📇 Contact loaded: ${name} (${tel})`);
        }
      } catch {
        // User cancelled or permission denied
      }
    } else {
      toast('Device contacts picker works on mobile Chrome/Safari. Use name/mobile search below!', 'info');
    }
  };

  const onSubmit = (form: Customer) => {
    const id = editId || uid();
    const dup = data.customers.find(
      (c) => c.mobile === form.mobile && c.id !== editId
    );
    if (dup) {
      toast(`Mobile already registered to ${dup.name}`, 'error');
      return;
    }

    const formattedName = formatCustomerContactName(form.name);
    const updatedForm = { ...form, name: formattedName };

    updateData((d) => {
      if (editId) {
        return { ...d, customers: d.customers.map((c) => c.id === editId ? { ...updatedForm, id: editId } : c) };
      }
      return { ...d, customers: [...d.customers, { ...updatedForm, id, loyaltyPoints: 0, walletBalance: 0 }] };
    });
    scheduleSave();
    toast(editId ? `Customer updated (${formattedName})` : `Customer saved as ${formattedName}`);
    setModalOpen(false);
  };

  const exportVCFContacts = () => {
    const custs = data?.customers || [];
    if (custs.length === 0) {
      toast('No customer contacts to export.', 'error');
      return;
    }

    let vcfData = '';
    const yy = String(new Date().getFullYear()).slice(-2);

    custs.forEach((c) => {
      const formattedName = formatCustomerContactName(c.name);
      const num = c.mobile.replace(/\D/g, '').slice(-10);
      if (num) {
        vcfData += `BEGIN:VCARD\nVERSION:3.0\nFN:${formattedName}\nTEL;TYPE=CELL:+91${num}\nEND:VCARD\n`;
      }
    });

    const blob = new Blob([vcfData], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Shree_Salon_Contacts_Z${yy}.vcf`;
    link.click();
    URL.revokeObjectURL(url);

    toast(`📥 Exported ${custs.length} contacts as VCF (Z${yy} format) for Phone!`);
  };

  const handleDelete = (id: string) => {
    const c = data.customers.find((x) => x.id === id);
    const hasAppts = data.appointments.some((a) => a.mobile === c?.mobile);
    const hasInvoices = data.invoices.some((i) => i.mobile === c?.mobile);
    if (hasAppts || hasInvoices) {
      toast('Cannot delete — customer has linked appointments or invoices.', 'error');
      setDeleteId(null);
      return;
    }
    updateData((d) => ({ ...d, customers: d.customers.filter((c) => c.id !== id) }));
    scheduleSave();
    toast('Customer deleted', 'info');
    setDeleteId(null);
  };

  const openWalletModal = (c: Customer) => {
    setWalletCustomer(c);
    setWalletTopup('');
    setWalletMode('Cash');
    setWalletModalOpen(true);
  };

  const handleWalletTopup = () => {
    if (!walletCustomer || !walletTopup || Number(walletTopup) <= 0) {
      toast('Enter a valid top-up amount', 'error');
      return;
    }
    const amount = Number(walletTopup);
    updateData((d) => {
      const customers = d.customers.map((c) => {
        if (c.id === walletCustomer.id) {
          return { ...c, walletBalance: (c.walletBalance || 0) + amount };
        }
        return c;
      });
      const tx: WalletTransaction = {
        id: uid(),
        date: todayISO(),
        customerId: walletCustomer.id,
        customerName: walletCustomer.name,
        type: 'Top-Up',
        amount,
        balanceAfter: (walletCustomer.walletBalance || 0) + amount,
        mode: walletMode,
        notes: `Wallet top-up via ${walletMode}`,
      };
      return {
        ...d,
        customers,
        walletTx: [tx, ...(d.walletTx || [])],
      };
    });
    scheduleSave();
    toast(`Wallet topped up with ${money(amount)} for ${walletCustomer.name}!`);
    setWalletModalOpen(false);
  };

  const openLoyaltyModal = (c: Customer) => {
    setLoyaltyCustomer(c);
    setAdjustPoints('');
    setAdjustType('add');
    setLoyaltyModalOpen(true);
  };

  const handleAdjustPoints = () => {
    if (!loyaltyCustomer || !adjustPoints || Number(adjustPoints) <= 0) {
      toast('Enter valid points', 'error');
      return;
    }
    const pts = Number(adjustPoints);
    updateData((d) => {
      const customers = d.customers.map((c) => {
        if (c.id === loyaltyCustomer.id) {
          const current = c.loyaltyPoints || 0;
          const newPts = adjustType === 'add' ? current + pts : Math.max(0, current - pts);
          return { ...c, loyaltyPoints: newPts };
        }
        return c;
      });
      const loyaltyTx = [...(d.loyaltyTx || []), {
        id: uid(),
        date: todayISO(),
        customerId: loyaltyCustomer.id,
        customerName: loyaltyCustomer.name,
        type: adjustType === 'add' ? 'Adjusted' : 'Adjusted' as const,
        points: adjustType === 'add' ? pts : -pts,
        notes: 'Manual adjustment by staff',
      }];
      return { ...d, customers, loyaltyTx };
    });
    scheduleSave();
    toast(`Points ${adjustType === 'add' ? 'added' : 'deducted'} for ${loyaltyCustomer.name}`);
    setLoyaltyModalOpen(false);
  };

  // Customer wallet & loyalty transaction history
  const walletHistory = useMemo(() => {
    if (!walletCustomer) return [];
    return (data?.walletTx || []).filter((t) => t.customerId === walletCustomer.id)
      .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);
  }, [data?.walletTx, walletCustomer]);

  const loyaltyHistory = useMemo(() => {
    if (!loyaltyCustomer) return [];
    return (data?.loyaltyTx || []).filter((t) => t.customerId === loyaltyCustomer.id)
      .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);
  }, [data?.loyaltyTx, loyaltyCustomer]);

  return (
    <div>
      {/* Today's Customer Celebrations & Wishes Banner */}
      <TodayWishesBanner />

      <div className="toolbar" style={{ justifyContent: 'space-between' }}>
        <div className="search-wrap" style={{ flex: 1, maxWidth: 360 }}>
          <Search size={15} className="search-icon" />
          <input
            type="search" className="input"
            placeholder="Search customer name, mobile, notes…"
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={exportVCFContacts}
            title="Download all customer contacts as VCF for Phone Contacts app"
            style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Download size={14} /> Export Contacts VCF
          </button>
          <motion.button className="btn btn-primary" onClick={openNew} whileTap={{ scale: 0.97 }}>
            <Plus size={15} /> Add Customer
          </motion.button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="tabs">
        <button type="button" className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
          <span>All Clients</span><span className="tab-badge">{counts.all}</span>
        </button>
        <button type="button" className={`tab-btn ${activeTab === 'todayWishes' ? 'active' : ''}`} onClick={() => setActiveTab('todayWishes')}>
          <span>🎉 Today's Wishes</span><span className="tab-badge gold">{counts.todayWishes}</span>
        </button>
        <button type="button" className={`tab-btn ${activeTab === 'birthdays' ? 'active' : ''}`} onClick={() => setActiveTab('birthdays')}>
          <span>🎂 Birthdays This Month</span><span className="tab-badge">{counts.birthdays}</span>
        </button>
        <button type="button" className={`tab-btn ${activeTab === 'anniversaries' ? 'active' : ''}`} onClick={() => setActiveTab('anniversaries')}>
          <span>💍 Anniversaries This Month</span><span className="tab-badge">{counts.anniversaries}</span>
        </button>
        <button type="button" className={`tab-btn ${activeTab === 'vip' ? 'active' : ''}`} onClick={() => setActiveTab('vip')}>
          <span>⭐ VIP &amp; Top Clients</span><span className="tab-badge gold">{counts.vip}</span>
        </button>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <Users size={48} />
            <h3>{search ? 'No customers found' : 'No customers yet'}</h3>
            <p>Add your first customer to start tracking visits</p>
            {!search && (
              <motion.button className="btn btn-primary btn-sm" onClick={openNew} whileTap={{ scale: 0.97 }}>
                <Plus size={14} /> Add Customer
              </motion.button>
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Customer &amp; Mobile</th>
                  <th>Birthday / Anniversary</th>
                  <th>Visits &amp; Spend</th>
                  <th>Loyalty &amp; Wallet</th>
                  <th>Last Visit</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <motion.tbody variants={staggerContainer} initial="hidden" animate="visible">
                {filtered.map((c) => (
                  <motion.tr key={c.id} variants={fadeSlideUp}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13.5 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.mobile}</div>
                    </td>
                    <td>
                      {c.birthday && <div style={{ fontSize: 12 }}>🎂 {fmtDate(c.birthday)}</div>}
                      {c.sagaiDate && <div style={{ fontSize: 11, color: '#0284c7', fontWeight: 600, marginTop: 2 }}>💍 Sagai: {fmtDate(c.sagaiDate)}</div>}
                      {c.anniversary && <div style={{ fontSize: 11, color: '#b45309', fontWeight: 600, marginTop: 2 }}>👰 Wedding: {fmtDate(c.anniversary)}</div>}
                      {!c.birthday && !c.sagaiDate && !c.anniversary && <span style={{ color: 'var(--muted)' }}>—</span>}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{c.visits} visits</div>
                      <div style={{ color: 'var(--green)', fontWeight: 600, fontSize: 11.5 }}>{money(c.totalSpend)}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: '#92741a', background: '#fef9c3', borderRadius: 5, padding: '2px 7px', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          ⭐ {c.loyaltyPoints || 0} pts
                        </span>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--teal)', background: 'var(--teal-subtle)', borderRadius: 5, padding: '2px 7px', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          💳 {money(c.walletBalance || 0)}
                        </span>
                      </div>
                    </td>
                    <td style={{ fontSize: 12 }}>{c.lastVisit ? fmtDate(c.lastVisit) : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                          className="btn-icon wa"
                          title="Send WhatsApp via Meta API"
                          onClick={() => {
                            const msg = customerReminderMessage(c.name, data?.settings?.salon || 'Shree Beauty Studio', data?.settings?.address || '');
                            toast(`⏳ Sending Meta API message to ${c.name}…`);
                            sendDirectWhatsAppMessage(c.mobile, msg).then((r) => {
                              if (r.success) toast(`✅ Message sent to ${c.name} via Meta API!`);
                              else toast(`❌ ${r.message}`, 'error');
                            });
                          }}
                        >
                          <MessageCircle size={13} />
                        </button>
                        <button className="btn-icon" title="Wallet Top-up" style={{ background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => openWalletModal(c)}><Wallet size={13} /></button>
                        <button className="btn-icon" title="Loyalty Points" style={{ background: '#fef9c3', color: '#92741a', border: 'none', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => openLoyaltyModal(c)}><Star size={13} /></button>
                        <button className="btn-icon danger" onClick={() => setDeleteId(c.id)} title="Delete"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Customer Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Customer' : 'Add Customer'}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            <motion.button className="btn btn-primary" onClick={handleSubmit(onSubmit)} whileTap={{ scale: 0.97 }}>
              {editId ? 'Update' : 'Add Customer'}
            </motion.button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-group">
            <label className="label">Full Name * (Type to auto pick contact)</label>
            <input
              type="text"
              className="input"
              list="add-cust-name-list"
              placeholder="Start typing name or contact..."
              {...register('name', { required: 'Name is required' })}
              onChange={(e) => handleCustomerSelect(e.target.value)}
              autoFocus
            />
            <datalist id="add-cust-name-list">
              {(data?.customers || []).map((c) => (
                <option key={c.id} value={formatCustomerContactName(c.name)}>
                  {formatCustomerContactName(c.name)} — 📞 {c.mobile}
                </option>
              ))}
            </datalist>
            {errors.name && <span className="error-msg">{errors.name.message}</span>}
          </div>
          <div className="form-group">
            <label className="label">Mobile Number * (Type to auto pick contact)</label>
            <input
              type="tel"
              className="input"
              list="add-cust-mob-list"
              placeholder="10-digit mobile"
              {...register('mobile', { required: 'Mobile is required' })}
              onChange={(e) => handleMobileSelect(e.target.value)}
            />
            <datalist id="add-cust-mob-list">
              {(data?.customers || []).map((c) => (
                <option key={c.id} value={c.mobile}>
                  {c.mobile} — 👤 {formatCustomerContactName(c.name)}
                </option>
              ))}
            </datalist>
            {errors.mobile && <span className="error-msg">{errors.mobile.message}</span>}
          </div>
        </div>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
          <div className="form-group">
            <label className="label">🎂 Birthday</label>
            <input type="date" className="input" {...register('birthday')} />
          </div>
          <div className="form-group">
            <label className="label">💍 Sagai / Engagement</label>
            <input type="date" className="input" {...register('sagaiDate')} />
          </div>
          <div className="form-group">
            <label className="label">👰 Wedding / Anniversary</label>
            <input type="date" className="input" {...register('anniversary')} />
          </div>
        </div>
        <div className="form-group">
          <label className="label">Notes / Preferences</label>
          <textarea className="input" rows={2} placeholder="e.g. Prefers organic hair spa, sensitive skin…" {...register('notes')} />
        </div>
      </Modal>

      {/* Wallet Top-up Modal */}
      <Modal isOpen={walletModalOpen} onClose={() => setWalletModalOpen(false)} title={`💳 Wallet Top-up — ${walletCustomer?.name}`}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setWalletModalOpen(false)}>Cancel</button>
            <motion.button className="btn btn-primary" onClick={handleWalletTopup} whileTap={{ scale: 0.97 }}>Add to Wallet</motion.button>
          </>
        }
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--teal-subtle)', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
          <Wallet size={18} color="var(--teal)" />
          <span style={{ fontWeight: 700, color: 'var(--teal)' }}>Current Balance: {money(walletCustomer?.walletBalance || 0)}</span>
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label className="label">Top-up Amount (₹) *</label>
            <input type="number" min={1} className="input" placeholder="e.g. 500" value={walletTopup} onChange={(e) => setWalletTopup(Number(e.target.value) || '')} autoFocus />
          </div>
          <div className="form-group">
            <label className="label">Payment Mode</label>
            <select className="input" value={walletMode} onChange={(e) => setWalletMode(e.target.value)}>
              {(data?.settings?.payments || ['Cash', 'GPay UPI', 'Card']).map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        {walletHistory.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 8, color: 'var(--muted)' }}>Recent Wallet Transactions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
              {walletHistory.map((tx) => (
                <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '6px 10px', background: '#f8fafc', borderRadius: 6 }}>
                  <span style={{ color: 'var(--muted)' }}>{fmtDate(tx.date)} · {tx.type}</span>
                  <span style={{ fontWeight: 700, color: tx.amount > 0 ? 'var(--green)' : 'var(--red)' }}>
                    {tx.amount > 0 ? '+' : ''}{money(Math.abs(tx.amount))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* Loyalty Points Modal */}
      <Modal isOpen={loyaltyModalOpen} onClose={() => setLoyaltyModalOpen(false)} title={`⭐ Loyalty Points — ${loyaltyCustomer?.name}`}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setLoyaltyModalOpen(false)}>Cancel</button>
            <motion.button className="btn btn-primary" onClick={handleAdjustPoints} whileTap={{ scale: 0.97 }}>Apply</motion.button>
          </>
        }
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#fef9c3', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
          <Star size={18} color="#92741a" />
          <span style={{ fontWeight: 700, color: '#92741a' }}>Current Points: {loyaltyCustomer?.loyaltyPoints || 0} pts</span>
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label className="label">Adjust Type</label>
            <select className="input" value={adjustType} onChange={(e) => setAdjustType(e.target.value as 'add' | 'deduct')}>
              <option value="add">Add Points</option>
              <option value="deduct">Deduct Points</option>
            </select>
          </div>
          <div className="form-group">
            <label className="label">Points</label>
            <input type="number" min={1} className="input" placeholder="e.g. 50" value={adjustPoints} onChange={(e) => setAdjustPoints(Number(e.target.value) || '')} autoFocus />
          </div>
        </div>
        {loyaltyHistory.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 8, color: 'var(--muted)' }}>Loyalty History</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
              {loyaltyHistory.map((tx) => (
                <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '6px 10px', background: '#f8fafc', borderRadius: 6 }}>
                  <span style={{ color: 'var(--muted)' }}>{fmtDate(tx.date)} · {tx.type}</span>
                  <span style={{ fontWeight: 700, color: tx.points > 0 ? '#92741a' : 'var(--red)' }}>
                    {tx.points > 0 ? '+' : ''}{tx.points} pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Customer"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setDeleteId(null)}>Cancel</button>
            <motion.button className="btn btn-danger" onClick={() => deleteId && handleDelete(deleteId)} whileTap={{ scale: 0.97 }}>Delete</motion.button>
          </>
        }
      >
        <p style={{ color: 'var(--muted)' }}>Are you sure? This cannot be undone.</p>
      </Modal>
    </div>
  );
}
