'use client';
// ════════════════════════════════════════════════════════════════
// BAKOS Detail — Galeri adaptif
// PATH: src/components/bakos/public/detail/kos-gallery.tsx
// DESKTOP (≥980px): grid (hero + maks 4 foto samping, overlay "+N").
// MOBILE (≤979px): strip swipe horizontal (scroll-snap) + dots sinkron
//   posisi scroll — geser jari ala Airbnb/Mamikos. PENANDA: BK-GAL-SWIPE.
// ════════════════════════════════════════════════════════════════
import { useState, useRef } from 'react';
import { MS } from './types';
import { onImgError } from '../bakos-links';

export function KosGallery({ photos, title }: { photos: string[]; title: string }) {
  const [active, setActive] = useState(0);          // dot aktif desktop (klik)
  const [mActive, setMActive] = useState(0);        // dot aktif mobile (scroll)
  const stripRef = useRef<HTMLDivElement>(null);
  const side = photos.slice(1, 5);
  const extra = photos.length - 5;

  // sinkron dot mobile dengan posisi scroll strip
  const onScroll = () => {
    const el = stripRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== mActive) setMActive(i);
  };

  const goMobile = (i: number) => {
    const el = stripRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  return (
    <div className="bkd-gal" id="sec-foto" style={{ scrollMarginTop: 120 }}>
      {/* ── MOBILE: strip swipe (geser jari) ── */}
      <div className="bkd-swipe">
        {photos.length > 0 ? (
          <>
            <div className="bkd-swipe-track" ref={stripRef} onScroll={onScroll}>
              {photos.map((p, i) => (
                <div className="bkd-swipe-slide" key={i}>
                  <img src={p} alt={i === 0 ? title : ''} draggable={false} onError={onImgError} />
                </div>
              ))}
            </div>
            {photos.length > 1 && (
              <>
                <div className="bkd-swipe-count">{mActive + 1}/{photos.length}</div>
                <div className="bkd-dots bkd-swipe-dots">
                  {photos.map((_, i) => (
                    <button key={i} className={i === mActive ? 'on' : ''}
                      onClick={() => goMobile(i)} aria-label={`Foto ${i + 1}`} />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="bkd-swipe-empty"><MS n="apartment" /></div>
        )}
      </div>

      {/* ── DESKTOP: grid adaptif (tidak berubah) ── */}
      <div className={`bkd-grid side-${side.length}`}>
        <div className={`bkd-cell ${side.length ? 'hero' : 'solo'}`} onClick={() => setActive(0)}>
          {photos.length > 0
            ? <img src={photos[active] || photos[0]} alt={title} onError={onImgError} />
            : <div className="empty"><MS n="apartment" /></div>}
          {photos.length > 1 && (
            <div className="bkd-dots">
              {photos.map((_, i) => (
                <button key={i} className={i === active ? 'on' : ''}
                  onClick={(e) => { e.stopPropagation(); setActive(i); }} />
              ))}
            </div>
          )}
        </div>
        {side.map((p, i) => (
          <div className="bkd-cell" key={i} onClick={() => setActive(i + 1)}>
            <img src={p} alt="" onError={onImgError} />
            {i === side.length - 1 && extra > 0 && (
              <div className="bkd-more"><MS n="photo_library" /> +{extra} foto</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
