'use client';

// ════════════════════════════════════════════════════════════════
// BALAUNDRY — Landing orchestrator. Port 1:1 balaundry-lp-final.html.
// PATH: src/components/balaundry/public/BalaundryLanding.tsx
// 🛡️ Chrome (nav/footer) dari layout (public) GLOBAL. Hero (peta) lulus.
//   HANYA section 2 (Populer) fetch /balaundry/directory; section 3-7 statis.
//   Wave divider + reveal (IO). Material Symbols, var token.
// ════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback, useRef } from 'react';
import './balaundry-landing.css';
import { API_URL, type Laundry } from '@/lib/balaundry-links';
import { HeroSection } from './hero-section';
import { ListingGrid } from './listing-grid';
import { OwnerBand } from './owner-cta-section';
import { KategoriSection } from './kategori-section';
import { JemputAntarSection } from './jemput-antar-section';
import { CaraPakaiSection } from './cara-pakai-section';
import { KenapaSection } from './kenapa-section';

export function BalaundryLanding() {
  const [items, setItems] = useState<Laundry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const reqIdRef = useRef(0);

  const fetchPopuler = useCallback(async () => {
    const myId = ++reqIdRef.current;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/balaundry/directory?limit=8`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      if (myId !== reqIdRef.current) return;
      setError(false);
      setItems((data.data ?? []) as Laundry[]);
      setTotal(data.meta?.total ?? (data.data?.length ?? 0));
    } catch {
      if (myId !== reqIdRef.current) return;
      setError(true); setItems([]); setTotal(0);
    } finally {
      if (myId === reqIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPopuler(); }, [fetchPopuler]);

  return (
    <div className="balaundry-lp">
      <HeroSection />

      {/* signature wave divider */}
      <div className="wave" aria-hidden="true">
        <svg viewBox="0 0 1440 70" preserveAspectRatio="none">
          <path className="w1" d="M0,40 C240,90 480,0 720,30 C960,60 1200,20 1440,45 L1440,70 L0,70 Z" />
          <path className="w2" d="M0,50 C280,20 520,70 760,45 C1000,20 1240,55 1440,35 L1440,70 L0,70 Z" />
        </svg>
      </div>

      <ListingGrid items={items} loading={loading} error={error} total={total} onRetry={fetchPopuler} />
      <OwnerBand />
      <KategoriSection />
      <JemputAntarSection />
      <CaraPakaiSection />
      <KenapaSection />

      {/* mini-wave transisi ke footer global */}
      <svg className="mini-wave" viewBox="0 0 1440 40" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0,20 C360,40 720,0 1080,20 C1260,30 1350,15 1440,22 L1440,40 L0,40 Z" />
      </svg>
    </div>
  );
}
