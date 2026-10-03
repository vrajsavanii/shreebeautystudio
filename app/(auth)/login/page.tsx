'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Eye,
  EyeOff,
  Loader2,
  LogIn,
  ShieldCheck,
  UserCheck,
  ArrowLeft,
  Phone,
  Mail,
  Lock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSalonStore, DEFAULT_USERS } from '@/lib/store';
import { UserAccount } from '@/types/salon';
import { setAdminSession } from '@/lib/admin-auth';
import { SHREE_ONLY_LOGO_BASE64 } from '@/lib/logo-base64';
import { useCustomerAuth } from '@/lib/customer-context';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect');

  // Customer Auth Context
  const { login: customerLogin, customer, refreshProfile } = useCustomerAuth();

  // If redirect starts with /admin, or staff query param is set, default to staff mode
  const initialIsStaff =
    searchParams.get('staff') === 'true' || (redirectTarget && redirectTarget.startsWith('/admin'));
  const [isStaffMode, setIsStaffMode] = useState(Boolean(initialIsStaff));

  // If customer is already logged in and not in staff mode, redirect to target or profile
  useEffect(() => {
    if (customer && !isStaffMode && !redirectTarget?.startsWith('/admin')) {
      router.replace(redirectTarget || '/profile');
    }
  }, [customer, isStaffMode, redirectTarget, router]);

  // ─── Customer Login State ───
  const [custMethod, setCustMethod] = useState<'mobile' | 'email'>('mobile');
  const [custMobile, setCustMobile] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custPassword, setCustPassword] = useState('');
  const [custShowPass, setCustShowPass] = useState(false);
  const [custLoading, setCustLoading] = useState(false);
  const [custError, setCustError] = useState('');

  // ─── Staff Login State ───
  const { data, setCurrentUser } = useSalonStore();
  const usersList = data?.users && data.users.length > 0 ? data.users : DEFAULT_USERS;
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffShowPass, setStaffShowPass] = useState(false);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState('');
  const [selectedRole, setSelectedRole] = useState<'Admin' | 'Salesperson'>('Admin');

  // Customer Login Submit (Password-only, fast direct authentication)
  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustError('');
    setCustLoading(true);

    try {
      const payload: any = {
        method: custMethod,
        password: custPassword,
      };

      if (custMethod === 'mobile') {
        payload.phone = custMobile.trim();
      } else {
        payload.email = custEmail.trim();
      }

      const res: any = await customerLogin(payload);
      if (res.success) {
        const dest = redirectTarget && !redirectTarget.startsWith('/admin') ? redirectTarget : '/profile';
        router.replace(dest);
        return;
      }

      if (res.needsPasswordSetup) {
        setCustError(
          'Your account was created via booking without a password. Please use "Forgot Password" below to set your password.'
        );
      } else {
        setCustError(res.error || 'Invalid credentials. Please verify your details.');
      }
    } catch (err: any) {
      setCustError(err?.message || 'Login failed.');
    } finally {
      setCustLoading(false);
    }
  };

  // Staff Route Determination
  const getStaffTargetRoute = (role: 'Admin' | 'Salesperson') => {
    if (redirectTarget && redirectTarget.startsWith('/admin')) {
      if (role === 'Salesperson') {
        const allowed = [
          '/admin/billing',
          '/admin/appointments',
          '/admin/bridal',
          '/admin/purchases',
          '/admin/inventory',
          '/admin/customers',
        ];
        const isAllowed = allowed.some((r) => redirectTarget === r || redirectTarget.startsWith(r + '/'));
        if (isAllowed) return redirectTarget;
        return '/admin/billing';
      }
      return redirectTarget;
    }
    return role === 'Salesperson' ? '/admin/billing' : '/admin';
  };

  // Staff Submit
  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError('');
    setStaffLoading(true);
    try {
      const trimmedEmail = (staffEmail || '').trim().toLowerCase();
      const trimmedPass = (staffPassword || '').trim();

      const matchedUser = usersList.find(
        (u) => (u?.email || '').toLowerCase() === trimmedEmail && u.password && u.password === trimmedPass
      );

      if (matchedUser) {
        setCurrentUser(matchedUser);
        setAdminSession(matchedUser.email, matchedUser.role);
        router.replace(getStaffTargetRoute(matchedUser.role));
        return;
      }

      // Supabase Auth fallback
      try {
        const { data: authRes, error: err } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: trimmedPass,
        });
        if (!err && authRes?.user) {
          const adminUser: UserAccount = {
            id: authRes.user.id,
            name: authRes.user.user_metadata?.name || 'Studio Owner',
            email: authRes.user.email || trimmedEmail,
            role: 'Admin',
          };
          setCurrentUser(adminUser);
          setAdminSession(adminUser.email, adminUser.role);
          router.replace(getStaffTargetRoute(adminUser.role));
          return;
        }
      } catch {
        // Fallback ignored
      }

      setStaffError('Invalid email or password. Please verify your credentials.');
    } catch (err: unknown) {
      setStaffError(err instanceof Error ? err.message : 'Invalid credentials.');
    } finally {
      setStaffLoading(false);
    }
  };

  return (
    <div
      className="auth-bg"
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
      {/* Decorative ambient floating orbs */}
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
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
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
          padding: 'clamp(30px, 5vw, 42px) clamp(22px, 5vw, 36px)',
          boxShadow: '0 30px 70px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(234, 186, 56, 0.3)',
          position: 'relative',
          zIndex: 10,
          boxSizing: 'border-box',
        }}
      >
        {/* Logo & Header */}
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div
            style={{
              width: 78,
              height: 78,
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
              letterSpacing: '-0.02em',
              margin: '0 0 4px',
            }}
          >
            Shree Beauty Studio
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', fontWeight: 600, margin: 0 }}>
            {isStaffMode ? 'Management Console · Staff Sign In' : 'Customer Account · Sign In'}
          </p>
        </div>

        {/* ══════════════════════════════════════════════════════
            MODE 1: CUSTOMER LOGIN
            ══════════════════════════════════════════════════════ */}
        {!isStaffMode ? (
          <div>
            {/* Login Method Selector: Mobile or Email */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
                marginBottom: 18,
                background: '#f1f5f9',
                padding: 4,
                borderRadius: 12,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setCustMethod('mobile');
                  setCustError('');
                }}
                style={{
                  padding: '9px 12px',
                  borderRadius: 10,
                  border: 'none',
                  background: custMethod === 'mobile' ? 'linear-gradient(135deg, #05424A 0%, #032B30 100%)' : 'transparent',
                  color: custMethod === 'mobile' ? '#ffffff' : '#64748b',
                  fontWeight: custMethod === 'mobile' ? 700 : 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease',
                }}
              >
                <Phone size={14} color={custMethod === 'mobile' ? '#EABA38' : 'currentColor'} />
                <span>Mobile Number</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCustMethod('email');
                  setCustError('');
                }}
                style={{
                  padding: '9px 12px',
                  borderRadius: 10,
                  border: 'none',
                  background: custMethod === 'email' ? 'linear-gradient(135deg, #05424A 0%, #032B30 100%)' : 'transparent',
                  color: custMethod === 'email' ? '#ffffff' : '#64748b',
                  fontWeight: custMethod === 'email' ? 700 : 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease',
                }}
              >
                <Mail size={14} color={custMethod === 'email' ? '#EABA38' : 'currentColor'} />
                <span>Email Address</span>
              </button>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {custError && (
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
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{custError}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleCustomerSubmit}>
              {/* Method A: Mobile Number Field */}
              {custMethod === 'mobile' ? (
                <div style={{ marginBottom: 16 }}>
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
                      value={custMobile}
                      onChange={(e) => setCustMobile(e.target.value)}
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
                </div>
              ) : (
                /* Method B: Email Address Field */
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                    Email Address *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="email"
                      value={custEmail}
                      onChange={(e) => setCustEmail(e.target.value)}
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
                </div>
              )}

              {/* Password Field */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                  Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type={custShowPass ? 'text' : 'password'}
                    value={custPassword}
                    onChange={(e) => setCustPassword(e.target.value)}
                    placeholder="Enter your password"
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
                    onClick={() => setCustShowPass(!custShowPass)}
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
                    {custShowPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div style={{ textAlign: 'right', marginTop: 6 }}>
                  <Link
                    href="/forgot-password"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#64748b',
                      textDecoration: 'none',
                    }}
                  >
                    Forgot Password?
                  </Link>
                </div>
              </div>

              <button
                type="submit"
                disabled={custLoading}
                style={{
                  width: '100%',
                  padding: '13px 22px',
                  borderRadius: 14,
                  border: 'none',
                  background: 'linear-gradient(135deg, #05424A 0%, #032B30 100%)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: 14.5,
                  cursor: custLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 8px 24px rgba(5,66,74,0.35)',
                  marginBottom: 16,
                }}
              >
                {custLoading ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    Signing in…
                  </>
                ) : (
                  <>
                    <LogIn size={16} />
                    Sign In to Account
                  </>
                )}
              </button>
            </form>

            {/* Create Account Link */}
            <div
              style={{
                textAlign: 'center',
                paddingTop: 14,
                borderTop: '1px solid #f1f5f9',
                fontSize: 13,
                color: '#64748b',
              }}
            >
              Don&apos;t have an account yet?{' '}
              <Link href="/signup" style={{ color: '#05424A', fontWeight: 800, textDecoration: 'none' }}>
                Create Account
              </Link>
            </div>

            {/* Toggle to Salon Staff Login */}
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <button
                type="button"
                onClick={() => {
                  setIsStaffMode(true);
                  setStaffError('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <ShieldCheck size={13} color="#EABA38" />
                <span>Salon Staff & Owner Console Login</span>
              </button>
            </div>
          </div>
        ) : (
          /* ══════════════════════════════════════════════════════
              MODE 2: STAFF & ADMIN LOGIN (PRESERVES EXISTING WORKFLOWS)
              ══════════════════════════════════════════════════════ */
          <div>
            {/* Role Selector Tabs */}
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
                  setSelectedRole('Admin');
                  setStaffError('');
                }}
                style={{
                  padding: '9px 12px',
                  borderRadius: 10,
                  border: 'none',
                  background: selectedRole === 'Admin' ? 'linear-gradient(135deg, #05424a 0%, #032b30 100%)' : 'transparent',
                  color: selectedRole === 'Admin' ? '#ffffff' : '#64748b',
                  fontWeight: selectedRole === 'Admin' ? 700 : 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <ShieldCheck size={15} color={selectedRole === 'Admin' ? '#eaba38' : 'currentColor'} />
                <span>Admin</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedRole('Salesperson');
                  setStaffError('');
                }}
                style={{
                  padding: '9px 12px',
                  borderRadius: 10,
                  border: 'none',
                  background: selectedRole === 'Salesperson' ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' : 'transparent',
                  color: selectedRole === 'Salesperson' ? '#ffffff' : '#64748b',
                  fontWeight: selectedRole === 'Salesperson' ? 700 : 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <UserCheck size={15} />
                <span>Salesperson</span>
              </button>
            </div>

            {/* Error message */}
            <AnimatePresence>
              {staffError && (
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
                    marginBottom: 16,
                  }}
                >
                  {staffError}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleStaffSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                  Staff Email / Username *
                </label>
                <input
                  type="email"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  placeholder="name@shreebeauty.com"
                  autoComplete="username"
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    fontSize: 14,
                    border: '1.5px solid #cbd5e1',
                    borderRadius: 12,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                  Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={staffShowPass ? 'text' : 'password'}
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    placeholder="Enter password"
                    autoComplete="current-password"
                    required
                    style={{
                      width: '100%',
                      padding: '11px 40px 11px 14px',
                      fontSize: 14,
                      border: '1.5px solid #cbd5e1',
                      borderRadius: 12,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setStaffShowPass(!staffShowPass)}
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
                    {staffShowPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={staffLoading}
                style={{
                  width: '100%',
                  padding: '13px 22px',
                  fontSize: 14.5,
                  fontWeight: 800,
                  color: '#ffffff',
                  borderRadius: 14,
                  border: 'none',
                  background:
                    selectedRole === 'Salesperson'
                      ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)'
                      : 'linear-gradient(135deg, #05424A 0%, #032B30 100%)',
                  boxShadow:
                    selectedRole === 'Salesperson'
                      ? '0 8px 24px rgba(22, 163, 74, 0.35)'
                      : '0 8px 24px rgba(5, 66, 74, 0.35)',
                  cursor: staffLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                {staffLoading ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    Authenticating…
                  </>
                ) : (
                  <>
                    <LogIn size={16} />
                    Sign In as {selectedRole}
                  </>
                )}
              </button>
            </form>

            {/* Switch back to Customer Login */}
            <div style={{ textAlign: 'center', paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
              <button
                type="button"
                onClick={() => {
                  setIsStaffMode(false);
                  setCustError('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#05424A',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <ArrowLeft size={13} />
                <span>Switch to Customer Account Login</span>
              </button>
            </div>
          </div>
        )}

        {/* Back to Public Website Link */}
        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <Link
            href="/"
            style={{
              color: '#64748b',
              fontSize: 12.5,
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <ArrowLeft size={13} /> Return to Public Website
          </Link>
        </div>
      </motion.div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          className="auth-bg"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#05424A' }}
        >
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#EABA38' }} />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
