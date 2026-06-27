'use client';

// ════════════════════════════════════════════════════════════════
// BALAUNDRY — Laundry Card (.lc). Port 1:1 mockup. Display-only API.
// PATH: src/components/balaundry/public/laundry-card.tsx
// 🛡️ Directory = HANYA verified → .vb "Terverifikasi" selalu valid. .ft
//   "Unggulan" kalau listing_tier='featured'. Harga TIDAK ada di directory
//   whitelist → .pr "Lihat harga" (bukan angka karangan).
// ════════════════════════════════════════════════════════════════

import Link from 'next/link';
import { type Laundry, onImgError } from '@/lib/balaundry-links';

export function LaundryCard({ item }: { item: Laundry }) {
  const cover = item.cover_image_url || (item.photos?.[0] ?? null);
  const featured = item.listing_tier === 'featured';

  return (
    <Link href={`/balaundry/${item.slug}`} className="lc">
      <div className="cv">
        {cover
          ? <img src={cover} alt={item.name} loading="lazy" onError={onImgError} />
          : <span className="material-symbols-outlined">local_laundry_service</span>}
        <span className="vb"><span className="material-symbols-outlined">verified</span> Terverifikasi</span>
        {featured && <span className="ft">Unggulan</span>}
      </div>
      <div className="bd">
        <h3>{item.name}</h3>
        {item.address && (
          <div className="loc"><span className="material-symbols-outlined">place</span> {item.address}</div>
        )}
        <div className="mt">
          {item.rating_count > 0
            ? <span className="rt"><span className="material-symbols-outlined">star</span> {item.rating_avg.toFixed(1)} <span>({item.rating_count})</span></span>
            : <span className="rt"><span className="material-symbols-outlined">star</span> <span>Baru</span></span>}
          <span className="pr">Lihat harga</span>
        </div>
      </div>
    </Link>
  );
}
