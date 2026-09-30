'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  Mail,
  Lock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';
import { SHREE_ONLY_LOGO_BASE64 } from '@/lib/logo-base64';

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<'request' | 'reset' | 'done'>('request');
  const [method, setMethod] = useState<'mobile' | 'email'>('mobile');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);

  // OTP cooldown countdown
  useEffect(() => {
    if (otpTimer > 0) {
      const interval = setInterval(() => setOtpTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [otpTimer]);

  // Request recovery OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanInput = identifier.trim();
    if (!cleanInput) {
      setError(method === 'mobile' ? 'Please enter your mobile number.' : 'Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: cleanInput,
          type: method === 'mobile' ? 'phone' : 'email',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStep('reset');
        setOtpTimer(60);
      } else {
        setError(data.error || 'Failed to send recovery code. Please check your details.');
      }
    } catch {
      setError('Network error sending recovery code.');
    } finally {
      setLoading(false);
    }
  };

  // Resend recovery OTP
  const handleResendOtp = async () => {
    if (otpTimer > 0) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          type: method === 'mobile' ? 'phone' : 'email',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setOtpTimer(60);
      } else {
        setError(data.error || 'Failed to resend recovery code.');
      }
    } catch {
      setError('Network error resending recovery code.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Reset Password with OTP
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (otp.trim().length !== 6) {
      setError('Please enter the 6-digit recovery code.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          otp: otp.trim(),
          newPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStep('done');
      } else {
        setError(data.error || 'Password reset failed. Please check the code.');
      }
    } catch {
      setError('Network error resetting password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(24px, 4vw, 48px) 16px',
        background: 'radial-gradient(ellipse at center, #064d57 0%, #03252a 60%, #011619 100%)',
        position: 'relative',
        boxSizing: 'border-box',
        fontFamily: 'var(--font-sans, system-ui, -apple-system, sans-serif)',
      }}
    >
      {/* Decorative ambient glowing orbs */}
      <div
        style={{
          position: 'absolute',
          top: '5%',
          left: '8%',
          width: 380,
          height: 380,
          background: 'radial-gradient(circle, rgba(234, 186, 56, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        style={{
          width: '100%',
          maxWidth: 460,
          margin: '0 auto',
          background: 'rgba(255, 255, 255, 0.97)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderRadius: 28,
          padding: 'clamp(28px, 5vw, 42px) clamp(22px, 5vw, 36px)',
          boxShadow: '0 30px 70px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(234, 186, 56, 0.3)',
          position: 'relative',
          zIndex: 10,
          boxSizing: 'border-box',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              margin: '0 auto 12px',
              boxShadow: '0 10px 24px rgba(5, 66, 74, 0.3), 0 0 0 3px #EABA38',
              overflow: 'hidden',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={SHREE_ONLY_LOGO_BASE64}
              alt="Shree Beauty Studio"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: '#05424A',
              margin: '0 0 4px',
              letterSpacing: '-0.02em',
            }}
          >
            Recover Password
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', fontWeight: 600, margin: 0 }}>
            Shree Beauty Studio · Customer Account Access
          </p>
        </div>

        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                borderRadius: 12,
                padding: '11px 14px',
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 18,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── STEP 1: REQUEST RECOVERY ── */}
        {step === 'request' && (
          <div>
            {/* Method Tabs */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
                marginBottom: 20,
                background: '#f1f5f9',
                padding: 4,
                borderRadius: 12,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setMethod('mobile');
                  setIdentifier('');
                  setError('');
                }}
                style={{
                  padding: '9px 12px',
                  borderRadius: 10,
                  border: 'none',
                  background: method === 'mobile' ? 'linear-gradient(135deg, #05424A 0%, #032B30 100%)' : 'transparent',
                  color: method === 'mobile' ? '#ffffff' : '#64748b',
                  fontWeight: method === 'mobile' ? 700 : 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Phone size={14} color={method === 'mobile' ? '#EABA38' : 'currentColor'} />
                <span>Mobile OTP</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMethod('email');
                  setIdentifier('');
                  setError('');
                }}
                style={{
                  padding: '9px 12px',
                  borderRadius: 10,
                  border: 'none',
                  background: method === 'email' ? 'linear-gradient(135deg, #05424A 0%, #032B30 100%)' : 'transparent',
                  color: method === 'email' ? '#ffffff' : '#64748b',
                  fontWeight: method === 'email' ? 700 : 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Mail size={14} color={method === 'email' ? '#EABA38' : 'currentColor'} />
                <span>Email Code</span>
              </button>
            </div>

            <form onSubmit={handleRequestOtp}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                  {method === 'mobile' ? 'Your Registered Mobile Number' : 'Your Registered Email Address'}
                </label>
                {method === 'mobile' ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span
                      style={{
                        padding: '11px 14px',
                        background: '#f8fafc',
                        border: '1.5px solid #cbd5e1',
                        borderRadius: 12,
                        fontSize: 14,
                        fontWeight: 700,
                        color: '#475569',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      🇮🇳 +91
                    </span>
                    <input
                      type="tel"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="98765 43210"
                      maxLength={10}
                      required
                      autoFocus
                      style={{
                        flex: 1,
                        padding: '11px 14px',
                        borderRadius: 12,
                        border: '1.5px solid #cbd5e1',
                        fontSize: 14,
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    />
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="email"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="name@example.com"
                      required
                      autoFocus
                      style={{
                        width: '100%',
                        padding: '11px 14px 11px 40px',
                        borderRadius: 12,
                        border: '1.5px solid #cbd5e1',
                        fontSize: 14,
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '13px 20px',
                  borderRadius: 14,
                  border: 'none',
                  background: 'linear-gradient(135deg, #05424A 0%, #032B30 100%)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: 14.5,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 8px 24px rgba(5,66,74,0.3)',
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    Sending recovery code…
                  </>
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight size={16} color="#EABA38" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ── STEP 2: VERIFY CODE & CREATE NEW PASSWORD ── */}
        {step === 'reset' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  background: 'rgba(234,186,56,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 10px',
                  color: '#05424A',
                }}
              >
                <KeyRound size={24} />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#05424A', margin: '0 0 4px' }}>
                Set New Password
              </h2>
              <p style={{ fontSize: 12.5, color: '#64748b', margin: 0 }}>
                Enter the 6-digit code sent to{' '}
                <strong style={{ color: '#0f172a' }}>{identifier}</strong>
              </p>
            </div>

            <form onSubmit={handleResetPassword}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6, textAlign: 'center' }}>
                  6-Digit Recovery Code *
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="• • • • • •"
                  maxLength={6}
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 12,
                    border: '2px solid #EABA38',
                    fontSize: 22,
                    letterSpacing: '8px',
                    textAlign: 'center',
                    fontWeight: 800,
                    color: '#05424A',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                  Create New Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    required
                    style={{
                      width: '100%',
                      padding: '11px 40px 11px 40px',
                      borderRadius: 12,
                      border: '1.5px solid #cbd5e1',
                      fontSize: 14,
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                  Confirm New Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    required
                    style={{
                      width: '100%',
                      padding: '11px 14px 11px 40px',
                      borderRadius: 12,
                      border: '1.5px solid #cbd5e1',
                      fontSize: 14,
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '13px 20px',
                  borderRadius: 14,
                  border: 'none',
                  background: 'linear-gradient(135deg, #05424A 0%, #032B30 100%)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: 14.5,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 8px 24px rgba(5,66,74,0.3)',
                  marginBottom: 14,
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    Saving password…
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} color="#EABA38" />
                    Reset Password & Sign In
                  </>
                )}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5 }}>
                <button
                  type="button"
                  onClick={() => setStep('request')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <ArrowLeft size={13} /> Change number/email
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={otpTimer > 0 || loading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: otpTimer > 0 ? '#94a3b8' : '#05424A',
                    fontWeight: 700,
                    cursor: otpTimer > 0 ? 'default' : 'pointer',
                  }}
                >
                  {otpTimer > 0 ? `Resend in ${otpTimer}s` : 'Resend code'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── STEP 3: DONE ── */}
        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '16px 8px' }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: '#dcfce7',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <CheckCircle2 size={32} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#05424A', margin: '0 0 8px' }}>
              Password Reset Successfully!
            </h2>
            <p style={{ color: '#64748b', fontSize: 13.5, lineHeight: 1.5, marginBottom: 24 }}>
              Your password has been securely updated. You can now log into your account using your new credentials.
            </p>
            <Link
              href="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '12px 28px',
                borderRadius: 99,
                background: 'linear-gradient(135deg, #05424A 0%, #032B30 100%)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 14,
                textDecoration: 'none',
                boxShadow: '0 8px 24px rgba(5,66,74,0.3)',
              }}
            >
              <span>Sign In with New Password</span>
              <ArrowRight size={15} color="#EABA38" />
            </Link>
          </div>
        )}

        {/* Return to Login */}
        {step !== 'done' && (
          <div
            style={{
              textAlign: 'center',
              marginTop: 22,
              paddingTop: 16,
              borderTop: '1px solid #f1f5f9',
              fontSize: 13,
              color: '#64748b',
            }}
          >
            Remembered your password?{' '}
            <Link href="/login" style={{ color: '#05424A', fontWeight: 800, textDecoration: 'none' }}>
              Back to Login
            </Link>
          </div>
        )}
      </motion.div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
