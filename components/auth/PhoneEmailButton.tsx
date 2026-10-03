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
}

export default function PhoneEmailButton({
  onSuccess,
  returnUrl = '/my-appointments',
  purpose = 'login',
  className = '',
  label = 'Verify via Instant SMS OTP',
  sublabel = 'Free SMS delivered directly to your mobile network',
}: PhoneEmailButtonProps) {
  const [loading, setLoading] = useState(false);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);

  const clientId =
    process.env.NEXT_PUBLIC_PHONE_EMAIL_CLIENT_ID || '14193176295000530175';

  // Listen for postMessage from the popup window callback
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (typeof window !== 'undefined' && event.origin !== window.location.origin) return;

      if (event.data && event.data.type === 'PHONE_EMAIL_VERIFIED') {
        setLoading(false);
        setVerifiedSuccess(true);
        if (onSuccess) {
          onSuccess(event.data);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onSuccess]);

  const handleOpenAuth = useCallback(() => {
    setLoading(true);
    setVerifiedSuccess(false);

    try {
      localStorage.setItem('pe_return_url', returnUrl);
      localStorage.setItem('pe_purpose', purpose);
    } catch {}

    const width = 480;
    const height = 580;
    const top = (window.screen.height - height) / 2;
    const left = (window.screen.width - width) / 2;

    const redirectUrl = `${window.location.origin}/auth/phone-email-callback`;
    const authUrl = `https://www.phone.email/auth/log-in?client_id=${clientId}&redirect_url=${encodeURIComponent(
      redirectUrl
    )}`;
    const windowFeatures = `toolbar=0,scrollbars=0,location=0,statusbar=0,menubar=0,resizable=0,width=${width},height=${height},top=${top},left=${left}`;

    const authWindow = window.open(authUrl, 'shreeAuthWindow', windowFeatures);

    // Watch if user closes popup manually
    const timer = setInterval(() => {
      if (authWindow && authWindow.closed) {
        clearInterval(timer);
        setLoading(false);
      }
    }, 1000);
  }, [clientId, returnUrl, purpose]);

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
