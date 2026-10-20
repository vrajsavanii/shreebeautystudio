'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { RotateCw, LayoutDashboard, ShieldAlert } from 'lucide-react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin panel error:', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: '100%',
          background: '#ffffff',
          borderRadius: 20,
          border: '1px solid #e2e8f0',
          padding: '36px 28px',
          textAlign: 'center',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)',
        }}
      >
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: '#fee2e2',
            border: '2px solid #fecaca',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px',
          }}
        >
          <ShieldAlert size={30} />
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
          Admin View Notice
        </h2>
        <p style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.5, margin: '0 0 24px' }}>
          ડેટા રેન્ડર કરવામાં અનપેક્ષિત વિલંબ થયો. તમારા ડેટા સુરક્ષિત છે. નીચે બટન પર ક્લિક કરીને રિલોડ કરો.
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#047857',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: 13.5,
              padding: '11px 20px',
              borderRadius: 10,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(4, 120, 87, 0.25)',
            }}
          >
            <RotateCw size={15} />
            <span>Retry (ફરી લોડ કરો)</span>
          </button>

          <Link
            href="/admin"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#f1f5f9',
              color: '#334155',
              fontWeight: 600,
              fontSize: 13.5,
              padding: '11px 18px',
              borderRadius: 10,
              textDecoration: 'none',
              border: '1px solid #cbd5e1',
            }}
          >
            <LayoutDashboard size={15} />
            <span>Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
