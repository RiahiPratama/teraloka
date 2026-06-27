// ════════════════════════════════════════════════════════════════
// BALAUNDRY — Public directory landing page (orchestrator tipis)
// PATH: src/app/(public)/balaundry/page.tsx
// ════════════════════════════════════════════════════════════════
import { Suspense } from 'react';
import { BalaundryLanding } from '@/components/balaundry/public/BalaundryLanding';

export default function BalaundryPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
        Memuat…
      </div>
    }>
      <BalaundryLanding />
    </Suspense>
  );
}
