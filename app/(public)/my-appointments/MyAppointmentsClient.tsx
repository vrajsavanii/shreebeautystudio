'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  Calendar,
  Clock,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  RotateCcw,
  Loader2,
  ShieldCheck,
  KeyRound,
  LogOut,
  Send,
  MessageCircle,
  Edit2,
  Check,
} from 'lucide-react';
import { useSalonStore } from '@/lib/store';
import { getAppointmentGoogleCalendarUrl } from '@/lib/calendar';
import { useCustomerAuth } from '@/lib/customer-context';
import PhoneEmailButton from '@/components/auth/PhoneEmailButton';

const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

function MyAppointmentsView() {
  const searchParams = useSearchParams();
  const { data } = useSalonStore();
  const { customer, authenticated, appointments, bridal, logout } = useCustomerAuth();

  // Tab State: 'otp' (Default native OTP) or 'password'
  const [activeTab, setActiveTab] = useState<'otp' | 'password'>('otp');

  // Input States
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Native In-Page OTP States
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [maskedMobile, setMaskedMobile] = useState('');
  const [fallbackWaUrl, setFallbackWaUrl] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  // Status & Appointment States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false);
  const [searched, setSearched] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);
  const [customerName, setCustomerName] = useState('');

  // 1. Resend OTP countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendTimer]);

  // 2. Fetch appointments for authenticated user via GET /api/my-appointments
  const fetchAuthenticatedAppointments = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/my-appointments', {
        method: 'GET',
        credentials: 'include',
      });
      const json = await res.json();

      if (json.success && json.authenticated) {
        const appts = json.appointments || [];
        const bridal = (json.bridal || []).map((b: any) => ({
          id: b.id,
          date: b.weddingDate || b.date,
          time: '08:00 AM',
          customer: b.name,
          mobile: b.mobile,
          service: `👑 Bridal: ${b.packageName || 'Bridal Package'}`,
          advance: b.advance || 0,
          price: b.totalAmount || b.package || b.price || 0,
          status: b.status || 'Confirmed',
          notes: `Event: ${b.event || 'Wedding'} | Venue: ${b.venue || 'Surat'}`,
        }));

        const all = [...appts, ...bridal].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        setMatches(all);
        setSearched(true);
        if (json.customer?.name) {
          setCustomerName(json.customer.name);
        }
        if (json.customer?.mobile) {
          setMobile(json.customer.mobile);
        }
      }
    } catch {
      // Session fetch error
    } finally {
      setLoading(false);
    }
  }, []);

  // 3. Auto-load appointments immediately if user is already authenticated (no password needed)
  useEffect(() => {
    if (customer) {
      const clean = (customer.phone || customer.mobile || '').replace(/\D/g, '').slice(-10);
      if (clean) setMobile(clean);
      if (customer.name) setCustomerName(customer.name);

      if ((appointments && appointments.length > 0) || (bridal && bridal.length > 0)) {
        const appts = appointments || [];
        const bList = (bridal || []).map((b: any) => ({
          id: b.id,
          date: b.weddingDate || b.date,
          time: '08:00 AM',
          customer: b.name,
          mobile: b.mobile,
          service: `👑 Bridal: ${b.packageName || 'Bridal Package'}`,
          advance: b.advance || 0,
          price: b.totalAmount || b.package || b.price || 0,
          status: b.status || 'Confirmed',
          notes: `Event: ${b.event || 'Wedding'} | Venue: ${b.venue || 'Surat'}`,
        }));
        const all = [...appts, ...bList].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        setMatches(all);
        setSearched(true);
      } else {
        fetchAuthenticatedAppointments();
      }
    }
  }, [customer, appointments, bridal, fetchAuthenticatedAppointments]);

  // 4. Pre-fill mobile from URL parameter or session storage if available
  useEffect(() => {
    if (!authenticated) {
      const paramMobile = searchParams.get('mobile');
      const savedMobile = typeof window !== 'undefined' ? sessionStorage.getItem('shree_appt_mobile') : null;
      const initialMobile = paramMobile || savedMobile || '';
      const clean = initialMobile.replace(/\D/g, '').slice(-10);
      if (clean.length === 10) {
        setMobile(clean);
      }
    }
  }, [searchParams, authenticated]);

  // 5. Send Native Security OTP via WhatsApp / SMS
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = mobile.replace(/\D/g, '').slice(-10);

    if (clean.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/my-appointments/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: clean }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || 'Failed to dispatch security code. Please check your mobile number.');
        return;
      }

      setOtpSent(true);
      setMaskedMobile(json.maskedMobile || `+91 ${clean.slice(0, 5)} ***${clean.slice(-2)}`);
      setFallbackWaUrl(json.fallbackWaUrl || '');
      setResendTimer(30);
      setOtpCode('');
    } catch {
      setError('Network error while requesting verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 6. Verify Native OTP & Unlock Appointments
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = mobile.replace(/\D/g, '').slice(-10);
    const cleanOtp = otpCode.trim();

    if (clean.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!cleanOtp || cleanOtp.length < 4) {
      setError('Please enter the 4-digit verification code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/my-appointments/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          mobile: clean,
          otp: cleanOtp,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || 'Invalid or expired verification code. Please check and try again.');
        return;
      }

      // Successful verification
      const appts = json.appointments || [];
      const bridal = (json.bridal || []).map((b: any) => ({
        id: b.id,
        date: b.weddingDate || b.date,
        time: '08:00 AM',
        customer: b.name,
        mobile: b.mobile,
        service: `👑 Bridal: ${b.packageName || 'Bridal Package'}`,
        advance: b.advance || 0,
        price: b.totalAmount || b.package || b.price || 0,
        status: b.status || 'Confirmed',
        notes: `Event: ${b.event || 'Wedding'} | Venue: ${b.venue || 'Surat'}`,
      }));

      const all = [...appts, ...bridal].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setMatches(all);
      setSearched(true);

      if (json.customer?.name) {
        setCustomerName(json.customer.name);
      } else if (all.length > 0 && all[0].customer) {
        setCustomerName(all[0].customer);
      }

      sessionStorage.setItem('shree_appt_mobile', clean);
    } catch {
      setError('Network error while verifying code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 7. Secure Password Login Form Submit
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = mobile.replace(/\D/g, '').slice(-10);

    if (clean.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!password) {
      setError('Password is required to securely access your appointments.');
      return;
    }

    setLoading(true);
    setError('');
    setNeedsPasswordSetup(false);

    try {
      const res = await fetch('/api/my-appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          mobile: clean,
          password: password.trim(),
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        if (json.needsPasswordSetup) {
          setNeedsPasswordSetup(true);
        }
        setError(json.error || 'Authentication failed. Please verify your mobile and password.');
        return;
      }

      // Successful verification
      const appts = json.appointments || [];
      const bridal = (json.bridal || []).map((b: any) => ({
        id: b.id,
        date: b.weddingDate || b.date,
        time: '08:00 AM',
        customer: b.name,
        mobile: b.mobile,
        service: `👑 Bridal: ${b.packageName || 'Bridal Package'}`,
        advance: b.advance || 0,
        price: b.totalAmount || b.package || b.price || 0,
        status: b.status || 'Confirmed',
        notes: `Event: ${b.event || 'Wedding'} | Venue: ${b.venue || 'Surat'}`,
      }));

      const all = [...appts, ...bridal].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setMatches(all);
      setSearched(true);

      if (json.customer?.name) {
        setCustomerName(json.customer.name);
      } else if (all.length > 0 && all[0].customer) {
        setCustomerName(all[0].customer);
      }

      sessionStorage.setItem('shree_appt_mobile', clean);
    } catch {
      setError('Network error while authenticating. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await logout();
    } catch {}
    setSearched(false);
    setMatches([]);
    setPassword('');
    setOtpCode('');
    setOtpSent(false);
    setError('');
    setCustomerName('');
    sessionStorage.removeItem('shree_appt_mobile');
    setLoading(false);
  };

  return (
    <div
      style={{
        maxWidth: 860,
        margin: '0 auto',
        padding: 'clamp(24px, 4vw, 48px) 16px 80px',
        fontFamily: 'var(--font-sans, system-ui, -apple-system, sans-serif)',
      }}
    >
      {/* Page Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(5, 66, 74, 0.08)',
            color: '#05424A',
            border: '1px solid rgba(5, 66, 74, 0.25)',
            padding: '6px 16px',
            borderRadius: 99,
            fontSize: 12.5,
            fontWeight: 700,
          }}
        >
          <ShieldCheck size={14} color="#05424A" /> Confidential Client Portal · 100% Private
        </span>
        <h1
          style={{
            fontSize: 'clamp(24px, 4.5vw, 36px)',
            fontWeight: 800,
            color: '#0f172a',
            margin: '12px 0 8px',
            letterSpacing: '-0.02em',
          }}
        >
          My Appointments &amp; Bridal Bookings
        </h1>
        <p style={{ fontSize: 14.5, color: '#64748b', margin: 0, maxWidth: 580, marginInline: 'auto' }}>
          For your confidentiality and security, please verify your registered mobile number via instant OTP or password to view your appointments.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {/* ─── Search / Unlock Form (When not authenticated or searched) ─── */}
        {!searched ? (
          <motion.div
            key="secure-auth-box"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            exit="hidden"
            style={{
              background: '#ffffff',
              borderRadius: 24,
              border: '1px solid #e2e8f0',
              padding: 'clamp(24px, 4vw, 36px)',
              boxShadow: '0 10px 36px rgba(5, 66, 74, 0.07)',
              maxWidth: 500,
              margin: '0 auto',
            }}
          >
            {/* Header Badge & Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, #05424A 0%, #032B30 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#EABA38',
                  boxShadow: '0 4px 14px rgba(5,66,74,0.22)',
                  flexShrink: 0,
                }}
              >
                <Lock size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                  Client Identity Verification
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: 13, color: '#64748b' }}>
                  Verify your mobile number to unlock your booking history
                </p>
              </div>
            </div>

            {/* Verification Method Tabs */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
                marginBottom: 22,
                background: '#f1f5f9',
                padding: 4,
                borderRadius: 14,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setActiveTab('otp');
                  setError('');
                }}
                style={{
                  padding: '10px 14px',
                  borderRadius: 11,
                  border: 'none',
                  background: activeTab === 'otp' ? 'linear-gradient(135deg, #05424A 0%, #032B30 100%)' : 'transparent',
                  color: activeTab === 'otp' ? '#ffffff' : '#64748b',
                  fontWeight: activeTab === 'otp' ? 700 : 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease',
                  boxShadow: activeTab === 'otp' ? '0 3px 10px rgba(5,66,74,0.2)' : 'none',
                }}
              >
                <Sparkles size={14} color={activeTab === 'otp' ? '#EABA38' : 'currentColor'} />
                <span>Instant Mobile OTP</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('password');
                  setError('');
                }}
                style={{
                  padding: '10px 14px',
                  borderRadius: 11,
                  border: 'none',
                  background: activeTab === 'password' ? 'linear-gradient(135deg, #05424A 0%, #032B30 100%)' : 'transparent',
                  color: activeTab === 'password' ? '#ffffff' : '#64748b',
                  fontWeight: activeTab === 'password' ? 700 : 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease',
                  boxShadow: activeTab === 'password' ? '0 3px 10px rgba(5,66,74,0.2)' : 'none',
                }}
              >
                <KeyRound size={14} color={activeTab === 'password' ? '#EABA38' : 'currentColor'} />
                <span>Password Login</span>
              </button>
            </div>

            {/* Error Message Callout */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 12,
                    padding: '12px 16px',
                    color: '#b91c1c',
                    fontSize: 13,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    marginBottom: 18,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span style={{ fontWeight: 600 }}>{error}</span>
                  </div>
                  {needsPasswordSetup && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('otp');
                        setNeedsPasswordSetup(false);
                        setError('');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#05424A',
                        fontWeight: 700,
                        textDecoration: 'underline',
                        padding: 0,
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <span>No password needed! Click here to verify via Instant OTP</span>
                      <ArrowRight size={13} />
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ══════════════════════════════════════════════════════
                TAB 1: INSTANT MOBILE OTP (100% NATIVE, NO EXTERNAL POPUPS)
                ══════════════════════════════════════════════════════ */}
            {activeTab === 'otp' && (
              <div>
                {!otpSent ? (
                  <div>
                    {/* Primary Instant Telecom SMS OTP Verification (Guaranteed Delivery) */}
                    <div style={{ marginBottom: 18 }}>
                      <PhoneEmailButton
                        purpose="my-appointments"
                        label="📱 Verify via Instant Mobile SMS OTP"
                        sublabel="Fast cellular SMS delivered across all Indian networks"
                        onSuccess={(data) => {
                          if (data.customer?.name) {
                            setCustomerName(data.customer.name);
                          }
                          if (data.appointments || data.bridal) {
                            const appts = data.appointments || [];
                            const bridal = (data.bridal || []).map((b: any) => ({
                              id: b.id,
                              date: b.weddingDate || b.date,
                              time: '08:00 AM',
                              customer: b.name,
                              mobile: b.mobile,
                              service: `👑 Bridal: ${b.packageName || 'Bridal Package'}`,
                              advance: b.advance || 0,
                              price: b.totalAmount || b.package || b.price || 0,
                              status: b.status || 'Confirmed',
                              notes: `Event: ${b.event || 'Wedding'} | Venue: ${b.venue || 'Surat'}`,
                            }));
                            const all = [...appts, ...bridal].sort((a, b) =>
                              (b.date || '').localeCompare(a.date || '')
                            );
                            setMatches(all);
                            setSearched(true);
                            if (data.verifiedPhone) {
                              sessionStorage.setItem('shree_appt_mobile', data.verifiedPhone);
                              setMobile(data.verifiedPhone);
                            }
                          } else {
                            fetchAuthenticatedAppointments();
                          }
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0 16px' }}>
                      <div style={{ flex: 1, height: 1, backgroundColor: '#e2e8f0' }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Or Enter Number Manually / WhatsApp
                      </span>
                      <div style={{ flex: 1, height: 1, backgroundColor: '#e2e8f0' }} />
                    </div>

                    {/* Step 1: Enter Mobile Number */}
                    <form onSubmit={handleSendOtp}>
                      <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                          Registered Mobile Number (મોબાઈલ નંબર)
                        </label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <div
                            style={{
                              position: 'absolute',
                              left: 14,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              fontSize: 14,
                              fontWeight: 700,
                              color: '#475569',
                              borderRight: '1px solid #cbd5e1',
                              paddingRight: 10,
                            }}
                          >
                            <span>🇮🇳</span>
                            <span>+91</span>
                          </div>
                          <input
                            type="tel"
                            placeholder="98765 43210"
                            value={mobile}
                            onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            maxLength={10}
                            style={{
                              width: '100%',
                              padding: '13px 14px 13px 88px',
                              borderRadius: 14,
                              border: '1.5px solid #cbd5e1',
                              fontSize: 16,
                              fontWeight: 600,
                              letterSpacing: '0.04em',
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                            onFocus={(e) => (e.target.style.borderColor = '#05424A')}
                            onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                        <button
                          type="submit"
                          disabled={loading || mobile.replace(/\D/g, '').length < 10}
                          style={{
                            width: '100%',
                            padding: '13px 20px',
                            borderRadius: 14,
                            background: 'linear-gradient(135deg, #05424A 0%, #032B30 100%)',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: 14.5,
                            border: 'none',
                            cursor: loading || mobile.replace(/\D/g, '').length < 10 ? 'not-allowed' : 'pointer',
                            opacity: loading || mobile.replace(/\D/g, '').length < 10 ? 0.7 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            boxShadow: '0 4px 14px rgba(5,66,74,0.2)',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          {loading ? (
                            <>
                              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                              <span>Sending security code…</span>
                            </>
                          ) : (
                            <>
                              <Send size={15} color="#EABA38" />
                              <span>Send In-Page Security OTP</span>
                            </>
                          )}
                        </button>

                        <a
                          href={`https://wa.me/919824183769?text=${encodeURIComponent(
                            `Hi Shree Beauty Studio, please send my security verification code for mobile +91 ${mobile || 'my number'} to view my appointments`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            width: '100%',
                            padding: '12px 18px',
                            borderRadius: 14,
                            border: '1.5px solid #22c55e',
                            background: '#f0fdf4',
                            color: '#15803d',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            fontSize: 13.5,
                            fontWeight: 700,
                            textDecoration: 'none',
                            boxSizing: 'border-box',
                          }}
                        >
                          <MessageCircle size={16} color="#16a34a" />
                          <span>Get Code via WhatsApp Helpline (+91 98241 83769)</span>
                        </a>
                      </div>
                    </form>
                  </div>
                ) : (
                  /* Step 2: Enter 4-Digit Security OTP */
                  <form onSubmit={handleVerifyOtp}>
                    {/* Sent Confirmation Badge */}
                    <div
                      style={{
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: 14,
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 20,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <CheckCircle2 size={18} color="#16a34a" style={{ flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>
                            Security code sent!
                          </div>
                          <div style={{ fontSize: 12, color: '#475569' }}>
                            To {maskedMobile || `+91 ${mobile}`}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setOtpSent(false);
                          setOtpCode('');
                          setError('');
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#05424A',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          textDecoration: 'underline',
                        }}
                      >
                        <Edit2 size={12} />
                        <span>Edit</span>
                      </button>
                    </div>

                    {/* 4-Digit OTP Code Input */}
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 8, textAlign: 'center' }}>
                        Enter 4-Digit Verification Code (કોડ દાખલ કરો)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="••••"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        maxLength={4}
                        required
                        autoFocus
                        style={{
                          width: '100%',
                          maxWidth: 240,
                          margin: '0 auto',
                          display: 'block',
                          padding: '12px 16px',
                          borderRadius: 14,
                          border: '2px solid #05424A',
                          fontSize: 26,
                          fontWeight: 800,
                          letterSpacing: '0.45em',
                          textAlign: 'center',
                          outline: 'none',
                          boxSizing: 'border-box',
                          fontFamily: 'monospace',
                          background: '#fafaf9',
                          color: '#05424A',
                        }}
                      />
                    </div>

                    {/* Submit Verification Button */}
                    <button
                      type="submit"
                      disabled={loading || otpCode.length < 4}
                      style={{
                        width: '100%',
                        padding: '14px 20px',
                        borderRadius: 14,
                        background: 'linear-gradient(135deg, #05424A 0%, #032B30 100%)',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: 15,
                        border: 'none',
                        cursor: loading || otpCode.length < 4 ? 'not-allowed' : 'pointer',
                        opacity: loading || otpCode.length < 4 ? 0.7 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        boxShadow: '0 4px 16px rgba(5,66,74,0.25)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {loading ? (
                        <>
                          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                          <span>Verifying code…</span>
                        </>
                      ) : (
                        <>
                          <Check size={16} color="#EABA38" />
                          <span>Verify &amp; Unlock Appointments</span>
                        </>
                      )}
                    </button>

                    {/* Resend & WhatsApp Direct Links */}
                    <div
                      style={{
                        marginTop: 18,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 10,
                        fontSize: 12.5,
                      }}
                    >
                      {resendTimer > 0 ? (
                        <span style={{ color: '#64748b', fontWeight: 600 }}>
                          Resend code in <strong style={{ color: '#05424A' }}>{resendTimer}s</strong>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSendOtp()}
                          disabled={loading}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#05424A',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            textDecoration: 'underline',
                          }}
                        >
                          <RotateCcw size={13} />
                          <span>Resend Security OTP</span>
                        </button>
                      )}

                      {fallbackWaUrl && (
                        <a
                          href={fallbackWaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            color: '#15803d',
                            fontWeight: 600,
                            textDecoration: 'none',
                            background: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            borderRadius: 99,
                            padding: '4px 12px',
                            fontSize: 11.5,
                          }}
                        >
                          <MessageCircle size={13} />
                          <span>Didn&apos;t receive? Open code on WhatsApp</span>
                        </a>
                      )}
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════
                TAB 2: PASSWORD LOGIN
                ══════════════════════════════════════════════════════ */}
            {activeTab === 'password' && (
              <form onSubmit={handlePasswordLogin}>
                {/* Mobile Input */}
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                    Registered Mobile Number (મોબાઈલ નંબર)
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: 14,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 14,
                        fontWeight: 700,
                        color: '#475569',
                        borderRight: '1px solid #cbd5e1',
                        paddingRight: 10,
                      }}
                    >
                      <span>🇮🇳</span>
                      <span>+91</span>
                    </div>
                    <input
                      type="tel"
                      placeholder="98765 43210"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      required
                      maxLength={10}
                      style={{
                        width: '100%',
                        padding: '13px 14px 13px 88px',
                        borderRadius: 14,
                        border: '1.5px solid #cbd5e1',
                        fontSize: 16,
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                      onFocus={(e) => (e.target.style.borderColor = '#05424A')}
                      onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
                      Account Password (પાસવર્ડ)
                    </label>
                    <Link
                      href={`/forgot-password?identifier=${mobile || ''}`}
                      style={{ fontSize: 12.5, fontWeight: 600, color: '#05424A', textDecoration: 'none' }}
                    >
                      Forgot Password?
                    </Link>
                  </div>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <div style={{ position: 'absolute', left: 14, color: '#64748b' }}>
                      <KeyRound size={17} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '13px 44px 13px 42px',
                        borderRadius: 14,
                        border: '1.5px solid #cbd5e1',
                        fontSize: 15,
                        fontWeight: 600,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                      onFocus={(e) => (e.target.style.borderColor = '#05424A')}
                      onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: 14,
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || mobile.replace(/\D/g, '').length < 10 || !password}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    borderRadius: 14,
                    background: 'linear-gradient(135deg, #05424A 0%, #032B30 100%)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: 15,
                    border: 'none',
                    cursor: loading || mobile.replace(/\D/g, '').length < 10 || !password ? 'not-allowed' : 'pointer',
                    opacity: loading || mobile.replace(/\D/g, '').length < 10 || !password ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 4px 16px rgba(5,66,74,0.25)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Verifying credentials…</span>
                    </>
                  ) : (
                    <>
                      <Lock size={16} color="#EABA38" />
                      <span>Unlock with Password</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Quick Links Footer */}
            <div
              style={{
                marginTop: 24,
                paddingTop: 18,
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10,
                fontSize: 12.5,
                color: '#64748b',
              }}
            >
              <span>First time visiting?</span>
              <div style={{ display: 'flex', gap: 12 }}>
                <Link
                  href={`/signup?phone=${mobile || ''}`}
                  style={{ color: '#05424A', fontWeight: 700, textDecoration: 'none' }}
                >
                  Create Account
                </Link>
                <span>·</span>
                <Link
                  href={`/forgot-password?identifier=${mobile || ''}`}
                  style={{ color: '#05424A', fontWeight: 700, textDecoration: 'none' }}
                >
                  Set Password
                </Link>
              </div>
            </div>

            {/* Privacy Badges */}
            <div
              style={{
                marginTop: 18,
                backgroundColor: '#FAF8F5',
                borderRadius: 12,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 12,
                color: '#475569',
              }}
            >
              <ShieldCheck size={16} color="#16a34a" style={{ flexShrink: 0 }} />
              <span>Strict Ladies Privacy: Your booking records are confidential and inaccessible without your mobile verification.</span>
            </div>
          </motion.div>
        ) : (
          /* ─── Authenticated Appointments Dashboard ─── */
          <motion.div
            key="results-dashboard"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            {/* Top User Info Bar */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: 18,
                border: '1px solid #e2e8f0',
                padding: '18px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 14,
                marginBottom: 24,
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #05424A 0%, #032B30 100%)',
                    color: '#EABA38',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: 18,
                  }}
                >
                  {customerName ? customerName.charAt(0).toUpperCase() : 'S'}
                </div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{customerName ? customerName : 'Shree Beauty Client'}</span>
                    <span style={{ fontSize: 11, background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>
                      Verified Client
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, marginTop: 2 }}>
                    <Phone size={13} color="#05424A" />
                    <span>Mobile: +91 {mobile}</span>
                    <span style={{ color: '#cbd5e1' }}>·</span>
                    <span style={{ color: '#05424A', fontWeight: 700 }}>
                      {matches.length} {matches.length === 1 ? 'Booking' : 'Bookings'}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleSignOut}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#f8fafc',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    padding: '9px 16px',
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <LogOut size={14} />
                  <span>Lock &amp; Sign Out</span>
                </button>

                <Link
                  href="/book"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#05424A',
                    color: '#ffffff',
                    padding: '9px 18px',
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 700,
                    textDecoration: 'none',
                    boxShadow: '0 4px 12px rgba(5,66,74,0.2)',
                  }}
                >
                  <Sparkles size={14} color="#EABA38" />
                  <span>Book New Service</span>
                </Link>
              </div>
            </div>

            {/* Results Grid */}
            {matches.length === 0 ? (
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: 20,
                  padding: '48px 24px',
                  textAlign: 'center',
                  border: '1px dashed #cbd5e1',
                }}
              >
                <Calendar size={40} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
                <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: '#334155' }}>
                  No Active Appointments Found
                </h3>
                <p style={{ margin: '0 0 20px', fontSize: 14, color: '#64748b' }}>
                  No upcoming or past salon appointments were found for mobile +91 {mobile}. Would you like to schedule one now?
                </p>
                <Link
                  href="/book"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    background: '#05424A',
                    color: '#ffffff',
                    padding: '12px 24px',
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: 14,
                    textDecoration: 'none',
                  }}
                >
                  <span>Book Salon Service Online</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {matches.map((appt) => {
                  const isCancelled = (appt.status || '').toLowerCase() === 'cancelled';
                  const isCompleted = (appt.status || '').toLowerCase() === 'completed';

                  return (
                    <motion.div
                      key={appt.id}
                      variants={fadeUp}
                      initial="hidden"
                      animate="visible"
                      style={{
                        background: '#ffffff',
                        borderRadius: 18,
                        border: '1px solid #e2e8f0',
                        padding: 22,
                        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 14,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span
                            style={{
                              background: isCancelled ? '#fee2e2' : isCompleted ? '#dcfce7' : '#e0f2fe',
                              color: isCancelled ? '#991b1b' : isCompleted ? '#166534' : '#075985',
                              fontSize: 12,
                              fontWeight: 700,
                              padding: '3px 10px',
                              borderRadius: 99,
                              textTransform: 'capitalize',
                            }}
                          >
                            {appt.status || 'Confirmed'}
                          </span>
                          <span style={{ fontSize: 12, color: '#94a3b8' }}>ID: #{appt.id?.slice(0, 8)}</span>
                        </div>

                        {Number(appt.price || 0) > 0 && (
                          <span style={{ fontSize: 16, fontWeight: 800, color: '#05424A' }}>
                            ₹{Number(appt.price).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                          {appt.service}
                        </h3>
                        {appt.notes && (
                          <p style={{ margin: 0, fontSize: 13, color: '#64748b', fontStyle: 'italic' }}>
                            Note: {appt.notes}
                          </p>
                        )}
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                          gap: 12,
                          padding: '12px 16px',
                          background: '#f8fafc',
                          borderRadius: 12,
                          fontSize: 13,
                          color: '#334155',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Calendar size={15} color="#05424A" />
                          <span><strong>Date:</strong> {appt.date}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Clock size={15} color="#05424A" />
                          <span><strong>Time:</strong> {appt.time}</span>
                        </div>
                        {Number(appt.advance || 0) > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <CheckCircle2 size={15} color="#16a34a" />
                            <span><strong>Advance Paid:</strong> ₹{Number(appt.advance).toLocaleString('en-IN')}</span>
                          </div>
                        )}
                      </div>

                      {!isCancelled && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 2 }}>
                          <a
                            href={getAppointmentGoogleCalendarUrl(
                              {
                                customer: appt.customer || customerName || 'Customer',
                                mobile: appt.mobile || mobile,
                                service: appt.service || 'Salon Service',
                                date: appt.date,
                                time: appt.time,
                                advance: appt.advance,
                                notes: appt.notes,
                                price: appt.price,
                              },
                              data?.settings?.salon,
                              data?.settings?.address
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              background: '#eff6ff',
                              color: '#2563eb',
                              border: '1px solid #bfdbfe',
                              borderRadius: 10,
                              padding: '6px 12px',
                              fontSize: 12,
                              fontWeight: 700,
                              textDecoration: 'none',
                            }}
                          >
                            <Calendar size={13} />
                            <span>📅 Save to Google Calendar (Auto Reminder)</span>
                          </a>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function MyAppointmentsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading Appointment Tracker...</div>}>
      <MyAppointmentsView />
    </Suspense>
  );
}
