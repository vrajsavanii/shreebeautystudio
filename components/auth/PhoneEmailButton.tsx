// components/auth/PhoneEmailButton.tsx
// 100% Authentic Shree Beauty Studio SMS OTP Gateway Trigger
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Smartphone, Sparkles, Loader2, ShieldCheck, Check } from 'lucide-react';

interface PhoneEmailButtonProps {
  onSuccess?: (data: {
    verifiedPhone: string;
    customer?: any;
    appointments?: any[];
    bridal?: any[];
  }) => void;
  returnUrl?: string;
  purpose?: 'login' | 'signup' | 'my-appointments';
  className?: string;
  label?: string;
  sublabel?: string;
  phone?: string;
}

export default function PhoneEmailButton({
  onSuccess,
  returnUrl = '/my-appointments',
  purpose = 'login',
  className = '',
  label = 'Verify via Instant SMS OTP',
  sublabel = 'Free SMS delivered directly to your mobile network',
  phone,
}: PhoneEmailButtonProps) {
  const [loading, setLoading] = useState(false);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);

  const clientId =
    process.env.NEXT_PUBLIC_PHONE_EMAIL_CLIENT_ID || '14193176295000530175';

  // Listen for postMessage from the Phone.Email popup window or callback
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // 1. Message from our internal callback page
      if (typeof window !== 'undefined' && event.origin === window.location.origin) {
        if (event.data && event.data.type === 'PHONE_EMAIL_VERIFIED') {
          setLoading(false);
          setVerifiedSuccess(true);
          if (onSuccess) {
            onSuccess(event.data);
          }
          return;
        }
      }

      // 2. Direct message from Phone.Email popup (auth_type=8 official web postMessage)
      if (
        event.origin === 'https://auth.phone.email' ||
        event.origin === 'https://www.phone.email'
      ) {
        const userJsonUrl = event.data?.user_json_url;
        const flagPhone = event.data?.flag_phone;

        if (userJsonUrl || flagPhone === '1' || flagPhone === 1) {
          setLoading(true);
          try {
            const res = await fetch('/api/auth/phone-email-verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_json_url: userJsonUrl,
                purpose,
              }),
            });

            const data = await res.json();
            if (data.success) {
              setLoading(false);
              setVerifiedSuccess(true);
              if (onSuccess) {
                onSuccess({
                  verifiedPhone: data.verifiedPhone,
                  customer: data.customer,
                  appointments: data.appointments,
                  bridal: data.bridal,
                });
              }
            } else {
              setLoading(false);
              alert(data.error || 'Verification failed. Please try again.');
            }
          } catch (err: any) {
            setLoading(false);
            console.error('Failed to verify Phone.Email token:', err);
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onSuccess, purpose]);

  const handleOpenAuth = useCallback(() => {
    setLoading(true);
    setVerifiedSuccess(false);

    try {
      localStorage.setItem('pe_return_url', returnUrl);
      localStorage.setItem('pe_purpose', purpose);
    } catch {}

    const cleanPhone = phone ? phone.replace(/\D/g, '').slice(-10) : '';
    const phoneParam = cleanPhone && cleanPhone.length === 10 ? `&user_phone_no=${cleanPhone}` : '';
    const currentHref = typeof window !== 'undefined' ? window.location.href : '';

    // The official authorized Phone.Email modal URL with auth_type=8:
    const authUrl = `https://auth.phone.email/log-in?client_id=${clientId}&auth_type=8&origin=${encodeURIComponent(
      currentHref
    )}${phoneParam}`;

    // Centered popup modal with official dimensions
    const width = 500;
    const height = 560;
    const top = (window.screen.height - height) / 2;
    const left = (window.screen.width - width) / 2;
    const windowFeatures = `toolbar=0,scrollbars=0,location=0,statusbar=0,menubar=0,resizable=0,width=${width},height=${height},top=${top},left=${left}`;

    let authWindow: Window | null = null;
    try {
      authWindow = window.open(authUrl, 'peLoginWindow', windowFeatures);
    } catch {
      authWindow = null;
    }

    if (!authWindow || authWindow.closed || typeof authWindow.closed === 'undefined') {
      // Browser popup blocker prevented window from opening; navigate directly
      window.location.href = authUrl;
      return;
    }

    // Watch if user closes popup manually without completing verification
    const timer = setInterval(() => {
      if (authWindow && authWindow.closed) {
        clearInterval(timer);
        setLoading(false);
      }
    }, 1000);
  }, [clientId, returnUrl, purpose, phone]);


  return (
    <button
      type="button"
      onClick={handleOpenAuth}
      disabled={loading || verifiedSuccess}
      style={{
        width: '100%',
        padding: '14px 18px',
        borderRadius: 16,
        border: '1.5px solid rgba(234, 186, 56, 0.4)',
        background: 'linear-gradient(135deg, #05424A 0%, #02252A 100%)',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        cursor: loading ? 'wait' : 'pointer',
        boxShadow: '0 6px 20px rgba(5, 66, 74, 0.28)',
        transition: 'all 0.2s ease',
        textAlign: 'left',
        boxSizing: 'border-box',
      }}
      className={className}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'rgba(234, 186, 56, 0.18)',
            border: '1px solid rgba(234, 186, 56, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#EABA38',
            flexShrink: 0,
          }}
        >
          {loading ? (
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
          ) : verifiedSuccess ? (
            <Check size={18} color="#4ade80" />
          ) : (
            <Smartphone size={18} />
          )}
        </div>

        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>{loading ? 'Awaiting SMS code verification…' : verifiedSuccess ? 'Verified Successfully!' : label}</span>
            <Sparkles size={13} color="#EABA38" />
          </div>
          <div style={{ fontSize: 11.5, color: 'rgba(255, 255, 255, 0.75)', marginTop: 2 }}>
            {sublabel}
          </div>
        </div>
      </div>

      <div
        style={{
          background: 'rgba(234, 186, 56, 0.15)',
          color: '#EABA38',
          border: '1px solid rgba(234, 186, 56, 0.3)',
          borderRadius: 8,
          padding: '4px 10px',
          fontSize: 10.5,
          fontWeight: 800,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <ShieldCheck size={12} />
        <span>SMS OTP</span>
      </div>
    </button>
  );
}
