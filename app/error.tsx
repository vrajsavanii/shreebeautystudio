'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { RotateCw, Home, ShieldAlert } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console for diagnostics
    console.error('Unhandled application error:', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #02191c 0%, #032b30 100%)',
        color: '#ffffff',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        padding: '24px 16px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: '100%',
          background: 'rgba(3, 43, 48, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(234, 186, 56, 0.3)',
          borderRadius: 20,
          padding: '36px 28px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(234, 186, 56, 0.15)',
            border: '2px solid rgba(234, 186, 56, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            color: '#EABA38',
          }}
        >
          <ShieldAlert size={32} />
        </div>

        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: '#ffffff',
            margin: '0 0 10px',
            letterSpacing: '-0.01em',
          }}
        >
          Something went wrong
        </h1>

        <p
          style={{
            fontSize: 14,
            color: 'rgba(255, 255, 255, 0.75)',
            lineHeight: 1.6,
            margin: '0 0 24px',
          }}
        >
          કંઈક અનપેક્ષિત સમસ્યા આવી છે. નીચે આપેલા બટન પર ક્લિક કરીને ફરી પ્રયાસ કરો અથવા હોમ પેજ પર જાઓ.
        </p>

        <div
          style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={() => reset()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'linear-gradient(135deg, #EABA38 0%, #D4AF37 100%)',
              color: '#032B30',
              fontWeight: 800,
              fontSize: 14,
              padding: '12px 22px',
              borderRadius: 12,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 6px 18px rgba(234, 186, 56, 0.35)',
              transition: 'transform 0.15s ease',
            }}
          >
            <RotateCw size={16} />
            <span>Try Again (ફરી પ્રયાસ કરો)</span>
          </button>

          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: 14,
              padding: '12px 20px',
              borderRadius: 12,
              textDecoration: 'none',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              transition: 'all 0.15s ease',
            }}
          >
            <Home size={16} />
            <span>Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
