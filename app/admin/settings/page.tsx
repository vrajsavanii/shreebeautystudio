'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save, Plus, Pencil, Trash2, Cloud, LogOut, RefreshCw, Copy, Play, Loader2, Send,
  Store, Scissors, Bell, CreditCard, MessageCircle, CloudCog, Mail, Sparkles, Calendar, CheckCircle2,
  AlertTriangle, AlertCircle, Download, Upload, RotateCcw, ShieldAlert, Check, Users, Receipt, Wallet, ShoppingBag, Heart, Package,
  Bot, Mic, MicOff, Keyboard, Volume2
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

type SettingsTab = 'profile' | 'services' | 'reminders' | 'billing' | 'loyalty' | 'whatsapp' | 'email' | 'calendar' | 'copilot' | 'cloud' | 'reset';

export default function SettingsPage() {
  const { data, updateData, cloudStatus, lastSynced } = useSalonStore();
  const { toast } = useToast();
  const s = data?.settings || {
    salon: 'Shree Beauty Studio',
    whatsapp: '919773240010',
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
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [statusResult, setStatusResult] = useState<{ connected: boolean; msg: string } | null>(null);

  const handleCheckStatus = async () => {
    setCheckingStatus(true);
    setStatusResult(null);
    try {
      const res = await fetch('/api/whatsapp/status');
      const json = await res.json();
      if (json.connected) {
        setStatusResult({
          connected: true,
          msg: `🟢 Live & Verified! Business: "${json.verifiedName || 'Shree Beauty Studio'}", Number: ${json.displayPhoneNumber || '+91 97732 40010'}, Quality: ${json.qualityRating || 'GREEN'}`
        });
        toast('🟢 Meta WhatsApp Cloud API is connected and verified!', 'success');
      } else {
        setStatusResult({
          connected: false,
          msg: `🔴 Disconnected: ${json.error || 'Token invalid or expired. Please paste permanent System User Access Token.'}`
        });
        toast(json.error || 'Meta API not connected', 'error');
      }
    } catch (err: any) {
      setStatusResult({ connected: false, msg: `Network error: ${err.message}` });
      toast('Failed to check status', 'error');
    } finally {
      setCheckingStatus(false);
    }
  };

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
          whatsappPhoneId: s.whatsappPhoneId,
          whatsappAccessToken: s.whatsappAccessToken,
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
          provider: s.emailProvider || 'gmail',
          apiKey: s.resendApiKey,
          fromEmail: s.resendFromEmail,
          smtpUser: s.smtpUser || 'shreebeauty.studio22@gmail.com',
          smtpPassword: s.smtpPassword,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast(`✅ Test email delivered to ${testEmailTo}!`, 'success');
      } else {
        const errLower = (data.error || '').toLowerCase();
        if (errLower.includes('only send testing emails') || errLower.includes('verify a domain')) {
          toast(
            '⚠️ Resend Sandbox Restriction: Testing sender can only send to ku2407u702@karnavatiuniversity.edu.in. Verify a domain at resend.com/domains to send to any address.',
            'error'
          );
        } else {
          toast(`❌ ${data.error || 'Failed to send test email'}`, 'error');
        }
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

  const [savingSettings, setSavingSettings] = useState(false);
  const [savedBadge, setSavedBadge] = useState(false);

  const update = (key: string, val: unknown) => {
    updateData((d) => ({ ...d, settings: { ...d.settings, [key]: val } }));
    scheduleSave();
  };

  const handleSaveSettings = async (customMsg?: string) => {
    setSavingSettings(true);
    scheduleSave();
    try {
      await cloudSync();
      setSavedBadge(true);
      setTimeout(() => setSavedBadge(false), 3500);
      toast(customMsg || '💾 સેટિંગ્સ સફળતાપૂર્વક કાયમી સેવ થઈ ગયા! (Saved & Synced to Cloud)', 'success');
    } catch {
      setSavedBadge(true);
      setTimeout(() => setSavedBadge(false), 3500);
      toast('💾 સેટિંગ્સ લોકલ સ્ટોરેજમાં સેવ થઈ ગયા!', 'success');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSave = () => {
    handleSaveSettings();
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
    { id: 'copilot', label: 'AI Copilot & Shortcut', icon: Bot },
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
                  placeholder="919773240010"
                />
              </div>
              <div className="form-group">
                <label className="label">Opening Time</label>
                <input type="time" step={900} className="input" value={s.open} onChange={(e) => update('open', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="label">Closing Time</label>
                <input type="time" step={900} className="input" value={s.close} onChange={(e) => update('close', e.target.value)} />
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
            <div className="form-grid" style={{ marginTop: 14 }}>
              <div className="form-group">
                <label className="label">📸 Instagram Account Handle</label>
                <input
                  type="text"
                  className="input"
                  value={s.instagramHandle || '@shreebeauty.studio'}
                  onChange={(e) => {
                    const handle = e.target.value;
                    update('instagramHandle', handle);
                    const cleanHandle = handle.replace('@', '').trim();
                    if (cleanHandle) {
                      update('instagramUrl', `https://www.instagram.com/${cleanHandle}/`);
                    }
                  }}
                  placeholder="@shreebeauty.studio"
                />
                <span style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3 }}>
                  Appears in customer footer, booking passes, WhatsApp and email templates.
                </span>
              </div>
              <div className="form-group">
                <label className="label">📍 Google Maps Link (Redirection & Reviews)</label>
                <input
                  type="url"
                  className="input"
                  value={s.googleMapsUrl || 'https://maps.app.goo.gl/cwP9HTnqTFzVPYDW8'}
                  onChange={(e) => update('googleMapsUrl', e.target.value)}
                  placeholder="https://maps.app.goo.gl/cwP9HTnqTFzVPYDW8"
                />
                <span style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3 }}>
                  Direct map redirection for clients to get GPS directions to the studio.
                </span>
              </div>
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
              <Link href="/admin/whatsapp" className="btn btn-primary btn-sm" style={{ textDecoration: 'none', background: '#25D366', color: '#053320', border: 'none', fontWeight: 800 }}>
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

                {/* Connection Status Checker */}
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #bbf7d0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <label className="label" style={{ color: '#166534', margin: 0, fontWeight: 800 }}>
                        🔍 Check Meta Cloud API Connection
                      </label>
                      <p style={{ fontSize: 11.5, color: '#15803d', margin: '2px 0 0' }}>
                        Verifies your Phone Number ID and Permanent Access Token with Meta Graph API in real-time.
                      </p>
                    </div>
                    <motion.button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleCheckStatus}
                      disabled={checkingStatus}
                      whileTap={{ scale: 0.97 }}
                      style={{ background: '#ffffff', borderColor: '#16a34a', color: '#166534', fontWeight: 700 }}
                    >
                      {checkingStatus ? (
                        <>
                          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                          Verifying…
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={14} /> Verify Meta Connection
                        </>
                      )}
                    </motion.button>
                  </div>

                  {statusResult && (
                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: 8,
                        fontSize: 12.5,
                        fontWeight: 600,
                        background: statusResult.connected ? '#dcfce7' : '#fef2f2',
                        color: statusResult.connected ? '#166534' : '#b91c1c',
                        border: `1px solid ${statusResult.connected ? '#86efac' : '#fecaca'}`,
                      }}
                    >
                      {statusResult.msg}
                    </div>
                  )}
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
                      placeholder="Enter 10-digit mobile (e.g. 9773240010)"
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
              <h2>📧 Email Configuration & Automation Engine</h2>
            </div>

            {/* Provider Selection Tabs */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => update('emailProvider', 'gmail')}
                style={{
                  background: (s.emailProvider || 'gmail') === 'gmail' ? '#05424A' : '#F1F5F9',
                  color: (s.emailProvider || 'gmail') === 'gmail' ? '#FFF' : '#334155',
                  fontWeight: 700,
                  padding: '9px 16px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>⭐ Gmail SMTP (Free &bull; No Domain Needed &bull; Up to 500/day)</span>
              </button>

              <button
                type="button"
                className="btn btn-sm"
                onClick={() => update('emailProvider', 'resend')}
                style={{
                  background: s.emailProvider === 'resend' ? '#05424A' : '#F1F5F9',
                  color: s.emailProvider === 'resend' ? '#FFF' : '#334155',
                  fontWeight: 700,
                  padding: '9px 16px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Resend Cloud API (Custom Domain)
              </button>
            </div>

            {/* Gmail SMTP Configuration Mode */}
            {(s.emailProvider || 'gmail') === 'gmail' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 24 }}>
                <div className="form-group">
                  <label className="label">Studio Gmail Address (Sender)</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="shreebeauty.studio22@gmail.com"
                    value={s.smtpUser || 'shreebeauty.studio22@gmail.com'}
                    onChange={(e) => update('smtpUser', e.target.value)}
                  />
                  <span style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4, display: 'block' }}>
                    All automated client receipts and booking confirmation emails will be sent from this Gmail address.
                  </span>
                </div>

                <div className="form-group">
                  <label className="label">Google 16-Character App Password</label>
                  <input
                    type="password"
                    className="input"
                    placeholder="abcd efgh ijkl mnop"
                    value={s.smtpPassword || ''}
                    onChange={(e) => update('smtpPassword', e.target.value)}
                  />
                  <span style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4, display: 'block' }}>
                    A 16-character code from your Google Account. Spaces are ignored automatically.
                  </span>
                </div>

                {/* Step-by-Step Instructions Box */}
                <div
                  style={{
                    background: '#F0FDF4',
                    border: '1.5px solid #BBF7D0',
                    borderRadius: 10,
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={16} color="#16A34A" />
                    <span>How to get your 16-character Google App Password (Takes 1 min):</span>
                  </div>
                  <ol style={{ margin: '4px 0 0 20px', padding: 0, fontSize: 12, color: '#14532D', lineHeight: 1.65 }}>
                    <li>
                      Go to your Google Account Security:{' '}
                      <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" style={{ color: '#05424A', fontWeight: 700, textDecoration: 'underline' }}>
                        myaccount.google.com/security
                      </a>{' '}
                      and ensure <strong>2-Step Verification</strong> is ON.
                    </li>
                    <li>
                      Open:{' '}
                      <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" style={{ color: '#05424A', fontWeight: 700, textDecoration: 'underline' }}>
                        myaccount.google.com/apppasswords
                      </a>.
                    </li>
                    <li>Enter App Name: <b>Shree Studio</b> and click <b>Create</b>.</li>
                    <li>Google will display a 16-letter password in a yellow box (e.g. <code>abcd efgh ijkl mnop</code>).</li>
                    <li>Paste that password into the field above and click <b>Save Settings</b>!</li>
                  </ol>
                  <div style={{ fontSize: 11.5, color: '#15803D', marginTop: 4, fontWeight: 600 }}>
                    ✨ Once saved, Vercel will send automated emails to any customer (Gmail, Yahoo, iCloud) with zero domain restrictions!
                  </div>
                </div>
              </div>
            )}

            {/* Resend API Configuration Mode */}
            {s.emailProvider === 'resend' && (
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

                {/* Notice regarding Resend Domain Verification */}
                <div
                  style={{
                    background: '#FFFBEB',
                    border: '1.5px solid #FCD34D',
                    borderRadius: 10,
                    padding: '14px 16px',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                  }}
                >
                  <AlertCircle size={20} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ fontSize: 12.5, color: '#92400E', lineHeight: 1.5 }}>
                    <strong>Important Notice for Automated Cloud Email Delivery:</strong>
                    <div style={{ marginTop: 4 }}>
                      • In Resend&apos;s free sandbox testing mode (using <code>onboarding@resend.dev</code>), Resend <strong>only</strong> delivers emails to the registered account email (<code>ku2407u702@karnavatiuniversity.edu.in</code>).
                    </div>
                    <div style={{ marginTop: 3 }}>
                      • To enable automated background cloud email delivery to <strong>all customer emails</strong> (like @gmail.com), add and verify your studio domain at{' '}
                      <a
                        href="https://resend.com/domains"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#05424A', fontWeight: 700, textDecoration: 'underline' }}
                      >
                        resend.com/domains
                      </a>{' '}
                      and update the <em>Sender Email Address (From)</em> above to match your domain (e.g. <code>Shree Beauty Studio &lt;info@shreebeautystudio.com&gt;</code>).
                    </div>
                    <div style={{ marginTop: 3 }}>
                      • For bills &amp; invoices during testing mode, the system also provides a 1-click <em>Open in Gmail Compose</em> button with pre-filled details!
                    </div>
                  </div>
                </div>
              </div>
            )}

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

            {/* Unified Google Calendar Card */}
            <div style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: 14, padding: 20, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0369a1', display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Calendar size={18} color="#0284c7" /> 📅 Google Calendar Auto-Save &amp; Reminders (એક જ સરળ સેટિંગ)
                  </h3>
                  <div style={{ fontSize: 12.5, color: '#0369a1', marginTop: 4 }}>
                    બધી નવી અપોઇન્ટમેન્ટ્સ અને બ્રાઇડલ બુકિંગ્સ ૧-ક્લિકમાં ગૂગલ કેલેન્ડરમાં સેવ કરો અને ઓટોમેટિક રિમાઇન્ડર મેળવો
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#0369a1', background: '#e0f2fe', padding: '4px 10px', borderRadius: 99, border: '1px solid #bae6fd' }}>
                  ⚡ 100% Direct Google Calendar Sync
                </span>
              </div>

              {/* Owner / Multi-Account Gmail */}
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="label" style={{ fontWeight: 700, fontSize: 12.5, color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Google Account / Gmail Addresses (Multi-Account Supported) *</span>
                  <span style={{ fontSize: 11, color: '#0284c7', fontWeight: 600 }}>Comma (,) થી અલગ કરો</span>
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. bhalanisandip@gmail.com, staff@gmail.com, studio@gmail.com"
                  value={s.googleCalendarOwnerEmail || ''}
                  onChange={(e) => update('googleCalendarOwnerEmail', e.target.value)}
                  style={{ background: '#fff', fontSize: 13, fontWeight: 600 }}
                />
                <span style={{ fontSize: 11.5, color: '#64748b', marginTop: 4, display: 'block' }}>
                  👥 <b>Multi-Account:</b> તમે એક કરતાં વધુ Gmail/Google Calendar emails અલ્પવિરામ (,) થી ઉમેરી શકો છો. બધી અપોઇન્ટમેન્ટ્સ આ બધા જ Google Accounts માં ઓટોમેટિક સિંક થશે.
                </span>

                {/* 💾 Prominent Save Button for Google Calendar Settings */}
                <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <motion.button
                    type="button"
                    onClick={() => handleSaveSettings('💾 Google Calendar એકાઉન્ટ્સ અને સેટિંગ્સ સફળતાપૂર્વક સેવ થઈ ગયા! (Saved & Synced)')}
                    disabled={savingSettings}
                    whileTap={{ scale: 0.96 }}
                    style={{
                      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '11px 22px',
                      borderRadius: 10,
                      fontSize: 13.5,
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      boxShadow: '0 4px 14px rgba(2,132,199,0.35)',
                    }}
                  >
                    {savingSettings ? (
                      <>
                        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> સેવ થઈ રહ્યું છે…
                      </>
                    ) : (
                      <>
                        <Save size={16} /> 💾 Save Google Calendar Settings (સેટિંગ્સ સેવ કરો)
                      </>
                    )}
                  </motion.button>

                  {savedBadge && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      style={{
                        background: '#dcfce7',
                        color: '#15803d',
                        border: '1.5px solid #86efac',
                        padding: '8px 14px',
                        borderRadius: 8,
                        fontSize: 12.5,
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: '0 2px 8px rgba(34,197,94,0.15)',
                      }}
                    >
                      <CheckCircle2 size={16} color="#16a34a" /> સેવ થઈ ગયું! (Saved Permanently)
                    </motion.span>
                  )}
                </div>
              </div>

              {/* Features List */}
              <div style={{ background: '#ffffff', border: '1px solid #bae6fd', borderRadius: 10, padding: 14, marginBottom: 16 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0369a1', marginBottom: 8 }}>
                  ✨ આ સેટિંગથી શું સુવિધા મળશે:
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#334155', lineHeight: 1.7 }}>
                  <li><b>ડાયરેક્ટ ૧-ક્લિક સેવ</b>: Appointment અને Bridal Booking માં સીધું <b>&quot;📅 Save to Google Calendar&quot;</b> બટન મળશે.</li>
                  <li><b>ઓટોમેટિક રિમાઇન્ડર</b>: નીચે સેટ કરેલા ટાઈમિંગ મુજબ તમારા ફોન અને ડેસ્કટોપ ગૂગલ કેલેન્ડરમાં ઓટો-નોટિફિકેશન આવશે.</li>
                  <li><b>WhatsApp લિંક</b>: ગ્રાહક અને સ્ટાફને મોકલાતા WhatsApp કન્ફર્મેશન મેસેજમાં ગૂગલ કેલેન્ડર લિંક ઓટોમેટિક સામેલ રહેશે.</li>
                </ul>
              </div>

              {/* Notification & Auto-Reminder Timing Customization */}
              <div style={{ background: '#ffffff', border: '1.5px solid #bae6fd', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                {(() => {
                  const r1 = s.calendarApptReminderMinutes1 !== undefined ? s.calendarApptReminderMinutes1 : 60;
                  const r2 = s.calendarApptReminderMinutes2 !== undefined ? s.calendarApptReminderMinutes2 : 1440;
                  const br1 = s.calendarBridalReminderMinutes1 !== undefined ? s.calendarBridalReminderMinutes1 : 1440;
                  const br2 = s.calendarBridalReminderMinutes2 !== undefined ? s.calendarBridalReminderMinutes2 : 120;
                  const areAllRemindersOff = r1 === 0 && r2 === 0 && br1 === 0 && br2 === 0 && s.calendarEmailReminderEnabled === false;

                  const handleToggleAllReminders = () => {
                    if (areAllRemindersOff) {
                      // Turn back ON to smart defaults
                      update('calendarApptReminderMinutes1', 60);
                      update('calendarApptReminderMinutes2', 1440);
                      update('calendarBridalReminderMinutes1', 1440);
                      update('calendarBridalReminderMinutes2', 120);
                      update('calendarEmailReminderEnabled', true);
                      toast('🔔 Google Calendar રિમાઇન્ડર ચાલુ કર્યા (Default Timings Restored)!', 'success');
                    } else {
                      // Turn completely OFF
                      update('calendarApptReminderMinutes1', 0);
                      update('calendarApptReminderMinutes2', 0);
                      update('calendarBridalReminderMinutes1', 0);
                      update('calendarBridalReminderMinutes2', 0);
                      update('calendarEmailReminderEnabled', false);
                      toast('🔕 બધા Google Calendar રિમાઇન્ડર સંપૂર્ણપણે બંધ (OFF) કરી દીધા છે!', 'info');
                    }
                  };

                  return (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0369a1', display: 'flex', alignItems: 'center', gap: 7 }}>
                          <Bell size={16} color="#0284c7" /> 🔔 Notification &amp; Auto-Reminder Timings (રિમાઇન્ડર કંટ્રોલ)
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              color: areAllRemindersOff ? '#991b1b' : '#0369a1',
                              background: areAllRemindersOff ? '#fee2e2' : '#e0f2fe',
                              padding: '3px 8px',
                              borderRadius: 6,
                              border: `1px solid ${areAllRemindersOff ? '#fca5a5' : '#bae6fd'}`,
                            }}
                          >
                            {areAllRemindersOff ? '🔕 રિમાઇન્ડર બંધ છે (OFF)' : '🔔 રિમાઇન્ડર ચાલુ છે (Active)'}
                          </span>
                          <motion.button
                            type="button"
                            onClick={handleToggleAllReminders}
                            whileTap={{ scale: 0.96 }}
                            style={{
                              fontSize: 11.5,
                              fontWeight: 800,
                              padding: '5px 12px',
                              borderRadius: 8,
                              border: areAllRemindersOff ? '1.5px solid #16a34a' : '1.5px solid #ef4444',
                              background: areAllRemindersOff ? '#dcfce7' : '#fef2f2',
                              color: areAllRemindersOff ? '#15803d' : '#dc2626',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                            }}
                          >
                            {areAllRemindersOff ? (
                              <>
                                <Bell size={13} color="#15803d" /> 🔔 બધા રિમાઇન્ડર ચાલુ કરો (Turn ON)
                              </>
                            ) : (
                              <>
                                <span>🔕</span> બધા રિમાઇન્ડર બંધ કરો (Turn OFF)
                              </>
                            )}
                          </motion.button>
                        </div>
                      </div>

                      <div style={{ fontSize: 12, color: '#475569', marginBottom: 14, lineHeight: 1.5 }}>
                        અપોઇન્ટમેન્ટ અને બ્રાઇડલ બુકિંગના કેટલા સમય પહેલા Google Calendar નોટિફિકેશન રિમાઇન્ડર આવવું જોઈએ તે પસંદ કરો (અથવા ઉપરના બટનથી બધા રિમાઇન્ડર ૧-ક્લિકમાં બંધ કરો):
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 14, marginBottom: 14 }}>
                        {/* Appointment Reminders */}
                        <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
                          <div style={{ fontWeight: 800, fontSize: 13, color: '#0f172a', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                            💅 Regular Appointment Reminders
                          </div>
                          
                          <div className="form-group" style={{ marginBottom: 10 }}>
                            <label className="label" style={{ fontSize: 11.5, fontWeight: 700, color: '#334155' }}>૧. પહેલું રિમાઇન્ડર (1st Notification)</label>
                            <select
                              className="input"
                              value={s.calendarApptReminderMinutes1 !== undefined ? s.calendarApptReminderMinutes1 : 60}
                              onChange={(e) => update('calendarApptReminderMinutes1', Number(e.target.value))}
                              style={{ fontSize: 12, background: '#fff', fontWeight: 600, color: (s.calendarApptReminderMinutes1 === 0) ? '#dc2626' : '#0f172a' }}
                            >
                              <option value={0}>❌ બંધ / કોઈ રિમાઇન્ડર નહીં (Off / None)</option>
                              <option value={15}>⏱️ 15 મિનિટ પહેલા (15 mins before)</option>
                              <option value={30}>⏱️ 30 મિનિટ પહેલા (30 mins before)</option>
                              <option value={45}>⏱️ 45 મિનિટ પહેલા (45 mins before)</option>
                              <option value={60}>⏰ 1 કલાક પહેલા (1 hour before - Default)</option>
                              <option value={120}>⏰ 2 કલાક પહેલા (2 hours before)</option>
                              <option value={180}>⏰ 3 કલાક પહેલા (3 hours before)</option>
                              <option value={1440}>📅 1 દિવસ પહેલા (24 hours before)</option>
                            </select>
                          </div>

                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="label" style={{ fontSize: 11.5, fontWeight: 700, color: '#334155' }}>૨. બીજું રિમાઇન્ડર (2nd Notification)</label>
                            <select
                              className="input"
                              value={s.calendarApptReminderMinutes2 !== undefined ? s.calendarApptReminderMinutes2 : 1440}
                              onChange={(e) => update('calendarApptReminderMinutes2', Number(e.target.value))}
                              style={{ fontSize: 12, background: '#fff', fontWeight: 600, color: (s.calendarApptReminderMinutes2 === 0) ? '#dc2626' : '#0f172a' }}
                            >
                              <option value={0}>❌ બંધ / કોઈ રિમાઇન્ડર નહીં (Off / None)</option>
                              <option value={30}>⏱️ 30 મિનિટ પહેલા (30 mins before)</option>
                              <option value={60}>⏰ 1 કલાક પહેલા (1 hour before)</option>
                              <option value={120}>⏰ 2 કલાક પહેલા (2 hours before)</option>
                              <option value={1440}>📅 1 દિવસ પહેલા (1 day before - Default)</option>
                              <option value={2880}>📅 2 દિવસ પહેલા (2 days before)</option>
                            </select>
                          </div>
                        </div>

                        {/* Bridal Reminders */}
                        <div style={{ background: '#fdf4ff', border: '1.5px solid #f5d0fe', borderRadius: 10, padding: 14 }}>
                          <div style={{ fontWeight: 800, fontSize: 13, color: '#86198f', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                            👑 Bridal Booking Reminders
                          </div>
                          
                          <div className="form-group" style={{ marginBottom: 10 }}>
                            <label className="label" style={{ fontSize: 11.5, fontWeight: 700, color: '#701a75' }}>૧. અગાઉનું રિમાઇન્ડર (Early Reminder)</label>
                            <select
                              className="input"
                              value={s.calendarBridalReminderMinutes1 !== undefined ? s.calendarBridalReminderMinutes1 : 1440}
                              onChange={(e) => update('calendarBridalReminderMinutes1', Number(e.target.value))}
                              style={{ fontSize: 12, background: '#fff', fontWeight: 600, color: (s.calendarBridalReminderMinutes1 === 0) ? '#dc2626' : '#0f172a' }}
                            >
                              <option value={0}>❌ બંધ / કોઈ રિમાઇન્ડર નહીં (Off / None)</option>
                              <option value={1440}>📅 1 દિવસ પહેલા (1 day before - Default)</option>
                              <option value={2880}>📅 2 દિવસ પહેલા (2 days before)</option>
                              <option value={4320}>📅 3 દિવસ પહેલા (3 days before)</option>
                              <option value={10080}>🗓️ 1 અઠવાડિયું પહેલા (7 days before)</option>
                            </select>
                          </div>

                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="label" style={{ fontSize: 11.5, fontWeight: 700, color: '#701a75' }}>૨. ઇવેન્ટના દિવસે રિમાઇન્ડર (Event Day Reminder)</label>
                            <select
                              className="input"
                              value={s.calendarBridalReminderMinutes2 !== undefined ? s.calendarBridalReminderMinutes2 : 120}
                              onChange={(e) => update('calendarBridalReminderMinutes2', Number(e.target.value))}
                              style={{ fontSize: 12, background: '#fff', fontWeight: 600, color: (s.calendarBridalReminderMinutes2 === 0) ? '#dc2626' : '#0f172a' }}
                            >
                              <option value={0}>❌ બંધ / કોઈ રિમાઇન્ડર નહીં (Off / None)</option>
                              <option value={60}>⏰ 1 કલાક પહેલા (1 hour before)</option>
                              <option value={120}>⏰ 2 કલાક પહેલા (2 hours before - Default)</option>
                              <option value={240}>⏰ 4 કલાક પહેલા (4 hours before)</option>
                              <option value={1440}>📅 1 દિવસ પહેલા (1 day before)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}

                {/* Email Reminder Toggle */}
                <label className="toggle-label" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 12 }}>
                  <input
                    type="checkbox"
                    checked={s.calendarEmailReminderEnabled !== false}
                    onChange={(e) => update('calendarEmailReminderEnabled', e.target.checked)}
                  />
                  <span>📧 સાથે Gmail / Email પર પણ ઇવેન્ટ રિમાઇન્ડર નોટિફિકેશન મેળવો (Also receive Email reminder)</span>
                </label>

                {/* Auto-Delete Past Calendar Events (Delete after 2 days) */}
                <div style={{ paddingTop: 12, borderTop: '1px dashed #bae6fd' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="label" style={{ fontSize: 12, fontWeight: 800, color: '#0369a1', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>🧹 Auto-Delete Past Calendar Events (પાછલી ઇવેન્ટ ઓટો-ડિલીટ)</span>
                    </label>
                    <select
                      className="input"
                      value={s.calendarDeletePastDays !== undefined ? s.calendarDeletePastDays : 2}
                      onChange={(e) => update('calendarDeletePastDays', Number(e.target.value))}
                      style={{ fontSize: 12.5, background: '#fff', fontWeight: 700, borderColor: '#38bdf8' }}
                    >
                      <option value={2}>🗑️ 2 દિવસ પછી આપમેળે ડીલીટ કરો (Auto-delete 2 days after event date - Default)</option>
                      <option value={1}>🗑️ 1 દિવસ પછી આપમેળે ડીલીટ કરો (Auto-delete after 1 day)</option>
                      <option value={3}>🗑️ 3 દિવસ પછી આપમેળે ડીલીટ કરો (Auto-delete after 3 days)</option>
                      <option value={7}>🗑️ 7 દિવસ પછી આપમેળે ડીલીટ કરો (Auto-delete after 7 days)</option>
                      <option value={30}>🗑️ 30 દિવસ પછી આપમેળે ડીલીટ કરો (Auto-delete after 30 days)</option>
                      <option value={0}>♾️ ક્યારેય ડીલીટ ના કરો / બધું રાખો (Keep all past events)</option>
                    </select>
                    <span style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
                      ઇવેન્ટ પતી ગયા પછી નિર્ધારિત દિવસો (૨ દિવસ) પછી તે તમારા કેલેન્ડરમાંથી આપમેળે હટી જશે જેથી કેલેન્ડર હંમેશાં ક્લીન રહે.
                    </span>
                  </div>
                </div>
              </div>

              {/* Optional Webhook for Background Cloud Push */}
              <details style={{ fontSize: 12, color: '#475569', background: '#fff', padding: '12px 14px', borderRadius: 10, border: '1px solid #cbd5e1', marginBottom: 14 }}>
                <summary style={{ cursor: 'pointer', fontWeight: 700, color: '#475569' }}>
                  ⚙️ Advanced Auto-Push Webhook (ઓપ્શનલ બેકગ્રાઉન્ડ સેવ URL)
                </summary>
                <div style={{ marginTop: 10 }}>
                  <label className="label" style={{ fontWeight: 700, fontSize: 11.5 }}>Google Apps Script / Cloud Webhook URL</label>
                  <input
                    type="url"
                    className="input"
                    placeholder="https://script.google.com/macros/s/.../exec"
                    value={s.googleCalendarWebhookUrl || ''}
                    onChange={(e) => update('googleCalendarWebhookUrl', e.target.value)}
                    style={{ background: '#fff', fontSize: 12, marginBottom: 8 }}
                  />
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={handleCopyScriptCode}
                      style={{ fontSize: 11, padding: '3px 8px' }}
                    >
                      <Copy size={12} /> Copy Script Code
                    </button>
                    <a
                      href="https://script.google.com"
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 11, padding: '3px 8px', textDecoration: 'none' }}
                    >
                      Open script.google.com ↗
                    </a>
                  </div>
                </div>
              </details>
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

        {/* AI Voice Copilot & Shortcut Tab */}
        {activeTab === 'copilot' && (
          <motion.div key="copilot" variants={fadeSlideUp} initial="hidden" animate="visible" exit="exit" className="card" style={{ padding: 24 }}>
            <div className="card-head" style={{ padding: '0 0 16px', marginBottom: 18, borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, color: '#05424A' }}>
                    <Bot size={22} color="#05424A" /> 🤖 AI Voice Copilot &amp; Shortcut Controls
                  </h2>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                    ગુજરાતી અને હિન્દી વોઇસ આસિસ્ટન્ટ, કીબોર્ડ શોર્ટકટ (Ctrl+K) અને ફ્લોટિંગ બટનનું સંપૂર્ણ નિયંત્રણ (ON / OFF)
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: 99,
                      background: s.aiCopilotEnabled !== false ? '#dcfce7' : '#f1f5f9',
                      color: s.aiCopilotEnabled !== false ? '#15803d' : '#64748b',
                      border: `1px solid ${s.aiCopilotEnabled !== false ? '#86efac' : '#cbd5e1'}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: s.aiCopilotEnabled !== false ? '#22c55e' : '#94a3b8',
                      }}
                    />
                    {s.aiCopilotEnabled !== false ? 'AI Copilot Active' : 'Copilot Disabled'}
                  </span>
                </div>
              </div>
            </div>

            {/* 1. Master Switch Card */}
            <div
              style={{
                background: s.aiCopilotEnabled !== false ? 'linear-gradient(135deg, #032B30 0%, #05424A 100%)' : '#f8fafc',
                color: s.aiCopilotEnabled !== false ? '#ffffff' : '#1e293b',
                border: s.aiCopilotEnabled !== false ? '1.5px solid #EABA38' : '1.5px solid #e2e8f0',
                borderRadius: 14,
                padding: '20px 22px',
                marginBottom: 20,
                boxShadow: s.aiCopilotEnabled !== false ? '0 6px 20px rgba(3,43,48,0.25)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, maxWidth: 580 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: s.aiCopilotEnabled !== false ? 'rgba(234, 186, 56, 0.22)' : '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Sparkles size={22} color={s.aiCopilotEnabled !== false ? '#EABA38' : '#64748b'} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.2 }}>
                    🤖 Master AI Voice Copilot Switch (મુખ્ય ચાલુ / બંધ સ્વિચ)
                  </div>
                  <div style={{ fontSize: 12.5, opacity: 0.88, marginTop: 3, lineHeight: 1.45 }}>
                    જો તમે આ બંધ કરશો તો આખા સલૂન સોફ્ટવેરમાંથી AI Copilot, તેનું ફ્લોટિંગ બટન અને કીબોર્ડ શોર્ટકટ સંપૂર્ણપણે બંધ થઈ જશે.
                  </div>
                </div>
              </div>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: 14,
                  background: s.aiCopilotEnabled !== false ? 'rgba(255,255,255,0.15)' : '#fff',
                  padding: '8px 16px',
                  borderRadius: 99,
                  border: s.aiCopilotEnabled !== false ? '1px solid rgba(255,255,255,0.25)' : '1px solid #cbd5e1',
                }}
              >
                <input
                  type="checkbox"
                  checked={s.aiCopilotEnabled !== false}
                  onChange={(e) => update('aiCopilotEnabled', e.target.checked)}
                  style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#EABA38' }}
                />
                <span>{s.aiCopilotEnabled !== false ? 'ચાલુ છે (ENABLED)' : 'બંધ છે (DISABLED)'}</span>
              </label>
            </div>

            {/* 2. Sub Controls & Shortcuts Toggles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
              
              {/* Toggle 1: Keyboard Shortcut (Ctrl+K) */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: 12,
                  padding: 18,
                  opacity: s.aiCopilotEnabled !== false ? 1 : 0.5,
                  pointerEvents: s.aiCopilotEnabled !== false ? 'auto' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Keyboard size={17} color="#05424A" /> ⌨️ Ctrl+K Keyboard Shortcut
                  </div>
                  <input
                    type="checkbox"
                    checked={s.aiCopilotShortcutEnabled !== false}
                    onChange={(e) => update('aiCopilotShortcutEnabled', e.target.checked)}
                    style={{ width: 17, height: 17, cursor: 'pointer', accentColor: '#05424A' }}
                  />
                </div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, marginBottom: 10 }}>
                  કીબોર્ડ પરથી ગમે ત્યારે <b>Ctrl + K</b> (અથવા Mac પર <b>Cmd + K</b>) દબાવીને AI Copilot સીધું જ ઓપન કરો.
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#e2e8f0', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, color: '#334155' }}>
                  <span>શોર્ટકટ:</span>
                  <kbd style={{ background: '#0f172a', color: '#fef08a', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace' }}>Ctrl</kbd> + <kbd style={{ background: '#0f172a', color: '#fef08a', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace' }}>K</kbd>
                </div>
              </div>

              {/* Toggle 2: Floating Button on Bottom-Right */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: 12,
                  padding: 18,
                  opacity: s.aiCopilotEnabled !== false ? 1 : 0.5,
                  pointerEvents: s.aiCopilotEnabled !== false ? 'auto' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Sparkles size={17} color="#EABA38" /> ✨ Floating Screen Button
                  </div>
                  <input
                    type="checkbox"
                    checked={s.aiCopilotFloatingBtn !== false}
                    onChange={(e) => update('aiCopilotFloatingBtn', e.target.checked)}
                    style={{ width: 17, height: 17, cursor: 'pointer', accentColor: '#05424A' }}
                  />
                </div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, marginBottom: 10 }}>
                  સ્ક્રીનના નીચેના જમણા ખૂણે દેખાતું ગોલ્ડ-ટીલ <b>&quot;AI Copilot&quot;</b> બટન દર્શાવવું કે છુપાવવું.
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: s.aiCopilotFloatingBtn !== false ? '#15803d' : '#94a3b8',
                    background: s.aiCopilotFloatingBtn !== false ? '#dcfce7' : '#f1f5f9',
                    padding: '2px 8px',
                    borderRadius: 4,
                  }}
                >
                  {s.aiCopilotFloatingBtn !== false ? '🔘 બટન દેખાશે (Visible)' : '🚫 બટન છુપાયેલું રહેશે (Hidden)'}
                </span>
              </div>

              {/* Toggle 3: Auto Voice Listening on Open */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: 12,
                  padding: 18,
                  opacity: s.aiCopilotEnabled !== false ? 1 : 0.5,
                  pointerEvents: s.aiCopilotEnabled !== false ? 'auto' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Mic size={17} color="#dc2626" /> 🎙️ Auto-Listen on Open
                  </div>
                  <input
                    type="checkbox"
                    checked={!!s.aiCopilotAutoVoice}
                    onChange={(e) => update('aiCopilotAutoVoice', e.target.checked)}
                    style={{ width: 17, height: 17, cursor: 'pointer', accentColor: '#05424A' }}
                  />
                </div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, marginBottom: 10 }}>
                  જ્યારે પણ શોર્ટકટ કે બટનથી Copilot ઓપન થાય, ત્યારે માઇક્રોફોન આપોઆપ ચાલુ થઈને તમારો અવાજ સાંભળવાનું શરૂ કરે.
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: s.aiCopilotAutoVoice ? '#15803d' : '#64748b',
                    background: s.aiCopilotAutoVoice ? '#dcfce7' : '#f1f5f9',
                    padding: '2px 8px',
                    borderRadius: 4,
                  }}
                >
                  {s.aiCopilotAutoVoice ? '🎙️ ઓટો-માઇક ચાલુ' : '🖐️ મેન્યુઅલ માઇક ક્લિક'}
                </span>
              </div>

              {/* Toggle 4: Voice Spoken Replies (TTS) */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: 12,
                  padding: 18,
                  opacity: s.aiCopilotEnabled !== false ? 1 : 0.5,
                  pointerEvents: s.aiCopilotEnabled !== false ? 'auto' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Volume2 size={17} color="#2563eb" /> 🔊 Spoken Voice Replies
                  </div>
                  <input
                    type="checkbox"
                    checked={s.aiCopilotVoiceReplies !== false}
                    onChange={(e) => update('aiCopilotVoiceReplies', e.target.checked)}
                    style={{ width: 17, height: 17, cursor: 'pointer', accentColor: '#05424A' }}
                  />
                </div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, marginBottom: 10 }}>
                  AI Copilot તમારું કામ પૂરું થયા પછી ગુજરાતી / હિન્દી / અંગ્રેજી અવાજમાં બોલીને કન્ફર્મેશન આપશે.
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: s.aiCopilotVoiceReplies !== false ? '#1d4ed8' : '#64748b',
                    background: s.aiCopilotVoiceReplies !== false ? '#dbeafe' : '#f1f5f9',
                    padding: '2px 8px',
                    borderRadius: 4,
                  }}
                >
                  {s.aiCopilotVoiceReplies !== false ? '🔊 વોઇસ સ્પીકર ચાલુ' : '🔇 મ્યૂટ'}
                </span>
              </div>
            </div>

            {/* 3. Voice Commands & Capabilities Cheat Sheet */}
            <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 14, padding: 18, marginBottom: 16 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#166534', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                🗣️ તમે Copilot માં શું શું બોલીને કામ કરાવી શકો છો (Voice Commands Cheat Sheet):
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, fontSize: 12, color: '#14532d' }}>
                <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: 8, border: '1px solid #86efac' }}>
                  <b>💅 Appointment બુક કરો:</b><br />
                  &quot;સંદીપ ની કાલે બપોરે 2 વાગ્યે હેર કટ ની અપોઇન્ટમેન્ટ બુક કરો&quot;
                </div>
                <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: 8, border: '1px solid #86efac' }}>
                  <b>💸 રોજમેળ / ખર્ચ લખો:</b><br />
                  &quot;ચા-નાસ્તા ના 250 રૂપિયા રોજમેળ માં લખો&quot;
                </div>
                <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: 8, border: '1px solid #86efac' }}>
                  <b>💍 Bridal Booking:</b><br />
                  &quot;પૂજા નું 25 ઓક્ટોબર ના રોજ એન્ગેજમેન્ટ મેકઅપ પેકેજ બુક કરો&quot;
                </div>
                <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: 8, border: '1px solid #86efac' }}>
                  <b>📲 WhatsApp &amp; PDF:</b><br />
                  &quot;બ્રાઇડલ રેટ કાર્ડ મોકલો 9601014899 પર&quot;
                </div>
              </div>
            </div>

            {/* Bottom Save Action */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <motion.button
                className="btn btn-primary"
                onClick={handleSave}
                whileTap={{ scale: 0.97 }}
                style={{ background: '#05424A', borderColor: '#05424A', fontWeight: 700 }}
              >
                <Save size={15} /> Save AI Copilot Settings
              </motion.button>
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
                      <li>તમામ <b>સ્ટાફ સભ્યો</b> (Amita, Bhavna, વગેરે)</li>
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

      {/* 💾 Universal Save Bar across all Settings Tabs */}
      <div
        style={{
          marginTop: 20,
          background: '#ffffff',
          borderRadius: 14,
          padding: '14px 20px',
          border: '1.5px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: cloudStatus === 'saved' ? '#16a34a' : cloudStatus === 'syncing' ? '#0284c7' : '#94a3b8',
            }}
          />
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
              Cloud &amp; Local Storage Sync Active
            </div>
            <div style={{ fontSize: 11.5, color: '#64748b' }}>
              તમારા તમામ ફેરફારો ઓટોમેટિક લોકલ સ્ટોરેજ અને Supabase ક્લાઉડમાં સુરક્ષિત રહે છે.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {savedBadge && (
            <motion.span
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              style={{
                background: '#dcfce7',
                color: '#15803d',
                border: '1px solid #86efac',
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <CheckCircle2 size={14} color="#16a34a" /> Saved &amp; Synced!
            </motion.span>
          )}

          <motion.button
            type="button"
            className="btn btn-primary"
            onClick={() => handleSaveSettings()}
            disabled={savingSettings}
            whileTap={{ scale: 0.96 }}
            style={{
              background: 'linear-gradient(135deg, #05424A 0%, #075e54 100%)',
              color: '#ffffff',
              border: 'none',
              padding: '10px 22px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 800,
              boxShadow: '0 4px 14px rgba(5,66,74,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {savingSettings ? (
              <>
                <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> સેવ થઈ રહ્યું છે…
              </>
            ) : (
              <>
                <Save size={15} /> 💾 Save All Settings (સેટિંગ્સ સેવ કરો)
              </>
            )}
          </motion.button>
        </div>
      </div>

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
