'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2, LogIn, ShieldCheck, UserCheck, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { scaleIn } from '@/variants';
import { SHREE_ONLY_LOGO_BASE64 } from '@/lib/logo-base64';
import { useSalonStore, DEFAULT_USERS } from '@/lib/store';
import { UserAccount } from '@/types/salon';
import { setAdminSession } from '@/lib/admin-auth';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect');

  const { data, setCurrentUser } = useSalonStore();
  const usersList = data?.users && data.users.length > 0 ? data.users : DEFAULT_USERS;

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [selectedRole, setSelectedRole] = useState<'Admin' | 'Salesperson'>('Admin');

  const getTargetRoute = (role: 'Admin' | 'Salesperson') => {
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
        const isAllowed = allowed.some(
          (r) => redirectTarget === r || redirectTarget.startsWith(r + '/')
        );
        if (isAllowed) return redirectTarget;
        return '/admin/billing';
      }
      return redirectTarget;
    }
    return role === 'Salesperson' ? '/admin/billing' : '/admin';
  };

  const handleRoleSelect = (role: 'Admin' | 'Salesperson') => {
    setSelectedRole(role);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const trimmedEmail = email.trim().toLowerCase();
      // Match against stored users with exact password check
      const matchedUser = usersList.find(
        (u) => u.email.toLowerCase() === trimmedEmail && u.password && u.password === password
      );

      if (matchedUser) {
        setCurrentUser(matchedUser);
        setAdminSession(matchedUser.email, matchedUser.role);
        router.replace(getTargetRoute(matchedUser.role));
        return;
      }

      // Fallback Supabase auth check if configured
      try {
        const { data: authRes, error: err } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
        if (!err && authRes?.user) {
          const adminUser: UserAccount = {
            id: authRes.user.id,
            name: authRes.user.user_metadata?.name || 'Studio Owner',
            email: authRes.user.email || trimmedEmail,
            role: 'Admin',
          };
          setCurrentUser(adminUser);
          setAdminSession(adminUser.email, adminUser.role);
          router.replace(getTargetRoute(adminUser.role));
          return;
        }
      } catch {
        // Ignore fallback
      }

      setError('Invalid email or password. Please verify your credentials and try again.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid credentials.');
    } finally {
      setLoading(false);
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
        background: 'radial-gradient(ellipse at center, #05424A 0%, #021a1d 100%)',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        fontFamily: 'var(--font-sans, system-ui, -apple-system, sans-serif)',
      }}
    >
      {/* Decorative ambient circles */}
      <div
        style={{
          position: 'absolute',
          top: '10%',
          left: '6%',
          width: 220,
          height: 220,
          borderRadius: '50%',
          border: '1px solid rgba(234, 186, 56, 0.18)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '12%',
          right: '8%',
          width: 160,
          height: 160,
          borderRadius: '50%',
          border: '1px solid rgba(234, 186, 56, 0.12)',
          pointerEvents: 'none',
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="auth-card"
        style={{
          width: '100%',
          maxWidth: 440,
          margin: '0 auto',
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(20px)',
          borderRadius: 24,
          padding: 'clamp(28px, 5vw, 40px) clamp(22px, 5vw, 36px)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(234, 186, 56, 0.25)',
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
              boxShadow: '0 8px 24px rgba(5, 66, 74, 0.25)',
              border: '3px solid #EABA38',
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
              style={{
                width: '85%',
                height: '85%',
                objectFit: 'contain',
              }}
            />
          </div>
          <h1
            style={{
              fontSize: 23,
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-.4px',
              marginBottom: 4,
            }}
          >
            Shree Beauty Studio
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
            Management Console · Account Sign In
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 6,
            marginBottom: 20,
            background: '#f1f5f9',
            padding: 4,
            borderRadius: 12,
          }}
        >
          <button
            type="button"
            onClick={() => handleRoleSelect('Admin')}
            style={{
              padding: '9px 12px',
              borderRadius: 9,
              border: 'none',
              background: selectedRole === 'Admin' ? '#05424a' : 'transparent',
              color: selectedRole === 'Admin' ? '#ffffff' : '#64748b',
              fontWeight: selectedRole === 'Admin' ? 700 : 500,
              fontSize: 12.5,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxShadow: selectedRole === 'Admin' ? '0 2px 6px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <ShieldCheck size={15} /> 👑 Admin
          </button>
          <button
            type="button"
            onClick={() => handleRoleSelect('Salesperson')}
            style={{
              padding: '9px 12px',
              borderRadius: 9,
              border: 'none',
              background: selectedRole === 'Salesperson' ? '#16a34a' : 'transparent',
              color: selectedRole === 'Salesperson' ? '#ffffff' : '#64748b',
              fontWeight: selectedRole === 'Salesperson' ? 700 : 500,
              fontSize: 12.5,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxShadow: selectedRole === 'Salesperson' ? '0 2px 6px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <UserCheck size={15} /> 👤 Salesperson
          </button>
        </div>

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
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: 12.5,
                fontWeight: 600,
                marginBottom: 16,
              }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 18 }}>
            <label
              style={{
                display: 'block',
                fontSize: 12.5,
                fontWeight: 700,
                color: '#334155',
                marginBottom: 6,
                letterSpacing: '0.01em',
              }}
            >
              User Email / Username
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. name@shreebeauty.com"
              autoComplete="username"
              required
              autoFocus
              style={{
                width: '100%',
                padding: '11px 14px',
                fontSize: 14,
                border: '1.5px solid #cbd5e1',
                borderRadius: 10,
                background: '#ffffff',
                color: '#0f172a',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'all 0.2s ease',
              }}
            />
          </div>

          <div style={{ marginBottom: 22 }}>
            <label
              style={{
                display: 'block',
                fontSize: 12.5,
                fontWeight: 700,
                color: '#334155',
                marginBottom: 6,
                letterSpacing: '0.01em',
              }}
            >
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                required
                style={{
                  width: '100%',
                  padding: '11px 42px 11px 14px',
                  fontSize: 14,
                  border: '1.5px solid #cbd5e1',
                  borderRadius: 10,
                  background: '#ffffff',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'all 0.2s ease',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                aria-label={showPass ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0,
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <motion.button
            type="submit"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '12px 20px',
              fontSize: 14.5,
              fontWeight: 700,
              color: '#ffffff',
              borderRadius: 12,
              border: 'none',
              background:
                selectedRole === 'Salesperson'
                  ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)'
                  : 'linear-gradient(135deg, #05424A 0%, #032B30 100%)',
              boxShadow:
                selectedRole === 'Salesperson'
                  ? '0 8px 20px rgba(22, 163, 74, 0.25)'
                  : '0 8px 20px rgba(5, 66, 74, 0.25)',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.75 : 1,
              transition: 'all 0.2s ease',
            }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} />
                Authenticating…
              </>
            ) : (
              <>
                <LogIn size={17} />
                Sign In as {selectedRole}
              </>
            )}
          </motion.button>
        </form>

        {/* Security Notice */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            marginTop: 20,
            paddingTop: 16,
            borderTop: '1px solid #f1f5f9',
            fontSize: 11.5,
            color: '#94a3b8',
            fontWeight: 500,
          }}
        >
          <ShieldCheck size={14} color="#16a34a" />
          End-to-End Protected · Authorized Personnel Only
        </div>

        {/* Back to Public Website Link */}
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Link
            href="/"
            style={{
              color: '#05424A',
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
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#EABA38' }} />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}

