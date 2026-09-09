'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save, Plus, Pencil, Trash2, Cloud, LogOut, RefreshCw, Copy, Play, Loader2, Send,
  Store, Scissors, Bell, CreditCard, MessageCircle, CloudCog, Mail, Sparkles, Calendar, CheckCircle2
} from 'lucide-react';
import { useSalonStore } from '@/lib/store';
import { scheduleSave, cloudSync } from '@/lib/sync';
import { uid, money } from '@/lib/utils';
import { Service } from '@/types/salon';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';
import { fadeSlideUp, staggerContainer } from '@/variants';
import { SAMPLE_GOOGLE_APPS_SCRIPT_CODE } from '@/lib/google-calendar-server';

type SettingsTab = 'profile' | 'services' | 'reminders' | 'billing' | 'loyalty' | 'whatsapp' | 'email' | 'calendar' | 'cloud';

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

  // WhatsApp Testing State
  const [testWaMobile, setTestWaMobile] = useState('');
  const [testingWa, setTestingWa] = useState(false);
  const [testWaResult, setTestWaResult] = useState<{ success: boolean; msg: string } | null>(null);

  const handleTestWhatsApp = async () => {
    const clean = testWaMobile.replace(/\D/g, '').slice(-10);
    if (clean.length < 10) {
      toast('Please enter a valid 10-digit mobile number to test.', 'error');
      return;
    }
    setTestingWa(true);
    setTestWaResult(null);
    try {
      const res = await fetch('/api/whatsapp/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: clean,
          message: 'Hello! ✨ This is an official live test message from Shree Beauty Studio WhatsApp Cloud API. Welcome!',
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast('✅ Live WhatsApp message sent successfully!');
        setTestWaResult({ success: true, msg: '✅ Message delivered! Message ID: ' + json.messageId });
      } else {
        toast(json.error || 'Failed to send message', 'error');
        setTestWaResult({ success: false, msg: json.error || 'Failed to send message' });
      }
    } catch (err: any) {
      toast('Network error: ' + err.message, 'error');
      setTestWaResult({ success: false, msg: err.message });
    } finally {
      setTestingWa(false);
    }
  };

  // Email Testing State
  const [testEmailTo, setTestEmailTo] = useState('');
  const [testEmailLoading, setTestEmailLoading] = useState(false);

  const handleTestEmail = async () => {
    if (!testEmailTo.trim() || !testEmailTo.includes('@')) {
      toast('Please enter a valid recipient email address', 'error');
      return;
    }
    setTestEmailLoading(true);
    try {
      const res = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testEmailTo.trim(),
          apiKey: s.resendApiKey,
          fromEmail: s.resendFromEmail,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast(`✅ Test email delivered to ${testEmailTo}!`, 'success');
      } else {
        toast(`❌ ${data.error || 'Failed to send test email'}`, 'error');
      }
    } catch {
      toast('Network error sending test email', 'error');
    } finally {
      setTestEmailLoading(false);
    }
  };

  // Google Calendar Testing State
  const [testingCalendar, setTestingCalendar] = useState(false);
  const [calendarTestResult, setCalendarTestResult] = useState<{ success: boolean; msg: string } | null>(null);

  const handleTestCalendar = async () => {
    setTestingCalendar(true);
    setCalendarTestResult(null);
    try {
      const res = await fetch('/api/calendar/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: s.googleCalendarWebhookUrl,
          ownerEmail: s.googleCalendarOwnerEmail,
          salonName: s.salon,
        }),
      });
      const resJson = await res.json();
      if (resJson.success) {
        toast('✅ Google Calendar test event sent successfully!');
        setCalendarTestResult({
          success: true,
          msg: `✅ Success! Event synced via ${resJson.provider || 'cloud'}. Event ID: ${resJson.eventId || 'synced'}`,
        });
      } else {
        toast(resJson.error || 'Failed to sync with Google Calendar', 'error');
        setCalendarTestResult({ success: false, msg: `❌ ${resJson.error || 'Failed to sync'}` });
      }
    } catch (err: any) {
      toast('Network error testing Google Calendar sync', 'error');
      setCalendarTestResult({ success: false, msg: `❌ ${err.message}` });
    } finally {
      setTestingCalendar(false);
    }
  };

  const handleCopyScriptCode = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(SAMPLE_GOOGLE_APPS_SCRIPT_CODE);
      toast('📋 Google Apps Script code copied to clipboard!');
    }
  };

  const handleCopyFeedUrl = () => {
    if (typeof window !== 'undefined') {
      const feedUrl = `${window.location.origin}/api/calendar/feed.ics`;
      navigator.clipboard.writeText(feedUrl);
      toast('📋 Google Calendar Live Feed URL copied!');
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
    { id: 'loyalty', label: 'Loyalty Scheme & Rewards', icon: Sparkles },
    { id: 'whatsapp', label: 'WhatsApp Webhook', icon: MessageCircle },
    { id: 'email', label: 'Email & Resend', icon: Mail },
    { id: 'calendar', label: 'Google Calendar (Auto Sync)', icon: Calendar },
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
                  value={s.printer || '58'}
                  onChange={(e) => update('printer', e.target.value as 'both' | '80' | '58' | 'a4')}
                >
                  <option value="58">2 Inch (58mm) Thermal Receipt Printer (Default Auto-Cut)</option>
                  <option value="80">3 Inch (80mm) Thermal Receipt Printer</option>
                  <option value="both">Both (A4 Full Sheet + Thermal)</option>
                  <option value="a4">A4 Full Page Only</option>
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

        {/* Loyalty Scheme & Rewards Tab */}
        {activeTab === 'loyalty' && (
          <motion.div key="loyalty" variants={fadeSlideUp} initial="hidden" animate="visible" exit="exit" className="card" style={{ padding: 24 }}>
            <div className="card-head" style={{ padding: '0 0 16px', marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h2>🌟 Customer Loyalty Points & Reward Scheme</h2>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Turn regular clients into repeat lifetime customers with points on every visit</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  fontSize: 12,
                  fontWeight: 800,
                  padding: '4px 12px',
                  borderRadius: 999,
                  background: s.loyaltyEnabled !== false ? '#dcfce7' : '#fee2e2',
                  color: s.loyaltyEnabled !== false ? '#15803d' : '#b91c1c',
                  border: `1px solid ${s.loyaltyEnabled !== false ? '#86efac' : '#fecaca'}`,
                }}>
                  {s.loyaltyEnabled !== false ? '🟢 LOYALTY SCHEME ACTIVE (ON)' : '🔴 LOYALTY SCHEME DISABLED (OFF)'}
                </span>
              </div>
            </div>

            {/* Master ON / OFF Switch Banner */}
            <div style={{
              background: s.loyaltyEnabled !== false
                ? 'linear-gradient(135deg, #fefce8, #fffbeb)'
                : '#f8fafc',
              border: `2px solid ${s.loyaltyEnabled !== false ? '#fde047' : 'var(--border)'}`,
              borderRadius: 14,
              padding: 20,
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
              boxShadow: s.loyaltyEnabled !== false ? '0 4px 20px rgba(234, 179, 8, 0.12)' : 'none',
            }}>
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Sparkles size={22} color={s.loyaltyEnabled !== false ? '#ca8a04' : 'var(--muted)'} />
                  <span style={{ fontSize: 16, fontWeight: 800, color: s.loyaltyEnabled !== false ? '#854d0e' : 'var(--text)' }}>
                    Master Loyalty Scheme Switch
                  </span>
                </div>
                <p style={{ fontSize: 12.5, color: s.loyaltyEnabled !== false ? '#a16207' : 'var(--muted)', margin: 0 }}>
                  {s.loyaltyEnabled !== false
                    ? 'Loyalty Points calculation, earning on POS bills, customer points ledger, and bill discounts are currently ACTIVE.'
                    : 'Loyalty Points system is turned OFF. Customers will not earn or redeem points during billing.'}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Big Visual Toggle Button */}
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = s.loyaltyEnabled === false;
                    update('loyaltyEnabled', nextVal);
                    toast(nextVal ? '🌟 Loyalty Scheme turned ON!' : '⏸️ Loyalty Scheme turned OFF!', nextVal ? 'success' : 'info');
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '11px 20px',
                    borderRadius: 999,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 800,
                    background: s.loyaltyEnabled !== false ? 'linear-gradient(135deg, #16a34a, #15803d)' : '#64748b',
                    color: '#ffffff',
                    boxShadow: s.loyaltyEnabled !== false ? '0 4px 14px rgba(22, 163, 74, 0.35)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span style={{
                    display: 'inline-block',
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: '#ffffff',
                    boxShadow: '0 0 8px rgba(255,255,255,0.8)'
                  }} />
                  {s.loyaltyEnabled !== false ? 'LOYALTY IS ON (Click to Turn OFF)' : 'LOYALTY IS OFF (Click to Turn ON)'}
                </button>
              </div>
            </div>

            {/* Config Fields (disabled or dimmed if turned off) */}
            <div style={{
              opacity: s.loyaltyEnabled !== false ? 1 : 0.5,
              pointerEvents: s.loyaltyEnabled !== false ? 'auto' : 'none',
              transition: 'opacity 0.2s ease',
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                ⚙️ Points Earning & Redemption Calculation Rules
              </h3>

              <div className="form-grid" style={{ marginBottom: 16 }}>
                <div className="form-group">
                  <label className="label">
                    💰 Points Earning Rate (₹ Spent per 1 Point)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      min={1}
                      className="input"
                      value={s.loyaltyEarnRate || 100}
                      onChange={(e) => update('loyaltyEarnRate', Math.max(1, Number(e.target.value)))}
                      placeholder="100"
                      style={{ paddingLeft: 28 }}
                    />
                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--muted)' }}>₹</span>
                  </div>
                  <span style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4, display: 'block' }}>
                    Example: If set to ₹100, a bill of ₹1,500 gives the customer <b>15 Points</b>.
                  </span>
                </div>

                <div className="form-group">
                  <label className="label">
                    🎁 Points Redemption Rate (Points required for ₹1 Discount)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      min={1}
                      className="input"
                      value={s.loyaltyRedeemRate || 10}
                      onChange={(e) => update('loyaltyRedeemRate', Math.max(1, Number(e.target.value)))}
                      placeholder="10"
                      style={{ paddingRight: 60 }}
                    />
                    <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--muted)', fontSize: 12 }}>pts = ₹1</span>
                  </div>
                  <span style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4, display: 'block' }}>
                    Example: If set to 10 pts = ₹1, then 100 points give ₹10 discount (500 pts = ₹50 OFF).
                  </span>
                </div>

                <div className="form-group">
                  <label className="label">
                    🔒 Minimum Points Required to Redeem
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="input"
                    value={s.loyaltyMinRedeem !== undefined ? s.loyaltyMinRedeem : 50}
                    onChange={(e) => update('loyaltyMinRedeem', Math.max(0, Number(e.target.value)))}
                    placeholder="50"
                  />
                  <span style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4, display: 'block' }}>
                    Customer must have at least this many points to apply discount at checkout.
                  </span>
                </div>
              </div>

              {/* Digital Wallet Toggle */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 16,
                marginTop: 8,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--text)', marginBottom: 2 }}>
                      💳 Customer Prepaid / Store Wallet Balance
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      Allow customers to maintain advance wallet balance and pay directly from wallet at checkout.
                    </div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={s.walletEnabled !== false}
                      onChange={(e) => update('walletEnabled', e.target.checked)}
                      style={{ width: 18, height: 18, accentColor: 'var(--teal)' }}
                    />
                    <span>{s.walletEnabled !== false ? 'Wallet ON' : 'Wallet OFF'}</span>
                  </label>
                </div>
              </div>
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

                {/* Live Test WhatsApp Message Dispatcher */}
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #bbf7d0' }}>
                  <label className="label" style={{ color: '#166534', marginBottom: 4 }}>
                    📱 Test WhatsApp API Dispatch (Send Live Test Message)
                  </label>
                  <p style={{ fontSize: 11.5, color: '#15803d', margin: '0 0 8px' }}>
                    Send a real test message to your personal WhatsApp number to verify API connectivity.
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <input
                      type="tel"
                      className="input"
                      placeholder="Enter 10-digit mobile (e.g. 9824183769)"
                      value={testWaMobile}
                      onChange={(e) => setTestWaMobile(e.target.value)}
                      style={{ maxWidth: 280 }}
                    />
                    <motion.button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={handleTestWhatsApp}
                      disabled={testingWa}
                      whileTap={{ scale: 0.97 }}
                      style={{ background: '#16a34a', borderColor: '#16a34a' }}
                    >
                      {testingWa ? (
                        <>
                          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                          Sending…
                        </>
                      ) : (
                        <>
                          <Send size={14} /> Send Test WhatsApp Message
                        </>
                      )}
                    </motion.button>
                  </div>

                  {testWaResult && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: '8px 12px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        background: testWaResult.success ? '#dcfce7' : '#fef2f2',
                        color: testWaResult.success ? '#166534' : '#b91c1c',
                        border: `1px solid ${testWaResult.success ? '#86efac' : '#fecaca'}`,
                      }}
                    >
                      {testWaResult.msg}
                    </div>
                  )}
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
          </motion.div>
        )}

        {/* Email & Resend Settings Tab */}
        {activeTab === 'email' && (
          <motion.div key="email" variants={fadeSlideUp} initial="hidden" animate="visible" exit="exit" className="card" style={{ padding: 'clamp(14px, 3vw, 24px)' }}>
            <div className="card-head" style={{ padding: '0 0 16px', marginBottom: 18 }}>
              <h2>📧 Resend Email Configuration & Automation</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 24 }}>
              <div className="form-group">
                <label className="label">Resend API Key (re_...)</label>
                <input
                  type="password"
                  className="input"
                  placeholder="re_123456789abcdef..."
                  value={s.resendApiKey || ''}
                  onChange={(e) => update('resendApiKey', e.target.value)}
                />
                <span style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4, display: 'block' }}>
                  Leave blank to use environment variable <code>RESEND_API_KEY</code> from <code>.env.local</code>. Generate a key at{' '}
                  <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--teal)', fontWeight: 600 }}>
                    resend.com/api-keys
                  </a>.
                </span>
              </div>

              <div className="form-group">
                <label className="label">Sender Email Address & Name (From)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Shree Beauty Studio <onboarding@resend.dev>"
                  value={s.resendFromEmail || ''}
                  onChange={(e) => update('resendFromEmail', e.target.value)}
                />
                <span style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4, display: 'block' }}>
                  Format: <code>Salon Name &lt;email@domain.com&gt;</code>. Use <code>onboarding@resend.dev</code> for testing, or your custom verified domain in production.
                </span>
              </div>
            </div>

            {/* Email Automation Switches */}
            <div style={{ background: '#F8FAFC', border: '1px solid var(--border)', borderRadius: 12, padding: 18, marginBottom: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 14 }}>
                ⚡ Automated Email Workflows
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13.5 }}>
                  <input
                    type="checkbox"
                    checked={s.emailConfirmationsEnabled !== false}
                    onChange={(e) => update('emailConfirmationsEnabled', e.target.checked)}
                    style={{ width: 17, height: 17, accentColor: 'var(--teal)' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600 }}>Instant Booking Confirmations</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                      Automatically send branded HTML receipt & appointment details when a booking is created.
                    </div>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13.5 }}>
                  <input
                    type="checkbox"
                    checked={s.emailRemindersEnabled !== false}
                    onChange={(e) => update('emailRemindersEnabled', e.target.checked)}
                    style={{ width: 17, height: 17, accentColor: 'var(--teal)' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600 }}>Automated Appointment Reminders</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                      Send reminder notifications prior to scheduled customer appointments.
                    </div>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13.5 }}>
                  <input
                    type="checkbox"
                    checked={s.emailWishesEnabled !== false}
                    onChange={(e) => update('emailWishesEnabled', e.target.checked)}
                    style={{ width: 17, height: 17, accentColor: 'var(--teal)' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600 }}>Customer Milestone Greetings</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                      Celebrate birthdays, wedding anniversaries, and sagai with celebratory cards & discount offers.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Test Resend Email Dispatch */}
            <div style={{ background: '#E6F4F1', border: '1px solid #B2DFDB', borderRadius: 12, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Mail size={18} color="#05424A" />
                <div style={{ fontWeight: 700, fontSize: 14, color: '#05424A' }}>
                  🧪 Test Resend Email Dispatch
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#2C646B', marginBottom: 10 }}>
                Send an instantaneous luxury test email to verify your API key and sender configuration.
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="email"
                  className="input"
                  placeholder="Enter your personal email (e.g. test@gmail.com)"
                  value={testEmailTo}
                  onChange={(e) => setTestEmailTo(e.target.value)}
                  style={{ background: '#FFF' }}
                />
                <motion.button
                  className="btn btn-primary"
                  onClick={handleTestEmail}
                  disabled={testEmailLoading}
                  whileTap={{ scale: 0.97 }}
                  style={{ flexShrink: 0, background: '#05424A', borderColor: '#05424A' }}
                >
                  {testEmailLoading ? (
                    <>
                      <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      Send Test Email
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Google Calendar Cloud Auto-Sync Tab */}
        {activeTab === 'calendar' && (
          <motion.div key="calendar" variants={fadeSlideUp} initial="hidden" animate="visible" exit="exit" className="card" style={{ padding: 24 }}>
            <div className="card-head" style={{ padding: '0 0 16px', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div>
                  <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                    <Calendar size={22} color="#0284c7" /> 📅 Google Calendar Cloud Auto-Sync
                  </h2>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                    Automatically saves appointments and bridal events directly to Google Calendar in the cloud with automated reminders.
                  </div>
                </div>
                <label className="toggle-label" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={s.googleCalendarEnabled !== false}
                    onChange={(e) => update('googleCalendarEnabled', e.target.checked)}
                  />
                  <span>Cloud Auto-Sync Active</span>
                </label>
              </div>
            </div>

            {/* Studio Owner Google Calendar Email */}
            <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 14, padding: 18, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 14.5, fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={18} color="#166534" /> 1. Studio Owner Gmail Address
              </h3>
              <div style={{ fontSize: 12.5, color: '#374151', marginBottom: 12 }}>
                Enter the primary Google/Gmail account where you want all salon appointment invites and calendar notifications delivered.
              </div>
              <input
                type="email"
                className="input"
                placeholder="e.g. shreebeautystudio@gmail.com"
                value={s.googleCalendarOwnerEmail || ''}
                onChange={(e) => update('googleCalendarOwnerEmail', e.target.value)}
                style={{ background: '#fff' }}
              />
            </div>

            {/* Option A: Live WebCal Google Calendar Feed URL */}
            <div style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: 14, padding: 18, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: '#0369a1', display: 'flex', alignItems: 'center', gap: 6 }}>
                  ⚡ Method A: Live Google Calendar Subscription Feed (0-Setup Auto-Sync)
                </h3>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#0369a1', background: '#e0f2fe', padding: '3px 8px', borderRadius: 6 }}>
                  Instant &amp; Realtime
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: '#374151', marginBottom: 12, lineHeight: 1.5 }}>
                Subscribe to your studio&apos;s live calendar feed directly inside Google Calendar. Google Calendar will automatically sync every new and upcoming appointment continuously in the background!
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <input
                  type="text"
                  readOnly
                  className="input"
                  value={typeof window !== 'undefined' ? `${window.location.origin}/api/calendar/feed.ics` : '/api/calendar/feed.ics'}
                  style={{ background: '#fff', fontWeight: 600, color: '#0f172a' }}
                />
                <motion.button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleCopyFeedUrl}
                  whileTap={{ scale: 0.97 }}
                  style={{ flexShrink: 0, background: '#0284c7', borderColor: '#0284c7' }}
                >
                  <Copy size={14} /> Copy Feed URL
                </motion.button>
              </div>

              <div style={{ background: '#ffffff', borderRadius: 10, padding: '12px 14px', border: '1px solid #e0f2fe', fontSize: 12, color: '#475569' }}>
                <b>How to add to Google Calendar (One-time 10-second setup):</b>
                <ol style={{ margin: '6px 0 0', paddingLeft: 18, lineHeight: 1.6 }}>
                  <li>Open <a href="https://calendar.google.com" target="_blank" rel="noreferrer" style={{ color: '#0284c7', fontWeight: 700 }}>Google Calendar</a> on your phone or computer.</li>
                  <li>On the left panel, click the <b>+</b> next to <b>&quot;Other calendars&quot;</b> and select <b>&quot;From URL&quot;</b>.</li>
                  <li>Paste the copied Feed URL and click <b>&quot;Add calendar&quot;</b>. Done! All salon appointments are now auto-synced.</li>
                </ol>
              </div>
            </div>

            {/* Option B: Direct Push via Google Apps Script Webhook */}
            <div style={{ background: '#faf5ff', border: '1.5px solid #e9d5ff', borderRadius: 14, padding: 18, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: '#7e22ce', display: 'flex', alignItems: 'center', gap: 6 }}>
                  🚀 Method B: Direct Google Calendar API Webhook (Instant Event Creation)
                </h3>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#7e22ce', background: '#f3e8ff', padding: '3px 8px', borderRadius: 6 }}>
                  100% Free for any Gmail
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: '#374151', marginBottom: 12, lineHeight: 1.5 }}>
                Deploy a free 10-line Google Apps Script in your Google account to auto-insert appointments into your main Google Calendar the exact second a booking happens.
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="label">Google Apps Script Web App URL</label>
                <input
                  type="url"
                  className="input"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={s.googleCalendarWebhookUrl || ''}
                  onChange={(e) => update('googleCalendarWebhookUrl', e.target.value)}
                  style={{ background: '#fff' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <motion.button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleCopyScriptCode}
                  whileTap={{ scale: 0.97 }}
                  style={{ background: '#fff', border: '1px solid #d8b4fe', color: '#7e22ce', fontWeight: 700 }}
                >
                  <Copy size={13} /> Copy Google Apps Script Code
                </motion.button>
                <a
                  href="https://script.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ghost btn-sm"
                  style={{ background: '#fff', border: '1px solid #d8b4fe', color: '#7e22ce', textDecoration: 'none', fontWeight: 700 }}
                >
                  Open script.google.com ↗
                </a>
              </div>

              <details style={{ fontSize: 12, color: '#475569', background: '#fff', padding: '10px 12px', borderRadius: 8, border: '1px solid #e9d5ff' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 700, color: '#7e22ce' }}>
                  Click to view Setup Instructions &amp; Code snippet
                </summary>
                <div style={{ marginTop: 8 }}>
                  <p style={{ margin: '0 0 6px' }}>1. Go to <a href="https://script.google.com" target="_blank" rel="noreferrer" style={{ color: '#7e22ce', fontWeight: 700 }}>script.google.com</a> and click <b>New project</b>.</p>
                  <p style={{ margin: '0 0 6px' }}>2. Click the <b>Copy Google Apps Script Code</b> button above and paste it into the editor.</p>
                  <p style={{ margin: '0 0 6px' }}>3. Click <b>Deploy</b> &rarr; <b>New deployment</b> &rarr; Select type: <b>Web app</b>.</p>
                  <p style={{ margin: '0 0 6px' }}>4. Set <i>&quot;Execute as: Me&quot;</i> and <i>&quot;Who has access: Anyone&quot;</i> &rarr; Click <b>Deploy</b>.</p>
                  <p style={{ margin: '0' }}>5. Copy the <b>Web app URL</b> and paste it in the box above. Save settings!</p>
                </div>
              </details>
            </div>

            {/* Test Connection Box */}
            <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 14, padding: 18 }}>
              <h3 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>
                ⚡ Test Google Calendar Cloud Connection
              </h3>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 12 }}>
                Click below to send an instant test appointment event to verify cloud synchronization.
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <motion.button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleTestCalendar}
                  disabled={testingCalendar}
                  whileTap={{ scale: 0.97 }}
                  style={{ background: '#0284c7', borderColor: '#0284c7' }}
                >
                  {testingCalendar ? (
                    <>
                      <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      Testing Sync…
                    </>
                  ) : (
                    <>
                      <Play size={14} /> Send Test Calendar Event
                    </>
                  )}
                </motion.button>

                {calendarTestResult && (
                  <span
                    style={{
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: calendarTestResult.success ? '#166534' : '#991b1b',
                    }}
                  >
                    {calendarTestResult.msg}
                  </span>
                )}
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
    </div>
  );
}
