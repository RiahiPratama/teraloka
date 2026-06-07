// ════════════════════════════════════════════════════════════════
// BAKOS — Kos Detail page (orchestrator tipis, mirror /bakos/page.tsx)
// PATH: src/app/(public)/bakos/[slug]/page.tsx
// ════════════════════════════════════════════════════════════════
import { Suspense } from 'react';
import { KosDetail } from '@/components/bakos/public/detail/KosDetail';

export default function KosDetailPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
        Memuat…
      </div>
    }>
      <KosDetail />
    </Suspense>
  );
}
