'use client';

// ════════════════════════════════════════════════════════════════
// BAKOS — Area Section (public LP) — PREMIUM (foto destinasi)
// PATH: src/components/bakos/public/area-section.tsx
// Card foto gaya Airbnb/Rukita. Tap → set query pencarian.
// 🛡️ Count = hitung REAL dari listing yang sudah di-fetch (bukan palsu).
//    Foto area = mood (Unsplash); kalau gagal load, gradient tone tetap tampil.
// ════════════════════════════════════════════════════════════════

import { AREAS, type Listing } from './bakos-links';

export function AreaSection({ onPick, listings }: { onPick: (q: string) => void; listings: Listing[] }) {
  const inArea = (q: string) =>
    listings.filter((l) => {
      const hay = `${l.address ?? ''} ${l.city_id ?? ''} ${(l.nearby_landmarks ?? []).join(' ')}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });

  const fmt = (n: number) => (n >= 1_000_000 ? `Rp ${(n / 1_000_000).toFixed(1)}jt` : `Rp ${Math.round(n / 1_000)}rb`);

  return (
    <section className="bk-sec"><div className="bk-wrap">
      <div className="bk-sh">
        <div>
          <h2>Cari berdasarkan area</h2>
          <p>Area populer di Ternate &amp; sekitarnya</p>
        </div>
      </div>
      <div className="bk-areas">
        {AREAS.map((a) => {
          const list = inArea(a.q);
          const n = list.length;
          const from = n ? Math.min(...list.map((l) => l.price).filter((p) => p > 0)) : null;
          return (
            <button key={a.name} className={`bk-area bk-atone-${a.tone}`} onClick={() => onPick(a.q)}>
              <span className="bk-area-photo">
                <img src={a.photo} alt={a.name} loading="lazy" />
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
