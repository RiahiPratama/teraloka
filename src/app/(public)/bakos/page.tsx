// ════════════════════════════════════════════════════════════════
// BAKOS — Public landing page
// PATH: src/app/(public)/bakos/page.tsx
// Orchestrator tipis: render <BakosLanding/> (semua logika di komponen).
// ════════════════════════════════════════════════════════════════

import { Suspense } from 'react';
import { BakosLanding } from '@/components/bakos/public/BakosLanding';

export default function BakosPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: '#9CA3AF' }}>Memuat…</p>
        </div>
      }
    >
      <BakosLanding />
    </Suspense>
  );
}
