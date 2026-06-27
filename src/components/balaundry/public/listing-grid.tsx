'use client';

// ════════════════════════════════════════════════════════════════
// BALAUNDRY — Laundry Populer (section 2, API). Port mockup .cards/.lc.
// PATH: src/components/balaundry/public/listing-grid.tsx
// Data dari orchestrator (/balaundry/directory). 4-state. Reveal per card.
// ════════════════════════════════════════════════════════════════

import { type Laundry } from '@/lib/balaundry-links';
import { LaundryCard } from './laundry-card';
import { Reveal } from './reveal';

interface GridProps {
  items: Laundry[];
  loading: boolean;
  error?: boolean;
  total?: number;
  onRetry?: () => void;
}

export function ListingGrid({ items, loading, error, total, onRetry }: GridProps) {
  return (
    <section style={{ paddingTop: 20 }}><div className="wrap">
      <Reveal className="sec-h">
        <span className="kick"><span className="material-symbols-outlined">storefront</span> Direktori</span>
        <h2>Laundry Populer di Maluku Utara</h2>
        <p>{loading ? 'Memuat…' : `${total ?? items.length} laundry terverifikasi dengan rating terbaik dari warga.`}</p>
      </Reveal>

      <div className="cards">
        {loading && [0, 1, 2].map((i) => (
          <div key={i} className="lc skel">
            <div className="cv" />
            <div className="bd"><div className="s l1" /><div className="s l2" /></div>
          </div>
        ))}

        {!loading && error && (
          <div className="bl-empty">
            <span className="material-symbols-outlined">cloud_off</span>
            <p className="t">Gagal memuat laundry</p>
            <p className="s">Koneksi bermasalah atau server sibuk. Coba lagi sebentar.</p>
            {onRetry && <button onClick={onRetry}>Coba lagi</button>}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="bl-empty">
            <span className="material-symbols-outlined">local_laundry_service</span>
            <p className="t">Belum ada laundry terdaftar</p>
            <p className="s">Laundry terverifikasi akan tampil di sini.</p>
          </div>
        )}

        {!loading && !error && items.map((item, i) => (
          <Reveal key={item.id} delay={(i % 3) === 1 ? 1 : (i % 3) === 2 ? 2 : undefined}>
            <LaundryCard item={item} />
          </Reveal>
        ))}
      </div>
    </div></section>
  );
}
