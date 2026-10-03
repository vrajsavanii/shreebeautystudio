// app/(public)/auth/phone-email-callback/page.tsx
'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, AlertCircle, ShieldCheck, Sparkles } from 'lucide-react';

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const accessToken = searchParams.get('access_token');
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMsg, setErrorMsg] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (!accessToken) {
      setStatus('error');
      setErrorMsg('No verification token received. Please try verifying again.');
      return;
    }

    async function handleVerify() {
      try {
        const res = await fetch('/api/auth/phone-email-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: accessToken }),
        });

        const data = await res.json();
        if (data.success) {
          setStatus('success');
          setPhone(data.verifiedPhone || '');

          const payload = {
            type: 'PHONE_EMAIL_VERIFIED',
            verifiedPhone: data.verifiedPhone,
            customer: data.customer,
            appointments: data.appointments,
            bridal: data.bridal,
          };

          if (data.customer) {
            try {
              localStorage.setItem('shree_cached_customer', JSON.stringify(data.customer));
            } catch {}
          }

          // Notify opener popup or parent window
          if (window.opener && !window.opener.closed) {
            try {
              window.opener.postMessage(payload, window.location.origin);
              setTimeout(() => {
                window.close();
              }, 800);
            } catch {
              // Cross-origin opener error fallback to direct redirect
              let returnUrl = '/my-appointments';
              try {
                returnUrl = localStorage.getItem('pe_return_url') || '/my-appointments';
              } catch {}
              window.location.href = returnUrl;
            }
          } else if (window.parent && window.parent !== window) {
            try {
              window.parent.postMessage(payload, window.location.origin);
            } catch {}
          } else {
            // Standalone direct navigation (mobile & full-screen)
            setTimeout(() => {
              let returnUrl = '/my-appointments';
              try {
                returnUrl = localStorage.getItem('pe_return_url') || '/my-appointments';
              } catch {}
              window.location.href = returnUrl;
            }, 600);
          }
        } else {
          setStatus('error');
          setErrorMsg(data.error || 'Failed to verify phone number. Please try again.');
        }
      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err?.message || 'Verification network request failed.');
      }
    }

    handleVerify();
  }, [accessToken, router]);

  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: 'radial-gradient(ellipse at center, #064d57 0%, #03252a 70%, #011619 100%)',
        fontFamily: 'var(--font-sans, system-ui, -apple-system, sans-serif)',
      }}
    >
      <div
        style={{
          maxWidth: 440,
          width: '100%',
          background: '#ffffff',
          borderRadius: 24,
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          border: '1px solid rgba(234, 186, 56, 0.4)',
          padding: '36px 28px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            background: 'linear-gradient(135deg, #05424A 0%, #032B30 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px',
            color: '#EABA38',
            boxShadow: '0 6px 18px rgba(5,66,74,0.3)',
          }}
        >
          {status === 'verifying' ? (
            <Loader2 size={30} style={{ animation: 'spin 1s linear infinite' }} />
          ) : status === 'success' ? (
            <CheckCircle2 size={32} color="#16a34a" />
          ) : (
            <AlertCircle size={32} color="#dc2626" />
          )}
        </div>

        {status === 'verifying' && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#05424A', margin: '0 0 8px' }}>
              Verifying Security Code…
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
              Establishing secure Shree Beauty Studio client session…
            </p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#dcfce7', color: '#166534', padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
              <Sparkles size={12} color="#EABA38" />
              <span>Identity Verified</span>
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
              Welcome, Valued Client!
            </h2>
            <p style={{ fontSize: 13.5, color: '#475569', margin: '0 0 14px' }}>
              Authenticated with <strong>+91 {phone}</strong>.
            </p>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
              Unlocking your appointments now…
            </p>
          </div>
        )}

        {status === 'error' && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#dc2626', margin: '0 0 8px' }}>
              Verification Failed
            </h2>
            <p style={{ fontSize: 13, color: '#b91c1c', background: '#fef2f2', padding: 12, borderRadius: 12, border: '1px solid #fecaca', margin: '0 0 16px' }}>
              {errorMsg}
            </p>
            <button
              onClick={() => (window.opener ? window.close() : router.replace('/my-appointments'))}
              style={{
                width: '100%',
                padding: '12px 20px',
                background: '#05424A',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 13.5,
                borderRadius: 12,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {window.opener ? 'Close Window & Try Again' : 'Return to Appointments'}
            </button>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function PhoneEmailCallbackPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: '#05424A' }} />
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
