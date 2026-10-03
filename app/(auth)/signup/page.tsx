'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Sparkles,
  CheckCircle2,
  Gift,
  Calendar,
  Receipt,
} from 'lucide-react';
import { SHREE_ONLY_LOGO_BASE64 } from '@/lib/logo-base64';
import { useCustomerAuth } from '@/lib/customer-context';

function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect');
  const { signup, customer } = useCustomerAuth();

  // If already logged in, redirect to target or profile
  useEffect(() => {
    if (customer) {
      router.replace(redirectTarget || '/profile');
    }
  }, [customer, redirectTarget, router]);

  const [method, setMethod] = useState<'mobile' | 'email'>('mobile');

  // Form Fields
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Normal, direct account creation without OTP
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || name.trim().length < 2) {
      setError('Please enter your full name (minimum 2 characters).');
      return;
    }

    if (method === 'mobile') {
      const cleanPhone = mobile.replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        setError('Please enter a valid 10-digit mobile number.');
        return;
      }
    } else {
      if (!email.includes('@') || !email.includes('.')) {
        setError('Please enter a valid email address.');
        return;
      }
      if (mobile.trim()) {
        const cleanPhone = mobile.replace(/\D/g, '');
        if (cleanPhone.length !== 10) {
          setError('Optional mobile number must be 10 digits.');
          return;
        }
      }
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify both password fields.');
      return;
    }

    setLoading(true);
    try {
      const result = await signup({
        name: name.trim(),
        mobile: mobile.trim() || undefined,
        phone: mobile.trim() || undefined,
        email: email.trim() || undefined,
        password,
        method,
      });

      if (result.success) {
        router.replace(redirectTarget || '/profile');
      } else {
        setError(result.error || 'Registration failed. Please check your information and try again.');
      }
    } catch (err: any) {
      setError(err?.message || 'Network error occurred during registration.');
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
      <div
        style={{
          position: 'absolute',
          bottom: '5%',
          right: '8%',
          width: 440,
          height: 440,
          background: 'radial-gradient(circle, rgba(5, 66, 74, 0.5) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        style={{
          width: '100%',
          maxWidth: 480,
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
        {/* Logo & Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              width: 76,
              height: 76,
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
              fontSize: 24,
              fontWeight: 800,
              color: '#05424A',
              margin: '0 0 4px',
              letterSpacing: '-0.02em',
            }}
          >
            Create Your Account
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', fontWeight: 600, margin: 0 }}>
            Quick registration for bookings, bills &amp; loyalty rewards
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
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Method Selector: Mobile or Email */}
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
              transition: 'all 0.15s ease',
            }}
          >
            <Phone size={14} color={method === 'mobile' ? '#EABA38' : 'currentColor'} />
            <span>Mobile Number</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMethod('email');
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
              transition: 'all 0.15s ease',
            }}
          >
            <Mail size={14} color={method === 'email' ? '#EABA38' : 'currentColor'} />
            <span>Email Address</span>
          </button>
        </div>

        {/* Direct Signup Form */}
        <form onSubmit={handleSubmit}>
          {/* Full Name */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 5 }}>
              Full Name *
            </label>
            <div style={{ position: 'relative' }}>
              <User size={16} color="#94a3b8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
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

          {/* Primary Identifier based on method */}
          {method === 'mobile' ? (
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                Mobile Number *
              </label>
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
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="98765 43210"
                  maxLength={10}
                  required
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
            </div>
          ) : (
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                Email Address *
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
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
          )}

          {/* Alternate Contact Field (Optional) */}
          {method === 'mobile' ? (
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                Email Address <span style={{ fontWeight: 500, color: '#94a3b8' }}>(Optional)</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="For billing &amp; appointment receipts"
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
          ) : (
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                Mobile Number <span style={{ fontWeight: 500, color: '#94a3b8' }}>(Optional)</span>
              </label>
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
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="98765 43210 (For WhatsApp alerts)"
                  maxLength={10}
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
            </div>
          )}

          {/* Create Password */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 5 }}>
              Password *
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
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

          {/* Confirm Password */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 5 }}>
              Confirm Password *
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
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

          {/* Submit Button */}
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
              transition: 'all 0.2s ease',
            }}
          >
            {loading ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Creating your account…</span>
              </>
            ) : (
              <>
                <Sparkles size={16} color="#EABA38" />
                <span>Create Account</span>
              </>
            )}
          </button>
        </form>

        {/* Benefits strip */}
        <div
          style={{
            marginTop: 20,
            padding: '12px 14px',
            background: 'rgba(234, 186, 56, 0.08)',
            border: '1px solid rgba(234, 186, 56, 0.22)',
            borderRadius: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#032B30', fontWeight: 600 }}>
            <Gift size={13} color="#b45309" style={{ flexShrink: 0 }} />
            <span>Earn salon reward points on every service visit</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#032B30', fontWeight: 600 }}>
            <Calendar size={13} color="#05424A" style={{ flexShrink: 0 }} />
            <span>Track appointments &amp; view digital booking passes</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#032B30', fontWeight: 600 }}>
            <Receipt size={13} color="#05424A" style={{ flexShrink: 0 }} />
            <span>Download your official PDF invoices anytime</span>
          </div>
        </div>

        {/* Already have an account */}
        <div
          style={{
            textAlign: 'center',
            marginTop: 20,
            paddingTop: 16,
            borderTop: '1px solid #f1f5f9',
            fontSize: 13,
            color: '#64748b',
          }}
        >
          Already have an account?{' '}
          <Link
            href={redirectTarget ? `/login?redirect=${encodeURIComponent(redirectTarget)}` : '/login'}
            style={{ color: '#05424A', fontWeight: 800, textDecoration: 'none' }}
          >
            Sign In here
          </Link>
        </div>
      </motion.div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#011619',
            color: '#ffffff',
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          Loading Sign Up…
        </div>
      }
    >
      <SignupPageContent />
    </Suspense>
  );
}
