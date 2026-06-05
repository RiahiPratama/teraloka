'use client';

// ════════════════════════════════════════════════════════════════
// BAKOS — Listing Card (public LP) — PREMIUM (Airbnb-style)
// PATH: src/components/bakos/public/listing-card.tsx
// Borderless, foto dominan, fasilitas plain-text, seluruh card clickable.
// 🛡️ facilities di-guard via facList(); badge verif/seed HANYA jika field ada.
// ════════════════════════════════════════════════════════════════

import Link from 'next/link';
import { type Listing, TIPE, formatRupiah, facList } from './bakos-links';

export function ListingCard({ item }: { item: Listing }) {
  const tp = item.kos_type ? TIPE[item.kos_type] : null;
  const facs = facList(item.facilities);
  const near = item.nearby_landmarks?.[0] || null;
  const img = item.cover_image_url || item.photos?.[0] || null;
  const seed = item.source === 'seed';

  return (
    <Link href={`/bakos/${item.slug}`} className="bk-kos">
      <div className="bk-kos-img">
        <div className="bk-kos-imgzoom">
          {img
            ? <img src={img} alt={item.title} loading="lazy" />
            : <div className="ph"><span className="material-symbols-outlined">apartment</span></div>}
        </div>

        <div className="bk-kb-row">
          {seed && (
            <span className="bk-kb seed"><span className="material-symbols-outlined">eco</span> Belum diverifikasi</span>
          )}
          {!seed && item.is_verified && (
            <span className="bk-kb verif"><span className="material-symbols-outlined">verified</span> Terverifikasi</span>
          )}
          {!seed && !item.is_verified && item.listing_tier === 'premium' && (
            <span className="bk-kb prem"><span className="material-symbols-outlined">star</span> Premium</span>
          )}
          {tp && <span className={`bk-kb tipe ${tp.cls}`}>{tp.lbl}</span>}
        </div>

        <span className="bk-fav"><span className="material-symbols-outlined">favorite</span></span>
        {item.photos?.length > 0 && (
          <span className="bk-kphoto"><span className="material-symbols-outlined">photo_library</span> {item.photos.length}</span>
        )}
      </div>

      <div className="bk-kos-b">
        <div className="bk-kt">
          <h3>{item.title}</h3>
          {item.rating_count > 0
            ? <span className="bk-rate"><span className="material-symbols-outlined">star</span> {item.rating_avg.toFixed(1)}</span>
            : <span className="bk-rate muted">Baru</span>}
        </div>

        {(item.address || near || item.city_id) && (
          <p className="bk-kloc">
            {item.address || item.city_id}{near ? ` · ${near}` : ''}
          </p>
        )}

        {facs.length > 0 && (
          <p className="bk-kfacs">{facs.slice(0, 3).join(' · ')}</p>
        )}

        <div className="bk-kprice">
          <span className="amt">{formatRupiah(item.price)}</span>
          <span className="per">/{item.price_period}</span>
          {item.is_negotiable
            ? <span className="note nego">· Nego</span>
            : seed ? <span className="note seedn">· Menunggu konfirmasi</span> : null}
        </div>
      </div>
    </Link>
  );
}
