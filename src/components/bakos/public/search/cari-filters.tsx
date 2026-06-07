'use client';
// ════════════════════════════════════════════════════════════════
// BAKOS Cari — Filter bar (pills kos_type + harga). Presentational.
// PATH: src/components/bakos/public/search/cari-filters.tsx
// Reuse KOS_TYPES + PRICE_FILTERS dari bakos-links (gak bikin baru).
// ════════════════════════════════════════════════════════════════
import { KOS_TYPES, PRICE_FILTERS } from '../bakos-links';

interface Props {
  kosType: string; priceKey: string;
  onKosType: (k: string) => void; onPrice: (k: string) => void;
}

export function CariFilters({ kosType, priceKey, onKosType, onPrice }: Props) {
  return (
    <div className="bkc-filters">
      <div className="bkc-fgrp">
        {KOS_TYPES.map((t) => (
          <button key={t.key} className={`bkc-pill${kosType === t.key ? ' on' : ''}`}
            onClick={() => onKosType(t.key)}>{t.label}</button>
        ))}
      </div>
      <span className="bkc-div" />
      <div className="bkc-fgrp">
        {PRICE_FILTERS.map((p) => (
          <button key={p.key} className={`bkc-pill${priceKey === p.key ? ' on' : ''}`}
            onClick={() => onPrice(p.key)}>{p.label}</button>
        ))}
      </div>
    </div>
  );
}
