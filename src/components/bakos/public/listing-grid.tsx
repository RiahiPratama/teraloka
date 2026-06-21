'use client';

// ════════════════════════════════════════════════════════════════
// BAKOS — Listing Grid (public LP)
// PATH: src/components/bakos/public/listing-grid.tsx
// Grid kos + loading skeleton + empty state. Data dari orchestrator.
// 🛡️ COUNT FIX: teks "N kos ditemukan" ambil dari prop `total` (meta.total BE),
//    BUKAN listings.length (= jumlah kartu page ini). Kalau total > yg ke-render
//    → "Menampilkan X dari Y" (jujur, gak nyesatin user soal stok kos).
// ════════════════════════════════════════════════════════════════

import { type Listing } from './bakos-links';
import { ListingCard } from './listing-card';

interface GridProps {
  listings: Listing[];
  loading: boolean;
  searchInput: string;
  onReset: () => void;
  error?: boolean;
  onRetry?: () => void;
  emptyHint?: string;
  total?: number;          // total hasil dari BE (meta.total). Fallback ke listings.length.
}

export function ListingGrid({ listings, loading, searchInput, onReset, error, onRetry, emptyHint, total }: GridProps) {
  const shown = listings.length;
  const resolvedTotal = total ?? shown;             // prop kosong → fallback aman
  const searchSuffix = searchInput ? ` untuk “${searchInput}”` : '';
  const countLabel =
    resolvedTotal > shown
      ? `Menampilkan ${shown} dari ${resolvedTotal} kos${searchSuffix}`
      : `${resolvedTotal} kos ditemukan${searchSuffix}`;

  return (
    <section className="bk-sec bk-pt0" id="bk-listings"><div className="bk-wrap">
      <div className="bk-sh">
        <div>
          <h2>Kos tersedia</h2>
          <p>
            {loading ? 'Memuat…' : countLabel}
          </p>
        </div>
      </div>

      {loading && (
        <div className="bk-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bk-kos bk-skel">
              <div className="kos-img sk" />
              <div className="sk l1" />
              <div className="sk l2" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="bk-empty">
          <span className="material-symbols-outlined">cloud_off</span>
          <p className="t">Gagal memuat kos</p>
          <p className="s">Koneksi bermasalah atau server sedang sibuk. Coba lagi sebentar.</p>
          {onRetry && <button onClick={onRetry}>Coba lagi</button>}
        </div>
      )}

      {!loading && !error && listings.length === 0 && (
        <div className="bk-empty">
          <span className="material-symbols-outlined">home_work</span>
          <p className="t">Belum ada kos yang cocok</p>
          <p className="s">{emptyHint ?? 'Coba ubah filter atau hapus kata kunci pencarian.'}</p>
          <button onClick={onReset}>Reset filter</button>
        </div>
      )}

      {!loading && !error && listings.length > 0 && (
        <div className="bk-grid">
          {listings.map((item) => <ListingCard key={item.id} item={item} />)}
        </div>
      )}
    </div></section>
  );
}
