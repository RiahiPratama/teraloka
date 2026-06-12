'use client';

// ════════════════════════════════════════════════════════════════
// BAKOS — Listing Card (public LP) — PREMIUM (Airbnb-style)
// PATH: src/components/bakos/public/listing-card.tsx
// Borderless, foto dominan, fasilitas plain-text, seluruh card clickable.
// 🛡️ facilities di-guard via facList(); badge verif/seed HANYA jika field ada.
// L+: galeri foto SWIPE/DRAG (≥2 foto) + dot indikator. Tap=detail, drag=ganti foto.
//     PENANDA: BK-CARD-GALLERY.
// ════════════════════════════════════════════════════════════════

import { useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { type Listing, TIPE, formatRupiah, facList } from './bakos-links';

export function ListingCard({ item }: { item: Listing }) {
  const tp = item.kos_type ? TIPE[item.kos_type] : null;
  const facs = facList(item.facilities);
  const near = item.nearby_landmarks?.[0] || null;
  const seed = item.source === 'seed';

  // ── galeri: gabung cover + photos, unik, buang kosong ──
  const gallery = Array.from(
    new Set([item.cover_image_url, ...(item.photos ?? [])].filter(Boolean) as string[]),
  );
  const multi = gallery.length > 1;

  // ── swipe/drag state ──
  const scroller = useRef<HTMLDivElement | null>(null);
  const drag = useRef({ down: false, moved: false, startX: 0, startScroll: 0 });
  const [active, setActive] = useState(0);

  const onDown = useCallback((e: React.MouseEvent) => {
    const el = scroller.current; if (!el) return;
    drag.current = { down: true, moved: false, startX: e.pageX, startScroll: el.scrollLeft };
  }, []);
  const onMove = useCallback((e: React.MouseEvent) => {
    const el = scroller.current; if (!el || !drag.current.down) return;
    const dx = e.pageX - drag.current.startX;
    if (Math.abs(dx) > 5) drag.current.moved = true;
    el.scrollLeft = drag.current.startScroll - dx;
  }, []);
  const end = useCallback(() => { drag.current.down = false; }, []);

  // 🛡️ kalau habis drag (geser foto), batalin navigasi Link
  const guardNav = useCallback((e: React.MouseEvent) => {
    if (drag.current.moved) { e.preventDefault(); }
  }, []);

  // update dot aktif saat scroll
  const onScroll = useCallback(() => {
    const el = scroller.current; if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    setActive((prev) => (prev === i ? prev : i));
  }, []);

  return (
    <Link href={`/bakos/${item.slug}`} className="bk-kos" onClickCapture={guardNav}>
      <div className="bk-kos-img">
        {gallery.length > 0 ? (
          multi ? (
            // ── GALERI SWIPE (≥2 foto) — BK-CARD-GALLERY ──
            <div
              className="bk-kgallery"
              ref={scroller}
              onScroll={onScroll}
              onMouseDown={onDown}
              onMouseMove={onMove}
              onMouseUp={end}
              onMouseLeave={end}
              onDragStart={(e) => e.preventDefault()}
            >
              {gallery.map((src, i) => (
                <div className="bk-kslide" key={i}>
                  <img src={src} alt={`${item.title} ${i + 1}`} loading="lazy" draggable={false} />
                </div>
              ))}
            </div>
          ) : (
            // ── 1 foto: statis (zoom on hover seperti semula) ──
            <div className="bk-kos-imgzoom">
              <img src={gallery[0]} alt={item.title} loading="lazy" />
            </div>
          )
        ) : (
          <div className="bk-kos-imgzoom">
            <div className="ph"><span className="material-symbols-outlined">apartment</span></div>
          </div>
        )}

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

        {/* dot indikator galeri (≥2 foto) */}
        {multi && (
          <div className="bk-kdots">
            {gallery.map((_, i) => (
              <span key={i} className={`bk-kdot${i === active ? ' on' : ''}`} />
            ))}
          </div>
        )}

        {/* counter foto — tetap, kalau gak ada galeri swipe */}
        {!multi && gallery.length > 1 && (
          <span className="bk-kphoto"><span className="material-symbols-outlined">photo_library</span> {gallery.length}</span>
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
