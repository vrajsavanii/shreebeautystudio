// components/auth/PhoneEmailButton.tsx
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Smartphone, ShieldCheck, ExternalLink, Loader2 } from 'lucide-react';

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
  variant?: 'outline' | 'primary';
}

export default function PhoneEmailButton({
  onSuccess,
  returnUrl = '/my-appointments',
  purpose = 'login',
  className = '',
  label = 'Verify with Free SMS OTP (Phone.Email)',
  variant = 'outline',
}: PhoneEmailButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

  const clientId = process.env.NEXT_PUBLIC_PHONE_EMAIL_CLIENT_ID || '';

  // Listen for postMessage from the popup window callback
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Security check: ensure origin matches
      if (typeof window !== 'undefined' && event.origin !== window.location.origin) return;

      if (event.data && event.data.type === 'PHONE_EMAIL_VERIFIED') {
        setLoading(false);
        if (onSuccess) {
          onSuccess(event.data);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onSuccess]);

  const handleOpenAuth = useCallback(() => {
    if (!clientId) {
      setShowConfigModal(true);
      return;
    }

    setLoading(true);
    try {
      localStorage.setItem('pe_return_url', returnUrl);
    } catch {}

    const width = 500;
    const height = 580;
    const top = (window.screen.height - height) / 2;
    const left = (window.screen.width - width) / 2;

    const redirectUrl = `${window.location.origin}/auth/phone-email-callback`;
    const authUrl = `https://www.phone.email/auth/log-in?client_id=${clientId}&redirect_url=${encodeURIComponent(
      redirectUrl
    )}`;
    const windowFeatures = `toolbar=0,scrollbars=0,location=0,statusbar=0,menubar=0,resizable=0,width=${width},height=${height},top=${top},left=${left}`;

    const authWindow = window.open(authUrl, 'peLoginWindow', windowFeatures);

    // Watch if user closes popup manually
    const timer = setInterval(() => {
      if (authWindow && authWindow.closed) {
        clearInterval(timer);
        setLoading(false);
      }
    }, 1000);
  }, [clientId, returnUrl]);

  return (
    <>
      <button
        type="button"
        onClick={handleOpenAuth}
        disabled={loading}
        className={`w-full flex items-center justify-between gap-3 py-3 px-4 rounded-xl font-semibold transition-all duration-200 active:scale-[0.99] cursor-pointer shadow-sm ${
          variant === 'primary'
            ? 'bg-[#02BD7E] hover:bg-[#02a970] text-white border-none'
            : 'border border-emerald-500/30 bg-emerald-50/70 hover:bg-emerald-100/80 dark:bg-emerald-950/25 dark:hover:bg-emerald-900/40 text-emerald-900 dark:text-emerald-200'
        } ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-[#02BD7E] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Smartphone className="w-4 h-4" />
            )}
          </div>
          <span className="text-xs sm:text-sm font-bold text-left">
            {loading ? 'Waiting for OTP in popup…' : label}
          </span>
        </div>

        <span className="text-[10px] tracking-wider uppercase font-black bg-[#02BD7E]/15 text-[#02BD7E] dark:bg-[#02BD7E]/30 dark:text-emerald-300 px-2.5 py-1 rounded-md border border-[#02BD7E]/20 flex-shrink-0">
          FREE SMS
        </span>
      </button>

      {/* Helpful Setup Modal if CLIENT_ID is not configured yet */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#072428] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-4">
            <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="w-7 h-7" />
              <div>
                <h3 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100 leading-tight">
                  Phone.Email Free SMS Setup
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Ready to activate free SMS OTP verifications
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
              The Phone.Email integration is implemented in the codebase. To activate the live SMS OTP gateway, add your free <strong>CLIENT_ID</strong>:
            </p>

            <ol className="text-xs text-stone-700 dark:text-stone-300 space-y-2 list-decimal list-inside bg-stone-50 dark:bg-stone-900/50 p-4 rounded-2xl border border-stone-200 dark:border-stone-800">
              <li>
                Sign in to your free account at{' '}
                <a
                  href="https://admin.phone.email"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-600 dark:text-emerald-400 underline font-bold"
                >
                  admin.phone.email
                </a>.
              </li>
              <li>
                Click <strong>Button Settings</strong> & copy your <strong>CLIENT_ID</strong>.
              </li>
              <li>
                Add to your environment variables:{' '}
                <code className="block mt-1 p-1 bg-stone-200 dark:bg-stone-800 rounded text-[11px] font-mono break-all text-emerald-700 dark:text-emerald-300">
                  NEXT_PUBLIC_PHONE_EMAIL_CLIENT_ID=your_id
                </code>
              </li>
            </ol>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-200 rounded-xl text-xs font-semibold hover:bg-stone-300 transition-all"
              >
                Close
              </button>
              <a
                href="https://admin.phone.email"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-[#02BD7E] hover:bg-[#029e69] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
              >
                Open Admin Dashboard <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
