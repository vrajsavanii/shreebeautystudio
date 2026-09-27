'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  ShieldCheck,
  Calendar,
  Clock,
  User,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
  RotateCcw,
  LogOut,
  Send,
  MessageCircle,
} from 'lucide-react';
import { useSalonStore } from '@/lib/store';
import { getAppointmentGoogleCalendarUrl } from '@/lib/calendar';

const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

function MyAppointmentsView() {
  const searchParams = useSearchParams();
  const { data } = useSalonStore();

  // Multi-step flow: 'phone' -> 'otp' -> 'verified'
  const [step, setStep] = useState<'phone' | 'otp' | 'verified'>('phone');
  const [mobile, setMobile] = useState('');
  const [maskedMobile, setMaskedMobile] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '']);
  const [authToken, setAuthToken] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [matches, setMatches] = useState<any[]>([]);
  const [customerName, setCustomerName] = useState('');

  // Resend Timer
  const [timer, setTimer] = useState(45);
  const [canResend, setCanResend] = useState(false);
  const [fallbackWaUrl, setFallbackWaUrl] = useState('');

  const otpInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'otp' && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  // Check existing session in sessionStorage
  useEffect(() => {
    const savedToken = sessionStorage.getItem('shree_appt_token');
    const savedMobile = sessionStorage.getItem('shree_appt_mobile');
    if (savedToken && savedMobile && savedMobile.length === 10) {
      setMobile(savedMobile);
      setAuthToken(savedToken);
      fetchVerifiedAppointments(savedMobile, savedToken);
    }
  }, []);

  // Check URL params for mobile
  useEffect(() => {
    const paramMobile = searchParams.get('mobile');
    if (paramMobile && step === 'phone') {
      const clean = paramMobile.replace(/\D/g, '').slice(-10);
      if (clean.length === 10) {
        setMobile(clean);
      }
    }
  }, [searchParams, step]);

  // Step 1: Send OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = mobile.replace(/\D/g, '').slice(-10);
    if (clean.length !== 10) {
      setError('કૃપા કરીને માન્ય ૧૦ આંકડાનો મોબાઈલ નંબર નાખો.');
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
        setError(json.error || 'OTP મોકલવામાં નિષ્ફળતા. કૃપા કરીને ફરી પ્રયાસ કરો.');
        return;
      }

      setMaskedMobile(json.maskedMobile || `+91 ${clean.slice(0, 5)} ***${clean.slice(-2)}`);
      if (json.fallbackWaUrl) setFallbackWaUrl(json.fallbackWaUrl);
      setStep('otp');
      setTimer(45);
      setCanResend(false);
      setOtpDigits(['', '', '', '']);

      // Focus first OTP box
      setTimeout(() => {
        otpInputRefs[0].current?.focus();
      }, 150);
    } catch {
      setError('સર્વર કનેક્શનમાં ભૂલ આવી. ફરી પ્રયાસ કરો.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Handle OTP input changes
  const handleOtpChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const nextDigits = [...otpDigits];
    nextDigits[index] = digit;
    setOtpDigits(nextDigits);

    if (digit && index < 3) {
      otpInputRefs[index + 1].current?.focus();
    }

    // Auto submit if all 4 digits entered
    if (digit && index === 3 && nextDigits.every((d) => d !== '')) {
      handleVerifyOtp(nextDigits.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs[index - 1].current?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!pasted) return;

    const nextDigits = ['', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      nextDigits[i] = pasted[i];
    }
    setOtpDigits(nextDigits);

    if (pasted.length === 4) {
      handleVerifyOtp(pasted);
    } else {
      otpInputRefs[Math.min(pasted.length, 3)].current?.focus();
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || otpDigits.join('');
    const clean = mobile.replace(/\D/g, '').slice(-10);

    if (code.length !== 4) {
      setError('કૃપા કરીને પૂરો ૪ આંકડાનો OTP દાખલ કરો.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/my-appointments/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: clean, otp: code }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || 'અમાન્ય OTP. કૃપા કરીને ફરીથી તપાસો.');
        return;
      }

      const token = json.token;
      setAuthToken(token);
      sessionStorage.setItem('shree_appt_token', token);
      sessionStorage.setItem('shree_appt_mobile', clean);

      await fetchVerifiedAppointments(clean, token);
    } catch {
      setError('ચકાસણી દરમિયાન સર્વર કનેક્શનમાં ભૂલ આવી.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Fetch verified appointments using HMAC session token
  const fetchVerifiedAppointments = async (cleanNum: string, token: string) => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/my-appointments?mobile=${cleanNum}&token=${token}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        if (json.requireOtp) {
          sessionStorage.removeItem('shree_appt_token');
          sessionStorage.removeItem('shree_appt_mobile');
          setStep('phone');
          setError('તમારી સિક્યોરિટી સેશન સમય સમાપ્ત થયો છે. કૃપા કરીને નવો OTP મેળવો.');
          return;
        }
        setError(json.error || 'એપોઇન્ટમેન્ટ્સ લોડ કરવામાં ભૂલ આવી.');
        return;
      }

      // Merge appointments and bridal
      const appts = json.appointments || [];
      const bridal = (json.bridal || []).map((b: any) => ({
        id: b.id,
        date: b.weddingDate || b.date,
        time: '08:00 AM',
        customer: b.name,
        mobile: b.mobile,
        service: `👑 Bridal: ${b.packageName || 'Bridal Package'}`,
        advance: b.advance || 0,
        price: b.totalAmount || b.price || 0,
        status: b.status || 'Confirmed',
        notes: `Event: ${b.event || 'Wedding'} | Venue: ${b.venue || 'Surat'}`,
      }));

      const all = [...appts, ...bridal].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setMatches(all);

      if (json.customer?.name) {
        setCustomerName(json.customer.name);
      } else if (all.length > 0 && all[0].customer) {
        setCustomerName(all[0].customer);
      } else {
        setCustomerName('');
      }

      setStep('verified');
    } catch {
      setError('એપોઇન્ટમેન્ટ્સ લોડ કરવામાં ભૂલ આવી.');
    } finally {
      setLoading(false);
    }
  };

  // Logout / Lock
  const handleLogout = () => {
    sessionStorage.removeItem('shree_appt_token');
    sessionStorage.removeItem('shree_appt_mobile');
    setAuthToken('');
    setMatches([]);
    setCustomerName('');
    setStep('phone');
    setOtpDigits(['', '', '', '']);
    setError('');
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 20px 80px' }}>
      {/* Header Badge */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <span
          className="cust-section-badge"
          style={{
            background: 'rgba(5,66,74,0.08)',
            color: '#05424A',
            border: '1px solid rgba(5,66,74,0.2)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 16px',
            borderRadius: 99,
            fontSize: 12.5,
            fontWeight: 700,
          }}
        >
          <ShieldCheck size={14} color="#05424A" /> 100% Secure Client Portal
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
          My Salon Appointments &amp; Bridal Bookings
        </h1>
        <p style={{ fontSize: 14.5, color: '#64748b', margin: 0, maxWidth: 580, marginInline: 'auto' }}>
          તમારી સુરક્ષા અને પ્રાઇવસી માટે OTP વેરિફિકેશન દ્વારા એપોઇન્ટમેન્ટ્સ, સર્વિસિસ અને બુકિંગ હિસ્ટ્રી સુરક્ષિત જુઓ.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {/* ─── STEP 1: ENTER MOBILE NUMBER ─── */}
        {step === 'phone' && (
          <motion.div
            key="phone-step"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            exit="hidden"
            style={{
              background: '#ffffff',
              borderRadius: 22,
              border: '1px solid #e2e8f0',
              padding: '32px 28px',
              boxShadow: '0 8px 30px rgba(5,66,74,0.05)',
              maxWidth: 540,
              margin: '0 auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: 'rgba(5,66,74,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#05424A',
                }}
              >
                <Lock size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
                  મોબાઈલ વેરિફિકેશન (Mobile OTP)
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>
                  તમારો રજિસ્ટર્ડ ૧૦ આંકડાનો મોબાઈલ નંબર દાખલ કરો
                </p>
              </div>
            </div>

            <form onSubmit={handleSendOtp}>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                  Mobile Number (મોબાઈલ નંબર)
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
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '13px 14px 13px 88px',
                      borderRadius: 14,
                      border: '1.5px solid #cbd5e1',
                      fontSize: 16,
                      fontWeight: 600,
                      letterSpacing: '0.04em',
                      outline: 'none',
                      transition: 'border-color 0.2s ease',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#05424A')}
                    onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
                  />
                </div>
              </div>

              {error && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 10,
                    padding: '10px 14px',
                    color: '#b91c1c',
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 16,
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || mobile.replace(/\D/g, '').length < 10}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, #05424A 0%, #032B30 100%)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: 15,
                  border: 'none',
                  cursor: loading || mobile.replace(/\D/g, '').length < 10 ? 'not-allowed' : 'pointer',
                  opacity: loading || mobile.replace(/\D/g, '').length < 10 ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 4px 14px rgba(5,66,74,0.25)',
                  transition: 'all 0.2s ease',
                }}
              >
                {loading ? (
                  <span>ઓટીપી મોકલાઈ રહ્યો છે...</span>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Send Secure OTP (ઓટીપી મેળવો)</span>
                  </>
                )}
              </button>
            </form>

            <div
              style={{
                marginTop: 22,
                paddingTop: 18,
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-around',
                fontSize: 12,
                color: '#64748b',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <CheckCircle2 size={13} color="#16a34a" /> 100% Private
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <CheckCircle2 size={13} color="#16a34a" /> WhatsApp Delivery
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <CheckCircle2 size={13} color="#16a34a" /> Fast 1-Click Sync
              </span>
            </div>
          </motion.div>
        )}

        {/* ─── STEP 2: ENTER OTP ─── */}
        {step === 'otp' && (
          <motion.div
            key="otp-step"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            exit="hidden"
            style={{
              background: '#ffffff',
              borderRadius: 22,
              border: '1px solid #e2e8f0',
              padding: '32px 28px',
              boxShadow: '0 8px 30px rgba(5,66,74,0.05)',
              maxWidth: 540,
              margin: '0 auto',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: '#f0fdf4',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                border: '1px solid #bbf7d0',
              }}
            >
              <ShieldCheck size={26} />
            </div>

            <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
              OTP દાખલ કરો (Enter 4-Digit OTP)
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: 13.5, color: '#64748b' }}>
              સુરક્ષા કોડ <strong>{maskedMobile}</strong> પર મોકલવામાં આવ્યો છે.
            </p>

            {/* 4 Box OTP Input */}
            <div
              style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 20 }}
              onPaste={handleOtpPaste}
            >
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={otpInputRefs[idx]}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  style={{
                    width: 54,
                    height: 60,
                    borderRadius: 14,
                    border: digit ? '2px solid #05424A' : '1.5px solid #cbd5e1',
                    background: digit ? '#f8fafc' : '#ffffff',
                    fontSize: 24,
                    fontWeight: 800,
                    textAlign: 'center',
                    color: '#0f172a',
                    outline: 'none',
                    boxShadow: digit ? '0 2px 8px rgba(5,66,74,0.1)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                />
              ))}
            </div>

            {error && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 10,
                  padding: '10px 14px',
                  color: '#b91c1c',
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 18,
                  textAlign: 'left',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => handleVerifyOtp()}
              disabled={loading || otpDigits.some((d) => d === '')}
              style={{
                width: '100%',
                padding: '14px 20px',
                borderRadius: 14,
                background: 'linear-gradient(135deg, #05424A 0%, #032B30 100%)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 15,
                border: 'none',
                cursor: loading || otpDigits.some((d) => d === '') ? 'not-allowed' : 'pointer',
                opacity: loading || otpDigits.some((d) => d === '') ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 14px rgba(5,66,74,0.25)',
                marginBottom: 16,
              }}
            >
              {loading ? (
                <span>વેરિફાઈ થઈ રહ્યું છે...</span>
              ) : (
                <>
                  <CheckCircle2 size={17} />
                  <span>Verify &amp; View Bookings (વેરિફાઈ કરો)</span>
                </>
              )}
            </button>

            {/* Resend OTP / Change Mobile */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, color: '#64748b' }}>
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setError('');
                }}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
              >
                Change Number (નંબર બદલો)
              </button>

              {canResend ? (
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
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <RotateCcw size={13} />
                  <span>Resend OTP (ફરી મોકલો)</span>
                </button>
              ) : (
                <span>Resend in {timer}s</span>
              )}
            </div>
          </motion.div>
        )}

        {/* ─── STEP 3: VERIFIED APPOINTMENTS DASHBOARD ─── */}
        {step === 'verified' && (
          <motion.div
            key="verified-step"
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
                padding: '16px 22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
                marginBottom: 24,
                boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #05424A 0%, #032B30 100%)',
                    color: '#EABA38',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: 16,
                  }}
                >
                  {customerName ? customerName.charAt(0).toUpperCase() : 'S'}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                    {customerName ? customerName : 'Shree Beauty Client'} ✨
                  </div>
                  <div style={{ fontSize: 12, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                    <ShieldCheck size={13} />
                    <span>Verified Mobile: +91 {mobile}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <Link
                  href="/book"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#05424A',
                    color: '#ffffff',
                    padding: '8px 16px',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  <Sparkles size={13} color="#EABA38" />
                  <span>Book New Service</span>
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    padding: '8px 14px',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <LogOut size={13} />
                  <span>Lock &amp; Logout</span>
                </button>
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
                  No Bookings Found (કોઈ બુકિંગ મળ્યું નથી)
                </h3>
                <p style={{ margin: '0 0 20px', fontSize: 14, color: '#64748b' }}>
                  આ મોબાઈલ નંબર (+91 {mobile}) હેઠળ હાલ કોઈ એપોઇન્ટમેન્ટ નોંધાયેલ નથી.
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
