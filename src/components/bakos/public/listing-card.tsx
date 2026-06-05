'use client';

// ════════════════════════════════════════════════════════════════
// BAKOS — Listing Card (public LP)
// PATH: src/components/bakos/public/listing-card.tsx
// 1 kartu kos dari data REAL. Link ke /bakos/[slug].
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
        {img
          ? <img src={img} alt={item.title} loading="lazy" />
          : <div className="ph"><span className="material-symbols-outlined">apartment</span></div>}

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
          <span className="bk-kphoto"><span className="material-symbols-outlined">photo_library</span> {item.photos.length} foto</span>
        )}
      </div>

      <div className="bk-kos-b">
        <div className="bk-kt">
          <h3>{item.title}</h3>
          {item.rating_count > 0
            ? <span className="bk-rate"><span className="material-symbols-outlined">star</span> {item.rating_avg.toFixed(1)} ({item.rating_count})</span>
            : <span className="bk-rate muted">Baru</span>}
        </div>

        {(item.address || near || item.city_id) && (
          <div className="bk-kloc">
            <span className="material-symbols-outlined">location_on</span>
            {item.address || item.city_id}
            {near && <> · <span className="near">{near}</span></>}
          </div>
        )}

        {facs.length > 0 && (
          <div className="bk-ktags">
            {facs.slice(0, 4).map((f, i) => <span key={i} className="bk-ktag">{f}</span>)}
            {facs.length > 4 && <span className="bk-ktag muted">+{facs.length - 4}</span>}
          </div>
        )}

        <div className="bk-kfoot">
          <div className="bk-kprice">
            <b>{formatRupiah(item.price)} <small>/{item.price_period}</small></b>
            {item.is_negotiable
              ? <span className="nego">Nego</span>
              : seed ? <span className="seedn">Menunggu konfirmasi pemilik</span> : <span className="src">Harga dari pemilik</span>}
          </div>
          <span className="bk-kbtn">Lihat detail</span>
        </div>
      </div>
    </Link>
  );
}
