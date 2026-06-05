'use client';

// ════════════════════════════════════════════════════════════════
// BAKOS — Area Section (public LP)
// PATH: src/components/bakos/public/area-section.tsx
// Shortcut area populer MalUt. Tap → set query pencarian.
// 🛡️ Bukan agregasi backend — tanpa angka "X kos aktif" palsu.
// ════════════════════════════════════════════════════════════════

import { AREAS } from './bakos-links';

export function AreaSection({ onPick }: { onPick: (q: string) => void }) {
  return (
    <section className="bk-sec"><div className="bk-wrap">
      <div className="bk-sh">
        <div>
          <h2>Cari berdasarkan area</h2>
          <p>Area populer di Ternate &amp; sekitarnya</p>
        </div>
      </div>
      <div className="bk-areas">
        {AREAS.map((a) => (
          <button key={a.name} className="bk-area" onClick={() => onPick(a.q)}>
            {a.tag && (
              <span className={`atag ${a.tone === 'green' ? 'bk-tag-green' : 'bk-tag-amber'}`}>
                {a.tag}
              </span>
            )}
            <span className={`aic bk-tone-${a.tone}`}>
              <span className="material-symbols-outlined">{a.icon}</span>
            </span>
            <h3>{a.name}</h3>
            <span className="land">{a.land}</span>
            <span className="go">Lihat kos <span className="material-symbols-outlined">arrow_forward</span></span>
          </button>
        ))}
      </div>
    </div></section>
  );
}
