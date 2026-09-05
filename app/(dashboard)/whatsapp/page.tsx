'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  ExternalLink,
  Send,
  Copy,
  Users,
  Calendar,
  Gift,
  Star,
  Clock,
  Sparkles,
  Receipt,
  CheckCircle2,
  Phone,
  Search,
  Bot,
  Flame,
  UserCheck,
  ShieldCheck,
  CheckCheck,
  Smartphone,
  Globe,
  Download,
  Settings,
} from 'lucide-react';
import { useSalonStore } from '@/lib/store';
import { useToast } from '@/components/ui/Toast';
import { money, fmtDate, todayISO } from '@/lib/utils';
import { downloadInvoicePDF, sendInvoicePDFViaWhatsApp } from '@/lib/invoice-pdf';
import { downloadBridalRateCardPDF, sendBridalRateCardPDFViaWhatsApp } from '@/lib/bridal-pdf';
import {
  sendDirectWhatsAppMessage,
  openWA,
  openWAWeb,
  openWAApp,
  invoiceMessage,
  appointmentCustomerMessage,
  birthdayMessage,
  anniversaryMessage,
  sagaiAnniversaryMessage,
  reviewRequestMessage,
  paymentReminderMessage,
  loyaltyBalanceMessage,
  festivalPromoMessage,
  bridalMessage,
} from '@/lib/whatsapp';
import TodayWishesBanner from '@/components/wishes/TodayWishesBanner';
import { staggerContainer, fadeSlideUp } from '@/variants';
import { format } from 'date-fns';

type WATab = 'composer' | 'broadcast' | 'incoming';
type TemplateId =
  | 'custom'
  | 'appointment'
  | 'invoice'
  | 'birthday'
  | 'anniversary'
  | 'review'
  | 'payment'
  | 'loyalty'
  | 'festival'
  | 'bridal';

export default function WhatsAppHubPage() {
  const router = useRouter();
  const { data, updateData } = useSalonStore();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<WATab>('composer');

  // Composer Form State
  const [targetPhone, setTargetPhone] = useState('');
  const [targetName, setTargetName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('appointment');
  const [customText, setCustomText] = useState('');
  const [promoOffer, setPromoOffer] = useState('Flat 20% OFF on all Hair Spa & Hydra Facials this week! ✨');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [selectedApptId, setSelectedApptId] = useState('');
  const [preferWeb, setPreferWeb] = useState(true);

  // Broadcast Client Filter State
  const [broadcastFilter, setBroadcastFilter] = useState<
    'all' | 'vip' | 'inactive' | 'birthdays' | 'anniversaries' | 'dues'
  >('all');
  const [broadcastSearch, setBroadcastSearch] = useState('');

  // Simulator State
  const [simText, setSimText] = useState('Kal 4 baje haircut book karvu chhe Pooja Patel');
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);

  const salon = data?.settings?.salon || 'Shree Beauty Studio';
  const address = data?.settings?.address || 'Surat, Gujarat';
  const salonPhone = data?.settings?.whatsapp || '919824183769';

  const customers = data?.customers || [];
  const appointments = data?.appointments || [];
  const invoices = data?.invoices || [];

  const currentMonth = new Date().getMonth() + 1;

  // Enrich customers with spend and visit stats for broadcast segmentation
  const enrichedCustomers = useMemo(() => {
    return customers.map((c) => {
      const custInvs = invoices.filter((i) => i.mobile === c.mobile);
      const totalSpend = custInvs.reduce((s, i) => s + Number(i.total || 0), 0);
      const balanceDue = custInvs.reduce((s, i) => s + Number(i.balance || 0), 0);
      const lastVisit = custInvs.sort((a, b) => b.date.localeCompare(a.date))[0]?.date || '';
      return {
        ...c,
        totalSpend,
        balanceDue,
        lastVisit,
        visitCount: custInvs.length,
      };
    });
  }, [customers, invoices]);

  // Segmented broadcast lists
  const filteredBroadcastClients = useMemo(() => {
    const q = broadcastSearch.toLowerCase();
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysStr = format(thirtyDaysAgo, 'yyyy-MM-dd');

    return enrichedCustomers.filter((c) => {
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.mobile.includes(q) ||
        (c.notes && c.notes.toLowerCase().includes(q));
      if (!matchSearch) return false;

      if (broadcastFilter === 'vip') return c.totalSpend >= 5000 || c.visitCount >= 3;
      if (broadcastFilter === 'inactive') return c.lastVisit && c.lastVisit < thirtyDaysStr;
      if (broadcastFilter === 'dues') return c.balanceDue > 0;
      if (broadcastFilter === 'birthdays') {
        if (!c.birthday) return false;
        return new Date(c.birthday).getMonth() + 1 === currentMonth;
      }
      if (broadcastFilter === 'anniversaries') {
        if (!c.anniversary) return false;
        return new Date(c.anniversary).getMonth() + 1 === currentMonth;
      }
      return true;
    });
  }, [enrichedCustomers, broadcastFilter, broadcastSearch, currentMonth]);

  // Generate live message preview text based on selected template
  const generatedMessage = useMemo(() => {
    const clientName = targetName.trim() || 'Valued Client';

    if (selectedTemplate === 'appointment') {
      const appt = appointments.find((a) => a.id === selectedApptId) || {
        customer: clientName,
        date: todayISO(),
        time: '04:00 PM',
        service: 'Hydra Deep Cleanse Facial & Hair Spa',
        staff: 'Pooja',
      };
      return appointmentCustomerMessage(appt as any, salon, address);
    }

    if (selectedTemplate === 'invoice') {
      const inv = invoices.find((i) => i.id === selectedInvoiceId) ||
        invoices[0] || {
          no: 'INV-1001',
          date: todayISO(),
          customer: clientName,
          subtotal: 2500,
          total: 2500,
          paid: 2500,
          balance: 0,
          lines: [{ name: 'O3+ Bridal Glow Facial', qty: 1, price: 2100, type: 'S' }],
        };
      return invoiceMessage(inv as any, salon);
    }

    if (selectedTemplate === 'birthday') {
      return birthdayMessage(clientName, salon);
    }

    if (selectedTemplate === 'anniversary') {
      return anniversaryMessage(clientName, salon);
    }

    if (selectedTemplate === 'review') {
      const reviewUrl = data?.settings?.googleReviewLink || 'https://g.page/r/shree-beauty/review';
      return reviewRequestMessage(clientName, salon, reviewUrl);
    }

    if (selectedTemplate === 'payment') {
      const custObj = enrichedCustomers.find((c) => c.mobile === targetPhone);
      const due = custObj ? custObj.balanceDue : 1200;
      return paymentReminderMessage(clientName, due, salon, '9824183769@okaxis');
    }

    if (selectedTemplate === 'loyalty') {
      const custObj = customers.find((c) => c.mobile === targetPhone);
      const pts = custObj?.loyaltyPoints || 150;
      const wallet = custObj?.walletBalance || 500;
      return loyaltyBalanceMessage(clientName, pts, wallet, salon);
    }

    if (selectedTemplate === 'festival') {
      return festivalPromoMessage(clientName, promoOffer, salon);
    }

    if (selectedTemplate === 'bridal') {
      return bridalMessage(clientName, 'Wedding Day Makeup & Draping', todayISO(), 'Katargam Community Hall, Surat', salon);
    }

    return customText || `Hello ${clientName}!\nGreetings from ${salon}. How may we assist you today? 🌸`;
  }, [
    selectedTemplate,
    targetName,
    targetPhone,
    selectedApptId,
    selectedInvoiceId,
    promoOffer,
    customText,
    appointments,
    invoices,
    customers,
    enrichedCustomers,
    salon,
    address,
    data?.settings?.googleReviewLink,
  ]);

  const handleSelectCustomer = (mob: string) => {
    const trimmed = mob.trim();
    setTargetPhone(trimmed);
    const c = customers.find(
      (x) => x.mobile === trimmed || x.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (c) {
      setTargetPhone(c.mobile);
      setTargetName(c.name);
    }
  };

  const handleSelectCustomerName = (name: string) => {
    const trimmed = name.trim();
    setTargetName(trimmed);
    const c = customers.find(
      (x) => x.name.toLowerCase() === trimmed.toLowerCase() || x.mobile === trimmed
    );
    if (c) {
      setTargetPhone(c.mobile);
      setTargetName(c.name);
    }
  };

  const [sendingPDF, setSendingPDF] = useState(false);
  const [pdfSentStatus, setPdfSentStatus] = useState<string | null>(null);

  const handleSendInvoicePDF = async () => {
    const inv = invoices.find((i) => i.id === selectedInvoiceId) || invoices[0];
    if (!inv) {
      toast('No invoices found to send. Please create an invoice first.', 'error');
      return;
    }

    const targetInv: typeof inv = {
      ...inv,
      mobile: targetPhone || inv.mobile,
      customer: targetName || inv.customer,
    };

    if (!targetInv.mobile) {
      toast('Please enter a recipient mobile number.', 'error');
      return;
    }

    setSendingPDF(true);
    setPdfSentStatus(null);
    toast(`⏳ Sending Invoice PDF ${targetInv.no} via Meta WhatsApp API…`);

    try {
      const res = await sendInvoicePDFViaWhatsApp(targetInv, data);
      if (res.success) {
        toast(`✅ PDF Invoice ${targetInv.no} sent directly to ${targetInv.customer}'s WhatsApp via Meta API!`);
        setPdfSentStatus(`✅ PDF Sent successfully via Meta Cloud API!`);
      } else {
        toast(`❌ Failed to send PDF via Meta API: ${res.message}`, 'error');
      }
    } catch (err: any) {
      toast(`Error sending PDF: ${err?.message || 'Unknown error'}`, 'error');
    } finally {
      setSendingPDF(false);
    }
  };

  const handleSendBridalPDF = async () => {
    if (!targetPhone) {
      toast('Please enter or select a recipient mobile number.', 'error');
      return;
    }
    setSendingPDF(true);
    setPdfSentStatus(null);
    toast(`⏳ Sending Bridal Rate Card PDF to ${targetPhone} via Meta WhatsApp API…`);

    try {
      const res = await sendBridalRateCardPDFViaWhatsApp(data?.bridalPackages || [], targetPhone, targetName, data);
      if (res.success) {
        toast(`✅ Bridal Rate Card PDF sent directly to ${targetName || targetPhone}'s WhatsApp via Meta API!`);
        setPdfSentStatus(`✅ Bridal Rate Card PDF Sent successfully via Meta Cloud API!`);
      } else {
        toast(`❌ Failed to send PDF via Meta API: ${res.message}`, 'error');
      }
    } catch (err: any) {
      toast(`Error sending PDF: ${err?.message || 'Unknown error'}`, 'error');
    } finally {
      setSendingPDF(false);
    }
  };

  const handleSendMessage = async () => {
    if (!targetPhone) {
      toast('Please enter or select a recipient mobile number.', 'error');
      return;
    }
    if (selectedTemplate === 'invoice') {
      handleSendInvoicePDF();
      return;
    }
    if (selectedTemplate === 'bridal') {
      handleSendBridalPDF();
      return;
    }

    toast(`⏳ Sending WhatsApp message to ${targetName || targetPhone} via Meta Cloud API…`);
    const res = await sendDirectWhatsAppMessage(targetPhone, generatedMessage);
    if (res.success) {
      toast(`✅ WhatsApp message sent directly to ${targetName || targetPhone} via Meta Cloud API!`);
      setPdfSentStatus(`✅ Message Sent via Meta API!`);
    } else {
      toast(`❌ Error sending Meta WhatsApp API message: ${res.message}`, 'error');
    }
  };

  const handleDirectWebLaunch = () => {
    openWAWeb();
    toast('Opening WhatsApp Web in a new tab…');
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(generatedMessage);
    toast('Message copied to clipboard! Ready to paste into WhatsApp.');
  };

  // Run AI / Natural Language WhatsApp Bot Auto-Responder Simulator
  const handleRunSimulation = async () => {
    if (!simText.trim()) {
      toast('Please enter a sample WhatsApp customer message.', 'error');
      return;
    }
    setSimLoading(true);
    setSimResult(null);
    try {
      const res = await fetch('/api/whatsapp/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageText: simText,
          customerName: targetName || 'Priyanka Sharma',
          mobile: targetPhone || '9825123456',
        }),
      });
      const json = await res.json();
      setSimResult(json);
      if (json.success) {
        if (json.aiResponse?.replyText) {
          setCustomText(json.aiResponse.replyText);
        }
        if (json.aiResponse?.intent === 'BRIDAL_PDF') {
          setSelectedTemplate('bridal');
          toast('🤖 WhatsApp AI: Auto-Replied with 2-Page Bridal Rate Card PDF dispatch!');
        } else if (json.appointment) {
          toast(`🤖 WhatsApp AI: Appointment booked for ${json.appointment.customer} on ${json.appointment.date} at ${json.appointment.time}!`);
        } else {
          toast('🤖 WhatsApp AI: Replied to customer message!');
        }
      } else {
        toast(`Simulation: ${json.error || 'Failed'}`, 'error');
      }
    } catch (e: any) {
      toast(`Simulation failed: ${e.message}`, 'error');
    } finally {
      setSimLoading(false);
    }
  };

  return (
    <div>
      {/* WhatsApp Web Banner & Global Controls */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #05424a 0%, #0d626e 100%)',
          color: '#fff',
          padding: '18px 24px',
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          boxShadow: '0 8px 24px rgba(5,66,74,0.18)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: '#25D366',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(37,211,102,0.4)',
            }}
          >
            <MessageCircle size={28} color="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#fff' }}>
                Meta WhatsApp Cloud API Messenger
              </h2>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  background: '#22c55e',
                  color: '#ffffff',
                  padding: '2px 8px',
                  borderRadius: 99,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#ffffff',
                    display: 'inline-block',
                  }}
                />
                META API LIVE
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#d1fae5', opacity: 0.9 }}>
              Send invoices, booking confirmations, bridal PDFs &amp; automated reminders via Meta WhatsApp Cloud API directly.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => router.push('/settings')}
            style={{
              background: '#ffffff',
              color: '#05424a',
              fontWeight: 800,
              border: 'none',
              padding: '9px 16px',
              fontSize: 13,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              cursor: 'pointer',
            }}
          >
            <Settings size={15} /> Meta API Settings
          </button>
        </div>
      </div>

      {/* Today's Customer Celebrations & Wishes Banner */}
      <TodayWishesBanner />

      {/* Tabs */}
      <div className="tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'composer' ? 'active' : ''}`}
          onClick={() => setActiveTab('composer')}
        >
          <MessageCircle size={14} />
          <span>📱 Message Composer &amp; Templates</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'broadcast' ? 'active' : ''}`}
          onClick={() => setActiveTab('broadcast')}
        >
          <Users size={14} />
          <span>👥 Client Segments &amp; 1-Click Send</span>
          <span className="tab-badge">{enrichedCustomers.length}</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'incoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('incoming')}
        >
          <Bot size={14} />
          <span>🤖 AI WhatsApp Booking Webhook</span>
        </button>
      </div>

      {/* TAB 1: Composer & Live WhatsApp Preview */}
      {activeTab === 'composer' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(320px, 1fr)',
            gap: 16,
            alignItems: 'start',
          }}
        >
          {/* Left Column: Form & Template Selection */}
          <motion.div className="card" variants={fadeSlideUp} initial="hidden" animate="visible" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 800, color: 'var(--teal)' }}>
              1. Select Recipient &amp; Template
            </h3>

            {/* Recipient Input */}
            <div className="form-grid" style={{ marginBottom: 12 }}>
              <div className="form-group">
                <label className="label">Customer / Recipient Name</label>
                <input
                  type="text"
                  className="input"
                  list="wa-cust-names"
                  placeholder="e.g. Priya Patel"
                  value={targetName}
                  onChange={(e) => handleSelectCustomerName(e.target.value)}
                />
                <datalist id="wa-cust-names">
                  {customers.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} — 📞 {c.mobile}
                    </option>
                  ))}
                </datalist>
              </div>
              <div className="form-group">
                <label className="label">Mobile Number (10 digits) *</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="tel"
                    className="input"
                    placeholder="e.g. 9898012345"
                    list="wa-cust-mobiles"
                    value={targetPhone}
                    onChange={(e) => handleSelectCustomer(e.target.value)}
                  />
                  <datalist id="wa-cust-mobiles">
                    {customers.map((c) => (
                      <option key={c.id} value={c.mobile}>
                        {c.mobile} — 👤 {c.name}
                      </option>
                    ))}
                  </datalist>
                </div>
              </div>
            </div>

            {/* Template Selector Grid */}
            <div style={{ marginBottom: 14 }}>
              <label className="label" style={{ fontWeight: 700 }}>Choose Ready Salon Template:</label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: 8,
                }}
              >
                {[
                  { id: 'appointment', label: '📅 Booking Confirm', color: 'var(--teal)' },
                  { id: 'invoice', label: '🧾 Invoice Receipt', color: '#16a34a' },
                  { id: 'birthday', label: '🎂 Birthday Wish', color: '#e69a22' },
                  { id: 'anniversary', label: '💍 Anniversary Wish', color: '#9333ea' },
                  { id: 'review', label: '⭐ Google Review', color: '#3b6ff5' },
                  { id: 'payment', label: '💳 Payment Reminder', color: '#dc2626' },
                  { id: 'loyalty', label: '🌟 Points & Wallet', color: '#c49821' },
                  { id: 'bridal', label: '👰 Bridal Reminder', color: '#db2777' },
                  { id: 'festival', label: '🎉 Festive Promo', color: '#ea580c' },
                  { id: 'custom', label: '✍️ Custom Note', color: '#4b5563' },
                ].map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setSelectedTemplate(tpl.id as TemplateId)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: selectedTemplate === tpl.id ? `2px solid ${tpl.color}` : '1px solid var(--border)',
                      background: selectedTemplate === tpl.id ? `${tpl.color}15` : '#f8fafc',
                      color: selectedTemplate === tpl.id ? tpl.color : 'var(--text)',
                      fontWeight: selectedTemplate === tpl.id ? 800 : 500,
                      fontSize: 11.5,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Template Specific Options */}
            {selectedTemplate === 'appointment' && (
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="label">Link Specific Appointment (Optional):</label>
                <select
                  className="input"
                  value={selectedApptId}
                  onChange={(e) => {
                    setSelectedApptId(e.target.value);
                    const a = appointments.find((x) => x.id === e.target.value);
                    if (a) {
                      setTargetName(a.customer);
                      setTargetPhone(a.mobile);
                    }
                  }}
                >
                  <option value="">-- Latest / Sample Appointment --</option>
                  {appointments.slice(0, 10).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.customer} • {fmtDate(a.date)} {a.time} ({a.service})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedTemplate === 'invoice' && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 14, marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Receipt size={16} /> Direct WhatsApp PDF Invoice Dispatch
                  </div>
                  {selectedInvoiceId && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 11, padding: '2px 8px', color: '#15803d', fontWeight: 700 }}
                      onClick={async () => {
                        const inv = invoices.find((x) => x.id === selectedInvoiceId) || invoices[0];
                        if (inv) {
                          await downloadInvoicePDF(inv, data);
                          toast('✅ Official PDF Bill Downloaded!');
                        }
                      }}
                    >
                      <Download size={12} /> Download PDF
                    </button>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label className="label" style={{ fontSize: 11.5, color: '#15803d', fontWeight: 700 }}>Select Invoice to Send as PDF File:</label>
                  <select
                    className="input"
                    style={{ background: '#ffffff', borderColor: '#86efac' }}
                    value={selectedInvoiceId}
                    onChange={(e) => {
                      setSelectedInvoiceId(e.target.value);
                      const inv = invoices.find((x) => x.id === e.target.value);
                      if (inv) {
                        setTargetName(inv.customer);
                        setTargetPhone(inv.mobile);
                      }
                    }}
                  >
                    <option value="">-- Latest / Sample Invoice --</option>
                    {invoices.slice(0, 15).map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.no} • {inv.customer} ({money(inv.total)})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <motion.button
                    type="button"
                    className="btn btn-primary"
                    disabled={sendingPDF}
                    onClick={handleSendInvoicePDF}
                    style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, #16a34a, #15803d)',
                      borderColor: '#16a34a',
                      fontSize: 12.5,
                      fontWeight: 700,
                      padding: '9px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      boxShadow: '0 3px 10px rgba(22,163,74,0.25)',
                    }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Receipt size={15} /> {sendingPDF ? 'Generating & Sending PDF…' : '📄 Send PDF Bill via WhatsApp API'}
                  </motion.button>
                </div>

                {pdfSentStatus && (
                  <div style={{ fontSize: 11.5, color: '#15803d', fontWeight: 700, marginTop: 8, textAlign: 'center' }}>
                    {pdfSentStatus}
                  </div>
                )}
              </div>
            )}

            {selectedTemplate === 'bridal' && (
              <div style={{ background: '#fdf2f8', border: '1px solid #fbcfe8', borderRadius: 10, padding: 14, marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: '#9d174d', display: 'flex', alignItems: 'center', gap: 6 }}>
                    👑 Direct WhatsApp Bridal Rate Card PDF Dispatch
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: 11, padding: '2px 8px', color: '#be185d', fontWeight: 700 }}
                    onClick={async () => {
                      await downloadBridalRateCardPDF(data?.bridalPackages || [], data);
                      toast('✅ Official Bridal Rate Card PDF Downloaded!');
                    }}
                  >
                    <Download size={12} /> Download Rate Card PDF
                  </button>
                </div>

                <p style={{ fontSize: 11.5, color: '#be185d', margin: '0 0 10px', lineHeight: 1.4 }}>
                  Sends the 2-page official <b>Shree Beauty Studio Glamour Lounge Rate Card PDF</b> (Siders &amp; Bridal Packages with live prices) directly to customer&apos;s WhatsApp!
                </p>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <motion.button
                    type="button"
                    className="btn btn-primary"
                    disabled={sendingPDF}
                    onClick={handleSendBridalPDF}
                    style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, #db2777, #be185d)',
                      borderColor: '#db2777',
                      fontSize: 12.5,
                      fontWeight: 700,
                      padding: '9px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      boxShadow: '0 3px 10px rgba(219,39,119,0.25)',
                    }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Sparkles size={15} /> {sendingPDF ? 'Generating & Sending PDF…' : '📄 Send Bridal Rate Card PDF via WhatsApp API'}
                  </motion.button>
                </div>

                {pdfSentStatus && (
                  <div style={{ fontSize: 11.5, color: '#be185d', fontWeight: 700, marginTop: 8, textAlign: 'center' }}>
                    {pdfSentStatus}
                  </div>
                )}
              </div>
            )}

            {selectedTemplate === 'festival' && (
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="label">Festival Offer Text:</label>
                <textarea
                  className="input"
                  rows={2}
                  value={promoOffer}
                  onChange={(e) => setPromoOffer(e.target.value)}
                  placeholder="e.g. Flat 20% OFF on all Hair Spa & Facials!"
                />
              </div>
            )}

            {selectedTemplate === 'custom' && (
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="label">Custom Message Text:</label>
                <textarea
                  className="input"
                  rows={4}
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Type your personalized message here…"
                />
              </div>
            )}

            {/* Launch Settings */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                borderRadius: 10,
                background: '#f0fdf4',
                border: '1.5px solid #86efac',
                marginBottom: 16,
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: 13, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
                  🟢 Meta WhatsApp Cloud API — Direct Background Dispatch System
                </div>
                <div style={{ fontSize: 11, color: '#15803d', marginTop: 2 }}>
                  Zero browser popups, zero wa.me redirects. Sent directly to client WhatsApp chat via Meta API!
                </div>
              </div>
            </div>

            {/* Send Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <motion.button
                type="button"
                className="btn btn-primary"
                onClick={handleSendMessage}
                style={{ flex: 1, padding: '11px 16px', fontSize: 13, display: 'flex', justifyContent: 'center', gap: 6 }}
                whileTap={{ scale: 0.97 }}
              >
                <Send size={15} /> Send via Meta WhatsApp API
              </motion.button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleCopyMessage}
                title="Copy formatted text"
                style={{ padding: '11px 14px' }}
              >
                <Copy size={15} />
              </button>
            </div>
          </motion.div>

          {/* Right Column: Realistic WhatsApp Web Chat Preview Box */}
          <motion.div variants={fadeSlideUp} initial="hidden" animate="visible" style={{ position: 'sticky', top: 80 }}>
            <div
              style={{
                borderRadius: 14,
                overflow: 'hidden',
                boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                border: '1px solid #d1d7db',
                background: '#efeae2',
              }}
            >
              {/* WhatsApp Web Header */}
              <div
                style={{
                  background: '#005c4b',
                  color: '#fff',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: '#25D366',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: 15,
                  }}
                >
                  {targetName ? targetName[0].toUpperCase() : 'S'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {targetName || 'Customer / Recipient'}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.85 }}>
                    {targetPhone ? `+91 ${targetPhone}` : 'online • WhatsApp Web Preview'}
                  </div>
                </div>
                <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.15)', padding: '3px 8px', borderRadius: 6 }}>
                  WhatsApp Web
                </span>
              </div>

              {/* Chat Bubble Body */}
              <div
                style={{
                  padding: '20px 14px',
                  minHeight: 280,
                  maxHeight: 460,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ alignSelf: 'center', background: '#e1f5fe', padding: '4px 10px', borderRadius: 6, fontSize: 10.5, color: '#0284c7', fontWeight: 600 }}>
                  🔒 Messages are end-to-end encrypted
                </div>

                <div
                  style={{
                    alignSelf: 'flex-end',
                    background: '#d9fdd3',
                    borderRadius: '10px 0 10px 10px',
                    padding: '10px 14px',
                    maxWidth: '88%',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.13)',
                    color: '#111b21',
                    fontSize: 12.5,
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {selectedTemplate === 'invoice' && (
                    <div
                      style={{
                        background: '#ffffff',
                        border: '1px solid #bbf7d0',
                        borderRadius: 8,
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        marginBottom: 10,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      }}
                    >
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 8,
                          background: '#fee2e2',
                          color: '#dc2626',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: 11,
                        }}
                      >
                        PDF
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 12, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {(invoices.find((x) => x.id === selectedInvoiceId) || invoices[0])?.no || 'INVOICE'}.pdf
                        </div>
                        <div style={{ fontSize: 10.5, color: '#64748b' }}>
                          Official PDF Bill · 128 KB
                        </div>
                      </div>
                      <Receipt size={18} color="#16a34a" />
                    </div>
                  )}

                  {selectedTemplate === 'bridal' && (
                    <div
                      style={{
                        background: '#ffffff',
                        border: '1px solid #fbcfe8',
                        borderRadius: 8,
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        marginBottom: 10,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      }}
                    >
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 8,
                          background: '#fce7f3',
                          color: '#db2777',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: 11,
                        }}
                      >
                        PDF
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 12, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          Shree_Beauty_Studio_Bridal_Rate_Card.pdf
                        </div>
                        <div style={{ fontSize: 10.5, color: '#64748b' }}>
                          Official Glamour Lounge Rate Card · 2 Pages · 245 KB
                        </div>
                      </div>
                      <Sparkles size={18} color="#db2777" />
                    </div>
                  )}

                  {generatedMessage}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      gap: 4,
                      marginTop: 4,
                      fontSize: 10,
                      color: '#667781',
                    }}
                  >
                    <span>{format(new Date(), 'hh:mm a')}</span>
                    <CheckCheck size={13} color="#53bdeb" />
                  </div>
                </div>
              </div>

              {/* Mock Chat Input Footer */}
              <div
                style={{
                  background: '#f0f2f5',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  borderTop: '1px solid #e9edef',
                }}
              >
                <button
                  type="button"
                  onClick={handleSendMessage}
                  style={{
                    flex: 1,
                    background: '#25D366',
                    color: '#053320',
                    fontWeight: 700,
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 14px',
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    cursor: 'pointer',
                  }}
                >
                  <Send size={13} /> Click to Open &amp; Send in Web WhatsApp
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* TAB 2: Broadcast / Segmented Client Assistant */}
      {activeTab === 'broadcast' && (
        <motion.div className="card" variants={fadeSlideUp} initial="hidden" animate="visible" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
                👥 Segmented Client Outreach via WhatsApp
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                Filter client cohorts and reach out individually with 1 click to boost retention &amp; fill empty chairs.
              </p>
            </div>
            <div className="search-wrap" style={{ minWidth: 260 }}>
              <Search size={14} className="search-icon" />
              <input
                type="search"
                className="input"
                placeholder="Search name, mobile…"
                value={broadcastSearch}
                onChange={(e) => setBroadcastSearch(e.target.value)}
                style={{ padding: '6px 10px 6px 32px', fontSize: 12.5 }}
              />
            </div>
          </div>

          {/* Segment Filter Pills */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {[
              { id: 'all', label: 'All Clients', count: enrichedCustomers.length },
              { id: 'vip', label: '⭐ VIP Clients (Spend > ₹5k)', count: enrichedCustomers.filter((c) => c.totalSpend >= 5000).length },
              { id: 'inactive', label: '⏳ Inactive (>30 Days)', count: enrichedCustomers.filter((c) => c.lastVisit && new Date(c.lastVisit) < new Date(Date.now() - 30 * 86400000)).length },
              { id: 'birthdays', label: '🎂 Birthdays This Month', count: enrichedCustomers.filter((c) => c.birthday && new Date(c.birthday).getMonth() + 1 === currentMonth).length },
              { id: 'anniversaries', label: '💍 Anniversaries This Month', count: enrichedCustomers.filter((c) => c.anniversary && new Date(c.anniversary).getMonth() + 1 === currentMonth).length },
              { id: 'dues', label: '⚠️ Payment Dues Pending', count: enrichedCustomers.filter((c) => c.balanceDue > 0).length },
            ].map((seg) => (
              <button
                key={seg.id}
                type="button"
                onClick={() => setBroadcastFilter(seg.id as any)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 99,
                  border: broadcastFilter === seg.id ? '1.5px solid var(--teal)' : '1px solid var(--border)',
                  background: broadcastFilter === seg.id ? 'var(--teal)' : '#f8fafc',
                  color: broadcastFilter === seg.id ? '#fff' : 'var(--text)',
                  fontWeight: broadcastFilter === seg.id ? 700 : 500,
                  fontSize: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>{seg.label}</span>
                <span
                  style={{
                    fontSize: 10.5,
                    padding: '1px 6px',
                    borderRadius: 99,
                    background: broadcastFilter === seg.id ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                    color: broadcastFilter === seg.id ? '#fff' : 'var(--text)',
                  }}
                >
                  {seg.count}
                </span>
              </button>
            ))}
          </div>

          {/* Client Table with 1-Click WhatsApp Web Actions */}
          {filteredBroadcastClients.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 0' }}>
              <Users size={36} />
              <h3>No matching clients in this segment</h3>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Mobile</th>
                    <th>Visits &amp; Spend</th>
                    <th>Pending Due</th>
                    <th>Last Visit</th>
                    <th>1-Click WhatsApp Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBroadcastClients.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{c.name}</div>
                        {c.birthday && (
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>🎂 {fmtDate(c.birthday)}</div>
                        )}
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: 12 }}>+91 {c.mobile}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: 12.5 }}>{c.visitCount} visits</div>
                        <div style={{ color: 'var(--green)', fontSize: 11.5, fontWeight: 600 }}>
                          {money(c.totalSpend)}
                        </div>
                      </td>
                      <td>
                        {c.balanceDue > 0 ? (
                          <span style={{ color: 'var(--red)', fontWeight: 800, fontSize: 12 }}>
                            {money(c.balanceDue)}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--green)', fontSize: 11.5 }}>Cleared</span>
                        )}
                      </td>
                      <td style={{ fontSize: 12 }}>{c.lastVisit ? fmtDate(c.lastVisit) : '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-sm"
                            style={{
                              background: '#25D366',
                              color: '#053320',
                              border: 'none',
                              fontWeight: 700,
                              fontSize: 11.5,
                              padding: '5px 10px',
                              borderRadius: 6,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              cursor: 'pointer',
                            }}
                            onClick={() => {
                              const msg =
                                broadcastFilter === 'dues'
                                  ? paymentReminderMessage(c.name, c.balanceDue, salon)
                                  : broadcastFilter === 'birthdays'
                                  ? birthdayMessage(c.name, salon)
                                  : broadcastFilter === 'anniversaries'
                                  ? anniversaryMessage(c.name, salon)
                                  : festivalPromoMessage(c.name, promoOffer, salon);
                              toast(`⏳ Sending Meta API message to ${c.name}…`);
                              sendDirectWhatsAppMessage(c.mobile, msg).then((res) => {
                                if (res.success) toast(`✅ Sent to ${c.name} via Meta API!`);
                                else toast(`❌ ${res.message}`, 'error');
                              });
                            }}
                          >
                            <Send size={13} /> Send via Meta API
                          </button>

                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: 11, padding: '5px 8px' }}
                            onClick={() => {
                              setTargetName(c.name);
                              setTargetPhone(c.mobile);
                              setActiveTab('composer');
                              toast(`Loaded ${c.name} into message composer!`);
                            }}
                          >
                            Customize
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}

      {/* TAB 3: WhatsApp Webhook & AI Booking Simulator */}
      {activeTab === 'incoming' && (
        <motion.div variants={fadeSlideUp} initial="hidden" animate="visible" style={{ display: 'grid', gap: 16 }}>
          {/* Simulator Box */}
          <div className="card" style={{ padding: 22 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bot size={18} color="var(--teal)" /> Test AI Natural Language Booking
            </h3>
            <p style={{ margin: '0 0 14px', fontSize: 12.5, color: 'var(--muted)' }}>
              Type any booking message in English, Hindi, or Gujarati (as a customer would type on WhatsApp) to see how our webhook parses and books it instantly.
            </p>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                type="text"
                className="input"
                value={simText}
                onChange={(e) => setSimText(e.target.value)}
                placeholder="e.g. Kal 4 baje haircut book karvu chhe Pooja Patel"
                style={{ flex: 1, fontSize: 13 }}
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleRunSimulation}
                disabled={simLoading}
                style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Sparkles size={14} /> {simLoading ? 'Parsing…' : 'Simulate Booking'}
              </button>
            </div>

            {/* Quick Test Prompt Chips */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Quick samples:</span>
              {[
                'Kal 4 baje haircut book karvu chhe Pooja Patel',
                'Book bridal facial for tomorrow 11 am Ritu Shah',
                'Hair spa today evening 6pm for Anjali',
                'Full arms legs waxing on Friday 3:30 pm',
              ].map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => setSimText(sample)}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    padding: '3px 8px',
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  &ldquo;{sample}&rdquo;
                </button>
              ))}
            </div>

            {/* Simulation Result */}
            {simResult && (
              <div
                style={{
                  background: simResult.success ? '#f0fdf4' : '#fef2f2',
                  border: `1.5px solid ${simResult.success ? '#16a34a' : '#dc2626'}`,
                  borderRadius: 10,
                  padding: '12px 16px',
                  fontSize: 12.5,
                }}
              >
                <div style={{ fontWeight: 800, color: simResult.success ? '#15803d' : '#dc2626', marginBottom: 6 }}>
                  {simResult.success ? '✅ Booking Parsed Successfully!' : '❌ Parsing Error'}
                </div>
                {simResult.parsed && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
                    <div><b>👤 Customer:</b> {simResult.parsed.customerName}</div>
                    <div><b>💄 Service:</b> {simResult.parsed.service}</div>
                    <div><b>📅 Date:</b> {simResult.parsed.date}</div>
                    <div><b>⏰ Time:</b> {simResult.parsed.time}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Webhook Connection Guide */}
          <div className="card" style={{ padding: 22 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 800 }}>
              🔗 Meta WhatsApp Cloud API Credentials
            </h3>
            <div style={{ display: 'grid', gap: 12 }}>
              <div className="form-group">
                <label className="label">Webhook Callback URL</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    className="input"
                    readOnly
                    value={typeof window !== 'undefined' ? `${window.location.origin}/api/whatsapp/webhook` : '/api/whatsapp/webhook'}
                    style={{ fontFamily: 'monospace', fontSize: 12.5 }}
                  />
                  <button
                    type="button"
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
                    type="button"
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
          </div>
        </motion.div>
      )}
    </div>
  );
}
