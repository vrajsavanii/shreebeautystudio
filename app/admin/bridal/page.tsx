'use client';

import { Suspense } from 'react';
import { BridalPanel } from './BridalView';

export default function BridalPage() {
  return (
    <Suspense fallback={<div>Loading bridal studio…</div>}>
      <BridalPanel />
    </Suspense>
  );
}
