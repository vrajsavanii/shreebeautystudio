'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, LogIn, ShieldCheck, UserCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { scaleIn } from '@/variants';
import { SHREE_ONLY_LOGO_BASE64 } from '@/lib/logo-base64';
import { useSalonStore, DEFAULT_USERS } from '@/lib/store';
import { UserAccount } from '@/types/salon';

export default function LoginPage() {
  const router = useRouter();
  const { data, setCurrentUser } = useSalonStore();
  const usersList = data?.users && data.users.length > 0 ? data.users : DEFAULT_USERS;

  const [email, setEmail]       = useState(DEFAULT_USERS[0].email);
  const [password, setPassword] = useState(DEFAULT_USERS[0].password || '');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [selectedRole, setSelectedRole] = useState<'Admin' | 'Salesperson'>('Admin');

  const handleRoleSelect = (role: 'Admin' | 'Salesperson') => {
    setSelectedRole(role);
    const targetUser = usersList.find((u) => u.role === role) || (role === 'Admin' ? DEFAULT_USERS[0] : DEFAULT_USERS[1]);
    if (targetUser) {
      setEmail(targetUser.email);
      setPassword(targetUser.password || (role === 'Admin' ? 'shree1234' : 'sales1234'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const trimmedEmail = email.trim().toLowerCase();
      // Match against stored users
      const matchedUser = usersList.find(
        (u) => u.email.toLowerCase() === trimmedEmail && (u.password ? u.password === password : true)
      );

      if (matchedUser) {
        setCurrentUser(matchedUser);
        if (matchedUser.role === 'Salesperson') {
          router.replace('/billing');
        } else {
          router.replace('/');
        }
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
          router.replace('/');
          return;
        }
      } catch {
        // Ignore fallback
      }

      setError('Invalid email or password. Try shree@admin.com or sales@shree.com');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      {/* Decorative circles */}
      <div style={{
        position: 'absolute', top: '10%', left: '5%',
        width: 180, height: 180, borderRadius: '50%',
        border: '1px solid rgba(234,186,56,.15)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '15%', right: '8%',
        width: 120, height: 120, borderRadius: '50%',
        border: '1px solid rgba(234,186,56,.10)', pointerEvents: 'none',
      }} />

      <motion.div variants={scaleIn} initial="hidden" animate="visible" className="auth-card">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <img
            src={SHREE_ONLY_LOGO_BASE64}
            alt="Shree Beauty Studio"
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              objectFit: 'cover',
              margin: '0 auto 12px',
              boxShadow: '0 8px 24px rgba(5,66,74,.25)',
              border: '3px solid #EABA38',
              display: 'block',
            }}
          />
          <h1 style={{
            fontSize: 23, fontWeight: 800, color: '#172126',
            letterSpacing: '-.4px', marginBottom: 4,
          }}>
            Shree Beauty Studio
          </h1>
          <p style={{ fontSize: 13, color: '#6b7880', fontWeight: 500 }}>
            Management System · Account Sign In
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            marginBottom: 20,
            background: '#f1f5f9',
            padding: 4,
            borderRadius: 10,
          }}
        >
          <button
            type="button"
            onClick={() => handleRoleSelect('Admin')}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: 'none',
              background: selectedRole === 'Admin' ? '#05424a' : 'transparent',
              color: selectedRole === 'Admin' ? '#ffffff' : '#475569',
              fontWeight: selectedRole === 'Admin' ? 700 : 500,
              fontSize: 12.5,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'all 0.15s ease',
            }}
          >
            <ShieldCheck size={15} /> 👑 Admin
          </button>
          <button
            type="button"
            onClick={() => handleRoleSelect('Salesperson')}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: 'none',
              background: selectedRole === 'Salesperson' ? '#16a34a' : 'transparent',
              color: selectedRole === 'Salesperson' ? '#ffffff' : '#475569',
              fontWeight: selectedRole === 'Salesperson' ? 700 : 500,
              fontSize: 12.5,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'all 0.15s ease',
            }}
          >
            <UserCheck size={15} /> 👤 Salesperson
          </button>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{
                background: '#fff1f0', border: '1px solid #ffd5d3',
                color: '#a9352c', borderRadius: 8,
                padding: '10px 14px', fontSize: 12.5, marginBottom: 16,
              }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">User Email / Username</label>
            <input
              type="email" className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required autoFocus
            />
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingRight: 42 }}
              />
              <button
                type="button" onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute', right: 11, top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#6b7880', display: 'flex', alignItems: 'center',
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <motion.button
            type="submit"
            className="btn btn-primary"
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '12px',
              fontSize: 14.5,
              background: selectedRole === 'Salesperson' ? 'linear-gradient(135deg, #16a34a, #15803d)' : undefined,
              borderColor: selectedRole === 'Salesperson' ? '#16a34a' : undefined,
            }}
            whileTap={{ scale: 0.97 }}
            disabled={loading}
          >
            {loading
              ? <Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} />
              : <LogIn size={17} />}
            {loading ? 'Authenticating…' : `Sign In as ${selectedRole}`}
          </motion.button>
        </form>

        <div style={{
          fontSize: 11, color: '#64748b',
          textAlign: 'center', marginTop: 20, lineHeight: 1.5,
          background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0'
        }}>
          <b>Demo Accounts Quick Info:</b><br />
          👑 <b>Admin:</b> shree@admin.com (shree1234)<br />
          👤 <b>Salesperson:</b> sales@shree.com (sales1234)
        </div>
      </motion.div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

