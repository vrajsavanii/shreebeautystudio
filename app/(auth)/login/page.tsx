'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2, LogIn, ShieldCheck, UserCheck, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { scaleIn } from '@/variants';

import { useSalonStore, DEFAULT_USERS } from '@/lib/store';
import { UserAccount } from '@/types/salon';
import { setAdminSession } from '@/lib/admin-auth';
import { SHREE_ONLY_LOGO_BASE64 } from '@/lib/logo-base64';

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
      const trimmedEmail = (email || '').trim().toLowerCase();
      const trimmedPass = (password || '').trim();
      // Match against stored users with exact password check
      const matchedUser = usersList.find(
        (u) => (u?.email || '').toLowerCase() === trimmedEmail && u.password && u.password === trimmedPass
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
        background: 'radial-gradient(ellipse at center, #064d57 0%, #03252a 60%, #011619 100%)',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        fontFamily: 'var(--font-sans, system-ui, -apple-system, sans-serif)',
      }}
    >
      {/* Decorative ambient floating orbs */}
      <div
        className="floating-orb"
        style={{
          top: '5%',
          left: '8%',
          width: 380,
          height: 380,
          background: 'radial-gradient(circle, rgba(234, 186, 56, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        className="floating-orb floating-orb-2"
        style={{
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
        transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="auth-card"
        style={{
          width: '100%',
          maxWidth: 450,
          margin: '0 auto',
          background: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderRadius: 28,
          padding: 'clamp(32px, 5vw, 44px) clamp(24px, 5vw, 38px)',
          boxShadow: '0 30px 70px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(234, 186, 56, 0.3)',
          position: 'relative',
          zIndex: 10,
          boxSizing: 'border-box',
        }}
      >
        {/* Logo & Header */}
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div
            className="logo-img-wrap"
            style={{
              width: 82,
              height: 82,
              borderRadius: '50%',
              margin: '0 auto 14px',
              boxShadow: '0 10px 28px rgba(5, 66, 74, 0.3), 0 0 0 3px #EABA38',
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
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '50%',
              }}
            />
          </div>
          <h1
            className="display-font"
            style={{
              fontSize: 27,
              fontWeight: 700,
              color: '#05424A',
              letterSpacing: '-.4px',
              marginBottom: 4,
            }}
          >
            Shree Beauty Studio
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
            Management Console · Account Sign In
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            marginBottom: 24,
            background: '#f1f5f9',
            padding: 5,
            borderRadius: 14,
            border: '1px solid #e2e8f0',
          }}
        >
          <button
            type="button"
            onClick={() => handleRoleSelect('Admin')}
            style={{
              padding: '10px 14px',
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
              boxShadow: selectedRole === 'Admin' ? '0 4px 12px rgba(5,66,74,0.25)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <ShieldCheck size={16} style={{ color: selectedRole === 'Admin' ? '#eaba38' : 'currentColor' }} /> 👑 Admin
          </button>
          <button
            type="button"
            onClick={() => handleRoleSelect('Salesperson')}
            style={{
              padding: '10px 14px',
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
              boxShadow: selectedRole === 'Salesperson' ? '0 4px 12px rgba(22,163,74,0.25)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <UserCheck size={16} /> 👤 Salesperson
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
                borderRadius: 12,
                padding: '12px 16px',
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 18,
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
                padding: '12px 16px',
                fontSize: 14,
                border: '1.5px solid #cbd5e1',
                borderRadius: 12,
                background: '#ffffff',
                color: '#0f172a',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'all 0.2s ease',
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
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
                  padding: '12px 44px 12px 16px',
                  fontSize: 14,
                  border: '1.5px solid #cbd5e1',
                  borderRadius: 12,
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
                  right: 14,
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
                {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <motion.button
            type="submit"
            className="btn-glow"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
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

