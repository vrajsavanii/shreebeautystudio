'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ShieldCheck, AlertCircle, Eye, EyeOff, LogIn, Loader2 } from 'lucide-react';
import { SHREE_ONLY_LOGO_BASE64 } from '@/lib/logo-base64';
import { useSalonStore, DEFAULT_USERS } from '@/lib/store';
import {
  getAdminSession,
  setAdminSession,
  clearAdminSession,
  verifyAdminCredentials,
} from '@/lib/admin-auth';
import { UserAccount } from '@/types/salon';

interface AdminAuthContextType {
  isAuthenticated: boolean;
  adminUser: string | null;
  role: 'Admin' | 'Salesperson';
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  isAuthenticated: false,
  adminUser: null,
  role: 'Admin',
  logout: () => {},
});

export const useAdminAuth = () => useContext(AdminAuthContext);

export default function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const { data, currentUser, setCurrentUser, logoutUser } = useSalonStore();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [adminUser, setAdminUser] = useState<string | null>(null);
  const [role, setRole] = useState<'Admin' | 'Salesperson'>('Admin');
  const [checking, setChecking] = useState<boolean>(true);

  // Form state
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    // Safety timer: NEVER stay on "Verifying Admin Access..." longer than 200ms
    const safetyTimer = setTimeout(() => {
      setChecking(false);
    }, 200);

    try {
      // 1. Check local session
      const session = getAdminSession();
      if (session && session.authenticated) {
        setIsAuthenticated(true);
        const uname = session.username || 'admin';
        setAdminUser(uname);
        setRole(session.role || 'Admin');
        if (!currentUser) {
          const usersList = (data?.users && data.users.length > 0) ? data.users : DEFAULT_USERS;
          const found = usersList.find(
            (u) => (u?.email || '').toLowerCase() === uname.toLowerCase()
          );
          setCurrentUser(
            found || {
              id: 'admin-session',
              name: uname,
              email: uname,
              role: session.role || 'Admin',
            }
          );
        }
        setChecking(false);
        clearTimeout(safetyTimer);
        return;
      }

      // 2. Check store currentUser if already authenticated
      if (currentUser) {
        setIsAuthenticated(true);
        const userEmail = currentUser.email || 'admin';
        setAdminUser(userEmail);
        setRole(currentUser.role || 'Admin');
        setAdminSession(userEmail, currentUser.role || 'Admin');
        setChecking(false);
        clearTimeout(safetyTimer);
        return;
      }

      // 3. Not authenticated -> Render login interface cleanly
      setIsAuthenticated(false);
      setChecking(false);
    } catch {
      setIsAuthenticated(false);
      setChecking(false);
    }

    return () => clearTimeout(safetyTimer);
  }, [currentUser, data?.users, setCurrentUser]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const normalizedUser = (username || '').trim().toLowerCase();
      const trimmedPass = (password || '').trim();
      const usersList = (data?.users && data.users.length > 0) ? data.users : DEFAULT_USERS;

      // 1. Try matching store users list with exact password check
      const matched = usersList.find(
        (u) =>
          (u?.email || '').toLowerCase() === normalizedUser &&
          u.password &&
          u.password === trimmedPass
      );

      if (matched) {
        setAdminSession(matched.email, matched.role);
        setCurrentUser(matched);
        setAdminUser(matched.email);
        setRole(matched.role);
        setIsAuthenticated(true);
        setLoading(false);
        return;
      }

      // 2. Try default credentials verification
      const verifyRes = verifyAdminCredentials(normalizedUser, trimmedPass);
      if (verifyRes.valid) {
        const userRole = verifyRes.role;
        const userObj: UserAccount = {
          id: userRole === 'Admin' ? 'user-admin' : 'user-sales',
          name: userRole === 'Admin' ? 'Studio Owner (Admin)' : 'Sales Executive',
          email: normalizedUser,
          role: userRole,
        };
        setAdminSession(normalizedUser, userRole);
        setCurrentUser(userObj);
        setAdminUser(normalizedUser);
        setRole(userRole);
        setIsAuthenticated(true);
        setLoading(false);
        return;
      }

      setError('Incorrect username or password. Please try again.');
    } catch {
      setError('An error occurred during authentication. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearAdminSession();
    logoutUser();
    setIsAuthenticated(false);
    setAdminUser(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  if (checking) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #032B30 0%, #05424A 100%)',
          color: '#ffffff',
          fontFamily: 'var(--font-sans, system-ui, sans-serif)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <Loader2
            size={36}
            style={{ animation: 'spin 1s linear infinite', color: '#EABA38', margin: '0 auto 16px' }}
          />
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '0.02em' }}>
            Verifying Admin Access...
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          background: 'radial-gradient(ellipse at center, #05424A 0%, #021a1d 100%)',
          position: 'relative',
          fontFamily: 'var(--font-sans, system-ui, sans-serif)',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          style={{
            width: '100%',
            maxWidth: 450,
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(20px)',
            borderRadius: 24,
            padding: 'clamp(24px, 5vw, 40px)',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(234, 186, 56, 0.25)',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 76,
                height: 76,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #05424A 0%, #032B30 100%)',
                border: '3px solid #EABA38',
                boxShadow: '0 8px 24px rgba(5, 66, 74, 0.3)',
                margin: '0 auto 14px',
                overflow: 'hidden',
              }}
            >
              <img
                src={SHREE_ONLY_LOGO_BASE64}
                alt="Shree Beauty Studio"
                style={{ width: '85%', height: '85%', objectFit: 'contain' }}
              />
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(5, 66, 74, 0.08)',
                color: '#05424A',
                padding: '4px 12px',
                borderRadius: 99,
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              <Lock size={12} /> Studio Admin Console
            </div>

            <h1
              style={{
                margin: '0 0 4px',
                fontSize: 'clamp(20px, 4vw, 24px)',
                fontWeight: 800,
                color: '#0f172a',
                letterSpacing: '-0.3px',
              }}
            >
              {data?.settings?.salon || 'Shree Beauty Studio'}
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
              Enter staff or owner credentials to unlock management tools &amp; billing.
            </p>
          </div>

          {/* Quick Role Pill Switcher */}
          <div
            style={{
              display: 'flex',
              background: '#f1f5f9',
              padding: 4,
              borderRadius: 12,
              marginBottom: 20,
              gap: 4,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setRole('Admin');
                setError('');
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 9,
                border: 'none',
                background: role === 'Admin' ? '#ffffff' : 'transparent',
                color: role === 'Admin' ? '#05424A' : '#64748b',
                fontWeight: role === 'Admin' ? 700 : 500,
                fontSize: 12.5,
                cursor: 'pointer',
                boxShadow: role === 'Admin' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              👑 Studio Owner
            </button>
            <button
              type="button"
              onClick={() => {
                setRole('Salesperson');
                setError('');
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 9,
                border: 'none',
                background: role === 'Salesperson' ? '#ffffff' : 'transparent',
                color: role === 'Salesperson' ? '#05424A' : '#64748b',
                fontWeight: role === 'Salesperson' ? 700 : 500,
                fontSize: 12.5,
                cursor: 'pointer',
                boxShadow: role === 'Salesperson' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              💼 Sales / Billing
            </button>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 12,
                  padding: '10px 14px',
                  marginBottom: 18,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12.5,
                  color: '#b91c1c',
                  fontWeight: 600,
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: 6,
                }}
              >
                Username or Email
              </label>
              <input
                type="text"
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. name@shreebeauty.com"
                required
                autoComplete="username"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: 14,
                  borderRadius: 10,
                  border: '1.5px solid #cbd5e1',
                  background: '#ffffff',
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: 6,
                }}
              >
                Passcode / Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter passcode"
                  required
                  autoComplete="current-password"
                  style={{
                    width: '100%',
                    padding: '10px 40px 10px 14px',
                    fontSize: 14,
                    borderRadius: 10,
                    border: '1.5px solid #cbd5e1',
                    background: '#ffffff',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
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
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading || !password.trim()}
              whileTap={{ scale: 0.98 }}
              style={{
                width: '100%',
                padding: '12px 20px',
                background: 'linear-gradient(135deg, #05424A 0%, #032B30 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 12,
                fontSize: 14.5,
                fontWeight: 700,
                cursor: loading || !password.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !password.trim() ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 8px 20px rgba(5, 66, 74, 0.25)',
                marginTop: 6,
                transition: 'all 0.2s ease',
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} />
                  Unlocking Portal...
                </>
              ) : (
                <>
                  <LogIn size={17} />
                  Unlock Admin Console
                </>
              )}
            </motion.button>
          </form>

          {/* Return to Public Website link */}
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <a
              href="/"
              style={{
                fontSize: 12.5,
                color: '#05424A',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              ← Return to Public Website
            </a>
          </div>

          {/* Security Notice */}
          <div
            style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: '1px solid #f1f5f9',
              textAlign: 'center',
              fontSize: 11.5,
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
            }}
          >
            <ShieldCheck size={14} color="#16a34a" />
            End-to-End Protected · Authorized Personnel Only
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <AdminAuthContext.Provider value={{ isAuthenticated, adminUser, role, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}
