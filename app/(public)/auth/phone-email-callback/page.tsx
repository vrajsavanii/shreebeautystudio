// app/(public)/auth/phone-email-callback/page.tsx
'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';

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
      setErrorMsg('No access token received from Phone.Email. Please try verifying again.');
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

          // Check if this window was opened as a pop-up
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(
              {
                type: 'PHONE_EMAIL_VERIFIED',
                verifiedPhone: data.verifiedPhone,
                customer: data.customer,
                appointments: data.appointments,
                bridal: data.bridal,
              },
              window.location.origin
            );

            // Close popup after brief animation
            setTimeout(() => {
              window.close();
            }, 1200);
          } else {
            // Standalone window (e.g. mobile browser redirection)
            setTimeout(() => {
              let returnUrl = '/account';
              try {
                returnUrl = localStorage.getItem('pe_return_url') || '/account';
              } catch {}
              router.replace(returnUrl);
            }, 1500);
          }
        } else {
          setStatus('error');
          setErrorMsg(data.error || 'Failed to verify phone number with Phone.Email.');
        }
      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err?.message || 'Verification network request failed.');
      }
    }

    handleVerify();
  }, [accessToken, router]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 bg-stone-50 dark:bg-[#031d20]">
      <div className="max-w-md w-full bg-white dark:bg-[#072428] rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-[#02BD7E] border border-emerald-500/20">
            <ShieldCheck className="w-9 h-9" />
          </div>
        </div>

        {status === 'verifying' && (
          <div className="space-y-3">
            <Loader2 className="w-10 h-10 text-[#02BD7E] animate-spin mx-auto" />
            <h2 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100">
              Verifying SMS OTP...
            </h2>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Confirming your free phone verification token with Phone.Email.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-3 animate-fade-in">
            <CheckCircle2 className="w-12 h-12 text-[#02BD7E] mx-auto" />
            <h2 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100">
              Phone Number Verified!
            </h2>
            <p className="text-sm text-stone-600 dark:text-stone-300">
              Successfully authenticated with <strong>+91 {phone}</strong>.
            </p>
            <p className="text-xs text-stone-400">
              Closing window and returning to your session...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4 animate-fade-in">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <h2 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100">
              Verification Failed
            </h2>
            <p className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 p-3 rounded-xl border border-rose-200 dark:border-rose-900">
              {errorMsg}
            </p>
            <button
              onClick={() => (window.opener ? window.close() : router.replace('/login'))}
              className="w-full py-3 bg-stone-900 dark:bg-stone-700 text-white rounded-xl text-sm font-semibold hover:bg-stone-800 transition-all"
            >
              {window.opener ? 'Close Window' : 'Back to Login'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PhoneEmailCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-[#02BD7E] animate-spin" />
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
