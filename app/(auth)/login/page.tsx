'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Sparkles, Eye, EyeOff, Loader2, LogIn } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { scaleIn } from '@/variants';
import { SHREE_ONLY_LOGO_BASE64 } from '@/lib/logo-base64';

// Fixed owner credentials — single account only
const OWNER_EMAIL = 'shree@admin.com';
const OWNER_PASS  = 'shree1234';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState(OWNER_EMAIL);
  const [password, setPassword] = useState(OWNER_PASS);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) throw err;
      router.replace('/');
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
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
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
            Management System · Owner Login
          </p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{
                background: '#fff1f0', border: '1px solid #ffd5d3',
                color: '#a9352c', borderRadius: 8,
                padding: '10px 14px', fontSize: 13, marginBottom: 16,
              }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">Email</label>
            <input
              type="email" className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required autoFocus
            />
          </div>

          <div className="form-group" style={{ marginBottom: 24 }}>
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
            style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 15 }}
            whileTap={{ scale: 0.97 }}
            disabled={loading}
          >
            {loading
              ? <Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} />
              : <LogIn size={17} />}
            {loading ? 'Signing in…' : 'Sign In'}
          </motion.button>
        </form>

        <p style={{
          fontSize: 11.5, color: '#b0bec5',
          textAlign: 'center', marginTop: 20, lineHeight: 1.6,
        }}>
          🔒 Owner access only
        </p>
      </motion.div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
