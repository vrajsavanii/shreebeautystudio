import type { Metadata } from 'next';
import { Suspense } from 'react';
import ProfileClient from './ProfileClient';

export const metadata: Metadata = {
  title: 'My Profile & Account — Shree Beauty Studio',
  description: 'Manage your profile, view appointments, track billing history and saved addresses at Shree Beauty Studio, Surat.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontWeight: 600 }}>
          Loading your salon account…
        </div>
      }
    >
      <ProfileClient />
    </Suspense>
  );
}
