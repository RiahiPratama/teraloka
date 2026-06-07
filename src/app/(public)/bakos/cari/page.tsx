// ════════════════════════════════════════════════════════════════
// BAKOS — Halaman Cari (orchestrator tipis)
// PATH: src/app/(public)/bakos/cari/page.tsx
// ════════════════════════════════════════════════════════════════
import { Suspense } from 'react';
import { BakosCari } from '@/components/bakos/public/search/BakosCari';

export default function BakosCariPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
        Memuat…
      </div>
    }>
      <BakosCari />
    </Suspense>
  );
}
