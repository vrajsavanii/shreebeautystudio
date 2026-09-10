'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save, Plus, Pencil, Trash2, Cloud, LogOut, RefreshCw, Copy, Play, Loader2, Send,
  Store, Scissors, Bell, CreditCard, MessageCircle, CloudCog, Mail, Sparkles, Calendar, CheckCircle2,
  AlertTriangle, Download, Upload, RotateCcw, ShieldAlert, Check, Users, Receipt, Wallet, ShoppingBag, Heart, Package
} from 'lucide-react';
import { useSalonStore, DEFAULT_DATA } from '@/lib/store';
import { scheduleSave, cloudSync, forceCloudReset } from '@/lib/sync';
import { uid, money } from '@/lib/utils';
import { Service } from '@/types/salon';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';
import { fadeSlideUp, staggerContainer } from '@/variants';
import { SAMPLE_GOOGLE_APPS_SCRIPT_CODE } from '@/lib/google-calendar-server';

type SettingsTab = 'profile' | 'services' | 'reminders' | 'billing' | 'loyalty' | 'whatsapp' | 'email' | 'calendar' | 'cloud' | 'reset';

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
          serviceAccountEmail: s.googleServiceAccountEmail,
          privateKey: s.googlePrivateKey,
          calendarId: s.googleCalendarId,
          clientId: s.googleClientId,
          clientSecret: s.googleClientSecret,
          refreshToken: s.googleRefreshToken,
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

  // Data Reset States & Handlers
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetMode, setResetMode] = useState<'transactions_only' | 'factory_reset' | null>(null);
  const [confirmInput, setConfirmInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const handleExportBackup = () => {
    try {
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `shree_beauty_studio_backup_${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast('✅ Data backup downloaded successfully (JSON)!');
    } catch (err: any) {
      toast('Failed to export backup: ' + err.message, 'error');
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Invalid JSON structure');
        }
        useSalonStore.getState().setData(parsed);
        await forceCloudReset(useSalonStore.getState().data);
        toast('✅ Backup data restored successfully!');
      } catch (err: any) {
        toast('Failed to restore backup: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleTriggerReset = (mode: 'transactions_only' | 'factory_reset') => {
    setResetMode(mode);
    setConfirmInput('');
    setResetModalOpen(true);
  };

  const handleExecuteReset = async () => {
    if (!resetMode) return;
    setIsResetting(true);
    try {
      if (resetMode === 'factory_reset') {
        useSalonStore.getState().clearAllData('factory_reset');
        await forceCloudReset(DEFAULT_DATA);
        toast('⚡ Factory reset complete! Restarting salon app…');
        setTimeout(() => {
          window.location.href = '/admin';
        }, 1200);
      } else {
        useSalonStore.getState().clearAllData('transactions_only');
        await forceCloudReset(useSalonStore.getState().data);
        toast('🧹 All trial bills, customers & records cleared! App is fresh for live business.');
        setResetModalOpen(false);
        setResetMode(null);
        setConfirmInput('');
      }
    } catch (err: any) {
      toast('Error during data reset: ' + err.message, 'error');
    } finally {
      setIsResetting(false);
    }
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
    { id: 'reset', label: '🗑️ Data Reset & Start Fresh', icon: Trash2 },
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                    <Calendar size={22} color="#0284c7" /> 📅 Google Calendar API &amp; Cloud Auto-Sync
                  </h2>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                    ગુગલ કેલેન્ડરમાં બધી નવી અપોઇન્ટમેન્ટ્સ અને બ્રાઇડલ બુકિંગ ઓટોમેટિક સેવ કરો (Direct Cloud API / Webhook Integration)
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

            {/* Notice explaining API vs URL */}
            <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 12, padding: '14px 16px', marginBottom: 20, color: '#92400e', fontSize: 12.5, lineHeight: 1.5 }}>
              <b>💡 મહત્વની માહિતી (Why Google Calendar API?):</b>
              <div style={{ marginTop: 4 }}>
                Google Calendar માં <b>&quot;From URL&quot;</b> ઓપ્શન ફક્ત ત્યારે જ કામ કરે જ્યારે તમારી વેબસાઇટ લાઈવ પબ્લિક ડોમેન પર હોય. લોકલ કમ્પ્યુટર (localhost) અને તાત્કાલિક ઇન્સ્ટન્ટ ક્લાઉડ સેવ માટે નીચે આપેલા <b>Method 1 (Google Calendar API)</b> અથવા <b>Method 2 (Apps Script Webhook)</b> નો ઉપયોગ કરો!
              </div>
            </div>

            {/* Studio Owner Google Calendar Email */}
            <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 14, padding: 18, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 14.5, fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={18} color="#166534" /> 1. Studio Owner Gmail Address
              </h3>
              <div style={{ fontSize: 12.5, color: '#374151', marginBottom: 12 }}>
                Enter your primary Google/Gmail account where salon appointments should be synced and notified.
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

            {/* Method 1: Official Google Calendar REST API v3 (Service Account) */}
            <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 14, padding: 18, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: '#15803d', display: 'flex', alignItems: 'center', gap: 6 }}>
                  🚀 Method 1: Official Google Calendar API v3 (Service Account)
                </h3>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#15803d', background: '#dcfce7', padding: '3px 8px', borderRadius: 6 }}>
                  Direct Google Cloud API
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: '#374151', marginBottom: 14, lineHeight: 1.5 }}>
                Directly connects to Google Calendar via Google Cloud REST API v3 using a Service Account JSON Key. Appointments are inserted into your Google Calendar instantly.
              </div>

              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="label" style={{ fontWeight: 700, fontSize: 12 }}>Service Account Client Email (client_email)</label>
                <input
                  type="email"
                  className="input"
                  placeholder="salon-calendar@my-project.iam.gserviceaccount.com"
                  value={s.googleServiceAccountEmail || ''}
                  onChange={(e) => update('googleServiceAccountEmail', e.target.value)}
                  style={{ background: '#fff' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="label" style={{ fontWeight: 700, fontSize: 12 }}>Service Account Private Key (private_key PEM)</label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----"
                  value={s.googlePrivateKey || ''}
                  onChange={(e) => update('googlePrivateKey', e.target.value)}
                  style={{ background: '#fff', fontFamily: 'monospace', fontSize: 11 }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="label" style={{ fontWeight: 700, fontSize: 12 }}>Google Calendar ID (Calendar ID)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="primary (or your-gmail@gmail.com)"
                  value={s.googleCalendarId || ''}
                  onChange={(e) => update('googleCalendarId', e.target.value)}
                  style={{ background: '#fff' }}
                />
                <span style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
                  Default is <code>primary</code>. (Tip: Make sure you share your Google Calendar with your Service Account Email with &quot;Make changes to events&quot; permission!).
                </span>
              </div>

              <details style={{ fontSize: 12, color: '#475569', background: '#fff', padding: '10px 12px', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 700, color: '#15803d' }}>
                  📖 Google Cloud Service Account બનાવવાની સરળ રીત (Gujarati Guide)
                </summary>
                <div style={{ marginTop: 8, lineHeight: 1.6 }}>
                  <ol style={{ margin: 0, paddingLeft: 18 }}>
                    <li><a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" style={{ color: '#15803d', fontWeight: 700 }}>Google Cloud Console</a> ખોલો અને નવો પ્રોજેક્ટ બનાવો.</li>
                    <li><b>APIs &amp; Services &rarr; Enable APIs</b> માં જઈ <b>Google Calendar API</b> સક્ષમ (Enable) કરો.</li>
                    <li><b>Credentials &rarr; Create Credentials &rarr; Service Account</b> બનાવીને <b>Keys &rarr; Add Key (JSON)</b> ડાઉનલોડ કરો.</li>
                    <li>ડાઉનલોડ થયેલ JSON ફાઇલમાંથી <code>client_email</code> અને <code>private_key</code> ઉપરના બોક્સમાં પેસ્ટ કરો.</li>
                    <li>તમારા Google Calendar ની Settings માં જઈ <b>Share with specific people</b> માં આ Service Account Email ઉમેરીને <i>&quot;Make changes to events&quot;</i> પરમિશન આપો.</li>
                  </ol>
                </div>
              </details>
            </div>

            {/* Method 2: Direct Push via Google Apps Script Webhook */}
            <div style={{ background: '#faf5ff', border: '1.5px solid #e9d5ff', borderRadius: 14, padding: 18, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: '#7e22ce', display: 'flex', alignItems: 'center', gap: 6 }}>
                  ⚡ Method 2: Google Apps Script Webhook (100% Free &amp; 1-Minute Setup)
                </h3>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#7e22ce', background: '#f3e8ff', padding: '3px 8px', borderRadius: 6 }}>
                  Easiest for any Gmail
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: '#374151', marginBottom: 12, lineHeight: 1.5 }}>
                તમારા અંગત જીમેઇલ (Gmail) એકાઉન્ટમાં ફ્રી Google Apps Script લગાવીને ૧ સેકન્ડમાં બધી અપોઇન્ટમેન્ટ્સ ઓટોમેટિક ગુગલ કેલેન્ડરમાં સેવ કરો.
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="label" style={{ fontWeight: 700, fontSize: 12 }}>Google Apps Script Web App URL</label>
                <input
                  type="url"
                  className="input"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={s.googleCalendarWebhookUrl || ''}
                  onChange={(e) => update('googleCalendarWebhookUrl', e.target.value)}
                  style={{ background: '#fff' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                <motion.button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleCopyScriptCode}
                  whileTap={{ scale: 0.97 }}
                  style={{ background: '#fff', border: '1px solid #d8b4fe', color: '#7e22ce', fontWeight: 700 }}
                >
                  <Copy size={13} /> 1. Copy Google Apps Script Code
                </motion.button>
                <a
                  href="https://script.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ghost btn-sm"
                  style={{ background: '#fff', border: '1px solid #d8b4fe', color: '#7e22ce', textDecoration: 'none', fontWeight: 700 }}
                >
                  2. Open script.google.com ↗
                </a>
              </div>

              <details style={{ fontSize: 12, color: '#475569', background: '#fff', padding: '10px 12px', borderRadius: 8, border: '1px solid #e9d5ff' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 700, color: '#7e22ce' }}>
                  📖 1-Minute Apps Script Setup Guide (૧ મિનિટમાં ફ્રી સેટઅપ)
                </summary>
                <div style={{ marginTop: 8, lineHeight: 1.6 }}>
                  <p style={{ margin: '0 0 6px' }}>1. <a href="https://script.google.com" target="_blank" rel="noreferrer" style={{ color: '#7e22ce', fontWeight: 700 }}>script.google.com</a> ખોલીને <b>New project</b> પર ક્લિક કરો.</p>
                  <p style={{ margin: '0 0 6px' }}>2. ઉપર આપેલ <b>&quot;1. Copy Google Apps Script Code&quot;</b> બટન દબાવી કોડ કોપી કરી એડિટરમાં પેસ્ટ કરો.</p>
                  <p style={{ margin: '0 0 6px' }}>3. ઉપર જમણી બાજુ <b>Deploy &rarr; New deployment</b> પર ક્લિક કરો. Type માં <b>Web app</b> પસંદ કરો.</p>
                  <p style={{ margin: '0 0 6px' }}>4. <i>&quot;Execute as: Me&quot;</i> અને <i>&quot;Who has access: Anyone&quot;</i> રાખીને <b>Deploy</b> પર ક્લિક કરો.</p>
                  <p style={{ margin: '0' }}>5. મળેલી <b>Web app URL</b> કોપી કરીને ઉપરના બોક્સમાં પેસ્ટ કરો અને Save કરો!</p>
                </div>
              </details>
            </div>

            {/* Option 3: Live WebCal Google Calendar Feed URL (For Online / Hosted Production) */}
            <div style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: 14, padding: 18, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: '#0369a1', display: 'flex', alignItems: 'center', gap: 6 }}>
                  🌐 Method 3: Live Calendar Feed URL (For Live Hosted Domains)
                </h3>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#0369a1', background: '#e0f2fe', padding: '3px 8px', borderRadius: 6 }}>
                  For Live Websites
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: '#374151', marginBottom: 12, lineHeight: 1.5 }}>
                જ્યારે સ્ટુડિયો વેબસાઇટ લાઈવ ડોમેઇન (Vercel / Cloud) પર હોસ્ટ થશે, ત્યારે તમે આ Feed URL ને ગૂગલ કેલેન્ડરમાં &quot;From URL&quot; તરીકે એડ કરી શકો છો.
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
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
            </div>

            {/* Test Connection Box */}
            <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 14, padding: 18 }}>
              <h3 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>
                ⚡ Test Google Calendar Cloud Connection (ટેસ્ટ ઇવેન્ટ મોકલો)
              </h3>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 12 }}>
                Click below to send an instant live test appointment to verify Google Calendar API &amp; Webhook connection.
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
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

        {/* Data Reset & Start Fresh Tab */}
        {activeTab === 'reset' && (
          <motion.div key="reset" variants={fadeSlideUp} initial="hidden" animate="visible" exit="exit" className="card" style={{ padding: 24 }}>
            <div className="card-head" style={{ padding: '0 0 16px', marginBottom: 18, borderBottom: '1px solid var(--border)' }}>
              <div>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#e11d48' }}>
                  <Trash2 size={22} color="#e11d48" /> 🗑️ Salon Data Reset & Start Fresh (નવી શરૂઆત)
                </h2>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                  ટેસ્ટિંગ / ટ્રાયલ પૂર્ણ થઈ ગયા પછી રિયલ બિઝનેસ શરૂ કરવા માટે બધા ટેસ્ટ બિલો & ગ્રાહકો સાફ કરો, અથવા સંપૂર્ણ ફેક્ટરી રીસેટ કરો.
                </p>
              </div>
            </div>

            {/* Current Data Overview Stats */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text)' }}>
                📊 Current Stored Data Summary (હાલમાં એપમાં રહેલો ડેટા):
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#9f1239' }}>🧾 Invoices (બિલો)</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#e11d48' }}>{data?.invoices?.length || 0}</div>
                </div>
                <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#9f1239' }}>👥 Customers (ગ્રાહકો)</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#e11d48' }}>{data?.customers?.length || 0}</div>
                </div>
                <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#9f1239' }}>📅 Appointments</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#e11d48' }}>{data?.appointments?.length || 0}</div>
                </div>
                <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#9f1239' }}>💸 Expenses / રોજમેળ</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#e11d48' }}>{data?.expenses?.length || 0}</div>
                </div>
                <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#9f1239' }}>🛍️ Purchases</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#e11d48' }}>{data?.purchases?.length || 0}</div>
                </div>
                <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#9f1239' }}>💍 Bridal Bookings</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#e11d48' }}>{data?.bridal?.length || 0}</div>
                </div>
                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#065f46' }}>🛡️ Safe Products</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#059669' }}>{data?.inventory?.length || 56}</div>
                </div>
                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#065f46' }}>🛡️ Safe Services</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#059669' }}>{data?.services?.length || 10}</div>
                </div>
              </div>
            </div>

            {/* Action Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Card 1: Clear Trial Data (Recommended) */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(254, 242, 242, 0.7) 0%, rgba(255, 241, 242, 0.95) 100%)',
                border: '2px solid #f87171',
                borderRadius: 14,
                padding: '20px 22px',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 22 }}>🧹</span>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#991b1b' }}>
                        ઓપ્શન ૧: બધા ટેસ્ટ બિલો & ગ્રાહકો સાફ કરો (Clear Trial Data & Start Real Salon)
                      </div>
                      <div style={{ fontSize: 12.5, color: '#7f1d1d', fontWeight: 500 }}>
                        નવી શરૂઆત કરવા માટે સૌથી ઉત્તમ (Recommended) - કેટલોગ & પ્રોડક્ટ્સ સુરક્ષિત રહેશે!
                      </div>
                    </div>
                  </div>
                  <span style={{ background: '#fee2e2', color: '#b91c1c', fontSize: 11.5, fontWeight: 800, padding: '4px 10px', borderRadius: 20, border: '1px solid #fca5a5' }}>
                    RECOMMENDED
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16, fontSize: 12.5, background: '#fff', padding: 14, borderRadius: 10, border: '1px solid #fecdd3' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: 6 }}>❌ નીચેનો તમામ ટેસ્ટ ડેટા સાફ થઈ જશે:</div>
                    <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7, color: '#4b5563' }}>
                      <li>બધા ઇન્વોઇસ & સેલ્સ બિલો (નંબર ફરી <b>#1001</b> થી શરૂ થશે)</li>
                      <li>બધા ટેસ્ટ કસ્ટમર્સ & મોબાઈલ નંબરો</li>
                      <li>બધા એપોઇન્ટમેન્ટ્સ & કેલેન્ડર બુકિંગ</li>
                      <li>બધા બ્રાઇડલ પેકેજ બુકિંગ</li>
                      <li>બધા દૈનિક ખર્ચ & રોજમેળ (Expenses & Rojmel)</li>
                      <li>બધા સપ્લાયર પરચેઝ બિલ & સ્ટોક ઓડિટ લોગ</li>
                      <li>ગિફ્ટ વાઉચર્સ, લોયલ્ટી પોઇન્ટ્સ & વોલેટ ટ્રાન્ઝેક્શન</li>
                      <li>સ્ટાફ હાજરી & બેંક ટ્રાન્સફર એન્ટ્રીઓ</li>
                    </ul>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#16a34a', marginBottom: 6 }}>✅ નીચેની તમામ વિગતો 100% સુરક્ષિત રહેશે:</div>
                    <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7, color: '#4b5563' }}>
                      <li>બધી <b>56 બ્રાન્ડેડ પ્રોડક્ટ્સ</b> (સ્ટોક રીસેટ થઈને 10 થશે)</li>
                      <li>બધા <b>સલૂન સર્વિસ રેટ કાર્ડ</b> (Layer Cut, Facial, વગેરે)</li>
                      <li>બધા <b>16 બ્રાઇડલ & મેકઅપ પેકેજીસ</b></li>
                      <li>તમામ <b>સ્ટાફ સભ્યો</b> (Neha, Pooja, વગેરે)</li>
                      <li>તમારું <b>સલૂન નામ, સરનામું, WhatsApp & એડમિન પાસવર્ડ</b></li>
                    </ul>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <motion.button
                    className="btn"
                    style={{ background: '#e11d48', color: '#fff', fontWeight: 700, padding: '10px 20px', borderRadius: 8, boxShadow: '0 4px 12px rgba(225,29,72,0.3)' }}
                    onClick={() => handleTriggerReset('transactions_only')}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Trash2 size={16} /> 🧹 બધો ટેસ્ટ ડેટા સાફ કરો (Clear Trial Data)
                  </motion.button>
                </div>
              </div>

              {/* Card 2: 100% Complete Factory Reset */}
              <div style={{
                background: '#fff',
                border: '1.5px solid #e2e8f0',
                borderRadius: 14,
                padding: '20px 22px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 20 }}>⚡</span>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b' }}>
                        ઓપ્શન ૨: સંપૂર્ણ ફેક્ટરી રીસેટ (100% Factory Reset)
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                        એપને બિલકુલ નવી ઇન્સ્ટોલેશન જેવી મૂળભૂત (Default) સ્થિતિમાં ફેરવો.
                      </div>
                    </div>
                  </div>
                  <span style={{ background: '#f1f5f9', color: '#475569', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6 }}>
                    ADVANCED
                  </span>
                </div>
                <p style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.6, marginBottom: 14 }}>
                  ⚠️ આનાથી તમારા તમામ કસ્ટમ ફેરફારો, નવા ઉમેરેલા સ્ટાફ કે સર્વિસ સહિત બધું જ ડિલીટ થઈ જશે અને એપ ડિફોલ્ટ ઓરિજિનલ સ્થિતિમાં રીલોડ થઈ જશે.
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <motion.button
                    className="btn btn-ghost"
                    style={{ color: '#b91c1c', border: '1px solid #fca5a5', fontWeight: 600 }}
                    onClick={() => handleTriggerReset('factory_reset')}
                    whileTap={{ scale: 0.97 }}
                  >
                    <RotateCcw size={15} /> ⚡ સંપૂર્ણ ફેક્ટરી રીસેટ (Factory Reset)
                  </motion.button>
                </div>
              </div>

              {/* Card 3: Backup & Restore */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 14,
                padding: '18px 20px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Download size={16} color="var(--gold)" /> 💾 ડેટા બેકઅપ ડાઉનલોડ & રિસ્ટોર (Backup & Restore)
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                      ડેટા સાફ કરતા પહેલા જો તમારે બેકઅપ ફાઈલ સેવ કરવી હોય તો ડાઉનલોડ કરી શકો છો.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <motion.button
                      className="btn btn-ghost btn-sm"
                      onClick={handleExportBackup}
                      whileTap={{ scale: 0.97 }}
                    >
                      <Download size={14} /> Download Backup (.json)
                    </motion.button>
                    <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
                      <Upload size={14} /> Restore Backup
                      <input
                        type="file"
                        accept=".json"
                        style={{ display: 'none' }}
                        onChange={handleImportBackup}
                      />
                    </label>
                  </div>
                </div>
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

      {/* Reset Confirmation Modal */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => { if (!isResetting) setResetModalOpen(false); }}
        title={
          resetMode === 'factory_reset'
            ? '⚡ કન્ફર્મ: ૧૦૦% સંપૂર્ણ ફેક્ટરી રીસેટ?'
            : '🧹 કન્ફર્મ: બધા ટેસ્ટ બિલો & ગ્રાહકો સાફ કરવા છે?'
        }
        footer={
          <>
            <button
              className="btn btn-ghost"
              onClick={() => setResetModalOpen(false)}
              disabled={isResetting}
            >
              Cancel (રદ કરો)
            </button>
            <motion.button
              className="btn"
              style={{
                background: resetMode === 'factory_reset' ? '#7f1d1d' : '#e11d48',
                color: '#fff',
                fontWeight: 800,
                minWidth: 160
              }}
              onClick={handleExecuteReset}
              disabled={isResetting}
              whileTap={{ scale: 0.97 }}
            >
              {isResetting ? (
                <>
                  <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> ડેટા સાફ થઈ રહ્યો છે…
                </>
              ) : (
                <>
                  <Check size={16} /> હા, ડેટા સાફ કરો (Yes, Clear Data)
                </>
              )}
            </motion.button>
          </>
        }
      >
        <div style={{ padding: '8px 0' }}>
          <div style={{
            background: '#fee2e2',
            border: '1px solid #f87171',
            borderRadius: 10,
            padding: '14px 16px',
            marginBottom: 16,
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start'
          }}>
            <AlertTriangle size={24} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 800, color: '#991b1b', fontSize: 14 }}>
                {resetMode === 'factory_reset'
                  ? 'ચેતવણી: આનાથી તમામ કસ્ટમ સેટિંગ્સ અને ડેટા ફેક્ટરી ડીફોલ્ટ પર રીસેટ થશે!'
                  : 'ચેતવણી: તમામ ટેસ્ટિંગ ઇન્વોઇસ, કસ્ટમર્સ અને રોજમેળ કાયમ માટે સાફ થઈ જશે!'}
              </div>
              <div style={{ fontSize: 12.5, color: '#7f1d1d', marginTop: 4, lineHeight: 1.5 }}>
                આ પ્રક્રિયા પછી તમે નવેસરથી તમારા રિયલ ગ્રાહકો અને બિલો (Invoice #1001 થી) બનાવી શકશો.
              </div>
            </div>
          </div>

          <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
            {resetMode === 'factory_reset' ? (
              <p>
                તમામ લોકલ ડેટા અને કસ્ટમ ફેરફારો ક્લીન થઈને એપ <b>ઓરિજિનલ ફ્રેશ સ્થિતિમાં</b> રીસ્ટાર્ટ થશે.
              </p>
            ) : (
              <p>
                તમારો તમામ <b>પ્રોડક્ટ સ્ટોક (56 આઈટમ)</b>, <b>સર્વિસ રેટ કાર્ડ</b> અને <b>બ્રાઇડલ પેકેજ</b> સંપૂર્ણ સલામત રહેશે. માત્ર ટેસ્ટ બિલો, એપોઇન્ટમેન્ટ્સ અને ગ્રાહકો સાફ થશે.
              </p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
