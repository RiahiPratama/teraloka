'use client';
// ════════════════════════════════════════════════════════════════
// BAKOS Cari — Filter bar (chip ringkas 1-baris + bottom sheet)
// PATH: src/components/bakos/public/search/cari-filters.tsx
// B-LEVEL (13 Jun 2026): chip ringkas → tap buka sheet pilihan lengkap.
//   Hemat ruang, premium ala Mamikos. C-ready (header punya slot toggle).
// Reuse KOS_TYPES + PRICE_FILTERS + SORT_OPTIONS dari bakos-links.
// PENANDA: BKC-FILTER-SHEET
// ════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import { KOS_TYPES, PRICE_FILTERS, SORT_OPTIONS } from '../bakos-links';

interface Props {
  kosType: string; priceKey: string; sortKey: string;
  onKosType: (k: string) => void; onPrice: (k: string) => void; onSort: (k: string) => void;
}

const labelOf = (arr: readonly { key: string; label: string }[], key: string, fallback: string) =>
  arr.find((x) => x.key === key)?.label ?? fallback;

export function CariFilters({ kosType, priceKey, sortKey, onKosType, onPrice, onSort }: Props) {
  const [sheet, setSheet] = useState<null | 'tipe' | 'harga' | 'urut'>(null);

  // kunci scroll saat sheet kebuka
  useEffect(() => {
    if (!sheet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSheet(null); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [sheet]);

  const tipeActive = kosType !== '';
  const hargaActive = priceKey !== 'all';

  return (
    <>
      {/* chip ringkas 1-baris (horizontal scroll) */}
      <div className="bkc-chips">
        <button className={`bkc-chip${tipeActive ? ' on' : ''}`} onClick={() => setSheet('tipe')}>
          {tipeActive ? labelOf(KOS_TYPES, kosType, 'Tipe') : 'Tipe kos'}
          <span className="material-symbols-outlined">expand_more</span>
        </button>
        <button className={`bkc-chip${hargaActive ? ' on' : ''}`} onClick={() => setSheet('harga')}>
          {hargaActive ? labelOf(PRICE_FILTERS, priceKey, 'Harga') : 'Harga'}
          <span className="material-symbols-outlined">expand_more</span>
        </button>
        <button className="bkc-chip" onClick={() => setSheet('urut')}>
          {labelOf(SORT_OPTIONS, sortKey, 'Urutkan')}
          <span className="material-symbols-outlined">swap_vert</span>
        </button>
      </div>

      {/* bottom sheet pilihan */}
      {sheet && (
        <div className="bkc-sheet-overlay" onClick={() => setSheet(null)}>
          <div className="bkc-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="bkc-sheet-head">
              <h3>{sheet === 'tipe' ? 'Tipe kos' : sheet === 'harga' ? 'Rentang harga' : 'Urutkan'}</h3>
              <button className="bkc-sheet-x" onClick={() => setSheet(null)} aria-label="Tutup">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="bkc-sheet-opts">
              {sheet === 'tipe' && KOS_TYPES.map((t) => (
                <button key={t.key} className={`bkc-opt${kosType === t.key ? ' on' : ''}`}
                  onClick={() => { onKosType(t.key); setSheet(null); }}>
                  {t.label}
                  {kosType === t.key && <span className="material-symbols-outlined">check</span>}
                </button>
              ))}
              {sheet === 'harga' && PRICE_FILTERS.map((p) => (
                <button key={p.key} className={`bkc-opt${priceKey === p.key ? ' on' : ''}`}
                  onClick={() => { onPrice(p.key); setSheet(null); }}>
                  {p.label}
                  {priceKey === p.key && <span className="material-symbols-outlined">check</span>}
                </button>
              ))}
              {sheet === 'urut' && SORT_OPTIONS.map((s) => (
                <button key={s.key} className={`bkc-opt${sortKey === s.key ? ' on' : ''}`}
                  onClick={() => { onSort(s.key); setSheet(null); }}>
                  {s.label}
                  {sortKey === s.key && <span className="material-symbols-outlined">check</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
