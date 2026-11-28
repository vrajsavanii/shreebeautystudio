'use client';

import { Suspense } from 'react';
import { AppointmentsPanel } from './AppointmentsView';

export default function AppointmentsPage() {
  return (
    <Suspense fallback={<div>Loading appointments…</div>}>
      <AppointmentsPanel />
    </Suspense>
  );
}
