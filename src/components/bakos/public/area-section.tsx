'use client';

// ════════════════════════════════════════════════════════════════
// BAKOS — Area Section (public LP) — PREMIUM (foto destinasi)
// PATH: src/components/bakos/public/area-section.tsx
// Card foto gaya Airbnb/Rukita. Tap → set query pencarian.
// 🛡️ Count = hitung REAL dari listing yang sudah di-fetch (bukan palsu).
//    Foto area = mood (Unsplash); kalau gagal load, gradient tone tetap tampil.
// L+: HP carousel horizontal (drag/swipe). Desktop tetap grid. PENANDA: BK-AREA-CAROUSEL.
// ════════════════════════════════════════════════════════════════

import { useRef, useCallback } from 'react';
import { AREAS, type Listing, onImgError } from './bakos-links';

// drag-to-scroll (mirror HeroMap) — tarik kartu pakai mouse/jari di HP & desktop
function useDragScroll() {
  const ref = useRef<HTMLDivElement | null>(null);
  const drag = useRef({ down: false, moved: false, startX: 0, startScroll: 0 });
  const onDown = useCallback((e: React.MouseEvent) => {
    const el = ref.current; if (!el) return;
    drag.current = { down: true, moved: false, startX: e.pageX, startScroll: el.scrollLeft };
  }, []);
  const onMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current; if (!el || !drag.current.down) return;
    const dx = e.pageX - drag.current.startX;
    if (Math.abs(dx) > 4) drag.current.moved = true;
    el.scrollLeft = drag.current.startScroll - dx;
  }, []);
  const end = useCallback(() => { drag.current.down = false; }, []);
  const guardClick = useCallback((e: React.MouseEvent) => {
    if (drag.current.moved) { e.preventDefault(); e.stopPropagation(); }
  }, []);
  return { ref, onDown, onMove, end, guardClick, dragging: () => drag.current.moved };
}

export function AreaSection({ onPick, listings }: { onPick: (q: string) => void; listings: Listing[] }) {
  const ds = useDragScroll();

  const inArea = (q: string) =>
    listings.filter((l) => {
      const hay = `${l.address ?? ''} ${l.city_id ?? ''} ${(l.nearby_landmarks ?? []).join(' ')}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });

  const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  return (
    <section className="bk-sec"><div className="bk-wrap">
      <div className="bk-sh">
        <div>
          <h2>Cari berdasarkan area</h2>
          <p>Area populer di Ternate &amp; sekitarnya</p>
        </div>
      </div>
      <div
        className="bk-areas"
        ref={ds.ref}
        onMouseDown={ds.onDown}
        onMouseMove={ds.onMove}
        onMouseUp={ds.end}
        onMouseLeave={ds.end}
      >
        {AREAS.map((a) => {
          const list = inArea(a.q);
          const n = list.length;
          const from = n ? Math.min(...list.map((l) => l.price).filter((p) => p > 0)) : null;
          return (
            <button
              key={a.name}
              className={`bk-area bk-atone-${a.tone}`}
              onClick={(e) => { if (ds.dragging()) { ds.guardClick(e); return; } onPick(a.q); }}
            >
              <span className="bk-area-photo">
                <img src={a.photo} alt={a.name} loading="lazy" draggable={false} onError={onImgError} />
                <span className="bk-area-grad" />
                {a.tag && <span className="bk-area-tag">{a.tag}</span>}
                <span className="bk-area-ov">
                  <span className="aic"><span className="material-symbols-outlined">{a.icon}</span></span>
                  <span className="nm">{a.name}</span>
                  <span className="land">{a.land}</span>
                </span>
              </span>
              <span className="bk-area-foot">
                <span className="cnt">
                  {n > 0 ? <b>{n} kos</b> : <b className="muted">Jelajahi</b>}
                  {from !== null && <em> · mulai {fmt(from)}</em>}
                </span>
                <span className="go"><span className="material-symbols-outlined">arrow_forward</span></span>
              </span>
            </button>
          );
        })}
      </div>
    </div></section>
  );
}
