'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save, Plus, Pencil, Trash2, Cloud, LogOut, RefreshCw, Copy, Play, Loader2,
  Store, Scissors, Bell, CreditCard, MessageCircle, CloudCog
} from 'lucide-react';
import { useSalonStore } from '@/lib/store';
import { scheduleSave, cloudSync } from '@/lib/sync';
import { uid, money } from '@/lib/utils';
import { Service } from '@/types/salon';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';
import { fadeSlideUp, staggerContainer } from '@/variants';

type SettingsTab = 'profile' | 'services' | 'reminders' | 'billing' | 'whatsapp' | 'cloud';

export default function SettingsPage() {
  const { data, updateData, cloudStatus, lastSynced } = useSalonStore();
  const { toast } = useToast();
  const s = data?.settings || {
    salon: 'Shree Beauty Studio',
    whatsapp: '919824183769',
    open: '10:00',
    close: '19:00',
    address: '',
    custR1: 24,
    custR2: 4,
    staffR: 1,
    printer: 'both',
    payments: ['Cash', 'GPay UPI'],
  };

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  // Service Modal
  const [svcModalOpen, setSvcModalOpen] = useState(false);
  const [editSvcId, setEditSvcId] = useState<string | null>(null);
  const [svcForm, setSvcForm] = useState<Service>({ id: '', name: '', price: 0, duration: 30 });
  const [syncing, setSyncing] = useState(false);

  // Simulation state
  const [simModalOpen, setSimModalOpen] = useState(false);
  const [simName, setSimName] = useState('Priyanka Sharma');
  const [simMobile, setSimMobile] = useState('9825123456');
  const [simMessage, setSimMessage] = useState('Hi, please book Facial and Haircut tomorrow at 4pm');
  const [simLoading, setSimLoading] = useState(false);

  const handleSimulateBooking = async () => {
    setSimLoading(true);
    try {
      const res = await fetch('/api/whatsapp/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: simName,
          mobile: simMobile,
          messageText: simMessage,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast(`✅ Simulated WhatsApp booking created! Check Dashboard & Appointments.`, 'success');
        setSimModalOpen(false);
      } else {
        toast(json.error || 'Simulation failed', 'error');
      }
    } catch (err: any) {
      toast(err.message || 'Simulation error', 'error');
    } finally {
      setSimLoading(false);
    }
  };

  const update = (key: string, val: unknown) => {
    updateData((d) => ({ ...d, settings: { ...d.settings, [key]: val } }));
  };

  const handleSave = () => {
    scheduleSave();
    toast('Settings saved successfully!');
  };

  const openSvc = (svc?: Service) => {
    if (svc) { setEditSvcId(svc.id); setSvcForm(svc); }
    else { setEditSvcId(null); setSvcForm({ id: '', name: '', price: 0, duration: 30 }); }
    setSvcModalOpen(true);
  };

  const saveSvc = () => {
    if (!svcForm.name) { toast('Service name is required', 'error'); return; }
    const id = editSvcId || uid();
    updateData((d) => {
      const list = [...(d.services || [])];
      if (editSvcId) {
        return { ...d, services: list.map((s) => s.id === editSvcId ? { ...svcForm, id: editSvcId } : s) };
      }
      return { ...d, services: [...list, { ...svcForm, id }] };
    });
    scheduleSave();
    toast(editSvcId ? 'Service updated' : 'Service added');
    setSvcModalOpen(false);
  };

  const deleteSvc = (id: string) => {
    updateData((d) => ({ ...d, services: (d.services || []).filter((s) => s.id !== id) }));
    scheduleSave();
    toast('Service deleted', 'info');
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    await cloudSync();
    setSyncing(false);
    toast('Synced with Supabase Cloud!');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast('Signed out from cloud', 'info');
  };

  const tabs: { id: SettingsTab; label: string; icon: any }[] = [
    { id: 'profile', label: 'Salon Profile', icon: Store },
    { id: 'services', label: 'Services & Pricing', icon: Scissors },
    { id: 'reminders', label: 'Reminder Timing', icon: Bell },
    { id: 'billing', label: 'Billing & Accounts', icon: CreditCard },
    { id: 'whatsapp', label: 'WhatsApp Webhook', icon: MessageCircle },
    { id: 'cloud', label: 'Cloud Database', icon: CloudCog },
  ];

  return (
    <div style={{ maxWidth: 960 }}>
      {/* Header Toolbar */}
      <div className="toolbar" style={{ justifyContent: 'flex-end', marginBottom: 12 }}>
        <motion.button className="btn btn-primary" onClick={handleSave} whileTap={{ scale: 0.97 }}>
          <Save size={15} /> Save All Settings
        </motion.button>
      </div>

      {/* Sub Tabs */}
      <div className="tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <AnimatePresence mode="wait">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <motion.div key="profile" variants={fadeSlideUp} initial="hidden" animate="visible" exit="exit" className="card" style={{ padding: 24 }}>
            <div className="card-head" style={{ padding: '0 0 16px', marginBottom: 18 }}>
              <h2>🏪 Salon Profile & Contact</h2>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="label">Salon / Studio Name</label>
                <input
                  type="text" className="input" value={s.salon}
                  onChange={(e) => update('salon', e.target.value)}
                  placeholder="e.g. Shree Beauty Studio"
                />
              </div>
              <div className="form-group">
                <label className="label">WhatsApp Number (with country code)</label>
                <input
                  type="tel" className="input" value={s.whatsapp}
                  onChange={(e) => update('whatsapp', e.target.value)}
                  placeholder="919824183769"
                />
              </div>
              <div className="form-group">
                <label className="label">Opening Time</label>
                <input type="time" className="input" value={s.open} onChange={(e) => update('open', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="label">Closing Time</label>
                <input type="time" className="input" value={s.close} onChange={(e) => update('close', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="label">Salon Address (Prints on Invoices)</label>
              <textarea
                className="input" rows={3} value={s.address}
                onChange={(e) => update('address', e.target.value)}
                placeholder="Full studio address..."
              />
            </div>
          </motion.div>
        )}

        {/* Services & Pricing Tab */}
        {activeTab === 'services' && (
          <motion.div key="services" variants={fadeSlideUp} initial="hidden" animate="visible" exit="exit" className="card" style={{ padding: 24 }}>
            <div className="card-head" style={{ padding: '0 0 16px', marginBottom: 18 }}>
              <div>
                <h2>💄 Services & Menu Pricing</h2>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{(data?.services || []).length} services available</span>
              </div>
              <motion.button className="btn btn-primary btn-sm" onClick={() => openSvc()} whileTap={{ scale: 0.97 }}>
                <Plus size={13} /> Add Service
              </motion.button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Service Name</th>
                    <th>Price</th>
                    <th>Duration</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <motion.tbody variants={staggerContainer} initial="hidden" animate="visible">
                  {(data?.services || []).map((svc) => (
                    <motion.tr key={svc.id} variants={fadeSlideUp}>
                      <td style={{ fontWeight: 700 }}>{svc.name}</td>
                      <td style={{ fontWeight: 600, color: 'var(--teal)' }}>{money(svc.price)}</td>
                      <td>{svc.duration} minutes</td>
                      <td>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button className="btn-icon edit" onClick={() => openSvc(svc)} title="Edit"><Pencil size={13} /></button>
                          <button className="btn-icon danger" onClick={() => deleteSvc(svc.id)} title="Delete"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Reminders Tab */}
        {activeTab === 'reminders' && (
          <motion.div key="reminders" variants={fadeSlideUp} initial="hidden" animate="visible" exit="exit" className="card" style={{ padding: 24 }}>
            <div className="card-head" style={{ padding: '0 0 16px', marginBottom: 18 }}>
              <h2>🔔 Reminder Timings & Automation</h2>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="label">Customer Reminder 1 (hours before)</label>
                <input
                  type="number" min="1" className="input" value={s.custR1}
                  onChange={(e) => update('custR1', Number(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label className="label">Customer Reminder 2 (hours before)</label>
                <input
                  type="number" min="1" className="input" value={s.custR2}
                  onChange={(e) => update('custR2', Number(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label className="label">Staff Assigned Reminder (hours before)</label>
                <input
                  type="number" min="1" className="input" value={s.staffR}
                  onChange={(e) => update('staffR', Number(e.target.value))}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Billing & Payments Tab */}
        {activeTab === 'billing' && (
          <motion.div key="billing" variants={fadeSlideUp} initial="hidden" animate="visible" exit="exit" className="card" style={{ padding: 24 }}>
            <div className="card-head" style={{ padding: '0 0 16px', marginBottom: 18 }}>
              <h2>💳 Invoice Printing & Payment Accounts</h2>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="label">Receipt Printer Format</label>
                <select
                  className="input"
                  value={s.printer}
                  onChange={(e) => update('printer', e.target.value as 'both' | '80' | 'a4')}
                >
                  <option value="both">Both (A4 Full Sheet + 80mm Thermal)</option>
                  <option value="a4">A4 Full Page Only</option>
                  <option value="80">80mm Thermal Receipt Only</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="label">Payment Modes / Accounts (Comma Separated)</label>
              <input
                type="text" className="input"
                value={(s.payments || []).join(', ')}
                onChange={(e) => update('payments', e.target.value.split(',').map((x) => x.trim()).filter(Boolean))}
                placeholder="Cash, GPay UPI, PhonePe UPI, HDFC Bank, Card"
              />
              <span style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>
                These appear in all dropdowns for billing, bridal advances, and vendor purchases.
              </span>
            </div>
          </motion.div>
        )}

        {/* WhatsApp Webhook & Web Settings Tab */}
        {activeTab === 'whatsapp' && (
          <motion.div key="whatsapp" variants={fadeSlideUp} initial="hidden" animate="visible" exit="exit" className="card" style={{ padding: 24 }}>
            <div className="card-head" style={{ padding: '0 0 16px', marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>📱 WhatsApp Web, Client Messaging & Webhook</h2>
              <Link href="/whatsapp" className="btn btn-primary btn-sm" style={{ textDecoration: 'none', background: '#25D366', color: '#053320', border: 'none', fontWeight: 800 }}>
                Open WhatsApp Hub 🚀
              </Link>
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
              Configure your WhatsApp Web preferences, Google review link, and Meta Cloud API webhook.
            </p>

            <div style={{ display: 'grid', gap: 14, marginBottom: 18 }}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="label">Default WhatsApp Dispatch Engine</label>
                  <div style={{ padding: '9px 12px', background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 8, fontSize: 13, fontWeight: 800, color: '#166534' }}>
                    🟢 Meta WhatsApp Cloud API — Direct Background Dispatch (No Popups / No WA Web)
                  </div>
                </div>
                <div className="form-group">
                  <label className="label">Google Review / Feedback URL</label>
                  <input
                    type="url"
                    className="input"
                    placeholder="https://g.page/r/your-salon/review"
                    value={s.googleReviewLink || ''}
                    onChange={(e) => update('googleReviewLink', e.target.value)}
                  />
                </div>
              </div>

              {/* Meta WhatsApp Cloud API Section for Auto PDF Send */}
              <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 10, padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#166534' }}>
                    ⚡ Meta WhatsApp Cloud API (Automatic PDF Dispatch)
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={s.autoSendPdfWhatsApp !== false}
                      onChange={(e) => update('autoSendPdfWhatsApp', e.target.checked)}
                    />
                    Auto-Send PDF on Bill Save
                  </label>
                </div>
                <p style={{ fontSize: 12, color: '#15803d', margin: '0 0 14px' }}>
                  Enter your Meta WhatsApp Cloud API credentials to automatically send official PDF bills directly to customers on WhatsApp with zero clicks.
                </p>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="label">WhatsApp Phone Number ID (from Meta Dashboard)</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. 104829384950291"
                      value={s.whatsappPhoneId || ''}
                      onChange={(e) => update('whatsappPhoneId', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Meta Cloud API Permanent Access Token</label>
                    <input
                      type="password"
                      className="input"
                      placeholder="EAAG..."
                      value={s.whatsappAccessToken || ''}
                      onChange={(e) => update('whatsappAccessToken', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Automated Customer Milestone Wishes (Birthday, Sagai, Wedding) */}
              <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 10, padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#92400e', display: 'flex', alignItems: 'center', gap: 6 }}>
                    🎉 Automated Customer Milestone Wishes (Auto-Wish on Exact Date)
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', color: '#92400e' }}>
                    <input
                      type="checkbox"
                      checked={s.autoWishMilestones !== false}
                      onChange={(e) => update('autoWishMilestones', e.target.checked)}
                    />
                    Enable Auto-Wishing System
                  </label>
                </div>
                <p style={{ fontSize: 12, color: '#b45309', margin: '0 0 14px' }}>
                  Automatically wish your customers on their 🎂 <b>Birthday</b>, 💍 <b>Sagai / Engagement Anniversary</b>, and 👰 <b>Wedding Anniversary</b> via WhatsApp.
                </p>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="label">🎂 Birthday Treat / Discount Offer (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className="input"
                      value={s.birthdayWishDiscount !== undefined ? s.birthdayWishDiscount : 15}
                      onChange={(e) => update('birthdayWishDiscount', Number(e.target.value))}
                      placeholder="e.g. 15 for 15% OFF"
                    />
                  </div>
                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', paddingBottom: 8 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#92400e' }}>
                        <input
                          type="checkbox"
                          checked={s.autoWishBirthdays !== false}
                          onChange={(e) => update('autoWishBirthdays', e.target.checked)}
                        />
                        🎂 Wish Birthdays
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#0369a1' }}>
                        <input
                          type="checkbox"
                          checked={s.autoWishSagai !== false}
                          onChange={(e) => update('autoWishSagai', e.target.checked)}
                        />
                        💍 Wish Sagai
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#9d174d' }}>
                        <input
                          type="checkbox"
                          checked={s.autoWishAnniversaries !== false}
                          onChange={(e) => update('autoWishAnniversaries', e.target.checked)}
                        />
                        👰 Wish Wedding Anniv.
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="label">Webhook Callback URL (for Meta App Dashboard)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    className="input"
                    readOnly
                    value={typeof window !== 'undefined' ? `${window.location.origin}/api/whatsapp/webhook` : '/api/whatsapp/webhook'}
                    style={{ fontFamily: 'monospace', fontSize: 12.5 }}
                  />
                  <button
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

            <div style={{ background: '#f0fbf6', border: '1px solid #cceee0', borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#166542', marginBottom: 2 }}>
                    🧪 Test Real-Time WhatsApp Booking
                  </div>
                  <div style={{ fontSize: 12, color: '#2b7853' }}>
                    Simulate a customer sending an appointment request to see it update the dashboard in real-time.
                  </div>
                </div>
                <motion.button
                  className="btn btn-primary btn-sm"
                  onClick={() => setSimModalOpen(true)}
                  whileTap={{ scale: 0.97 }}
                  style={{ background: '#1a7b4e', borderColor: '#1a7b4e' }}
                >
                  <Play size={13} /> Simulate Booking
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Cloud Database Tab */}
        {activeTab === 'cloud' && (
          <motion.div key="cloud" variants={fadeSlideUp} initial="hidden" animate="visible" exit="exit" className="card" style={{ padding: 24 }}>
            <div className="card-head" style={{ padding: '0 0 16px', marginBottom: 18 }}>
              <h2>☁ Supabase Cloud Database & Auth</h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  Status:{' '}
                  <span style={{ color: cloudStatus === 'saved' ? 'var(--green)' : cloudStatus === 'error' ? 'var(--red)' : 'var(--muted)' }}>
                    {cloudStatus === 'saved' ? '✓ Connected & Synced' :
                     cloudStatus === 'syncing' ? '⟳ Syncing…' :
                     cloudStatus === 'error' ? '✕ Sync Error' : 'Not connected'}
                  </span>
                </div>
                {lastSynced && (
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Last synced: {new Date(lastSynced).toLocaleString('en-IN')}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <motion.button
                  className="btn btn-ghost btn-sm"
                  onClick={handleSyncNow}
                  disabled={syncing}
                  whileTap={{ scale: 0.97 }}
                >
                  <RefreshCw size={13} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
                  Sync Now
                </motion.button>
                <motion.button className="btn btn-danger btn-sm" onClick={handleSignOut} whileTap={{ scale: 0.97 }}>
                  <LogOut size={13} /> Sign Out
                </motion.button>
              </div>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 8, fontWeight: 700 }}>
                Active Supabase Connection
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: 12, background: '#0f172a', color: '#a8d8e8', padding: '12px 16px', borderRadius: 8, lineHeight: 1.8 }}>
                <div>NEXT_PUBLIC_SUPABASE_URL=<span style={{ color: 'var(--gold)' }}>https://eqwfbcouxozwfwkzqano.supabase.co</span></div>
                <div>NEXT_PUBLIC_SUPABASE_ANON_KEY=<span style={{ color: 'var(--gold)' }}>eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...</span></div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Service Edit Modal */}
      <Modal
        isOpen={svcModalOpen}
        onClose={() => setSvcModalOpen(false)}
        title={editSvcId ? '✎ Edit Service' : '➕ Add Service'}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setSvcModalOpen(false)}>Cancel</button>
            <motion.button className="btn btn-primary" onClick={saveSvc} whileTap={{ scale: 0.97 }}>
              {editSvcId ? 'Update Service' : 'Add Service'}
            </motion.button>
          </>
        }
      >
        <div className="form-group">
          <label className="label">Service Name</label>
          <input
            type="text" className="input" value={svcForm.name}
            onChange={(e) => setSvcForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Keratin Hair Spa"
          />
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label className="label">Price (₹)</label>
            <input
              type="number" min="0" className="input" placeholder="₹ Price (e.g. 1200)" value={svcForm.price || ''}
              onChange={(e) => setSvcForm((f) => ({ ...f, price: Number(e.target.value) }))}
            />
          </div>
          <div className="form-group">
            <label className="label">Duration (minutes)</label>
            <input
              type="number" min="15" step="15" className="input" placeholder="Minutes (e.g. 45)" value={svcForm.duration || ''}
              onChange={(e) => setSvcForm((f) => ({ ...f, duration: Number(e.target.value) }))}
            />
          </div>
        </div>
      </Modal>

      {/* WhatsApp Simulation Modal */}
      <Modal
        isOpen={simModalOpen}
        onClose={() => setSimModalOpen(false)}
        title="🧪 Simulate Incoming WhatsApp Booking"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setSimModalOpen(false)}>Cancel</button>
            <motion.button
              className="btn btn-primary"
              onClick={handleSimulateBooking}
              disabled={simLoading || !simMessage}
              whileTap={{ scale: 0.97 }}
              style={{ background: '#1a7b4e', borderColor: '#1a7b4e' }}
            >
              {simLoading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={15} />}
              {simLoading ? 'Sending & Broadcasting…' : 'Send Test Booking'}
            </motion.button>
          </>
        }
      >
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
          Simulates a customer messaging your WhatsApp Business account. This will parse the booking, write to Supabase, and broadcast in real-time to your dashboard!
        </p>

        <div className="form-grid">
          <div className="form-group">
            <label className="label">Customer Name</label>
            <input
              type="text"
              className="input"
              value={simName}
              onChange={(e) => setSimName(e.target.value)}
              placeholder="e.g. Priyanka Sharma"
            />
          </div>
          <div className="form-group">
            <label className="label">Mobile Number</label>
            <input
              type="tel"
              className="input"
              value={simMobile}
              onChange={(e) => setSimMobile(e.target.value)}
              placeholder="10-digit mobile"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="label">WhatsApp Message Text</label>
          <textarea
            className="input"
            rows={3}
            value={simMessage}
            onChange={(e) => setSimMessage(e.target.value)}
            placeholder="e.g. Hi, please book Facial and Haircut tomorrow at 4pm"
          />
        </div>

        <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12, fontSize: 12, color: 'var(--muted)', border: '1px solid var(--border)' }}>
          💡 <b>Examples you can try:</b>
          <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span
              style={{ cursor: 'pointer', color: 'var(--teal)', textDecoration: 'underline' }}
              onClick={() => setSimMessage('Hi, I need Bridal Makeup on Saturday at 11am')}
            >
              • "Hi, I need Bridal Makeup on Saturday at 11am"
            </span>
            <span
              style={{ cursor: 'pointer', color: 'var(--teal)', textDecoration: 'underline' }}
              onClick={() => setSimMessage('Book Hair Spa today at 5pm please')}
            >
              • "Book Hair Spa today at 5pm please"
            </span>
            <span
              style={{ cursor: 'pointer', color: 'var(--teal)', textDecoration: 'underline' }}
              onClick={() => setSimMessage('Need Waxing tomorrow morning at 10:30')}
            >
              • "Need Waxing tomorrow morning at 10:30"
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
}
